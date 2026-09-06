// ============================================================
// PickyPal — Restaurant data helpers
// Reads from MongoDB (seeded via scripts/seed.js) instead of
// the original static seedRestaurants.json import.
// ============================================================
import Restaurant from "../models/Restaurant.js";

export async function getAllRestaurants() {
  return Restaurant.find({});
}

export async function getRestaurantById(id) {
  return Restaurant.findOne({ id });
}

export async function getMenuItemById(restaurantId, itemId) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return null;
  return restaurant.menu_items.find((m) => m.id === itemId) || null;
}

/**
 * Filter menu items that are safe for a user with given allergies
 * and dietary restrictions.
 */
export function getSafeMenuItems(restaurant, userAllergies, userDietary) {
  const allergiesLower = userAllergies.map((a) => a.toLowerCase());
  const dietaryLower = userDietary.map((d) => d.toLowerCase());

  const safe = [];
  let unsafeCount = 0;

  for (const item of restaurant.menu_items) {
    const itemAllergens = item.allergens.map((a) => a.toLowerCase());
    const hasAllergen = allergiesLower.some((a) => itemAllergens.includes(a));

    if (hasAllergen) {
      unsafeCount++;
      continue;
    }

    if (dietaryLower.length > 0) {
      const itemTags = item.dietary_tags.map((t) => t.toLowerCase());
      const matchesDietary = dietaryLower.every((d) => itemTags.includes(d));
      if (!matchesDietary) {
        unsafeCount++;
        continue;
      }
    }

    safe.push(item);
  }

  return { safe, unsafeCount };
}

/**
 * Build a compact restaurant summary for the AI context window.
 */
export async function getRestaurantContextForAI(userAllergies, userDietary) {
  const restaurants = await getAllRestaurants();
  const summaries = restaurants.map((r) => {
    const { safe, unsafeCount } = getSafeMenuItems(r, userAllergies, userDietary);
    const safeItems = safe
      .map(
        (item) =>
          `  - ${item.item_name} (Rs.${item.price}) [${item.dietary_tags.join(",")}] ${
            item.allergens.length ? `⚠️ contains: ${item.allergens.join(",")}` : "✅ allergen-free"
          }`
      )
      .join("\n");
    return `🏪 ${r.name} (${r.cuisine}, ${r.location}, ⭐${r.rating})\n  Safe items (${safe.length}), filtered out ${unsafeCount} unsafe:\n${
      safeItems || "  (no safe items)"
    }`;
  });
  return summaries.join("\n\n");
}

/**
 * Build menu context for a specific restaurant (used by Order Agent).
 */
export async function getMenuContextForAI(restaurantId) {
  const r = await getRestaurantById(restaurantId);
  if (!r) return "Restaurant not found.";

  const items = r.menu_items
    .map(
      (item) =>
        `- ${item.id}: ${item.item_name} — Rs.${item.price}\n  ${item.description}\n  Allergens: ${
          item.allergens.join(", ") || "none"
        }\n  Tags: ${item.dietary_tags.join(", ")}\n  Customizable: ${
          item.customizable ? `Yes — ${item.customization_options}` : "No"
        }`
    )
    .join("\n");
  return `Menu for ${r.name}:\n${items}`;
}
