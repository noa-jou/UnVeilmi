# UnVeilmi

[English](README.md)

> **把 Veilmi 密文藏到別的地方。  
> 讓日常對話只承載線索。**

<p align="center">
  <a href="https://github.com/noa-jou/Veilmi">
    <img src="docs/images/veilmi_icon.png"
         width="100"
         height="100"
         alt="Veilmi icon">
  </a>
</p>

> **Veilmi 負責加/解密。  
> UnVeilmi 負責儲存 Veilmi 密文。**

<p align="center">
  <img src="docs/images/UnVeilmi.png"
       width="100"
       height="100"
       alt="UnVeilmi icon">
</p>

UnVeilmi 是一個概念驗證（Proof of Concept），用來展示一種不同的加密通訊流程。

如果你直接把一大段加密訊息貼進 LINE、工作聊天軟體，或其他日常通訊工具裡，整段對話看起來立刻就會像是有人正在交換密文。

UnVeilmi 把這兩件事分開。

日常聊天裡只需要傳送一個短短的 **Article Name** ——你也可以把它理解成一條線索。

```text
可見的日常對話
"did you get home"
        ↓
Article Name（線索）
        ↓
UnVeilmi（Find）找到密文
        ↓
Veilmi（Decrypt）解密
        ↓
真正的訊息
```

UnVeilmi 負責儲存和找回密文。

Veilmi 則在本機負責加密和解密。

這個設計的目的，是不要把密文本身直接放進「正常」的聊天頻道裡，讓加密通訊在視覺上不那麼顯眼。

---

## Demo

https://github.com/user-attachments/assets/915d369c-38eb-4753-a362-70306c49f0ac

這個 Demo 展示 Noa 和 Kate 在 LINE 上的一段對話。

一開始，它看起來非常普通：

```text
Noa: did you get home
Kate: yeah just got back
```

但每一則看得見的訊息，同時也是 UnVeilmi 的 **Article Name**。

在影片裡：

```text
did you get home
```

會被拿到 UnVeilmi 裡搜尋。

UnVeilmi 會回傳一段密文。

接著，把這段密文複製到 Veilmi，並使用雙方事先共享的 Demo 密碼進行解密。

隱藏訊息是：

```text
我（Noa）中樂透了！
```

下一則看得見的 LINE 訊息：

```text
yeah just got back
```

解開後，會看到 Kate 說：

```text
等一下。真的嗎？你中了多少？
```

然後 Demo 就停在這裡。

後面的對話是一個 Easter Egg。

想自己把故事繼續看下去嗎？

請看：

[Easter Egg Guide](docs/Easter_Egg_Guide.md)

---

## 為什麼 Veilmi 很重要

UnVeilmi 不會加密，也不會解密訊息。

這是刻意的設計。

真正處理秘密的工具，仍然是本機上的 **Veilmi**。

```text
明文 + 密碼
        ↓
      Veilmi
        ↓
   VEILMI1 密文
        ↓
     UnVeilmi
```

UnVeilmi 伺服器不需要知道明文，也不需要知道 Veilmi 的密碼。

這是整個專案中最重要的設計邊界之一。

