import * as path from 'node:path';

/**
 * 兩者都要是 realpath 過的絕對路徑：symlink 先解開，才不會讓工作區內的連結把 git 帶到外部 repo。
 * 資料夾本身也算在內；同前綴的兄弟目錄（/ws 與 /ws-evil）不算。
 */
export function isInsideAnyFolder(realFile: string, realFolders: readonly string[], pathApi: path.PlatformPath = path): boolean {
  return realFolders.some((folder) => {
    const relative = pathApi.relative(folder, realFile);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${pathApi.sep}`) && !pathApi.isAbsolute(relative));
  });
}

export type GitGateResult = 'allowed' | 'untrusted-workspace' | 'outside-workspace';

/**
 * git 會照 repo 的 .git/config 執行 filter.<名>.clean 這類外部指令，-c 關不完，
 * 所以只對「受信任工作區裡的檔案」跑 git。realFile 為 undefined 表示路徑解析失敗，一律視為外部。
 */
export function decideGitGate(input: { trusted: boolean; realFile: string | undefined; realFolders: readonly string[] }): GitGateResult {
  if (!input.trusted) {
    return 'untrusted-workspace';
  }
  if (input.realFile === undefined || !isInsideAnyFolder(input.realFile, input.realFolders)) {
    return 'outside-workspace';
  }
  return 'allowed';
}
