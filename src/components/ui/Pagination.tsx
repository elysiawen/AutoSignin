'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  showTotal?: number;
  showLimit?: boolean;
  limit?: number;
  onLimitChange?: (limit: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  showTotal,
  showLimit,
  limit,
  onLimitChange,
}: PaginationProps) {
  const [inputValue, setInputValue] = useState('');

  const handleJump = useCallback(() => {
    const num = parseInt(inputValue, 10);
    if (num >= 1 && num <= totalPages) {
      onChange(num);
    }
    setInputValue('');
  }, [inputValue, totalPages, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleJump();
      }
    },
    [handleJump]
  );

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* 左侧：总数 + 每页条数 */}
      <div className="flex items-center gap-3">
        {showTotal !== undefined && (
          <span className="text-sm text-text-tertiary">共 {showTotal} 条</span>
        )}
        {showLimit && limit && onLimitChange && (
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 border border-border rounded-lg text-sm bg-background text-text-primary outline-none"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n} 条/页</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 右侧：翻页 + 跳页 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          上一页
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-text-tertiary">第</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputValue) handleJump(); }}
            placeholder={String(page)}
            className="w-12 px-2 py-1 border border-border rounded-lg text-sm text-center bg-background text-text-primary outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-text-quaternary"
          />
          <span className="text-sm text-text-tertiary">/ {totalPages} 页</span>
        </div>

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
