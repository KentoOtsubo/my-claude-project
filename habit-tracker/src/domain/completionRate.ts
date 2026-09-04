import type { Category } from "./habit.js";
import { isTargetDay, nextDate, toDateOnly } from "./targetDay.js";
import type { TargetDayHabit } from "./targetDay.js";

export interface CompletionRateHabit extends TargetDayHabit {
  createdAt: string;
}

export interface CompletionRate {
  targetDays: number;
  actualDays: number;
  percent: number;
}

function subtractDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * 習慣単位の週次/月次達成率を計算する（FR-001, FR-002, FR-004, FR-010）。
 * 対象期間は`today`を含む直近`windowDays`日間だが、習慣の作成日より前は
 * 対象日数に含めない（research.md「2.」参照）。
 */
export function calculateCompletionRate(
  habit: CompletionRateHabit,
  checkinDates: string[],
  today: string,
  windowDays: number,
): CompletionRate {
  const createdDate = toDateOnly(habit.createdAt);
  const windowStart = subtractDays(today, windowDays - 1);
  const start = windowStart > createdDate ? windowStart : createdDate;
  const checkinSet = new Set(checkinDates);

  let targetDays = 0;
  let actualDays = 0;
  let cursor = start;
  while (cursor <= today) {
    if (isTargetDay(habit, cursor)) {
      targetDays += 1;
      if (checkinSet.has(cursor)) {
        actualDays += 1;
      }
    }
    cursor = nextDate(cursor);
  }

  const percent = targetDays === 0 ? 0 : Math.round((actualDays / targetDays) * 100);
  return { targetDays, actualDays, percent };
}

export interface CategoryCompletionRate extends CompletionRate {
  category: Category;
}

/**
 * カテゴリ別の週次/月次達成率を計算する（FR-006, FR-007）。
 * カテゴリに属する全習慣の対象日数・実施日数を合算してから比率を算出する
 * （単純平均ではない、research.md「4.」参照）。習慣が1件も属さないカテゴリは
 * 結果に含めない。
 */
export function calculateCategoryCompletionRate(
  habits: Array<{ category: Category } & CompletionRateHabit & { checkinDates: string[] }>,
  today: string,
  windowDays: number,
): CategoryCompletionRate[] {
  const totals = new Map<Category, { targetDays: number; actualDays: number }>();

  for (const habit of habits) {
    const rate = calculateCompletionRate(habit, habit.checkinDates, today, windowDays);
    const current = totals.get(habit.category) ?? { targetDays: 0, actualDays: 0 };
    totals.set(habit.category, {
      targetDays: current.targetDays + rate.targetDays,
      actualDays: current.actualDays + rate.actualDays,
    });
  }

  return Array.from(totals.entries()).map(([category, { targetDays, actualDays }]) => ({
    category,
    targetDays,
    actualDays,
    percent: targetDays === 0 ? 0 : Math.round((actualDays / targetDays) * 100),
  }));
}
