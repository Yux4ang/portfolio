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
    <header className="site-header">
      <div className="app-shell header-inner">
        <button className="brand" onClick={() => onTabChange('overview')} aria-label="Portfolio 首页">
          <svg className="brand-mark" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <rect x="2" y="15" width="6" height="12" rx="2" fill="currentColor" opacity=".35" />
            <rect x="12" y="9" width="6" height="18" rx="2" fill="currentColor" opacity=".6" />
            <rect x="22" y="3" width="6" height="24" rx="2" fill="currentColor" />
          </svg>
          <span>Portfolio.</span>
        </button>
        <nav className="main-nav" aria-label="主导航">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => onTabChange(tab.key)} className="nav-item"
              aria-current={activeTab === tab.key ? 'page' : undefined}>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="feed-status">
          <span className={`status-dot ${priceStatus === 'loading' ? 'loading' : priceStatus === 'error' ? 'error' : ''}`} aria-hidden="true" />
          <span className="feed-time" role="status">
            {priceStatus === 'loading' ? '价格更新中…' : priceStatus === 'error' ? '价格更新失败' : lastUpdatedAt ? `更新于 ${formatRelativeTime(lastUpdatedAt)}` : '等待价格更新'}
          </span>
          <button onClick={onRefresh} disabled={priceStatus === 'loading'} className="refresh-button disabled:opacity-40" title="手动刷新价格" aria-label="手动刷新价格">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={priceStatus === 'loading' ? 'animate-spin' : ''} aria-hidden="true">
              <path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
