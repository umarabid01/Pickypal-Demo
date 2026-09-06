// ============================================================
// PickyPal — Order model (mirrors supabase/schema.sql orders table)
// ============================================================
import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    item_id: String,
    item_name: String,
    quantity: Number,
    base_price: Number,
    customizations: { type: [String], default: [] },
    item_total: Number,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  restaurant_id: String,
  restaurant_name: String,
  items: { type: [OrderItemSchema], default: [] },
  status: {
    type: String,
    enum: ["placed", "preparing", "rider_assigned", "on_the_way", "delivered"],
    default: "placed",
  },
  payment_status: { type: String, enum: ["pending", "paid"], default: "pending" },
  total: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model("Order", OrderSchema);
