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
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // 打开弹窗时禁止 body 滚动，关闭时恢复
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        style={{ background: 'rgba(20, 22, 34, 0.85)' }}
        onClick={(e) => e.stopPropagation()}
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
