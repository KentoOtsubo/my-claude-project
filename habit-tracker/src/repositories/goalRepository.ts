import { randomUUID } from "node:crypto";
import type { DbClient } from "./db.js";
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
  constructor(private readonly db: DbClient) {}

  async create(habitId: string, input: GoalInput, habitCreatedAt: string): Promise<Goal> {
    const normalized = normalizeGoalInput(input, { habitCreatedAt });
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO goals (id, habit_id, start_date, end_date, target_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        habitId,
        normalized.startDate,
        normalized.endDate,
        normalized.targetCount,
        now,
        now,
      ],
    );

    return { id, habitId, ...normalized, createdAt: now, updatedAt: now };
  }

  async findAll(): Promise<Goal[]> {
    const { rows } = await this.db.query<GoalRow>(
      "SELECT * FROM goals ORDER BY created_at ASC",
    );

    return rows.map(rowToGoal);
  }

  async findById(id: string): Promise<Goal | undefined> {
    const { rows } = await this.db.query<GoalRow>(
      "SELECT * FROM goals WHERE id = $1",
      [id],
    );

    return rows[0] ? rowToGoal(rows[0]) : undefined;
  }

  async update(id: string, input: GoalInput, habitCreatedAt: string): Promise<Goal | undefined> {
    const existing = await this.findById(id);
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

    await this.db.query(
      `UPDATE goals SET start_date = $1, end_date = $2, target_count = $3, updated_at = $4
       WHERE id = $5`,
      [
        normalized.startDate,
        normalized.endDate,
        normalized.targetCount,
        updatedAt,
        id,
      ],
    );

    return {
      id,
      habitId: existing.habitId,
      ...normalized,
      createdAt: existing.createdAt,
      updatedAt,
    };
  }

  async delete(id: string): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string }>(
      "DELETE FROM goals WHERE id = $1 RETURNING id",
      [id],
    );
    return rows.length > 0;
  }
}
