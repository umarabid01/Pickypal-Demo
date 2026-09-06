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

// Health check — also useful to "wake up" a free-tier host that sleeps
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/message", messageRoute);
app.use("/api/simulate-step", simulateStepRoute);

await connectDB();

export default app;
