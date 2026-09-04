import * as assert from 'node:assert/strict';

import { parseRemoteUrl } from '../../src/core/git/remoteUrl';

suite('parseRemoteUrl', () => {
  test('scp 形式', () => {
    assert.deepEqual(parseRemoteUrl('git@github.com:owner/repo.git'), {
      host: 'github.com',
      authority: 'github.com',
      repoPath: 'owner/repo',
    });
  });

  test('ssh:// 帶埠號時去掉埠號', () => {
    assert.deepEqual(parseRemoteUrl('ssh://git@host.example:2222/o/r.git'), {
      host: 'host.example',
      authority: 'host.example',
      repoPath: 'o/r',
    });
  });

  test('https 多層群組', () => {
    assert.deepEqual(parseRemoteUrl('https://gitlab.com/group/sub/repo.git'), {
      host: 'gitlab.com',
      authority: 'gitlab.com',
      repoPath: 'group/sub/repo',
    });
  });

  test('剝掉嵌在網址裡的憑證', () => {
    assert.equal(parseRemoteUrl('https://user:token@github.com/o/r.git')?.authority, 'github.com');
  });

  test('http 的埠號保留在 authority、host 不含埠', () => {
    assert.deepEqual(parseRemoteUrl('http://git.local:8080/o/r'), {
      host: 'git.local',
      authority: 'git.local:8080',
      repoPath: 'o/r',
    });
  });

  test('git:// 與 git+ssh://', () => {
    assert.equal(parseRemoteUrl('git://github.com/o/r.git')?.repoPath, 'o/r');
    assert.equal(parseRemoteUrl('git+ssh://git@github.com/o/r.git')?.repoPath, 'o/r');
  });

  test('主機大小寫正規化', () => {
    assert.equal(parseRemoteUrl('git@GitHub.com:o/r.git')?.host, 'github.com');
  });

  test('沒有 .git 尾綴與帶尾斜線', () => {
    assert.equal(parseRemoteUrl('https://github.com/o/r')?.repoPath, 'o/r');
    assert.equal(parseRemoteUrl('https://github.com/o/r.git/')?.repoPath, 'o/r');
  });

  test('拒絕不是遠端網頁的來源', () => {
    assert.equal(parseRemoteUrl(undefined), null);
    assert.equal(parseRemoteUrl('   '), null);
    assert.equal(parseRemoteUrl('/srv/git/repo.git'), null);
    assert.equal(parseRemoteUrl('../sibling.git'), null);
    assert.equal(parseRemoteUrl('file:///srv/git/repo.git'), null);
  });

  test('拒絕不足 owner/repo 兩段的路徑', () => {
    assert.equal(parseRemoteUrl('https://github.com/only'), null);
    assert.equal(parseRemoteUrl('git@github.com:only.git'), null);
  });
});
