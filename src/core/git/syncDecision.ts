import type { FileStatus } from './parseStatus';
import { parseRemoteUrl } from './remoteUrl';
import type { RemoteLocation } from './remoteUrl';

export interface SyncInput {
  /** `git rev-parse --show-toplevel` 失敗 → undefined。 */
  repoRoot: string | undefined;
  fileInsideRepo: boolean;
  headName: string | undefined;
  upstream: { remote: string; branch: string; url: string | undefined } | undefined;
  /** 有 upstream 設定，但遠端追蹤分支已經不在（被刪或從未 fetch）。 */
  trackingRefMissing: boolean;
  ahead: number | undefined;
  behind: number | undefined;
  fileStatus: FileStatus;
}

export type SyncReason =
  | 'no-repository'
  | 'file-outside-repo'
  | 'detached-head'
  | 'no-upstream'
  | 'tracking-ref-missing'
  | 'ahead'
  | 'untracked'
  | 'no-usable-remote';

export type SyncDecision =
  | { ok: true; remoteBranch: string; location: RemoteLocation; warnings: string[] }
  | { ok: false; reason: SyncReason; message: string };

function fail(reason: SyncReason, message: string): SyncDecision {
  return { ok: false, reason, message };
}

/**
 * 「遠端已同步」的判準：有 upstream、沒有未推送的 commit、檔案已被追蹤。
 * 落後遠端與工作區有未提交修改不擋，只警告——網頁還是開得到，只是行號可能對不上。
 */
export function decideOpenRemote(input: SyncInput): SyncDecision {
  if (input.repoRoot === undefined) {
    return fail('no-repository', '這個檔案不在 git 儲存庫中');
  }
  if (!input.fileInsideRepo) {
    return fail('file-outside-repo', '檔案不在儲存庫根目錄底下');
  }
  if (input.headName === undefined) {
    return fail('detached-head', '目前是 detached HEAD，沒有分支可對應到遠端');
  }
  const branch = input.headName;
  if (input.upstream === undefined) {
    return fail('no-upstream', `分支「${branch}」尚未推送到遠端（沒有 upstream）`);
  }
  if (input.trackingRefMissing) {
    return fail('tracking-ref-missing', `分支「${branch}」的遠端追蹤分支已不存在，請重新推送`);
  }
  const ahead = input.ahead ?? 0;
  if (ahead > 0) {
    return fail('ahead', `分支「${branch}」有 ${ahead} 個 commit 尚未推送`);
  }
  if (input.fileStatus === 'untracked') {
    return fail('untracked', '檔案尚未加入 git 追蹤，遠端沒有這個檔案');
  }
  const location = parseRemoteUrl(input.upstream.url);
  if (location === null) {
    return fail('no-usable-remote', `遠端「${input.upstream.remote}」的網址無法轉成網頁（如本機路徑）`);
  }

  const warnings: string[] = [];
  if (input.fileStatus === 'modified') {
    warnings.push('檔案有未提交的修改，行號可能與遠端不同');
  }
  const behind = input.behind ?? 0;
  if (behind > 0) {
    warnings.push(`本機落後遠端 ${behind} 個 commit`);
  }
  return { ok: true, remoteBranch: input.upstream.branch, location, warnings };
}
