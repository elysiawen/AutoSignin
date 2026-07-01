'use client';

import { useState, useEffect } from 'react';
import { Users, Pencil, Trash2, Loader2, KeyRound, Shield, User, Search, UserPlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { accounts: number; tasks: number; logs: number };
}

export default function AdminUsersPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'USER' });
  const [createFormData, setCreateFormData] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [newPassword, setNewPassword] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  const fetchUsers = async (keyword?: string) => {
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('search', keyword);
      params.set('page', String(page));
      params.set('limit', String(limit));
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers(search);
  };

  const handleEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormData({ name: user.name || '', email: user.email, role: user.role });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || saving) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchUsers();
        toast.success('用户已更新');
      } else {
        const data = await response.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserItem) => {
    const confirmed = await confirm(`确定要删除用户「${user.name || user.email}」吗？该用户的所有账号、任务和日志都会被删除。`, {
      title: '删除用户',
      confirmText: '删除',
      confirmColor: 'red',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchUsers();
        toast.success('用户已删除');
      } else {
        const data = await response.json();
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleResetPassword = (user: UserItem) => {
    setEditingUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || saving) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        setShowPasswordModal(false);
        toast.success('密码已重置');
      } else {
        const data = await response.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = () => {
    setCreateFormData({ name: '', email: '', password: '', role: 'USER' });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchUsers();
        toast.success('用户已创建');
      } else {
        const data = await response.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setSaving(false);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">用户管理</h1>
          <p className="text-text-tertiary mt-1">管理系统中的所有用户</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary w-full sm:w-64"
            placeholder="搜索用户名或邮箱..."
          />
          <button
            onClick={handleSearch}
            className="p-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors shrink-0"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors shrink-0 text-sm font-medium"
          >
            <UserPlus className="h-5 w-5" />
            <span className="hidden sm:inline">新建用户</span>
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border-strong">
          <Users className="h-16 w-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">暂无用户</h3>
        </div>
      ) : (
        <>
          {/* 移动端卡片布局 */}
          <div className="sm:hidden space-y-3">
            {users.map((user) => (
              <div key={user.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{user.name || '未设置'}</p>
                    <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ml-2 ${
                    user.role === 'ADMIN'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-muted text-text-secondary'
                  }`}>
                    {user.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {user.role === 'ADMIN' ? '管理员' : '用户'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-tertiary mb-3">
                  <span>账号: {user._count.accounts}</span>
                  <span>任务: {user._count.tasks}</span>
                  <span>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => handleResetPassword(user)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-text-secondary hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                    重置密码
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 桌面端表格布局 */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">用户</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">角色</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">账号</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">任务</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase">注册时间</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{user.name || '未设置'}</p>
                          <p className="text-xs text-text-tertiary">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          user.role === 'ADMIN'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-muted text-text-secondary'
                        }`}>
                          {user.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {user.role === 'ADMIN' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{user._count.accounts}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{user._count.tasks}</td>
                      <td className="px-6 py-4 text-sm text-text-tertiary">
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-text-tertiary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-2 text-text-tertiary hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                            title="重置密码"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Edit User Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="编辑用户">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              placeholder="用户名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">邮箱</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">角色</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
            >
              <option value="USER">用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={saving}
              className="px-5 py-2.5 border border-border rounded-xl text-text-secondary hover:bg-muted font-medium text-sm transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="重置密码" maxWidth="sm">
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-tertiary">
            为 <span className="font-medium text-text-primary">{editingUser?.name || editingUser?.email}</span> 设置新密码
          </p>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">新密码</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              placeholder="至少6位"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              disabled={saving}
              className="px-5 py-2.5 border border-border rounded-xl text-text-secondary hover:bg-muted font-medium text-sm transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? '重置中...' : '重置密码'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="新建用户">
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">名称</label>
            <input
              type="text"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              placeholder="用户名称（选填）"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">邮箱 <span className="text-destructive">*</span></label>
            <input
              type="email"
              required
              value={createFormData.email}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">密码 <span className="text-destructive">*</span></label>
            <input
              type="password"
              required
              minLength={6}
              value={createFormData.password}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              placeholder="至少6位"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">角色</label>
            <select
              value={createFormData.role}
              onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
            >
              <option value="USER">用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
              className="px-5 py-2.5 border border-border rounded-xl text-text-secondary hover:bg-muted font-medium text-sm transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
