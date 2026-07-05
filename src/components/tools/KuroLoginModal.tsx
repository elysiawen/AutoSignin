'use client';

import { useState } from 'react';
import { Loader2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export interface KuroLoginData {
  token: string;
  userId: string;
  devcode: string;
  distinctId: string;
  roleId: string;
  roleName: string;
}

interface KuroLoginModalProps {
  open: boolean;
  onClose: () => void;
  onFill?: (data: KuroLoginData) => void;
}

export default function KuroLoginModal({ open, onClose, onFill }: KuroLoginModalProps) {
  const toast = useToast();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KuroLoginData | null>(null);

  const handleLogin = async () => {
    if (!mobile || !code) {
      toast.error('请输入手机号和验证码');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/tools/kuro-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
        toast.success('登录成功，Token 已获取');
      } else {
        toast.error(data.error || '登录失败');
      }
    } catch {
      toast.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制`);
  };

  const handleClose = () => {
    setMobile('');
    setCode('');
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="库街区 Token 获取" maxWidth="lg">
      <div className="p-6 space-y-5">
        {/* 步骤说明 */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm font-medium text-text-secondary mb-2">操作步骤</p>
          <ol className="space-y-1.5 text-xs text-text-tertiary">
            <li>1. 打开 <a href="https://www.kurobbs.com/mc/home/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">库街区官网</a> 并打开登录页面</li>
            <li>2. 输入手机号，触发短信验证码（<span className="text-destructive font-medium">不要点登录</span>）</li>
            <li>3. 在下方输入手机号和验证码，点击登录即可</li>
          </ol>
        </div>

        {/* 登录表单 */}
        {!result && (
          <div className="space-y-3">
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
              placeholder="手机号"
              disabled={loading}
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
              placeholder="验证码"
              disabled={loading}
            />
            <button
              onClick={handleLogin}
              disabled={loading || !mobile || !code}
              className="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? '登录中...' : '登录获取 Token'}
            </button>
          </div>
        )}

        {/* 结果展示 */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">登录成功，点击复制各字段</span>
            </div>
            {[
              { label: 'Token', value: result.token },
              { label: '用户 ID', value: result.userId },
              { label: '角色 ID (roleId)', value: result.roleId || '未获取' },
              { label: '角色名 (roleName)', value: result.roleName || '未获取' },
              { label: '设备码 (devcode)', value: result.devcode },
              { label: '唯一标识 (distinctId)', value: result.distinctId },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => copyText(item.value, item.label)}
                className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-tertiary mb-0.5">{item.label}</p>
                  <p className="text-sm text-text-primary font-mono truncate">{item.value}</p>
                </div>
                <Copy className="h-4 w-4 text-text-quaternary shrink-0" />
              </button>
            ))}
            {onFill && (
              <button
                onClick={() => {
                  onFill(result);
                  toast.success('已填入');
                  handleClose();
                }}
                className="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all flex items-center justify-center gap-2"
              >
                一键填入
              </button>
            )}

            {/* 原始数据 */}
            <details className="mt-1">
              <summary className="text-xs text-text-quaternary cursor-pointer hover:text-text-tertiary">
                原始数据
              </summary>
              <div className="relative mt-2">
                <pre className="p-3 bg-background rounded-lg text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono border border-border">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <button
                  onClick={() => copyText(JSON.stringify(result, null, 2), '原始数据')}
                  className="absolute top-2 right-2 p-1.5 bg-muted rounded-md text-text-quaternary hover:text-accent transition-colors"
                  title="复制"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </Modal>
  );
}
