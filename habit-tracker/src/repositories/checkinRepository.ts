import { randomUUID } from "node:crypto";
import type { DbClient } from "./db.js";
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
  constructor(private readonly db: DbClient) {}

  async create(
    habitId: string,
    input: CheckInInput,
    habitCreatedAt: string,
    today: string,
  ): Promise<CheckIn> {
    const existingDates = (await this.findByHabitId(habitId)).map((c) => c.date);
    const normalized = normalizeCheckInInput(input, {
      habitCreatedAt,
      today,
      existingDates,
    });
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    await this.db.query(
      `INSERT INTO checkins (id, habit_id, date, created_at)
       VALUES ($1, $2, $3, $4)`,
      [id, habitId, normalized.date, createdAt],
    );

    return { id, habitId, date: normalized.date, createdAt };
  }

  async findByHabitId(habitId: string): Promise<CheckIn[]> {
    const { rows } = await this.db.query<CheckInRow>(
      "SELECT * FROM checkins WHERE habit_id = $1 ORDER BY date DESC",
      [habitId],
    );

    return rows.map(rowToCheckIn);
  }

  async delete(habitId: string, checkinId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string }>(
      "DELETE FROM checkins WHERE id = $1 AND habit_id = $2 RETURNING id",
      [checkinId, habitId],
    );
    return rows.length > 0;
  }
}
