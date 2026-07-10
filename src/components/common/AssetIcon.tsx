/**
 * 资产 Logo 展示组件。
 * 优先尝试加载真实 logo 图片，加载失败（onError）时自动 fallback 成
 * "首字母圆形头像"，保证任何 symbol 都有合理的展示效果。
 */
import { useState } from 'react';
import { getAssetLogoUrl } from '@/services/pricing/logoService';
import type { AssetType } from '@/types';

interface AssetIconProps {
  symbol: string;
  assetType: AssetType;
  size?: number;
}

/** 根据 symbol 字符串生成一个稳定的背景色，让不同资产的 fallback 头像有区分度 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function AssetIcon({ symbol, assetType, size = 36 }: AssetIconProps) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getAssetLogoUrl(symbol, assetType);

  if (!logoUrl || imgError) {
    return (
      <div
        className="flex items-center justify-center rounded-full font-semibold text-white shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: stringToColor(symbol),
          fontSize: size * 0.4,
        }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

   return (
    <img
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0 bg-white/10"
      onError={() => setImgError(true)}
    />
  );
}
