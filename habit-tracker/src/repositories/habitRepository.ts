import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class HabitRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: HabitInput): Habit {
    const normalized = normalizeHabitInput(input);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO habits (id, name, frequency_type, weekly_days, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        normalized.name,
        normalized.frequencyType,
        JSON.stringify(normalized.weeklyDays),
        normalized.category,
        now,
        now,
      );

    return { id, ...normalized, createdAt: now, updatedAt: now };
  }

  findAll(category?: Category): Habit[] {
    const rows = category
      ? (this.db
          .prepare(
            "SELECT * FROM habits WHERE category = ? ORDER BY created_at ASC",
          )
          .all(category) as unknown as HabitRow[])
      : (this.db
          .prepare("SELECT * FROM habits ORDER BY created_at ASC")
          .all() as unknown as HabitRow[]);

    return rows.map(rowToHabit);
  }

  findById(id: string): Habit | undefined {
    const row = this.db
      .prepare("SELECT * FROM habits WHERE id = ?")
      .get(id) as HabitRow | undefined;

    return row ? rowToHabit(row) : undefined;
  }

  update(id: string, input: HabitInput): Habit | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    const merged: HabitInput = {
      name: input.name ?? existing.name,
      frequencyType: input.frequencyType ?? existing.frequencyType,
      weeklyDays: input.weeklyDays ?? existing.weeklyDays,
      category: input.category ?? existing.category,
    };
    const normalized = normalizeHabitInput(merged);
    const updatedAt = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE habits SET name = ?, frequency_type = ?, weekly_days = ?, category = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        normalized.name,
        normalized.frequencyType,
        JSON.stringify(normalized.weeklyDays),
        normalized.category,
        updatedAt,
        id,
      );

    return { id, ...normalized, createdAt: existing.createdAt, updatedAt };
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM habits WHERE id = ?").run(id);
    return Number(result.changes) > 0;
  }
}
