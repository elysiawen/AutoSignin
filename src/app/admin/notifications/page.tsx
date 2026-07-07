'use client';

import { useState, useEffect } from 'react';
import { Loader2, Bell, Plus, Trash2, Pencil, Send, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

interface Channel {
  id: string;
  name: string;
  provider: string;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  creator: { id: string; name: string; email: string };
  _count: { bindings: number };
}

const PROVIDERS = [
  { value: 'TELEGRAM', label: 'Telegram', color: 'bg-blue-500', configFields: [{ key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...' }] },
  { value: 'DISCORD', label: 'Discord', color: 'bg-indigo-500', configFields: [] },
  { value: 'ONEBOT', label: 'QQ (OneBot)', color: 'bg-orange-500', configFields: [
    { key: 'apiUrl', label: 'API 地址', placeholder: 'http://localhost:5700' },
    { key: 'accessToken', label: 'Access Token（可选）', placeholder: '' },
  ] },
  { value: 'FEISHU', label: '飞书', color: 'bg-cyan-500', configFields: [] },
  { value: 'DINGTALK', label: '钉钉', color: 'bg-sky-500', configFields: [] },
  { value: 'EMAIL', label: '邮件 (SMTP)', color: 'bg-emerald-500', configFields: [] },
];

export default function AdminNotificationsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  const [form, setForm] = useState({
    name: '',
    provider: 'TELEGRAM',
    config: {} as Record<string, string>,
  });
  const [submitting, setSubmitting] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  useEffect(() => { fetchChannels(); fetchSmtpStatus(); }, []);

  const fetchSmtpStatus = async () => {
    try {
      const res = await fetch('/api/system/smtp-status');
      if (res.ok) {
        const data = await res.json();
        setSmtpConfigured(data.configured);
      }
    } catch {}
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/admin/notifications/channels');
      if (res.ok) setChannels(await res.json());
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally { setLoading(false); }
  };

  const selectedProvider = PROVIDERS.find((p) => p.value === form.provider);

  const resetForm = () => {
    setForm({ name: '', provider: 'TELEGRAM', config: {} });
    setEditingChannel(null);
  };

  const handleAdd = () => { resetForm(); setShowModal(true); };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setForm({ name: channel.name, provider: channel.provider, config: { ...channel.config } });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('请输入渠道名称'); return; }

    setSubmitting(true);
    try {
      const url = editingChannel ? `/api/admin/notifications/channels?id=${editingChannel.id}` : '/api/admin/notifications/channels';
      const method = editingChannel ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.trim(), provider: form.provider, config: form.config }) });
      if (res.ok) {
        const data = await res.json();
        if (data.channel && !data.channel.enabled) {
          // EMAIL 渠道创建成功但未启用（SMTP 未配置）
          toast.info(data.message);
        } else {
          toast.success(editingChannel ? '渠道更新成功' : '渠道创建成功');
        }
        setShowModal(false);
        resetForm();
        fetchChannels();
      } else {
        const data = await res.json();
        toast.error(data.error || '操作失败');
      }
    } catch { toast.error('操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (channel: Channel) => {
    // 启用 EMAIL 渠道时检查 SMTP 是否已配置
    if (!channel.enabled && channel.provider === 'EMAIL' && !smtpConfigured) {
      toast.error('SMTP 邮件服务未配置，无法启用邮件渠道。请在环境变量中配置 SMTP_HOST、SMTP_USER、SMTP_PASS 后重试。');
      return;
    }

    try {
      const res = await fetch(`/api/admin/notifications/channels?id=${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !channel.enabled }),
      });
      if (res.ok) { fetchChannels(); toast.success(channel.enabled ? '已禁用' : '已启用'); }
    } catch { toast.error('操作失败'); }
  };

  const handleDelete = async (channel: Channel) => {
    const confirmed = await confirm(`确定要删除渠道「${channel.name}」吗？关联的 ${channel._count.bindings} 个绑定将被一同删除。`, {
      title: '删除渠道', confirmText: '删除', confirmColor: 'red',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/notifications/channels?id=${channel.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('渠道已删除'); fetchChannels(); }
    } catch { toast.error('删除失败'); }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">通知渠道</h1>
          <p className="text-text-tertiary mt-1">管理通知推送渠道（机器人/服务）</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent-hover shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          新建渠道
        </button>
      </div>

      {/* 渠道列表 */}
      {channels.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <Bell className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">还没有通知渠道</h3>
          <p className="text-sm text-text-tertiary mt-2">点击上方按钮创建您的第一个通知渠道</p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((channel) => {
            const provider = PROVIDERS.find((p) => p.value === channel.provider);
            const providerColor = provider?.color || 'bg-gray-500';
            const isEmailNeedSmtp = channel.provider === 'EMAIL' && channel.enabled && !smtpConfigured;
            return (
              <div
                key={channel.id}
                className={`bg-card rounded-2xl border transition-all duration-200 ${
                  isEmailNeedSmtp ? 'border-destructive/50 bg-destructive/5' : channel.enabled ? 'border-border hover:border-accent/30 hover:shadow-md' : 'border-border opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {/* 图标 */}
                  <div className={`w-11 h-11 rounded-xl ${providerColor} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Send className="h-5 w-5 text-white" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary text-sm">{channel.name}</span>
                      <span className="text-xs text-text-quaternary">·</span>
                      <span className="text-xs text-text-tertiary">{provider?.label || channel.provider}</span>
                      {isEmailNeedSmtp && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded bg-destructive/10 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          SMTP 未配置
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-quaternary">
                      <span>{channel._count.bindings} 个绑定</span>
                      <span>·</span>
                      <span>{channel.creator.name || channel.creator.email}</span>
                    </div>
                  </div>

                  {/* 操作区 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(channel)}
                      className="group/toggle relative"
                      title={channel.enabled ? '点击禁用' : '点击启用'}
                    >
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                        channel.enabled ? 'bg-accent' : 'bg-border-strong'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                          channel.enabled ? 'left-[22px]' : 'left-0.5'
                        }`} />
                      </div>
                    </button>

                    <button
                      onClick={() => handleEdit(channel)}
                      className="p-2 text-text-quaternary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(channel)}
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
        title={editingChannel ? '编辑渠道' : '新建渠道'}
        subtitle="配置通知渠道信息"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">渠道名称</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：项目 Telegram 机器人" className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">提供商</label>
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value, config: {} })} disabled={!!editingChannel} className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary disabled:opacity-50">
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {selectedProvider && selectedProvider.configFields.length > 0 && (
            <div className="space-y-4">
              {selectedProvider.configFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-text-secondary mb-2">{field.label}</label>
                  <input type="text" value={form.config[field.key] || ''} onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.value } })} placeholder={field.placeholder} className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary" />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-5 py-2.5 text-text-secondary rounded-xl font-medium text-sm hover:bg-muted transition-all">取消</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent-hover shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingChannel ? '保存修改' : '创建渠道'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
