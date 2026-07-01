'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

interface LogItem {
  id: string;
  status: string;
  message: string;
  reward: string | null;
  duration: number | null;
  details: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  task: {
    type: string;
    account: { name: string; platform: string };
  };
}

const taskTypeNames: Record<string, string> = {
  MIYOUSHE_CHECKIN: '米游社签到',
  MIYOUSHE_READ: '米游社看帖',
  MIYOUSHE_LIKE: '米游社点赞',
  MIYOUSHE_SHARE: '米游社分享',
  MIYOUSHE_COINS: '米游社米游币',
  GENSHIN_CN: '原神',
  HONKAI2_CN: '崩坏2',
  HONKAI3RD_CN: '崩坏3',
  TEARS_OF_THEMIS_CN: '未定事件簿',
  HONKAI_SR_CN: '星穹铁道',
  ZZZ_CN: '绝区零',
  GENSHIN_OS: '原神(国际)',
  HONKAI3RD_OS: '崩坏3(国际)',
  HONKAI_SR_OS: '星穹铁道(国际)',
  ZZZ_OS: '绝区零(国际)',
  CLOUD_GENSHIN: '云原神',
  CLOUD_ZZZ: '云绝区零',
  KUJIEQU_WUWA: '鸣潮',
  KUJIEQU_PGR: '战双',
  KUJIEQU_FORUM: '库街区论坛',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
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
    fetchLogs(1);
  }, [statusFilter, limit]);

  const handleSearch = () => {
    fetchLogs(1);
  };

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

  return (
    <div className="animate-slide-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">执行日志</h1>
          <p className="text-text-tertiary mt-1">共 {total} 条记录</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] sm:flex-none">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索用户或消息..."
            className="px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary w-full sm:w-64"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors shrink-0"
          >
            搜索
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary"
        >
          <option value="">全部状态</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
          <option value="SKIPPED">跳过</option>
          <option value="CAPTCHA">验证码</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
          <p className="text-text-tertiary">加载中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <FileText className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">暂无日志</h3>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const isExpanded = expandedLog === log.id;
                const hasDetails = !!log.details;

                return (
                  <div key={log.id}>
                    <div
                      className={`px-6 py-4 flex items-center justify-between gap-4 ${hasDetails ? 'cursor-pointer hover:bg-muted/30' : ''} transition-colors`}
                      onClick={() => hasDetails && setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {statusIcons[log.status]}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text-primary">
                              {log.user.name || log.user.email}
                            </span>
                            <span className="text-xs text-text-quaternary">·</span>
                            <span className="text-sm text-text-secondary">
                              {taskTypeNames[log.task.type] || log.task.type}
                            </span>
                            <span className="text-xs text-text-quaternary">·</span>
                            <span className="text-xs text-text-tertiary">
                              {log.task.account.name}
                            </span>
                          </div>
                          <p className="text-xs text-text-tertiary mt-1 truncate">
                            {log.message || '无详细信息'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {log.reward && (
                          <span className="text-xs text-accent hidden sm:inline">🎁 {log.reward}</span>
                        )}
                        {log.duration && (
                          <span className="text-xs text-text-quaternary hidden sm:inline">
                            {(log.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                        <span className="text-xs text-text-quaternary whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </span>
                        {hasDetails && (
                          <ChevronDown className={`h-4 w-4 text-text-quaternary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </div>
                    {isExpanded && hasDetails && (
                      <div className="px-6 pb-4 border-t border-border">
                        <pre className="mt-3 p-3 bg-background rounded-lg text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                          {log.details}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={fetchLogs}
                showTotal={total}
                showLimit
                limit={limit}
                onLimitChange={(l) => { setLimit(l); setPage(1); fetchLogs(1); }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
