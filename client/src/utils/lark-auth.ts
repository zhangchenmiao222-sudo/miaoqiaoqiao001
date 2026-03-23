/**
 * 飞书网页 OAuth 授权工具
 * 替代原 tt.login 小程序方案
 */

const LARK_APP_ID = import.meta.env.VITE_LARK_APP_ID || 'cli_a9352449e9785cc2';
const REDIRECT_URI = import.meta.env.VITE_LARK_REDIRECT_URI || `${window.location.origin}/auth/callback`;

/**
 * 跳转到飞书 OAuth 授权页
 * 用户授权后飞书会重定向回 /auth/callback?code=xxx
 */
export function redirectToLarkAuth() {
  const state = generateState();
  sessionStorage.setItem('lark_oauth_state', state);

  const params = new URLSearchParams({
    app_id: LARK_APP_ID,
    redirect_uri: REDIRECT_URI,
    state,
  });

  window.location.href = `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
}

/**
 * 从回调 URL 中解析授权码
 */
export function parseAuthCallback(search: string): { code: string; state: string } | null {
  const params = new URLSearchParams(search);
  const code = params.get('code');
  const state = params.get('state');

  if (!code) return null;

  // 校验 state 防止 CSRF
  const savedState = sessionStorage.getItem('lark_oauth_state');
  if (state !== savedState) {
    console.warn('OAuth state 不匹配，可能存在 CSRF 攻击');
    return null;
  }

  sessionStorage.removeItem('lark_oauth_state');
  return { code, state: state || '' };
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!localStorage.getItem('token');
}

/** 生成随机 state 字符串 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
