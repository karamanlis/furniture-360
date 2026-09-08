// ──────────────────────────────────────────────
// Image & Vision Provider Factory
// ──────────────────────────────────────────────
import { ImageProvider, VisionProvider } from "./provider";

const imageProviders = new Map<string, ImageProvider>();
const visionProviders = new Map<string, VisionProvider>();

export async function getImageProvider(): Promise<ImageProvider> {
  const name = process.env.IMAGE_GENERATION_PROVIDER || "mock";
  const cached = imageProviders.get(name);
  if (cached) return cached;

  let provider: ImageProvider;

  switch (name) {
    case "openai": {
      const { OpenAIProvider } = await import("./openai");
      provider = new OpenAIProvider();
      break;
    }
    case "pollinations": {
      const { PollinationsProvider } = await import("./pollinations");
      provider = new PollinationsProvider();
      break;
    }
    default: {
      const { MockProvider } = await import("./mock");
      provider = new MockProvider();
      break;
    }
  }

  imageProviders.set(name, provider);
  return provider;
}

export async function getVisionProvider(): Promise<VisionProvider> {
  const name = process.env.IMAGE_GENERATION_PROVIDER || "mock";
  const cached = visionProviders.get(name);
  if (cached) return cached;

  let provider: VisionProvider;

  if (name === "openai") {
    const { OpenAIVisionProvider } = await import("./openai-vision");
    provider = new OpenAIVisionProvider();
  } else {
    const { MockVisionProvider } = await import("./mock-vision");
    provider = new MockVisionProvider();
  }

  visionProviders.set(name, provider);
  return provider;
}