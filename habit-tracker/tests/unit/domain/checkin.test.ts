import { describe, expect, it } from "vitest";
import {
  CheckInValidationError,
  normalizeCheckInInput,
} from "../../../src/domain/checkin.js";

const HABIT_CREATED_AT = "2026-08-01T00:00:00.000Z";

describe("normalizeCheckInInput", () => {
  it("日付を指定した場合はその日付で正規化する", () => {
    const result = normalizeCheckInInput(
      { date: "2026-08-10" },
      { habitCreatedAt: HABIT_CREATED_AT, today: "2026-08-16" },
    );
    expect(result).toEqual({ date: "2026-08-10" });
  });

  it("日付が未指定の場合は今日の日付になる (FR-002)", () => {
    const result = normalizeCheckInInput(
      {},
      { habitCreatedAt: HABIT_CREATED_AT, today: "2026-08-16" },
    );
    expect(result.date).toBe("2026-08-16");
  });

  it("未来の日付の場合はエラーになる (FR-003)", () => {
    expect(() =>
      normalizeCheckInInput(
        { date: "2026-08-17" },
        { habitCreatedAt: HABIT_CREATED_AT, today: "2026-08-16" },
      ),
    ).toThrow(CheckInValidationError);
  });

  it("習慣の作成日より前の日付の場合はエラーになる (FR-004)", () => {
    expect(() =>
      normalizeCheckInInput(
        { date: "2026-07-31" },
        { habitCreatedAt: HABIT_CREATED_AT, today: "2026-08-16" },
      ),
    ).toThrow(CheckInValidationError);
  });

  it("習慣の作成日と同じ日付は許可される", () => {
    const result = normalizeCheckInInput(
      { date: "2026-08-01" },
      { habitCreatedAt: HABIT_CREATED_AT, today: "2026-08-16" },
    );
    expect(result.date).toBe("2026-08-01");
  });

  it("今日の日付は許可される", () => {
    const result = normalizeCheckInInput(
      { date: "2026-08-16" },
      { habitCreatedAt: HABIT_CREATED_AT, today: "2026-08-16" },
    );
    expect(result.date).toBe("2026-08-16");
  });

  it("既にチェックイン済みの日付の場合はエラーになる (FR-005)", () => {
    expect(() =>
      normalizeCheckInInput(
        { date: "2026-08-10" },
        {
          habitCreatedAt: HABIT_CREATED_AT,
          today: "2026-08-16",
          existingDates: ["2026-08-09", "2026-08-10"],
        },
      ),
    ).toThrow(CheckInValidationError);
  });

  it("既存の日付と重複しなければ許可される", () => {
    const result = normalizeCheckInInput(
      { date: "2026-08-10" },
      {
        habitCreatedAt: HABIT_CREATED_AT,
        today: "2026-08-16",
        existingDates: ["2026-08-09"],
      },
    );
    expect(result.date).toBe("2026-08-10");
  });
});
