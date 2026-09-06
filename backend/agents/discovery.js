// ============================================================
// PickyPal — Discovery Agent
// Parses free-text intent, cross-refs allergies, finds safe options
// ============================================================
import { callAgent } from "./base.js";
import { getRestaurantContextForAI } from "../lib/restaurants.js";

export async function runDiscoveryAgent(sessionId, userMessage, user, conversationHistory) {
  const restaurantContext = await getRestaurantContextForAI(
    user.allergies,
    user.dietary_restrictions
  );

  const context = `## User Profile
Name: ${user.name || "Unknown"}
Language: ${user.language_pref}
Known Allergies: ${user.allergies.length ? user.allergies.join(", ") : "none"}
Dietary Restrictions: ${user.dietary_restrictions.length ? user.dietary_restrictions.join(", ") : "none"}

## Available Restaurants & Safe Menu Items
${restaurantContext}

## Conversation History
${conversationHistory || "(new conversation)"}`;

  const { response } = await callAgent(sessionId, "discovery", context, userMessage);
  return response;
}
