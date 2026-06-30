'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Trash2, CheckCircle2, XCircle, Clock, Loader2, ListTodo, Pencil, Check, FileText, ChevronDown, Gamepad2 } from 'lucide-react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import LogsModal from '@/components/ui/LogsModal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { platformNames, platformIcons, platformColors, taskTypeNames, taskTypeIcons, taskTypeColors } from '@/lib/icons';

interface Task {
  id: string;
  name: string | null;
  type: string;
  logs?: Array<{
    id: string;
    status: string;
    message: string;
    reward?: string | null;
    duration?: number | null;
    createdAt: string;
  }>;
}

interface Account {
  id: string;
  name: string;
  platform: string;
  cronExpr: string | null;
  isActive: boolean;
  tasks: Task[];
  logs?: Array<{
    id: string;
    status: string;
    message: string;
    createdAt: string;
  }>;
  lastAutoRun?: string | null;
  stats?: {
    success: number;
    failed: number;
  };
}

// 按平台分组的任务类型
const taskGroupsByPlatform: Record<string, Array<{ type: string; name: string }>> = {
  MIYOUSHE: [
    { type: 'MIYOUSHE_COINS', name: '米游社获取米游币（推荐）' },
    { type: 'GENSHIN_CN', name: '原神' },
    { type: 'HONKAI2_CN', name: '崩坏学园2' },
    { type: 'HONKAI3RD_CN', name: '崩坏3' },
    { type: 'TEARS_OF_THEMIS_CN', name: '未定事件簿' },
    { type: 'HONKAI_SR_CN', name: '崩坏：星穹铁道' },
    { type: 'ZZZ_CN', name: '绝区零' },
    { type: 'CLOUD_GENSHIN', name: '云原神' },
    { type: 'CLOUD_ZZZ', name: '云绝区零' },
  ],
  HOYOLAB: [
    { type: 'GENSHIN_OS', name: '原神' },
    { type: 'HONKAI3RD_OS', name: '崩坏3' },
    { type: 'HONKAI_SR_OS', name: '崩坏：星穹铁道' },
    { type: 'ZZZ_OS', name: '绝区零' },
  ],
  KUJIEQU: [
    { type: 'KUJIEQU_WUWA', name: '鸣潮签到' },
    { type: 'KUJIEQU_PGR', name: '战双帕弥什签到' },
    { type: 'KUJIEQU_FORUM', name: '库街区论坛任务（签到+浏览+点赞+分享）' },
  ],
  TAYGEDO: [
    { type: 'TAYGEDO_SIGNIN', name: 'APP 社区签到' },
    { type: 'TAYGEDO_GAMESIGNIN', name: '游戏签到（自动签全部游戏）' },
    { type: 'TAYGEDO_COINS', name: '金币任务（签到+浏览+点赞+分享）' },
    { type: 'TAYGEDO_CLOUD', name: '云异环时长签到' },
  ],
};

// Cron 表达式转易读文字
function cronToReadable(cronExpr: string | null): string {
  if (!cronExpr) return '';
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) return cronExpr;

  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 0;
  const dayOfMonth = parts[2];
  const dayOfWeek = parts[4];

  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    return `每月${dayOfMonth}号 ${timeStr}`;
  } else if (dayOfWeek !== '*') {
    const weekDays: Record<string, string> = {
      '0': '周日', '1': '周一', '2': '周二', '3': '周三',
      '4': '周四', '5': '周五', '6': '周六', '7': '周日'
    };
    return `每${weekDays[dayOfWeek] || dayOfWeek} ${timeStr}`;
  } else {
    return `每天 ${timeStr}`;
  }
}

