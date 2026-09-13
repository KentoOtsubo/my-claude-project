export const FREQUENCY_LABELS = { daily: "毎日", weekly: "毎週" };
export const CATEGORY_LABELS = {
  health: "健康",
  work: "仕事",
  study: "学習",
  other: "その他",
  uncategorized: "未分類",
};
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// サーバー側（src/domain/clock.ts）と同じ方式で、ブラウザのタイムゾーン設定に
// 依存せず日本時間（JST, UTC+9）の日付を固定オフセット計算で求める。
export function todayString() {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

export function dayOfWeek(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
}

export function isTargetDay(habit, dateString) {
  return (
    habit.frequencyType === "daily" ||
    habit.weeklyDays.includes(dayOfWeek(dateString))
  );
}

export function formatHabit(habit) {
  const frequency =
    habit.frequencyType === "weekly"
      ? `毎週（${habit.weeklyDays.map((day) => WEEKDAY_LABELS[day]).join("・")}）`
      : FREQUENCY_LABELS[habit.frequencyType];
  return `${habit.name}（${frequency} / ${CATEGORY_LABELS[habit.category]}）`;
}

export function formatGoalPeriod(goal) {
  return `${goal.startDate} 〜 ${goal.endDate}`;
}
