import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "../../../src/domain/goalProgress.js";

describe("calculateGoalProgress", () => {
  it("対象期間内のチェックイン数から進捗率を計算する (Acceptance Scenario 1)", () => {
    const result = calculateGoalProgress(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 10 },
      [
        "2026-08-02",
        "2026-08-05",
        "2026-08-09",
        "2026-08-12",
        "2026-08-16",
      ],
    );

    expect(result).toEqual({
      actualCount: 5,
      progressPercent: 50,
      achieved: false,
    });
  });

  it("目標回数以上チェックインしている場合は100%・達成として扱う (Acceptance Scenario 2, FR-007, FR-008)", () => {
    const result = calculateGoalProgress(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 3 },
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"],
    );

    expect(result).toEqual({
      actualCount: 5,
      progressPercent: 100,
      achieved: true,
    });
  });

  it("対象期間内のチェックインが0件の場合は0%になる (Acceptance Scenario 3)", () => {
    const result = calculateGoalProgress(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 10 },
      [],
    );

    expect(result).toEqual({ actualCount: 0, progressPercent: 0, achieved: false });
  });

  it("対象期間外のチェックインはカウントしない", () => {
    const result = calculateGoalProgress(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 10 },
      ["2026-07-31", "2026-08-01", "2026-08-31", "2026-09-01"],
    );

    expect(result.actualCount).toBe(2);
  });

  it("開始日・終了日は両端を含む", () => {
    const result = calculateGoalProgress(
      { startDate: "2026-08-01", endDate: "2026-08-01", targetCount: 1 },
      ["2026-08-01"],
    );

    expect(result).toEqual({ actualCount: 1, progressPercent: 100, achieved: true });
  });
});
