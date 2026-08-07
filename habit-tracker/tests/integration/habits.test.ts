import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app.js";

describe("/api/habits", () => {
  let app: Express;

  beforeEach(() => {
    app = createApp({ dbPath: ":memory:" });
  });

  describe("POST /api/habits", () => {
    it("名前・頻度・カテゴリを指定して登録できる (Acceptance Scenario 1)", async () => {
      const res = await request(app)
        .post("/api/habits")
        .send({ name: "読書", frequencyType: "daily", category: "study" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "読書",
        frequencyType: "daily",
        category: "study",
      });

      const list = await request(app).get("/api/habits");
      expect(list.body).toHaveLength(1);
      expect(list.body[0].name).toBe("読書");
    });

    it("名前未指定の場合は400を返し登録されない (Acceptance Scenario 2)", async () => {
      const res = await request(app).post("/api/habits").send({});
      expect(res.status).toBe(400);

      const list = await request(app).get("/api/habits");
      expect(list.body).toHaveLength(0);
    });

    it("頻度・カテゴリ未指定の場合はデフォルト値が適用される (Acceptance Scenario 3)", async () => {
      const res = await request(app).post("/api/habits").send({ name: "読書" });

      expect(res.status).toBe(201);
      expect(res.body.frequencyType).toBe("daily");
      expect(res.body.category).toBe("uncategorized");
    });
  });

  describe("GET /api/habits", () => {
    it("習慣が0件の場合は空配列を返す", async () => {
      const res = await request(app).get("/api/habits");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("PUT /api/habits/:id", () => {
    it("既存の習慣を編集できる (Acceptance Scenario 2)", async () => {
      const created = await request(app).post("/api/habits").send({ name: "読書" });

      const res = await request(app)
        .put(`/api/habits/${created.body.id}`)
        .send({ frequencyType: "weekly", weeklyDays: [1, 3, 5] });

      expect(res.status).toBe(200);
      expect(res.body.frequencyType).toBe("weekly");
      expect(res.body.weeklyDays).toEqual([1, 3, 5]);
      expect(res.body.name).toBe("読書");
    });

    it("部分更新時は既存フィールドを保持する (U1: PUT部分更新のマージ方針)", async () => {
      const created = await request(app)
        .post("/api/habits")
        .send({ name: "読書", category: "study" });

      const res = await request(app)
        .put(`/api/habits/${created.body.id}`)
        .send({ name: "読書メモ" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("読書メモ");
      expect(res.body.category).toBe("study");
      expect(res.body.frequencyType).toBe("daily");
    });

    it("存在しないIDの場合は404を返す (FR-012)", async () => {
      const res = await request(app)
        .put("/api/habits/does-not-exist")
        .send({ name: "x" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/habits/:id", () => {
    it("既存の習慣を削除できる (Acceptance Scenario 3)", async () => {
      const created = await request(app).post("/api/habits").send({ name: "読書" });

      const res = await request(app).delete(`/api/habits/${created.body.id}`);
      expect(res.status).toBe(204);

      const list = await request(app).get("/api/habits");
      expect(list.body).toHaveLength(0);
    });

    it("存在しないIDの場合は404を返す (FR-012)", async () => {
      const res = await request(app).delete("/api/habits/does-not-exist");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/habits?category=...", () => {
    it("カテゴリで絞り込める (Acceptance Scenario 1, US3)", async () => {
      await request(app).post("/api/habits").send({ name: "運動", category: "health" });
      await request(app).post("/api/habits").send({ name: "読書", category: "study" });
      await request(app).post("/api/habits").send({ name: "散歩", category: "health" });

      const res = await request(app).get("/api/habits?category=health");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(
        res.body.every((habit: { category: string }) => habit.category === "health"),
      ).toBe(true);
    });

    it("絞り込みを解除するとすべての習慣が表示される (Acceptance Scenario 2, US3)", async () => {
      await request(app).post("/api/habits").send({ name: "運動", category: "health" });
      await request(app).post("/api/habits").send({ name: "読書", category: "study" });

      const res = await request(app).get("/api/habits");

      expect(res.body).toHaveLength(2);
    });

    it("不正なカテゴリ値の場合は400を返す (FR-008)", async () => {
      const res = await request(app).get("/api/habits?category=invalid");
      expect(res.status).toBe(400);
    });
  });
});
