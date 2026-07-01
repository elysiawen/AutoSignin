/**
 * 森空岛签名和设备ID生成
 * 严格对齐 skland-kit@0.3.5 源码实现
 * 使用 mima-kit 纯 JS 密码学库，不依赖 OpenSSL
 */

import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import axios from 'axios';
import * as mima from 'mima-kit';
import { createLogger } from '@/lib/logger';

const log = createLogger('森空岛签名');

// ==================== 常量（与 skland-kit 完全一致） ====================

const SERVER_TIMESTAMP_OFFSET = 2 * 1e3;

const SHUMEI_CONFIG = {
  organization: 'UWXspnCCJN4sfYlNfqps',
  appId: 'default',
  publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmxMNr7n8ZeT0tE1R9j/mPixoinPkeM+k4VGIn/s0k7N5rJAfnZ0eMER+QhwFvshzo0LNmeUkpR8uIlU/GEVr8mN28sKmwd2gpygqj0ePnBmOW4v0ZVwbSYK+izkhVFk2V/doLoMbWy6b+UnA8mkjvg0iYWRByfRsK2gdl7llqCwIDAQAB',
  protocol: 'https',
  apiHost: 'fp-it.portal101.cn',
  apiPath: '/deviceprofile/v4',
};

const DEVICE_INFO_URL = `${SHUMEI_CONFIG.protocol}://${SHUMEI_CONFIG.apiHost}${SHUMEI_CONFIG.apiPath}`;

const DES_RULE: Record<string, { cipher?: string; is_encrypt: number; key?: string; obfuscated_name: string }> = {
  appId: { cipher: 'DES', is_encrypt: 1, key: 'uy7mzc4h', obfuscated_name: 'xx' },
  box: { is_encrypt: 0, obfuscated_name: 'jf' },
  canvas: { cipher: 'DES', is_encrypt: 1, key: 'snrn887t', obfuscated_name: 'yk' },
  clientSize: { cipher: 'DES', is_encrypt: 1, key: 'cpmjjgsu', obfuscated_name: 'zx' },
  organization: { cipher: 'DES', is_encrypt: 1, key: '78moqjfc', obfuscated_name: 'dp' },
  os: { cipher: 'DES', is_encrypt: 1, key: 'je6vk6t4', obfuscated_name: 'pj' },
  platform: { cipher: 'DES', is_encrypt: 1, key: 'pakxhcd2', obfuscated_name: 'gm' },
  plugins: { cipher: 'DES', is_encrypt: 1, key: 'v51m3pzl', obfuscated_name: 'kq' },
  pmf: { cipher: 'DES', is_encrypt: 1, key: '2mdeslu3', obfuscated_name: 'vw' },
  protocol: { is_encrypt: 0, obfuscated_name: 'protocol' },
  referer: { cipher: 'DES', is_encrypt: 1, key: 'y7bmrjlc', obfuscated_name: 'ab' },
  res: { cipher: 'DES', is_encrypt: 1, key: 'whxqm2a7', obfuscated_name: 'hf' },
  rtype: { cipher: 'DES', is_encrypt: 1, key: 'x8o2h2bl', obfuscated_name: 'lo' },
  sdkver: { cipher: 'DES', is_encrypt: 1, key: '9q3dcxp2', obfuscated_name: 'sc' },
  status: { cipher: 'DES', is_encrypt: 1, key: '2jbrxxw4', obfuscated_name: 'an' },
  subVersion: { cipher: 'DES', is_encrypt: 1, key: 'eo3i2puh', obfuscated_name: 'ns' },
  svm: { cipher: 'DES', is_encrypt: 1, key: 'fzj3kaeh', obfuscated_name: 'qr' },
  time: { cipher: 'DES', is_encrypt: 1, key: 'q2t3odsk', obfuscated_name: 'nb' },
  timezone: { cipher: 'DES', is_encrypt: 1, key: '1uv05lj5', obfuscated_name: 'as' },
  tn: { cipher: 'DES', is_encrypt: 1, key: 'x9nzj1bp', obfuscated_name: 'py' },
  trees: { cipher: 'DES', is_encrypt: 1, key: 'acfs0xo4', obfuscated_name: 'pi' },
  ua: { cipher: 'DES', is_encrypt: 1, key: 'k92crp1t', obfuscated_name: 'bj' },
  url: { cipher: 'DES', is_encrypt: 1, key: 'y95hjkoo', obfuscated_name: 'cf' },
  version: { is_encrypt: 0, obfuscated_name: 'version' },
  vpw: { cipher: 'DES', is_encrypt: 1, key: 'r9924ab5', obfuscated_name: 'ca' },
};

