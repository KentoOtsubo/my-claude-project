import { describe, expect, it } from "vitest";
import {
  calculateCategoryCompletionRate,
  calculateCompletionRate,
} from "../../../src/domain/completionRate.js";

const DAILY = {
  frequencyType: "daily" as const,
  weeklyDays: [] as number[],
  createdAt: "2025-01-01T00:00:00.000Z",
};

// 2026-01-10=Sat, 12=Mon, 14=Wed, 16=Fri
const WEEKLY_MWF = {
  frequencyType: "weekly" as const,
  weeklyDays: [1, 3, 5], // 月・水・金
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("calculateCompletionRate - 毎日", () => {
  it("直近7日間のうち5日チェックインされている場合、5/7として達成率を算出する (FR-001, Acceptance Scenario 1)", () => {
    const result = calculateCompletionRate(
      DAILY,
      ["2026-01-12", "2026-01-13", "2026-01-14", "2026-01-15", "2026-01-16"],
      "2026-01-16",
      7,
    );

    expect(result).toEqual({ targetDays: 7, actualDays: 5, percent: 71 });
  });

  it("直近30日間（今月）を対象に達成率を算出する (FR-002)", () => {
    const checkinDates = Array.from({ length: 15 }, (_, i) => {
      const day = 17 - i; // 2025-12-XX の15日分
      return `2025-12-${String(day).padStart(2, "0")}`;
    });

    const result = calculateCompletionRate(DAILY, checkinDates, "2026-01-01", 30);

    expect(result).toEqual({ targetDays: 30, actualDays: 15, percent: 50 });
  });

  it("チェックインが1件もない場合は0%になる", () => {
    const result = calculateCompletionRate(DAILY, [], "2026-01-16", 7);
    expect(result).toEqual({ targetDays: 7, actualDays: 0, percent: 0 });
  });

  it("習慣の作成日より前は対象日数に含めない (FR-010)", () => {
    const habit = { ...DAILY, createdAt: "2026-01-14T00:00:00.000Z" };
    const result = calculateCompletionRate(
      habit,
      ["2026-01-14", "2026-01-16"],
      "2026-01-16",
      7,
    );

    expect(result).toEqual({ targetDays: 3, actualDays: 2, percent: 67 });
  });
});

describe("calculateCompletionRate - 毎週（月・水・金）", () => {
  it("対象外の曜日は対象日数に含めない (Edge Cases)", () => {
    const result = calculateCompletionRate(
      WEEKLY_MWF,
      ["2026-01-12", "2026-01-16"], // 01-14(水)が欠けている
      "2026-01-16",
      7,
    );

    expect(result).toEqual({ targetDays: 3, actualDays: 2, percent: 67 });
  });

  it("対象日が1件もない場合は0%になる（NaNにならない）", () => {
    const habit = {
      frequencyType: "weekly" as const,
      weeklyDays: [1], // 月曜のみ
      createdAt: "2026-01-16T00:00:00.000Z", // 作成日=今日（金曜）
    };

    const result = calculateCompletionRate(habit, [], "2026-01-16", 7);

    expect(result).toEqual({ targetDays: 0, actualDays: 0, percent: 0 });
  });
});

describe("calculateCategoryCompletionRate", () => {
  it("同一カテゴリの複数習慣の対象日数・実施日数を合算してから達成率を算出する (FR-006, Acceptance Scenario 1)", () => {
    const habits = [
      { ...DAILY, category: "health" as const, checkinDates: ["2026-01-16"] }, // 1/7
      {
        ...DAILY,
        category: "health" as const,
        checkinDates: ["2026-01-15", "2026-01-16"],
      }, // 2/7
      {
        ...DAILY,
        category: "study" as const,
        checkinDates: ["2026-01-10", "2026-01-11", "2026-01-12"],
      }, // 3/7
    ];

    const result = calculateCategoryCompletionRate(habits, "2026-01-16", 7);

    expect(result).toEqual(
      expect.arrayContaining([
        { category: "health", targetDays: 14, actualDays: 3, percent: 21 },
        { category: "study", targetDays: 7, actualDays: 3, percent: 43 },
      ]),
    );
  });

  it("習慣が1件も属さないカテゴリは結果から除外する (FR-007, Acceptance Scenario 3)", () => {
    const habits = [
      { ...DAILY, category: "health" as const, checkinDates: [] as string[] },
    ];

    const result = calculateCategoryCompletionRate(habits, "2026-01-16", 7);

    expect(result).toHaveLength(1);
    expect(result.find((c) => c.category === "work")).toBeUndefined();
  });

  it("習慣が1件もない場合は空配列を返す", () => {
    const result = calculateCategoryCompletionRate([], "2026-01-16", 7);
    expect(result).toEqual([]);
  });
});
