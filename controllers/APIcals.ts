import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.ts";
import { generateAccessToken, generateRefreshToken } from "../utils/tokens.ts";
import jwt from "jsonwebtoken";
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

// activate plan endpoint by user
// check in endpoint for acivatoing the plan
// fill up the balace
// retrive user data with plan details
