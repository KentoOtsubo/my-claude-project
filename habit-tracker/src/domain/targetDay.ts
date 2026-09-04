import type { FrequencyType } from "./habit.js";

export interface TargetDayHabit {
  frequencyType: FrequencyType;
  weeklyDays: number[];
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

/** 頻度設定に基づき、指定日が対象日（毎日は常に対象、毎週は指定曜日のみ）かを判定する。 */
export function isTargetDay(habit: TargetDayHabit, date: string): boolean {
  return habit.frequencyType === "daily" || habit.weeklyDays.includes(dayOfWeek(date));
}

export function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function toDateOnly(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}
