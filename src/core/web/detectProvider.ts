export type Provider = 'github' | 'gitlab' | 'bitbucket';

const PROVIDERS: readonly Provider[] = ['github', 'gitlab', 'bitbucket'];

const KNOWN_HOSTS: Readonly<Record<string, Provider>> = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'bitbucket.org': 'bitbucket',
};

function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

// 一般主機名或 [IPv6]。擋掉 @、: 這類字元，免得 github.com@evil.com 靠字樣被認成 github。
const HOSTNAME = /^(?:[a-z0-9_.-]+|\[[0-9a-f:.]+\])$/;

/**
 * 設定覆寫（copyLineRef.hosts）優先，其次三個公開主機與其子網域，最後用 hostname 某一段含
 * github/gitlab/bitbucket 字樣猜自架站（gitlab.company.com 這類最常見）。
 */
export function detectProvider(host: string, overrides: Record<string, string>): Provider | null {
  const key = host.toLowerCase();
  if (!HOSTNAME.test(key)) {
    return null;
  }
  for (const [overrideHost, provider] of Object.entries(overrides)) {
    if (overrideHost.toLowerCase() === key && isProvider(provider)) {
      return provider;
    }
  }
  for (const [knownHost, provider] of Object.entries(KNOWN_HOSTS)) {
    if (key === knownHost || key.endsWith(`.${knownHost}`)) {
      return provider;
    }
  }
  const labels = key.split('.');
  return PROVIDERS.find((provider) => labels.some((label) => label.includes(provider))) ?? null;
}
