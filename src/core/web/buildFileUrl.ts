import type { LineRange } from '../reference/formatReference';
import type { Provider } from './detectProvider';

export interface FileUrlInput {
  provider: Provider;
  authority: string;
  repoPath: string;
  branch: string;
  /** 相對 repo 根目錄，以 / 分隔。 */
  filePath: string;
  range: LineRange | null;
}

/** 每段各自 encode，斜線保留——分支名 feature/x 與路徑都得維持層級。 */
export function encodePathSegments(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/');
}

function anchor(range: LineRange | null, prefix: string, separator: string): string {
  if (range === null) {
    return '';
  }
  if (range.startLine === range.endLine) {
    return `#${prefix}${range.startLine}`;
  }
  return `#${prefix}${range.startLine}${separator}${range.endLine}`;
}

export function buildFileUrl(input: FileUrlInput): string {
  const branch = encodePathSegments(input.branch);
  const file = encodePathSegments(input.filePath);
  const base = `https://${input.authority}/${input.repoPath}`;
  switch (input.provider) {
    case 'github':
      return `${base}/blob/${branch}/${file}${anchor(input.range, 'L', '-L')}`;
    case 'gitlab':
      return `${base}/-/blob/${branch}/${file}${anchor(input.range, 'L', '-')}`;
    case 'bitbucket':
      return `${base}/src/${branch}/${file}${anchor(input.range, 'lines-', ':')}`;
  }
}
