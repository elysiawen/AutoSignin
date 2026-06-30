'use client';

import { useState, useEffect } from 'react';
import { Database, Loader2, Plus, Trash2, Play, Save, Activity } from 'lucide-react';
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
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
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
