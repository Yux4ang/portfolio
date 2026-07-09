/**
 * ============================================================================
 * 应用级全局配置
 * ============================================================================
 * 把"魔法数字"和可调参数集中放这里，避免散落在各个组件里不好维护。
 */
export const APP_CONFIG = {
  storageKey: 'portfolio-dashboard:positions:v1',
  /** 自动刷新价格的间隔（毫秒）。设为 0 则关闭自动刷新，只能手动刷新。 */
  priceRefreshIntervalMs: 120_000,
  currencyDecimals: 2,
  quantityDecimals: 6,
  percentDecimals: 2,
  maxConcurrentPriceRequests: 5,
} as const;