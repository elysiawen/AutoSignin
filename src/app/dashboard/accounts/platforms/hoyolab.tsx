import type { PlatformConfig } from './types';
import HelpGuide from '@/components/HelpGuide';

export const hoyolabPlatform: PlatformConfig = {
  id: 'HOYOLAB',
  name: 'HoYoLAB（国际服）',

  getDefaultFormData: () => ({
    cookie: '',
    uid: '',
  }),

  fillFormData: () => ({
    cookie: '',
    uid: '',
  }),

  buildSubmitData: (formData, _isEditing) => {
    const data: Record<string, any> = {};
    if (formData.cookie) data.cookie = formData.cookie;
    if (formData.uid) data.uid = formData.uid;
    return data;
  },

  renderFields: ({ formData, setFormData, editingAccount }) => (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">Cookie</label>
      <textarea
        value={formData.cookie}
        onChange={(e) => setFormData({ ...formData, cookie: e.target.value })}
        rows={3}
        className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all text-text-primary placeholder:text-text-quaternary resize-none"
        placeholder={editingAccount ? '已设置（出于安全考虑不显示，留空则不修改）' : '粘贴从浏览器获取的 HoYoLAB Cookie'}
      />
      <HelpGuide platform="HOYOLAB" field="cookie" />
    </div>
  ),
};
