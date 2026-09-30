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
          <AssetHistoryChart current={summary} />
          <AssetAllocationBar assetTypeSummary={assetTypeSummary} cashValue={summary.cashValue} />
          <CashAccountsPanel />
          <PlatformBreakdown platformSummaries={platformSummaries} />
          <CloudBackupPanel />
          <ImportExportPanel />
        </div>
      ) : activeTab === 'positions' ? (
        <PositionList positions={enrichedPositions} />
      ) : activeTab === 'aggregate' ? (
        <PositionAggregateList positions={aggregatedPositions} />
      ) : (
        <ClosedPositionList />
      )}
    </div>
  );
}

export default App;
