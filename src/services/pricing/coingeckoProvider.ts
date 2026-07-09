/**
 * ============================================================================
 * CoinGecko 加密货币价格提供者
 * ============================================================================
 * CoinGecko 的 /simple/price 接口支持 CORS，可以直接从浏览器调用，
 * 不需要经过后端代理。免费版有速率限制（约 10-30 次/分钟），
 * 所以这里把所有 symbol 合并成一次请求，而不是每个 symbol 单独请求。
 *
 * 【已知限制】CoinGecko 用的是 "coin id"（例如 bitcoin, ethereum），
 * 而不是交易所常见的 ticker（BTC, ETH）。这里维护一个常见币种的
 * ticker -> coin id 映射表（见 SYMBOL_TO_COINGECKO_ID）。
 * 如果你持仓里有个新币种查不到价格，多半是因为这个映射表里没有它，
 * 去 https://api.coingecko.com/api/v3/coins/list 查到对应 id 后加进映射表即可。
 */
import type { PriceProvider } from './types';
import type { PriceQuote } from '@/types';

/** 常见加密货币 ticker -> CoinGecko coin id 映射表。可自行增补。 */
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  LTC: 'litecoin',
  TRX: 'tron',
  TON: 'the-open-network',
  USDT: 'tether',
  USDC: 'usd-coin',
  SHIB: 'shiba-inu',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  ETC: 'ethereum-classic',
  GEON: 'general-electric-ondo-tokenized-stock',
  WMTON: 'walmart-ondo-tokenized-stock',
};

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export const coingeckoProvider: PriceProvider = {
  name: 'coingecko',

  async fetchQuotes(symbols: string[]): Promise<Map<string, PriceQuote>> {
    const result = new Map<string, PriceQuote>();
    if (symbols.length === 0) return result;

    // 把 ticker 转成 coingecko id，同时记录反向映射方便查回 symbol
    const idToSymbol = new Map<string, string>();
    for (const symbol of symbols) {
      const id = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
      if (id) {
        idToSymbol.set(id, symbol.toUpperCase());
      } else {
        console.warn(`[coingeckoProvider] 未找到 ${symbol} 对应的 CoinGecko id，已跳过`);
      }
    }

    if (idToSymbol.size === 0) return result;

    try {
      const ids = Array.from(idToSymbol.keys()).join(',');
      const url = `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`[coingeckoProvider] 请求失败: ${res.status} ${res.statusText}`);
        return result;
      }

      const data = await res.json();
      const now = new Date().toISOString();

      for (const [id, symbol] of idToSymbol.entries()) {
        const entry = data[id];
        if (entry && typeof entry.usd === 'number') {
          result.set(symbol, {
            symbol,
            price: entry.usd,
            source: 'coingecko',
            fetchedAt: now,
            dayChangePercent: entry.usd_24h_change,
          });
        }
      }
    } catch (err) {
      console.error('[coingeckoProvider] 请求异常:', err);
    }

    return result;
  },
};
