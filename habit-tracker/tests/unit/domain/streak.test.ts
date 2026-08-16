import { describe, expect, it } from "vitest";
import { calculateCurrentStreak } from "../../../src/domain/streak.js";

const DAILY = {
  frequencyType: "daily" as const,
  weeklyDays: [] as number[],
  createdAt: "2026-01-01T00:00:00.000Z",
};

// 2026-01-02=Fri, 05=Mon, 07=Wed, 09=Fri, 12=Mon, 14=Wed, 16=Fri
const WEEKLY_MWF = {
  frequencyType: "weekly" as const,
  weeklyDays: [1, 3, 5], // 月・水・金
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("calculateCurrentStreak - 毎日", () => {
  it("今日を含め3日連続でチェックインされている場合は3を返す (Acceptance Scenario 1)", () => {
    const streak = calculateCurrentStreak(
      DAILY,
      ["2026-01-14", "2026-01-15", "2026-01-16"],
      "2026-01-16",
    );
    expect(streak).toBe(3);
  });

  it("今日はまだチェックインされていない場合、当日を除いて数える (FR-011, Acceptance Scenario 2)", () => {
    const streak = calculateCurrentStreak(
      DAILY,
      ["2026-01-14", "2026-01-15"],
      "2026-01-16",
    );
    expect(streak).toBe(2);
  });

  it("昨日チェックインが欠けている場合は0を返す (FR-009, Acceptance Scenario 3)", () => {
    const streak = calculateCurrentStreak(DAILY, ["2026-01-14"], "2026-01-16");
    expect(streak).toBe(0);
  });

  it("チェックインが1件もない場合は0を返す", () => {
    const streak = calculateCurrentStreak(DAILY, [], "2026-01-16");
    expect(streak).toBe(0);
  });

  it("習慣の作成日より前には遡らない（境界を超えてもエラーにならない）", () => {
    const streak = calculateCurrentStreak(
      DAILY,
      ["2026-01-01", "2026-01-02"],
      "2026-01-02",
    );
    expect(streak).toBe(2);
  });
});

describe("calculateCurrentStreak - 毎週（月・水・金）", () => {
  it("対象外の曜日で評価してもストリークは中断されない (FR-010, Acceptance Scenario 4)", () => {
    const streak = calculateCurrentStreak(
      WEEKLY_MWF,
      ["2026-01-02", "2026-01-05", "2026-01-07", "2026-01-09", "2026-01-12"],
      "2026-01-13", // 火曜（対象外）
    );
    expect(streak).toBe(5);
  });

  it("対象日が1日でも欠けている場合はそこで途切れる (FR-010)", () => {
    const streak = calculateCurrentStreak(
      WEEKLY_MWF,
      ["2026-01-02", "2026-01-05", "2026-01-12"], // 01-09が欠けている
      "2026-01-13",
    );
    expect(streak).toBe(1);
  });

  it("今日が対象日でまだ未チェックインの場合は当日を除いて数える (FR-011)", () => {
    const streak = calculateCurrentStreak(
      WEEKLY_MWF,
      ["2026-01-02", "2026-01-05", "2026-01-07", "2026-01-09"],
      "2026-01-12", // 月曜（対象日）だが未チェックイン
    );
    expect(streak).toBe(4);
  });

  it("一度もチェックインされていない場合は0を返す", () => {
    const streak = calculateCurrentStreak(WEEKLY_MWF, [], "2026-01-13");
    expect(streak).toBe(0);
  });
});

describe("calculateCurrentStreak - 頻度変更時の再計算 (FR-015)", () => {
  it("同じチェックイン履歴でも現在の頻度設定に応じて異なる結果になる", () => {
    const checkinDates = [
      "2026-01-12",
      "2026-01-13",
      "2026-01-14",
      "2026-01-15",
      "2026-01-16",
    ];

    const asDaily = calculateCurrentStreak(DAILY, checkinDates, "2026-01-16");
    const asWeekly = calculateCurrentStreak(
      WEEKLY_MWF,
      checkinDates,
      "2026-01-16",
    );

    expect(asDaily).toBe(5);
    expect(asWeekly).toBe(3); // 12(月)・14(水)・16(金)のみが対象日
  });
});
