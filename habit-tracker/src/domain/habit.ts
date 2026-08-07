export type FrequencyType = "daily" | "weekly";

export type Category = "health" | "work" | "study" | "other" | "uncategorized";

export interface Habit {
  id: string;
  name: string;
  frequencyType: FrequencyType;
  weeklyDays: number[];
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface HabitInput {
  name?: string;
  frequencyType?: FrequencyType;
  weeklyDays?: number[];
  category?: Category;
}

export interface NormalizedHabitInput {
  name: string;
  frequencyType: FrequencyType;
  weeklyDays: number[];
  category: Category;
}

export class HabitValidationError extends Error {}

const FREQUENCY_TYPES: FrequencyType[] = ["daily", "weekly"];
const CATEGORIES: Category[] = ["health", "work", "study", "other", "uncategorized"];

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value);
}

/**
 * 頻度・カテゴリのデフォルト値適用と検証を行う（FR-002〜FR-006）。
 * PUTの部分更新時は、呼び出し側が既存レコードとマージした完全な入力を渡す
 * （data-model.md「部分更新（PUT）時のマージ方針」参照）。
 */
export function normalizeHabitInput(input: HabitInput): NormalizedHabitInput {
  const name = (input.name ?? "").trim();
  if (name.length < 1 || name.length > 100) {
    throw new HabitValidationError(
      "name must be between 1 and 100 characters",
    );
  }

  const frequencyType = input.frequencyType ?? "daily";
  if (!FREQUENCY_TYPES.includes(frequencyType)) {
    throw new HabitValidationError(
      `frequencyType must be one of ${FREQUENCY_TYPES.join(", ")}`,
    );
  }

  let weeklyDays: number[] = [];
  if (frequencyType === "weekly") {
    weeklyDays = input.weeklyDays ?? [];
    const isValidWeeklyDays =
      weeklyDays.length > 0 &&
      weeklyDays.every(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      ) &&
      new Set(weeklyDays).size === weeklyDays.length;

    if (!isValidWeeklyDays) {
      throw new HabitValidationError(
        "weeklyDays must contain at least one unique integer between 0 and 6 when frequencyType is weekly",
      );
    }
  }

  const category = input.category ?? "uncategorized";
  if (!isCategory(category)) {
    throw new HabitValidationError(
      `category must be one of ${CATEGORIES.join(", ")}`,
    );
  }

  return { name, frequencyType, weeklyDays, category };
}

/** カテゴリ絞り込みクエリパラメータの検証（FR-008）。 */
export function normalizeCategoryFilter(value: unknown): Category | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isCategory(value)) {
    throw new HabitValidationError(
      `category must be one of ${CATEGORIES.join(", ")}`,
    );
  }

  return value;
}
