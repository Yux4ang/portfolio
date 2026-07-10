/**
 * ============================================================================
 * 应用级全局配置
 * ============================================================================
 * 把"魔法数字"和可调参数集中放这里，避免散落在各个组件里不好维护。
 */
export const APP_CONFIG = {
  /** localStorage 存储 key（如果以后要做版本迁移，可以在这里改 key 名加版本号） */
  storageKey: 'portfolio-dashboard:positions:v1',
  /** 已了结仓位的 localStorage key */
  closedPositionsStorageKey: 'portfolio-dashboard:closed-positions:v1',
  /** 自动刷新价格的间隔（毫秒）。设为 0 则关闭自动刷新，只能手动刷新。 */
  priceRefreshIntervalMs: 120_000,
  /** 金额展示的小数位数 */
  currencyDecimals: 2,
  /** 数量展示的小数位数（加密货币经常需要更多位） */
  quantityDecimals: 6,
  /** 百分比展示的小数位数 */
  percentDecimals: 2,
  /** 价格请求的批量并发数上限，避免同时发太多请求触发限流 */
  maxConcurrentPriceRequests: 5,
} as const;