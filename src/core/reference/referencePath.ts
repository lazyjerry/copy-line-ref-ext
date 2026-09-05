import * as path from 'node:path';

export function normalizeSeparators(p: string): string {
  return p.replace(/\\/g, '/');
}

/** 檔案在工作區資料夾內 → 相對路徑；否則退回絕對路徑。一律以 / 分隔，貼到哪裡都一樣。 */
export function toReferencePath(filePath: string, workspaceFolderPath: string | undefined): string {
  if (workspaceFolderPath !== undefined) {
    const relative = path.relative(workspaceFolderPath, filePath);
    const outside = relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
    if (!outside) {
      return normalizeSeparators(relative);
    }
  }
  return normalizeSeparators(filePath);
}
