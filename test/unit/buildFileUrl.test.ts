import * as assert from 'node:assert/strict';

import { buildFileUrl, encodePathSegments } from '../../src/core/web/buildFileUrl';
import type { FileUrlInput } from '../../src/core/web/buildFileUrl';

const base: FileUrlInput = {
  provider: 'github',
  authority: 'github.com',
  repoPath: 'o/r',
  branch: 'main',
  filePath: 'src/a.ts',
  range: null,
};

suite('buildFileUrl', () => {
  test('GitHub：無行號、單行、多行', () => {
    assert.equal(buildFileUrl(base), 'https://github.com/o/r/blob/main/src/a.ts');
    assert.equal(buildFileUrl({ ...base, range: { startLine: 10, endLine: 10 } }), 'https://github.com/o/r/blob/main/src/a.ts#L10');
    assert.equal(buildFileUrl({ ...base, range: { startLine: 10, endLine: 20 } }), 'https://github.com/o/r/blob/main/src/a.ts#L10-L20');
  });

  test('GitLab：無行號、單行、多行', () => {
    const gitlab: FileUrlInput = { ...base, provider: 'gitlab', authority: 'gitlab.com', repoPath: 'g/sub/r' };
    assert.equal(buildFileUrl(gitlab), 'https://gitlab.com/g/sub/r/-/blob/main/src/a.ts');
    assert.equal(buildFileUrl({ ...gitlab, range: { startLine: 10, endLine: 10 } }), 'https://gitlab.com/g/sub/r/-/blob/main/src/a.ts#L10');
    assert.equal(buildFileUrl({ ...gitlab, range: { startLine: 10, endLine: 20 } }), 'https://gitlab.com/g/sub/r/-/blob/main/src/a.ts#L10-20');
  });

  test('Bitbucket：無行號、單行、多行', () => {
    const bitbucket: FileUrlInput = { ...base, provider: 'bitbucket', authority: 'bitbucket.org' };
    assert.equal(buildFileUrl(bitbucket), 'https://bitbucket.org/o/r/src/main/src/a.ts');
    assert.equal(buildFileUrl({ ...bitbucket, range: { startLine: 10, endLine: 10 } }), 'https://bitbucket.org/o/r/src/main/src/a.ts#lines-10');
    assert.equal(buildFileUrl({ ...bitbucket, range: { startLine: 10, endLine: 20 } }), 'https://bitbucket.org/o/r/src/main/src/a.ts#lines-10:20');
  });

  test('分支含斜線時保留層級', () => {
    assert.equal(buildFileUrl({ ...base, branch: 'feature/x' }), 'https://github.com/o/r/blob/feature/x/src/a.ts');
  });

  test('路徑含空白與中文時逐段 encode', () => {
    assert.equal(buildFileUrl({ ...base, filePath: 'docs/使用 說明.md' }), 'https://github.com/o/r/blob/main/docs/%E4%BD%BF%E7%94%A8%20%E8%AA%AA%E6%98%8E.md');
  });

  test('authority 帶埠號', () => {
    assert.equal(buildFileUrl({ ...base, provider: 'gitlab', authority: 'git.local:8080' }), 'https://git.local:8080/o/r/-/blob/main/src/a.ts');
  });
});

suite('encodePathSegments', () => {
  test('# 與 ? 這類會截斷 URL 的字元要 encode', () => {
    assert.equal(encodePathSegments('a#b/c?d'), 'a%23b/c%3Fd');
  });
});
