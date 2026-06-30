import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Gamepad2, Users, ListTodo, CheckCircle2, XCircle, Clock, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

async function getDashboardData(userId: string) {
  const [accounts, tasks, recentLogs] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.taskLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { task: true },
    }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLogs = await prisma.taskLog.groupBy({
    by: ['status'],
    where: {
      userId,
      createdAt: { gte: todayStart },
    },
    _count: true,
  });

  return {
    accounts,
    tasks,
    recentLogs,
    todayStats: {
      success: todayLogs.find((l) => l.status === 'SUCCESS')?._count || 0,
      failed: todayLogs.find((l) => l.status === 'FAILED')?._count || 0,
      skipped: todayLogs.find((l) => l.status === 'SKIPPED')?._count || 0,
    },
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return <div>请先登录</div>;
  }

  const data = await getDashboardData(userId);

  const stats = [
    {
      name: '绑定账号',
      value: data.accounts,
      icon: Users,
      color: 'bg-blue-500',
      href: '/dashboard/accounts',
    },
    {
      name: '活跃任务',
      value: data.tasks,
      icon: ListTodo,
      color: 'bg-emerald-500',
      href: '/dashboard/tasks',
    },
    {
      name: '今日成功',
      value: data.todayStats.success,
      icon: CheckCircle2,
      color: 'bg-violet-500',
      href: '/dashboard/tasks',
    },
    {
      name: '今日失败',
      value: data.todayStats.failed,
      icon: XCircle,
      color: 'bg-rose-500',
      href: '/dashboard/tasks',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          仪表盘
        </h1>
        <p className="text-text-tertiary mt-1">
          欢迎回来，{session?.user?.name || '用户'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, index) => (
          <Link
            key={stat.name}
            href={stat.href}
            className={`group relative bg-card rounded-2xl border border-border p-5 sm:p-6 hover:border-accent/30 transition-all duration-300 animate-slide-in-up delay-${index * 100}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} rounded-xl p-3`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <ArrowRight className="h-4 w-4 text-text-quaternary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-sm text-text-tertiary mt-1">{stat.name}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-8 animate-slide-in-up delay-200">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">快捷操作</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/accounts"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200"
          >
            <Users className="h-4 w-4" />
            添加账号
          </Link>
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-card text-text-primary border border-border rounded-xl font-medium text-sm hover:bg-muted transition-all duration-200"
          >
            <ListTodo className="h-4 w-4" />
            管理任务
          </Link>
        </div>
      </div>

      {/* Recent logs */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden animate-slide-in-up delay-300">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">最近执行记录</h2>
          <Link href="/dashboard/tasks" className="text-sm text-accent hover:text-accent-hover transition-colors">
            查看全部
          </Link>
        </div>
        <div className="divide-y divide-border">
          {data.recentLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Clock className="h-12 w-12 text-text-quaternary mx-auto mb-3" />
              <p className="text-text-tertiary">暂无执行记录</p>
              <p className="text-sm text-text-quaternary mt-1">添加账号并创建任务后开始签到</p>
            </div>
          ) : (
            data.recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {log.status === 'SUCCESS' && (
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                  )}
                  {log.status === 'FAILED' && (
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                  {log.status === 'SKIPPED' && (
                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                  )}
                  {log.status === 'CAPTCHA' && (
                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4 text-warning" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {log.task.type}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">
                      {log.message?.substring(0, 50) || '无详细信息'}
                      {(log.message?.length || 0) > 50 && '...'}
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
