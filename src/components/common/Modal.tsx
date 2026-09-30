/**
 * 通用弹窗（Modal）容器。用于新增/编辑仓位表单、确认删除等场景。
 */
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 默认保持表单弹窗宽度，复杂数据明细可传入更大宽度 */
  maxWidthClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = 'max-w-lg',
}: ModalProps) {
  // 打开弹窗时禁止 body 滚动，关闭时恢复
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`glass-panel w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto p-6`}
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          boxShadow: '0 24px 80px rgba(44, 38, 62, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl leading-none px-2"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
