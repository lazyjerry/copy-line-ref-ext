# Changelog

本檔案記錄 Copy Line Ref 的版本變更，格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added

- **複製行參照**指令與 `Cmd+Alt+R`／`Ctrl+Alt+R`：把 `@<路徑>#L<起>-<迄>` 寫進剪貼簿。路徑相對於工作區資料夾，不在工作區內時退回絕對路徑；只有選了文字才帶行號，整行選取不會多算下一行。
- **在遠端網頁開啟目前檔案**指令與 `Cmd+Alt+O`／`Ctrl+Alt+O`：用 `git` CLI 判斷檔案所在儲存庫、目前分支與 upstream，分支已推送且檔案已追蹤時，在瀏覽器開啟 GitHub／GitLab／Bitbucket 的檔案頁並帶行號錨點；否則以訊息說明原因（不是儲存庫、detached HEAD、沒有 upstream、有未推送的 commit、檔案未追蹤、遠端網址不是網頁、不支援的主機）。有未提交修改或落後遠端時仍開，另外警告。
- 編輯器右鍵與檔案總管檔案右鍵各掛上述兩個指令。
- 設定 `copyLineRef.hosts`：自架 git 主機對應到 `github`／`gitlab`／`bitbucket` 的網頁格式。
