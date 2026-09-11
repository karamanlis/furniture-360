// ──────────────────────────────────────────────
// OpenAI Image Provider — gpt-image-1 edits (img2img)
// Sends the uploaded reference so ONLY the camera angle changes.
// ──────────────────────────────────────────────
import OpenAI from "openai";
import { toFile } from "openai";
import { ImageProvider, GenerateParams, GenerationResult } from "./provider";

function refExtension(mime: string): { filename: string; type: string } {
  if (mime === "image/png") return { filename: "ref.png", type: "image/png" };
  if (mime === "image/webp") return { filename: "ref.webp", type: "image/webp" };
  return { filename: "ref.jpg", type: "image/jpeg" };
}

export class OpenAIProvider implements ImageProvider {
  readonly name = "openai";
  readonly model: string;

  private client: OpenAI | null = null;
  private quality: "low" | "medium" | "high" | "auto";
  private inputFidelity: "high" | "low";

  constructor() {
    this.model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const quality = process.env.OPENAI_IMAGE_QUALITY as OpenAIProvider["quality"];
    this.quality = quality || "medium";
    const fidelity = process.env.OPENAI_INPUT_FIDELITY as OpenAIProvider["inputFidelity"];
    this.inputFidelity = fidelity || "high";
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set — cannot use the openai provider");
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async generate(params: GenerateParams): Promise<GenerationResult> {
    const client = this.getClient();

    const ref = refExtension(params.referenceMime);
    const referenceFile = await toFile(
      Buffer.from(params.referenceImageBase64, "base64"),
      ref.filename,
      { type: ref.type }
    );

    const prompt = [
      params.prompt,
      `The reference image is the product "${params.productName}". Reproduce it exactly — same model, proportions, colors, materials and branding — at a ${params.angle} degree camera rotation.`,
    ].join(" ");

    const response = await client.images.edit({
      model: this.model,
      image: referenceFile,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: this.quality,
      input_fidelity: this.inputFidelity,
    });

    // gpt-image-1 always returns b64_json (never a URL)
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI returned no image data");
    }

    return {
      imageBase64: b64,
      mimeType: "image/png",
      provider: this.name,
      model: this.model,
    };
  }
}
