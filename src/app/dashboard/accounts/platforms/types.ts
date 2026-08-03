import type { ReactNode } from 'react';

export interface Account {
  id: string;
  platform: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count: { tasks: number };
  extra?: Record<string, any> | null;
}

/** 表单数据（平台模块各自管理自己的字段） */
export type FormData = Record<string, any>;

/** 平台表单配置 */
export interface PlatformConfig {
  /** 平台标识 */
  id: string;
  /** 平台显示名称 */
  name: string;
  /** 默认表单数据（新建时的初始值） */
  getDefaultFormData: () => FormData;
  /** 编辑时从 account 回填表单数据 */
  fillFormData: (account: Account) => FormData;
  /**
   * 从表单数据构建提交用的 body
   * @returns { cookie?, stoken?, uid?, mid?, extra? }
   */
  buildSubmitData: (formData: FormData, isEditing: boolean) => Record<string, any>;
  /** 渲染平台专属表单字段 */
  renderFields: (props: RenderFieldsProps) => ReactNode;
  /** 渲染可选配置（可选，返回 null 表示没有） */
  renderOptional?: (props: RenderFieldsProps) => ReactNode;
  /** 平台相关的登录弹窗（可选） */
  renderModals?: (props: RenderModalsProps) => ReactNode;
}

export interface RenderFieldsProps {
  formData: FormData;
  setFormData: (updater: FormData | ((prev: FormData) => FormData)) => void;
  editingAccount: Account | null;
  toast: any;
}

export interface RenderModalsProps {
  formData: FormData;
  setFormData: (updater: FormData | ((prev: FormData) => FormData)) => void;
  setShowOptional: (show: boolean) => void;
}
