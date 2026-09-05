export type FileStatus = 'clean' | 'modified' | 'untracked';

export interface BranchStatus {
  /** detached HEAD 時為 undefined。 */
  headName: string | undefined;
  hasUpstream: boolean;
  /** 有 upstream 但遠端追蹤分支不存在時，git 不輸出 branch.ab，這兩個就是 undefined。 */
  ahead: number | undefined;
  behind: number | undefined;
  fileStatus: FileStatus;
}

/**
 * 解析 `git status --porcelain=v2 --branch -- <單一檔案>` 的輸出。
 * 因為 pathspec 只給一個檔案，任何 1/2/u 開頭的項目就代表該檔已修改，? 代表未追蹤。
 */
export function parseStatusV2(output: string): BranchStatus {
  const result: BranchStatus = {
    headName: undefined,
    hasUpstream: false,
    ahead: undefined,
    behind: undefined,
    fileStatus: 'clean',
  };
  for (const line of output.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      const name = line.slice('# branch.head '.length);
      result.headName = name === '(detached)' ? undefined : name;
    } else if (line.startsWith('# branch.upstream ')) {
      result.hasUpstream = true;
    } else if (line.startsWith('# branch.ab ')) {
      const match = /^# branch\.ab \+(\d+) -(\d+)$/.exec(line);
      if (match) {
        result.ahead = Number(match[1]);
        result.behind = Number(match[2]);
      }
    } else if (line.startsWith('? ')) {
      result.fileStatus = 'untracked';
    } else if (/^[12u] /.test(line)) {
      result.fileStatus = 'modified';
    }
  }
  return result;
}
