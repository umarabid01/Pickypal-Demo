// ============================================================
// PickyPal — User model (mirrors supabase/schema.sql users table)
// ============================================================
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  session_phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: null },
  language_pref: { type: String, enum: ["en", "ur", "pa"], default: "en" },
  allergies: { type: [String], default: [] },
  dietary_restrictions: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model("User", UserSchema);
