import * as assert from 'node:assert/strict';

import { normalizeSeparators, toReferencePath } from '../../src/core/reference/referencePath';

suite('toReferencePath', () => {
  const folder = '/Users/me/proj';

  test('工作區內的檔案給相對路徑', () => {
    assert.equal(toReferencePath('/Users/me/proj/a.ts', folder), 'a.ts');
  });

  test('巢狀目錄保留層級', () => {
    assert.equal(toReferencePath('/Users/me/proj/src/x/b.ts', folder), 'src/x/b.ts');
  });

  test('工作區外的檔案退回絕對路徑', () => {
    assert.equal(toReferencePath('/Users/me/other/c.ts', folder), '/Users/me/other/c.ts');
  });

  test('同名前綴的兄弟目錄不算在工作區內', () => {
    assert.equal(toReferencePath('/Users/me/proj2/c.ts', folder), '/Users/me/proj2/c.ts');
  });

  test('沒有工作區資料夾時給絕對路徑', () => {
    assert.equal(toReferencePath('/Users/me/proj/a.ts', undefined), '/Users/me/proj/a.ts');
  });

  test('路徑等於資料夾本身時給絕對路徑', () => {
    assert.equal(toReferencePath(folder, folder), folder);
  });
});

suite('normalizeSeparators', () => {
  test('反斜線改成斜線', () => {
    assert.equal(normalizeSeparators('src\\a\\b.ts'), 'src/a/b.ts');
  });
});
