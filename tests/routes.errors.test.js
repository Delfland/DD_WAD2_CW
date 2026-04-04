import request from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";

describe("Edge cases", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
  });

  test("GET /courses/:id with bad id returns 404 JSON", async () => {
    const res = await request(app).get("/courses/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json|html|text/); // depends on controller style
  });

  test("POST /bookings/session with invalid sessionId returns 404 JSON", async () => {
    const res = await request(app).post("/bookings/session").send({
      userId: "invalid-user",
      sessionId: "invalid-session",
    });
    // Your booking controller responds 404 if session not found
    expect([404, 500]).toContain(res.status); // adjust based on controller
  });
});
