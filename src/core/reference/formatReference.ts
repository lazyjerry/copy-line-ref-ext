/** 1-based、含頭尾。 */
export interface LineRange {
  startLine: number;
  endLine: number;
}

/** vscode.Selection 的 plain 版本（0-based），核心層不 import vscode。 */
export interface SelectionLike {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
  isEmpty: boolean;
}

/** 只有真的選了文字才帶行號；游標停在某行不算（沿用原版 Copy Line Reference 的規則）。 */
export function selectionToLineRange(selection: SelectionLike): LineRange | null {
  if (selection.isEmpty) {
    return null;
  }
  let endLine = selection.endLine;
  // 整行選取（shift+down、三擊）的結尾落在下一行第 0 字元，那一行其實沒選到
  if (selection.endCharacter === 0 && endLine > selection.startLine) {
    endLine -= 1;
  }
  return { startLine: selection.startLine + 1, endLine: endLine + 1 };
}

export function formatReference(referencePath: string, range: LineRange | null): string {
  if (range === null) {
    return `@${referencePath}`;
  }
  if (range.startLine === range.endLine) {
    return `@${referencePath}#L${range.startLine}`;
  }
  return `@${referencePath}#L${range.startLine}-${range.endLine}`;
}
