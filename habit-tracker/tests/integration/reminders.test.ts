import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app.js";

function setDate(date: string) {
  vi.setSystemTime(new Date(`${date}T00:00:00.000Z`));
}

describe("GET /api/reminders", () => {
  let app: Express;

  beforeEach(() => {
    app = createApp({ dbPath: ":memory:" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createHabit(overrides: Record<string, unknown> = {}) {
    const res = await request(app)
      .post("/api/habits")
      .send({ name: "読書", ...overrides });
    return res.body as { id: string; createdAt: string };
  }

  it("本日まだ実行していない対象習慣を一覧に含める (US1 Acceptance Scenario 1)", async () => {
    const habit = await createHabit();

    const res = await request(app).get("/api/reminders");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: habit.id, name: "読書", category: "uncategorized" },
    ]);
  });

  it("本日既にチェックイン済みの習慣は含めない (US1 Acceptance Scenario 2)", async () => {
    const habit = await createHabit();
    await request(app).post(`/api/habits/${habit.id}/checkins`).send({});

    const res = await request(app).get("/api/reminders");

    expect(res.body).toEqual([]);
  });

  it("頻度が毎週で本日が対象外の曜日の習慣は含めない (US1 Acceptance Scenario 3)", async () => {
    setDate("2026-01-13"); // 火曜
    await createHabit({ frequencyType: "weekly", weeklyDays: [1, 3, 5] }); // 月・水・金

    const res = await request(app).get("/api/reminders");

    expect(res.body).toEqual([]);
  });

  it("対象習慣が1件もない場合は空配列を返す (US1 Acceptance Scenario 4, FR-008)", async () => {
    const res = await request(app).get("/api/reminders");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("チェックインするとリマインダー一覧から消える (US2 Acceptance Scenario 1, FR-004)", async () => {
    const habit = await createHabit();

    const before = await request(app).get("/api/reminders");
    expect(before.body).toHaveLength(1);

    await request(app).post(`/api/habits/${habit.id}/checkins`).send({});

    const after = await request(app).get("/api/reminders");
    expect(after.body).toEqual([]);
  });

  it("reminderEnabledをfalseに更新すると一覧から消え、trueに戻すと再表示される (US3 Acceptance Scenario 1-2)", async () => {
    const habit = await createHabit();

    await request(app)
      .put(`/api/habits/${habit.id}`)
      .send({ reminderEnabled: false });
    const disabled = await request(app).get("/api/reminders");
    expect(disabled.body).toEqual([]);

    await request(app)
      .put(`/api/habits/${habit.id}`)
      .send({ reminderEnabled: true });
    const enabled = await request(app).get("/api/reminders");
    expect(enabled.body).toHaveLength(1);
  });

  it("新規登録した習慣はreminderEnabled未指定でもデフォルトでリマインダー対象になる (US3 Acceptance Scenario 3)", async () => {
    await createHabit();

    const res = await request(app).get("/api/reminders");
    expect(res.body).toHaveLength(1);
  });
});
