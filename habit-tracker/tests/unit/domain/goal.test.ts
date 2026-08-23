import { describe, expect, it } from "vitest";
import { GoalValidationError, normalizeGoalInput } from "../../../src/domain/goal.js";

const HABIT_CREATED_AT = "2026-08-01T00:00:00.000Z";

describe("normalizeGoalInput", () => {
  it("開始日・終了日・目標回数を指定した場合はそのまま正規化する", () => {
    const result = normalizeGoalInput(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 20 },
      { habitCreatedAt: HABIT_CREATED_AT },
    );
    expect(result).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      targetCount: 20,
    });
  });

  it("開始日が終了日より後の場合はエラーになる (FR-002)", () => {
    expect(() =>
      normalizeGoalInput(
        { startDate: "2026-08-31", endDate: "2026-08-01", targetCount: 20 },
        { habitCreatedAt: HABIT_CREATED_AT },
      ),
    ).toThrow(GoalValidationError);
  });

  it("目標回数が0の場合はエラーになる (FR-003)", () => {
    expect(() =>
      normalizeGoalInput(
        { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 0 },
        { habitCreatedAt: HABIT_CREATED_AT },
      ),
    ).toThrow(GoalValidationError);
  });

  it("目標回数が整数でない場合はエラーになる (FR-003)", () => {
    expect(() =>
      normalizeGoalInput(
        { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 1.5 },
        { habitCreatedAt: HABIT_CREATED_AT },
      ),
    ).toThrow(GoalValidationError);
  });

  it("開始日が習慣の作成日より前の場合はエラーになる (FR-005)", () => {
    expect(() =>
      normalizeGoalInput(
        { startDate: "2026-07-31", endDate: "2026-08-31", targetCount: 20 },
        { habitCreatedAt: HABIT_CREATED_AT },
      ),
    ).toThrow(GoalValidationError);
  });

  it("開始日が習慣の作成日と同じ場合は許可される", () => {
    const result = normalizeGoalInput(
      { startDate: "2026-08-01", endDate: "2026-08-31", targetCount: 20 },
      { habitCreatedAt: HABIT_CREATED_AT },
    );
    expect(result.startDate).toBe("2026-08-01");
  });

  it("開始日と終了日が同じ場合は許可される", () => {
    const result = normalizeGoalInput(
      { startDate: "2026-08-01", endDate: "2026-08-01", targetCount: 1 },
      { habitCreatedAt: HABIT_CREATED_AT },
    );
    expect(result.endDate).toBe("2026-08-01");
  });
});
