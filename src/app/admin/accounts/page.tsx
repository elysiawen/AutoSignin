'use client';

import { useState, useEffect } from 'react';
import { Globe, Trash2, Loader2, Gamepad2, Power, Search } from 'lucide-react';
import Image from 'next/image';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { platformNames, platformIcons, platformColors } from '@/lib/icons';

interface AccountItem {
  id: string;
  name: string;
  platform: string;
  isActive: boolean;
  cronExpr: string | null;
  uid: string | null;
  mid: string | null;
  extra: any;
  createdAt: string;
  user: { id: string; name: string; email: string };
  _count: { tasks: number };
  tasks: Array<{
    id: string;
    type: string;
    logs: Array<{ status: string }>;
  }>;
}

export default function AdminAccountsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAccounts();
  }, [filter, page, limit]);

  const fetchAccounts = async (keyword?: string) => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set('platform', filter);
      if (keyword) params.set('search', keyword);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const response = await fetch(`/api/admin/accounts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAccounts(search);
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/accounts/${id}/toggle`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        fetchAccounts();
        toast.success(data.message);
      } else {
        toast.error('操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (account: AccountItem) => {
    const confirmed = await confirm(`确定要删除「${account.name}」吗？关联的任务和日志也会被删除。`, {
      title: '删除账号',
      confirmText: '删除',
      confirmColor: 'red',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchAccounts();
        toast.success('账号已删除');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">全部账号</h1>
          <p className="text-text-tertiary mt-1">管理所有用户的平台账号</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary"
          >
            <option value="">全部平台</option>
            <option value="MIYOUSHE">米游社</option>
            <option value="HOYOLAB">HoYoLAB</option>
            <option value="KUJIEQU">库街区</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary flex-1 min-w-[150px] sm:w-48"
            placeholder="搜索账号名称..."
          />
          <button
            onClick={handleSearch}
            className="p-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors shrink-0"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <Globe className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">暂无账号</h3>
        </div>
      ) : (
        <>
          {/* 移动端卡片布局 */}
          <div className="sm:hidden space-y-3">
            {accounts.map((account) => {
              const platformImage = platformIcons[account.platform];
              return (
                <div key={account.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg ${platformColors[account.platform] || 'bg-gray-500'} flex items-center justify-center overflow-hidden shrink-0`}>
                        {platformImage ? (
                          <Image src={platformImage} alt={account.platform} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <Gamepad2 className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{account.name}</p>
                        <p className="text-xs text-text-tertiary">{platformNames[account.platform] || account.platform}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ml-2 ${
                      account.isActive ? 'bg-success/10 text-success' : 'bg-muted text-text-quaternary'
                    }`}>
                      {account.isActive ? '启用' : '禁用'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-tertiary mb-3">
                    <span>用户: {account.user.name || '未设置'}</span>
                    <span>任务: {account._count.tasks}</span>
                    {account.cronExpr && <span>定时: {account.cronExpr}</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => handleToggle(account.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                        account.isActive
                          ? 'text-success hover:bg-success/10'
                          : 'text-text-quaternary hover:bg-muted'
                      }`}
                    >
                      <Power className="h-4 w-4" />
                      {account.isActive ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleDelete(account)}
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
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">账号</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">所属用户</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">平台</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">任务</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">状态</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">定时</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map((account) => {
                    const platformImage = platformIcons[account.platform];
                    return (
                      <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${platformColors[account.platform] || 'bg-gray-500'} flex items-center justify-center overflow-hidden shrink-0`}>
                              {platformImage ? (
                                <Image src={platformImage} alt={account.platform} width={32} height={32} className="w-full h-full object-cover" />
                              ) : (
                                <Gamepad2 className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-text-primary">{account.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-primary">{account.user.name || '未设置'}</p>
                          <p className="text-xs text-text-tertiary">{account.user.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {platformNames[account.platform] || account.platform}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{account._count.tasks}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                            account.isActive ? 'bg-success/10 text-success' : 'bg-muted text-text-quaternary'
                          }`}>
                            {account.isActive ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-text-tertiary">
                          {account.cronExpr || '未设置'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggle(account.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                account.isActive
                                  ? 'text-success hover:bg-success/10'
                                  : 'text-text-quaternary hover:bg-muted'
                              }`}
                              title={account.isActive ? '禁用' : '启用'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(account)}
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

    </div>
  );
}
