// middlewares/demoUser.js
import { UserModel } from "../models/userModel.js";

export const attachDemoUser = async (req, res, next) => {
  try {
    // In production you’d use real auth; here we ensure one demo student exists.
    const email = "fiona@student.local";
    let user = await UserModel.findByEmail(email);
    if (!user) {
      user = await UserModel.create({ name: "Fiona", email, role: "student" });
    }
    req.user = user;
    res.locals.user = user; // exposed to Mustache
    next();
  } catch (err) {
    next(err);
  }
};
