import type { PlatformConfig, FormData, RenderFieldsProps } from './types';
import HelpGuide from '@/components/HelpGuide';
import KuroLoginModal from '@/components/tools/KuroLoginModal';
import { useState } from 'react';

export const kujiequPlatform: PlatformConfig = {
  id: 'KUJIEQU',
  name: '库街区',

  getDefaultFormData: () => ({
    kuroToken: '',
    devcode: '',
    distinctId: '',
    kuroUserId: '',
    wwroleId: '',
    pgrRoleId: '',
  }),

  fillFormData: (account) => {
    const extra = account.extra || {};
    return {
      kuroToken: '',
      devcode: extra.devcode || '',
      distinctId: extra.distinct_id || '',
      kuroUserId: extra.kuroUserId || '',
      wwroleId: extra.wwroleId || '',
      pgrRoleId: extra.pgrRoleId || '',
    };
  },

  buildSubmitData: (formData, _isEditing) => {
    const data: Record<string, any> = {};
    if (formData.kuroToken) data.cookie = formData.kuroToken;
    const extra: Record<string, any> = {};
    if (formData.devcode) extra.devcode = formData.devcode;
    if (formData.distinctId) extra.distinct_id = formData.distinctId;
    if (formData.kuroUserId) extra.kuroUserId = formData.kuroUserId;
    if (formData.wwroleId) extra.wwroleId = formData.wwroleId;
    if (formData.pgrRoleId) extra.pgrRoleId = formData.pgrRoleId;
    if (Object.keys(extra).length > 0) data.extra = extra;
    return data;
  },

  renderFields: (props) => <KujiequFields {...props} />,

  renderOptional: ({ formData, setFormData }) => (
    <>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">用户 ID</label>
        <input
          type="text"
          value={formData.kuroUserId}
          onChange={(e) => setFormData({ ...formData, kuroUserId: e.target.value })}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
          placeholder={formData.kuroUserId ? '' : '留空自动获取'}
        />
        {formData.kuroUserId && <p className="text-xs text-success mt-1">✓ 已获取</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">鸣潮角色 ID</label>
        <input
          type="text"
          value={formData.wwroleId}
          onChange={(e) => setFormData({ ...formData, wwroleId: e.target.value })}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
          placeholder={formData.wwroleId ? '' : '留空自动获取'}
        />
        {formData.wwroleId && <p className="text-xs text-success mt-1">✓ 已获取</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">战双角色 ID</label>
        <input
          type="text"
          value={formData.pgrRoleId}
          onChange={(e) => setFormData({ ...formData, pgrRoleId: e.target.value })}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary"
          placeholder={formData.pgrRoleId ? '' : '留空自动获取'}
        />
        {formData.pgrRoleId && <p className="text-xs text-success mt-1">✓ 已获取</p>}
      </div>
    </>
  ),
};

/** 库街区专属字段组件（含登录弹窗 hooks） */
function KujiequFields({ formData, setFormData, editingAccount }: RenderFieldsProps) {
  const [showKuroModal, setShowKuroModal] = useState(false);

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Token</label>
        <textarea
          required={!editingAccount}
          value={formData.kuroToken}
          onChange={(e) => setFormData({ ...formData, kuroToken: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
          placeholder={editingAccount ? '已设置（出于安全考虑不显示，留空则不修改）' : '库街区 Token（通过登录工具获取）'}
        />
        <HelpGuide platform="KUJIEQU" field="token" onOpenKuroLogin={() => setShowKuroModal(true)} />
      </div>
      <KuroLoginModal
        open={showKuroModal}
        onClose={() => setShowKuroModal(false)}
        onFill={(data) => {
          setFormData((prev: FormData) => ({
            ...prev,
            kuroToken: data.token,
            kuroUserId: data.userId,
            devcode: data.devcode,
            distinctId: data.distinctId,
            wwroleId: data.roleId || '',
          }));
        }}
      />
    </>
  );
}
