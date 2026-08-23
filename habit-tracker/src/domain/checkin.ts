import { toJstDateString } from "./clock.js";

export interface CheckIn {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

export interface CheckInInput {
  date?: string;
}

export interface NormalizedCheckInInput {
  date: string;
}

export interface CheckInValidationContext {
  /** 対象習慣の作成日時（ISO 8601）。日付部分のみ比較に使用する。 */
  habitCreatedAt: string;
  /** サーバーの今日の日付（YYYY-MM-DD）。 */
  today: string;
  /** 対象習慣の既存チェックイン日付一覧（重複判定用、省略時は重複チェックしない）。 */
  existingDates?: string[];
}

export class CheckInValidationError extends Error {}

function toDateOnly(isoDateTime: string): string {
  return toJstDateString(new Date(isoDateTime));
}

/**
 * チェックインの検証・デフォルト値適用を行う（FR-002〜FR-005）。
 * 重複判定（FR-005）はDB層のUNIQUE制約でも二重に保証される
 * （research.md「3. 重複チェックインの二重防御」参照）。
 */
export function normalizeCheckInInput(
  input: CheckInInput,
  context: CheckInValidationContext,
): NormalizedCheckInInput {
  const date = input.date ?? context.today;

  if (date > context.today) {
    throw new CheckInValidationError(
      "未来の日付にはチェックインできません",
    );
  }

  if (date < toDateOnly(context.habitCreatedAt)) {
    throw new CheckInValidationError(
      "習慣の作成日より前の日付にはチェックインできません",
    );
  }

  if (context.existingDates?.includes(date)) {
    throw new CheckInValidationError(
      "この習慣・日付には既にチェックインが記録されています",
    );
  }

  return { date };
}
