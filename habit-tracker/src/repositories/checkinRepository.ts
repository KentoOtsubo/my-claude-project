import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { CheckIn, CheckInInput } from "../domain/checkin.js";
import { normalizeCheckInInput } from "../domain/checkin.js";

interface CheckInRow {
  id: string;
  habit_id: string;
  date: string;
  created_at: string;
}

function rowToCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    createdAt: row.created_at,
  };
}

export class CheckInRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(
    habitId: string,
    input: CheckInInput,
    habitCreatedAt: string,
    today: string,
  ): CheckIn {
    const existingDates = this.findByHabitId(habitId).map((c) => c.date);
    const normalized = normalizeCheckInInput(input, {
      habitCreatedAt,
      today,
      existingDates,
    });
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO checkins (id, habit_id, date, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, habitId, normalized.date, createdAt);

    return { id, habitId, date: normalized.date, createdAt };
  }

  findByHabitId(habitId: string): CheckIn[] {
    const rows = this.db
      .prepare("SELECT * FROM checkins WHERE habit_id = ? ORDER BY date DESC")
      .all(habitId) as unknown as CheckInRow[];

    return rows.map(rowToCheckIn);
  }

  delete(habitId: string, checkinId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM checkins WHERE id = ? AND habit_id = ?")
      .run(checkinId, habitId);
    return Number(result.changes) > 0;
  }
}
