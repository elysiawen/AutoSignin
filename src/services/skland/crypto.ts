/**
 * 森空岛签名和设备ID生成
 * 严格对齐 skland-kit@0.3.5 源码实现
 */

import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import axios from 'axios';
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

// ==================== 基础加密工具 ====================

function md5(data: string): string {
  return crypto.createHash('md5').update(data, 'utf8').digest('hex');
}

function hmacSha256(key: string, data: string): string {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
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

// DES 加密（对齐 mima-kit: TripleDES 64bit ECB, NO_PAD, 但 padData 填充 \0）
function padData(data: string): string {
  const blockSize = 8;
  const padLength = blockSize - (data.length % blockSize);
  return data + '\0'.repeat(padLength === blockSize ? 0 : padLength);
}

async function encryptDES(message: string, key: string): Promise<string> {
  const inputStr = padData(String(message));
  // mima-kit 的 t_des(64) + ecb 用 8 字节 key 做单 DES
  const cipher = crypto.createCipheriv('des-ecb', Buffer.from(key, 'utf8'), null);
  cipher.setAutoPadding(false);
  const encrypted = cipher.update(inputStr, 'utf8');
  const final = cipher.final();
  return Buffer.concat([encrypted, final]).toString('base64');
}

// 按 DES_RULE 加密对象字段
async function encryptObjectByDESRules(
  object: Record<string, any>,
  rules: typeof DES_RULE,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const i in object) {
    if (i in rules) {
      const rule = rules[i];
      if (rule.is_encrypt === 1 && rule.key) {
        result[rule.obfuscated_name] = await encryptDES(String(object[i]), rule.key);
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

// RSA 加密（用 Web Crypto API 对齐参考实现）
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

// 用 mima-kit 风格的 RSA PKCS1 加密
async function encryptRSA(message: string, publicKey: string): Promise<string> {
  const { n, e } = await extractJWKFromPEM(publicKey);
  // 构建 JWK 格式公钥用于 Node.js crypto
  const nB64url = bigIntToBase64URL(n);
  const eB64url = bigIntToBase64URL(e);
  const jwk = { kty: 'RSA', n: nB64url, e: eB64url };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP' }, true, ['encrypt']);
  // 注意：参考用的是 pkcs1_es_1_5 (PKCS1 v1.5)，不是 OAEP
  // 但 Web Crypto API 不直接支持 PKCS1v1.5，用 Node.js crypto 代替
  const nodeKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const encrypted = crypto.publicEncrypt(
    { key: nodeKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(message, 'utf8'),
  );
  return encrypted.toString('base64');
}

function bigIntToBase64URL(n: bigint): string {
  const hex = n.toString(16);
  const paddedHex = hex.length % 2 ? '0' + hex : hex;
  const buf = Buffer.from(paddedHex, 'hex');
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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
    data: await encryptAES(await gzipObject(await encryptObjectByDESRules(desTarget, DES_RULE)), priId),
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
