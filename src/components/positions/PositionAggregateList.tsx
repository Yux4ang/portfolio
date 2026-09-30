/**
 * 仓位聚合页：
 * - 按股票：保留原有 ticker 聚合卡片，点击后可查看各平台明细。
 * - 按平台：反向查看每个券商账户下的全部资产。
 *
 * 两种视图都使用 calculations.ts 的同一套汇总口径。
 */
import { useState } from 'react';
import type {
  AccountPositionBreakdown,
  AggregatedPosition,
  PlatformPositionGroup,
} from '@/utils/calculations';
import { AssetIcon } from '@/components/common/AssetIcon';
import { Modal } from '@/components/common/Modal';
import { useCardTintColor } from '@/hooks/useCardTintColor';
import { formatCurrency, formatPercent, formatQuantity, getPnlColorClass } from '@/utils/formatters';

interface PositionAggregateListProps {
  positions: AggregatedPosition[];
  platformGroups: PlatformPositionGroup[];
}

type ViewMode = 'symbol' | 'platform';

const COLUMN_CLASS_MAP: Record<number, string> = {
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6',
};

const COLUMN_OPTIONS = [3, 4, 5, 6];

function formatSignedCurrency(value: number | null) {
  if (value === null) return '--';
  return `${value > 0 ? '+' : ''}${formatCurrency(value)}`;
}

function nearlyEqual(left: number | null, right: number | null) {
  if (left === null || right === null) return left === right;
  return Math.abs(left - right) <= Math.max(1, Math.abs(left), Math.abs(right)) * 1e-9;
}

function sumKnown(values: Array<number | null>) {
  return values.every((value) => value !== null)
    ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
}

function SummaryMetric({
  label,
  value,
  valueClassName = 'text-text-primary',
  hint,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-app-md border border-white/15 bg-white/10 p-3 min-w-0">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`font-semibold text-sm sm:text-base tabular-nums break-words ${valueClassName}`}>{value}</div>
      {hint && <div className="text-[11px] text-text-muted mt-1">{hint}</div>}
    </div>
  );
}

function AggregateCard({
  position: p,
  onOpen,
}: {
  position: AggregatedPosition;
  onOpen: (position: AggregatedPosition) => void;
}) {
  const pnlColor = getPnlColorClass(p.totalPnlAmount);
  const tintRgb = useCardTintColor(p.symbol, p.assetType);

  return (
    <button
      type="button"
      onClick={() => onOpen(p)}
      className="glass-panel-hover p-4 flex flex-col gap-3 border text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{
        borderRadius: '28px',
        background: `linear-gradient(135deg, rgba(${tintRgb}, 0.28), rgba(${tintRgb}, 0.06))`,
        borderColor: `rgba(${tintRgb}, 0.25)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      aria-label={`查看 ${p.symbol} 的账户明细`}
    >
      <div className="flex items-center gap-3 min-w-0 w-full">
        <AssetIcon symbol={p.symbol} assetType={p.assetType} size={40} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-text-primary truncate">{p.symbol}</div>
          <div className="text-xs text-text-muted truncate">
            {p.platforms.join(' · ')} · {formatQuantity(p.totalQuantity)}
          </div>
        </div>
        <span className="text-text-muted text-lg" aria-hidden="true">›</span>
      </div>

      <div className="text-right w-full">
        <div className="text-lg font-semibold text-text-primary">
          {p.totalMarketValue !== null ? formatCurrency(p.totalMarketValue) : '--'}
        </div>
        <div className={`text-sm font-medium ${pnlColor}`}>
          {formatSignedCurrency(p.totalPnlAmount)}
          {p.totalPnlPercent !== null && ` (${formatPercent(p.totalPnlPercent)})`}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-white/10 w-full">
        <span>均价 {formatCurrency(p.avgCostPrice)}</span>
        <span>{p.accountBreakdown.length} 个账户 · 查看明细</span>
      </div>
    </button>
  );
}

function ReconciliationItem({ label, value, verified }: { label: string; value: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-app-sm bg-white/10 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] text-text-muted">{label}</div>
        <div className="text-xs text-text-secondary tabular-nums break-words">{value}</div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
          verified ? 'bg-gain-bg text-gain' : 'bg-loss-bg text-loss'
        }`}
      >
        {verified ? '✓ 已核对' : '需检查'}
      </span>
    </div>
  );
}

