'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Globe,
  ListTodo,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Shield,
  Play,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

interface Stats {
  totalUsers: number;
  totalAccounts: number;
  totalTasks: number;
  activeAccounts: number;
  todayStats: {
    success: number;
    failed: number;
    skipped: number;
    captcha: number;
  };
  recentLogs: Array<{
    id: string;
    status: string;
    message: string;
    reward: string | null;
    duration: number | null;
    createdAt: string;
    user: { id: string; name: string; email: string };
    task: {
      type: string;
      account: { name: string; platform: string };
    };
  }>;
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

export default function AdminDashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAll = async () => {
    setExecuting(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'executeAll' }),
      });
      if (response.ok) {
        toast.success('所有任务执行完成');
        fetchStats();
      } else {
        toast.error('执行失败');
      }
    } catch (error) {
      toast.error('执行失败');
    } finally {
      setExecuting(false);
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

  if (!stats) return null;

  const statCards = [
    { name: '总用户数', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', href: '/admin/users' },
    { name: '总账号数', value: stats.totalAccounts, icon: Globe, color: 'bg-emerald-500', href: '/admin/accounts' },
    { name: '总任务数', value: stats.totalTasks, icon: ListTodo, color: 'bg-violet-500', href: '/admin/tasks' },
    { name: '定时任务', value: stats.activeAccounts, icon: Clock, color: 'bg-amber-500', href: '/admin/accounts' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-3">
            <Shield className="h-7 w-7 text-accent" />
            后台管理
          </h1>
          <p className="text-text-tertiary mt-1">系统全局概览</p>
        </div>
        <button
          onClick={handleExecuteAll}
          disabled={executing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50"
        >
          {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {executing ? '执行中...' : '执行全部任务'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Link
            key={stat.name}
            href={stat.href}
            className={`group relative bg-card rounded-2xl border border-border p-5 sm:p-6 hover:border-accent/30 transition-all duration-300 animate-slide-in-up delay-${index * 100}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} rounded-xl p-3`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-sm text-text-tertiary mt-1">{stat.name}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Today stats */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-8 animate-slide-in-up delay-200">
        <h2 className="text-lg font-semibold text-text-primary mb-4">今日执行统计</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.todayStats.success}</p>
              <p className="text-xs text-text-tertiary">成功</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.todayStats.failed}</p>
              <p className="text-xs text-text-tertiary">失败</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.todayStats.skipped}</p>
              <p className="text-xs text-text-tertiary">跳过</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.todayStats.captcha}</p>
              <p className="text-xs text-text-tertiary">验证码</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent logs */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden animate-slide-in-up delay-300">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">最近执行记录</h2>
          <Link href="/admin/logs" className="text-sm text-accent hover:text-accent-hover transition-colors">
            查看全部
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats.recentLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Clock className="h-12 w-12 text-text-quaternary mx-auto mb-3" />
              <p className="text-text-tertiary">暂无执行记录</p>
            </div>
          ) : (
            stats.recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {log.status === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  {log.status === 'FAILED' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  {log.status === 'SKIPPED' && <Clock className="h-4 w-4 text-warning shrink-0" />}
                  {log.status === 'CAPTCHA' && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {log.user.name || log.user.email} · {taskTypeNames[log.task.type] || log.task.type}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">
                      {log.message?.substring(0, 60) || '无详细信息'}
                      {(log.message?.length || 0) > 60 && '...'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-text-quaternary whitespace-nowrap shrink-0">
                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
