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
      "名前は1文字以上100文字以下で入力してください",
    );
  }

  const frequencyType = input.frequencyType ?? "daily";
  if (!FREQUENCY_TYPES.includes(frequencyType)) {
    throw new HabitValidationError(
      "頻度は「毎日」または「毎週」のいずれかを指定してください",
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
        "毎週の場合は曜日を1つ以上指定してください（重複や不正な値は指定できません）",
      );
    }
  }

  const category = input.category ?? "uncategorized";
  if (!isCategory(category)) {
    throw new HabitValidationError(
      "カテゴリは「健康」「仕事」「学習」「その他」「未分類」のいずれかを指定してください",
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
      "カテゴリは「健康」「仕事」「学習」「その他」「未分類」のいずれかを指定してください",
    );
  }

  return value;
}
