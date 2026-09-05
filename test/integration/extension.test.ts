import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import type { CopyLineRefApi } from '../../src/extension';

const EXTENSION_ID = 'workjerry.at-line-ref';

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

async function getApi(): Promise<CopyLineRefApi> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `找不到延伸模組 ${EXTENSION_ID}`);
  return (await extension.activate()) as CopyLineRefApi;
}

async function openWithSelection(file: string, selection?: vscode.Selection): Promise<void> {
  const editor = await vscode.window.showTextDocument(vscode.Uri.file(file));
  if (selection) {
    editor.selection = selection;
  }
}

suite('At Line Ref 延伸模組', () => {
  let workspaceDir: string;
  let workspaceFile: string;
  let scratchDir: string;
  let repoDir: string;
  let repoFile: string;

  suiteSetup(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, '測試需要一個工作區資料夾');
    workspaceDir = folders[0].uri.fsPath;
    fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
    workspaceFile = path.join(workspaceDir, 'src', 'a.txt');
    fs.writeFileSync(workspaceFile, 'line1\nline2\nline3\n');

    // 工作區之外、/private/tmp 底下：同時驗證「工作區外的檔案也能開遠端」
    scratchDir = fs.mkdtempSync('/private/tmp/clr-repo-');
    repoDir = path.join(scratchDir, 'repo');
    const bareDir = path.join(scratchDir, 'origin.git');
    fs.mkdirSync(repoDir);
    git(scratchDir, 'init', '--bare', '-b', 'main', bareDir);
    git(repoDir, 'init', '-b', 'main');
    git(repoDir, 'config', 'user.email', 'test@example.com');
    git(repoDir, 'config', 'user.name', 'test');
    repoFile = path.join(repoDir, 'a.txt');
    fs.writeFileSync(repoFile, 'line1\nline2\nline3\n');
    git(repoDir, 'add', 'a.txt');
    git(repoDir, 'commit', '-q', '-m', 'init');
    git(repoDir, 'remote', 'add', 'origin', bareDir);
    git(repoDir, 'push', '-q', '-u', 'origin', 'main');
    // 追蹤 ref 已建立，之後把網址換成 GitHub 形式即可離線驗 URL 組合
    git(repoDir, 'remote', 'set-url', 'origin', 'git@github.com:foo/bar.git');
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('可啟動並註冊全部指令', async () => {
    await getApi();
    const commands = await vscode.commands.getCommands(true);
    for (const command of ['copyLineRef.copyReference', 'copyLineRef.openRemote']) {
      assert.ok(commands.includes(command), `缺少指令 ${command}`);
    }
  });

  test('工作區內的檔案複製相對路徑與選取行號', async () => {
    const api = await getApi();
    await openWithSelection(workspaceFile, new vscode.Selection(1, 0, 2, 3));
    const reference = await api.copyReference();
    assert.equal(reference, '@src/a.txt#L2-3');
    assert.equal(await vscode.env.clipboard.readText(), reference);
  });

  test('工作區外的檔案退回絕對路徑', async () => {
    const api = await getApi();
    await openWithSelection(repoFile);
    const reference = await api.copyReference();
    assert.ok(reference !== undefined && reference.startsWith('@/'), `應為絕對路徑：${reference}`);
    assert.ok(reference.endsWith('/a.txt'));
  });

  test('帶 uri 呼叫（檔案總管右鍵）只給路徑，忽略編輯器選取', async () => {
    const api = await getApi();
    await openWithSelection(workspaceFile, new vscode.Selection(1, 0, 2, 3));
    assert.equal(await api.copyReference(vscode.Uri.file(workspaceFile)), '@src/a.txt');
  });

  test('不在 git 儲存庫的檔案回 no-repository', async () => {
    const api = await getApi();
    await openWithSelection(workspaceFile);
    assert.deepEqual(await api.openRemote({ open: false }), { ok: false, reason: 'no-repository' });
  });

  test('已同步的分支組出 GitHub 網址與行號錨點', async () => {
    const api = await getApi();
    await openWithSelection(repoFile, new vscode.Selection(1, 0, 2, 3));
    assert.deepEqual(await api.openRemote({ open: false }), {
      ok: true,
      url: 'https://github.com/foo/bar/blob/main/a.txt#L2-L3',
    });
  });

  test('未追蹤的新檔案回 untracked', async () => {
    const api = await getApi();
    const newFile = path.join(repoDir, 'b.txt');
    fs.writeFileSync(newFile, 'new\n');
    await openWithSelection(newFile);
    assert.deepEqual(await api.openRemote({ open: false }), { ok: false, reason: 'untracked' });
  });

  test('本機有未推送的 commit 回 ahead', async () => {
    const api = await getApi();
    fs.appendFileSync(repoFile, 'line4\n');
    git(repoDir, 'commit', '-q', '-a', '-m', 'local only');
    await openWithSelection(repoFile);
    assert.deepEqual(await api.openRemote({ open: false }), { ok: false, reason: 'ahead' });
  });
});
