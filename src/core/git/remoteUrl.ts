// 遠端網址是給 git 用的，不一定是 URL：scp 形式（git@host:owner/repo.git）沒有 scheme，
// ssh:// 與 git:// 瀏覽器也開不了。這裡只抽出主機與 repo 路徑，網頁 URL 由 web/ 依託管服務組。

export interface RemoteLocation {
  /** 小寫、無埠號，用來判斷託管服務。 */
  host: string;
  /** 組網頁 URL 用；http(s) 的埠號保留，ssh 的埠號對網頁沒意義所以去掉。 */
  authority: string;
  /** owner/repo 或 group/sub/repo，無 .git、無前後斜線。 */
  repoPath: string;
}

const WEB_SCHEMES = new Set(['http', 'https']);
const GIT_SCHEMES = new Set(['ssh', 'git', 'git+ssh']);

export function parseRemoteUrl(url: string | undefined): RemoteLocation | null {
  if (!url || url.trim() === '') {
    return null;
  }
  const value = url.trim();

  // scp 形式 git@host:owner/repo.git。冒號後接斜線的是 scheme（file:///…），不算。
  const scpLike = /^(?:[^/@]+@)?([^/:]+):(?!\/)(.+)$/.exec(value);
  if (scpLike) {
    return build(scpLike[1], scpLike[2]);
  }

  const withScheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/]*)(\/.*)?$/.exec(value);
  if (!withScheme) {
    return null;
  }
  const scheme = withScheme[1].toLowerCase();
  // 帶憑證的網址不該原封不動丟給瀏覽器
  const authority = withScheme[2].replace(/^[^@]*@/, '');
  if (authority === '') {
    return null;
  }
  if (WEB_SCHEMES.has(scheme)) {
    return build(authority, withScheme[3] ?? '');
  }
  if (GIT_SCHEMES.has(scheme)) {
    return build(stripPort(authority), withScheme[3] ?? '');
  }
  return null;
}

/** IPv6 的 [::1] 不當埠號處理。 */
function stripPort(authority: string): string {
  return authority.replace(/(?<!:):\d+$/, '');
}

function build(authority: string, rawPath: string): RemoteLocation | null {
  const repoPath = rawPath
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');
  // 託管服務至少都是 owner/repo 兩段
  if (repoPath === '' || repoPath.split('/').length < 2) {
    return null;
  }
  return { host: stripPort(authority).toLowerCase(), authority, repoPath };
}
