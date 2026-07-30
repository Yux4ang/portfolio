/**
 * ============================================================================
 * 应用级全局配置
 * ============================================================================
 * 把"魔法数字"和可调参数集中放这里，避免散落在各个组件里不好维护。
 */
export const APP_CONFIG = {
  storageKey: 'portfolio-dashboard:positions:v1',
  closedPositionsStorageKey: 'portfolio-dashboard:closed-positions:v1',
  /** 已成功拿到价格的标的，多久视为"过期"需要重新刷新 */
  successRefreshIntervalMs: 5 * 60_000, // 5 分钟
  /** 上次请求失败（比如被限流）的标的，多久后允许重试 */
  failureRetryIntervalMs: 90_000, // 90 秒
  /** 后台检查频率：每隔多久扫一次"有没有标的过期了"，不代表每次都会真正发请求 */
  tickIntervalMs: 30_000, // 30 秒
  currencyDecimals: 2,
  quantityDecimals: 6,
  percentDecimals: 2,
  maxConcurrentPriceRequests: 5,
} as const;