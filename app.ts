console.log("log");
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.ts";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
