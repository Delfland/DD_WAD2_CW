import { describe, expect, test, beforeEach } from "@jest/globals";
import { resetDb } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";

describe("CourseModel price normalization", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("stores 10.5 as 10.50", async () => {
    const instructor = await UserModel.create({
      name: "Price Test Instructor",
      email: "price-instructor@test.local",
      role: "admin",
    });

    const course = await CourseModel.create({
      title: "Price Test Course",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      capacity: 12,
      price: 10.5,
      startDate: "2026-05-01",
      endDate: "2026-06-01",
      instructorId: instructor._id,
      description: "Course used to verify price formatting.",
    });

    expect(course.price).toBe("10.50");
  });
});
