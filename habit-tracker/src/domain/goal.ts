import { toJstDateString } from "./clock.js";

export interface Goal {
  id: string;
  habitId: string;
  startDate: string;
  endDate: string;
  targetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  startDate?: string;
  endDate?: string;
  targetCount?: number;
}

export interface NormalizedGoalInput {
  startDate: string;
  endDate: string;
  targetCount: number;
}

export interface GoalValidationContext {
  /** 対象習慣の作成日時（ISO 8601）。日付部分のみ比較に使用する。 */
  habitCreatedAt: string;
}

export class GoalValidationError extends Error {}

function toDateOnly(isoDateTime: string): string {
  return toJstDateString(new Date(isoDateTime));
}

/**
 * 目標の検証を行う（FR-002, FR-003, FR-005）。
 * PUTの部分更新時は、呼び出し側が既存レコードとマージした完全な入力を渡す
 * （001のPUT部分更新マージ方針を踏襲、data-model.md参照）。
 */
export function normalizeGoalInput(
  input: GoalInput,
  context: GoalValidationContext,
): NormalizedGoalInput {
  const { startDate, endDate, targetCount } = input;

  if (!startDate || !endDate) {
    throw new GoalValidationError("開始日と終了日は必須です");
  }

  if (startDate > endDate) {
    throw new GoalValidationError("開始日は終了日より後の日付にできません");
  }

  if (
    targetCount === undefined ||
    !Number.isInteger(targetCount) ||
    targetCount < 1
  ) {
    throw new GoalValidationError(
      "目標回数は1以上の整数で入力してください",
    );
  }

  if (startDate < toDateOnly(context.habitCreatedAt)) {
    throw new GoalValidationError(
      "開始日は習慣の作成日より前にできません",
    );
  }

  return { startDate, endDate, targetCount };
}
