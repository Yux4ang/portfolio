import { parsePortfolioBackup, recordCount } from '../../src/services/storage/portfolioBackup';

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
}
interface Env {
  DB: { prepare(sql: string): Statement };
  SYNC_TOKEN: string;
  ALLOWED_ORIGINS: string;
}
interface Row { revision: number; saved_at: string; payload: string }

const MAX_BYTES = 1_000_000;

async function authorized(request: Request, token: string): Promise<boolean> {
  // Compare fixed-length digests rather than exposing a prefix timing oracle.
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(request.headers.get('Authorization') ?? '')),
    crypto.subtle.digest('SHA-256', encoder.encode(`Bearer ${token}`)),
  ]);
  const a = new Uint8Array(actual);
  const b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function readLimitedBody(request: Request): Promise<string> {
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) throw new Error('too-large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing-body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('too-large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim());
    const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' };
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
    if (origin && !allowed.includes(origin)) return reply({ error: 'Origin forbidden' }, 403);
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, PUT, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    if (new URL(request.url).pathname !== '/portfolio') return reply({ error: 'Not found' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!env.SYNC_TOKEN || env.SYNC_TOKEN.length < 32 || !env.DB) return reply({ error: 'Cloud storage is not configured' }, 503);
    if (!(await authorized(request, env.SYNC_TOKEN))) return reply({ error: 'Unauthorized' }, 401);
    if (request.method !== 'GET' && request.method !== 'PUT') return reply({ error: 'Method not allowed' }, 405);

    try {
      if (request.method === 'GET') {
        const version = new URL(request.url).searchParams.get('revision');
        if (version !== null && (!/^\d+$/.test(version) || !Number.isSafeInteger(Number(version)) || Number(version) < 1)) return reply({ error: 'Invalid revision' }, 400);
        const row = await (version
          ? env.DB.prepare('SELECT * FROM portfolio_versions WHERE revision = ?').bind(Number(version))
          : env.DB.prepare('SELECT * FROM portfolio_versions ORDER BY revision DESC LIMIT 1')).first<Row>();
        return reply(row ? { revision: row.revision, savedAt: row.saved_at, data: JSON.parse(row.payload) } : null);
      }

      let input;
      try { input = JSON.parse(await readLimitedBody(request)); }
      catch (error) { return reply({ error: 'Invalid or oversized backup' }, error instanceof Error && error.message === 'too-large' ? 413 : 400); }
      if (!input || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) return reply({ error: 'Expected revision required' }, 400);
      let data;
      try { data = parsePortfolioBackup(input.data); }
      catch { return reply({ error: 'Invalid complete backup' }, 400); }
      if (recordCount(data) === 0) return reply({ error: 'Empty backup refused' }, 400);
      const savedAt = new Date().toISOString();
      // One atomic statement prevents concurrent devices from overwriting each other.
      // Every successful save appends a revision; previous backups are never deleted.
      const row = await env.DB.prepare(`
        INSERT INTO portfolio_versions (revision, saved_at, payload)
        SELECT ?1 + 1, ?2, ?3
        WHERE ?1 = COALESCE((SELECT MAX(revision) FROM portfolio_versions), 0)
        RETURNING revision, saved_at, payload
      `).bind(input.expectedRevision, savedAt, JSON.stringify(data)).first<Row>();
      if (!row) return reply({ error: 'Cloud data changed; fetch before saving' }, 409);
      return reply({ revision: row.revision, savedAt: row.saved_at, data });
    } catch {
      return reply({ error: 'Storage unavailable; local data is unchanged' }, 500);
    }
  },
};
