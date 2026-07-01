'use client';

import { useState, useEffect } from 'react';
import { Loader2, Copy, Trash2, Smartphone } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

interface DeviceEntry {
  id: string;
  platform: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface DeviceModalProps {
  open: boolean;
  onClose: () => void;
}

const platformLabels: Record<string, string> = {
  MIYOUSHE: '米游社',
  HOYOLAB: 'HoYoLAB',
  KUJIEQU: '库街区',
  TAYGEDO: '塔吉多',
  SKLAND: '森空岛',
  YIHUAN: '异环',
};

// 各平台 config 中要展示的字段及中文标签
const platformFields: Record<string, { key: string; label: string }[]> = {
  MIYOUSHE: [
    { key: 'device_id', label: '设备 ID' },
    { key: 'product', label: '产品名' },
    { key: 'device_name', label: '设备名' },
    { key: 'seed_id', label: '种子 ID' },
    { key: 'seed_time', label: '种子时间' },
    { key: 'device_fp', label: '设备指纹' },
  ],
  HOYOLAB: [
    { key: 'device_id', label: '设备 ID' },
    { key: 'product', label: '产品名' },
    { key: 'device_name', label: '设备名' },
    { key: 'seed_id', label: '种子 ID' },
    { key: 'seed_time', label: '种子时间' },
    { key: 'device_fp', label: '设备指纹' },
  ],
  KUJIEQU: [
    { key: 'devcode', label: '设备码' },
    { key: 'distinct_id', label: 'Distinct ID' },
  ],
  TAYGEDO: [
    { key: 'deviceId', label: '设备 ID' },
    { key: 'openudid', label: 'OpenUDID' },
    { key: 'vendorid', label: 'Vendor ID' },
  ],
  SKLAND: [
    { key: 'deviceId', label: '设备 ID' },
  ],
};

export default function DeviceModal({ open, onClose }: DeviceModalProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tools/device');
      const data = await res.json();
      if (res.ok) {
        setDevices(data.devices || []);
      } else {
        toast.error(data.error || '获取设备信息失败');
      }
    } catch {
      toast.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDevices();
    }
    return () => {
      setDevices([]);
    };
  }, [open]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制`);
  };

  const handleDelete = async (id: string, platform: string) => {
    const confirmed = await confirm(`确定要删除「${platformLabels[platform] || platform}」的设备信息吗？下次使用相关工具时会自动生成新的。`, { confirmColor: 'red', confirmText: '删除' });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tools/device?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setDevices((prev) => prev.filter((d) => d.id !== id));
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch {
      toast.error('请求失败');
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = await confirm('确定要删除所有设备信息吗？下次使用相关工具时会自动重新生成。', { confirmColor: 'red', confirmText: '全部删除' });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/tools/device', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setDevices([]);
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch {
      toast.error('请求失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <Modal open={open} onClose={onClose} title="模拟设备信息" maxWidth="lg">
      <div className="p-6 space-y-5">
        {/* 说明 */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm font-medium text-text-secondary mb-1">关于设备信息</p>
          <p className="text-xs text-text-tertiary">
            每个平台拥有独立的模拟设备身份，首次使用时自动生成并持久化存储，重启后不变。
            删除后下次使用相关工具时会重新生成。
          </p>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-accent animate-spin" />
          </div>
        )}

        {/* 无设备信息 */}
        {!loading && devices.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Smartphone className="h-12 w-12 text-text-quaternary" />
            <p className="text-sm text-text-tertiary">暂无设备信息</p>
            <p className="text-xs text-text-quaternary">使用登录工具后自动生成</p>
          </div>
        )}

        {/* 设备列表 */}
        {!loading && devices.map((device) => {
          const fields = platformFields[device.platform] || Object.keys(device.config).map((k) => ({ key: k, label: k }));

          return (
            <div key={device.id} className="border border-border rounded-xl p-4 space-y-3">
              {/* 平台标题 */}
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-accent/10 text-accent">
                  {platformLabels[device.platform] || device.platform}
                </span>
                <button
                  onClick={() => handleDelete(device.id, device.platform)}
                  className="p-1.5 text-text-quaternary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* 设备字段 */}
              <div className="space-y-1.5">
                {fields.map((item) => {
                  const value = device.config[item.key];
                  if (value === undefined || value === null) return null;
                  return (
                    <button
                      key={item.key}
                      onClick={() => copyText(String(value), item.label)}
                      className="w-full flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-text-quaternary mb-0.5">{item.label}</p>
                        <p className="text-xs text-text-primary font-mono truncate">{String(value)}</p>
                      </div>
                      <Copy className="h-3.5 w-3.5 text-text-quaternary shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* 时间 */}
              <div className="flex gap-4 text-[10px] text-text-quaternary">
                <span>创建: {formatDate(device.createdAt)}</span>
                <span>更新: {formatDate(device.updatedAt)}</span>
              </div>
            </div>
          );
        })}

        {/* 批量操作 */}
        {!loading && devices.length > 1 && (
          <button
            onClick={handleDeleteAll}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-destructive/10 text-destructive rounded-xl font-medium text-sm hover:bg-destructive/20 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            删除全部设备信息
          </button>
        )}
      </div>
    </Modal>
  );
}
