'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, Gamepad2, Globe, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import HelpGuide from '@/components/HelpGuide';
import KuroLoginModal from '@/components/tools/KuroLoginModal';
import MysLoginModal from '@/components/tools/MysLoginModal';
import MysQrLoginModal from '@/components/tools/MysQrLoginModal';
import { platformNames, platformIcons, platformColors } from '@/lib/icons';

interface Account {
  id: string;
  platform: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count: { tasks: number };
  extra?: {
    kuroUserId?: string;
    wwroleId?: string;
    pgrRoleId?: string;
    devcode?: string;
    distinct_id?: string;
    cloud_genshin_token?: string;
    cloud_zzz_token?: string;
  } | null;
}

export default function AccountsPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    platform: 'MIYOUSHE',
    name: '',
    cookie: '',
    stoken: '',
    uid: '',
    mid: '',
    cloudGenshinToken: '',
    cloudZzzToken: '',
    // 库街区字段
    kuroToken: '',
    devcode: '',
    distinctId: '',
    kuroUserId: '',
    wwroleId: '',
    pgrRoleId: '',
    // 塔吉多字段
    taygedoLoginMode: 'token' as 'token' | 'password',
    taygedoAccessToken: '',
    taygedoRefreshToken: '',
    taygedoDeviceId: '',
    taygedoPhone: '',
    taygedoPassword: '',
    taygedoHasPassword: false,
    taygedoLaohuToken: '',
    taygedoLaohuUserId: '',
  });
  const [showOptional, setShowOptional] = useState(false);
  const [showKuroModal, setShowKuroModal] = useState(false);
  const [showMysLoginModal, setShowMysLoginModal] = useState(false);
  const [showMysQrLoginModal, setShowMysQrLoginModal] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // 防止重复提交
    setSaving(true);

    try {
      const url = editingAccount
        ? `/api/accounts/${editingAccount.id}`
        : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      // 构建提交数据，只包含需要的字段
      const submitData: any = {
        platform: formData.platform,
        name: formData.name,
      };

      // 处理 cookie 字段
      const cookieValue = formData.platform === 'KUJIEQU' ? formData.kuroToken
        : formData.platform === 'TAYGEDO' ? (formData.taygedoLoginMode === 'token' ? formData.taygedoAccessToken : '')
        : formData.cookie;
      // 新增时必须有 cookie，编辑时只有用户填写了才提交
      if (cookieValue) {
        submitData.cookie = cookieValue;
      } else if (!editingAccount) {
        submitData.cookie = '';
      }

      // 处理 stoken 字段
      const stokenValue = formData.platform === 'TAYGEDO'
        ? (formData.taygedoLoginMode === 'token' ? formData.taygedoRefreshToken : '')
        : formData.stoken;
      // 只有用户填写了 stoken 才提交
      if (stokenValue) {
        submitData.stoken = stokenValue;
      }

      // 处理 uid 字段
      if (formData.platform !== 'TAYGEDO' && formData.platform !== 'SKLAND' && formData.uid) {
        submitData.uid = formData.uid;
      }

      // 处理 mid 字段
      if (formData.mid) {
        submitData.mid = formData.mid;
      }

      // 处理 extra 字段
      const extra: any = {};

      // 米游社云游戏 token
      if (formData.cloudGenshinToken) extra.cloud_genshin_token = formData.cloudGenshinToken;
      if (formData.cloudZzzToken) extra.cloud_zzz_token = formData.cloudZzzToken;

      // 库街区字段
      if (formData.platform === 'KUJIEQU') {
        if (formData.devcode) extra.devcode = formData.devcode;
        if (formData.distinctId) extra.distinct_id = formData.distinctId;
        if (formData.kuroUserId) extra.kuroUserId = formData.kuroUserId;
        if (formData.wwroleId) extra.wwroleId = formData.wwroleId;
        if (formData.pgrRoleId) extra.pgrRoleId = formData.pgrRoleId;
      }

      // 塔吉多字段
      if (formData.platform === 'TAYGEDO') {
        extra.taygedoLoginMode = formData.taygedoLoginMode;
        if (formData.taygedoDeviceId) extra.deviceId = formData.taygedoDeviceId;
        if (formData.taygedoLoginMode === 'password') {
          if (formData.taygedoPhone) extra.phone = formData.taygedoPhone;
          if (formData.taygedoPassword) extra.password = formData.taygedoPassword;
        }
        if (formData.taygedoLaohuToken) extra.laohuToken = formData.taygedoLaohuToken;
        if (formData.taygedoLaohuUserId) extra.laohuUserId = formData.taygedoLaohuUserId;
      }

      // 只有 extra 有内容时才提交
      if (Object.keys(extra).length > 0) {
        submitData.extra = extra;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingAccount(null);
        setFormData({
          platform: 'MIYOUSHE',
          name: '',
          cookie: '',
          stoken: '',
          uid: '',
          mid: '',
          cloudGenshinToken: '',
          cloudZzzToken: '',
          kuroToken: '',
          devcode: '',
          distinctId: '',
          kuroUserId: '',
          wwroleId: '',
          pgrRoleId: '',
          taygedoLoginMode: 'token' as const,
          taygedoAccessToken: '',
          taygedoRefreshToken: '',
          taygedoDeviceId: '',
          taygedoPhone: '',
          taygedoPassword: '',
          taygedoHasPassword: false,
          taygedoLaohuToken: '',
          taygedoLaohuUserId: '',
        });
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
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      });

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
    const extra = (account.extra as any) || {};
    setFormData({
      platform: account.platform,
      name: account.name,
      cookie: '',
      stoken: '',
      uid: '',
      mid: '',
      cloudGenshinToken: extra.cloud_genshin_token || '',
      cloudZzzToken: extra.cloud_zzz_token || '',
      kuroToken: '',
      devcode: extra.devcode || '',
      distinctId: extra.distinct_id || '',
      kuroUserId: extra.kuroUserId || '',
      wwroleId: extra.wwroleId || '',
      pgrRoleId: extra.pgrRoleId || '',
      // 塔吉多字段
      taygedoLoginMode: (extra.taygedoLoginMode || 'token') as 'token' | 'password',
      taygedoAccessToken: '',
      taygedoRefreshToken: '',
      taygedoDeviceId: extra.deviceId || '',
      taygedoPhone: extra.phone || '',
      taygedoPassword: '',
      taygedoHasPassword: !!(extra as any)?.password || (!!extra.phone && extra.taygedoLoginMode === 'password'),
      taygedoLaohuToken: extra.laohuToken || '',
      taygedoLaohuUserId: extra.laohuUserId || '',
    });
    setShowOptional(false); // 编辑时折叠可选配置
    setShowModal(true);
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
            setFormData({
              platform: 'MIYOUSHE',
              name: '',
              cookie: '',
              stoken: '',
              uid: '',
              mid: '',
              cloudGenshinToken: '',
              cloudZzzToken: '',
              kuroToken: '',
              devcode: '',
              distinctId: '',
              kuroUserId: '',
              wwroleId: '',
              pgrRoleId: '',
              taygedoLoginMode: 'token' as const,
          taygedoAccessToken: '',
              taygedoRefreshToken: '',
              taygedoDeviceId: '',
              taygedoPhone: '',
              taygedoPassword: '',
              taygedoHasPassword: false,
              taygedoLaohuToken: '',
              taygedoLaohuUserId: '',
            });
            setShowOptional(false);
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
          {accounts.map((account, index) => {
            const platformImage = platformIcons[account.platform];
            return (
              <div
                key={account.id}
                className={`group relative bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 hover:shadow-xl hover:border-accent/20 transition-all duration-300 animate-slide-in-up delay-${index * 50}`}
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
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-2 text-text-tertiary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
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
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2.5 text-text-tertiary hover:text-accent hover:bg-accent/10 rounded-xl transition-all duration-200"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2.5 text-text-tertiary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
                    >
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
              <label className="block text-sm font-medium text-text-secondary mb-2">
                平台
              </label>
              <select
                value={formData.platform}
                onChange={(e) =>
                  setFormData({ ...formData, platform: e.target.value })
                }
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary"
              >
                <option value="MIYOUSHE">米游社（国服）</option>
                <option value="HOYOLAB">HoYoLAB（国际服）</option>
                <option value="KUJIEQU">库街区</option>
                <option value="TAYGEDO">塔吉多</option>
                <option value="SKLAND">森空岛</option>
                <option value="YIHUAN">异环（敬请期待）</option>
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
            <label className="block text-sm font-medium text-text-secondary mb-2">
              名称
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder={formData.platform === 'KUJIEQU' ? '例如：我的鸣潮号' : formData.platform === 'TAYGEDO' ? '例如：我的塔吉多号' : formData.platform === 'SKLAND' ? '例如：我的森空岛号' : '例如：我的原神号'}
            />
          </div>

          {/* Cookie 字段 - 库街区和塔吉多不显示（使用自己的 Token 体系） */}
          {formData.platform !== 'KUJIEQU' && formData.platform !== 'TAYGEDO' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {formData.platform === 'SKLAND' ? '鹰角 OAuth Token' : 'Cookie'}
              </label>
              <textarea
                value={formData.cookie}
                onChange={(e) =>
                  setFormData({ ...formData, cookie: e.target.value })
                }
                rows={formData.platform === 'SKLAND' ? 2 : 3}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
                placeholder={editingAccount ? '已设置（出于安全考虑不显示，留空则不修改）' : formData.platform === 'SKLAND' ? '粘贴鹰角 OAuth Token（从 web-api.skland.com/account/info/hg 获取 content 字段）' : '粘贴从浏览器获取的 Cookie'}
              />
              <HelpGuide
                platform={formData.platform as 'MIYOUSHE' | 'HOYOLAB'}
                field={formData.platform === 'SKLAND' ? 'token' : 'cookie'}
                onOpenMysLogin={() => setShowMysLoginModal(true)}
                onOpenMysQrLogin={() => setShowMysQrLoginModal(true)}
              />
            </div>
          )}

          {/* 库街区必填字段 - Token */}
          {formData.platform === 'KUJIEQU' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Token
              </label>
              <textarea
                required={!editingAccount}
                value={formData.kuroToken}
                onChange={(e) =>
                  setFormData({ ...formData, kuroToken: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
                placeholder={editingAccount ? '已设置（出于安全考虑不显示，留空则不修改）' : '库街区 Token（通过登录工具获取）'}
              />
              <HelpGuide platform="KUJIEQU" field="token" onOpenKuroLogin={() => setShowKuroModal(true)} />
            </div>
          )}

          {/* 塔吉多登录方式选择 */}
          {formData.platform === 'TAYGEDO' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  登录方式
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taygedoLoginMode: 'token' })}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      formData.taygedoLoginMode === 'token'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-secondary hover:border-accent/30'
                    }`}
                  >
                    Token 登录
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taygedoLoginMode: 'password' })}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      formData.taygedoLoginMode === 'password'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-secondary hover:border-accent/30'
                    }`}
                  >
                    手机号+密码
                  </button>
                </div>
              </div>

              {/* Token 模式 */}
              {formData.taygedoLoginMode === 'token' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Refresh Token <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      required={!editingAccount}
                      value={formData.taygedoRefreshToken}
                      onChange={(e) =>
                        setFormData({ ...formData, taygedoRefreshToken: e.target.value })
                      }
                      rows={2}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
                      placeholder={editingAccount ? '留空则不修改' : '塔吉多 Refresh Token'}
                    />
                    <HelpGuide platform="TAYGEDO" field="token" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Access Token
                    </label>
                    <input
                      type="text"
                      value={formData.taygedoAccessToken}
                      onChange={(e) =>
                        setFormData({ ...formData, taygedoAccessToken: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                      placeholder="留空则自动获取"
                    />
                  </div>
                </>
              )}

              {/* 密码模式 */}
              {formData.taygedoLoginMode === 'password' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      手机号 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required={!editingAccount}
                      value={formData.taygedoPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, taygedoPhone: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                      placeholder="塔吉多手机号"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      密码 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="password"
                      required={!editingAccount && !formData.taygedoHasPassword}
                      value={formData.taygedoPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, taygedoPassword: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                      placeholder={formData.taygedoHasPassword ? '已设置（留空不修改）' : '塔吉多密码'}
                    />
                    {formData.taygedoHasPassword && (
                      <p className="text-xs text-accent mt-1">密码已设置，如需修改请重新输入，留空则不修改</p>
                    )}
                  </div>
                </>
              )}

              {/* 通用可选 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  设备 ID
                </label>
                <input
                  type="text"
                  value={formData.taygedoDeviceId}
                  onChange={(e) =>
                    setFormData({ ...formData, taygedoDeviceId: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                  placeholder="留空自动生成"
                />
              </div>
            </>
          )}

          {/* 可选字段折叠区域 - 统一放在底部 */}
          {(formData.platform === 'MIYOUSHE' || formData.platform === 'KUJIEQU' || (formData.platform === 'TAYGEDO' && formData.taygedoLoginMode === 'token')) && (
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
                  {/* 米游社可选字段 */}
                  {formData.platform === 'MIYOUSHE' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Stoken
                        </label>
                        <input
                          type="text"
                          value={formData.stoken}
                          onChange={(e) =>
                            setFormData({ ...formData, stoken: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder={editingAccount ? '留空则不修改' : '用于米游社任务（看帖/点赞/分享）'}
                        />
                        <HelpGuide platform="MIYOUSHE" field="stoken" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          云原神 Token
                        </label>
                        <input
                          type="text"
                          value={formData.cloudGenshinToken}
                          onChange={(e) =>
                            setFormData({ ...formData, cloudGenshinToken: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder="用于云原神签到（combo_token）"
                        />
                        <HelpGuide platform="MIYOUSHE" field="cloudGenshinToken" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          云绝区零 Token
                        </label>
                        <input
                          type="text"
                          value={formData.cloudZzzToken}
                          onChange={(e) =>
                            setFormData({ ...formData, cloudZzzToken: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder="用于云绝区零签到（combo_token，需手机抓包）"
                        />
                        <HelpGuide platform="MIYOUSHE" field="cloudZzzToken" />
                      </div>
                    </>
                  )}

                  {/* 库街区可选字段 */}
                  {formData.platform === 'KUJIEQU' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          用户 ID
                        </label>
                        <input
                          type="text"
                          value={formData.kuroUserId}
                          onChange={(e) =>
                            setFormData({ ...formData, kuroUserId: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder={formData.kuroUserId ? '' : '留空自动获取'}
                        />
                        {formData.kuroUserId && (
                          <p className="text-xs text-success mt-1">✓ 已获取</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          鸣潮角色 ID
                        </label>
                        <input
                          type="text"
                          value={formData.wwroleId}
                          onChange={(e) =>
                            setFormData({ ...formData, wwroleId: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder={formData.wwroleId ? '' : '留空自动获取'}
                        />
                        {formData.wwroleId && (
                          <p className="text-xs text-success mt-1">✓ 已获取</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          战双角色 ID
                        </label>
                        <input
                          type="text"
                          value={formData.pgrRoleId}
                          onChange={(e) =>
                            setFormData({ ...formData, pgrRoleId: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder={formData.pgrRoleId ? '' : '留空自动获取'}
                        />
                        {formData.pgrRoleId && (
                          <p className="text-xs text-success mt-1">✓ 已获取</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          设备码
                        </label>
                        <input
                          type="text"
                          value={formData.devcode}
                          onChange={(e) =>
                            setFormData({ ...formData, devcode: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder={formData.devcode ? '' : '留空自动生成'}
                        />
                        {formData.devcode && (
                          <p className="text-xs text-accent mt-1">已保存</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          唯一标识
                        </label>
                        <input
                          type="text"
                          value={formData.distinctId}
                          onChange={(e) =>
                            setFormData({ ...formData, distinctId: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder={formData.distinctId ? '' : '留空自动生成'}
                        />
                        {formData.distinctId && (
                          <p className="text-xs text-accent mt-1">已保存</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* 塔吉多可选字段 - 云游戏凭证 */}
                  {formData.platform === 'TAYGEDO' && (
                    <>
                      <div className="pb-2 mb-2 border-b border-border">
                        <p className="text-xs text-text-tertiary">以下为云异环时长签到所需，不填则跳过云游戏签到</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          老虎 Token
                        </label>
                        <input
                          type="text"
                          value={formData.taygedoLaohuToken}
                          onChange={(e) =>
                            setFormData({ ...formData, taygedoLaohuToken: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder="用于云异环时长签到"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          老虎 User ID
                        </label>
                        <input
                          type="text"
                          value={formData.taygedoLaohuUserId}
                          onChange={(e) =>
                            setFormData({ ...formData, taygedoLaohuUserId: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                          placeholder="用于云异环时长签到"
                        />
                      </div>
                    </>
                  )}
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

      {/* 库街区登录弹窗 */}
      <KuroLoginModal
        open={showKuroModal}
        onClose={() => setShowKuroModal(false)}
        onFill={(data) => {
          setFormData((prev) => ({
            ...prev,
            kuroToken: data.token,
            kuroUserId: data.userId,
            devcode: data.devcode,
            distinctId: data.distinctId,
            wwroleId: data.roleId || '',
          }));
          setShowOptional(true);
        }}
      />

      {/* 米游社手机号登录弹窗 */}
      <MysLoginModal
        open={showMysLoginModal}
        onClose={() => setShowMysLoginModal(false)}
        onFill={(data) => {
          const cookie = `cookie_token=${data.cookieToken}; account_id=${data.accountId}; ltuid=${data.accountId}`;
          setFormData((prev) => ({
            ...prev,
            cookie,
            stoken: data.stoken,
            uid: data.accountId,
            mid: data.mid,
          }));
        }}
      />

      {/* 米游社扫码登录弹窗 */}
      <MysQrLoginModal
        open={showMysQrLoginModal}
        onClose={() => setShowMysQrLoginModal(false)}
        onFill={(data) => {
          const parts = [`account_id=${data.accountId}`, `ltuid=${data.accountId}`];
          if (data.cookieToken) parts.push(`cookie_token=${data.cookieToken}`);
          setFormData((prev) => ({
            ...prev,
            cookie: parts.join('; '),
            stoken: data.stoken,
            uid: data.accountId,
            mid: data.mid,
          }));
        }}
      />
    </div>
  );
}
