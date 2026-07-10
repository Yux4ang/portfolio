/**
 * 顶部导航栏：Logo/标题、页面切换 Tab、价格刷新状态与手动刷新按钮。
 */
import type { PriceFeedStatus } from '@/hooks/usePriceFeed';
import { formatRelativeTime } from '@/utils/formatters';

export type PageTab = 'overview' | 'positions' | 'aggregate' | 'closed';

interface HeaderProps {
  activeTab: PageTab;
  onTabChange: (tab: PageTab) => void;
  priceStatus: PriceFeedStatus;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
}

const TABS: { key: PageTab; label: string }[] = [
  { key: 'overview', label: '总览' },
  { key: 'positions', label: '仓位管理' },
  { key: 'aggregate', label: '仓位聚合' },
  { key: 'closed', label: '历史仓位' },
];

export function Header({ activeTab, onTabChange, priceStatus, lastUpdatedAt, onRefresh }: HeaderProps) {
  return (
    <header className="glass-panel mb-6 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-app-sm bg-brand-500 flex items-center justify-center font-bold text-white">
          P
        </div>
        <span className="text-lg font-semibold text-text-primary">Portfolio Dashboard</span>
      </div>

      <nav className="flex gap-1 bg-white/5 rounded-app-sm p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-1.5 rounded-app-sm text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-500 text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-text-muted">
          {priceStatus === 'loading' ? '价格更新中...' : `更新于 ${formatRelativeTime(lastUpdatedAt ?? undefined)}`}
        </span>
       <button
  onClick={onRefresh}
  disabled={priceStatus === 'loading'}
          className="p-2 rounded-app-sm text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-40"
          title="手动刷新价格"
        >
          ⟳
        </button>
      </div>
    </header>
  );
}
