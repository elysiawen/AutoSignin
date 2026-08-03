'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Users, Gamepad2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { platformNames, platformIcons, platformColors } from '@/lib/icons';
import { platforms, getPlatform } from './platforms/registry';
import type { FormData, Account } from './platforms/types';

const INITIAL_PLATFORM = 'MIYOUSHE';

export default function AccountsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [currentPlatform, setCurrentPlatform] = useState(INITIAL_PLATFORM);
  const [formData, setFormData] = useState<FormData>(() => {
    const platform = getPlatform(INITIAL_PLATFORM)!;
    return { platform: INITIAL_PLATFORM, name: '', ...platform.getDefaultFormData() };
  });
  const [showOptional, setShowOptional] = useState(false);

  const platformConfig = getPlatform(currentPlatform);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = useCallback((platformId: string) => {
    const cfg = getPlatform(platformId);
    if (!cfg) return;
    setCurrentPlatform(platformId);
    setFormData({ platform: platformId, name: '', ...cfg.getDefaultFormData() });
    setShowOptional(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const url = editingAccount
        ? `/api/accounts/${editingAccount.id}`
        : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const cfg = getPlatform(currentPlatform)!;
      const submitData: any = {
        platform: currentPlatform,
        name: formData.name,
        ...cfg.buildSubmitData(formData, !!editingAccount),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingAccount(null);
        resetForm(INITIAL_PLATFORM);
        fetchAccounts();
        toast.success(editingAccount ? '账号已更新' : '账号已添加');
      } else {
        const data = await response.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save account:', error);
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('确定要删除该账号吗？关联的任务也会被删除。', {
      title: '删除账号',
      confirmText: '删除',
      confirmColor: 'red',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchAccounts();
        toast.success('账号已删除');
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('删除失败');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    const cfg = getPlatform(account.platform);
    if (!cfg) return;
    setCurrentPlatform(account.platform);
    setFormData({
      platform: account.platform,
      name: account.name,
      ...cfg.fillFormData(account),
    });
    setShowOptional(false);
    setShowModal(true);
  };

  const getPlaceholder = () => {
    switch (currentPlatform) {
      case 'KUJIEQU': return '例如：我的鸣潮号';
      case 'TAYGEDO': return '例如：我的塔吉多号';
      case 'SKLAND': return '例如：我的森空岛号';
      default: return '例如：我的原神号';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">账号管理</h1>
          <p className="text-text-tertiary mt-1">管理您的平台账号</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            resetForm(INITIAL_PLATFORM);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent-hover shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          添加账号
        </button>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <Users className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">还没有添加任何账号</h3>
          <p className="text-sm text-text-tertiary mt-2">点击上方按钮添加您的第一个账号</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-6">
          {accounts.map((account) => {
            const platformImage = platformIcons[account.platform];
            return (
              <div
                key={account.id}
                className="group relative bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 hover:shadow-xl hover:border-accent/20 transition-all duration-300"
              >
                {/* 移动端布局 */}
                <div className="sm:hidden">
                  <div className="flex items-start gap-3">
                    <div className={`${platformColors[account.platform] || 'bg-gray-500'} w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0`}>
                      {platformImage ? (
                        <Image src={platformImage} alt={platformNames[account.platform] || account.platform} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <Gamepad2 className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-text-primary truncate">{account.name}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-text-secondary shrink-0">
                          {platformNames[account.platform] || account.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-tertiary">
                        <span>{account._count.tasks} 个任务</span>
                        <span>{new Date(account.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(account)} className="p-2 text-text-tertiary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(account.id)} className="p-2 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 桌面端布局 */}
                <div className="hidden sm:flex sm:items-center gap-4">
                  <div className={`${platformColors[account.platform] || 'bg-gray-500'} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden`}>
                    {platformImage ? (
                      <Image src={platformImage} alt={platformNames[account.platform] || account.platform} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-text-primary">{account.name}</h3>
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-muted text-text-secondary">
                        {platformNames[account.platform] || account.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-tertiary">
                      <span>{account._count.tasks} 个任务</span>
                      <span>添加于 {new Date(account.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(account)} className="p-2.5 text-text-tertiary hover:text-accent hover:bg-accent/10 rounded-xl transition-all duration-200">
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(account.id)} className="p-2.5 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200">
                      <Trash2 className="h-5 w-5" />
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
        onClose={() => {
          setShowModal(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? '编辑账号' : '添加账号'}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 平台选择 - 仅添加时显示 */}
          {!editingAccount && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">平台</label>
              <select
                value={currentPlatform}
                onChange={(e) => resetForm(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 编辑时显示平台名称 */}
          {editingAccount && (
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-xl">
              <span className="text-sm text-text-secondary">平台：</span>
              <span className="text-sm font-medium text-text-primary">
                {platformNames[editingAccount.platform] || editingAccount.platform}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">名称</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder={getPlaceholder()}
            />
          </div>

          {/* 平台专属字段 */}
          {platformConfig?.renderFields({ formData, setFormData, editingAccount, toast })}

          {/* 可选配置 */}
          {((): boolean => {
            if (!platformConfig?.renderOptional) return false;
            const content = platformConfig.renderOptional({ formData, setFormData, editingAccount, toast });
            return content !== null;
          })() && platformConfig && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium text-text-secondary">可选配置</span>
                {showOptional ? (
                  <ChevronUp className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                )}
              </button>
              {showOptional && (
                <div className="p-4 space-y-4">
                  {platformConfig?.renderOptional?.({ formData, setFormData, editingAccount, toast })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingAccount(null);
              }}
              disabled={saving}
              className="px-5 py-2.5 border border-border rounded-xl text-text-secondary hover:bg-muted font-medium text-sm transition-all duration-200 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? '保存中...' : (editingAccount ? '保存' : '添加')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
