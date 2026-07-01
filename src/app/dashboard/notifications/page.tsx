'use client';

import { useState, useEffect } from 'react';
import { Loader2, Bell, Plus, Trash2, Pencil, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

interface Channel {
  id: string;
  name: string;
  provider: string;
  createdAt: string;
}

interface Binding {
  id: string;
  channelId: string;
  target: Record<string, any>;
  events: string[];
  sources: string[];
  enabled: boolean;
  channel: { id: string; name: string; provider: string };
}

const PROVIDER_LABELS: Record<string, string> = {
  TELEGRAM: 'Telegram',
  DISCORD: 'Discord',
  ONEBOT: 'QQ (OneBot)',
};

const PROVIDER_COLORS: Record<string, string> = {
  TELEGRAM: 'bg-blue-500',
  DISCORD: 'bg-indigo-500',
  ONEBOT: 'bg-orange-500',
};

const EVENT_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  SUCCESS: { label: '签到成功', icon: CheckCircle2, color: 'text-success bg-success/10' },
  FAILED: { label: '签到失败', icon: XCircle, color: 'text-destructive bg-destructive/10' },
  CAPTCHA: { label: '触发验证码', icon: AlertTriangle, color: 'text-warning bg-warning/10' },
};

const SOURCE_LABELS: Record<string, string> = {
  AUTO: '定时任务',
  MANUAL: '手动任务',
};

