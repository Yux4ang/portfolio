/**
 * ============================================================================
 * 核心数据模型：仓位（Position）
 * ============================================================================
 * 这是整个应用最核心的数据结构。如果以后需要新增字段（比如"备注"、"标签"、
 * "买入日期"等），只需要在这里加字段，然后在：
 *   - components/positions/PositionForm.tsx  (录入表单)
 *   - services/storage/csvIO.ts             (导入导出)
 * 里同步补充即可，其他地方（计算逻辑、展示组件）大多不需要改动。
 */

/** 资产大类：目前仅支持美股和加密货币 */
export type AssetType = 'stock' | 'crypto';

/**
 * 用户手动录入的一条仓位记录（原始数据，未包含实时价格）
 * 这是持久化到 localStorage 的数据结构。
 */
export interface Position {
  /** 唯一 ID（uuid），用于编辑/删除定位 */
  id: string;
  /** 股票/加密货币代码，例如 AAPL / BTC，统一存大写 */
  symbol: string;
  /** 资产类型：stock（美股）或 crypto（加密货币） */
  assetType: AssetType;
  /** 购入均价（用户手动输入） */
  costPrice: number;
  /** 购入数量，支持小数（尤其加密货币） */
  quantity: number;
  /** 购入平台，例如 IBKR / Binance / OKX，用户自由输入，支持多平台 */
  platform: string;
  /** 记录创建时间（ISO 字符串），用于排序和导出追溯 */
  createdAt: string;
  /** 最近一次编辑时间（ISO 字符串） */
  updatedAt: string;
  /** 可选备注，预留字段方便以后扩展 */
  note?: string;
}

/**
 * 创建/编辑仓位时，表单收集到的数据（还没有 id / 时间戳）
 */
export type PositionInput = Omit<Position, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 实时价格信息（来自 Alpaca 或 CoinGecko），与 Position 分开存储，
 * 因为价格是易变的、不需要持久化的派生数据。
 */
export interface PriceQuote {
  symbol: string;
  /** 最新价格 */
  price: number;
  /** 价格数据来源，便于排查问题 / 在 UI 上显示数据源标签 */
 source: 'alpaca' | 'coingecko' | 'finnhub';
  /** 价格更新时间 */
  fetchedAt: string;
  /** 当日涨跌幅百分比（如果数据源提供），仅作展示参考，不参与仓位盈亏计算 */
  dayChangePercent?: number;
}

/**
 * 仓位 + 实时价格 合并计算后的"视图模型"（Enriched Position）。
 * 所有派生的展示字段都在这里统一计算，避免各个组件各自算一遍导致口径不一致。
 */
export interface EnrichedPosition extends Position {
  /** 当前最新价格；价格拉取失败时为 null，UI 需要处理这种情况 */
  currentPrice: number | null;
  /** 当前市值 = currentPrice * quantity；价格未知时为 null */
  marketValue: number | null;
  /** 成本总额 = costPrice * quantity */
  costValue: number;
  /** 盈亏绝对值 = marketValue - costValue */
  pnlAmount: number | null;
  /** 盈亏百分比 = pnlAmount / costValue * 100 */
  pnlPercent: number | null;
  /** 占总资产百分比，需要结合全部仓位一起计算，单独一条仓位算不出来，
   *  因此在聚合阶段（usePortfolioData）填充，默认 0 */
  percentOfTotal: number;
  /** 价格是否拉取成功 */
  priceStatus: 'ok' | 'loading' | 'error';
}
