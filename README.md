# Secret Chat

正式站：https://sb.02251121.com

本專案以公開 GitHub 儲存庫為唯一版本來源。Codex 雲端修改、GitHub Actions 檢查及部署，均不需要原本電腦保持開機。

## 日常修改

1. 開啟 Codex 雲端，選擇此儲存庫的環境，描述需求。
2. 要求建立修改分支與 Pull Request。每次修改會自動檢查。
3. 檢查結果後合併到 `main`，自動部署聊天網站。不要把未完成修改直接推送到 `main`。
4. 在 GitHub 的 Actions 查看部署結果；綠色成功才代表部署完成。

完整設定、手機入口、部署範圍與復原方式見 [雲端操作說明](docs/cloud-operations.md)。

## 本地或雲端環境

使用 Node.js 22，執行：

```sh
npm ci
npm ci --prefix functions
npm test
npm run build
```

測試使用假資料，不需要正式 LINE 密鑰或正式資料庫權限。

`functions/.env`、密碼清單、備份、位置私鑰與 Firebase 登入憑證不加入版本控制。
正式 Functions 設定由 GitHub Actions 的受保護 Secret 還原。

## 兩個網域

- `firebase.json`：只部署 `daily-notes-7bb64` Hosting site（sb 子網域）。
- `domain-redirect/firebase.json`：只部署 `dn-domain-retire`（主網域轉址）。
- 主網域只有獨立手動工作流程才會部署；聊天網站部署不會觸及它。

資料庫內容不包含在原始碼；程式回復版本不會回復或刪除現有聊天室資料。
