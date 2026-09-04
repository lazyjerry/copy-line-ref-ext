// 跑 git CLI 取得「開遠端網頁」需要的狀態。用 CLI 而不用 VS Code 內建 Git extension API，
// 是因為後者對工作區外的檔案預設不開其所屬 repo；CLI 對任何路徑都成立。
// 這層只跑指令與組資料，判斷全在 core/git/syncDecision.ts。
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { parseStatusV2 } from '../core/git/parseStatus';
import type { SyncInput } from '../core/git/syncDecision';

export type GitQueryResult =
  | { kind: 'ok'; input: SyncInput; relativePath: string }
  | { kind: 'git-not-found'; message: string };

class GitNotFoundError extends Error {}

/** 非 0 結束碼依指令語意各自解讀（不是 repo、沒設 config…），一律回 undefined 交給呼叫端。 */
function runGit(gitPath: string, args: string[], cwd: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    execFile(gitPath, args, { cwd, encoding: 'utf8', windowsHide: true }, (error, stdout) => {
      if (error === null) {
        resolve(stdout);
        return;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new GitNotFoundError(`找不到 git 執行檔（${gitPath}）`));
        return;
      }
      resolve(undefined);
    });
  });
}

const NOT_A_REPO: SyncInput = {
  repoRoot: undefined,
  fileInsideRepo: false,
  headName: undefined,
  upstream: undefined,
  trackingRefMissing: false,
  ahead: undefined,
  behind: undefined,
  fileStatus: 'clean',
};

export async function querySyncInput(filePath: string, gitPath: string): Promise<GitQueryResult> {
  try {
    return { kind: 'ok', ...(await collect(filePath, gitPath)) };
  } catch (error) {
    if (error instanceof GitNotFoundError) {
      return { kind: 'git-not-found', message: error.message };
    }
    throw error;
  }
}

async function collect(filePath: string, gitPath: string): Promise<{ input: SyncInput; relativePath: string }> {
  const cwd = path.dirname(filePath);
  const repoRoot = (await runGit(gitPath, ['rev-parse', '--show-toplevel'], cwd))?.trim();
  if (!repoRoot) {
    return { input: NOT_A_REPO, relativePath: '' };
  }

  // rev-parse 回的是實體路徑；編輯器給的可能經過 symlink（macOS 的 /tmp → /private/tmp），先對齊再算相對路徑
  const realFile = await fs.realpath(filePath).catch(() => filePath);
  const relativePath = path.relative(repoRoot, realFile);
  const fileInsideRepo = relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

  const statusOutput = await runGit(gitPath, ['status', '--porcelain=v2', '--branch', '--untracked-files=all', '--', filePath], cwd);
  const status = parseStatusV2(statusOutput ?? '');

  let upstream: SyncInput['upstream'];
  let trackingRefMissing = false;
  if (status.headName !== undefined && status.hasUpstream) {
    const remote = (await runGit(gitPath, ['config', '--get', `branch.${status.headName}.remote`], cwd))?.trim();
    const merge = (await runGit(gitPath, ['config', '--get', `branch.${status.headName}.merge`], cwd))?.trim();
    if (remote && merge) {
      const url = (await runGit(gitPath, ['remote', 'get-url', remote], cwd))?.trim();
      upstream = { remote, branch: merge.replace(/^refs\/heads\//, ''), url: url || undefined };
      trackingRefMissing = status.ahead === undefined;
    }
  }

  return {
    input: {
      repoRoot,
      fileInsideRepo,
      headName: status.headName,
      upstream,
      trackingRefMissing,
      ahead: status.ahead,
      behind: status.behind,
      fileStatus: status.fileStatus,
    },
    relativePath,
  };
}
