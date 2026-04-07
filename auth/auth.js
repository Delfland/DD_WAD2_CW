import jwt from "jsonwebtoken";
import { loadEnv } from "../loadEnv.js";
import { UserModel } from "../models/userModel.js";

loadEnv();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const AUTH_COOKIE_NAME = "authToken";

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, password, ...safeUser } = user;
  return safeUser;
};

const getTokenFromRequest = (req) => {
  const authHeader = req.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.cookies?.[AUTH_COOKIE_NAME] || null;
};

const loadUserFromToken = async (token) => {
  const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
  const userId = payload.sub || payload.userId || payload.id;
  if (!userId) return null;

  const user = await UserModel.findById(userId);
  return sanitizeUser(user);
};

export const createAuthToken = (user) =>
  jwt.sign(
    {
      sub: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

export const attachAuthUser = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      req.user = null;
      res.locals.user = null;
      res.locals.isAdmin = false;
      return next();
    }

    const user = await loadUserFromToken(token);
    req.user = user;
    res.locals.user = user;
    res.locals.isAdmin = user?.role === "admin";
    return next();
  } catch {
    req.user = null;
    res.locals.user = null;
    res.locals.isAdmin = false;
    res.clearCookie(AUTH_COOKIE_NAME);
    return next();
  }
};

export const requireAuth = async (req, res, next) => {
  await attachAuthUser(req, res, () => {});

  if (req.user) {
    return next();
  }

  if (req.accepts("html")) {
    return res.status(401).render("error", {
      title: "Authentication required",
      message: "Please sign in to continue.",
    });
  }

  return res.status(401).json({ error: "Authentication required" });
};

export const requireAdmin = async (req, res, next) => {
  await attachAuthUser(req, res, () => {});

  if (req.user?.role === "admin") {
    return next();
  }

  if (req.accepts("html")) {
    return res.status(403).render("error", {
      title: "Forbidden",
      message: "Admin access is required.",
    });
  }

  return res.status(403).json({ error: "Admin access is required" });
};

export const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
};

export const attachDemoUser = attachAuthUser;
