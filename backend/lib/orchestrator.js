// ============================================================
// PickyPal — Orchestrator
// Central control flow: receives message → determines state →
// routes to agent(s) → executes DB writes → returns reply + trace.
// ============================================================
import crypto from "crypto";
import {
  getOrCreateUser,
  updateUserPreferences,
  getConversation,
  updateConversation,
  addMessage,
  createOrder,
  getActiveOrder,
  updateOrderStatus,
  updateOrderPayment,
} from "./store.js";
import { runDiscoveryAgent } from "../agents/discovery.js";
import { runPreferenceAgent } from "../agents/preference.js";
import { runOrderAgent } from "../agents/order.js";
import { runPaymentAgent } from "../agents/payment.js";
import { runRiderAgent } from "../agents/rider.js";

/**
 * Build a condensed conversation history string for AI context.
 */
function buildConversationHistory(messages, maxMessages = 10) {
  const recent = messages.slice(-maxMessages);
  return recent.map((m) => `${m.role === "user" ? "User" : "PickyPal"}: ${m.content}`).join("\n");
}

/**
 * Determine which phase the conversation should enter based
 * on message content hints and current phase.
 */
function detectPhaseOverride(currentPhase, message) {
  const lower = message.toLowerCase();

  if (
    currentPhase === "ordering" &&
    (lower.includes("confirm") ||
      lower.includes("pay") ||
      lower.includes("proceed") ||
      lower.includes("haan") ||
      lower.includes("yes") ||
      lower.includes("ok") ||
      lower.includes("theek"))
  ) {
    return "paying";
  }

  if (lower.includes("new order") || lower.includes("start over") || lower.includes("naya order")) {
    return "idle";
  }

  return null;
}

/**
 * Main orchestrator entry point.
 * 1. Look up/create user
 * 2. Determine conversation state
 * 3. Route to appropriate agent(s)
 * 4. Execute DB writes from structured output
 * 5. Return reply + trace
 */
export async function handleMessage(sessionId, userMessage) {
  const newTraceSteps = [];
  let replyText = "";

  const user = await getOrCreateUser(sessionId);
  const conv = await getConversation(sessionId);

  const userMsg = {
    id: crypto.randomUUID(),
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  };
  await addMessage(sessionId, userMsg);

  const activeOrder = await getActiveOrder(user._id);
  const override = detectPhaseOverride(conv.phase, userMessage);
  let phase = override || conv.phase;

  try {
    // ── PHASE: IDLE or DISCOVERING ──
    if (phase === "idle" || phase === "discovering") {
      const [prefResult, discoveryResult] = await Promise.all([
        runPreferenceAgent(sessionId, userMessage, user),
        runDiscoveryAgent(
          sessionId,
          userMessage,
          user,
          buildConversationHistory((await getConversation(sessionId)).messages)
        ),
      ]);

      const latestConv = await getConversation(sessionId);
      newTraceSteps.push(...latestConv.trace_steps.slice(-2));

      if (prefResult.has_updates) {
        await updateUserPreferences(sessionId, {
          allergies: prefResult.new_allergies,
          dietary_restrictions: prefResult.new_dietary_restrictions,
          name: prefResult.detected_name,
          language_pref: prefResult.detected_language,
        });
      }

      if (discoveryResult.intent === "search" || discoveryResult.intent === "browse_menu") {
        phase = "discovering";
        const matchedIds = discoveryResult.matched_restaurants
          .filter((r) => r.safe_items.length > 0)
          .map((r) => r.restaurant_id);
        if (matchedIds.length > 0) {
          await updateConversation(sessionId, { selected_restaurant_id: matchedIds[0] });
        }
      }

      replyText = discoveryResult.reply_text;

      if (prefResult.has_updates && prefResult.reply_text) {
        replyText = prefResult.reply_text + "\n\n" + discoveryResult.reply_text;
      }
    }

    // ── PHASE: ORDERING ──
    else if (phase === "ordering") {
      const restaurantId = conv.selected_restaurant_id || "rec_karachi_biryani";

      const orderResult = await runOrderAgent(
        sessionId,
        userMessage,
        user,
        restaurantId,
        activeOrder,
        buildConversationHistory(conv.messages)
      );

      const latestConv = await getConversation(sessionId);
      newTraceSteps.push(latestConv.trace_steps[latestConv.trace_steps.length - 1]);

      if (orderResult.order_items.length > 0 && !activeOrder) {
        await createOrder(
          user._id,
          orderResult.restaurant_id,
          orderResult.restaurant_name,
          orderResult.order_items,
          orderResult.order_total
        );
      }

      replyText = orderResult.reply_text;
    }

    // ── PHASE: PAYING ──
    else if (phase === "paying") {
      const order = activeOrder;
      if (!order) {
        replyText = "Hmm, I don't see an active order. Let's start fresh! What would you like to eat? 🍽️";
        phase = "idle";
      } else {
        const paymentResult = await runPaymentAgent(sessionId, userMessage, user, order);

        const latestConv = await getConversation(sessionId);
        newTraceSteps.push(latestConv.trace_steps[latestConv.trace_steps.length - 1]);

        if (paymentResult.action === "initiate_payment") {
          await updateOrderPayment(order._id);
          phase = "tracking";
        }

        replyText = paymentResult.reply_text;
      }
    }

    // ── PHASE: TRACKING ──
    else if (phase === "tracking") {
      const order = activeOrder;
      if (!order) {
        replyText = "No active order to track. Want to order something? 🍕";
        phase = "idle";
      } else {
        const riderResult = await runRiderAgent(sessionId, user, order);

        const latestConv = await getConversation(sessionId);
        newTraceSteps.push(latestConv.trace_steps[latestConv.trace_steps.length - 1]);

        if (riderResult.current_status) {
          await updateOrderStatus(order._id, riderResult.current_status);
        }

        if (riderResult.current_status === "delivered") {
          phase = "delivered";
        }

        replyText = riderResult.reply_text;
      }
    }

    // ── PHASE: DELIVERED ──
    else if (phase === "delivered") {
      phase = "idle";
      await updateConversation(sessionId, { selected_restaurant_id: null });
      return handleMessage(sessionId, userMessage);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
    replyText = `⚠️ Something went wrong: ${errorMsg}`;

    newTraceSteps.push({
      id: crypto.randomUUID(),
      agent_name: "orchestrator",
      action: "Error",
      timestamp: new Date().toISOString(),
      input_summary: userMessage.slice(0, 80),
      output_json: null,
      status: "error",
      error_message: errorMsg,
    });
  }

  const agentMsg = {
    id: crypto.randomUUID(),
    role: "agent",
    content: replyText,
    timestamp: new Date().toISOString(),
  };
  await addMessage(sessionId, agentMsg);
  await updateConversation(sessionId, { phase });

  return { reply: replyText, traceSteps: newTraceSteps, phase };
}

/**
 * Handle "Simulate Next Step" for the rider tracking demo.
 */
export async function simulateNextStep(sessionId) {
  return handleMessage(sessionId, "What's the status of my order?");
}

/**
 * Handle the transition from discovery to ordering when the
 * user picks a restaurant from the discovery results.
 */
export async function transitionToOrdering(sessionId, restaurantId) {
  await updateConversation(sessionId, { phase: "ordering", selected_restaurant_id: restaurantId });
}
