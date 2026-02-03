/**
 * スクリプトプロパティから設定を取得
 */
const props = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = props.getProperty('SPREADSHEET_ID');
const SHEET_NAME = props.getProperty('SHEET_NAME');
const DRIVE_FOLDER_ID = props.getProperty('DRIVE_FOLDER_ID'); // 画像フォルダID

/**
 * 型定義（参考用 - GASではTypeScriptの型は使えませんが、コメントとして残しています）
 *
 * // ポートフォリオアイテム (?action=items)
 * type ApiResponseItem = {
 *   id: number;      // ループのインデックス番号（0始まり）
 *   date: string;    // 日付
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
 * // 画像データ (?action=images)
 * type ImageData = {
 *   name: string;     // Google DriveファイルID (https://drive.google.com/open?id={name})
 *   mimeType: string; // MIMEタイプ (image/png等)
 *   data: string;     // Base64エンコードされた画像データ
 * };
 *
 * スプレッドシートの固定カラム（0-indexed）:
 * 0: date
 * 1: title
 * 2: description
 * 3: imageUrl
 * 4: tags
 * 5: isCommision
 * 6: Amazon (リンク)
 * 7: DLsite (リンク)
 * 8: 公式サイト (リンク)
 * 9: Youtube (リンク)
 * 10: ニコニコ (リンク)
 * 11: メロンブックス (リンク)
 * 12: リンク (リンク)
 */

/**
 * GETリクエストを処理するエンドポイント
 *
 * クエリパラメータ:
 * - action=items (デフォルト): ポートフォリオアイテムを取得
 * - action=images: Google Driveフォルダ内の画像を一括取得
 */
function doGet(e) {
  try {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    const action = (e && e.parameter && e.parameter.action) || 'items';

    let result;
    switch (action) {
      case 'images':
        result = getDriveImages();
        break;
      case 'items':
      default:
        result = getPortfolioItems();
        break;
    }

    output.setContent(JSON.stringify(result));
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
  const COLUMN_COUNT = 13;

  // 固定カラムインデックス（ヘッダー行の名前に対応）
  const COL = {
    date: 1,
    title: 2,
    description: 3,
    imageUrl: 4,
    tags: 5,
    isCommision: 6,
    Amazon: 7,
    DLsite: 8,
    公式サイト: 9,
    Youtube: 10,
    ニコニコ: 11,
    メロンブックス: 12,
    リンク: 13
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
      date: formatDate(row[COL.date]),
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
 * Google Driveフォルダから画像を一括取得
 *
 * GitHub Actionsから呼び出されることを想定
 * DRIVE_FOLDER_IDはスクリプトプロパティで設定
 *
 * @returns {Array<{name: string, mimeType: string, data: string}>}
 *   - name: Google DriveのファイルID (https://drive.google.com/open?id={name} で使用可能)
 *   - mimeType: MIMEタイプ (image/png, image/jpeg等)
 *   - data: Base64エンコードされた画像データ
 */
function getDriveImages() {
  if (!DRIVE_FOLDER_ID) {
    throw new Error('DRIVE_FOLDER_ID is not set in script properties');
  }

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const files = folder.getFiles();
  const images = [];

  // 画像ファイルのMIMEタイプ
  const imageMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();

    // 画像ファイルのみ処理
    if (imageMimeTypes.includes(mimeType)) {
      const blob = file.getBlob();
      const base64Data = Utilities.base64Encode(blob.getBytes());
      const fileId = file.getId();

      images.push({
        name: fileId,
        mimeType: mimeType,
        data: base64Data
      });
    }
  }

  return images;
}

/**
 * 日付をフォーマット
 * スプレッドシートのDate型またはstring型を文字列に変換
 */
function formatDate(dateValue) {
  if (!dateValue) return '';
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  return String(dateValue);
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