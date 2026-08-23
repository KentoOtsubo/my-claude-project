import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Goal, GoalInput } from "../domain/goal.js";
import { normalizeGoalInput } from "../domain/goal.js";

interface GoalRow {
  id: string;
  habit_id: string;
  start_date: string;
  end_date: string;
  target_count: number;
  created_at: string;
  updated_at: string;
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    habitId: row.habit_id,
    startDate: row.start_date,
    endDate: row.end_date,
    targetCount: row.target_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class GoalRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(habitId: string, input: GoalInput, habitCreatedAt: string): Goal {
    const normalized = normalizeGoalInput(input, { habitCreatedAt });
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO goals (id, habit_id, start_date, end_date, target_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        habitId,
        normalized.startDate,
        normalized.endDate,
        normalized.targetCount,
        now,
        now,
      );

    return { id, habitId, ...normalized, createdAt: now, updatedAt: now };
  }

  findAll(): Goal[] {
    const rows = this.db
      .prepare("SELECT * FROM goals ORDER BY created_at ASC")
      .all() as unknown as GoalRow[];

    return rows.map(rowToGoal);
  }

  findById(id: string): Goal | undefined {
    const row = this.db
      .prepare("SELECT * FROM goals WHERE id = ?")
      .get(id) as GoalRow | undefined;

    return row ? rowToGoal(row) : undefined;
  }

  update(id: string, input: GoalInput, habitCreatedAt: string): Goal | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    const merged: GoalInput = {
      startDate: input.startDate ?? existing.startDate,
      endDate: input.endDate ?? existing.endDate,
      targetCount: input.targetCount ?? existing.targetCount,
    };

    const normalized = normalizeGoalInput(merged, { habitCreatedAt });
    const updatedAt = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE goals SET start_date = ?, end_date = ?, target_count = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        normalized.startDate,
        normalized.endDate,
        normalized.targetCount,
        updatedAt,
        id,
      );

    return {
      id,
      habitId: existing.habitId,
      ...normalized,
      createdAt: existing.createdAt,
      updatedAt,
    };
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM goals WHERE id = ?").run(id);
    return Number(result.changes) > 0;
  }
}
