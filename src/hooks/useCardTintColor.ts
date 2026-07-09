/**
 * ============================================================================
 * 卡片背景色 Hook
 * ============================================================================
 * 优先尝试从真实 logo 图片提取平均色；如果图床不支持跨域像素读取
 * （常见于 favicon 服务），fallback 到预设的品牌色映射表。
 * 结果按 logo URL 缓存，避免同一个 symbol 重复计算。
 */
import { useEffect, useState } from 'react';
import { getAssetLogoUrl } from '@/services/pricing/logoService';
import { getAverageColorFromImageUrl } from '@/utils/colorExtraction';
import type { AssetType } from '@/types';

/** 提取失败时的备用品牌色（R, G, B），覆盖你目前持仓涉及的主要 symbol */
const FALLBACK_BRAND_COLORS: Record<string, string> = {
  NVDA: '118, 185, 0',
  TSLA: '229, 57, 53',
  META: '24, 119, 242',
  GOOG: '66, 133, 244',
  GOOGL: '66, 133, 244',
  AMZN: '255, 153, 0',
  MSFT: '0, 164, 239',
  NFLX: '229, 9, 20',
  AMD: '237, 28, 36',
  MU: '0, 124, 176',
  GE: '0, 89, 168',
  WMT: '0, 113, 206',
  GEON: '0, 89, 168',
  WMTON: '0, 113, 206',
  SCHD: '106, 90, 205',
  BTC: '247, 147, 26',
  ETH: '98, 126, 234',
};

const DEFAULT_COLOR = '148, 163, 184'; // 中性灰蓝，兜底

/** 按 logo URL 缓存提取结果，避免重复请求/计算 */
const colorCache = new Map<string, Promise<string | null>>();

export function useCardTintColor(symbol: string, assetType: AssetType): string {
  const [rgb, setRgb] = useState<string>(
    FALLBACK_BRAND_COLORS[symbol.toUpperCase()] ?? DEFAULT_COLOR
  );

  useEffect(() => {
    let cancelled = false;
    const upperSymbol = symbol.toUpperCase();
    const logoUrl = getAssetLogoUrl(symbol, assetType);

    async function resolve() {
      if (logoUrl) {
        if (!colorCache.has(logoUrl)) {
          colorCache.set(logoUrl, getAverageColorFromImageUrl(logoUrl));
        }
        const extracted = await colorCache.get(logoUrl)!;
        if (!cancelled && extracted) {
          setRgb(extracted);
          return;
        }
      }
      if (!cancelled) {
        setRgb(FALLBACK_BRAND_COLORS[upperSymbol] ?? DEFAULT_COLOR);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [symbol, assetType]);

  return rgb;
}