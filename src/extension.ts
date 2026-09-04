// 進入點：兩個指令（複製行參照、在遠端網頁開啟檔案）的 vscode 接線；判斷邏輯都在 core/。
import * as vscode from 'vscode';

import { decideOpenRemote } from './core/git/syncDecision';
import type { SyncReason } from './core/git/syncDecision';
import { formatReference, selectionToLineRange } from './core/reference/formatReference';
import type { LineRange } from './core/reference/formatReference';
import { normalizeSeparators, toReferencePath } from './core/reference/referencePath';
import { buildFileUrl } from './core/web/buildFileUrl';
import { detectProvider } from './core/web/detectProvider';
import { querySyncInput } from './git/gitQuery';

const PREFIX = 'Copy Line Ref：';

export type OpenRemoteResult = { ok: true; url: string } | { ok: false; reason: string };

/** 整合測試用：headless 下沒有剪貼簿與瀏覽器可觀察，直接拿回傳值驗。 */
export interface CopyLineRefApi {
  copyReference(uri?: vscode.Uri): Promise<string | undefined>;
  openRemote(options?: { open?: boolean; uri?: vscode.Uri }): Promise<OpenRemoteResult>;
}

interface Target {
  uri: vscode.Uri;
  range: LineRange | null;
}

/** 這些情況是「這裡不適用」，用警告；其餘是「應該可行但做不到」，用錯誤。 */
const WARNING_REASONS: ReadonlySet<SyncReason> = new Set(['no-repository', 'file-outside-repo', 'detached-head', 'no-upstream', 'untracked']);

function rangeOf(editor: vscode.TextEditor): LineRange | null {
  const selection = editor.selection;
  return selectionToLineRange({
    startLine: selection.start.line,
    startCharacter: selection.start.character,
    endLine: selection.end.line,
    endCharacter: selection.end.character,
    isEmpty: selection.isEmpty,
  });
}

/**
 * 快捷鍵／命令面板不帶參數 → 作用中的編輯器與其選取；
 * 編輯器右鍵帶 (uri) → 同一份文件，仍取選取；
 * 檔案總管右鍵帶 (uri, uris[]) → 只有檔案，沒有行號。
 */
function resolveTarget(args: unknown[]): Target | undefined {
  const editor = vscode.window.activeTextEditor;
  const [first, second] = args;
  if (first instanceof vscode.Uri) {
    const fromExplorer = Array.isArray(second);
    const isActiveDocument = editor !== undefined && editor.document.uri.toString() === first.toString();
    return { uri: first, range: !fromExplorer && isActiveDocument ? rangeOf(editor) : null };
  }
  return editor ? { uri: editor.document.uri, range: rangeOf(editor) } : undefined;
}

function checkTarget(target: Target | undefined): target is Target {
  if (target === undefined) {
    void vscode.window.showWarningMessage(`${PREFIX}沒有作用中的編輯器`);
    return false;
  }
  if (target.uri.scheme !== 'file') {
    void vscode.window.showWarningMessage(`${PREFIX}這個檔案尚未存檔，沒有路徑可參照`);
    return false;
  }
  return true;
}

async function copyReference(target: Target | undefined): Promise<string | undefined> {
  if (!checkTarget(target)) {
    return undefined;
  }
  const folder = vscode.workspace.getWorkspaceFolder(target.uri);
  const reference = formatReference(toReferencePath(target.uri.fsPath, folder?.uri.fsPath), target.range);
  await vscode.env.clipboard.writeText(reference);
  vscode.window.setStatusBarMessage(`${PREFIX}已複製 ${reference}`, 3000);
  return reference;
}

function gitExecutable(): string {
  const configured = vscode.workspace.getConfiguration('git').get<string | string[] | null>('path');
  const first = Array.isArray(configured) ? configured.find((p) => p.trim() !== '') : configured;
  return first && first.trim() !== '' ? first : 'git';
}

async function openRemote(target: Target | undefined, open: boolean): Promise<OpenRemoteResult> {
  if (!checkTarget(target)) {
    return { ok: false, reason: 'no-target' };
  }
  const query = await querySyncInput(target.uri.fsPath, gitExecutable());
  if (query.kind === 'git-not-found') {
    void vscode.window.showErrorMessage(`${PREFIX}${query.message}，可在設定 git.path 指定`);
    return { ok: false, reason: 'git-not-found' };
  }

  const decision = decideOpenRemote(query.input);
  if (!decision.ok) {
    const show = WARNING_REASONS.has(decision.reason) ? vscode.window.showWarningMessage : vscode.window.showErrorMessage;
    void show(`${PREFIX}${decision.message}`);
    return { ok: false, reason: decision.reason };
  }

  const hosts = vscode.workspace.getConfiguration('copyLineRef').get<Record<string, string>>('hosts', {});
  const provider = detectProvider(decision.location.host, hosts);
  if (provider === null) {
    void vscode.window.showErrorMessage(`${PREFIX}不支援的 git 主機 ${decision.location.host}（可在設定 copyLineRef.hosts 指定 github／gitlab／bitbucket）`);
    return { ok: false, reason: 'unsupported-host' };
  }

  const url = buildFileUrl({
    provider,
    authority: decision.location.authority,
    repoPath: decision.location.repoPath,
    branch: decision.remoteBranch,
    filePath: normalizeSeparators(query.relativePath),
    range: target.range,
  });
  for (const warning of decision.warnings) {
    void vscode.window.showWarningMessage(`${PREFIX}${warning}`);
  }
  if (open) {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }
  vscode.window.setStatusBarMessage(`${PREFIX}已開啟 ${url}`, 3000);
  return { ok: true, url };
}

export function activate(context: vscode.ExtensionContext): CopyLineRefApi {
  const register = (command: string, handler: (...args: unknown[]) => unknown): void => {
    context.subscriptions.push(vscode.commands.registerCommand(command, handler));
  };
  register('copyLineRef.copyReference', (...args: unknown[]) => copyReference(resolveTarget(args)));
  register('copyLineRef.openRemote', (...args: unknown[]) => openRemote(resolveTarget(args), true));

  // API 帶 uri 時比照檔案總管右鍵：只有檔案、沒有行號
  const explorerStyle = (uri: vscode.Uri | undefined): unknown[] => (uri ? [uri, [uri]] : []);
  return {
    copyReference: (uri) => copyReference(resolveTarget(explorerStyle(uri))),
    openRemote: (options = {}) => openRemote(resolveTarget(explorerStyle(options.uri)), options.open !== false),
  };
}

export function deactivate(): void {}
