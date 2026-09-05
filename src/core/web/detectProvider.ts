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

/**
 * 設定覆寫（copyLineRef.hosts）優先，其次三個公開主機，最後用 hostname 含 github/gitlab/bitbucket
 * 字樣猜自架站（gitlab.company.com 這類最常見）。
 */
export function detectProvider(host: string, overrides: Record<string, string>): Provider | null {
  const key = host.toLowerCase();
  for (const [overrideHost, provider] of Object.entries(overrides)) {
    if (overrideHost.toLowerCase() === key && isProvider(provider)) {
      return provider;
    }
  }
  const known = KNOWN_HOSTS[key];
  if (known !== undefined) {
    return known;
  }
  return PROVIDERS.find((provider) => key.includes(provider)) ?? null;
}
