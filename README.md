# Portfolio API with Google Apps Script

スプレッドシートのデータをGETリクエストで取得できるAPIです。

## セットアップ

### 1. claspのインストールと認証

```bash
npm install -g @google/clasp
clasp login
```

### 2. スプレッドシートの準備

1. 新しいGoogleスプレッドシートを作成
2. スプレッドシートのIDをコピー（URLの`/d/`と`/edit`の間の文字列）

### 3. プロジェクトの作成

```bash
# プロジェクトディレクトリを作成
mkdir portfolio-api
cd portfolio-api

# srcディレクトリを作成してファイルを配置
mkdir src
# Code.js と appsscript.json を src/ に配置

# 新しいGASプロジェクトを作成
clasp create --type standalone --title "Portfolio API"

# または既存のスプレッドシートに紐付ける場合
clasp create --type sheets --title "Portfolio API"
```

### 4. 設定ファイルの編集

`src/Code.js`の以下の部分を編集：

```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // スプレッドシートのIDに置き換え
const SHEET_NAME = 'Portfolio'; // 必要に応じてシート名を変更
```

### 5. スプレッドシートの初期化

```bash
# コードをデプロイ
clasp push

# Googleスクリプトエディタを開く
clasp open

# スクリプトエディタで`initializeSpreadsheet`関数を実行
# 実行 > 関数を実行 > initializeSpreadsheet
```

これにより、ヘッダー行とサンプルデータが自動的に作成されます。

### 6. Webアプリとしてデプロイ

1. スクリプトエディタで「デプロイ」>「新しいデプロイ」を選択
2. 種類を「ウェブアプリ」に設定
3. 設定：
   - 説明: `Portfolio API v1`
   - 次のユーザーとして実行: `自分`
   - アクセスできるユーザー: `全員`（公開APIの場合）
4. 「デプロイ」をクリック
5. ウェブアプリのURLをコピー

## .clasp.json の設定

プロジェクトルートに `.clasp.json` を作成：

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./src"
}
```

`scriptId` は `clasp create` 実行後に表示されるIDを使用します。

## スプレッドシートの構造

| ID | Title | Description | Image URL | Tags (カンマ区切り) | Links (Label:URL形式、カンマ区切り) | Is Commission (true/false) |
|----|-------|-------------|-----------|---------------------|-------------------------------------|----------------------------|
| project-001 | Sample Project | Description here | https://... | React, TypeScript | GitHub:https://..., Demo:https://... | false |

### 各列の説明

- **ID**: プロジェクトの一意な識別子
- **Title**: プロジェクトのタイトル
- **Description**: プロジェクトの説明
- **Image URL**: プロジェクトの画像URL
- **Tags**: カンマ区切りのタグ（例: `React, TypeScript, GAS`）
- **Links**: `Label:URL`形式をカンマで区切る（例: `GitHub:https://..., Demo:https://...`）
- **Is Commission**: 受託案件かどうか（`true` or `false`）

## API使用方法

### 全アイテムを取得

```bash
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

### 特定のアイテムを取得

```bash
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?id=project-001"
```

## レスポンス例

```json
[
  {
    "id": "project-001",
    "title": "Sample Portfolio Site",
    "description": "This is a sample portfolio website built with React and TypeScript",
    "imageUrl": "https://example.com/image1.jpg",
    "tags": ["React", "TypeScript", "Tailwind CSS"],
    "links": [
      {
        "label": "GitHub",
        "url": "https://github.com/example/project1"
      },
      {
        "label": "Demo",
        "url": "https://example.com/demo1"
      }
    ],
    "isCommision": false
  }
]
```

## 開発ワークフロー

### コードの更新

```bash
# ローカルのコードをGASにプッシュ
clasp push

# GASのコードをローカルにプル
clasp pull
```

### ログの確認

```bash
# 最新のログを表示
clasp logs
```

## フロントエンドでの使用例

```typescript
// TypeScript
type ApiResponseItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  links: {
    label: string;
    url: string;
  }[];
  isCommision: boolean;
};

// データ取得関数
async function fetchPortfolioItems(): Promise<ApiResponseItem[]> {
  const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
  
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio items');
    }
    const data: ApiResponseItem[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching portfolio items:', error);
    return [];
  }
}

// 使用例
async function displayPortfolio() {
  const items = await fetchPortfolioItems();
  console.log(items);
}
```

## プロジェクト構造

```
portfolio-api/
├── .clasp.json          # clasp設定ファイル
├── .gitignore
├── package.json
├── README.md
└── src/
    ├── Code.js          # メインのGASコード
    └── appsscript.json  # GAS設定ファイル
```

## セキュリティに関する注意

- デプロイ時に「アクセスできるユーザー」を適切に設定してください
- 公開APIとして使用する場合、機密情報を含めないようにしてください
- 必要に応じて、認証機能やレート制限の追加を検討してください

## トラブルシューティング

### エラー: "Sheet not found"

- `SHEET_NAME`が正しいか確認
- `initializeSpreadsheet`関数を実行してシートを作成

### デプロイ後にデータが更新されない

- 新しいバージョンとしてデプロイするか、既存のデプロイを更新

### CORS エラー

- Webアプリのデプロイ設定で「アクセスできるユーザー」が「全員」になっているか確認

## ライセンス

MIT
