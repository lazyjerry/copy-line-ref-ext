import * as assert from 'node:assert/strict';

import { decideOpenRemote } from '../../src/core/git/syncDecision';
import type { SyncInput } from '../../src/core/git/syncDecision';

const synced: SyncInput = {
  repoRoot: '/repo',
  fileInsideRepo: true,
  headName: 'feat',
  upstream: { remote: 'origin', branch: 'feature-x', url: 'git@github.com:o/r.git' },
  trackingRefMissing: false,
  ahead: 0,
  behind: 0,
  fileStatus: 'clean',
};

function reasonOf(patch: Partial<SyncInput>): string | undefined {
  const decision = decideOpenRemote({ ...synced, ...patch });
  return decision.ok ? undefined : decision.reason;
}

suite('decideOpenRemote', () => {
  test('不是 repo', () => {
    assert.equal(reasonOf({ repoRoot: undefined }), 'no-repository');
  });

  test('檔案在 repo 之外', () => {
    assert.equal(reasonOf({ fileInsideRepo: false }), 'file-outside-repo');
  });

  test('detached HEAD', () => {
    assert.equal(reasonOf({ headName: undefined }), 'detached-head');
  });

  test('沒有 upstream', () => {
    assert.equal(reasonOf({ upstream: undefined }), 'no-upstream');
  });

  test('遠端追蹤分支消失', () => {
    assert.equal(reasonOf({ trackingRefMissing: true, ahead: undefined, behind: undefined }), 'tracking-ref-missing');
  });

  test('有未推送的 commit，訊息含數量', () => {
    const decision = decideOpenRemote({ ...synced, ahead: 3 });
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.reason, 'ahead');
      assert.match(decision.message, /3 個 commit/);
    }
  });

  test('未追蹤的檔案', () => {
    assert.equal(reasonOf({ fileStatus: 'untracked' }), 'untracked');
  });

  test('遠端網址無法轉成網頁', () => {
    assert.equal(reasonOf({ upstream: { remote: 'origin', branch: 'main', url: '/srv/git/r.git' } }), 'no-usable-remote');
    assert.equal(reasonOf({ upstream: { remote: 'origin', branch: 'main', url: undefined } }), 'no-usable-remote');
  });

  test('ahead 與 untracked 同時成立時先回 ahead', () => {
    assert.equal(reasonOf({ ahead: 1, fileStatus: 'untracked' }), 'ahead');
  });

  test('已同步：用 upstream 的遠端分支名，不是本機分支名', () => {
    const decision = decideOpenRemote(synced);
    assert.equal(decision.ok, true);
    if (decision.ok) {
      assert.equal(decision.remoteBranch, 'feature-x');
      assert.equal(decision.location.repoPath, 'o/r');
      assert.deepEqual(decision.warnings, []);
    }
  });

  test('ahead 為 undefined 視為 0', () => {
    assert.equal(decideOpenRemote({ ...synced, ahead: undefined, behind: undefined }).ok, true);
  });

  test('有未提交修改與落後遠端時仍可開，但各有一條警告', () => {
    const decision = decideOpenRemote({ ...synced, fileStatus: 'modified', behind: 2 });
    assert.equal(decision.ok, true);
    if (decision.ok) {
      assert.equal(decision.warnings.length, 2);
      assert.match(decision.warnings[0], /未提交/);
      assert.match(decision.warnings[1], /落後遠端 2 個/);
    }
  });
});
