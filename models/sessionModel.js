
// models/sessionModel.js
import { sessionsDb } from "./_db.js";
import { CourseModel } from "./courseModel.js";

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isIsoDateTime = (value) =>
  typeof value === "string" && !Number.isNaN(new Date(value).getTime());

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

const withInheritedCapacity = async (session) => {
  if (!session) return session;
  const course = await CourseModel.findById(session.courseId);
  const inheritedCapacity = Number.isInteger(course?.capacity) ? course.capacity : 0;
  return {
    ...session,
    capacity: inheritedCapacity,
  };
};

const listWithInheritedCapacity = async (sessions) =>
  Promise.all(sessions.map((s) => withInheritedCapacity(s)));

function validateSessionPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Session payload must be an object");
  }

  const requiredFields = ["courseId", "startDateTime", "endDateTime"];

  if (!partial) {
    for (const field of requiredFields) {
      if (payload[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  const session = {
    ...payload,
  };

  if (session.courseId !== undefined && !isNonEmptyString(session.courseId)) {
    throw new Error("Invalid courseId");
  }

  if (session.startDateTime !== undefined && !isIsoDateTime(session.startDateTime)) {
    throw new Error("startDateTime must be a valid ISO datetime string");
  }

  if (session.endDateTime !== undefined && !isIsoDateTime(session.endDateTime)) {
    throw new Error("endDateTime must be a valid ISO datetime string");
  }

  if (session.startDateTime && session.endDateTime) {
    const start = new Date(session.startDateTime);
    const end = new Date(session.endDateTime);
    if (end < start) {
      throw new Error("endDateTime must be on or after startDateTime");
    }
  }

  if (
    session.bookedCount !== undefined &&
    !isNonNegativeInteger(session.bookedCount)
  ) {
    throw new Error("bookedCount must be a non-negative integer");
  }

  return session;
}

export const SessionModel = {
  async create(session) {
    try {
      const now = new Date().toISOString();
      const validated = validateSessionPayload(session);
      const course = await CourseModel.findById(validated.courseId);
      if (!course) {
        throw new Error("Course not found for session");
      }
      const inheritedCapacity = Number.isInteger(course.capacity) ? course.capacity : 0;
      const stored = {
        ...validated,
        capacity: inheritedCapacity,
        bookedCount:
          validated.bookedCount === undefined ? 0 : validated.bookedCount,
        createdAt: now,
        updatedAt: now,
      };
      return await sessionsDb.insert(stored);
    } catch (err) {
      throw new Error(`SessionModel.create failed: ${err.message}`);
    }
  },

  async findById(id) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      const session = await sessionsDb.findOne({ _id: id });
      return await withInheritedCapacity(session);
    } catch (err) {
      throw new Error(`SessionModel.findById failed: ${err.message}`);
    }
  },

  async list(filter = {}) {
    try {
      const sessions = await sessionsDb.find(filter).sort({ startDateTime: 1 });
      return await listWithInheritedCapacity(sessions);
    } catch (err) {
      throw new Error(`SessionModel.list failed: ${err.message}`);
    }
  },

  async listByCourse(courseId) {
    try {
      if (!isNonEmptyString(courseId)) throw new Error("Invalid courseId");
      const sessions = await sessionsDb.find({ courseId }).sort({ startDateTime: 1 });
      return await listWithInheritedCapacity(sessions);
    } catch (err) {
      throw new Error(`SessionModel.listByCourse failed: ${err.message}`);
    }
  },

  async update(id, patch) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      if (patch?.capacity !== undefined) {
        throw new Error("Session capacity is inherited from course and cannot be updated directly");
      }
      const validatedPatch = validateSessionPayload(patch, { partial: true });
      await sessionsDb.update(
        { _id: id },
        { $set: { ...validatedPatch, updatedAt: new Date().toISOString() } }
      );
      return await this.findById(id);
    } catch (err) {
      throw new Error(`SessionModel.update failed: ${err.message}`);
    }
  },

  async delete(id) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      const deletedCount = await sessionsDb.remove({ _id: id }, {});
      return deletedCount > 0;
    } catch (err) {
      throw new Error(`SessionModel.delete failed: ${err.message}`);
    }
  },

  async incrementBookedCount(id, delta = 1) {
    try {
      if (!isNonEmptyString(id)) throw new Error("Invalid id");
      if (!Number.isInteger(delta)) throw new Error("delta must be an integer");

      const session = await this.findById(id);
      if (!session) throw new Error("Session not found");

      const next = (session.bookedCount ?? 0) + delta;
      if (next < 0) throw new Error("Booked count cannot be negative");

      await sessionsDb.update(
        { _id: id },
        { $set: { bookedCount: next, updatedAt: new Date().toISOString() } }
      );
      return await this.findById(id);
    } catch (err) {
      throw new Error(`SessionModel.incrementBookedCount failed: ${err.message}`);
    }
  },
};
