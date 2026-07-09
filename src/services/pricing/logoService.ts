/**
 * ============================================================================
 * Logo 图标服务
 * ============================================================================
 * 【2026-07 更新】DuckDuckGo 图标服务浏览器直连会被 CORS 拦截，
 * 改为经由 Cloudflare Worker（server/alpaca-proxy）代理转发。
 * Worker 侧路由见 /icon?domain=xxx.com。
 *
 *   - 股票: 通过公司域名猜测 + Worker 代理 DuckDuckGo 图标服务
 *   - 加密货币: 使用开源的 spothq/cryptocurrency-icons 项目托管在 jsdelivr 上
 *     （jsdelivr 本身带 CORS 头，可以直连，不需要走代理）
 *   - Ondo 代币化股票 (如 GEON/WMTON): 展示背后真实股票的 logo
 *
 * 【说明】取不到图标时会 fallback 成文字首字母头像
 * （见 components/common/AssetIcon.tsx），不影响功能使用。
 */
import type { AssetType } from '@/types';

/** 少量常见美股 symbol -> 官网域名 的映射 */
const STOCK_DOMAIN_MAP: Record<string, string> = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  TSLA: 'tesla.com',
  NVDA: 'nvidia.com',
  NFLX: 'netflix.com',
  AMD: 'amd.com',
  AVGO: 'broadcom.com',
  ORCL: 'oracle.com',
  CRM: 'salesforce.com',
  ADBE: 'adobe.com',
  INTC: 'intel.com',
  QCOM: 'qualcomm.com',
  SCHD: 'schwab.com',
  GE: 'ge.com',
  BA: 'boeing.com',
  DIS: 'disney.com',
  V: 'visa.com',
  MA: 'mastercard.com',
  JPM: 'jpmorganchase.com',
  KO: 'coca-cola.com',
  PEP: 'pepsico.com',
  WMT: 'walmart.com',
  COST: 'costco.com',
  MU: 'micron.com',
};

/** Ondo 代币化股票 ticker -> 背后真实股票 ticker 的映射 */
const ONDO_TOKENIZED_TO_STOCK: Record<string, string> = {
  GEON: 'GE',
  WMTON: 'WMT',
};

/** 加密货币图标托管仓库（开源，社区维护，覆盖主流币种） */
const CRYPTO_ICON_BASE =
  'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color';

/** Cloudflare Worker 代理地址，和 Finnhub 报价代理共用同一个 Worker */
const API_PROXY_BASE = import.meta.env.VITE_PRICE_PROXY_BASE_URL;

export function getAssetLogoUrl(symbol: string, assetType: AssetType): string | null {
  const upperSymbol = symbol.toUpperCase();

  // Ondo 代币化股票：优先展示背后真实股票的 logo
  const underlyingStock = ONDO_TOKENIZED_TO_STOCK[upperSymbol];
  if (underlyingStock) {
    const domain = STOCK_DOMAIN_MAP[underlyingStock];
    if (domain) {
      return `${API_PROXY_BASE}/icon?domain=${domain}`;
    }
  }

  if (assetType === 'crypto') {
    // jsdelivr 是公共 CDN，本身带 CORS 头，不需要走代理
    return `${CRYPTO_ICON_BASE}/${symbol.toLowerCase()}.png`;
  }

  // stock
  const domain = STOCK_DOMAIN_MAP[upperSymbol];
  if (!domain) return null;
  return `${API_PROXY_BASE}/icon?domain=${domain}`;
}