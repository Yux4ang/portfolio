/**
 * ============================================================================
 * 格式化工具函数
 * ============================================================================
 * 统一管理数字/金额/百分比的展示格式，避免各组件里到处写 toFixed(2)。
 * 想要全局改成不同的小数位数或千分位风格？改这里 + config/app.ts 即可。
 */
import { APP_CONFIG } from '@/config/app';

/** 格式化为美元金额，例如 $1,234.56 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: APP_CONFIG.currencyDecimals,
    maximumFractionDigits: APP_CONFIG.currencyDecimals,
  }).format(value);
}

/** 格式化为百分比，例如 +12.34% / -5.67% */
export function formatPercent(value: number | null | undefined, withSign = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const sign = withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(APP_CONFIG.percentDecimals)}%`;
}

/** 格式化数量（支持小数，去除多余尾随 0），例如 0.001234 / 10 */
export function formatQuantity(value: number): string {
  const fixed = value.toFixed(APP_CONFIG.quantityDecimals);
  // 去掉多余的尾随 0，但至少保留整数部分
  return parseFloat(fixed).toString();
}

/** 根据数值判断展示用的语义色 class（盈利/亏损/中性） */
export function getPnlColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-text-secondary';
  if (value > 0) return 'text-gain';
  if (value < 0) return 'text-loss';
  return 'text-text-secondary';
}

/** 格式化相对时间，例如 "刚刚" / "3分钟前"，用于展示价格更新时间 */
export function formatRelativeTime(isoString: string | undefined): string {
  if (!isoString) return '--';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return '刚刚';
  if (diffSec < 60) return `${diffSec}秒前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}小时前`;
}

/** 使用浏览器本地时区生成 YYYY-MM-DD，避免 UTC 在凌晨把日期记到前一天。 */
export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
