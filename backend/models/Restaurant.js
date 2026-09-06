// ============================================================
// PickyPal — Restaurant model (mirrors the old Airtable-shaped
// data). Restaurants own their own menu_items array so a seller
// can edit their own menu without touching other restaurants.
// ============================================================
import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
  {
    id: String,
    item_name: String,
    description: String,
    price: Number,
    allergens: { type: [String], default: [] },
    dietary_tags: { type: [String], default: [] },
    customizable: { type: Boolean, default: false },
    customization_options: { type: String, default: "" },
  },
  { _id: false }
);

const RestaurantSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // stable string id used across the app
  name: String,
  cuisine: String,
  location: String,
  rating: Number,
  halal_certified: { type: Boolean, default: false },
  menu_items: { type: [MenuItemSchema], default: [] },
});

export default mongoose.model("Restaurant", RestaurantSchema);
