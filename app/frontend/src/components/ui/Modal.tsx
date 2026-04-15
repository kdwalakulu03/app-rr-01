import { type ReactNode, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

// ── Props ──

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  /** Max width class, defaults to max-w-lg */
  maxWidth?: string;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean;
}

// ── Component ──

export default function Modal({
  open,
  onClose,
  children,
  title,
  description,
  maxWidth = 'max-w-lg',
  closeOnBackdrop = true,
}: ModalProps) {
  // Escape key handler
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`${maxWidth} w-full bg-surface-card rounded-2xl shadow-2xl border border-line overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 pt-5 pb-3 flex items-start justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-content-heading">{title}</h3>}
              {description && <p className="text-sm text-content-muted mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-hover text-content-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={title ? 'px-6 pb-6' : 'p-6'}>{children}</div>
      </div>
    </div>
  );
}

// ── Footer helper ──

export function ModalFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-line ${className}`}>
      {children}
    </div>
  );
}
