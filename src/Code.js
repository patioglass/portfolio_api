/**
 * スプレッドシートの設定
 */
const props = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = props.getProperty('SPREADSHEET_ID');
const SHEET_NAME = props.getProperty('SHEET_NAME'); // シート名

/**
 * 型定義（参考用 - GASではTypeScriptの型は使えませんが、コメントとして残しています）
 *
 * type ApiResponseItem = {
 *   id: number;      // ループのインデックス番号（0始まり）
 *   title: string;
 *   description: string;
 *   imageUrl: string;
 *   tags: string[];
 *   links: {
 *     label: string;
 *     url: string;
 *   }[];
 *   isCommision: boolean;
 * };
 *
 * スプレッドシートの固定カラム（0-indexed）:
 * 0: title
 * 1: description
 * 2: imageUrl
 * 3: tags
 * 4: isCommision
 * 5: Amazon (リンク)
 * 6: DLsite (リンク)
 * 7: 公式サイト (リンク)
 * 8: Youtube (リンク)
 * 9: ニコニコ (リンク)
 * 10: メロンブックス (リンク)
 * 11: リンク (リンク)
 */

/**
 * GETリクエストを処理するエンドポイント
 */
function doGet(e) {
  try {
    // CORSヘッダーを設定
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    // スプレッドシートからデータを取得
    const items = getPortfolioItems();

    // 全アイテムを返す
    output.setContent(JSON.stringify(items));
    return output;
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createErrorResponse('Internal server error: ' + error.toString(), 500);
  }
}

/**
 * スプレッドシートからポートフォリオアイテムを取得
 *
 * パフォーマンス最適化:
 * - ヘッダー行の読み取りを省略し、固定カラム位置を使用
 * - Google Spreadsheet APIの呼び出し回数を最小限に抑えてレスポンス速度を向上
 */
function getPortfolioItems() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }

  // 固定カラム数（パフォーマンス最適化のため固定値を使用）
  const COLUMN_COUNT = 12;

  // 固定カラムインデックス（ヘッダー行の名前に対応）
  const COL = {
    title: 1,
    description: 2,
    imageUrl: 3,
    tags: 4,
    isCommision: 5,
    Amazon: 6,
    DLsite: 7,
    公式サイト: 8,
    Youtube: 9,
    ニコニコ: 10,
    メロンブックス: 11,
    リンク: 12
  };

  // データ範囲を取得
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return []; // データがない場合は空配列を返す
  }

  // データ行のみを取得（ヘッダー行をスキップ、API呼び出し1回のみ）
  const values = sheet.getRange(2, 1, lastRow - 1, COLUMN_COUNT).getValues();

  // リンクカラムのキー一覧
  const LINK_KEYS = ['Amazon', 'DLsite', '公式サイト', 'Youtube', 'ニコニコ', 'メロンブックス', 'リンク'];

  // データを整形（idはループのインデックス番号を使用）
  const items = values
    .filter(row => row[COL.title] !== undefined && row[COL.title] !== '')
    .map((row, index) => ({
      id: index,
      title: String(row[COL.title] || ''),
      description: String(row[COL.description] || ''),
      imageUrl: String(row[COL.imageUrl] || ''),
      tags: parseTags(row[COL.tags]),
      links: LINK_KEYS
        .map(key => ({
          label: key,
          url: String(row[COL[key]] || '')
        }))
        .filter(link => link.url),
      isCommision: parseBoolean(row[COL.isCommision])
    }));

  return items;
}

/**
 * タグ文字列を配列にパース
 * 例: "React, TypeScript, GAS" -> ["React", "TypeScript", "GAS"]
 */
function parseTags(tagsString) {
  if (!tagsString) return [];
  
  return String(tagsString)
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * 真偽値にパース
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  
  const strValue = String(value).toLowerCase().trim();
  return strValue === 'true' || strValue === '1' || strValue === 'yes';
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(message, statusCode) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify({
    error: true,
    message: message,
    statusCode: statusCode || 500
  }));
  return output;
}