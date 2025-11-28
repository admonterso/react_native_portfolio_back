import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.ts";
import { generateAccessToken, generateRefreshToken } from "../utils/tokens.ts";
import jwt from "jsonwebtoken";
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashed },
  });

  res.json({ message: "User registered" });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  res.json({ accessToken, refreshToken });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  console.log("Request body:", req.body);
  if (!refreshToken) return res.status(401).json({ message: "Missing token" });

  const user = await prisma.user.findFirst({ where: { refreshToken } });
  if (!user) return res.status(403).json({ message: "Invalid token" });

  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

    const newAccess = generateAccessToken(user.id);
    const newRefresh = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefresh },
    });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err: any) {
    console.log("Refresh error:", err);
    return res.status(403).json({ message: err.message });
  }
};

export const sendOTP = async (req: Request, res: Response) => {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_VERIFY_SID
  ) {
    console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID);
    console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN);
    console.log("TWILIO_VERIFY_SID:", process.env.TWILIO_VERIFY_SID);
    return res
      .status(500)
      .json({ error: "Twilio environment variables not set" });
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log("Twilio client initialized");
  console.log("Request body:", req.body);
  const { phone } = req.body;
  if (!phone)
    return res.status(400).json({ error: "Phone number is required" });

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verifications.create({
        to: phone,
        channel: "sms", // or 'call'
      });

    res.json({ success: true, verification });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  // Check environment variables
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_VERIFY_SID
  ) {
    return res
      .status(500)
      .json({ error: "Twilio environment variables not set" });
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const { phone, code } = req.body;
  if (!phone || !code)
    return res.status(400).json({ error: "Phone and code are required" });

  try {
    const verification_check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verificationChecks.create({
        to: phone,
        code: code,
      });

    if (verification_check.status === "approved") {
      return res.json({ success: true, message: "OTP verified" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err: any) {
    console.error("Twilio verification error:", err);
    res.status(500).json({ error: err.message });
  }
};
