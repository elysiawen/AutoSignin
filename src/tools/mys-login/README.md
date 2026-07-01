# 米游社手机号验证码登录工具

基于 [TeyvatGuide](https://github.com/BTMuli/TeyvatGuide) 的米游社登录功能实现，支持极验验证（GT3/GT4）。

## 使用方式

### 方式一：直接调用函数

```typescript
import { createLoginCaptcha, mysLogin } from '@/tools/mys-login';

// 1. 发送短信验证码
const captchaResult = await createLoginCaptcha('13800138000');

// 如果返回了 geetest，需要用户完成极验验证后重试
if (captchaResult.geetest) {
  // 前端展示极验，用户完成后获取验证结果
  const geetestResult = await showGeetest(captchaResult.geetest);

  // 构造 aigis
  const aigis = `${captchaResult.aigisSession};${btoa(JSON.stringify(geetestResult))}`;

  // 重试
  const retryResult = await createLoginCaptcha('13800138000', aigis);
  // retryResult.actionType 就是最终的 actionType
}

// 2. 用户输入验证码后登录
const result = await mysLogin('13800138000', '123456', captchaResult.actionType!);

// 登录时也可能触发极验
if (result.needGeetest) {
  // 同样需要处理极验验证
  const geetestResult = await showGeetest(result.geetest);
  const aigis = `${result.aigisSession};${btoa(JSON.stringify(geetestResult))}`;
  const retryResult = await mysLogin('13800138000', '123456', actionType, aigis);
}

console.log(result);
// {
//   accountId: 'xxx',
//   mid: 'xxx',
//   stoken: 'xxx',      // 高权限，可用于打卡
//   ltoken: 'xxx',
//   cookieToken: 'xxx',
//   loginTicket: 'xxx',
//   userInfo: { ... }
// }
```

### 方式二：Web 界面

访问 `/dashboard/tools/mys-login` 使用可视化工具（支持极验验证）。

## API

### createLoginCaptcha(phone, aigis?)

发送短信验证码。

**参数：**
- `phone`: 手机号（11位）
- `aigis`: 极验验证数据（可选，用于重试）

**返回：**
- `actionType`: 操作类型（成功时返回）
- `geetest`: 极验数据（需要验证时返回）
- `aigisSession`: 极验会话 ID（需要验证时返回）

### loginByMobileCaptcha(phone, captcha, actionType, aigis?)

使用验证码登录。

**参数：**
- `phone`: 手机号
- `captcha`: 短信验证码
- `actionType`: 操作类型
- `aigis`: 极验验证数据（可选）

**返回：**
- 成功时返回 `stoken`, `accountId`, `mid`, `loginTicket`
- 需要极验时返回 `needGeetest`, `geetest`, `aigisSession`

### getLToken(stoken, mid)

通过 stoken 获取 ltoken。

### getCookieToken(stoken, mid)

通过 stoken 获取 cookie_token。

### mysLogin(phone, captcha, actionType, aigis?)

完整的登录流程（登录 + 获取所有 Token）。

## 极验验证处理

### 前端实现

使用极验官方 JS SDK：
- GT3: `https://static.geetest.com/static/js/gt.0.4.9.js`
- GT4: `https://static.geetest.com/v4/gt4.js`

```tsx
import GeetestVerify, { type GeetestVerifyRef } from '@/components/tools/GeetestVerify';

const gtRef = useRef<GeetestVerifyRef>(null);

// GT3 验证
const result = await gtRef.current.show(gt, challenge);

// GT4 验证
const result = await gtRef.current.showGt4(captchaId, riskType, sessionId);
```

### 完整流程

```
用户输入手机号
       ↓
createLoginCaptcha(phone)
       ↓
       ├──────────────────────────────┐
       │ retcode === 0                │ retcode !== 0
       │ (成功)                       │ (需要极验)
       ↓                              ↓
  返回 actionType              返回 geetest + aigisSession
                                      ↓
                               前端展示极验验证
                                      ↓
                               用户完成验证
                                      ↓
                               构造 aigis 参数
                               aigis = `${session};${btoa(JSON.stringify(gtResult))}`
                                      ↓
                               重试 createLoginCaptcha(phone, aigis)
                                      ↓
                               返回 actionType
       ↓
用户输入验证码
       ↓
mysLogin(phone, code, actionType)
       ↓
       ├──────────────────────────────┐
       │ 成功                          │ 需要极验
       ↓                              ↓
  返回完整 Token                 返回 needGeetest
                                      ↓
                               前端展示极验验证
                                      ↓
                               重试 mysLogin(phone, code, actionType, aigis)
                                      ↓
                               返回完整 Token
```

## 获取的 Token 说明

| Token | 权限 | 用途 |
|-------|------|------|
| `stoken` | 高权限 | 米游社打卡、签到等敏感操作 |
| `ltoken` | 中权限 | 签到、获取用户信息 |
| `cookie_token` | 低权限 | 获取任务列表、状态查询 |
| `loginTicket` | 会话凭证 | 用于刷新 Token |

## 参考

- [TeyvatGuide](https://github.com/BTMuli/TeyvatGuide)
- [极验文档](https://docs.geetest.com/)