function AccountBreakdownTable({ accounts }: { accounts: AccountPositionBreakdown[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {accounts.map((account) => (
          <div key={account.platform} className="rounded-app-md border border-white/20 bg-white/10 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-text-primary">{account.platform}</div>
              <div className="text-[11px] text-text-muted">{account.lotCount} 笔原始记录</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <MobileValue label="持仓数量" value={formatQuantity(account.quantity)} />
              <MobileValue label="市值" value={formatCurrency(account.marketValue)} />
              <MobileValue label="成本" value={formatCurrency(account.costValue)} />
              <MobileValue label="平均成本" value={formatCurrency(account.averageCost)} />
              <MobileValue
                label="P&L"
                value={`${formatSignedCurrency(account.pnlAmount)}  ${formatPercent(account.pnlPercent)}`}
                valueClassName={getPnlColorClass(account.pnlAmount)}
                className="col-span-2"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto rounded-app-md border border-white/15">
        <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-white/10 text-left text-xs text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">平台</th>
            <th className="px-4 py-3 font-medium text-right">持仓数量</th>
            <th className="px-4 py-3 font-medium text-right">市值</th>
            <th className="px-4 py-3 font-medium text-right">成本</th>
            <th className="px-4 py-3 font-medium text-right">平均成本</th>
            <th className="px-4 py-3 font-medium text-right">P&amp;L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {accounts.map((account) => (
            <tr key={account.platform} className="text-text-secondary">
              <td className="px-4 py-3">
                <div className="font-medium text-text-primary">{account.platform}</div>
                <div className="text-[11px] text-text-muted">
                  {account.lotCount} 笔原始记录
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(account.quantity)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(account.marketValue)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(account.costValue)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(account.averageCost)}</td>
              <td className={`px-4 py-3 text-right tabular-nums ${getPnlColorClass(account.pnlAmount)}`}>
                <div>{formatSignedCurrency(account.pnlAmount)}</div>
                <div className="text-[11px]">{formatPercent(account.pnlPercent)}</div>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

function MobileValue({
  label,
  value,
  valueClassName = 'text-text-primary',
  className = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[11px] text-text-muted mb-0.5">{label}</div>
      <div className={`font-medium tabular-nums ${valueClassName}`}>{value}</div>
    </div>
  );
}

function PositionDetail({ position: p }: { position: AggregatedPosition }) {
  const accountQuantity = p.accountBreakdown.reduce((sum, account) => sum + account.quantity, 0);
  const accountCost = p.accountBreakdown.reduce((sum, account) => sum + account.costValue, 0);
  const accountMarketValue = sumKnown(p.accountBreakdown.map((account) => account.marketValue));
  const calculatedAverageCost = accountQuantity !== 0 ? accountCost / accountQuantity : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <AssetIcon symbol={p.symbol} assetType={p.assetType} size={44} />
        <div>
          <div className="font-semibold text-text-primary">{p.symbol} 聚合仓位</div>
          <div className="text-sm text-text-muted">
            {p.accountBreakdown.length} 个账户 · {p.lotCount} 笔原始记录
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <SummaryMetric label="总持仓" value={formatQuantity(p.totalQuantity)} hint="Σ 各平台持仓" />
        <SummaryMetric label="总市值" value={formatCurrency(p.totalMarketValue)} hint="Σ 各平台市值" />
        <SummaryMetric label="总成本" value={formatCurrency(p.totalCostValue)} hint="Σ 各平台成本" />
        <SummaryMetric label="综合均价" value={formatCurrency(p.avgCostPrice)} hint="总成本 ÷ 总持仓" />
        <SummaryMetric
          label="总盈亏"
          value={`${formatSignedCurrency(p.totalPnlAmount)}  ${formatPercent(p.totalPnlPercent)}`}
          valueClassName={getPnlColorClass(p.totalPnlAmount)}
          hint="总市值 − 总成本"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">口径核对</h3>
          {p.totalMarketValue === null && (
            <span className="text-xs text-warn">市值尚未获得完整报价</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ReconciliationItem
            label="总持仓 = Σ 平台持仓"
            value={`${formatQuantity(p.totalQuantity)} = ${formatQuantity(accountQuantity)}`}
            verified={nearlyEqual(p.totalQuantity, accountQuantity)}
          />
          <ReconciliationItem
            label="总市值 = Σ 平台市值"
            value={`${formatCurrency(p.totalMarketValue)} = ${formatCurrency(accountMarketValue)}`}
            verified={nearlyEqual(p.totalMarketValue, accountMarketValue)}
          />
          <ReconciliationItem
            label="总成本 = Σ 平台成本"
            value={`${formatCurrency(p.totalCostValue)} = ${formatCurrency(accountCost)}`}
            verified={nearlyEqual(p.totalCostValue, accountCost)}
          />
          <ReconciliationItem
            label="综合均价 = 总成本 ÷ 总持仓"
            value={`${formatCurrency(p.avgCostPrice)} = ${formatCurrency(calculatedAverageCost)}`}
            verified={nearlyEqual(p.avgCostPrice, calculatedAverageCost)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">账户明细</h3>
        <AccountBreakdownTable accounts={p.accountBreakdown} />
      </div>
    </div>
  );
}

function PlatformGroupCard({
  group,
  onSelectSymbol,
}: {
  group: PlatformPositionGroup;
  onSelectSymbol: (symbol: string) => void;
}) {
  return (
    <section className="glass-panel overflow-hidden">
      <div className="p-5 border-b border-white/15">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-app-md bg-brand-500/15 text-brand-600 flex items-center justify-center font-semibold">
              {group.platform.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{group.platform}</h3>
              <p className="text-xs text-text-muted">
                {group.assetCount} 种资产 · {group.lotCount} 笔原始记录
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 lg:min-w-[470px]">
            <div className="text-left lg:text-right">
              <div className="text-xs text-text-muted">市值</div>
              <div className="font-semibold text-text-primary">{formatCurrency(group.totalMarketValue)}</div>
            </div>
            <div className="text-left lg:text-right">
              <div className="text-xs text-text-muted">成本</div>
              <div className="font-semibold text-text-primary">{formatCurrency(group.totalCostValue)}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 text-left lg:text-right">
              <div className="text-xs text-text-muted">盈亏</div>
              <div className={`font-semibold ${getPnlColorClass(group.totalPnlAmount)}`}>
                {formatSignedCurrency(group.totalPnlAmount)}
                <span className="ml-1 text-[11px]">{formatPercent(group.totalPnlPercent)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden divide-y divide-white/10">
        {group.holdings.map((holding) => (
          <button
            key={holding.symbol}
            type="button"
            onClick={() => onSelectSymbol(holding.symbol)}
            className="w-full p-4 text-left hover:bg-white/10 transition-colors"
            aria-label={`查看 ${holding.symbol} 的全部账户明细`}
          >
            <div className="flex items-center gap-3 mb-3">
              <AssetIcon symbol={holding.symbol} assetType={holding.assetType} size={30} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-text-primary">{holding.symbol}</div>
                <div className="text-[11px] text-text-muted">{holding.lotCount} 笔 · 查看全部账户 ›</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <MobileValue label="持仓数量" value={formatQuantity(holding.quantity)} />
              <MobileValue label="市值" value={formatCurrency(holding.marketValue)} />
              <MobileValue label="成本" value={formatCurrency(holding.costValue)} />
              <MobileValue label="平均成本" value={formatCurrency(holding.averageCost)} />
              <MobileValue
                label="P&L"
                value={`${formatSignedCurrency(holding.pnlAmount)}  ${formatPercent(holding.pnlPercent)}`}
                valueClassName={getPnlColorClass(holding.pnlAmount)}
                className="col-span-2"
              />
            </div>
          </button>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-text-muted bg-white/5">
            <tr>
              <th className="px-5 py-3 font-medium">资产</th>
              <th className="px-4 py-3 font-medium text-right">持仓数量</th>
              <th className="px-4 py-3 font-medium text-right">市值</th>
              <th className="px-4 py-3 font-medium text-right">成本</th>
              <th className="px-4 py-3 font-medium text-right">平均成本</th>
              <th className="px-5 py-3 font-medium text-right">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {group.holdings.map((holding) => (
              <tr
                key={holding.symbol}
                className="text-text-secondary hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => onSelectSymbol(holding.symbol)}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectSymbol(holding.symbol);
                  }
                }}
                aria-label={`查看 ${holding.symbol} 的全部账户明细`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <AssetIcon symbol={holding.symbol} assetType={holding.assetType} size={30} />
                    <div>
                      <div className="font-medium text-text-primary">{holding.symbol}</div>
                      <div className="text-[11px] text-text-muted">{holding.lotCount} 笔 · 查看明细 ›</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(holding.quantity)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(holding.marketValue)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(holding.costValue)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(holding.averageCost)}</td>
                <td className={`px-5 py-3 text-right tabular-nums ${getPnlColorClass(holding.pnlAmount)}`}>
                  <div>{formatSignedCurrency(holding.pnlAmount)}</div>
                  <div className="text-[11px]">{formatPercent(holding.pnlPercent)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PositionAggregateList({ positions, platformGroups }: PositionAggregateListProps) {
  const [columns, setColumns] = useState(4);
  const [viewMode, setViewMode] = useState<ViewMode>('symbol');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const selectedPosition = positions.find((position) => position.symbol === selectedSymbol) ?? null;

  function openSymbolDetail(symbol: string) {
    setSelectedSymbol(symbol);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">仓位聚合</h2>
          <p className="text-sm text-text-muted mt-1">
            {viewMode === 'symbol'
              ? '同一 ticker 在不同平台的持仓继续合并，点击卡片可查看账户明细'
              : '按券商账户查看全部资产，点击任一 ticker 可反查其他账户仓位'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-app-md border border-white/20 bg-white/10 p-1" aria-label="资产查看维度">
            {([
              ['symbol', '按股票'],
              ['platform', '按平台'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-app-sm text-sm font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
                aria-pressed={viewMode === mode}
              >
                {label}
              </button>
            ))}
          </div>

          {viewMode === 'symbol' && positions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">每行</span>
              <div className="flex gap-1 bg-white/5 rounded-app-sm p-1">
                {COLUMN_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setColumns(n)}
                    className={`px-2.5 py-1 rounded-app-sm text-xs font-medium transition-colors ${
                      columns === n
                        ? 'bg-brand-500 text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="glass-panel p-10 text-center text-text-secondary">
          还没有任何仓位记录。
        </div>
      ) : viewMode === 'symbol' ? (
        <div className={`grid ${COLUMN_CLASS_MAP[columns]} gap-4`}>
          {positions.map((position) => (
            <AggregateCard
              key={position.symbol}
              position={position}
              onOpen={(item) => setSelectedSymbol(item.symbol)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {platformGroups.map((group) => (
            <PlatformGroupCard key={group.platform} group={group} onSelectSymbol={openSymbolDetail} />
          ))}
        </div>
      )}

      <Modal
        open={selectedPosition !== null}
        onClose={() => setSelectedSymbol(null)}
        title={selectedPosition ? `${selectedPosition.symbol} · 账户明细` : '账户明细'}
        maxWidthClassName="max-w-5xl"
      >
        {selectedPosition && <PositionDetail position={selectedPosition} />}
      </Modal>
    </div>
  );
}
