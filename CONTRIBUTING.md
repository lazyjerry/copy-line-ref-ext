# 開發指南

## 需求

- Node.js 22+
- `git` 在 PATH 上（整合測試會建暫存 repo）
- macOS（`scripts/make-icon.sh` 依賴 sips；其他平台可略過）

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm run build` | typecheck（tsc --noEmit）+ esbuild bundle 到 `out/extension.js` |
| `npm run lint` | eslint flat config |
| `npm run test:unit` | tsc 編譯後以 mocha 跑 `test/unit/`（純 Node，不開 VSCode） |
| `npm run test:integration` | 下載測試用 VSCode 跑 `test/integration/`，會在 `/private/tmp` 建暫存工作區與 git repo |
| `npm run check` | lint + build + 全部測試 |
| `npm run package:vsix` | check 後以 vsce 打包（`--no-dependencies`，extension 已 bundle） |
| `./scripts/install-local.sh` | 打包並安裝到本機 VS Code（`--fast` 跳過 lint 與測試） |
| `./scripts/publish.sh patch\|minor\|major` / `./scripts/publish.sh` | 升版、發布到 Marketplace |

## 結構原則

- `src/core/` 是純 Node 純函式，**絕不 import vscode、不碰檔案系統與子行程**——單元測試靠它。「要不要開遠端、為什麼不開」全在 `core/git/syncDecision.ts` 的決策表，`extension.ts` 只負責把 vscode 的 editor／selection／設定轉成 plain object，再把結果換成訊息。
- `src/git/gitQuery.ts` 是唯一跑 `git` 的地方，只組資料不做判斷；指令輸出的解析放 `core/git/parseStatus.ts` 以便用 fixture 字串測。
- 遠端偵測刻意不用 VS Code 內建 Git extension API：它對工作區外的檔案預設不開所屬 repo，CLI 沒有這個限制。

## 環境注意事項

- 專案在 Dropbox 下：**任何會產生 `node_modules/`、`out/`、`.vscode-test/` 的動作後，跑 `./scripts/dropbox-ignore.sh`**，避免同步大量暫存檔與觸發 macOS App Management 權限提示。
- 整合測試噴 `bad option: --disable-extensions` = 環境繼承了 `ELECTRON_RUN_AS_NODE`；`test/runTest.ts` 已處理，勿移除。
- 整合測試 `listen EINVAL ...main.sock` = 專案路徑（含中文）太長；`test/runTest.ts` 已改用 `/private/tmp` 下短路徑的 `--user-data-dir`，勿移除。
- 測試跑的是 `out/` 下的 tsc 產物，改完 code 要先編譯（`npm run test:unit` 已包含）。
