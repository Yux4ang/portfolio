import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test, beforeEach } from 'node:test';
import ts from 'typescript';

// Exercise the real stores and purchase service against isolated, disposable storage.
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
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
function compile(path, imports = {}) {
  let source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [from, to] of Object.entries(imports)) {
    source = source.replaceAll(`'${from}'`, JSON.stringify(to));
  }
  return moduleUrl(source);
}
const configUrl = compile('../src/config/app.ts');
const storageUrl = compile('../src/services/storage/localStorage.ts', { '@/config/app': configUrl });
const storeImports = { zustand: import.meta.resolve('zustand'), uuid: import.meta.resolve('uuid'), '@/services/storage/localStorage': storageUrl };
const cashStoreUrl = compile('../src/store/useCashStore.ts', storeImports);
const positionStoreUrl = compile('../src/store/usePositionStore.ts', storeImports);
const serviceUrl = compile('../src/services/storage/positionPurchase.ts', {
  uuid: import.meta.resolve('uuid'), '@/config/app': configUrl,
  '@/store/useCashStore': cashStoreUrl, '@/store/usePositionStore': positionStoreUrl,
});
const { APP_CONFIG } = await import(configUrl);
const { useCashStore } = await import(cashStoreUrl);
const { usePositionStore } = await import(positionStoreUrl);
const { loadPositions, loadCashAccounts } = await import(storageUrl);
const { addPositionWithCash, getPlatformCashAccounts, purchaseBalance } = await import(serviceUrl);
const input = { symbol: 'aapl', platform: 'IBKR', assetType: 'stock', costPrice: 100, quantity: 2 };
let mainId;
let otherId;
beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  usePositionStore.setState({ positions: [] });
  useCashStore.setState({ accounts: [] });
  useCashStore.getState().addAccount({ name: '主要账户', platform: 'IBKR', balance: 1000 });
  useCashStore.getState().addAccount({ name: '另一平台', platform: 'Binance', balance: 500 });
  [mainId, otherId] = useCashStore.getState().accounts.map(account => account.id);
});

test('purchase saves the position, deducts only the selected account, and records history', () => {
  addPositionWithCash(input, mainId);
  const [main, other] = useCashStore.getState().accounts;
  assert.equal(main.balance, 800);
  assert.equal(other.balance, 500);
  assert.equal(other.balanceHistory.length, 1);
  assert.equal(main.balanceHistory.length, 2);
  assert.equal(main.balanceHistory.at(-1).delta, -200);
  assert.equal(main.balanceHistory.at(-1).previousBalance, 1000);
  assert.equal(main.balanceHistory.at(-1).newBalance, 800);
  assert.match(main.balanceHistory.at(-1).note, /AAPL/);
  assert.equal(usePositionStore.getState().positions[0].symbol, 'AAPL');
  assert.deepEqual(loadPositions(), usePositionStore.getState().positions);
  assert.deepEqual(loadCashAccounts(), useCashStore.getState().accounts);
});

test('opting out preserves cash and history', () => {
  const before = structuredClone(useCashStore.getState().accounts);
  addPositionWithCash(input);
  assert.equal(usePositionStore.getState().positions.length, 1);
  assert.deepEqual(useCashStore.getState().accounts, before);
});

test('actual balance includes fees in cash history while preserving the position cost', () => {
  addPositionWithCash(input, mainId, 797.5);
  const [main, other] = useCashStore.getState().accounts;
  assert.equal(main.balance, 797.5);
  assert.equal(other.balance, 500);
  assert.equal(main.balanceHistory.at(-1).delta, -202.5);
  assert.match(main.balanceHistory.at(-1).note, /较理论余额修正 -2.5 USD/);
  assert.equal(usePositionStore.getState().positions[0].costPrice, 100);
  assert.deepEqual(loadCashAccounts(), useCashStore.getState().accounts);
});

test('an explicit zero actual balance is not treated as an omitted override', () => {
  addPositionWithCash(input, mainId, 0);
  assert.equal(useCashStore.getState().accounts[0].balance, 0);
  assert.equal(useCashStore.getState().accounts[0].balanceHistory.at(-1).delta, -1000);
});

test('actual balance can correct an out-of-date recorded balance', () => {
  useCashStore.getState().updateAccount(mainId, { name: '主要账户', platform: 'IBKR', balance: 100 });
  addPositionWithCash(input, mainId, 50);
  assert.equal(useCashStore.getState().accounts[0].balance, 50);
  assert.equal(usePositionStore.getState().positions.length, 1);
});

