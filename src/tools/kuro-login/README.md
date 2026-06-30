# 库街区 Token 获取工具

基于 [Kuro_login](https://github.com/mxyooR/Kuro_login) 的方法二实现。

## 使用方式

1. 打开 [库街区官网](https://www.kurobbs.com/mc/home/) 并登录
2. 触发短信验证码（**不要点登录**）
3. 调用 `kuroSdkLogin(phone, code)` 获取 token

## API

```typescript
import { kuroSdkLogin } from '@/tools/kuro-login';

const result = await kuroSdkLogin('手机号', '验证码');
// result: { token, userId, devcode, distinctId, roleId, roleName }
```

## Web 界面

访问 `/dashboard/tools/kuro-login` 使用可视化工具。
