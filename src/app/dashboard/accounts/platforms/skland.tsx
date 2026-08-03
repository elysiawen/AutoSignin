import type { PlatformConfig } from './types';
import HelpGuide from '@/components/HelpGuide';

export const sklandPlatform: PlatformConfig = {
  id: 'SKLAND',
  name: '森空岛',

  getDefaultFormData: () => ({
    cookie: '',
  }),

  fillFormData: () => ({
    cookie: '',
  }),

  buildSubmitData: (formData, _isEditing) => {
    const data: Record<string, any> = {};
    if (formData.cookie) data.cookie = formData.cookie;
    return data;
  },

  renderFields: ({ formData, setFormData, editingAccount }) => (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">鹰角 OAuth Token</label>
      <textarea
        value={formData.cookie}
        onChange={(e) => setFormData({ ...formData, cookie: e.target.value })}
        rows={2}
        className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
        placeholder={editingAccount ? '已设置（出于安全考虑不显示，留空则不修改）' : '粘贴鹰角 OAuth Token（从 web-api.skland.com/account/info/hg 获取 content 字段）'}
      />
      <HelpGuide platform="SKLAND" field="token" />
    </div>
  ),
};
