'use client';

import { useState, useEffect } from 'react';
import { Loader2, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const toast = useToast();

  // 用户信息状态
  const [userName, setUserName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // 修改密码相关状态
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 获取用户信息
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUserName(data.name || '');
        setOriginalName(data.name || '');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  // 修改昵称
  const handleUpdateName = async () => {
    if (!userName.trim()) {
      toast.error('昵称不能为空');
      return;
    }

    if (userName.trim() === originalName) {
      toast.error('昵称未修改');
      return;
    }

    setNameLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setOriginalName(data.user.name || '');
        toast.success('昵称修改成功');
      } else {
        const data = await response.json();
        toast.error(data.error || '修改失败');
      }
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('修改失败');
    } finally {
      setNameLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    // 验证表单
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('请填写当前密码和新密码');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码长度不能少于6位');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        toast.success('密码修改成功');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const data = await response.json();
        toast.error(data.error || '修改失败');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">设置</h1>
        <p className="text-text-tertiary mt-1">系统设置</p>
      </div>

      {/* User Profile */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">个人信息</h2>
            <p className="text-sm text-text-tertiary">修改您的昵称</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              昵称
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder="请输入昵称"
            />
          </div>

          <button
            onClick={handleUpdateName}
            disabled={nameLoading || userName.trim() === originalName}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nameLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {nameLoading ? '保存中...' : '保存昵称'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-2xl border border-border p-6 animate-slide-in-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">修改密码</h2>
            <p className="text-sm text-text-tertiary">修改登录密码</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              当前密码
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="w-full px-4 py-3 pr-10 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                placeholder="请输入当前密码"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              新密码
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                className="w-full px-4 py-3 pr-10 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                placeholder="请输入新密码（至少6位）"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              确认新密码
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder="请再次输入新密码"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleChangePassword}
            disabled={passwordLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {passwordLoading ? '修改中...' : '修改密码'}
          </button>
        </div>
      </div>

    </div>
  );
}
