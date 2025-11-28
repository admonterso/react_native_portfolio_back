import { Router } from "express";
import {
  register,
  login,
  refresh,
  sendOTP,
  verifyOTP,
} from "../controllers/authcontroller.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/sendOTP", sendOTP);
router.post("/verifyOTP", verifyOTP);
export default router;
