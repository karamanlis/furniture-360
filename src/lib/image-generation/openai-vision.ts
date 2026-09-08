// ──────────────────────────────────────────────
// OpenAI Vision Provider — Identity QC via gpt-4o
// ──────────────────────────────────────────────
import OpenAI from "openai";
import { VisionProvider, QcParams, QCResultData } from "./provider";
import { buildQcPrompt } from "../prompts";
import { parseQcResponse } from "../vision";

const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o";

export class OpenAIVisionProvider implements VisionProvider {
  readonly name = "openai-vision";

  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async check(params: QcParams): Promise<QCResultData> {
    const prompt = buildQcPrompt(params.angle);

    const referenceUrl = `data:${params.referenceImageBase64.includes(",") ? "" : "image/jpeg;base64,"}${params.referenceImageBase64}`;
    const generatedUrl = `data:${params.generatedImageBase64.includes(",") ? "" : "image/jpeg;base64,"}${params.generatedImageBase64}`;

    const response = await this.client.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: referenceUrl,
                detail: "low",
              },
            },
            {
              type: "image_url",
              image_url: {
                url: generatedUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const text = response.choices[0]?.message?.content || "";
    return parseQcResponse(text);
  }
}