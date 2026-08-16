import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app.js";

describe("/api/habits/:habitId/checkins", () => {
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

  describe("POST /api/habits/:habitId/checkins", () => {
    it("日付を指定してチェックインを記録できる (Acceptance Scenario 1)", async () => {
      const habit = await createHabit();

      const res = await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({ date: "2026-08-16" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ habitId: habit.id, date: "2026-08-16" });
    });

    it("日付未指定の場合は今日の日付で記録される (FR-002)", async () => {
      const habit = await createHabit();

      const res = await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({});

      expect(res.status).toBe(201);
      expect(typeof res.body.date).toBe("string");
    });

    it("同じ習慣・同じ日付への重複チェックインは400を返す (Acceptance Scenario 2)", async () => {
      const habit = await createHabit();
      await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({ date: "2026-08-16" });

      const res = await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({ date: "2026-08-16" });

      expect(res.status).toBe(400);
    });

    it("習慣の作成日より前の日付は400を返す (Acceptance Scenario 3)", async () => {
      const habit = await createHabit();

      const res = await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({ date: "2020-01-01" });

      expect(res.status).toBe(400);
    });

    it("存在しない習慣IDの場合は404を返す (FR-013)", async () => {
      const res = await request(app)
        .post("/api/habits/does-not-exist/checkins")
        .send({ date: "2026-08-16" });

      expect(res.status).toBe(404);
    });

    it("習慣を削除すると紐づくチェックインも連鎖削除される (FR-014)", async () => {
      const habit = await createHabit();
      await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({ date: "2026-08-16" });

      await request(app).delete(`/api/habits/${habit.id}`);

      const res = await request(app).get(`/api/habits/${habit.id}/checkins`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/habits/:habitId/checkins", () => {
    it("チェックイン履歴を日付の新しい順に返す (User Story 3, Acceptance Scenario 1)", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-14T00:00:00.000Z"));
      const habit = await createHabit();
      await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: "2026-08-14" });

      vi.setSystemTime(new Date("2026-08-16T00:00:00.000Z"));
      await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: "2026-08-16" });

      vi.setSystemTime(new Date("2026-08-15T00:00:00.000Z"));
      await request(app).post(`/api/habits/${habit.id}/checkins`).send({ date: "2026-08-15" });

      const res = await request(app).get(`/api/habits/${habit.id}/checkins`);

      expect(res.status).toBe(200);
      expect(res.body.map((c: { date: string }) => c.date)).toEqual([
        "2026-08-16",
        "2026-08-15",
        "2026-08-14",
      ]);
    });

    it("履歴が0件の場合は空配列を返す", async () => {
      const habit = await createHabit();

      const res = await request(app).get(`/api/habits/${habit.id}/checkins`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("存在しない習慣IDの場合は404を返す (FR-013)", async () => {
      const res = await request(app).get("/api/habits/does-not-exist/checkins");
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/habits/:habitId/checkins/:checkinId", () => {
    it("チェックインを取り消せる (Acceptance Scenario 2)", async () => {
      const habit = await createHabit();
      const created = await request(app)
        .post(`/api/habits/${habit.id}/checkins`)
        .send({ date: "2026-08-16" });

      const res = await request(app).delete(
        `/api/habits/${habit.id}/checkins/${created.body.id}`,
      );
      expect(res.status).toBe(204);

      const history = await request(app).get(`/api/habits/${habit.id}/checkins`);
      expect(history.body).toEqual([]);
    });

    it("存在しないチェックインIDの場合は404を返す (Acceptance Scenario 4, FR-013)", async () => {
      const habit = await createHabit();

      const res = await request(app).delete(
        `/api/habits/${habit.id}/checkins/does-not-exist`,
      );
      expect(res.status).toBe(404);
    });

    it("存在しない習慣IDの場合は404を返す (FR-013)", async () => {
      const res = await request(app).delete(
        "/api/habits/does-not-exist/checkins/does-not-exist",
      );
      expect(res.status).toBe(404);
    });
  });
});
