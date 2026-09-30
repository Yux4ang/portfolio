import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const backupUrl = moduleUrl(compile('../src/services/storage/portfolioBackup.ts'));
const { DATA_KEYS, parsePortfolioBackup, parseBackupFile } = await import(backupUrl);
const worker = (await import(moduleUrl(compile('../server/portfolio-cloud/worker.ts')
  .replace('../../src/services/storage/portfolioBackup', backupUrl)))).default;

// Run the production SQL against SQLite, the same SQL engine family as D1.
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../server/portfolio-cloud/schema.sql', import.meta.url), 'utf8'));
const env = {
  SYNC_TOKEN: 'a'.repeat(64),
  ALLOWED_ORIGINS: 'https://portfolio.example,http://localhost:5173',
  DB: { prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return db.prepare(sql).get(...values) ?? null; },
    };
  } },
};
const position = { id: 'p1', symbol: 'AAPL', assetType: 'stock', costPrice: 100, quantity: 2, platform: 'IBKR', purchasedAt: '2020-01-02', createdAt: '2020-01-03T00:00:00Z', updatedAt: '2021-01-04T00:00:00Z', note: '保留原记录', extra: 'future field' };
const closed = { id: 'c1', symbol: 'MSFT', assetType: 'stock', costPrice: 100, exitPrice: 120, quantity: 1, platform: 'IBKR', openedAt: '2019-01-01', closedAt: '2022-01-01', realizedPnlAmount: 20, realizedPnlPercent: 20, holdingDays: 1096, annualizedReturnPercent: 6.26 };
const cash = { id: 'cash1', name: '现金', balance: 123, platform: 'IBKR', createdAt: '2020-01-01', updatedAt: '2020-01-01' };
const snapshot = { id: 's1', date: '2020-02-02', totalAssets: 200, investmentValue: 100, cashValue: 100, createdAt: '2020-02-02' };
const data = { format: 'portfolio-dashboard', version: 1, exportedAt: '2026-09-30T00:00:00Z', positions: [position], closedPositions: [closed], cashAccounts: [cash], assetSnapshots: [snapshot] };
const empty = { ...data, positions: [], closedPositions: [], cashAccounts: [], assetSnapshots: [] };
const raw = Object.fromEntries(Object.entries(DATA_KEYS).map(([name, key]) => [key, JSON.stringify(data[name])]));
assert.deepEqual(parseBackupFile(JSON.stringify(raw)).positions, data.positions);
assert.deepEqual(parseBackupFile(JSON.stringify(raw)).closedPositions, data.closedPositions);
assert.deepEqual(parseBackupFile(JSON.stringify(raw)).assetSnapshots, data.assetSnapshots);
assert.deepEqual(parsePortfolioBackup(JSON.parse(JSON.stringify(data))), data);
assert.throws(() => parsePortfolioBackup({ ...data, closedPositions: undefined }));
assert.throws(() => parsePortfolioBackup({ ...data, positions: [position, position] }));
assert.throws(() => parsePortfolioBackup({ ...data, positions: [{ ...position, quantity: 'two' }] }));
assert.throws(() => parseBackupFile(JSON.stringify([position])));

