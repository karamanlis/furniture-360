// ──────────────────────────────────────────────
// Vision — Identity QC prompt + JSON parser
// ──────────────────────────────────────────────
import { QCResultData } from "./image-generation/provider";
import { buildQcPrompt } from "./prompts";

export function parseQcResponse(text: string): QCResultData {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonStr);

    return {
      same: Boolean(parsed.same),
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      reason: String(parsed.reason || ""),
    };
  } catch {
    return { same: false, confidence: 0, reason: "unparsable response" };
  }
}

export const QC_THRESHOLD = 60; // minimum confidence to PASS
export const AUTO_FIX_THRESHOLD = 50; // below this, auto-fix retries

export { buildQcPrompt };