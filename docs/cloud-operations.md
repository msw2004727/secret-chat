# 雲端操作說明

## 帳號與資源

- 公開原始碼： https://github.com/msw2004727/secret-chat
- Codex 雲端： https://chatgpt.com/codex/cloud
- 雲端環境設定： https://chatgpt.com/codex/cloud/settings/environments
- 部署紀錄： https://github.com/msw2004727/secret-chat/actions
- Firebase 專案： `daily-notes-7bb64`

用其他電腦或手機瀏覽器登入有權限的 ChatGPT 帳號，選擇此儲存庫的雲端環境。不要選擇依賴家中電腦的 Remote 任務。一般聊天與本機資料夾不會自動成為雲端專案。

Codex setup script：

```sh
npm ci
npm ci --prefix functions
```

需要 Node 22。Codex 環境不需要正式 Firebase 或 LINE 密鑰。新的任務可閱讀 AGENTS.md 與本文件了解專案約束。

## 部署

Pull Request 會執行離線測試與公開檔案打包。合併 main 後，聊天網站部署流程執行相同檢查，然後發布 Hosting；Functions 或規則有修改時會一併部署對應項目。也能從 Actions 手動選擇 hosting 或 full，full 包含 Functions、Realtime Database 規則及 Storage 規則。

主網域使用獨立的 Root domain redirect 工作流程，必須手動輸入 `02251121.com` 才會部署。這不會變更 sb 子網域。

Actions 使用 GitHub OIDC 向 Google 取得短效部署憑證；Google 身分條件限制此儲存庫數字 ID、擁有者 ID 與 main 分支。不要改成永久 Firebase token。

Functions 的環境設定在 GitHub Secret `FUNCTIONS_ENV`，部署時暫時寫入 functions/.env，結束後清除。不可輸出到日誌。要換密鑰時更新 Secret 再部署 Functions。

首頁預設密碼與固定關閉密碼使用 `HOME_DEFAULT_PASSWORD`、`HOME_DISABLE_PASSWORD`，值只放在上述 Secret。未設定時驗證會拒絕，不會改用公開預設密碼。

部署帳戶僅能更新既有後端，不能刪除或建立新 Functions、修改專案 IAM 或存取 Storage 檔案。新增後端資源需要另行檢查所需權限。自訂角色清單見 backend-deploy-role.json。

## 免費方案與公開範圍

此儲存庫公開，Actions 使用免費標準 GitHub-hosted Linux runner，不使用付費大型執行器。GitHub Actions 免費不代表 Firebase 或 Codex 的使用費用免費：兩者沿用各自方案與用量規則。

原始碼可被任何人讀取；LINE 密鑰、推播私鑰與首頁密碼放在 GitHub Secret，聊天室和定位紀錄留在 Firebase。本機舊歷史分支 bootstrap-private 與私人儲存庫 secret-chat-private-archive 可能包含舊敏感設定，絕對不可 push --all 或公開。

2026-09-22 已以 GitHub 雲端 runner 驗證 Hosting、現有 Functions、Realtime Database 規則與 Storage 規則部署成功，並比對正式網站與主網域轉址。

## 測試與預覽

目前測試採離線假資料，不寫入正式資料庫。尚未建立隔離的測試 Firebase 專案。不要把普通 Hosting preview 當成資料隔離：它可能仍使用正式登入、聊天室、定位及推播。

如需正式整合預覽，先建立獨立 Firebase 測試專案與 LINE callback 設定，再放入假資料；不要複製正式用戶資料。

## 復原

程式出錯時，在 GitHub 對出錯修改建立 revert PR，通過檢查後合併並重新部署。Functions 的復原也是重新部署上一版程式，並非資料庫還原。

正式聊天室資料留在 Firebase，不會隨 git commit 自動備份。資料誤刪需要事先存在的獨立資料備份；本次雲端原始碼遷移不會建立或匯出私人聊天室資料備份。

## 尚未上傳的本機檔案

原本密碼清單、備份 ZIP、位置私鑰工具與舊部署文件留在原電腦，不作為雲端專案依賴。請自行保管實際位置解密私鑰；原始碼儲存庫不保存該私鑰。
