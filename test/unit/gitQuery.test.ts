import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { querySyncInput } from '../../src/git/gitQuery';

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

// gitQuery 只用 node 的子行程，不碰 vscode，可在純 Node 下用真的 git 驗證。
suite('querySyncInput', () => {
  let scratchDir: string;
  let repoDir: string;
  let repoFile: string;
  let marker: string;

  setup(() => {
    scratchDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'clr-gitquery-')));
    repoDir = path.join(scratchDir, 'repo');
    const bareDir = path.join(scratchDir, 'origin.git');
    fs.mkdirSync(repoDir);
    git(scratchDir, 'init', '-q', '--bare', '-b', 'main', bareDir);
    git(repoDir, 'init', '-q', '-b', 'main');
    git(repoDir, 'config', 'user.email', 'test@example.com');
    git(repoDir, 'config', 'user.name', 'test');
    repoFile = path.join(repoDir, 'a.txt');
    fs.writeFileSync(repoFile, 'line1\n');
    git(repoDir, 'add', 'a.txt');
    git(repoDir, 'commit', '-q', '-m', 'init');
    git(repoDir, 'remote', 'add', 'origin', bareDir);
    git(repoDir, 'push', '-q', '-u', 'origin', 'main');

    marker = path.join(scratchDir, 'fsmonitor-ran');
    const hook = path.join(scratchDir, 'fsmonitor.sh');
    fs.writeFileSync(hook, `#!/bin/sh\ntouch '${marker}'\n`, { mode: 0o755 });
    git(repoDir, 'config', 'core.fsmonitor', hook);
    // 工作樹有修改時 git status 才會去問 fsmonitor
    fs.writeFileSync(repoFile, 'line1\nchanged\n');
  });

  teardown(() => {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  function inWorkspace(): { trusted: boolean; folders: string[] } {
    return { trusted: true, folders: [scratchDir] };
  }

  /** 包一層真 git：被呼叫就留下記號，用來判斷 querySyncInput 有沒有跑 git。 */
  function recordingGit(): { gitPath: string; called: () => boolean } {
    const calledMarker = path.join(scratchDir, 'git-called');
    const gitPath = path.join(scratchDir, 'recording-git.sh');
    fs.writeFileSync(gitPath, `#!/bin/sh\ntouch '${calledMarker}'\nexec git "$@"\n`, { mode: 0o755 });
    return { gitPath, called: () => fs.existsSync(calledMarker) };
  }

  test('對照組：不加防護的 git status 會執行 repo 設定的 core.fsmonitor', () => {
    git(repoDir, 'status', '--porcelain=v2', '--', repoFile);
    assert.ok(fs.existsSync(marker), '測試前提不成立：這版 git 沒有觸發 fsmonitor');
  });

  test('不執行 repo 設定的 core.fsmonitor，且輸出不變', async () => {
    const result = await querySyncInput(repoFile, 'git', inWorkspace());
    assert.equal(fs.existsSync(marker), false, 'core.fsmonitor 被執行了');
    assert.equal(result.kind, 'ok');
    if (result.kind !== 'ok') {
      return;
    }
    assert.equal(result.relativePath, 'a.txt');
    assert.deepEqual(result.input, {
      repoRoot: repoDir,
      fileInsideRepo: true,
      headName: 'main',
      upstream: { remote: 'origin', branch: 'main', url: path.join(scratchDir, 'origin.git') },
      trackingRefMissing: false,
      ahead: 0,
      behind: 0,
      fileStatus: 'modified',
    });
  });

  test('沒設 fsmonitor 的一般 repo 結果相同', async () => {
    git(repoDir, 'config', '--unset', 'core.fsmonitor');
    const result = await querySyncInput(repoFile, 'git', inWorkspace());
    assert.equal(result.kind, 'ok');
    if (result.kind === 'ok') {
      assert.equal(result.input.fileStatus, 'modified');
      assert.equal(result.input.upstream?.branch, 'main');
    }
  });

  test('不是 repo 的目錄照舊回 repoRoot undefined', async () => {
    const loose = path.join(scratchDir, 'loose.txt');
    fs.writeFileSync(loose, 'x\n');
    const result = await querySyncInput(loose, 'git', inWorkspace());
    assert.equal(result.kind, 'ok');
    if (result.kind === 'ok') {
      assert.equal(result.input.repoRoot, undefined);
    }
  });

  test('找不到 git 執行檔時回 git-not-found', async () => {
    const result = await querySyncInput(repoFile, path.join(scratchDir, 'no-such-git'), inWorkspace());
    assert.equal(result.kind, 'git-not-found');
  });
  test('工作區內的檔案照常呼叫 git', async () => {
    const recorder = recordingGit();
    const result = await querySyncInput(repoFile, recorder.gitPath, { trusted: true, folders: [repoDir] });
    assert.equal(recorder.called(), true);
    assert.equal(result.kind, 'ok');
  });

  test('工作區外的檔案不呼叫 git', async () => {
    const recorder = recordingGit();
    const otherFolder = path.join(scratchDir, 'other');
    fs.mkdirSync(otherFolder);
    assert.deepEqual(await querySyncInput(repoFile, recorder.gitPath, { trusted: true, folders: [otherFolder] }), {
      kind: 'skipped',
      reason: 'outside-workspace',
    });
    assert.deepEqual(await querySyncInput(repoFile, recorder.gitPath, { trusted: true, folders: [] }), {
      kind: 'skipped',
      reason: 'outside-workspace',
    });
    assert.equal(recorder.called(), false);
  });

  test('工作區未受信任時不呼叫 git', async () => {
    const recorder = recordingGit();
    assert.deepEqual(await querySyncInput(repoFile, recorder.gitPath, { trusted: false, folders: [repoDir] }), {
      kind: 'skipped',
      reason: 'untrusted-workspace',
    });
    assert.equal(recorder.called(), false);
  });

  test('工作區內的 symlink 指向外部 repo 時視為外部', async () => {
    const recorder = recordingGit();
    const workspace = path.join(scratchDir, 'ws');
    fs.mkdirSync(workspace);
    const link = path.join(workspace, 'link.txt');
    fs.symlinkSync(repoFile, link);
    assert.deepEqual(await querySyncInput(link, recorder.gitPath, { trusted: true, folders: [workspace] }), {
      kind: 'skipped',
      reason: 'outside-workspace',
    });
    assert.equal(recorder.called(), false);
  });

  test('工作區資料夾本身經 symlink 開啟時仍算在內', async () => {
    const linkedWorkspace = path.join(scratchDir, 'linked-repo');
    fs.symlinkSync(repoDir, linkedWorkspace);
    const result = await querySyncInput(path.join(linkedWorkspace, 'a.txt'), 'git', { trusted: true, folders: [linkedWorkspace] });
    assert.equal(result.kind, 'ok');
  });
});
