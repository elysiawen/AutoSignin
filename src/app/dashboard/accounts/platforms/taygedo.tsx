import type { PlatformConfig, FormData } from './types';
import HelpGuide from '@/components/HelpGuide';
import { useToast } from '@/components/ui/Toast';
import { useEffect, useRef } from 'react';

export const taygedoPlatform: PlatformConfig = {
  id: 'TAYGEDO',
  name: '塔吉多',

  getDefaultFormData: () => ({
    taygedoLoginMode: 'token' as 'token' | 'password' | 'captcha',
    taygedoAccessToken: '',
    taygedoRefreshToken: '',
    taygedoPhone: '',
    taygedoPassword: '',
    taygedoCaptcha: '',
    taygedoSendingCaptcha: false,
    taygedoCaptchaSent: false,
    taygedoCaptchaCooldown: 0,
    taygedoHasPassword: false,
    taygedoLaohuToken: '',
    taygedoLaohuUserId: '',
  }),

  fillFormData: (account) => {
    const extra = account.extra || {};
    return {
      taygedoLoginMode: (extra.taygedoLoginMode || 'token') as 'token' | 'password' | 'captcha',
      taygedoAccessToken: '',
      taygedoRefreshToken: '',
      taygedoPhone: extra.phone || '',
      taygedoPassword: '',
      taygedoCaptcha: '',
      taygedoSendingCaptcha: false,
      taygedoCaptchaSent: false,
      taygedoCaptchaCooldown: 0,
      taygedoHasPassword: !!(extra as any)?.password || (!!extra.phone && extra.taygedoLoginMode === 'password'),
      taygedoLaohuToken: extra.laohuToken || '',
      taygedoLaohuUserId: extra.laohuUserId || '',
    };
  },

  buildSubmitData: (formData, _isEditing) => {
    const data: Record<string, any> = {};
    if (formData.taygedoLoginMode === 'token') {
      if (formData.taygedoAccessToken) data.cookie = formData.taygedoAccessToken;
      if (formData.taygedoRefreshToken) data.stoken = formData.taygedoRefreshToken;
    }
    const extra: Record<string, any> = { taygedoLoginMode: formData.taygedoLoginMode };
    if (formData.taygedoLoginMode === 'password') {
      if (formData.taygedoPhone) extra.phone = formData.taygedoPhone;
      if (formData.taygedoPassword) extra.password = formData.taygedoPassword;
    }
    if (formData.taygedoLoginMode === 'captcha') {
      if (formData.taygedoPhone) extra.phone = formData.taygedoPhone;
      if (formData.taygedoCaptcha) extra.captcha = formData.taygedoCaptcha;
    }
    if (formData.taygedoLaohuToken) extra.laohuToken = formData.taygedoLaohuToken;
    if (formData.taygedoLaohuUserId) extra.laohuUserId = formData.taygedoLaohuUserId;
    if (Object.keys(extra).length > 0) data.extra = extra;
    return data;
  },

  renderFields: ({ formData, setFormData, editingAccount, toast }) => (
    <TaygedoFields
      formData={formData}
      setFormData={setFormData}
      editingAccount={editingAccount}
      toast={toast}
    />
  ),

  renderOptional: ({ formData, setFormData }) => {
    // 密码和短信验证码模式下不显示可选配置（token 已自动获取）
    if (formData.taygedoLoginMode !== 'token') return null;
    return (
      <>
        <div className="pb-2 mb-2 border-b border-border">
          <p className="text-xs text-text-tertiary">以下为云异环时长签到所需，不填则跳过云游戏签到</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">老虎 Token</label>
          <input
            type="text"
            value={formData.taygedoLaohuToken}
            onChange={(e) => setFormData({ ...formData, taygedoLaohuToken: e.target.value })}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
            placeholder="用于云异环时长签到"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">老虎 User ID</label>
          <input
            type="text"
            value={formData.taygedoLaohuUserId}
            onChange={(e) => setFormData({ ...formData, taygedoLaohuUserId: e.target.value })}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
            placeholder="用于云异环时长签到"
          />
        </div>
      </>
    );
  },
};

