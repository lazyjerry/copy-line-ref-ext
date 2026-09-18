import * as assert from 'node:assert/strict';
import * as path from 'node:path';

import { decideGitGate, isInsideAnyFolder } from '../../src/core/git/workspaceGate';

suite('isInsideAnyFolder', () => {
  test('資料夾內的檔案與巢狀目錄', () => {
    assert.equal(isInsideAnyFolder('/ws/a.txt', ['/ws'], path.posix), true);
    assert.equal(isInsideAnyFolder('/ws/src/deep/a.txt', ['/ws'], path.posix), true);
    assert.equal(isInsideAnyFolder('/ws', ['/ws'], path.posix), true);
  });

  test('多個資料夾任一符合即可', () => {
    assert.equal(isInsideAnyFolder('/b/a.txt', ['/a', '/b'], path.posix), true);
  });

  test('同前綴的兄弟目錄不算在內', () => {
    assert.equal(isInsideAnyFolder('/ws-evil/a.txt', ['/ws'], path.posix), false);
    assert.equal(isInsideAnyFolder('/wsx', ['/ws'], path.posix), false);
  });

  test('上層、外部與沒有資料夾', () => {
    assert.equal(isInsideAnyFolder('/a.txt', ['/ws'], path.posix), false);
    assert.equal(isInsideAnyFolder('/other/a.txt', ['/ws'], path.posix), false);
    assert.equal(isInsideAnyFolder('/ws/a.txt', [], path.posix), false);
  });

  test('名稱以 .. 開頭的子目錄仍在內', () => {
    assert.equal(isInsideAnyFolder('/ws/..hidden/a.txt', ['/ws'], path.posix), true);
  });

  test('Windows 路徑：不同磁碟與同前綴兄弟目錄不算在內', () => {
    assert.equal(isInsideAnyFolder('C:\\ws\\a.txt', ['C:\\ws'], path.win32), true);
    assert.equal(isInsideAnyFolder('D:\\ws\\a.txt', ['C:\\ws'], path.win32), false);
    assert.equal(isInsideAnyFolder('C:\\ws-evil\\a.txt', ['C:\\ws'], path.win32), false);
  });
});

suite('decideGitGate', () => {
  test('受信任且在工作區內才允許', () => {
    assert.equal(decideGitGate({ trusted: true, realFile: path.join(path.sep, 'ws', 'a.txt'), realFolders: [path.join(path.sep, 'ws')] }), 'allowed');
  });

  test('未受信任時優先回報', () => {
    assert.equal(decideGitGate({ trusted: false, realFile: path.join(path.sep, 'ws', 'a.txt'), realFolders: [path.join(path.sep, 'ws')] }), 'untrusted-workspace');
  });

  test('工作區外或路徑解析失敗視為外部', () => {
    assert.equal(decideGitGate({ trusted: true, realFile: path.join(path.sep, 'x', 'a.txt'), realFolders: [path.join(path.sep, 'ws')] }), 'outside-workspace');
    assert.equal(decideGitGate({ trusted: true, realFile: undefined, realFolders: [path.join(path.sep, 'ws')] }), 'outside-workspace');
  });
});