如果你想試玩 Demo，或自己使用這個流程，可以先從 [取得 Veilmi](https://noa-jou.github.io/Veilmi/closed-testing.zh.html) 開始。

---

## 運作方式

### Publish

```text
在 Veilmi 輸入明文
        ↓
在本機加密
        ↓
複製 VEILMI1 密文
        ↓
開啟 UnVeilmi
        ↓
選擇 Article Name
        ↓
選擇儲存時間
        ↓
Publish
```

### Find

```text
收到 Article Name
        ↓
開啟 UnVeilmi
        ↓
找回密文
        ↓
複製密文
        ↓
開啟 Veilmi
        ↓
輸入雙方共享的密碼
        ↓
在本機解密
```

Article Name 只是一個定位方式／線索。

它不是密碼，也不應該被當成秘密。

---

## 更大的想法

UnVeilmi 目前只是一個在本機執行的概念驗證（PoC）。

但這個概念本來就不只打算停在本機。

未來，如果有公開的 UnVeilmi 服務，需要這種通訊方式的人就可以直接使用，而不必自己架設伺服器。

團隊或組織也可以修改這個專案，並把自己的版本部署在自己控制的基礎設施上。

例如，一個內部部署的情況可能是：

```text
原本就有的工作聊天工具
        ↓
傳送短短的 Article Name（線索）

--

由組織自行營運的 UnVeilmi
        ↓
暫時儲存密文，讓預定的使用者可以取回 

--

每位使用者裝置上都有 Veilmi 
        ↓
在本機解密
```

> 很抱歉，目前 Apple Developer Program 每年 US$99 的費用對我來說還是有點太高，所以暫時沒有 iOS 版本。
[Veilmi](https://github.com/noa-jou/Veilmi) 是用 Flutter 開發的，也已經開源；如果你有興趣，歡迎 fork 這個專案，嘗試把它帶到 iOS 或其他平台上。

---

## 為什麼 UnVeilmi 很重要

當人們需要交換正當而敏感的文字內容，同時又希望一般聊天紀錄保持簡單、普通時，這種做法可能會有用。

例如：

- 內部團隊討論私人草稿；
- 小型組織把敏感筆記和一般聊天紀錄分開；
- 研究團隊測試保護隱私的通訊流程；
- 組織想自行控制密文儲存方式，因此使用自行營運的環境。

雖然 UnVeilmi 目前並不是正式的生產環境服務。任何真正的部署仍然需要適當的基礎設施、政策、安全措施和法律審查。

但這個 PoC 的目的，就是要證明這種通訊模式本身是可以運作的。

---

## 自行託管的願景

UnVeilmi 很適合被修改和延伸。

開發者、小型團隊或組織都可以 fork 這個專案，然後修改 hostname、儲存規則、保留時間等等。

同時保留核心概念：

```text
日常通訊頻道：承載定位資訊／線索／Article Name

UnVeilmi：保存密文

Veilmi：處理真正的訊息
```

私人部署可以運行在組織自己的伺服器上，不過，所以如果要正式部署，還需要額外完成 HTTPS、速率限制、監控、濫用防護，以及基礎設施強化等工作。

想了解目前這 PoC 設計選擇背後的原因，請看：

[Design Decisions — §7 Why Is the Current PoC Local?](docs/Design_Decisions.md#7-why-is-the-current-poc-local)

UnVeilmi 是刻意避免把自己變成完整的社群網路或即時通訊平台。

---

## 目前的專案結構

| 部分 | 目前實作 |
|---|---|
| 前端 | HTML / CSS / JavaScript |
| 後端 | Python / FastAPI |
| 資料庫 | SQLite |
| 付款 | 僅模擬 |
| 部署 | 僅限本機 |
| 帳號 | 無 |

完整架構請看：[Architecture](docs/Architecture.md)

---

## 快速開始

### 1. 建立資料庫

[Database Setup](docs/Set_Up_DB.md)

### 2. 啟動後端

[Backend Setup](docs/Set_Up_Backend.md)

### 3. 啟動前端

[Frontend Setup](docs/Set_Up_Frontend.md)

### 4. 執行測試

[Auto Testing](docs/Auto_Testing.md)

### 5. 自己手動試玩

完成步驟 1–4 之後，只要打開瀏覽器，就可以開始玩：

[http://127.0.0.1:5500](http://127.0.0.1:5500)

---

## 完整文件列表

| 文件 | 內容 |
|---|---|
| [Architecture](docs/Architecture.md) | 元件、Publish / Find 流程、後端、資料庫、信任邊界和本機環境 |
| [Security Model](docs/Security_Model.md) | 威脅模型、為什麼這種分離方式更安全、驗證、CORS、metadata 和限制 |
| [Pricing and Storage](docs/Pricing_and_Storage.md) | 免費額度、價格公式、儲存時間、到期、清理，以及 Article Name 重複使用 |
| [Auto Testing](docs/Auto_Testing.md) | 自動化後端和前端開發測試 |
| [Database Setup](docs/Set_Up_DB.md) | 建立、檢查和測試 SQLite 資料庫 |
| [Backend Setup](docs/Set_Up_Backend.md) | 安裝相依套件並啟動 FastAPI 後端 |
| [Frontend Setup](docs/Set_Up_Frontend.md) | 啟動本機 Web 前端並連接後端 |
| [Design Decisions](docs/Design_Decisions.md) | 為什麼做出主要的產品與架構設計選擇 |
| [Easter Egg Guide](docs/Easter_Egg_Guide.md) | 重現 Kate / Noa 的隱藏訊息 Demo |

---

## PoC 的限制

目前我尚未提供：

- 公開的 UnVeilmi 服務；
- 正式生產環境的 HTTPS 部署；
- 身分驗證；
- 速率限制；
- 濫用偵測；
- 正式環境監控；
- 真實付款處理；
- 完全匿名；
- 專業資安稽核；
- 密碼學審查。

這個專案的目的是展示架構並啟發後續開發，而不是宣稱它已經可以直接用在正式生產環境。

---

## 授權

UnVeilmi 使用：

**GNU Affero General Public License v3.0 (AGPL-3.0)**

歡迎研究、修改和部署這個專案。

對於透過網路提供服務的修改版本，AGPL-3.0 的目的，是讓這些改進仍然可以回饋給開源社群。

完整授權內容請看 repository 裡的 [LICENSE](LICENSE)。

---

## 作者

**Noa Jou**

（在 ChatGPT 的協助下完成）

UnVeilmi 是 [Veilmi](https://github.com/noa-jou/Veilmi) 的伴生專案。

我希望這個專案最後可以不只是一個本機 Demo, 而是：

- 成為提供給需要這種通訊模式的人使用的公開服務；
- 成為團隊可以自行修改和部署的自行託管工具；
- 或者成為一個可以由其他開發者繼續延伸的想法。

如果 UnVeilmi 讓你感到好奇，也歡迎看看 [Veilmi](https://github.com/noa-jou/Veilmi)。

---

### 我意外在開發時學到的東西

[GitHub_Actions_Docs_Check_Learning_Note](docs/GitHub_Actions_Docs_Check_Learning_Note.md)

[How_to_Prepare_and_Add_a_Video_to_README](docs/How_to_Prepare_and_Add_a_Video_to_README.md)

---

### 如果你想支持我繼續創作

[Buy me a coffee](https://buymeacoffee.com/noajou)
