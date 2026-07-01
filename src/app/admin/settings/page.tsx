'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Loader2, Plus, Trash2, Play, Save, Activity, UserPlus, UserX } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

interface Setting {
  id: string;
  key: string;
  value: string;
}

interface SchedulerStatus {
  activeCount: number;
  accountIds: string[];
  source: 'scheduler' | 'database';
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [togglingRegistration, setTogglingRegistration] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setScheduler(data.scheduler);
        // 从设置中读取注册开关状态
        const regSetting = data.settings.find((s: Setting) => s.key === 'registration_enabled');
        setRegistrationEnabled(!regSetting || regSetting.value === 'true');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async () => {
    const newValue = registrationEnabled ? 'false' : 'true';
    const label = registrationEnabled ? '关闭' : '开放';

    const confirmed = await confirm(
      `确定要${label}用户注册吗？`,
      { title: `${label}注册`, confirmText: '确定', confirmColor: registrationEnabled ? 'red' : 'blue' }
    );
    if (!confirmed) return;

    setTogglingRegistration(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setSetting', key: 'registration_enabled', value: newValue }),
      });
      if (response.ok) {
        setRegistrationEnabled(!registrationEnabled);
        fetchData();
        toast.success(`已${label}用户注册`);
      } else {
        toast.error('操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setTogglingRegistration(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setSetting', key, value }),
      });
      if (response.ok) {
        fetchData();
        toast.success('设置已保存');
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSetting = async (key: string) => {
    const confirmed = await confirm(`确定要删除设置「${key}」吗？`, {
      title: '删除设置',
      confirmText: '删除',
      confirmColor: 'red',
    });
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteSetting', key }),
      });
      if (response.ok) {
        fetchData();
        toast.success('设置已删除');
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleAddSetting = async () => {
    if (!newKey.trim()) {
      toast.error('请输入设置键名');
      return;
    }
    await handleSaveSetting(newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
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
        const data = await response.json();
        toast.success(`执行完成，共 ${data.results?.length || 0} 个任务`);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">系统设置</h1>
        <p className="text-text-tertiary mt-1">管理系统配置和调度器</p>
      </div>

      {/* Scheduler Status */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">调度器状态</h2>
            <p className="text-sm text-text-tertiary">定时任务调度器运行状态</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-text-tertiary">定时任务账号</p>
            <p className="text-2xl font-bold text-text-primary">{scheduler?.activeCount || 0}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-text-tertiary">调度器状态</p>
            <p className="text-2xl font-bold text-success">运行中</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-text-tertiary">数据来源</p>
            <p className="text-2xl font-bold text-text-primary">
              {scheduler?.source === 'scheduler' ? '内存' : '数据库'}
            </p>
            <p className="text-xs text-text-quaternary mt-1">
              {scheduler?.source === 'scheduler' ? '调度器已加载' : '从数据库读取配置'}
            </p>
          </div>
        </div>

        <button
          onClick={handleExecuteAll}
          disabled={executing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50"
        >
          {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {executing ? '执行中...' : '立即执行全部任务'}
        </button>
      </div>

      {/* Registration Toggle */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${registrationEnabled ? 'bg-success' : 'bg-muted'}`}>
              {registrationEnabled ? <UserPlus className="h-5 w-5 text-white" /> : <UserX className="h-5 w-5 text-text-tertiary" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">用户注册</h2>
              <p className="text-sm text-text-tertiary">
                {registrationEnabled ? '当前已开放注册，新用户可自行注册账号' : '当前已关闭注册，仅管理员可创建账号'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleRegistration}
            disabled={togglingRegistration}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${registrationEnabled ? 'bg-success' : 'bg-muted border border-border'}`}
          >
            {togglingRegistration ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-text-tertiary" />
            ) : (
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            )}
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="mb-6">
        <SystemStatusCard />
      </div>

      {/* Log Cleanup */}
      <div className="mb-6">
        <LogCleanupCard />
      </div>

      {/* Settings CRUD */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden animate-slide-in-up delay-100">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">系统配置</h2>
          </div>
        </div>

        {/* Add new setting */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="键名"
              className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="值"
              className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
            />
            <button
              onClick={handleAddSetting}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              添加
            </button>
          </div>
        </div>

        {/* Settings list */}
        {settings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Database className="h-12 w-12 text-text-quaternary mx-auto mb-3" />
            <p className="text-text-tertiary">暂无系统配置</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {settings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                onSave={handleSaveSetting}
                onDelete={handleDeleteSetting}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  setting,
  onSave,
  onDelete,
  saving,
}: {
  setting: Setting;
  onSave: (key: string, value: string) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
  saving: boolean;
}) {
  const [value, setValue] = useState(setting.value);
  const [changed, setChanged] = useState(false);

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{setting.key}</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setChanged(e.target.value !== setting.value);
        }}
        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary"
      />
      <div className="flex items-center gap-1 shrink-0">
        {changed && (
          <button
            onClick={() => onSave(setting.key, value)}
            disabled={saving}
            className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
            title="保存"
          >
            <Save className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(setting.key)}
          className="p-2 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LogCleanupCard() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [cleanupDays, setCleanupDays] = useState('30');
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const handleCleanup = async () => {
    const days = cleanupDays === '0' ? 0 : parseInt(cleanupDays);
    const label = cleanupDays === '0' ? '全部' : `${days} 天前`;

    const confirmed = await confirm(
      `确定要删除 ${label} 的所有执行日志吗？此操作不可逆。`,
      { title: '日志清理', confirmText: '执行清理', confirmColor: 'red' }
    );
    if (!confirmed) return;

    setCleanupLoading(true);
    try {
      const response = await fetch('/api/admin/logs/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
      } else {
        const data = await response.json();
        toast.error(data.error || '清理失败');
      }
    } catch (error) {
      toast.error('清理失败');
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-slide-in-up delay-200">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🗑️</span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">日志清理</h2>
          <p className="text-sm text-text-tertiary">清理过期的执行日志，释放数据库空间</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">保留时间</label>
          <select
            value={cleanupDays}
            onChange={(e) => setCleanupDays(e.target.value)}
            className="w-full sm:w-56 px-4 py-2.5 border border-border rounded-xl bg-card text-text-primary outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
          >
            <option value="30">30 天（推荐）</option>
            <option value="180">6 个月（180 天）</option>
            <option value="365">1 年（365 天）</option>
            <option value="0">全部清理</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
          <button
            onClick={handleCleanup}
            disabled={cleanupLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-destructive text-white rounded-xl font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>🧹</span>}
            {cleanupLoading ? '清理中...' : '执行清理'}
          </button>
          <p className="text-xs text-text-quaternary">清理操作将删除指定天数之前的所有执行日志，此操作不可逆。</p>
        </div>
      </div>
    </div>
  );
}

function SystemStatusCard() {
  const [stats, setStats] = useState<{
    cpu: { model: string; cores: number; usage: number };
    memory: { total: number; used: number; free: number; usage: number };
    disk: { total: number; used: number; free: number; usage: number };
    uptime: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats/system');
        if (res.ok) setStats(await res.json());
      } catch {}
    };
    fetchStats();
    const timer = setInterval(fetchStats, 5000);
    return () => clearInterval(timer);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天 ${h}小时 ${m}分钟`;
    if (h > 0) return `${h}小时 ${m}分钟`;
    return `${m}分钟`;
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'bg-destructive';
    if (usage >= 70) return 'bg-warning';
    return 'bg-success';
  };

  const getUsageTextColor = (usage: number) => {
    if (usage >= 90) return 'text-destructive';
    if (usage >= 70) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-slide-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">系统状态</h2>
          <p className="text-sm text-text-tertiary">
            {stats ? `已运行 ${formatUptime(stats.uptime)}` : '加载中...'}
          </p>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* CPU */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-tertiary">CPU</span>
              <span className={`text-sm font-bold ${getUsageTextColor(stats.cpu.usage)}`}>
                {stats.cpu.usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getUsageColor(stats.cpu.usage)}`}
                style={{ width: `${Math.min(stats.cpu.usage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-quaternary truncate">{stats.cpu.model}</p>
            <p className="text-xs text-text-quaternary">{stats.cpu.cores} 核心</p>
          </div>

          {/* Memory */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-tertiary">内存</span>
              <span className={`text-sm font-bold ${getUsageTextColor(stats.memory.usage)}`}>
                {stats.memory.usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getUsageColor(stats.memory.usage)}`}
                style={{ width: `${Math.min(stats.memory.usage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-quaternary">
              {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
            </p>
          </div>

          {/* Disk */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-tertiary">磁盘</span>
              <span className={`text-sm font-bold ${getUsageTextColor(stats.disk.usage)}`}>
                {stats.disk.usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getUsageColor(stats.disk.usage)}`}
                style={{ width: `${Math.min(stats.disk.usage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-quaternary">
              {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </div>
      )}
    </div>
  );
}
