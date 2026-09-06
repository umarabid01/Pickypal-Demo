// ============================================================
// PickyPal — Order Agent
// Handles item selection, quantity, customization, builds order
// ============================================================
import { callAgent } from "./base.js";
import { getMenuContextForAI } from "../lib/restaurants.js";

export async function runOrderAgent(
  sessionId,
  userMessage,
  user,
  restaurantId,
  currentOrder,
  conversationHistory
) {
  const menuContext = await getMenuContextForAI(restaurantId);

  const orderSummary = currentOrder
    ? `Current order items:\n${currentOrder.items
        .map(
          (i) =>
            `  - ${i.quantity}x ${i.item_name} (${
              i.customizations.join(", ") || "no customizations"
            }) = Rs.${i.item_total}`
        )
        .join("\n")}\nCurrent total: Rs.${currentOrder.total}`
    : "No items added yet.";

  const context = `## User Profile
Name: ${user.name || "Unknown"}
Allergies: ${user.allergies.length ? user.allergies.join(", ") : "none"}
Dietary Restrictions: ${user.dietary_restrictions.length ? user.dietary_restrictions.join(", ") : "none"}

## Restaurant Menu
${menuContext}

## Current Order State
${orderSummary}

## Conversation History
${conversationHistory}`;

  const { response } = await callAgent(sessionId, "order", context, userMessage);
  return response;
}
