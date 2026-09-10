import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app.js";
import { todayJst as today } from "../../src/domain/clock.js";
import { createTestDb, resetTestDb, type DbClient } from "./testDb.js";

describe("/api/goals", () => {
  let db: DbClient;
  let app: Express;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await resetTestDb(db);
    app = await createApp({ db });
  });

  async function createHabit(overrides: Record<string, unknown> = {}) {
    const res = await request(app)
      .post("/api/habits")
      .send({ name: "読書", ...overrides });
    return res.body as { id: string; createdAt: string };
  }

  describe("POST /api/goals", () => {
    it("習慣に対して期間・目標回数を指定して目標を設定できる (Acceptance Scenario 1)", async () => {
      const habit = await createHabit();

      const res = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: today(),
          targetCount: 20,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ habitId: habit.id, targetCount: 20 });

      const list = await request(app).get("/api/goals");
      expect(list.body).toHaveLength(1);
    });

    it("開始日が終了日より後の場合は400を返す (Acceptance Scenario 2)", async () => {
      const habit = await createHabit();

      const res = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: "2020-01-01",
          targetCount: 20,
        });

      expect(res.status).toBe(400);
    });

    it("目標回数が0以下の場合は400を返す (Acceptance Scenario 3)", async () => {
      const habit = await createHabit();

      const res = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: today(),
          targetCount: 0,
        });

      expect(res.status).toBe(400);
    });

    it("存在しない習慣IDの場合は404を返す (FR-004)", async () => {
      const res = await request(app)
        .post("/api/goals")
        .send({
          habitId: "does-not-exist",
          startDate: today(),
          endDate: today(),
          targetCount: 20,
        });

      expect(res.status).toBe(404);
    });

    it("習慣を削除すると紐づく目標も連鎖削除される (FR-014)", async () => {
      const habit = await createHabit();
      const created = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: today(),
          targetCount: 20,
        });
      expect(created.status).toBe(201);

      await request(app).delete(`/api/habits/${habit.id}`);

      const list = await request(app).get("/api/goals");
      expect(list.body).toHaveLength(0);
    });
  });

  describe("GET /api/goals", () => {
    it("目標が0件の場合は空配列を返す", async () => {
      const res = await request(app).get("/api/goals");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("actualCount / progressPercent / achieved が正しく含まれる (Acceptance Scenario 1-3, US2)", async () => {
      const habit = await createHabit();
      const goal = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: today(),
          targetCount: 2,
        });

      await request(app).post(`/api/habits/${habit.id}/checkins`).send({});

      const res = await request(app).get("/api/goals");

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: goal.body.id,
        actualCount: 1,
        progressPercent: 50,
        achieved: false,
      });
    });

    it("同一習慣で期間が重複する複数の目標がそれぞれ独立して進捗を計算する (FR-015)", async () => {
      const habit = await createHabit();

      const goalA = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: today(),
          targetCount: 1,
        });
      const goalB = await request(app)
        .post("/api/goals")
        .send({
          habitId: habit.id,
          startDate: today(),
          endDate: today(),
          targetCount: 5,
        });

      await request(app).post(`/api/habits/${habit.id}/checkins`).send({});

      const res = await request(app).get("/api/goals");
      const resultA = res.body.find((g: { id: string }) => g.id === goalA.body.id);
      const resultB = res.body.find((g: { id: string }) => g.id === goalB.body.id);

      expect(resultA).toMatchObject({ actualCount: 1, progressPercent: 100, achieved: true });
      expect(resultB).toMatchObject({ actualCount: 1, progressPercent: 20, achieved: false });
    });
  });

  describe("PUT /api/goals/:id", () => {
    it("目標回数を変更でき、進捗が再計算される (Acceptance Scenario 1)", async () => {
      const habit = await createHabit();
      const created = await request(app)
        .post("/api/goals")
        .send({ habitId: habit.id, startDate: today(), endDate: today(), targetCount: 10 });
      await request(app).post(`/api/habits/${habit.id}/checkins`).send({});

      const res = await request(app)
        .put(`/api/goals/${created.body.id}`)
        .send({ targetCount: 1 });

      expect(res.status).toBe(200);
      expect(res.body.targetCount).toBe(1);

      const list = await request(app).get("/api/goals");
      expect(list.body[0]).toMatchObject({ progressPercent: 100, achieved: true });
    });

    it("部分更新時は既存フィールドを保持する (001のPUT部分更新マージ方針)", async () => {
      const habit = await createHabit();
      const created = await request(app)
        .post("/api/goals")
        .send({ habitId: habit.id, startDate: today(), endDate: today(), targetCount: 10 });

      const res = await request(app)
        .put(`/api/goals/${created.body.id}`)
        .send({ targetCount: 5 });

      expect(res.status).toBe(200);
      expect(res.body.targetCount).toBe(5);
      expect(res.body.startDate).toBe(today());
      expect(res.body.endDate).toBe(today());
    });

    it("存在しない目標IDの場合は404を返す (FR-013)", async () => {
      const res = await request(app)
        .put("/api/goals/does-not-exist")
        .send({ targetCount: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/goals/:id", () => {
    it("目標を削除できる (Acceptance Scenario 2)", async () => {
      const habit = await createHabit();
      const created = await request(app)
        .post("/api/goals")
        .send({ habitId: habit.id, startDate: today(), endDate: today(), targetCount: 10 });

      const res = await request(app).delete(`/api/goals/${created.body.id}`);
      expect(res.status).toBe(204);

      const list = await request(app).get("/api/goals");
      expect(list.body).toHaveLength(0);
    });

    it("存在しない目標IDの場合は404を返す (Acceptance Scenario 4, FR-013)", async () => {
      const res = await request(app).delete("/api/goals/does-not-exist");
      expect(res.status).toBe(404);
    });
  });
});
