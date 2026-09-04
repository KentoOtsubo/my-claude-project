import { describe, expect, it } from "vitest";
import { determineGoalReviewStatus } from "../../../src/domain/goalReviewStatus.js";

describe("determineGoalReviewStatus", () => {
  it("終了日が今日より後の場合は進行中として進捗率とともに返す (Acceptance Scenario 2, FR-009)", () => {
    const result = determineGoalReviewStatus(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 10 },
      ["2026-08-02", "2026-08-05"],
      "2026-08-10",
    );

    expect(result).toEqual({ status: "in_progress", actualCount: 2, progressPercent: 20 });
  });

  it("終了日が今日以前で達成条件を満たす場合は達成として返す (Acceptance Scenario 1, FR-008)", () => {
    const result = determineGoalReviewStatus(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 2 },
      ["2026-08-02", "2026-08-05"],
      "2026-09-01",
    );

    expect(result).toEqual({ status: "achieved", actualCount: 2, progressPercent: 100 });
  });

  it("終了日が今日以前で達成条件を満たさない場合は未達成として返す (Acceptance Scenario 1, FR-008)", () => {
    const result = determineGoalReviewStatus(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 10 },
      ["2026-08-02"],
      "2026-09-01",
    );

    expect(result).toEqual({ status: "not_achieved", actualCount: 1, progressPercent: 10 });
  });

  it("終了日が今日と同じ場合は期間終了として扱う", () => {
    const result = determineGoalReviewStatus(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 1 },
      ["2026-08-02"],
      "2026-08-31",
    );

    expect(result.status).toBe("achieved");
  });
});