/** 塔吉多专属字段组件（含登录方式切换和三种子模式） */
function TaygedoFields({
  formData,
  setFormData,
  editingAccount,
  toast,
}: {
  formData: FormData;
  setFormData: (updater: FormData | ((prev: FormData) => FormData)) => void;
  editingAccount: any;
  toast: ReturnType<typeof useToast>;
}) {
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // 清理倒计时
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const update = (patch: Partial<FormData>) => setFormData((prev: FormData) => ({ ...prev, ...patch }));

  const handleSendCaptcha = async () => {
    if (!formData.taygedoPhone) return;
    update({ taygedoSendingCaptcha: true });
    try {
      const res = await fetch('/api/tools/taygedo-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.taygedoPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        update({ taygedoSendingCaptcha: false, taygedoCaptchaSent: true, taygedoCaptchaCooldown: 60 });
        toast.success('验证码已发送');
        cooldownRef.current = setInterval(() => {
          setFormData((prev: FormData) => {
            const next = prev.taygedoCaptchaCooldown - 1;
            if (next <= 0) {
              if (cooldownRef.current) clearInterval(cooldownRef.current);
              return { ...prev, taygedoCaptchaCooldown: 0 };
            }
            return { ...prev, taygedoCaptchaCooldown: next };
          });
        }, 1000);
      } else {
        throw new Error(data.error || '发送失败');
      }
    } catch (error: any) {
      update({ taygedoSendingCaptcha: false });
      toast.error(error.message || '发送验证码失败');
    }
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">登录方式</label>
        <div className="flex gap-2">
          {(['token', 'password', 'captcha'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update({ taygedoLoginMode: mode })}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                formData.taygedoLoginMode === mode
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-accent/30'
              }`}
            >
              {{ token: 'Token 登录', password: '手机号+密码', captcha: '短信验证码' }[mode]}
            </button>
          ))}
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
              onChange={(e) => update({ taygedoRefreshToken: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
              placeholder={editingAccount ? '留空则不修改' : '塔吉多 Refresh Token'}
            />
            <HelpGuide platform="TAYGEDO" field="token" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Access Token</label>
            <input
              type="text"
              value={formData.taygedoAccessToken}
              onChange={(e) => update({ taygedoAccessToken: e.target.value })}
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
              onChange={(e) => update({ taygedoPhone: e.target.value })}
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
              onChange={(e) => update({ taygedoPassword: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder={formData.taygedoHasPassword ? '已设置（留空不修改）' : '塔吉多密码'}
            />
            {formData.taygedoHasPassword && (
              <p className="text-xs text-accent mt-1">密码已设置，如需修改请重新输入，留空则不修改</p>
            )}
          </div>
        </>
      )}

      {/* 短信验证码模式 */}
      {formData.taygedoLoginMode === 'captcha' && (
        <>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              手机号 <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required={!editingAccount}
                value={formData.taygedoPhone}
                onChange={(e) => update({ taygedoPhone: e.target.value, taygedoCaptchaSent: false })}
                className="flex-1 px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
                placeholder="塔吉多手机号"
              />
              <button
                type="button"
                disabled={!formData.taygedoPhone || formData.taygedoSendingCaptcha || formData.taygedoCaptchaCooldown > 0}
                onClick={handleSendCaptcha}
                className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  formData.taygedoCaptchaCooldown > 0
                    ? 'bg-muted text-text-quaternary cursor-not-allowed'
                    : formData.taygedoSendingCaptcha
                    ? 'bg-accent/50 text-accent-foreground cursor-wait'
                    : 'bg-accent text-accent-foreground hover:bg-accent-hover'
                }`}
              >
                {formData.taygedoSendingCaptcha
                  ? '发送中...'
                  : formData.taygedoCaptchaCooldown > 0
                  ? `${formData.taygedoCaptchaCooldown}s 后重发`
                  : formData.taygedoCaptchaSent
                  ? '重新发送'
                  : '发送验证码'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              短信验证码 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required={!editingAccount}
              value={formData.taygedoCaptcha}
              onChange={(e) => update({ taygedoCaptcha: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
              placeholder="输入短信验证码"
            />
          </div>
        </>
      )}
    </>
  );
}
