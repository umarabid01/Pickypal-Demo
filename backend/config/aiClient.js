// ============================================================
// PickyPal — AI client (OpenAI or Google Gemini)
// Ported from the original config.ts. GEMINI_API_KEY takes
// priority over OPENAI_API_KEY if both are present.
// ============================================================
import OpenAI from "openai";

let _client = null;
let _activeModel = "gpt-4o";

export function getAIClient() {
  if (!_client) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      // Google Gemini via its OpenAI-compatible endpoint (free tier friendly)
      _client = new OpenAI({
        apiKey: geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
      // "gemini-flash-latest" is an alias Google keeps pointed at their
      // current recommended Flash model, so this won't break again when
      // the next model version ships (unlike hardcoding "gemini-2.5-flash",
      // which Google has been retiring throughout 2026).
      _activeModel = "gemini-3.6-flash";
    } else if (openaiKey) {
      _client = new OpenAI({ apiKey: openaiKey });
      _activeModel = "gpt-4o";
    } else {
      throw new Error(
        "No AI API key found. Please add GEMINI_API_KEY or OPENAI_API_KEY to backend/.env."
      );
    }
  }
  return { client: _client, model: _activeModel };
}

export const AGENT_COLORS = {
  discovery: "#25D366",
  preference: "#FF9500",
  order: "#007AFF",
  payment: "#AF52DE",
  rider: "#FF3B30",
};