const BROWSER_ENV = {
  plugins: 'MicrosoftEdgePDFPluginPortableDocumentFormatinternal-pdf-viewer1,MicrosoftEdgePDFViewermhjfbmdgcfjbbpaeojofohoefgiehjai1',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  canvas: '259ffe69',
  timezone: -480,
  platform: 'Win32',
  url: 'https://www.skland.com/',
  referer: '',
  res: '1920_1080_24_1.25',
  clientSize: '0_0_1080_1920_1920_1080_1920_1080',
  status: '0011',
};

// ==================== 基础加密工具（mima-kit 实现，与 skland-kit 完全对齐） ====================

function md5(data: string): string {
  return mima.md5(mima.UTF8(String(data))).to(mima.HEX);
}

function hmacSha256(key: string, data: string): string {
  return mima.hmac(mima.sha256)(mima.UTF8(String(key)), mima.UTF8(data)).to(mima.HEX);
}

// AES CBC 加密
async function encryptAES(message: string, key: string): Promise<string> {
  const iv = Buffer.from('0102030405060708', 'utf8');
  const data = Buffer.from(message, 'utf8');
  const keyBuf = Buffer.from(key, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return encrypted.toString('hex');
}

// DES 加密（与 skland-kit 完全一致：mima-kit t_des(64) + ecb + NO_PAD + padData 填充 \0）
function padData(data: string): string {
  const blockSize = 8;
  const padLength = blockSize - (data.length % blockSize);
  return data + '\0'.repeat(padLength === blockSize ? 0 : padLength);
}

const TripleDES = mima.t_des(64);

function encryptDES(message: string, key: string): string {
  const inputStr = padData(String(message));
  return mima.ecb(TripleDES, mima.NO_PAD)(mima.UTF8(key)).encrypt(mima.UTF8(inputStr)).to(mima.B64);
}

// 按 DES_RULE 加密对象字段
function encryptObjectByDESRules(
  object: Record<string, any>,
  rules: typeof DES_RULE,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const i in object) {
    if (i in rules) {
      const rule = rules[i];
      if (rule.is_encrypt === 1 && rule.key) {
        result[rule.obfuscated_name] = encryptDES(String(object[i]), rule.key);
      } else {
        result[rule.obfuscated_name] = String(object[i]);
      }
    } else {
      result[i] = String(object[i]);
    }
  }
  return result;
}

// GZIP 压缩 + base64（对齐浏览器 CompressionStream 行为）
const gzipAsync = promisify(zlib.gzip);

async function gzipObject(o: Record<string, string>): Promise<string> {
  const JSON_COLON_RE = /":"/g;
  const JSON_COMMA_RE = /","/g;
  const stringify = (obj: Record<string, string>) =>
    JSON.stringify(obj).replace(JSON_COLON_RE, '": "').replace(JSON_COMMA_RE, '", "');

  const encoded = Buffer.from(stringify(o), 'utf8');
  const compressed = await gzipAsync(encoded, { level: zlib.constants.Z_DEFAULT_COMPRESSION });
  // 对齐参考实现：修改 gzip header byte[9] = 19
  const arr = Buffer.from(compressed);
  arr[9] = 19;
  return arr.toString('base64');
}

// RSA 加密（与 skland-kit 完全一致：Web Crypto 解析 PEM + mima-kit 加密）
async function extractJWKFromPEM(publicKeyPEM: string): Promise<{ n: bigint; e: bigint }> {
  const pemContents = publicKeyPEM
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  const binaryDer = Buffer.from(pemContents, 'base64');
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', cryptoKey);
  return {
    n: base64URLToBigInt(jwk.n!),
    e: base64URLToBigInt(jwk.e!),
  };
}

function base64URLToBigInt(base64url: string): bigint {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binaryStr = Buffer.from(base64, 'base64');
  let result = BigInt(0);
  for (let i = 0; i < binaryStr.length; i++) {
    result = (result << BigInt(8)) | BigInt(binaryStr[i]);
  }
  return result;
}

async function encryptRSA(message: string, publicKey: string): Promise<string> {
  const { n, e } = await extractJWKFromPEM(publicKey);
  const key = mima.rsa({ n, e });
  return mima.pkcs1_es_1_5(key).encrypt(mima.UTF8(message)).to(mima.B64);
}

// smid 生成
function getSmId(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const v = `${dateStr}${md5(crypto.randomUUID())}00`;
  return `${v}${md5(`smsk_web_${v}`).substring(0, 14)}0`;
}

