import { clearAuthCookie, createAuthToken, setAuthCookie } from "../auth/auth.js";
import { UserModel } from "../models/userModel.js";

const setAuthNoCache = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

const renderAuthView = (res, view, title, { error, values = {} } = {}) => {
  const hasError = Boolean(error);
  setAuthNoCache(res);
  return res.render(view, {
    title,
    error,
    hasError,
    values,
  });
};

export const registerPage = (req, res) =>
  renderAuthView(res, "register", "Register");

export const submitRegister = async (req, res, next) => {
  try {
    const name = req.body?.name?.trim() || "";
    const email = req.body?.email?.trim() || "";
    const password = req.body?.password || "";

    if (!name || !email || !password) {
      return res
        .status(400)
        .render("register", {
          title: "Register",
          error: "Name, email, and password are required.",
          hasError: true,
          values: { name },
        });
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res
        .status(409)
        .render("register", {
          title: "Register",
          error: "Email already registered.",
          hasError: true,
          values: { name },
        });
    }

    const user = await UserModel.create({ name, email, password });
    const token = createAuthToken(user);
    setAuthCookie(res, token);

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
};

export const loginPage = (req, res) => renderAuthView(res, "login", "Login");

export const submitLogin = async (req, res, next) => {
  try {
    const email = req.body?.email?.trim() || "";
    const password = req.body?.password || "";

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Login",
        error: "Email and password are required.",
        hasError: true,
        values: {},
      });
    }

    const user = await UserModel.findByEmail(email);
    const isValid = await UserModel.verifyPassword(user, password);
    if (!user || !isValid) {
      return res.status(401).render("login", {
        title: "Login",
        error: "Invalid email or password.",
        hasError: true,
        values: {},
      });
    }

    const token = createAuthToken(user);
    setAuthCookie(res, token);

    return res.redirect("/");
  } catch (err) {
    return next(err);
  }
};

export const logoutAction = (req, res) => {
  setAuthNoCache(res);
  clearAuthCookie(res);
  return res.redirect("/login");
};