// ──────────────────────────────────────────────
// Mock Provider — deterministic, no API key needed
// ──────────────────────────────────────────────
import { ImageProvider, GenerateParams, GenerationResult } from "./provider";

/**
 * Generates a deterministic "image" as a tiny data-URL JPEG-ish blob.
 * The pixel pattern shifts by angle so the UI shows visual variety.
 * Used for testing / development without any real API key.
 */
export class MockProvider implements ImageProvider {
  readonly name = "mock";
  readonly model = "mock-v1";

  async generate(params: GenerateParams): Promise<GenerationResult> {
    // Simulate generation latency
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const angle = params.angle;
    const hue = (angle / 360) * 360;
    const size = 256;

    // Embed reference image in SVG mock so the user sees their uploaded product
    const refImageTag = params.referenceImageBase64
      ? `<image href="data:${params.referenceMime};base64,${params.referenceImageBase64}" x="20" y="40" width="216" height="176" preserveAspectRatio="xMidYMid meet" />`
      : "";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#f0f0f0" />
      ${refImageTag}
      <!-- Angle overlay label -->
      <rect x="20" y="40" width="216" height="24" rx="4" fill="rgba(0,0,0,0.55)" />
      <text x="128" y="55" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">${angle}° — ${params.productName}</text>
      <!-- Simulated perspective indicator: bar moves with angle -->
      <rect x="78" y="210" width="100" height="6" rx="3" fill="hsl(${hue},60%,40%)" />
      <rect x="${78 + Math.round(40 * Math.sin((angle * Math.PI) / 180))}" y="210" width="6" height="6" rx="3" fill="white" />
    </svg>`;

    const base64 = Buffer.from(svg).toString("base64");

    return {
      imageBase64: base64,
      mimeType: "image/svg+xml",
      provider: this.name,
      model: this.model,
    };
  }
}