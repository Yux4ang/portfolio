/**
 * ============================================================================
 * App —— 应用主入口
 * ============================================================================
 * 只负责：
 *   1. 页面级别的 Tab 切换（总览 / 仓位管理 / 仓位聚合）
 *   2. 调用 usePortfolioData 拿到全部计算好的数据，往下传给各展示组件
 * 不含任何业务计算逻辑，保持"薄"，方便以后加新页面（比如"历史走势"）。
 */
import { useState } from 'react';
import { Header, type PageTab } from '@/components/layout/Header';
import { SummaryCards } from '@/components/overview/SummaryCards';
import { PlatformBreakdown } from '@/components/overview/PlatformBreakdown';
import { AssetAllocationBar } from '@/components/overview/AssetAllocationBar';
import { ImportExportPanel } from '@/components/overview/ImportExportPanel';
import { PositionList } from '@/components/positions/PositionList';
import { PositionAggregateList } from '@/components/positions/PositionAggregateList';
import { usePortfolioData } from '@/hooks/usePortfolioData';

function App() {
  const [activeTab, setActiveTab] = useState<PageTab>('overview');
  const {
    enrichedPositions,
    aggregatedPositions,
    summary,
    platformSummaries,
    assetTypeSummary,
    priceStatus,
    lastUpdatedAt,
    refreshPrices,
  } = usePortfolioData();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        priceStatus={priceStatus}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={refreshPrices}
      />
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          <SummaryCards summary={summary} />
          <AssetAllocationBar assetTypeSummary={assetTypeSummary} />
          <PlatformBreakdown platformSummaries={platformSummaries} />
          <ImportExportPanel />
        </div>
      ) : activeTab === 'positions' ? (
        <PositionList positions={enrichedPositions} />
      ) : (
        <PositionAggregateList positions={aggregatedPositions} />
      )}
    </div>
  );
}

export default App;