function request(method = 'GET', body, token = env.SYNC_TOKEN, origin = 'https://portfolio.example', query = '') {
  return new Request(`https://cloud.example/portfolio${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Origin: origin, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
const call = (req) => worker.fetch(req, env);
assert.equal((await call(request('GET', undefined, 'wrong'))).status, 401);
assert.equal((await call(request('GET', undefined, env.SYNC_TOKEN, 'https://attacker.example'))).status, 403);
assert.equal((await call(request('OPTIONS'))).status, 204);
assert.equal(await (await call(request())).json(), null);
assert.equal((await call(request('PUT', { data: empty, expectedRevision: 0 }))).status, 400);
assert.equal((await call(request('PUT', { data, expectedRevision: -1 }))).status, 400);
assert.equal((await call(request('PUT', { data: { ...data, closedPositions: null }, expectedRevision: 0 }))).status, 400);
const first = await call(request('PUT', { data, expectedRevision: 0 }));
assert.equal(first.status, 200);
assert.equal(first.headers.get('Cache-Control'), 'no-store');
assert.equal(first.headers.get('Access-Control-Allow-Origin'), 'https://portfolio.example');
assert.deepEqual((await first.json()).data, data);
assert.equal((await call(request('PUT', { data, expectedRevision: 0 }))).status, 409);
const changed = { ...data, positions: [{ ...position, quantity: 9 }] };
const results = await Promise.all([
  call(request('PUT', { data: changed, expectedRevision: 1 })),
  call(request('PUT', { data, expectedRevision: 1 })),
]);
assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
assert.equal((await (await call(request())).json()).revision, 2);
assert.deepEqual((await (await call(request('GET', undefined, env.SYNC_TOKEN, 'https://portfolio.example', '?revision=1'))).json()).data, data);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM portfolio_versions').get().count, 2);
assert.equal((await call(request('PUT', { data: { ...data, pad: 'x'.repeat(1_000_001) }, expectedRevision: 2 }))).status, 413);
assert.equal((await call(request('PUT', { data: { ...data, pad: '股'.repeat(350_000) }, expectedRevision: 2 }))).status, 413);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM portfolio_versions').get().count, 2);
assert.equal((await call(request('GET', undefined, env.SYNC_TOKEN, 'https://portfolio.example', '?revision=abc'))).status, 400);
assert.equal((await worker.fetch(request(), { ...env, SYNC_TOKEN: '' })).status, 503);

// Exercise restore rollback and exact date preservation with mock browser storage.
class MemoryStorage {
  values = new Map();
  failOn = null;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (this.failOn === key) { this.failOn = null; throw new Error('QuotaExceededError'); }
    this.values.set(key, value);
  }
  removeItem(key) { this.values.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
const names = ['usePositionStore', 'useClosedPositionStore', 'useCashStore', 'useAssetHistoryStore'];
const stubsUrl = moduleUrl(names.map((name) => `export const ${name} = { state: {}, setState(value) { this.state = value; } };`).join('\n'));
const stubStores = await import(stubsUrl);
let cloudSource = compile('../src/services/storage/cloudStorage.ts').replace('./portfolioBackup', backupUrl);
for (const name of names) cloudSource = cloudSource.replace(`../../store/${name}`, stubsUrl);
const { capturePortfolio, restorePortfolio, normalizeCloudUrl, cloudRequest } = await import(moduleUrl(cloudSource));
for (const [key, value] of Object.entries(raw)) localStorage.setItem(key, value);
assert.deepEqual(capturePortfolio().closedPositions, data.closedPositions);
localStorage.failOn = 'portfolio-dashboard:before-restore:v1';
assert.throws(() => restorePortfolio(changed), /Quota/);
for (const [key, value] of Object.entries(raw)) assert.equal(localStorage.getItem(key), value);
localStorage.failOn = DATA_KEYS.cashAccounts;
assert.throws(() => restorePortfolio(changed), /Quota/);
for (const [key, value] of Object.entries(raw)) assert.equal(localStorage.getItem(key), value);
assert.deepEqual(stubStores.usePositionStore.state, {});
restorePortfolio(changed);
assert.deepEqual(stubStores.usePositionStore.state.positions, changed.positions);
assert.equal(stubStores.useClosedPositionStore.state.closedPositions[0].closedAt, '2022-01-01');
assert.equal(stubStores.useAssetHistoryStore.state.snapshots[0].date, '2020-02-02');
assert.deepEqual(JSON.parse(localStorage.getItem('portfolio-dashboard:before-restore:v1')), raw);
const beforeInvalidRestore = localStorage.getItem(DATA_KEYS.positions);
assert.throws(() => restorePortfolio({ ...data, positions: null }));
assert.equal(localStorage.getItem(DATA_KEYS.positions), beforeInvalidRestore);
localStorage.setItem(DATA_KEYS.closedPositions, 'broken-json');
assert.throws(() => capturePortfolio());
assert.equal(normalizeCloudUrl('https://cloud.example/'), 'https://cloud.example');
assert.equal(normalizeCloudUrl('http://localhost:8788/'), 'http://localhost:8788');
assert.throws(() => normalizeCloudUrl('http://cloud.example'));
assert.throws(() => normalizeCloudUrl('https://secret:password@cloud.example'));
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => call(new Request(url, options));
assert.equal((await cloudRequest('https://cloud.example', env.SYNC_TOKEN)).revision, 2);
await assert.rejects(cloudRequest('https://cloud.example', 'wrong'), /密钥/);
await assert.rejects(cloudRequest('https://cloud.example', env.SYNC_TOKEN, data, 0), /已有更新/);
globalThis.fetch = originalFetch;
db.close();
console.log('Cloud backup checks passed: authorization, CORS, migration, dates, validation, concurrent saves, version history, empty backup protection, and restore rollback.');
