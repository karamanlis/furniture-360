// ──────────────────────────────────────────────
// OpenAI Image Provider — gpt-image-1 / DALL-E
// ──────────────────────────────────────────────
import OpenAI from "openai";
import { toFile } from "openai";
import { ImageProvider, GenerateParams, GenerationResult } from "./provider";

export class OpenAIProvider implements ImageProvider {
  readonly name = "openai";
  readonly model: string;

  private client: OpenAI;

  constructor() {
    this.model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generate(params: GenerateParams): Promise<GenerationResult> {
    // Build a descriptive prompt from product info + angle
    const prompt = [
      params.prompt,
      `The product "${params.productName}" at a ${params.angle} degree rotation.`,
      `Product description: ${params.description || "A furniture product"}.`,
      `IMPORTANT: Same exact product, same materials, same design — ONLY the camera angle changes to ${params.angle} degrees.`,
    ].join(" ");

    const response = await this.client.images.generate({
      model: this.model,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const data = response.data?.[0];
    if (!data || !data.url) {
      throw new Error("OpenAI returned no image data");
    }

    // Download the image from the returned URL
    const imgResponse = await fetch(data.url);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download generated image: ${imgResponse.status}`);
    }
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

    return {
      imageBase64: imgBuffer.toString("base64"),
      mimeType: "image/png",
      provider: this.name,
      model: this.model,
    };
  }
}