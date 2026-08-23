const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 日本時間（JST, UTC+9）における日付文字列（YYYY-MM-DD）を返す。
 * `Date`のタイムゾーン依存メソッド（ローカル時刻）はサーバーの実行環境設定に
 * 左右されるため使用せず、UTCからの固定オフセット計算で日本時間の日付を求める。
 */
export function toJstDateString(date: Date): string {
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 現在時刻を日本時間の日付文字列（YYYY-MM-DD）として返す。 */
export function todayJst(): string {
  return toJstDateString(new Date());
}
