# Changelog

本檔案記錄 At Line Ref 的版本變更，格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

## [0.1.3] - 2026-09-19

### Security

- 安全性修正：「在遠端網頁開啟目前檔案」只對位於工作區資料夾內（解開 symlink 後比對）且工作區已受信任的檔案執行 `git`。儲存庫可在 `.git/config` 設定 `filter.<名>.clean` 並搭配 `.gitattributes`，讓 `git status` 執行任意指令，這無法用 `-c` 全部關掉；工作區外的檔案改為不查 git，提示「檔案不在工作區內，未查詢 git」。複製行參照不受影響。

## [0.1.2] - 2026-09-19

### Security

- 安全性修正：查詢檔案所在儲存庫狀態時，所有 `git` 指令都加上 `-c core.fsmonitor=false`，開啟外來目錄的檔案後按 `Cmd+Alt+O` 不會再執行該儲存庫 `.git/config` 裡 `core.fsmonitor` 指定的程式。
- 安全性修正：遠端網址的主機段含有多個 `@`（如 `x@github.com@evil.com:o/r`）時視為無法轉成網頁，不再被認成 GitHub 並開出 `https://github.com@evil.com/...`；託管服務改依主機名比對公開主機與其子網域，不合法的主機名一律不認。
- 在 `package.json` 宣告不支援受限模式（Restricted Mode）的工作區。

## [0.1.1] - 2026-09-04

### Changed

- 複製行參照成功後改為右下角通知顯示複製內容，原本只在狀態列短暫顯示 3 秒。

## [0.1.0] - 2026-09-04

### Added

- **複製行參照**指令與 `Cmd+Alt+R`／`Ctrl+Alt+R`：把 `@<路徑>#L<起>-<迄>` 寫進剪貼簿。路徑相對於工作區資料夾，不在工作區內時退回絕對路徑；只有選了文字才帶行號，整行選取不會多算下一行。
- **在遠端網頁開啟目前檔案**指令與 `Cmd+Alt+O`／`Ctrl+Alt+O`：用 `git` CLI 判斷檔案所在儲存庫、目前分支與 upstream，分支已推送且檔案已追蹤時，在瀏覽器開啟 GitHub／GitLab／Bitbucket 的檔案頁並帶行號錨點；否則以訊息說明原因（不是儲存庫、detached HEAD、沒有 upstream、有未推送的 commit、檔案未追蹤、遠端網址不是網頁、不支援的主機）。有未提交修改或落後遠端時仍開，另外警告。
- 編輯器右鍵與檔案總管檔案右鍵各掛上述兩個指令。
- 設定 `copyLineRef.hosts`：自架 git 主機對應到 `github`／`gitlab`／`bitbucket` 的網頁格式。
