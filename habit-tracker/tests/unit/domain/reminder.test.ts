import { describe, expect, it } from "vitest";
import { calculateReminderList } from "../../../src/domain/reminder.js";

const DAILY = {
  id: "h1",
  name: "読書",
  category: "study" as const,
  frequencyType: "daily" as const,
  weeklyDays: [] as number[],
  createdAt: "2025-01-01T00:00:00.000Z",
};

// 2026-01-12=Mon, 13=Tue, 14=Wed, 16=Fri
const WEEKLY_MWF = {
  id: "h2",
  name: "ストレッチ",
  category: "health" as const,
  frequencyType: "weekly" as const,
  weeklyDays: [1, 3, 5], // 月・水・金
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("calculateReminderList", () => {
  it("本日未チェックインかつ対象日の習慣を一覧に含める (FR-001)", () => {
    const result = calculateReminderList(
      [{ ...DAILY, reminderEnabled: true, checkinDates: [] }],
      "2026-01-16",
    );

    expect(result).toEqual([{ id: "h1", name: "読書", category: "study" }]);
  });

  it("本日が対象日でない習慣は一覧から除外する (FR-002)", () => {
    const result = calculateReminderList(
      [{ ...WEEKLY_MWF, reminderEnabled: true, checkinDates: [] }],
      "2026-01-13", // 火曜（対象外）
    );

    expect(result).toEqual([]);
  });

  it("本日既にチェックイン済みの習慣は一覧から除外する (FR-003)", () => {
    const result = calculateReminderList(
      [{ ...DAILY, reminderEnabled: true, checkinDates: ["2026-01-16"] }],
      "2026-01-16",
    );

    expect(result).toEqual([]);
  });

  it("reminderEnabledがfalseの習慣は一覧から除外する (FR-006)", () => {
    const result = calculateReminderList(
      [{ ...DAILY, reminderEnabled: false, checkinDates: [] }],
      "2026-01-16",
    );

    expect(result).toEqual([]);
  });

  it("対象習慣が1件もない場合は空配列を返す (FR-008)", () => {
    const result = calculateReminderList([], "2026-01-16");
    expect(result).toEqual([]);
  });

  it("複数の対象習慣を登録順(createdAt昇順)で返す (FR-001)", () => {
    const first = { ...DAILY, id: "a", createdAt: "2025-01-01T00:00:00.000Z" };
    const second = { ...DAILY, id: "b", createdAt: "2025-02-01T00:00:00.000Z" };

    const result = calculateReminderList(
      [
        { ...second, reminderEnabled: true, checkinDates: [] },
        { ...first, reminderEnabled: true, checkinDates: [] },
      ],
      "2026-01-16",
    );

    expect(result.map((h) => h.id)).toEqual(["a", "b"]);
  });
});
