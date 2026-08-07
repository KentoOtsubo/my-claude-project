import { describe, expect, it } from "vitest";
import {
  HabitValidationError,
  normalizeCategoryFilter,
  normalizeHabitInput,
} from "../../../src/domain/habit.js";

describe("normalizeHabitInput", () => {
  it("名前・頻度・カテゴリを指定した場合はそのまま正規化する", () => {
    const result = normalizeHabitInput({
      name: "読書",
      frequencyType: "daily",
      category: "study",
    });

    expect(result).toEqual({
      name: "読書",
      frequencyType: "daily",
      weeklyDays: [],
      category: "study",
    });
  });

  it("名前が未指定の場合はエラーになる (FR-002)", () => {
    expect(() => normalizeHabitInput({})).toThrow(HabitValidationError);
  });

  it("名前が101文字以上の場合はエラーになる (FR-002)", () => {
    expect(() => normalizeHabitInput({ name: "a".repeat(101) })).toThrow(
      HabitValidationError,
    );
  });

  it("頻度が未指定の場合はdailyになる (FR-004)", () => {
    const result = normalizeHabitInput({ name: "読書" });
    expect(result.frequencyType).toBe("daily");
    expect(result.weeklyDays).toEqual([]);
  });

  it("weeklyで曜日が未指定の場合はエラーになる (FR-005)", () => {
    expect(() =>
      normalizeHabitInput({ name: "読書", frequencyType: "weekly" }),
    ).toThrow(HabitValidationError);
  });

  it("weeklyで曜日を指定した場合は正規化される (FR-003)", () => {
    const result = normalizeHabitInput({
      name: "読書",
      frequencyType: "weekly",
      weeklyDays: [1, 3, 5],
    });
    expect(result.weeklyDays).toEqual([1, 3, 5]);
  });

  it("カテゴリが未指定の場合はuncategorizedになる (FR-006)", () => {
    const result = normalizeHabitInput({ name: "読書" });
    expect(result.category).toBe("uncategorized");
  });

  it("不正なカテゴリの場合はエラーになる", () => {
    expect(() =>
      normalizeHabitInput({ name: "読書", category: "invalid" as never }),
    ).toThrow(HabitValidationError);
  });
});

describe("normalizeCategoryFilter", () => {
  it("未指定の場合はundefinedを返す (FR-008)", () => {
    expect(normalizeCategoryFilter(undefined)).toBeUndefined();
  });

  it("有効な値の場合はそのまま返す (FR-008)", () => {
    expect(normalizeCategoryFilter("health")).toBe("health");
  });

  it("不正な値の場合はエラーになる", () => {
    expect(() => normalizeCategoryFilter("invalid")).toThrow(
      HabitValidationError,
    );
  });
});
