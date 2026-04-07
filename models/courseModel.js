// models/courseModel.js
import { coursesDb } from "./_db.js";

const ALLOWED_LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const ALLOWED_TYPES = new Set(["WEEKLY_BLOCK", "WEEKEND_WORKSHOP"]);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isIsoDateOnly = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeGbpAmount = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  const scaled = value * 100;
  const hasTwoOrFewerDecimals =
    Math.abs(scaled - Math.round(scaled)) < Number.EPSILON * 100;
  if (!hasTwoOrFewerDecimals) {
    return null;
  }
  return value.toFixed(2);
};

function validateCoursePayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Course payload must be an object");
  }

  const requiredFields = [
    "title",
    "level",
    "type",
    "allowDropIn",
    "capacity",
    "price",
    "startDate",
    "endDate",
    "instructorId",
  ];

  if (!partial) {
    for (const field of requiredFields) {
      if (payload[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  const course = {
    ...payload,
    description: typeof payload.description === "string" ? payload.description : "",
    location: typeof payload.location === "string" ? payload.location : "",
  };

  if (course.title !== undefined && !isNonEmptyString(course.title)) {
    throw new Error("Invalid title");
  }

  if (course.level !== undefined && !ALLOWED_LEVELS.has(course.level)) {
    throw new Error("Invalid level");
  }

  if (course.type !== undefined && !ALLOWED_TYPES.has(course.type)) {
    throw new Error("Invalid type");
  }

  if (course.allowDropIn !== undefined && typeof course.allowDropIn !== "boolean") {
    throw new Error("allowDropIn must be a boolean");
  }

  if (
    course.capacity !== undefined &&
    (!Number.isInteger(course.capacity) || course.capacity < 0)
  ) {
    throw new Error("capacity must be a non-negative integer");
  }

  if (course.price !== undefined) {
    const normalizedPrice = normalizeGbpAmount(course.price);
    if (normalizedPrice === null) {
      throw new Error("price must be a valid GBP amount in pounds (up to 2 decimals)");
    }
    course.price = normalizedPrice;
  }

  if (course.startDate !== undefined && !isIsoDateOnly(course.startDate)) {
    throw new Error("startDate must be in YYYY-MM-DD format");
  }

  if (course.endDate !== undefined && !isIsoDateOnly(course.endDate)) {
    throw new Error("endDate must be in YYYY-MM-DD format");
  }

  if (course.startDate && course.endDate) {
    const start = new Date(course.startDate);
    const end = new Date(course.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      throw new Error("endDate must be on or after startDate");
    }
  }

  if (course.instructorId !== undefined && !isNonEmptyString(course.instructorId)) {
    throw new Error("Invalid instructorId");
  }

  if (course.description !== undefined && typeof course.description !== "string") {
    throw new Error("description must be a string");
  }

  if (course.location !== undefined && typeof course.location !== "string") {
    throw new Error("location must be a string");
  }

  return course;
}

export const CourseModel = {
  async create(course) {
    try {
      const now = new Date().toISOString();
      const validated = validateCoursePayload(course);
      return await coursesDb.insert({
        ...validated,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      throw new Error(`CourseModel.create failed: ${err.message}`);
    }
  },

  async findById(id) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      return await coursesDb.findOne({ _id: id });
    } catch (err) {
      throw new Error(`CourseModel.findById failed: ${err.message}`);
    }
  },

  async list(filter = {}) {
    try {
      return await coursesDb.find(filter);
    } catch (err) {
      throw new Error(`CourseModel.list failed: ${err.message}`);
    }
  },

  async update(id, patch) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      const validatedPatch = validateCoursePayload(patch, { partial: true });
      await coursesDb.update(
        { _id: id },
        { $set: { ...validatedPatch, updatedAt: new Date().toISOString() } }
      );
      return await this.findById(id);
    } catch (err) {
      throw new Error(`CourseModel.update failed: ${err.message}`);
    }
  },

  async delete(id) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      const deletedCount = await coursesDb.remove({ _id: id }, {});
      return deletedCount > 0;
    } catch (err) {
      throw new Error(`CourseModel.delete failed: ${err.message}`);
    }
  },
};
