import type { FrequencyType } from "./habit.js";

export interface StreakHabit {
  frequencyType: FrequencyType;
  weeklyDays: number[];
  createdAt: string;
}

function toDateOnly(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * ストリーク計算（FR-008〜FR-011, FR-015）。
 * `habit`は常に「現在の」頻度設定を渡す（頻度変更時も過去のチェックイン履歴を
 * この関数に再度渡すことで、常に現在の設定で再計算される。research.md「2.」参照）。
 */
export function calculateCurrentStreak(
  habit: StreakHabit,
  checkinDates: string[],
  today: string,
): number {
  const createdDate = toDateOnly(habit.createdAt);
  const checkinSet = new Set(checkinDates);

  const isTargetDay = (date: string): boolean =>
    habit.frequencyType === "daily" || habit.weeklyDays.includes(dayOfWeek(date));

  /** `date`（inclusive指定次第）以前で最初に見つかる対象日。作成日より前に出たらnull。 */
  const findTargetDay = (date: string, inclusive: boolean): string | null => {
    let cursor = inclusive ? date : previousDate(date);
    while (cursor >= createdDate) {
      if (isTargetDay(cursor)) {
        return cursor;
      }
      cursor = previousDate(cursor);
    }
    return null;
  };

  const startsFromToday = isTargetDay(today) && checkinSet.has(today);
  let cursor: string | null = startsFromToday
    ? today
    : findTargetDay(previousDate(today), true);

  let streak = 0;
  while (cursor !== null && checkinSet.has(cursor)) {
    streak += 1;
    cursor = findTargetDay(cursor, false);
  }

  return streak;
}
