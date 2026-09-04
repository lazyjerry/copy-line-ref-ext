import * as assert from 'node:assert/strict';

import { parseStatusV2 } from '../../src/core/git/parseStatus';

const HEADER = ['# branch.oid 0123abc', '# branch.head main', '# branch.upstream origin/main', '# branch.ab +0 -0'];

function output(...lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

suite('parseStatusV2', () => {
  test('只有 header 代表檔案乾淨、分支已同步', () => {
    assert.deepEqual(parseStatusV2(output(...HEADER)), {
      headName: 'main',
      hasUpstream: true,
      ahead: 0,
      behind: 0,
      fileStatus: 'clean',
    });
  });

  test('工作區修改', () => {
    assert.equal(parseStatusV2(output(...HEADER, '1 .M N... 100644 100644 100644 abc def a.txt')).fileStatus, 'modified');
  });

  test('已暫存的修改', () => {
    assert.equal(parseStatusV2(output(...HEADER, '1 M. N... 100644 100644 100644 abc def a.txt')).fileStatus, 'modified');
  });

  test('改名', () => {
    assert.equal(parseStatusV2(output(...HEADER, '2 R. N... 100644 100644 100644 abc def R100 b.txt\ta.txt')).fileStatus, 'modified');
  });

  test('未追蹤', () => {
    assert.equal(parseStatusV2(output(...HEADER, '? new.txt')).fileStatus, 'untracked');
  });

  test('detached HEAD', () => {
    const status = parseStatusV2(output('# branch.oid 0123abc', '# branch.head (detached)'));
    assert.equal(status.headName, undefined);
    assert.equal(status.hasUpstream, false);
  });

  test('沒有 upstream 就沒有 ab 行', () => {
    const status = parseStatusV2(output('# branch.oid 0123abc', '# branch.head feature'));
    assert.equal(status.hasUpstream, false);
    assert.equal(status.ahead, undefined);
  });

  test('有 upstream 但遠端追蹤分支消失時沒有 ab 行', () => {
    const status = parseStatusV2(output('# branch.oid 0123abc', '# branch.head feature', '# branch.upstream origin/feature'));
    assert.equal(status.hasUpstream, true);
    assert.equal(status.ahead, undefined);
    assert.equal(status.behind, undefined);
  });

  test('ahead / behind 數字', () => {
    const status = parseStatusV2(output('# branch.oid 0123abc', '# branch.head main', '# branch.upstream origin/main', '# branch.ab +3 -2'));
    assert.equal(status.ahead, 3);
    assert.equal(status.behind, 2);
  });

  test('尚未有 commit 的 repo', () => {
    const status = parseStatusV2(output('# branch.oid (initial)', '# branch.head main', '? a.txt'));
    assert.equal(status.headName, 'main');
    assert.equal(status.fileStatus, 'untracked');
  });
});
