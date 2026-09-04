import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app.js";

function setDate(date: string) {
  vi.setSystemTime(new Date(`${date}T00:00:00.000Z`));
}

describe("GET /api/reports/dashboard", () => {
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

  async function checkin(habitId: string, date?: string) {
    const res = await request(app)
      .post(`/api/habits/${habitId}/checkins`)
      .send(date ? { date } : {});
    expect(res.status).toBe(201);
  }

  it("習慣ごとにcurrentStreak・longestStreak・weekly・monthlyを含む (US1 Acceptance Scenario 1)", async () => {
    setDate("2026-01-10");
    const habit = await createHabit();
    await checkin(habit.id); // 01-10
    setDate("2026-01-11"); // 未チェックイン
    setDate("2026-01-12");
    await checkin(habit.id); // 01-12
    setDate("2026-01-13"); // 未チェックイン
    setDate("2026-01-14");
    await checkin(habit.id); // 01-14
    setDate("2026-01-15");
    await checkin(habit.id); // 01-15
    setDate("2026-01-16");
    await checkin(habit.id); // 01-16（今日）

    const res = await request(app).get("/api/reports/dashboard");

    expect(res.status).toBe(200);
    const result = res.body.habits.find((h: { habitId: string }) => h.habitId === habit.id);
    expect(result.weekly).toEqual({ targetDays: 7, actualDays: 5, percent: 71 });
  });

  it("過去の最長ストリークは、その後途切れても現在のストリークとは別に保持される (US1 Acceptance Scenario 2)", async () => {
    setDate("2025-12-27");
    const habit = await createHabit();
    for (const date of [
      "2025-12-27",
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]) {
      setDate(date);
      await checkin(habit.id);
    }
    // 01-03〜01-14は未チェックインのまま経過させる
    setDate("2026-01-15");
    await checkin(habit.id);
    setDate("2026-01-16");
    await checkin(habit.id);

    const res = await request(app).get("/api/reports/dashboard");

    const result = res.body.habits.find((h: { habitId: string }) => h.habitId === habit.id);
    expect(result.longestStreak).toBe(7);
    expect(result.currentStreak).toBe(2);
  });

  it("チェックインが1件もない習慣は達成率0%・最長ストリーク0として表示される (US1 Acceptance Scenario 3)", async () => {
    setDate("2026-01-16");
    const habit = await createHabit();

    const res = await request(app).get("/api/reports/dashboard");

    const result = res.body.habits.find((h: { habitId: string }) => h.habitId === habit.id);
    expect(result.weekly.percent).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("習慣・チェックイン・目標が1件も登録されていない場合、エラーにならず空配列を返す (FR-011, SC-003)", async () => {
    const res = await request(app).get("/api/reports/dashboard");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ habits: [], categories: [], goals: [] });
  });

  it("習慣の頻度を変更すると、既存のチェックイン履歴を含め現在の頻度設定で再計算される (FR-005)", async () => {
    setDate("2026-01-05"); // 月曜
    const habit = await createHabit({ frequencyType: "weekly", weeklyDays: [1] });
    await checkin(habit.id); // 01-05（月）
    setDate("2026-01-12"); // 月曜
    await checkin(habit.id); // 01-12（月）
    setDate("2026-01-16"); // 金曜（今日）

    const before = await request(app).get("/api/reports/dashboard");
    const beforeResult = before.body.habits.find(
      (h: { habitId: string }) => h.habitId === habit.id,
    );
    expect(beforeResult.weekly).toEqual({ targetDays: 1, actualDays: 1, percent: 100 });
    expect(beforeResult.longestStreak).toBe(2);

    await request(app)
      .put(`/api/habits/${habit.id}`)
      .send({ frequencyType: "daily" });

    const after = await request(app).get("/api/reports/dashboard");
    const afterResult = after.body.habits.find(
      (h: { habitId: string }) => h.habitId === habit.id,
    );
    expect(afterResult.weekly).toEqual({ targetDays: 7, actualDays: 1, percent: 14 });
    expect(afterResult.longestStreak).toBe(1);
  });

  it("カテゴリごとの週次/月次達成率が正しく集計され、習慣が0件のカテゴリは含まれない (US2 Acceptance Scenario 1-3)", async () => {
    setDate("2026-01-10");
    const habitA = await createHabit({ category: "health" });
    const habitB = await createHabit({ category: "health" });
    const habitC = await createHabit({ category: "study" });
    await checkin(habitA.id, "2026-01-10");
    await checkin(habitB.id, "2026-01-10");
    setDate("2026-01-16");
    await checkin(habitB.id, "2026-01-16");

    const res = await request(app).get("/api/reports/dashboard");

    const health = res.body.categories.find((c: { category: string }) => c.category === "health");
    const study = res.body.categories.find((c: { category: string }) => c.category === "study");
    const work = res.body.categories.find((c: { category: string }) => c.category === "work");

    expect(health.weekly).toEqual({ targetDays: 14, actualDays: 3, percent: 21 });
    expect(study.weekly).toEqual({ targetDays: 7, actualDays: 0, percent: 0 });
    expect(work).toBeUndefined();
  });

  it("目標の進行中/達成/未達成が正しく判定される (US3 Acceptance Scenario 1-2)", async () => {
    setDate("2026-01-01");
    const habit = await createHabit();

    const goalAchieved = await request(app).post("/api/goals").send({
      habitId: habit.id,
      startDate: "2026-01-01",
      endDate: "2026-01-10",
      targetCount: 1,
    });
    const goalNotAchieved = await request(app).post("/api/goals").send({
      habitId: habit.id,
      startDate: "2026-01-01",
      endDate: "2026-01-10",
      targetCount: 5,
    });
    const goalInProgress = await request(app).post("/api/goals").send({
      habitId: habit.id,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      targetCount: 10,
    });

    setDate("2026-01-05");
    await checkin(habit.id);

    setDate("2026-01-16");
    const res = await request(app).get("/api/reports/dashboard");

    const byId = (id: string) =>
      res.body.goals.find((g: { goalId: string }) => g.goalId === id);

    expect(byId(goalAchieved.body.id).status).toBe("achieved");
    expect(byId(goalNotAchieved.body.id).status).toBe("not_achieved");
    expect(byId(goalInProgress.body.id)).toMatchObject({
      status: "in_progress",
      actualCount: 1,
      progressPercent: 10,
    });
  });
});