// tn 计算
function getTn(o: Record<string, any>): string {
  const sortedKeys = Object.keys(o).sort();
  const resultList: string[] = [];
  for (const key of sortedKeys) {
    let v = o[key];
    if (typeof v === 'number') {
      v = String(v * 1e4);
    } else if (typeof v === 'object' && v !== null) {
      v = getTn(v);
    }
    resultList.push(String(v));
  }
  return resultList.join('');
}

// ==================== 设备ID生成 ====================

let cachedDid: string | null = null;

/**
 * 通过数美反欺诈服务获取设备ID（与 skland-kit 完全对齐）
 */
export async function getDid(): Promise<string> {
  if (cachedDid) return cachedDid;

  const uid = crypto.randomUUID();
  const priId = md5(uid).substring(0, 16);
  const ep = await encryptRSA(uid, SHUMEI_CONFIG.publicKey);

  const desTarget: Record<string, any> = {
    ...BROWSER_ENV,
    vpw: crypto.randomUUID(),
    svm: Date.now(),
    trees: crypto.randomUUID(),
    pmf: Date.now(),
    protocol: 102,
    organization: SHUMEI_CONFIG.organization,
    appId: SHUMEI_CONFIG.appId,
    os: 'web',
    version: '3.0.0',
    sdkver: '3.0.0',
    box: '',
    rtype: 'all',
    smid: getSmId(),
    subVersion: '1.0.0',
    time: 0,
  };
  desTarget.tn = md5(getTn(desTarget));

  const body = {
    appId: 'default',
    compress: 2,
    data: await encryptAES(await gzipObject(encryptObjectByDESRules(desTarget, DES_RULE)), priId),
    encode: 5,
    ep,
    organization: SHUMEI_CONFIG.organization,
    os: 'web',
  };

  try {
    const resp = await axios.post(DEVICE_INFO_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (resp.data.code === 1100) {
      const did = `B${resp.data.detail.deviceId}`;
      cachedDid = did;
      return did;
    }
    log.warn('数美返回异常，使用降级方案', { code: resp.data.code });
    return generateFallbackDid();
  } catch (error: any) {
    log.warn('数美请求失败，使用降级方案', { error: error.message });
    return generateFallbackDid();
  }
}

function generateFallbackDid(): string {
  const random = crypto.randomBytes(16).toString('hex').toUpperCase();
  return 'B' + random;
}

// ==================== 请求签名 ====================

export interface SignedHeaders {
  sign: string;
  timestamp: string;
  dId: string;
  headers: Record<string, string>;
}

/**
 * 为森空岛 API 请求生成签名（与 skland-kit signRequest 对齐）
 */
export async function signRequest(
  token: string,
  url: string,
  body: Record<string, any> | undefined,
  dId: string,
): Promise<SignedHeaders> {
  const parsed = new URL(url);
  const pathname = parsed.pathname;
  const query = parsed.search ? parsed.search.substring(1) : '';
  const timestamp = (Date.now() - SERVER_TIMESTAMP_OFFSET).toString().slice(0, -3);

  const signatureHeaders = {
    platform: '3',
    timestamp,
    dId,
    vName: '1.0.0',
  };

  const str = `${pathname}${query}${body ? JSON.stringify(body) : ''}${timestamp}${JSON.stringify(signatureHeaders)}`;
  const sign = md5(hmacSha256(token, str));

  return {
    sign,
    timestamp,
    dId,
    headers: {
      sign,
      platform: '3',
      timestamp,
      dId,
      vName: '1.0.0',
    },
  };
}

/**
 * 构建完整的请求头（包含签名和标准头，与 skland-kit 完全对齐）
 */
export async function buildSignedHeaders(
  token: string,
  url: string,
  body: Record<string, any> | undefined,
  dId: string,
  cred?: string,
): Promise<Record<string, string>> {
  const signed = await signRequest(token, url, body, dId);

  return {
    'user-agent': 'Mozilla/5.0 (Linux; Android 12; SM-A5560 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36; SKLand/1.52.1',
    'accept-encoding': 'gzip',
    'connection': 'close',
    'x-requested-with': 'com.hypergryph.skland',
    'platform': signed.headers.platform,
    'timestamp': signed.headers.timestamp,
    'dId': signed.headers.dId,
    'vName': signed.headers.vName,
    'sign': signed.sign,
    ...(cred ? { 'cred': cred } : {}),
    'Content-Type': 'application/json',
  };
}
