import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/utils/positionView.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { sortPositions, getPositionPurchaseTime, loadPositionView, savePositionView } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const records = [
  { id: 'later', purchasedAt: '2026-11-10', createdAt: '2026-01-01T00:00:00Z', marketValue: 200 },
  { id: 'older', purchasedAt: '2026-01-03', createdAt: '2026-11-01T00:00:00Z', marketValue: 500 },
  { id: 'fallback', createdAt: '2026-05-01T00:00:00Z', marketValue: 100 },
  { id: 'invalid-purchase', purchasedAt: 'invalid', createdAt: '2026-06-01T00:00:00Z', marketValue: null },
  { id: 'unknown', purchasedAt: '', createdAt: 'invalid', marketValue: 10 },
];
const ids = values => values.map(value => value.id);

test('purchase date takes priority over creation time in both directions', () => {
  assert.deepEqual(ids(sortPositions(records, 'purchased-oldest')), ['older', 'fallback', 'invalid-purchase', 'later', 'unknown']);
  assert.deepEqual(ids(sortPositions(records, 'purchased-newest')), ['later', 'invalid-purchase', 'fallback', 'older', 'unknown']);
});

test('missing and invalid purchase dates fall back to creation time; unknown dates stay last', () => {
  assert.equal(getPositionPurchaseTime(records[2]), Date.parse('2026-05-01T00:00:00Z'));
  assert.equal(getPositionPurchaseTime(records[3]), Date.parse('2026-06-01T00:00:00Z'));
  assert.equal(getPositionPurchaseTime(records[4]), null);
  assert.equal(sortPositions(records, 'purchased-oldest').at(-1).id, 'unknown');
  assert.equal(sortPositions(records, 'purchased-newest').at(-1).id, 'unknown');
});

test('equal dates retain their order, and sorting never changes the original array', () => {
  const original = structuredClone(records);
  const sameDay = [{ ...records[0], id: 'a' }, { ...records[0], id: 'b' }];
  assert.deepEqual(ids(sortPositions(sameDay, 'purchased-newest')), ['a', 'b']);
  sortPositions(records, 'purchased-newest');
  assert.deepEqual(records, original);
  assert.deepEqual(sortPositions([], 'purchased-oldest'), []);
});

test('market value sorting remains available', () => {
  assert.deepEqual(ids(sortPositions(records, 'market-value')), ['older', 'later', 'fallback', 'unknown', 'invalid-purchase']);
});

test('view preferences persist without changing portfolio records', () => {
  const data = new Map([['portfolio-dashboard:positions:v1', 'unchanged']]);
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  for (const columns of [1, 2, 3]) {
    savePositionView({ sort: 'purchased-oldest', columns });
    assert.deepEqual(loadPositionView(), { sort: 'purchased-oldest', columns });
  }
  assert.equal(data.get('portfolio-dashboard:positions:v1'), 'unchanged');
});

test('unavailable or malformed preference storage uses safe defaults', () => {
  const defaults = { sort: 'purchased-newest', columns: 2 };
  for (const raw of ['broken', 'null', '{"sort":"invalid","columns":99}']) {
    globalThis.localStorage = { getItem: () => raw };
    assert.deepEqual(loadPositionView(), defaults);
  }
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadPositionView(), defaults);
  assert.doesNotThrow(() => savePositionView(defaults));
});
