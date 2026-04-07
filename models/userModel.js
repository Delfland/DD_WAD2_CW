
// models/userModel.js
import bcrypt from "bcrypt";
import { usersDb } from "./_db.js";

const HASH_ROUNDS = 10;
const ALLOWED_ROLES = new Set(["user", "admin"]);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const stripSensitiveFields = (user) => {
  if (!user) return null;
  const { passwordHash, password, ...safeUser } = user;
  return safeUser;
};

const validateUserPayload = (payload, { partial = false } = {}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("User payload must be an object");
  }

  const requiredFields = ["name", "email"];
  if (!partial) {
    for (const field of requiredFields) {
      if (payload[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  const user = {
    ...payload,
  };

  if (user.name !== undefined) {
    if (!isNonEmptyString(user.name)) {
      throw new Error("name is required and cannot be empty");
    }
    user.name = user.name.trim();
  }

  if (user.email !== undefined) {
    const email = normalizeEmail(user.email);
    if (!isNonEmptyString(email) || !email.includes("@")) {
      throw new Error("email must be a valid email address");
    }
    user.email = email;
  }

  if (user.role !== undefined) {
    if (!isNonEmptyString(user.role)) {
      throw new Error("role is required and cannot be empty");
    }
    user.role = user.role.trim().toLowerCase();
    if (!ALLOWED_ROLES.has(user.role)) {
      throw new Error("role must be one of: user, admin");
    }
  } else if (!partial) {
    user.role = "user";
  }

  if (user.password !== undefined && !isNonEmptyString(user.password)) {
    throw new Error("password is required and cannot be empty");
  }


  return user;
};

export const UserModel = {
  async create(user) {
    try {
      const now = new Date().toISOString();
      const validated = validateUserPayload(user);
      const record = {
        ...validated,
        email: normalizeEmail(validated.email),
        role: validated.role ?? "user",
        createdAt: now
      };

      if (record.password && !record.passwordHash) {
        record.passwordHash = await bcrypt.hash(record.password, HASH_ROUNDS);
      }

      delete record.password;

      const inserted = await usersDb.insert(record);
      return stripSensitiveFields(inserted);
    } catch (err) {
      throw new Error(`UserModel.create failed: ${err.message}`);
    }
  },

  async findById(id) {
    try {
      if (!isNonEmptyString(id)) {
        throw new Error("Invalid id");
      }
      return await usersDb.findOne({ _id: id });
    } catch (err) {
      throw new Error(`UserModel.findById failed: ${err.message}`);
    }
  },

  async findByEmail(email) {
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!isNonEmptyString(normalizedEmail)) {
        throw new Error("Invalid email");
      }
      return await usersDb.findOne({ email: normalizedEmail });
    } catch (err) {
      throw new Error(`UserModel.findByEmail failed: ${err.message}`);
    }
  },

  async list(filter = {}) {
    try {
      if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
        throw new Error("Filter must be an object");
      }
      return await usersDb.find(filter);
    } catch (err) {
      throw new Error(`UserModel.list failed: ${err.message}`);
    }
  },

  async update(id, patch) {
    try {
      if (!isNonEmptyString(id)) {
        throw new Error("Invalid id");
      }

      const validatedPatch = validateUserPayload(patch, { partial: true });
      const updateDoc = {
        ...validatedPatch,
        updatedAt: new Date().toISOString(),
      };

      if (updateDoc.email !== undefined) {
        updateDoc.email = normalizeEmail(updateDoc.email);
      }

      if (updateDoc.password !== undefined && !updateDoc.passwordHash) {
        updateDoc.passwordHash = await bcrypt.hash(updateDoc.password, HASH_ROUNDS);
      }

      delete updateDoc.password;

      await usersDb.update({ _id: id }, { $set: updateDoc });
      const updated = await this.findById(id);
      return stripSensitiveFields(updated);
    } catch (err) {
      throw new Error(`UserModel.update failed: ${err.message}`);
    }
  },

  async delete(id) {
    try {
      if (!isNonEmptyString(id)) {
        throw new Error("Invalid id");
      }

      const deletedCount = await usersDb.remove({ _id: id }, {});
      return deletedCount > 0;
    } catch (err) {
      throw new Error(`UserModel.delete failed: ${err.message}`);
    }
  },

  async verifyPassword(user, password) {
    try {
      if (!user?.passwordHash || !isNonEmptyString(password)) {
        return false;
      }
      return await bcrypt.compare(password, user.passwordHash);
    } catch (err) {
      throw new Error(`UserModel.verifyPassword failed: ${err.message}`);
    }
  },

  sanitize(user) {
    return stripSensitiveFields(user);
  },
};
