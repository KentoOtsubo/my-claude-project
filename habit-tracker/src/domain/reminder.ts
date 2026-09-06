import type { Category } from "./habit.js";
import { isTargetDay } from "./targetDay.js";
import type { TargetDayHabit } from "./targetDay.js";

export interface ReminderHabit extends TargetDayHabit {
  id: string;
  name: string;
  category: Category;
  createdAt: string;
  reminderEnabled: boolean;
  checkinDates: string[];
}

export interface ReminderListItem {
  id: string;
  name: string;
  category: Category;
}

/**
 * 本日リマインダー対象の習慣一覧を算出する（FR-001〜FR-003, FR-006, FR-008）。
 * 対象日判定は`004`で抽出済みの`targetDay.ts`を再利用する（research.md「2.」参照）。
 */
export function calculateReminderList(
  habits: ReminderHabit[],
  today: string,
): ReminderListItem[] {
  return habits
    .filter((habit) => habit.reminderEnabled)
    .filter((habit) => isTargetDay(habit, today))
    .filter((habit) => !habit.checkinDates.includes(today))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(({ id, name, category }) => ({ id, name, category }));
}
