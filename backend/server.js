import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import messageRoute from "./routes/message.js";
import simulateStepRoute from "./routes/simulateStep.js";

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// ============================================================
// Connect MongoDB when server starts
// ============================================================

connectDB()
  .then(() => {
    console.log("✅ MongoDB connected at server startup");
    app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "PickyPal backend is running",
  });
});
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });

// ============================================================
// Health check
// ============================================================

app.get("/api/health", async (req, res) => {
  res.json({
    status: "ok",
    database: "connected",
    time: new Date().toISOString(),
  });
});

// ============================================================
// API routes
// ============================================================

app.use("/api/message", messageRoute);
app.use("/api/simulate-step", simulateStepRoute);

// ============================================================
// Export Express app for Vercel
// ============================================================

export default app;
