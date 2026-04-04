import request from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";

describe("Health & 404", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
  });

  test("GET /health returns { ok: true }", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/i);
    expect(res.body).toEqual({ ok: true });
  });

  test("GET /no-such-route triggers 404 text/plain", async () => {
    const res = await request(app).get("/no-such-route");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toMatch(/404 Not found/i);
  });
});
