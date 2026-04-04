import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";

describe("JSON API routes", () => {
  let data;
  let student;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    // Create a student for bookings
    student = await UserModel.create({
      name: "API Student",
      email: "api@student.local",
      role: "student",
    });
  });

  // COURSES
  test("GET /courses returns array of courses", async () => {
    const res = await request(app).get("/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(res.body.courses.some((c) => c.title === "Test Course")).toBe(true);
  });

  test("POST /courses creates a course", async () => {
    const payload = {
      title: "API Created Course",
      level: "advanced",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-01",
      endDate: "2026-05-02",
      instructorId: data.instructor._id,
      description: "Created via API route.",
    };
    const res = await request(app).post("/courses").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.title).toBe("API Created Course");
  });

  test("GET /courses/:id returns course + sessions", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.body.course._id).toBe(data.course._id);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBe(2);
  });

  // SESSIONS
  test("POST /sessions creates a session", async () => {
    const payload = {
      courseId: data.course._id,
      startDateTime: new Date("2026-02-16T18:30:00").toISOString(),
      endDateTime: new Date("2026-02-16T19:45:00").toISOString(),
      capacity: 16,
      bookedCount: 0,
    };
    const res = await request(app).post("/sessions").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.courseId).toBe(data.course._id);
  });

  test("GET /sessions/by-course/:courseId returns sessions array", async () => {
    const res = await request(app).get(
      `/sessions/by-course/${data.course._id}`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
  });

  // BOOKINGS
  test("POST /bookings/course creates a course booking (CONFIRMED or WAITLISTED)", async () => {
    const res = await request(app).post("/bookings/course").send({
      userId: student._id,
      courseId: data.course._id,
    });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("COURSE");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("POST /bookings/session creates a session booking (CONFIRMED or WAITLISTED)", async () => {
    const res = await request(app).post("/bookings/session").send({
      userId: student._id,
      sessionId: data.sessions[0]._id,
    });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("SESSION");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("DELETE /bookings/:id cancels a booking", async () => {
    // Create, then cancel
    const create = await request(app).post("/bookings/session").send({
      userId: student._id,
      sessionId: data.sessions[1]._id,
    });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking._id;

    const del = await request(app).delete(`/bookings/${bookingId}`);
    expect(del.status).toBe(200);
    expect(del.body.booking.status).toBe("CANCELLED");
  });
});
