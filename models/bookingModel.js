
// models/bookingModel.js
import { bookingsDb } from './_db.js';

export const BookingModel = {
  async create(booking) {
    return bookingsDb.insert({ ...booking, createdAt: new Date().toISOString() });
  },
  async findById(id) {
    return bookingsDb.findOne({ _id: id });
  },
  async listByUser(userId) {
    return bookingsDb.find({ userId }).sort({ createdAt: -1 });
  },
  async cancel(id) {
    await bookingsDb.update({ _id: id }, { $set: { status: 'CANCELLED' } });
    return this.findById(id);
  }
};
``
