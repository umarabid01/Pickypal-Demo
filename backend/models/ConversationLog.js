// ============================================================
// PickyPal — ConversationLog model
// Stores full chat history + agent trace data per user, and
// tracks live conversation state (phase, selected restaurant).
// ============================================================
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    id: String,
    role: { type: String, enum: ["user", "agent"] },
    content: String,
    timestamp: { type: Date, default: Date.now },
    agent_name: String,
  },
  { _id: false }
);

const TraceStepSchema = new mongoose.Schema(
  {
    id: String,
    agent_name: String,
    action: String,
    timestamp: { type: Date, default: Date.now },
    input_summary: String,
    output_json: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ["running", "success", "error"] },
    error_message: String,
    duration_ms: Number,
  },
  { _id: false }
);

const ConversationLogSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  phase: {
    type: String,
    enum: ["idle", "discovering", "ordering", "paying", "tracking", "delivered"],
    default: "idle",
  },
  selected_restaurant_id: { type: String, default: null },
  messages: { type: [MessageSchema], default: [] },
  trace_steps: { type: [TraceStepSchema], default: [] },
});

export default mongoose.model("ConversationLog", ConversationLogSchema);
