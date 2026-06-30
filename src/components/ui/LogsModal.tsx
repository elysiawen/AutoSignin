'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, Loader2, FileText } from 'lucide-react';
import Modal from './Modal';

interface LogEntry {
  id: string;
  status: string;
  message?: string | null;
  reward?: string | null;
  duration?: number | null;
  details?: string | null;
  createdAt: string;
}

interface LogsModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  taskId: string;
  apiPrefix?: string; // '/api/tasks' 或 '/api/admin/tasks'
}

export default function LogsModal({
  open,
  onClose,
  title = '执行日志',
  subtitle,
  taskId,
  apiPrefix = '/api/tasks',
}: LogsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const limit = 20;

  const fetchLogs = async (p: number) => {
    if (!taskId) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiPrefix}/${taskId}/logs?page=${p}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.pagination.total);
        setPage(p);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      fetchLogs(1);
      setExpandedLogId(null);
    }
  }, [open, taskId]);

  const statusIcons: Record<string, React.ReactNode> = {
    SUCCESS: <CheckCircle2 className="h-4 w-4 text-success" />,
    FAILED: <XCircle className="h-4 w-4 text-destructive" />,
    SKIPPED: <Clock className="h-4 w-4 text-warning" />,
    CAPTCHA: <AlertTriangle className="h-4 w-4 text-warning" />,
  };

  const statusLabels: Record<string, string> = {
    SUCCESS: '成功',
    FAILED: '失败',
    SKIPPED: '跳过',
    CAPTCHA: '验证码',
  };

  const statusColors: Record<string, string> = {
    SUCCESS: 'text-success',
    FAILED: 'text-destructive',
    SKIPPED: 'text-warning',
    CAPTCHA: 'text-warning',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle || (total > 0 ? `共 ${total} 条记录` : '')}
      maxWidth="2xl"
    >
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] sm:max-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-text-quaternary mx-auto mb-3" />
            <p className="text-text-tertiary">暂无执行记录</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasDetails = !!log.details;
              return (
                <div key={log.id} className="bg-muted/50 rounded-lg sm:rounded-xl border border-border overflow-hidden">
                  <div
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}
                    onClick={() => hasDetails && setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    {/* 移动端：垂直布局 */}
                    <div className="sm:hidden">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {statusIcons[log.status] || <Clock className="h-4 w-4 text-text-quaternary" />}
                          <span className={`text-sm font-medium ${statusColors[log.status] || 'text-text-secondary'}`}>
                            {statusLabels[log.status] || log.status}
                          </span>
                          {log.duration && (
                            <>
                              <span className="text-text-quaternary">·</span>
                              <span className="text-xs text-text-quaternary">{(log.duration / 1000).toFixed(1)}s</span>
                            </>
                          )}
                          <span className="text-text-quaternary">·</span>
                          <span className="text-xs text-text-quaternary">
                            {new Date(log.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {hasDetails && (
                          <ChevronDown className={`h-4 w-4 text-text-quaternary transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      {log.reward && (
                        <p className="text-xs text-accent mt-0.5">🎁 {log.reward}</p>
                      )}
                    </div>

                    {/* 桌面端：水平布局 */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {statusIcons[log.status] || <Clock className="h-4 w-4 text-text-quaternary" />}
                        <span className={`text-sm font-medium ${statusColors[log.status] || 'text-text-secondary'}`}>
                          {statusLabels[log.status] || log.status}
                        </span>
                        {log.duration && (
                          <span className="text-xs text-text-quaternary">{(log.duration / 1000).toFixed(1)}s</span>
                        )}
                        {log.reward && (
                          <span className="text-xs text-accent shrink-0">🎁 {log.reward}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-quaternary">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </span>
                        {hasDetails && (
                          <ChevronDown className={`h-4 w-4 text-text-quaternary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </div>
                  </div>
                  {log.message && (
                    <div className="px-3 sm:px-4 pb-2">
                      <p className="text-xs text-text-secondary">{log.message}</p>
                    </div>
                  )}
                  {isExpanded && hasDetails && (
                    <div className="px-3 sm:px-4 pb-3 border-t border-border mt-1 pt-3">
                      <pre className="p-2 sm:p-3 bg-background rounded-lg text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {log.details}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-tertiary">
              第 {page} / {Math.ceil(total / limit)} 页
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1}
                className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
