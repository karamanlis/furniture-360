// ──────────────────────────────────────────────
// Prompt Engine — builds generation prompts
// ──────────────────────────────────────────────

export interface PromptInput {
  productName: string;
  description: string;
  angle: number;
  attempts: number;
}

const BASE_PROMPT = `Photorealistic product photo of "{productName}". {description}.
Camera azimuth {angle}° (0° = straight-on front), fixed elevation, fixed distance.
The product must be IDENTICAL to the reference image: same model, exact proportions,
identical colors, materials, textures, seams, finishes and any branding. ONLY the camera
angle changes. Keep lighting, background and photographic style consistent with the
reference. No extra objects, no text, no watermark, product fully in frame.`;

const RETRY_CORRECTIVE = `Previous attempt produced the wrong product. Match the reference image exactly; only rotate the viewpoint.`;

export function buildAnglePrompt(input: PromptInput): string {
  let prompt = BASE_PROMPT
    .replace("{productName}", input.productName)
    .replace("{description}", input.description)
    .replace("{angle}", String(input.angle));

  if (input.attempts > 1) {
    prompt = RETRY_CORRECTIVE + "\n\n" + prompt;
  }

  return prompt;
}

// Identity QC prompt sent to vision model
export function buildQcPrompt(angle: number): string {
  return `Compare REFERENCE image and GENERATED image. Is the GENERATED image the exact same product (not merely the same category of furniture), same design, colors, materials and details, photographed from a ${angle}° azimuth? Reply JSON only: {"same": <bool>, "confidence": <0-100>, "reason": "<short>"}.`;
}