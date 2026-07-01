'use client';

import { useState, useEffect } from 'react';
import { ListTodo, Play, Trash2, Loader2, CheckCircle2, XCircle, Clock, FileText, Search } from 'lucide-react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import LogsModal from '@/components/ui/LogsModal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { taskTypeNames, taskTypeIcons } from '@/lib/icons';

interface TaskItem {
  id: string;
  name: string | null;
  type: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  account: { id: string; name: string; platform: string; isActive: boolean };
  logs: Array<{
    id: string;
    status: string;
    message: string;
    reward: string | null;
    duration: number | null;
    createdAt: string;
    details: string | null;
  }>;
}

export default function AdminTasksPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<TaskItem | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTasks();
  }, [page, limit]);

  const fetchTasks = async (keyword?: string) => {
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('search', keyword);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const response = await fetch(`/api/admin/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchTasks(search);
  };

  const handleRun = async (taskId: string) => {
    if (runningTask) return;
    setRunningTask(taskId);

    try {
      const response = await fetch(`/api/admin/tasks/${taskId}/run`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        toast.success(data.result?.message || '执行完成');
        fetchTasks();
      } else {
        toast.error('执行失败');
      }
    } catch (error) {
      toast.error('执行失败');
    } finally {
      setRunningTask(null);
    }
  };

  const handleDelete = async (task: TaskItem) => {
    const confirmed = await confirm(`确定要删除任务「${taskTypeNames[task.type] || task.type}」吗？`, {
      title: '删除任务',
      confirmText: '删除',
      confirmColor: 'red',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTasks();
        toast.success('任务已删除');
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
        <p className="text-text-tertiary">加载中...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">全部任务</h1>
          <p className="text-text-tertiary mt-1">查看和管理所有用户的签到任务</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary w-full sm:w-64"
            placeholder="搜索用户名或任务类型..."
          />
          <button
            onClick={handleSearch}
            className="p-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors shrink-0"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <ListTodo className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">暂无任务</h3>
        </div>
      ) : (
        <>
          {/* 移动端卡片布局 */}
          <div className="sm:hidden space-y-3">
            {tasks.map((task) => {
              const latestLog = task.logs[0];
              return (
                <div key={task.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {taskTypeIcons[task.type] ? (
                        <Image src={taskTypeIcons[task.type]} alt="" width={24} height={24} className="rounded shrink-0" />
                      ) : (
                        <ListTodo className="h-5 w-5 text-text-tertiary shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{taskTypeNames[task.type] || task.type}</p>
                        {task.name && <p className="text-xs text-text-tertiary mt-0.5">{task.name}</p>}
                      </div>
                    </div>
                    {latestLog && (
                      <div className="flex items-center gap-1 ml-2">
                        {latestLog.status === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {latestLog.status === 'FAILED' && <XCircle className="h-4 w-4 text-destructive" />}
                        {latestLog.status === 'SKIPPED' && <Clock className="h-4 w-4 text-warning" />}
                        <span className={`text-xs font-medium ${
                          latestLog.status === 'SUCCESS' ? 'text-success' :
                          latestLog.status === 'FAILED' ? 'text-destructive' : 'text-warning'
                        }`}>
                          {latestLog.status === 'SUCCESS' ? '成功' :
                           latestLog.status === 'FAILED' ? '失败' :
                           latestLog.status === 'SKIPPED' ? '跳过' : '验证码'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-tertiary mb-3">
                    <span>用户: {task.user.name || '未设置'}</span>
                    <span>账号: {task.account.name}</span>
                  </div>
                  {latestLog && (
                    <p className="text-xs text-text-quaternary mb-3">
                      {new Date(latestLog.createdAt).toLocaleString('zh-CN')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => handleRun(task.id)}
                      disabled={!!runningTask}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        runningTask === task.id
                          ? 'text-accent bg-accent/10'
                          : 'text-text-secondary hover:text-accent hover:bg-accent/10'
                      }`}
                    >
                      {runningTask === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      执行
                    </button>
                    <button
                      onClick={() => setShowLogs(task)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      日志
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 桌面端表格布局 */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">任务类型</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">所属用户</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">账号</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">最近状态</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">最近执行</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => {
                    const latestLog = task.logs[0];
                    return (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {taskTypeIcons[task.type] ? (
                              <Image src={taskTypeIcons[task.type]} alt="" width={20} height={20} className="rounded shrink-0" />
                            ) : (
                              <ListTodo className="h-4 w-4 text-text-tertiary shrink-0" />
                            )}
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {taskTypeNames[task.type] || task.type}
                              </span>
                              {task.name && (
                                <p className="text-xs text-text-tertiary mt-0.5">{task.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-primary">{task.user.name || '未设置'}</p>
                          <p className="text-xs text-text-tertiary">{task.user.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-secondary">{task.account.name}</p>
                          <p className="text-xs text-text-tertiary">{task.account.platform}</p>
                        </td>
                        <td className="px-6 py-4">
                          {latestLog ? (
                            <div className="flex items-center gap-2">
                              {latestLog.status === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-success" />}
                              {latestLog.status === 'FAILED' && <XCircle className="h-4 w-4 text-destructive" />}
                              {latestLog.status === 'SKIPPED' && <Clock className="h-4 w-4 text-warning" />}
                              <span className={`text-xs font-medium ${
                                latestLog.status === 'SUCCESS' ? 'text-success' :
                                latestLog.status === 'FAILED' ? 'text-destructive' : 'text-warning'
                              }`}>
                                {latestLog.status === 'SUCCESS' ? '成功' :
                                 latestLog.status === 'FAILED' ? '失败' :
                                 latestLog.status === 'SKIPPED' ? '跳过' : '验证码'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-quaternary">未执行</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-text-tertiary">
                          {latestLog ? new Date(latestLog.createdAt).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRun(task.id)}
                              disabled={!!runningTask}
                              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                runningTask === task.id
                                  ? 'text-accent'
                                  : 'text-text-quaternary hover:text-accent hover:bg-accent/10'
                              }`}
                              title="执行"
                            >
                              {runningTask === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setShowLogs(task)}
                              className="p-2 text-text-quaternary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                              title="查看日志"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(task)}
                              className="p-2 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-6">
              <Pagination
                page={page}
                totalPages={Math.ceil(total / limit)}
                onChange={setPage}
                showTotal={total}
                showLimit
                limit={limit}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
              />
            </div>
          )}
        </>
      )}

      {/* Log Details Modal */}
      <LogsModal
        open={!!showLogs}
        onClose={() => setShowLogs(null)}
        taskId={showLogs?.id || ''}
        subtitle={showLogs ? taskTypeNames[showLogs.type] || showLogs.type : ''}
        apiPrefix="/api/admin/tasks"
      />
    </div>
  );
}
