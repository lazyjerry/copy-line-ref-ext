# Copy Line Ref

以快捷鍵複製目前檔案與選取行的參照（`@src/a.ts#L10-20`），或直接在 GitHub／GitLab／Bitbucket 開啟目前分支的檔案網頁並定位到選取行。

原始碼與問題回報：<https://github.com/lazyjerry/copy-line-ref-ext>

## 功能

- **複製行參照**：`Cmd+Alt+R`（Windows/Linux `Ctrl+Alt+R`）把 `@<路徑>#L<起>-<迄>` 寫進剪貼簿。路徑相對於檔案所在的工作區資料夾；檔案不在任何工作區資料夾時退回絕對路徑，不會像原版 Copy Line Reference 那樣直接放棄。
- **只有選了文字才帶行號**：游標停在某行而沒有選取，只給 `@<路徑>`；單行選取給 `#L15`；跨行給 `#L15-20`。整行選取（shift+↓、三擊）結尾落在下一行開頭時，那一行不會被多算進去。
- **在遠端網頁開啟目前檔案**：`Cmd+Alt+O`（Windows/Linux `Ctrl+Alt+O`）用預設瀏覽器開啟該檔案在**目前分支**的網頁，有選取就帶行號錨點。支援 GitHub、GitLab、Bitbucket，自架站可用設定指定格式。
- **只在遠端真的有這份內容時才開**：沒有 git 儲存庫、detached HEAD、分支沒有 upstream、本機有尚未推送的 commit、檔案尚未加入追蹤、遠端網址不是網頁（本機路徑）——都會跳訊息說明原因而不是開出一個 404。檔案有未提交的修改或本機落後遠端時仍會開，但另外警告行號可能對不上。
- **右鍵選單**：編輯器內右鍵與檔案總管的檔案右鍵都有這兩個指令；從檔案總管觸發沒有選取，複製的是純路徑、開的是檔案頁。
- **不限工作區**：遠端偵測直接呼叫 `git` CLI，從別的工作區開的檔案、或根本沒開工作區的單檔，只要在 git 儲存庫內都能開。

## 使用方式

1. 在編輯器選取要參照的行（或不選，只要檔案），按 `Cmd+Alt+R`，狀態列會短暫顯示複製的內容。
2. 按 `Cmd+Alt+O` 在瀏覽器開啟同一段程式碼的遠端頁面。被拒絕時看訊息：通常是還沒 `git push`。
3. 從命令面板也可執行「Copy Line Ref: 複製行參照」與「Copy Line Ref: 在遠端網頁開啟目前檔案」。

### 快捷鍵

| 指令 | macOS | Windows/Linux |
|---|---|---|
| 複製行參照 | `Cmd+Alt+R` | `Ctrl+Alt+R` |
| 在遠端網頁開啟目前檔案 | `Cmd+Alt+O` | `Ctrl+Alt+O` |

兩組都只在文字編輯區有焦點時生效（`editorTextFocus`）。已知的撞鍵：

- 與 Marketplace 上的 **Copy Line Reference**（`reily.copy-line-reference`）同為 `Cmd+Alt+R`，兩者只留一個。
- macOS 內建 `⌥⌘R` 是 Find 面板的「切換 Regex」，只在文字編輯區有焦點時被本擴充蓋掉，在 Find 輸入框內仍正常。
- Windows/Linux 的 `Ctrl+Alt+R` 與 **PHP Namespace Resolver** 的 Remove Unused 相同。

要改鍵的話在 Keyboard Shortcuts 搜尋 `copyLineRef`。

### 設定

| 設定鍵 | 說明 |
|---|---|
| `copyLineRef.hosts` | 自架 git 主機對應的網頁格式，鍵為 hostname，值為 `github`／`gitlab`／`bitbucket`。例：`{"git.example.com": "gitlab"}`。`github.com`、`gitlab.com`、`bitbucket.org` 免設定；hostname 含 `gitlab`／`github`／`bitbucket` 字樣的自架站也會自動猜。 |
| `git.path` | 沿用 VS Code 內建設定；沒設就用 PATH 上的 `git`。 |

### 網址格式

| 託管服務 | 檔案頁 | 單行 | 多行 |
|---|---|---|---|
| GitHub | `/blob/<分支>/<路徑>` | `#L10` | `#L10-L20` |
| GitLab | `/-/blob/<分支>/<路徑>` | `#L10` | `#L10-20` |
| Bitbucket | `/src/<分支>/<路徑>` | `#lines-10` | `#lines-10:20` |

分支用的是 upstream 的遠端分支名（本機 `feat` 追蹤 `origin/feature-x` 時開 `feature-x`）。

## 限制

- 「已同步」看的是本機的遠端追蹤分支，也就是上次 fetch／push 的結果；別人推上去的新 commit 要 fetch 後才反映。本擴充不會自己 fetch。
- 需要本機有 `git` 執行檔；Remote／WSL 情境下以 extension host 那端的 git 為準。

## 專案結構

```
src/
├── extension.ts              # 唯一 import vscode 的檔案：兩個指令的接線與訊息
├── git/gitQuery.ts           # 跑 git CLI 組出判斷輸入（有副作用，不進 core）
└── core/                     # 純 Node 純函式，不 import vscode（單元測試主體）
    ├── reference/            # 相對／絕對路徑、@path#L 格式
    ├── git/                  # git status v2 解析、遠端網址解析、同步判斷決策表
    └── web/                  # 託管服務判定、檔案網址組合
```

## 開發

```bash
git clone https://github.com/lazyjerry/copy-line-ref-ext.git
cd copy-line-ref-ext
npm install
./scripts/dropbox-ignore.sh   # 專案在 Dropbox 下時必跑（見 CONTRIBUTING.md）
npm run build                 # typecheck + esbuild
npm run test:unit
npm run test:integration      # 會在 /private/tmp 建暫存 git repo 驗遠端判斷
npm run package:vsix
```

按 F5 啟動 Extension Development Host 手動測試。

## 授權

Apache-2.0
