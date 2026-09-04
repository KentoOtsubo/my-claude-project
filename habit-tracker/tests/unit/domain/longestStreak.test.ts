import { describe, expect, it } from "vitest";
import { calculateLongestStreak } from "../../../src/domain/longestStreak.js";

const DAILY = {
  frequencyType: "daily" as const,
  weeklyDays: [] as number[],
  createdAt: "2026-01-01T00:00:00.000Z",
};

// 2026-01-12=Mon, 14=Wed, 16=Fri
const WEEKLY_MWF = {
  frequencyType: "weekly" as const,
  weeklyDays: [1, 3, 5], // 月・水・金
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("calculateLongestStreak - 毎日", () => {
  it("過去の7日間連続記録が、その後途切れて現在2日連続でも最長として保持される (Acceptance Scenario 2)", () => {
    const checkinDates = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      // 01-08, 01-09 は欠けている
      "2026-01-15",
      "2026-01-16",
    ];

    const longest = calculateLongestStreak(DAILY, checkinDates, "2026-01-16");
    expect(longest).toBe(7);
  });

  it("チェックインが1件もない場合は0を返す (Acceptance Scenario 3)", () => {
    const longest = calculateLongestStreak(DAILY, [], "2026-01-16");
    expect(longest).toBe(0);
  });

  it("当日が対象日で未チェックインの場合、それまでの連続記録をリセットせず保持する (現在のストリーク計算と同じ方針)", () => {
    const checkinDates = ["2026-01-14", "2026-01-15"];
    const longest = calculateLongestStreak(DAILY, checkinDates, "2026-01-16");
    expect(longest).toBe(2);
  });

  it("習慣の作成日より前の日付は対象日数に含めない (FR-010)", () => {
    const habit = { ...DAILY, createdAt: "2026-01-10T00:00:00.000Z" };
    const checkinDates = ["2026-01-09", "2026-01-10", "2026-01-11"];
    const longest = calculateLongestStreak(habit, checkinDates, "2026-01-11");
    expect(longest).toBe(2);
  });
});

describe("calculateLongestStreak - 毎週（月・水・金）", () => {
  it("対象外の曜日は連続記録の判定に影響しない", () => {
    const checkinDates = ["2026-01-12", "2026-01-14", "2026-01-16"];
    const longest = calculateLongestStreak(WEEKLY_MWF, checkinDates, "2026-01-16");
    expect(longest).toBe(3);
  });

  it("対象日が1件でも欠けると連続記録はそこで途切れる", () => {
    const checkinDates = ["2026-01-12", "2026-01-16"]; // 01-14が欠けている
    const longest = calculateLongestStreak(WEEKLY_MWF, checkinDates, "2026-01-16");
    expect(longest).toBe(1);
  });
});
