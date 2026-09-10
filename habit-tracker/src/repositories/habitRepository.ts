import { randomUUID } from "node:crypto";
import type { DbClient } from "./db.js";
import {
  type Category,
  type Habit,
  type HabitInput,
  normalizeHabitInput,
} from "../domain/habit.js";

interface HabitRow {
  id: string;
  name: string;
  frequency_type: string;
  weekly_days: string;
  category: string;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    frequencyType: row.frequency_type as Habit["frequencyType"],
    weeklyDays: JSON.parse(row.weekly_days) as number[],
    category: row.category as Category,
    reminderEnabled: row.reminder_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class HabitRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: HabitInput): Promise<Habit> {
    const normalized = normalizeHabitInput(input);
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO habits (id, name, frequency_type, weekly_days, category, reminder_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        normalized.name,
        normalized.frequencyType,
        JSON.stringify(normalized.weeklyDays),
        normalized.category,
        normalized.reminderEnabled,
        now,
        now,
      ],
    );

    return { id, ...normalized, createdAt: now, updatedAt: now };
  }

  async findAll(category?: Category): Promise<Habit[]> {
    const { rows } = category
      ? await this.db.query<HabitRow>(
          "SELECT * FROM habits WHERE category = $1 ORDER BY created_at ASC",
          [category],
        )
      : await this.db.query<HabitRow>("SELECT * FROM habits ORDER BY created_at ASC");

    return rows.map(rowToHabit);
  }

  async findById(id: string): Promise<Habit | undefined> {
    const { rows } = await this.db.query<HabitRow>(
      "SELECT * FROM habits WHERE id = $1",
      [id],
    );

    return rows[0] ? rowToHabit(rows[0]) : undefined;
  }

  async update(id: string, input: HabitInput): Promise<Habit | undefined> {
    const existing = await this.findById(id);
    if (!existing) {
      return undefined;
    }

    const merged: HabitInput = {
      name: input.name ?? existing.name,
      frequencyType: input.frequencyType ?? existing.frequencyType,
      weeklyDays: input.weeklyDays ?? existing.weeklyDays,
      category: input.category ?? existing.category,
      reminderEnabled: input.reminderEnabled ?? existing.reminderEnabled,
    };
    const normalized = normalizeHabitInput(merged);
    const updatedAt = new Date().toISOString();

    await this.db.query(
      `UPDATE habits SET name = $1, frequency_type = $2, weekly_days = $3, category = $4,
       reminder_enabled = $5, updated_at = $6
       WHERE id = $7`,
      [
        normalized.name,
        normalized.frequencyType,
        JSON.stringify(normalized.weeklyDays),
        normalized.category,
        normalized.reminderEnabled,
        updatedAt,
        id,
      ],
    );

    return { id, ...normalized, createdAt: existing.createdAt, updatedAt };
  }

  async delete(id: string): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string }>(
      "DELETE FROM habits WHERE id = $1 RETURNING id",
      [id],
    );
    return rows.length > 0;
  }
}
