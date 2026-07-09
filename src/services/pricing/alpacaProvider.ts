/**
 * ============================================================================
 * Alpaca 股票价格提供者
 * ============================================================================
 * 【重要】Alpaca 的 Market Data API 要求把 API Key/Secret 放在请求 Header 里，
 * 并且不允许浏览器跨域直接调用（没有配置 CORS）。因此这里不能直接从前端
 * fetch Alpaca 官方域名，而是通过一个轻量代理（见 /server/alpaca-proxy 目录，
 * 可部署到 Cloudflare Worker / Vercel Edge Function 等任意平台）转发请求，
 * 代理会把你的 API Key 安全地加到请求头里，前端永远不需要接触真实密钥。
 *
 * 本地开发时，Vite 的 dev server 已经配置了 /api/alpaca 的代理规则
 * （见 vite.config.ts），指向你在 .env.local 里配置的代理地址。
 *
 * 部署到生产环境时，请把 VITE_PRICE_PROXY_BASE_URL 配置成你实际部署的代理地址。
 */
import type { PriceProvider } from './types';
import type { PriceQuote } from '@/types';

/** 代理服务的基础 URL，来自环境变量，见 .env.example */
const PROXY_BASE_URL = import.meta.env.VITE_PRICE_PROXY_BASE_URL || '/api/proxy';

/** Alpaca Latest Trade API 单次请求建议的最大 symbol 数量，避免 URL 过长 */
const BATCH_SIZE = 50;

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export const alpacaProvider: PriceProvider = {
  name: 'alpaca',

  async fetchQuotes(symbols: string[]): Promise<Map<string, PriceQuote>> {
    const result = new Map<string, PriceQuote>();
    if (symbols.length === 0) return result;

    const batches = chunk(symbols, BATCH_SIZE);

    await Promise.all(
      batches.map(async (batch) => {
        try {
          const symbolsParam = batch.join(',');
          // 代理约定的路径：/api/proxy/alpaca/stocks/trades/latest?symbols=AAPL,TSLA
          const url = `${PROXY_BASE_URL}/alpaca/stocks/trades/latest?symbols=${encodeURIComponent(
            symbolsParam
          )}`;
          const res = await fetch(url);
          if (!res.ok) {
            console.error(`[alpacaProvider] 请求失败: ${res.status} ${res.statusText}`);
            return;
          }
          const data = await res.json();

          // Alpaca 官方响应结构: { trades: { AAPL: { p: 123.45, t: "..." }, ... } }
          const trades = data?.trades ?? {};
          const now = new Date().toISOString();

          for (const symbol of batch) {
            const trade = trades[symbol];
            if (trade && typeof trade.p === 'number') {
              const quote: PriceQuote = {
                symbol,
                price: trade.p,
                source: 'alpaca',
                fetchedAt: now,
              };
              result.set(symbol, quote);
            }
          }
        } catch (err) {
          console.error('[alpacaProvider] 批量请求异常:', err);
        }
      })
    );

    return result;
  },
};
