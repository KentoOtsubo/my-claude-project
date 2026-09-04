import { isTargetDay, nextDate, toDateOnly } from "./targetDay.js";
import type { TargetDayHabit } from "./targetDay.js";

export interface LongestStreakHabit extends TargetDayHabit {
  createdAt: string;
}

/**
 * これまでの最長ストリーク（連続実施日数の最大値）を計算する（FR-003, FR-004,
 * FR-010）。習慣の作成日から`today`まで対象日を前方走査し、連続チェックイン数の
 * 最大値を返す。`today`が対象日かつ未チェックインの場合は、現在のストリーク計算
 * （`streak.ts`）と同じ「当日は判定を保留する」方針を踏襲し、連続数をリセット
 * しない（research.md「3.」参照）。
 */
export function calculateLongestStreak(
  habit: LongestStreakHabit,
  checkinDates: string[],
  today: string,
): number {
  const createdDate = toDateOnly(habit.createdAt);
  const checkinSet = new Set(checkinDates);

  let run = 0;
  let max = 0;
  let cursor = createdDate;
  while (cursor <= today) {
    if (isTargetDay(habit, cursor)) {
      if (checkinSet.has(cursor)) {
        run += 1;
        if (run > max) {
          max = run;
        }
      } else if (cursor !== today) {
        run = 0;
      }
    }
    cursor = nextDate(cursor);
  }

  return max;
}
