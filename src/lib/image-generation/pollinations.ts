// ──────────────────────────────────────────────
// Pollinations Provider — free Flux image generation (no API key)
// POST https://image.pollinations.ai/prompt
// ──────────────────────────────────────────────
import { ImageProvider, GenerateParams, GenerationResult } from "./provider";

const ENDPOINT = "https://image.pollinations.ai/prompt";
const SIZE = 1024;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 150_000; // server-side queue can be slow (anon tier ~1 req/15s)

/** Stable, non-negative seed derived from product + angle, so retries reuse it. */
function angleSeed(productName: string, angle: number): number {
  let hash = 2166136261;
  const input = `${productName.toLowerCase()}:${angle}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class PollinationsProvider implements ImageProvider {
  readonly name = "pollinations";
  readonly model: string;

  constructor() {
    this.model = process.env.POLLINATIONS_MODEL || "flux";
  }

  async generate(params: GenerateParams): Promise<GenerationResult> {
    const body = {
      prompt: [
        params.prompt,
        `Match the supplied reference image exactly — same product.\n`,
      ].join(" "),
      model: this.model,
      width: SIZE,
      height: SIZE,
      seed: angleSeed(params.productName, params.angle),
      nologo: true,
      // Activates image-to-image: keeps identity of the uploaded product
      image: `data:${params.referenceMime};base64,${params.referenceImageBase64}`,
    };

    let lastError: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (response.status === 429) {
          // Rate-limited: honor server hint if present, else back off
          const retryAfter = Number(response.headers.get("Retry-After") || 0);
          const wait = (retryAfter > 0 ? retryAfter : attempt * 15) * 1000;
          lastError = `Rate limited (429) — retrying in ${wait / 1000}s`;
          clearTimeout(timer);
          await sleep(wait);
          continue;
        }

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Pollinations error ${response.status}: ${text.slice(0, 200)}`);
        }

        const contentType = response.headers.get("content-type") || "";
        const buffer = Buffer.from(await response.arrayBuffer());

        if (contentType.includes("application/json")) {
          // Error objects come back as JSON too; surface the message
          const payload = JSON.parse(buffer.toString("utf-8"));
          throw new Error(`Pollinations error: ${payload?.message || "unknown"}`);
        }

        return {
          imageBase64: buffer.toString("base64"),
          mimeType: contentType.includes("image/png") ? "image/png" : "image/jpeg",
          provider: this.name,
          model: this.model,
        };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof Error && err.name === "AbortError") {
          lastError = `Pollinations timeout after ${TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`;
        } else {
          lastError = err instanceof Error ? err.message : String(err);
        }
        if (attempt < MAX_ATTEMPTS) await sleep(attempt * 5000);
      }
    }

    throw new Error(lastError || "Pollinations generation failed");
  }
}