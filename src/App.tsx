/**
 * ============================================================================
 * App —— 应用主入口
 * ============================================================================
 * 只负责：
 *   1. 页面级别的 Tab 切换（总览 / 仓位管理 / 仓位聚合 / 历史仓位）
 *   2. 调用 usePortfolioData 拿到全部计算好的数据，往下传给各展示组件
 * 不含任何业务计算逻辑，保持"薄"，方便以后加新页面。
 */
import { useEffect, useState } from 'react';
import { Header, type PageTab } from '@/components/layout/Header';
import { SummaryCards } from '@/components/overview/SummaryCards';
import { PlatformBreakdown } from '@/components/overview/PlatformBreakdown';
import { AssetAllocationBar } from '@/components/overview/AssetAllocationBar';
import { ImportExportPanel } from '@/components/overview/ImportExportPanel';
import { CloudBackupPanel } from '@/components/overview/CloudBackupPanel';
import { PositionList } from '@/components/positions/PositionList';
import { PositionAggregateList } from '@/components/positions/PositionAggregateList';
import { ClosedPositionList } from '@/components/positions/ClosedPositionList';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { CashAccountsPanel } from '@/components/overview/CashAccountsPanel';
import { AssetHistoryChart } from '@/components/overview/AssetHistoryChart';
import { useAssetHistoryStore } from '@/store/useAssetHistoryStore';
import { getLocalDateKey } from '@/utils/formatters';
import { Button } from '@/components/common/Button';

const PAGE_COPY = {
  overview: ['YOUR PORTFOLIO, AT A GLANCE', '资产，全局在握。', '看清每一份资产，专注每一个决定。'],
  positions: ['YOUR INVESTMENTS', '每一笔，都有条理。', '管理当前持仓，查看市值、盈亏与资产占比。'],
  aggregate: ['THE BIGGER PICTURE', '多处持有，一览无余。', '跨平台聚合仓位，让资产分布更加清晰。'],
  closed: ['YOUR INVESTMENT JOURNEY', '回看，走得更远。', '查看已了结的仓位，回顾每一次投资。'],
} as const;

function App() {
  const [activeTab, setActiveTab] = useState<PageTab>('overview');
  const {
    enrichedPositions,
    aggregatedPositions,
    positionsByPlatform,
    summary,
    platformSummaries,
    assetTypeSummary,
    priceStatus,
    lastUpdatedAt,
    refreshPrices,
  } = usePortfolioData();
  const upsertSnapshot = useAssetHistoryStore((s) => s.upsertSnapshot);

  useEffect(() => {
    const pricesReady = enrichedPositions.length === 0 || priceStatus === 'success';
    if (!pricesReady || summary.totalAssets <= 0) return;
    upsertSnapshot({
      date: getLocalDateKey(),
      totalAssets: summary.totalAssets,
      investmentValue: summary.investmentValue,
      cashValue: summary.cashValue,
    });
  }, [enrichedPositions.length, priceStatus, summary.totalAssets, summary.investmentValue, summary.cashValue, upsertSnapshot]);

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        priceStatus={priceStatus}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={refreshPrices}
      />
      <main id="main-content" className="app-shell">
        <section className="page-intro">
          <div>
            <div className="eyebrow">{PAGE_COPY[activeTab][0]}</div>
            <h1>{PAGE_COPY[activeTab][1]}</h1>
            <p>{PAGE_COPY[activeTab][2]}</p>
          </div>
          {activeTab === 'overview' && <Button variant="secondary" onClick={() => setActiveTab('positions')}>管理仓位 <span aria-hidden="true">↗</span></Button>}
        </section>
        <div key={activeTab} className="page-content page-enter">
      {activeTab === 'overview' ? (
        <div className="overview-layout">
          <SummaryCards summary={summary} />
          <div className="analytics-grid">
          <AssetHistoryChart current={summary} />
          <AssetAllocationBar assetTypeSummary={assetTypeSummary} cashValue={summary.cashValue} />
          </div>
          <CashAccountsPanel />
          <PlatformBreakdown platformSummaries={platformSummaries} />
          <div className="utilities-grid">
          <CloudBackupPanel />
          <ImportExportPanel />
          </div>
        </div>
      ) : activeTab === 'positions' ? (
        <PositionList positions={enrichedPositions} />
      ) : activeTab === 'aggregate' ? (
        <PositionAggregateList
          positions={aggregatedPositions}
          platformGroups={positionsByPlatform}
        />
      ) : (
        <ClosedPositionList />
      )}
        </div>
        <footer className="site-footer"><span>Portfolio · 让资产管理更从容。</span><span>所有资产金额以 USD 显示</span></footer>
      </main>
    </>
  );
}

export default App;
