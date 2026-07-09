/**
 * 通用玻璃拟态卡片容器，全站统一的卡片外观都通过这个组件复用。
 * 想改卡片的圆角/边框/模糊效果，去改 index.css 里的 .glass-panel 即可，
 * 这个组件本身不需要动。
 */
import type { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** 是否启用 hover 效果（微上浮 + 背景变亮），列表项常用，纯展示卡片可关闭 */
  hoverable?: boolean;
}

export function GlassCard({ children, hoverable = false, className = '', ...rest }: GlassCardProps) {
  return (
    <div
      className={`glass-panel ${hoverable ? 'glass-panel-hover' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