export default function TasksPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // 运行状态
  const [runningAccount, setRunningAccount] = useState<string | null>(null); // 正在运行的账号ID
  const [runningTask, setRunningTask] = useState<string | null>(null); // 正在运行的任务ID
  const [taskStatus, setTaskStatus] = useState<Record<string, 'running' | 'success' | 'failed' | null>>({}); // 任务状态

  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [taskName, setTaskName] = useState('');

  // 定时配置
  const [schedulePeriod, setSchedulePeriod] = useState('daily');
  const [scheduleHour, setScheduleHour] = useState(0);
  const [scheduleMinute, setScheduleMinute] = useState(5);
  const [cronExpr, setCronExpr] = useState('');

  // 日志相关状态
  const [showLogs, setShowLogs] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换账号启用状态
  const handleToggleAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/toggle`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        fetchData();
        toast.success(data.message);
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 打开添加任务模态框
  const handleAddTasks = () => {
    setSelectedAccount('');
    setSelectedTasks([]);
    setTaskName('');
    setSchedulePeriod('daily');
    setScheduleHour(0);
    setScheduleMinute(5);
    setCronExpr('');
    setEditingAccount(null);
    setShowModal(true);
  };

  // 打开编辑任务模态框
  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account.id);
    setSelectedTasks(account.tasks.map(t => t.type));
    setTaskName('');

    // 解析定时配置
    const cron = account.cronExpr || '';
    if (cron) {
      const parts = cron.split(' ');
      if (parts.length === 5) {
        const minute = parseInt(parts[0]) || 0;
        const hour = parseInt(parts[1]) || 0;
        const dayOfMonth = parts[2];
        const dayOfWeek = parts[4];

        setScheduleMinute(minute);
        setScheduleHour(hour);

        if (dayOfMonth !== '*') {
          setSchedulePeriod('monthly');
        } else if (dayOfWeek !== '*') {
          setSchedulePeriod('weekly');
        } else {
          setSchedulePeriod('daily');
        }
      }
    } else {
      setSchedulePeriod('none');
      setScheduleHour(0);
      setScheduleMinute(5);
    }

    setEditingAccount(account);
    setShowModal(true);
  };

  // 切换任务类型选择
  const toggleTaskType = (type: string) => {
    setSelectedTasks(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // 验证 cron 表达式
  const validateCron = (expr: string): boolean => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) {
      toast.error('Cron 表达式格式错误，需要 5 个部分');
      return false;
    }
    const [minute, hour] = parts;
    if (minute !== '*' && (parseInt(minute) < 0 || parseInt(minute) > 59)) {
      toast.error('分钟必须在 0-59 之间');
      return false;
    }
    if (hour !== '*' && (parseInt(hour) < 0 || parseInt(hour) > 23)) {
      toast.error('小时必须在 0-23 之间');
      return false;
    }
    return true;
  };

  // 提交任务
  const handleSubmit = async () => {
    if (!selectedAccount || selectedTasks.length === 0) {
      toast.error('请选择账号和任务类型');
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      // 生成 cron 表达式
      let finalCronExpr = '';
      if (schedulePeriod && schedulePeriod !== 'none') {
        const hour = scheduleHour.toString().padStart(2, '0');
        const minute = scheduleMinute.toString().padStart(2, '0');
        switch (schedulePeriod) {
          case 'daily':
            finalCronExpr = `${minute} ${hour} * * *`;
            break;
          case 'weekly':
            finalCronExpr = `${minute} ${hour} * * 1`;
            break;
          case 'monthly':
            finalCronExpr = `${minute} ${hour} 1 * *`;
            break;
          case 'cron':
            finalCronExpr = cronExpr;
            break;
        }
      }

      // 验证 cron 表达式
      if (schedulePeriod === 'cron' && finalCronExpr) {
        if (!validateCron(finalCronExpr)) {
          setSaving(false);
          return;
        }
      }

      // 更新账号的 cronExpr
      await fetch(`/api/accounts/${selectedAccount}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronExpr: finalCronExpr || null }),
      });

      // 如果是编辑模式，处理任务变更
      if (editingAccount) {
        const oldTaskTypes = editingAccount.tasks.map(t => t.type);
        const newTaskTypes = selectedTasks;

        // 删除不再需要的任务
        for (const task of editingAccount.tasks) {
          if (!newTaskTypes.includes(task.type)) {
            await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
          }
        }

        // 更新已存在的任务（更新名称）
        for (const task of editingAccount.tasks) {
          if (newTaskTypes.includes(task.type)) {
            await fetch(`/api/tasks/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: taskName || null,
              }),
            });
          }
        }

        // 创建新增的任务
        const typesToCreate = newTaskTypes.filter(type => !oldTaskTypes.includes(type));
        for (const type of typesToCreate) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: selectedAccount,
              type,
              name: taskName || undefined,
            }),
          });
        }
      } else {
        // 新建模式，创建所有任务
        for (const type of selectedTasks) {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: selectedAccount,
              type,
              name: taskName || undefined,
            }),
          });
        }
      }

      setShowModal(false);
      fetchData();
      toast.success(editingAccount ? '任务已更新' : '任务已添加');
    } catch (error) {
      console.error('Failed to save tasks:', error);
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除任务
  const handleDeleteTask = async (id: string) => {
    const confirmed = await confirm('确定要删除该任务吗？', {
      title: '删除任务',
      confirmText: '删除',
      confirmColor: 'red',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
        toast.success('任务已删除');
      } else {
        toast.error('删除任务失败');
      }
    } catch (error) {
      toast.error('删除任务失败');
    }
  };

  // 手动执行单个小任务
  const handleRunTask = async (taskId: string) => {
    // 如果正在运行，不允许重复执行
    if (runningTask || runningAccount) return;

    setRunningTask(taskId);
    setTaskStatus(prev => ({ ...prev, [taskId]: 'running' }));

    try {
      const response = await fetch(`/api/tasks/${taskId}/run`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        const isSuccess = data.log?.status === 'SUCCESS';
        setTaskStatus(prev => ({ ...prev, [taskId]: isSuccess ? 'success' : 'failed' }));
        // 2秒后清除状态
        setTimeout(() => {
          setTaskStatus(prev => ({ ...prev, [taskId]: null }));
        }, 2000);
        fetchData();
      } else {
        setTaskStatus(prev => ({ ...prev, [taskId]: 'failed' }));
        setTimeout(() => {
          setTaskStatus(prev => ({ ...prev, [taskId]: null }));
        }, 2000);
      }
    } catch (error) {
      setTaskStatus(prev => ({ ...prev, [taskId]: 'failed' }));
      setTimeout(() => {
        setTaskStatus(prev => ({ ...prev, [taskId]: null }));
      }, 2000);
    } finally {
      setRunningTask(null);
    }
  };

  // 手动执行账号所有任务（依次执行）
  const handleRunAccount = async (accountId: string) => {
    // 如果正在运行，不允许重复执行
    if (runningAccount) return;

    const account = accounts.find(a => a.id === accountId);
    if (!account || account.tasks.length === 0) return;

    setRunningAccount(accountId);

    // 依次执行每个任务
    for (const task of account.tasks) {
      setRunningTask(task.id);
      setTaskStatus(prev => ({ ...prev, [task.id]: 'running' }));

      try {
        const response = await fetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          const isSuccess = data.log?.status === 'SUCCESS';
          setTaskStatus(prev => ({ ...prev, [task.id]: isSuccess ? 'success' : 'failed' }));
        } else {
          setTaskStatus(prev => ({ ...prev, [task.id]: 'failed' }));
        }
      } catch (error) {
        setTaskStatus(prev => ({ ...prev, [task.id]: 'failed' }));
      }

      // 短暂显示结果
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTaskStatus(prev => ({ ...prev, [task.id]: null }));
      setRunningTask(null);

      // 任务间等待
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setRunningAccount(null);
    fetchData();
    toast.success('所有任务执行完成');
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const availableTaskTypes = selectedAccountData
    ? taskGroupsByPlatform[selectedAccountData.platform] || []
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
        <p className="text-text-tertiary">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">任务管理</h1>
          <p className="text-text-tertiary mt-1">管理您的签到任务</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddTasks}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            添加任务
          </button>
        </div>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <ListTodo className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">还没有添加任何账号</h3>
          <p className="text-sm text-text-tertiary mt-2">请先在账号管理页面添加账号</p>
        </div>
      ) : (
        <div className="space-y-6">
          {accounts.map((account, index) => (
            <div
              key={account.id}
              className={`bg-card rounded-2xl border border-border overflow-hidden animate-slide-in-up delay-${index * 50}`}
            >
              {/* Account header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-muted/50 border-b border-border">
                {/* 移动端：垂直布局 */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl ${platformColors[account.platform] || 'bg-gray-500'} flex items-center justify-center overflow-hidden shrink-0`}>
                      {platformIcons[account.platform] ? (
                        <Image src={platformIcons[account.platform]!} alt={account.platform} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <Gamepad2 className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text-primary truncate">
                        {account.tasks[0]?.name ? `${account.tasks[0].name} · ${account.name}` : account.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span>{account.platform}</span>
                        {account.stats && account.lastAutoRun && (
                          <span>· 成功 {account.stats.success} / 失败 {account.stats.failed}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs rounded ${
                      account.cronExpr ? 'bg-accent/10 text-accent' : 'bg-muted text-text-quaternary'
                    }`}>
                      ⏰ {account.cronExpr ? cronToReadable(account.cronExpr) : '未设置'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!account.cronExpr) {
                            toast.error('请先设置定时再启用自动签到');
                            return;
                          }
                          handleToggleAccount(account.id);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          !account.cronExpr ? 'opacity-50 cursor-not-allowed' : ''
                        } ${account.isActive ? 'bg-success' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          account.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <button
                        onClick={() => handleRunAccount(account.id)}
                        disabled={!!runningAccount || !!runningTask}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          runningAccount === account.id ? 'text-accent bg-accent/10' : 'text-text-tertiary'
                        }`}
                      >
                        {runningAccount === account.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => handleEditAccount(account)}
                        disabled={!!runningAccount}
                        className="p-2 text-text-tertiary rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 桌面端：水平布局 */}
                <div className="hidden sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${platformColors[account.platform] || 'bg-gray-500'} flex items-center justify-center overflow-hidden`}>
                      {platformIcons[account.platform] ? (
                        <Image src={platformIcons[account.platform]!} alt={account.platform} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <Gamepad2 className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-text-primary">
                          {account.tasks[0]?.name ? `${account.tasks[0].name} · ${account.name}` : account.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          account.cronExpr ? 'bg-accent/10 text-accent' : 'bg-muted text-text-quaternary'
                        }`}>
                          ⏰ {account.cronExpr ? cronToReadable(account.cronExpr) : '未设置定时'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-text-tertiary">
                        <span>{account.platform}</span>
                        {account.stats && account.lastAutoRun && (
                          <>
                            <span>·</span>
                            <span>上次执行: 成功 {account.stats.success} / 失败 {account.stats.failed}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!account.cronExpr) {
                          toast.error('请先设置定时再启用自动签到');
                          return;
                        }
                        handleToggleAccount(account.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        !account.cronExpr ? 'opacity-50 cursor-not-allowed' : ''
                      } ${account.isActive ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted text-text-quaternary hover:bg-muted/80'}`}
                    >
                      {account.isActive ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-text-quaternary"></span>
                      )}
                      {account.isActive ? '自动签到中' : '已停止'}
                    </button>
                    <button
                      onClick={() => handleRunAccount(account.id)}
                      disabled={!!runningAccount || !!runningTask}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        runningAccount === account.id ? 'text-accent' : 'text-text-tertiary hover:text-accent hover:bg-accent/10'
                      }`}
                    >
                      {runningAccount === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEditAccount(account)}
                      disabled={!!runningAccount}
                      className="p-2 text-text-tertiary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {account.tasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-text-quaternary">
                  暂无任务，点击编辑添加
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {account.tasks.map((task) => {
                    const taskColor = taskTypeColors[task.type] || 'bg-gray-500';
                    const status = taskStatus[task.id];
                    const isRunning = status === 'running';
                    const isSuccess = status === 'success';
                    const isFailed = status === 'failed';
                    const isDisabled = !!runningAccount || (!!runningTask && runningTask !== task.id);
                    const latestLog = task.logs?.[0];

                    const formatDuration = (ms: number | null | undefined) => {
                      if (!ms) return '';
                      return `${(ms / 1000).toFixed(1)}s`;
                    };

                    const formatDate = (dateStr: string) => {
                      const date = new Date(dateStr);
                      const now = new Date();
                      const isToday = date.toDateString() === now.toDateString();
                      if (isToday) {
                        return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
                      }
                      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
                        date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                    };

                    return (
                      <div key={task.id} className="px-4 sm:px-6 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          {/* 图标 */}
                          {taskTypeIcons[task.type] ? (
                            <Image
                              src={taskTypeIcons[task.type]}
                              alt={taskTypeNames[task.type] || task.type}
                              width={36}
                              height={36}
                              className="rounded-lg self-center"
                            />
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${taskColor} self-center`} />
                          )}
                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-text-primary truncate">
                                {taskTypeNames[task.type] || task.type}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleRunTask(task.id)}
                                  disabled={isDisabled || isRunning}
                                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                    isRunning ? 'text-accent' : isSuccess ? 'text-success' : isFailed ? 'text-destructive' : 'text-text-quaternary hover:text-accent hover:bg-accent/10'
                                  }`}
                                >
                                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : isSuccess ? <CheckCircle2 className="h-4 w-4" /> : isFailed ? <XCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => setShowLogs(task.id)}
                                  className="p-2 text-text-quaternary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={!!runningAccount}
                                  className="p-2 text-text-quaternary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            {/* 最新签到结果 */}
                            {latestLog && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={`w-1.5 h-1.5 rounded-full ${latestLog.status === 'SUCCESS' ? 'bg-success' : 'bg-destructive'}`} />
                                <span className="text-xs text-text-quaternary">{formatDate(latestLog.createdAt)}</span>
                                {latestLog.duration && <span className="text-xs text-text-quaternary">· {formatDuration(latestLog.duration)}</span>}
                                <span className="text-xs text-text-quaternary">·</span>
                                {latestLog.status === 'SUCCESS' && latestLog.reward ? (
                                  <span className="text-xs text-accent">🎁 {latestLog.reward}</span>
                                ) : latestLog.status === 'SUCCESS' ? (
                                  <span className="text-xs text-success">✓ 成功</span>
                                ) : (
                                  <span className="text-xs text-destructive truncate">✗ {latestLog.message || '执行失败'}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal - Add/Edit Tasks */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingAccount ? '编辑任务' : '添加任务'}
      >
        <div className="p-6 space-y-6">
          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              选择账号
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setSelectedTasks([]);
              }}
              disabled={!!editingAccount}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-text-primary disabled:opacity-50"
            >
              <option value="">请选择账号</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.platform})
                </option>
              ))}
            </select>
          </div>

          {/* Task name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              任务名称（可选）
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder="例如：我的原神签到"
            />
          </div>

          {/* Task type selector */}
          {selectedAccount && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                选择任务（可多选）
              </label>
              <div className="space-y-2">
                {availableTaskTypes.map((taskType) => {
                  const isSelected = selectedTasks.includes(taskType.type);
                  return (
                    <label
                      key={taskType.type}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-accent/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-accent bg-accent'
                          : 'border-border-strong'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTaskType(taskType.type)}
                        className="sr-only"
                      />
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-accent' : 'text-text-primary'
                      }`}>
                        {taskType.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule */}
          {selectedTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                执行周期
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={schedulePeriod}
                  onChange={(e) => setSchedulePeriod(e.target.value)}
                  className="w-32 px-3 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-text-primary"
                >
                  <option value="none">不自动执行</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="cron">自定义 Cron</option>
                </select>

                {schedulePeriod !== 'none' && schedulePeriod !== 'cron' && (
                  <>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={scheduleHour}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setScheduleHour(Math.max(0, Math.min(23, val)));
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') setScheduleHour(0);
                        }}
                        className="w-20 px-3 py-3 bg-muted border border-border rounded-l-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-text-primary text-center"
                      />
                      <span className="px-3 py-3 bg-muted border-y border-r border-border rounded-r-xl text-sm text-text-secondary">
                        小时
                      </span>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={scheduleMinute}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setScheduleMinute(Math.max(0, Math.min(59, val)));
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') setScheduleMinute(0);
                        }}
                        className="w-20 px-3 py-3 bg-muted border border-border rounded-l-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-text-primary text-center"
                      />
                      <span className="px-3 py-3 bg-muted border-y border-r border-border rounded-r-xl text-sm text-text-secondary">
                        分钟
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Cron input */}
              {schedulePeriod === 'cron' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-text-primary placeholder:text-text-quaternary font-mono"
                    placeholder="5 0 * * *"
                  />
                  <div className="mt-2 bg-muted/50 rounded-lg p-3 text-xs text-text-tertiary space-y-1">
                    <p className="font-medium text-text-secondary">格式：分 时 日 月 周</p>
                    <p><code className="bg-muted px-1 rounded">5 0 * * *</code> = 每天 0:05</p>
                    <p><code className="bg-muted px-1 rounded">0 8 * * 1-5</code> = 工作日 8:00</p>
                    <p><code className="bg-muted px-1 rounded">0 */6 * * *</code> = 每6小时</p>
                  </div>
                </div>
              )}

              {/* Preview */}
              {schedulePeriod !== 'none' && schedulePeriod !== 'cron' && (
                <p className="text-xs text-success mt-2">
                  ✓ 将{schedulePeriod === 'daily' ? '每天' : schedulePeriod === 'weekly' ? '每周一' : '每月1号'} {scheduleHour.toString().padStart(2, '0')}:{scheduleMinute.toString().padStart(2, '0')} 自动执行
                </p>
              )}
              {schedulePeriod === 'cron' && cronExpr && (
                <p className="text-xs text-success mt-2">
                  ✓ 将按照 cron 表达式自动执行
                </p>
              )}
            </div>
          )}

          {/* Selected count */}
          {selectedTasks.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-text-secondary">
                已选择 <span className="font-bold text-accent">{selectedTasks.length}</span> 个任务
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={saving}
              className="px-5 py-2.5 border border-border rounded-xl text-text-secondary hover:bg-muted font-medium text-sm transition-all duration-200 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedAccount || selectedTasks.length === 0 || saving}
              className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? '保存中...' : (editingAccount ? '保存修改' : '添加任务')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Logs Modal */}
      <LogsModal
        open={!!showLogs}
        onClose={() => setShowLogs(null)}
        taskId={showLogs || ''}
        apiPrefix="/api/tasks"
      />
    </div>
  );
}
