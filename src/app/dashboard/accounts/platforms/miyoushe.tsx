import type { PlatformConfig, FormData, RenderFieldsProps } from './types';
import HelpGuide from '@/components/HelpGuide';
import MysLoginModal from '@/components/tools/MysLoginModal';
import MysQrLoginModal from '@/components/tools/MysQrLoginModal';
import { useState } from 'react';

export const miyoushePlatform: PlatformConfig = {
  id: 'MIYOUSHE',
  name: '米游社（国服）',

  getDefaultFormData: () => ({
    cookie: '',
    stoken: '',
    uid: '',
    mid: '',
    cloudGenshinToken: '',
    cloudZzzToken: '',
  }),

  fillFormData: (account) => {
    const extra = account.extra || {};
    return {
      cookie: '',
      stoken: '',
      uid: '',
      mid: '',
      cloudGenshinToken: extra.cloud_genshin_token || '',
      cloudZzzToken: extra.cloud_zzz_token || '',
    };
  },

  buildSubmitData: (formData, _isEditing) => {
    const data: Record<string, any> = {};
    if (formData.cookie) data.cookie = formData.cookie;
    if (formData.stoken) data.stoken = formData.stoken;
    if (formData.uid) data.uid = formData.uid;
    if (formData.mid) data.mid = formData.mid;
    const extra: Record<string, any> = {};
    if (formData.cloudGenshinToken) extra.cloud_genshin_token = formData.cloudGenshinToken;
    if (formData.cloudZzzToken) extra.cloud_zzz_token = formData.cloudZzzToken;
    if (Object.keys(extra).length > 0) data.extra = extra;
    return data;
  },

  renderFields: (props) => <MiyousheFields {...props} />,

  renderOptional: ({ formData, setFormData, editingAccount }) => (
    <>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Stoken</label>
        <input
          type="text"
          value={formData.stoken}
          onChange={(e) => setFormData({ ...formData, stoken: e.target.value })}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
          placeholder={editingAccount ? '留空则不修改' : '用于米游社任务（看帖/点赞/分享）'}
        />
        <HelpGuide platform="MIYOUSHE" field="stoken" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">云原神 Token</label>
        <input
          type="text"
          value={formData.cloudGenshinToken}
          onChange={(e) => setFormData({ ...formData, cloudGenshinToken: e.target.value })}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
          placeholder="用于云原神签到（combo_token）"
        />
        <HelpGuide platform="MIYOUSHE" field="cloudGenshinToken" />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">云绝区零 Token</label>
        <input
          type="text"
          value={formData.cloudZzzToken}
          onChange={(e) => setFormData({ ...formData, cloudZzzToken: e.target.value })}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
          placeholder="用于云绝区零签到（combo_token，需手机抓包）"
        />
        <HelpGuide platform="MIYOUSHE" field="cloudZzzToken" />
      </div>
    </>
  ),
};

/** 米游社专属字段组件（含登录弹窗 hooks） */
function MiyousheFields({ formData, setFormData, editingAccount }: RenderFieldsProps) {
  const [showMysLoginModal, setShowMysLoginModal] = useState(false);
  const [showMysQrLoginModal, setShowMysQrLoginModal] = useState(false);

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Cookie</label>
        <textarea
          value={formData.cookie}
          onChange={(e) => setFormData({ ...formData, cookie: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
          placeholder={editingAccount ? '已设置（出于安全考虑不显示，留空则不修改）' : '粘贴从浏览器获取的 Cookie'}
        />
        <HelpGuide
          platform="MIYOUSHE"
          field="cookie"
          onOpenMysLogin={() => setShowMysLoginModal(true)}
          onOpenMysQrLogin={() => setShowMysQrLoginModal(true)}
        />
      </div>
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
    </>
  );
}
