import { Router } from "express";
import {
  loginPage,
  logoutAction,
  registerPage,
  submitLogin,
  submitRegister,
} from "../controllers/usersController.js";

const router = Router();

router.get("/register", registerPage);
router.post("/register", submitRegister);

router.get("/login", loginPage);
router.post("/login", submitLogin);

router.get("/logout", logoutAction);
router.post("/logout", logoutAction);

export default router;