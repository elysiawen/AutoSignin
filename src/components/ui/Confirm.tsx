'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'blue' | 'red';
  onConfirm?: () => Promise<void>;
}

interface ConfirmContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    // 如果没有 Provider，返回一个使用原生 confirm 的 fallback
    return {
      confirm: async (message: string) => window.confirm(message),
    };
  }
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<{ message: string; options: ConfirmOptions }>({
    message: '',
    options: {},
  });
  const resolveRef = useRef<(value: boolean) => void>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    setConfig({ message, options });
    setIsOpen(true);
    setIsLoading(false);
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = async () => {
    if (config.options.onConfirm) {
      setIsLoading(true);
      try {
        await config.options.onConfirm();
      } catch (error) {
        console.error('Confirm action failed:', error);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    } else {
      if (resolveRef.current) {
        resolveRef.current(true);
      }
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
    }
    setIsOpen(false);
  };

  const { message, options } = config;
  const title = options.title || '确认操作';
  const confirmText = options.confirmText || '确认';
  const cancelText = options.cancelText || '取消';
  const isDestructive = options.confirmColor === 'red';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-zoom-in">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{message}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors border border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center gap-2 ${
                  isDestructive
                    ? 'bg-destructive hover:bg-destructive/90 shadow-destructive/30'
                    : 'bg-accent hover:bg-accent-hover shadow-accent/30'
                }`}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? '处理中...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