test('invalid actual balance rejects both changes', () => {
  const before = new Map(localStorage.values);
  for (const balance of [-1, Infinity, NaN]) {
    assert.throws(() => addPositionWithCash(input, mainId, balance), /实际余额/);
  }
  assert.equal(usePositionStore.getState().positions.length, 0);
  assert.deepEqual(localStorage.values, before);
});

test('actual balance corrections also roll back when persistence fails', () => {
  const before = new Map(localStorage.values);
  localStorage.failOn = APP_CONFIG.cashAccountsStorageKey;
  assert.throws(() => addPositionWithCash(input, mainId, 797.5), /未变更/);
  assert.equal(usePositionStore.getState().positions.length, 0);
  assert.equal(useCashStore.getState().accounts[0].balance, 1000);
  assert.deepEqual(localStorage.values, before);
});

test('platform matching ignores spaces and case; selection does not spend from a different platform', () => {
  assert.equal(getPlatformCashAccounts(useCashStore.getState().accounts, ' ibkr ')[0].id, mainId);
  assert.equal(getPlatformCashAccounts(useCashStore.getState().accounts, '').length, 0);
  assert.throws(() => addPositionWithCash(input, otherId), /不属于/);
  assert.throws(() => addPositionWithCash(input, 'missing'), /不存在/);
  assert.equal(usePositionStore.getState().positions.length, 0);
});

test('multiple same-platform accounts deduct from the selected account only', () => {
  useCashStore.getState().addAccount({ name: '备用账户', platform: 'ibkr', balance: 300 });
  const selected = useCashStore.getState().accounts.at(-1);
  addPositionWithCash(input, selected.id);
  assert.equal(useCashStore.getState().accounts[0].balance, 1000);
  assert.equal(useCashStore.getState().accounts.at(-1).balance, 100);
});

test('insufficient or changed balance blocks both changes', () => {
  useCashStore.getState().updateAccount(mainId, { name: '主要账户', platform: 'IBKR', balance: 100 });
  const before = structuredClone(useCashStore.getState().accounts);
  assert.throws(() => addPositionWithCash(input, mainId), /余额不足/);
  assert.equal(usePositionStore.getState().positions.length, 0);
  assert.deepEqual(useCashStore.getState().accounts, before);
});

test('invalid amounts and overflow do not save anything', () => {
  for (const values of [{ costPrice: Infinity }, { quantity: NaN }, { quantity: 0 }, { costPrice: -1 }, { costPrice: 1e308, quantity: 2 }]) {
    assert.throws(() => addPositionWithCash({ ...input, ...values }, mainId), /有效/);
  }
  assert.equal(usePositionStore.getState().positions.length, 0);
  assert.equal(useCashStore.getState().accounts[0].balance, 1000);
});

test('zero cost and floating-point boundary amounts remain valid', () => {
  assert.equal(purchaseBalance(.3, .1 * 3), 0);
  assert.throws(() => purchaseBalance(.3, .31), /余额不足/);
  addPositionWithCash({ ...input, costPrice: 0 }, mainId);
  assert.equal(useCashStore.getState().accounts[0].balance, 1000);
  assert.equal(useCashStore.getState().accounts[0].balanceHistory.length, 1);
});

test('cash write failure rolls back position persistence, including an existing position list', () => {
  addPositionWithCash(input);
  const beforePositions = structuredClone(usePositionStore.getState().positions);
  const beforeAccounts = structuredClone(useCashStore.getState().accounts);
  const beforeStorage = new Map(localStorage.values);
  localStorage.failOn = APP_CONFIG.cashAccountsStorageKey;
  assert.throws(() => addPositionWithCash(input, mainId), /未变更/);
  assert.deepEqual(localStorage.values, beforeStorage);
  assert.deepEqual(usePositionStore.getState().positions, beforePositions);
  assert.deepEqual(useCashStore.getState().accounts, beforeAccounts);
});

test('first write failure and a previously absent position list leave both stores untouched', () => {
  const before = new Map(localStorage.values);
  localStorage.failOn = APP_CONFIG.storageKey;
  assert.throws(() => addPositionWithCash(input, mainId), /未变更/);
  assert.deepEqual(localStorage.values, before);
  localStorage.failOn = APP_CONFIG.cashAccountsStorageKey;
  assert.throws(() => addPositionWithCash(input, mainId), /未变更/);
  assert.deepEqual(localStorage.values, before);
  assert.equal(usePositionStore.getState().positions.length, 0);
  assert.equal(useCashStore.getState().accounts[0].balance, 1000);
});
