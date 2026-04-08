import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { createAuthToken } from "../auth/auth.js";

describe("SSR view routes", () => {
  let data;

  const authCookie = (user) => `authToken=${createAuthToken(user)}`;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("GET / (home) renders HTML", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    // Page title from home.mustache (adjust if you changed it)
    expect(res.text).toMatch(/Courses|Upcoming Courses/i);
  });

  test("GET /courses (list page) renders HTML and shows Test Course", async () => {
    const res = await request(app)
      .get("/courses")
      .set("Cookie", authCookie(data.instructor));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id (detail page) renders HTML", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id/book renders course booking form", async () => {
    const res = await request(app)
      .get(`/courses/${data.course._id}/book`)
      .set("Cookie", authCookie(data.student));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Confirm Course Booking|Book:/i);
  });

  test("GET /sessions/:id/book renders session booking form", async () => {
    const sessionId = data.sessions[0]._id;
    const res = await request(app).get(`/sessions/${sessionId}/book`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Confirm Session Booking|Book Session/i);
  });

  test("GET /users renders users alphabetically by name with emails", async () => {
    const res = await request(app)
      .get("/users")
      .set("Cookie", authCookie(data.instructor));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Registered Users/);
    expect(res.text).toMatch(/instructor@test\.local/);
    expect(res.text).toMatch(/student@test\.local/);

    const instructorIdx = res.text.indexOf("Test Instructor");
    const studentIdx = res.text.indexOf("Test Student");
    expect(instructorIdx).toBeGreaterThan(-1);
    expect(studentIdx).toBeGreaterThan(-1);
    expect(instructorIdx).toBeLessThan(studentIdx);
  });
});
