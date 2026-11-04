/**
 * 通用弹窗（Modal）容器。用于新增/编辑仓位表单、确认删除等场景。
 */
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  // 打开弹窗时禁止 body 滚动，关闭时恢复
  useEffect(() => {
    if (open) {
      const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
      if (!dialogRef.current?.contains(document.activeElement)) (focusable()[0] ?? dialogRef.current)?.focus();
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onCloseRef.current();
        if (event.key === 'Tab') {
          const elements = focusable();
          const first = elements[0];
          const last = elements.at(-1);
          if (!first) { event.preventDefault(); dialogRef.current?.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        previousFocus?.focus();
      };
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`glass-panel modal-dialog w-full ${maxWidthClassName} max-h-[90vh] overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="modal-close text-text-secondary hover:text-text-primary text-xl leading-none"
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
