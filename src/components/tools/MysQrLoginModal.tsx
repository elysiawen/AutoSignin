'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Copy, CheckCircle2, RefreshCw, QrCode } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export interface QrLoginData {
  accountId: string;
  mid: string;
  stoken: string;
  ltoken: string;
  cookieToken: string;
  userInfo: {
    accountName: string;
    email: string;
    mobile: string;
  };
}

interface QrLoginModalProps {
  open: boolean;
  onClose: () => void;
  onFill?: (data: QrLoginData) => void;
}

type QrStatus = 'loading' | 'ready' | 'scanned' | 'confirmed' | 'expired' | 'error';

export default function QrLoginModal({ open, onClose, onFill }: QrLoginModalProps) {
  const toast = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const qrStatusRef = useRef<QrStatus>('loading');

  const [qrUrl, setQrUrl] = useState('');
  const [ticket, setTicket] = useState('');
  const [qrStatus, setQrStatus] = useState<QrStatus>('loading');
  const [result, setResult] = useState<QrLoginData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 创建二维码
  const createQr = useCallback(async () => {
    setQrStatus('loading');
    setQrUrl('');
    setTicket('');
    setResult(null);
    setErrorMsg('');

    try {
      const response = await fetch('/api/tools/mys-qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQrUrl(data.url);
        setTicket(data.ticket);
        setQrStatus('ready');
      } else {
        setQrStatus('error');
        setErrorMsg(data.error || '创建二维码失败');
      }
    } catch {
      setQrStatus('error');
      setErrorMsg('网络请求失败');
    }
  }, []);

  // 轮询查询登录状态（始终通过 ref 调用，避免闭包捕获旧 ticket）
  const pollStatus = useCallback(async (currentTicket: string) => {
    if (!currentTicket) return;

    // 已确认或已过期，不再发请求
    if (qrStatusRef.current === 'confirmed' || qrStatusRef.current === 'expired') return;

    try {
      const response = await fetch('/api/tools/mys-qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', ticket: currentTicket }),
      });

      const data = await response.json();

      if (!response.ok) {
        // -106 表示二维码过期
        if (data.retcode === -106) {
          setQrStatus('expired');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
        return;
      }

      if (data.status === 'Scanned') {
        setQrStatus('scanned');
      } else if (data.status === 'Confirmed') {
        setQrStatus('confirmed');
        setResult(data as QrLoginData);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        toast.success('扫码登录成功');
      } else if (data.status === 'Consumed') {
        // ticket 已消费但未拿到数据，视为过期
        setQrStatus('expired');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch {
      // 网络错误不停止轮询
    }
  }, [toast]);

  // 同步 qrStatus 到 ref，供轮询回调读取最新值
  useEffect(() => {
    qrStatusRef.current = qrStatus;
  }, [qrStatus]);

  // 打开弹窗时创建二维码
  useEffect(() => {
    if (open) {
      createQr();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, createQr]);

  // ticket 更新后同步到 ref，保证 setInterval 回调能读到最新值
  useEffect(() => {
    pollRef.current = () => pollStatus(ticket);
  }, [ticket, pollStatus]);

  // ticket 就绪后开始轮询（不依赖 qrStatus，避免状态变化时清除 interval 导致轮询中断）
  // pollStatus 内部通过 qrStatusRef 判断终止状态后自行停止
  useEffect(() => {
    if (ticket) {
      timerRef.current = setInterval(() => pollRef.current(), 1500);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ticket]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制`);
  };

  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setQrUrl('');
    setTicket('');
    setQrStatus('loading');
    setResult(null);
    setErrorMsg('');
    onClose();
  };

  const handleFill = () => {
    if (result && onFill) {
      onFill(result);
      toast.success('已填入');
      handleClose();
    }
  };

  const statusHint = {
    loading: '正在生成二维码...',
    ready: '请使用米游社 App 扫描二维码',
    scanned: '已扫码，请在手机上确认登录',
    confirmed: '登录成功',
    expired: '二维码已过期，请刷新',
    error: errorMsg || '发生错误',
  };

  return (
    <Modal open={open} onClose={handleClose} title="米游社扫码登录" maxWidth="lg">
      <div className="p-6 space-y-5">
        {/* 提示信息 */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm font-medium text-text-secondary mb-2">操作步骤</p>
          <ol className="space-y-1.5 text-xs text-text-tertiary">
            <li>1. 打开米游社 App</li>
            <li>2. 点击右上角扫一扫，扫描下方二维码</li>
            <li>3. 在手机上确认登录</li>
          </ol>
          <p className="mt-2 text-xs text-destructive">
            注意：扫码登录获取的 stoken 无法用于米社打卡
          </p>
        </div>

        {/* 二维码区域 */}
        {!result && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-64 h-64 flex items-center justify-center bg-white rounded-xl border border-border">
              {qrStatus === 'loading' && (
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
              )}
              {(qrStatus === 'ready' || qrStatus === 'scanned') && qrUrl && (
                <QRCodeSVG
                  value={qrUrl}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                  level="M"
                />
              )}
              {qrStatus === 'expired' && (
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-12 w-12 text-text-quaternary" />
                  <span className="text-xs text-text-quaternary">已过期</span>
                </div>
              )}
              {qrStatus === 'error' && (
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-12 w-12 text-destructive" />
                  <span className="text-xs text-destructive">{errorMsg}</span>
                </div>
              )}
              {/* 扫码中遮罩 */}
              {qrStatus === 'scanned' && (
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-text-primary">已扫码</span>
                  </div>
                </div>
              )}
            </div>

            {/* 状态文字 */}
            <div className="flex items-center gap-2">
              {qrStatus === 'ready' && (
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              )}
              {qrStatus === 'scanned' && (
                <div className="h-2 w-2 rounded-full bg-success" />
              )}
              <p className={`text-sm ${
                qrStatus === 'expired' || qrStatus === 'error'
                  ? 'text-destructive'
                  : qrStatus === 'scanned'
                    ? 'text-success'
                    : 'text-text-secondary'
              }`}>
                {statusHint[qrStatus]}
              </p>
            </div>

            {/* 刷新按钮 */}
            {(qrStatus === 'expired' || qrStatus === 'error') && (
              <button
                onClick={createQr}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                刷新二维码
              </button>
            )}
          </div>
        )}

        {/* 结果展示 */}
        {qrStatus === 'confirmed' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">扫码登录成功，点击复制各字段</span>
            </div>
            {[
              { label: 'Token', value: result.stoken },
              { label: '用户 ID', value: result.accountId },
              { label: 'MID', value: result.mid },
              { label: 'LToken', value: result.ltoken },
              { label: 'Cookie Token', value: result.cookieToken },
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
                onClick={handleFill}
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
