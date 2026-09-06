// ============================================================
// PickyPal — Express server entrypoint
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import messageRoute from "./routes/message.js";
import simulateStepRoute from "./routes/simulateStep.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// Health check
app.get("/", async (req, res) => {
  try {
    await connectDB();

    res.json({
      status: "ok",
      database: "connected",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check error:", err);

    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: err.message,
    });
  }
});

// API routes
app.use("/api/message", messageRoute);
app.use("/api/simulate-step", simulateStepRoute);

// Export Express app for Vercel
export default app;
