// models/courseModel.js
import { coursesDb } from "./_db.js";

export const CourseModel = {
  async create(course) {
    return coursesDb.insert(course);
  },
  async findById(id) {
    return coursesDb.findOne({ _id: id });
  },
  async list(filter = {}) {
    return coursesDb.find(filter);
  },
  async update(id, patch) {
    await coursesDb.update({ _id: id }, { $set: patch });
    return this.findById(id);
  },
};
