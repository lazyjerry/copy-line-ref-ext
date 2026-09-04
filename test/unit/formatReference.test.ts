import * as assert from 'node:assert/strict';

import { formatReference, selectionToLineRange } from '../../src/core/reference/formatReference';
import type { SelectionLike } from '../../src/core/reference/formatReference';

function selection(startLine: number, startCharacter: number, endLine: number, endCharacter: number): SelectionLike {
  return {
    startLine,
    startCharacter,
    endLine,
    endCharacter,
    isEmpty: startLine === endLine && startCharacter === endCharacter,
  };
}

suite('selectionToLineRange', () => {
  test('沒有選取文字時不帶行號', () => {
    assert.equal(selectionToLineRange(selection(4, 2, 4, 2)), null);
  });

  test('單行選取換成 1-based', () => {
    assert.deepEqual(selectionToLineRange(selection(14, 0, 14, 5)), { startLine: 15, endLine: 15 });
  });

  test('多行選取', () => {
    assert.deepEqual(selectionToLineRange(selection(14, 3, 19, 1)), { startLine: 15, endLine: 20 });
  });

  test('整行選取的結尾落在下一行開頭時，那一行不算', () => {
    assert.deepEqual(selectionToLineRange(selection(14, 0, 16, 0)), { startLine: 15, endLine: 16 });
  });

  test('單行整行選取不會因為修正而變成零行', () => {
    assert.deepEqual(selectionToLineRange(selection(14, 0, 15, 0)), { startLine: 15, endLine: 15 });
  });
});

suite('formatReference', () => {
  test('無行號', () => {
    assert.equal(formatReference('src/a.ts', null), '@src/a.ts');
  });

  test('單行', () => {
    assert.equal(formatReference('src/a.ts', { startLine: 15, endLine: 15 }), '@src/a.ts#L15');
  });

  test('多行', () => {
    assert.equal(formatReference('docs/readme.md', { startLine: 22, endLine: 26 }), '@docs/readme.md#L22-26');
  });

  test('絕對路徑套同一格式', () => {
    assert.equal(formatReference('/tmp/x.ts', { startLine: 1, endLine: 2 }), '@/tmp/x.ts#L1-2');
  });
});
