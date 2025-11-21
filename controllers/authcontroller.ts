import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.ts";
import { generateAccessToken, generateRefreshToken } from "../utils/tokens.ts";
import jwt from "jsonwebtoken";

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
