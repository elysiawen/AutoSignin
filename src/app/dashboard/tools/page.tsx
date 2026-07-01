'use client';

import { useState } from 'react';
import { Key, Gamepad2, QrCode, Smartphone, Wrench } from 'lucide-react';
import MysLoginModal from '@/components/tools/MysLoginModal';
import KuroLoginModal from '@/components/tools/KuroLoginModal';
import MysQrLoginModal from '@/components/tools/MysQrLoginModal';
import DeviceModal from '@/components/tools/DeviceModal';

const tools = [
  {
    name: '米游社手机号登录',
    description: '通过手机号 + 短信验证码登录米游社，获取 Token',
    icon: Key,
    tags: ['米游社', '登录', 'Token'],
    modal: 'mys-login' as const,
  },
  {
    name: '米游社扫码登录',
    description: '使用米游社 App 扫码登录，获取 Token（无法用于打卡）',
    icon: QrCode,
    tags: ['米游社', '扫码', 'Token'],
    modal: 'mys-qr-login' as const,
  },
  {
    name: '库街区 Token 获取',
    description: '通过手机号 + 验证码获取库街区 Token',
    icon: Gamepad2,
    tags: ['库洛', '鸣潮', 'Token'],
    modal: 'kuro-login' as const,
  },
];

type ModalType = 'mys-login' | 'kuro-login' | 'mys-qr-login' | null;

export default function ToolsPage() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showDevice, setShowDevice] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">工具箱</h1>
          <p className="text-text-tertiary mt-1">实用工具集合</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDevice(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-text-secondary rounded-xl text-sm font-medium hover:bg-muted/80 transition-all"
          >
            <Smartphone className="h-4 w-4" />
            设备信息
          </button>
          <div className="flex items-center gap-2 text-text-quaternary">
            <Wrench className="h-5 w-5" />
            <span className="text-sm">{tools.length} 个工具</span>
          </div>
        </div>
      </div>

      {/* 工具列表 */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, index) => (
          <button
            key={tool.name}
            onClick={() => setActiveModal(tool.modal)}
            className={`group bg-card rounded-2xl border border-border p-5 sm:p-6 hover:shadow-xl hover:border-accent/20 transition-all duration-300 text-left animate-slide-in-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                <tool.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text-primary group-hover:text-accent transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-text-tertiary mt-1 line-clamp-2">
                  {tool.description}
                </p>
                {tool.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-muted text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 工具弹窗 */}
      <MysLoginModal
        open={activeModal === 'mys-login'}
        onClose={() => setActiveModal(null)}
      />
      <KuroLoginModal
        open={activeModal === 'kuro-login'}
        onClose={() => setActiveModal(null)}
      />
      <MysQrLoginModal
        open={activeModal === 'mys-qr-login'}
        onClose={() => setActiveModal(null)}
      />
      <DeviceModal
        open={showDevice}
        onClose={() => setShowDevice(false)}
      />
    </div>
  );
}