export default function NotificationsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBinding, setEditingBinding] = useState<Binding | null>(null);

  const [form, setForm] = useState({
    channelId: '',
    targetType: 'private',
    targetId: '',
    webhookUrl: '',
    chatId: '',
    events: ['FAILED', 'CAPTCHA'] as string[],
    sources: ['AUTO', 'MANUAL'] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [channelsRes, bindingsRes] = await Promise.all([
        fetch('/api/notifications/channels'),
        fetch('/api/notifications/bindings'),
      ]);
      if (channelsRes.ok) setChannels(await channelsRes.json());
      if (bindingsRes.ok) setBindings(await bindingsRes.json());
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ channelId: '', targetType: 'private', targetId: '', webhookUrl: '', chatId: '', events: ['FAILED', 'CAPTCHA'], sources: ['AUTO', 'MANUAL'] });
    setEditingBinding(null);
  };

  const selectedChannel = channels.find((c) => c.id === form.channelId);

  const handleEdit = (binding: Binding) => {
    setEditingBinding(binding);
    const target = binding.target as Record<string, any>;
    setForm({
      channelId: binding.channelId,
      targetType: target.targetType || 'private',
      targetId: target.targetId || '',
      webhookUrl: target.webhookUrl || '',
      chatId: target.chatId || '',
      events: [...binding.events],
      sources: binding.sources?.length ? [...binding.sources] : ['AUTO', 'MANUAL'],
    });
    setShowModal(true);
  };

  const buildTarget = (): Record<string, any> | null => {
    if (!selectedChannel) return null;
    if (selectedChannel.provider === 'TELEGRAM') return form.chatId ? { chatId: form.chatId } : null;
    if (selectedChannel.provider === 'DISCORD') return form.webhookUrl ? { webhookUrl: form.webhookUrl } : null;
    if (selectedChannel.provider === 'ONEBOT') return form.targetId ? { targetType: form.targetType, targetId: form.targetId } : null;
    return null;
  };

  const handleTest = async () => {
    const target = buildTarget();
    if (!target) { toast.error('请先填写完整的推送目标'); return; }

    setTesting(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: form.channelId, target }),
      });
      const data = await res.json();
      if (res.ok) toast.success('测试消息已发送，请检查接收端');
      else toast.error(data.error || '测试发送失败');
    } catch { toast.error('测试发送失败'); }
    finally { setTesting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId) { toast.error('请选择通知渠道'); return; }

    const target: Record<string, any> = {};
    if (selectedChannel?.provider === 'TELEGRAM') {
      if (!form.chatId) { toast.error('请输入 Chat ID'); return; }
      target.chatId = form.chatId;
    } else if (selectedChannel?.provider === 'DISCORD') {
      if (!form.webhookUrl) { toast.error('请输入 Webhook URL'); return; }
      target.webhookUrl = form.webhookUrl;
    } else if (selectedChannel?.provider === 'ONEBOT') {
      if (!form.targetId) { toast.error('请输入目标 ID'); return; }
      target.targetType = form.targetType;
      target.targetId = form.targetId;
    }
    if (form.events.length === 0) { toast.error('请至少选择一种事件类型'); return; }

    setSubmitting(true);
    try {
      const url = editingBinding ? `/api/notifications/bindings?id=${editingBinding.id}` : '/api/notifications/bindings';
      const method = editingBinding ? 'PUT' : 'POST';
      const body = editingBinding
        ? { target, events: form.events, sources: form.sources }
        : { channelId: form.channelId, target, events: form.events, sources: form.sources };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(editingBinding ? '更新成功' : '绑定成功');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || '操作失败');
      }
    } catch { toast.error('操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (binding: Binding) => {
    try {
      const res = await fetch(`/api/notifications/bindings?id=${binding.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !binding.enabled }),
      });
      if (res.ok) { fetchData(); toast.success(binding.enabled ? '已禁用' : '已启用'); }
    } catch { toast.error('操作失败'); }
  };

  const handleDelete = async (binding: Binding) => {
    const confirmed = await confirm(`确定要解除与「${binding.channel.name}」的绑定吗？`, {
      title: '解除绑定', confirmText: '解除', confirmColor: 'red',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/notifications/bindings?id=${binding.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('已解除绑定'); fetchData(); }
    } catch { toast.error('操作失败'); }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }));
  };

  const toggleSource = (source: string) => {
    setForm((prev) => ({
      ...prev,
      sources: prev.sources.includes(source) ? prev.sources.filter((s) => s !== source) : [...prev.sources, source],
    }));
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">通知管理</h1>
          <p className="text-text-tertiary mt-1">配置签到结果的推送通知</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent-hover shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          添加绑定
        </button>
      </div>

      {/* 绑定列表 */}
      {bindings.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <Bell className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">还没有通知绑定</h3>
          <p className="text-sm text-text-tertiary mt-2">点击上方按钮添加您的第一个通知绑定</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bindings.map((binding) => {
            const providerColor = PROVIDER_COLORS[binding.channel.provider] || 'bg-gray-500';
            return (
              <div
                key={binding.id}
                className={`bg-card rounded-2xl border border-border transition-all duration-200 ${
                  binding.enabled ? 'hover:border-accent/30 hover:shadow-md' : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {/* 渠道图标 */}
                  <div className={`w-11 h-11 rounded-xl ${providerColor} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Send className="h-5 w-5 text-white" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-text-primary text-sm">{binding.channel.name}</span>
                      <span className="text-xs text-text-quaternary">·</span>
                      <span className="text-xs text-text-tertiary">{PROVIDER_LABELS[binding.channel.provider]}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {binding.events.map((event) => {
                        const cfg = EVENT_CONFIG[event];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <span key={event} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${cfg.color}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        );
                      })}
                      {binding.sources?.map((source) => (
                        <span key={source} className="px-2 py-0.5 text-xs font-medium rounded-md bg-muted text-text-secondary">
                          {SOURCE_LABELS[source] || source}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 操作区 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 开关 */}
                    <button
                      onClick={() => handleToggle(binding)}
                      className="group/toggle relative"
                      title={binding.enabled ? '点击禁用' : '点击启用'}
                    >
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                        binding.enabled ? 'bg-accent' : 'bg-border-strong'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                          binding.enabled ? 'left-[22px]' : 'left-0.5'
                        }`} />
                      </div>
                    </button>

                    {/* 编辑 */}
                    <button
                      onClick={() => handleEdit(binding)}
                      className="p-2 text-text-quaternary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* 删除 */}
                    <button
                      onClick={() => handleDelete(binding)}
                      className="p-2 text-text-quaternary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingBinding ? '编辑通知绑定' : '添加通知绑定'}
        subtitle={editingBinding ? '修改推送目标和事件' : '选择渠道并配置推送目标'}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">选择渠道</label>
            <select
              value={form.channelId}
              onChange={(e) => setForm({ ...form, channelId: e.target.value })}
              disabled={!!editingBinding}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary disabled:opacity-50"
            >
              <option value="">请选择...</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({PROVIDER_LABELS[c.provider] || c.provider})</option>
              ))}
            </select>
          </div>

          {selectedChannel?.provider === 'TELEGRAM' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Chat ID</label>
              <input type="text" value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })} placeholder="输入 Telegram Chat ID" className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary" />
            </div>
          )}

          {selectedChannel?.provider === 'DISCORD' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Webhook URL</label>
              <input type="text" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://discord.com/api/webhooks/..." className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary" />
            </div>
          )}

          {selectedChannel?.provider === 'ONEBOT' && (
            <div className="flex gap-4">
              <div className="w-32">
                <label className="block text-sm font-medium text-text-secondary mb-2">目标类型</label>
                <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary">
                  <option value="private">私聊</option>
                  <option value="group">群聊</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-2">{form.targetType === 'group' ? '群号' : 'QQ 号'}</label>
                <input type="text" value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} placeholder={form.targetType === 'group' ? '输入群号' : '输入 QQ 号'} className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">接收事件</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleEvent(key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.events.includes(key)
                        ? 'bg-accent text-white border-accent'
                        : 'bg-card text-text-secondary border-border hover:border-accent/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">推送来源</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSource(key)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                    form.sources.includes(key)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-card text-text-secondary border-border hover:border-accent/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={handleTest} disabled={testing || !form.channelId || !buildTarget()} className="inline-flex items-center gap-2 px-4 py-2.5 text-accent border border-accent/30 rounded-xl font-medium text-sm hover:bg-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              {testing ? '发送中...' : '发送测试'}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-5 py-2.5 text-text-secondary rounded-xl font-medium text-sm hover:bg-muted transition-all">取消</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent-hover shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? '保存中...' : (editingBinding ? '保存修改' : '确认绑定')}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
