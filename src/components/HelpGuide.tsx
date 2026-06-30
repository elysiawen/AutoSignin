'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface HelpGuideProps {
  platform: 'MIYOUSHE' | 'HOYOLAB' | 'KUJIEQU' | 'TAYGEDO';
  field: 'cookie' | 'stoken' | 'cloudToken' | 'token';
  onOpenKuroLogin?: () => void;
}

export default function HelpGuide({ platform, field, onOpenKuroLogin }: HelpGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getContent = (): { title: string; steps: string[]; methods?: string[]; links?: { text: string; url: string }[] } => {
    if (platform === 'MIYOUSHE') {
      switch (field) {
        case 'cookie':
          return {
            title: '获取米游社 Cookie',
            steps: [
              '打开浏览器，进入无痕/隐身模式',
              '打开 miyoushe.com 并登录',
              '按 F12 打开开发者工具',
              '点击 Network/网络，在筛选器里粘贴 getUserGameUnreadCount',
              '点击一条捕获到的结果，往下拉找到 Cookie:',
              '复制 Cookie 部分（不包括 "Cookie:" 这几个字）',
            ],
          };
        case 'stoken':
          return {
            title: '获取 Stoken',
            steps: [
              '使用 mihoyo_login 项目获取',
              '或参考 Hutao 文档获取',
              '登录成功后复制 stoken 的值',
            ],
            links: [
              { text: 'mihoyo_login', url: 'https://github.com/Womsxd/mihoyo_login' },
              { text: 'Hutao 文档', url: 'https://hut.ao/zh/advanced/get-stoken-cookie-from-the-third-party.html' },
            ],
          };
        case 'cloudToken':
          return {
            title: '获取云游戏 Token',
            steps: [
              '打开浏览器无痕模式',
              '打开云原神网页版并登录',
              '按 F12 打开开发者工具',
              '在筛选器里输入 wallet/wallet/get',
              '选择 status 为 200 的记录',
              '点击记录，找到 X-Rpc-Combo_token 并复制',
            ],
            links: [
              { text: '云原神网页版', url: 'https://ys.mihoyo.com/cloud/#/' },
            ],
          };
        default:
          return { title: '获取帮助', steps: [] };
      }
    } else if (platform === 'HOYOLAB') {
      return {
        title: '获取 HoYoLAB Cookie',
        steps: [
          '打开浏览器，进入无痕/隐身模式',
          '打开 HoYoLAB 签到页面并登录',
          '按 F12 打开开发者工具',
          '在控制台输入：document.cookie',
          '从 ltoken=... 开始复制到结尾',
        ],
        links: [
          { text: 'HoYoLAB 签到页面', url: 'https://act.hoyolab.com/bbs/event/signin/hkrpg/index.html?act_id=e202303301540311' },
        ],
      };
    } else if (platform === 'TAYGEDO') {
      return {
        title: '获取塔吉多 Token',
        methods: [
          '▸ 方法一：使用 Taygedo_login 项目获取（推荐）',
          '▸ 方法二：配置手机号+密码自动登录（可选）',
        ],
        steps: [
          '使用 Taygedo_login 项目获取 accessToken 和 refreshToken',
          '将 refreshToken 填入上方必填字段',
          'accessToken 可选填入（留空会自动获取）',
          '如需云异环签到，还需填入老虎 Token/User ID',
          '如需自动重新登录，可在可选配置中填入手机号+密码',
        ],
        links: [
          { text: '塔吉多官网', url: 'https://www.tajiduo.com/' },
        ],
      };
    } else {
      // KUJIEQU
      return {
        title: '获取库街区 Token',
        methods: [
          '▸ 方法一：使用内置登录工具（推荐）',
          '▸ 方法二：手机抓包获取',
        ],
        steps: [],
        links: [
          { text: 'Kuro_login（GitHub）', url: 'https://github.com/mxyooR/Kuro_login' },
          { text: '库街区官网', url: 'https://www.kurobbs.com/' },
        ],
      };
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        如何获取？
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border text-xs">
          <p className="font-medium text-text-secondary mb-2">{content.title}</p>
          {content.methods && content.methods.length > 0 && (
            <div className="space-y-1 text-text-tertiary mb-2">
              {content.methods.map((method, i) => (
                <p key={i}>{method}</p>
              ))}
            </div>
          )}
          <ol className="space-y-1 text-text-tertiary list-decimal list-inside">
            {content.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {/* 库街区内置登录工具按钮 */}
          {platform === 'KUJIEQU' && field === 'token' && onOpenKuroLogin && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onOpenKuroLogin}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                打开登录工具
              </button>
            </div>
          )}
          {content.links && content.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {content.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  {link.text}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
