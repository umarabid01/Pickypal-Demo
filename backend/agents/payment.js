// ============================================================
// PickyPal — Payment Agent
// Triggers mock JazzCash/EasyPaisa payment flow
// ============================================================
import { callAgent } from "./base.js";

export async function runPaymentAgent(sessionId, userMessage, user, order) {
  const context = `## Order Details
Order ID: ${order._id}
Restaurant: ${order.restaurant_name}
Items:
${order.items.map((i) => `  - ${i.quantity}x ${i.item_name} = Rs.${i.item_total}`).join("\n")}
Total: Rs.${order.total}

## User Profile
Name: ${user.name || "Customer"}
Language: ${user.language_pref}

## Instructions
The user wants to proceed with payment. Present JazzCash and EasyPaisa as options (both are mocked for the prototype). Generate a realistic-looking reference number like PP-2024-XXXXX.`;

  const { response } = await callAgent(sessionId, "payment", context, userMessage);
  return response;
}
