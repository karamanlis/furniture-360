// ──────────────────────────────────────────────
// Mock Vision Provider — always passes, no API key needed
// ──────────────────────────────────────────────
import { VisionProvider, QcParams, QCResultData } from "./provider";

export class MockVisionProvider implements VisionProvider {
  readonly name = "mock-vision";

  async check(_params: QcParams): Promise<QCResultData> {
    // Simulate QC latency
    await new Promise((r) => setTimeout(r, 100));

    return {
      same: true,
      confidence: 90,
      reason: "Mock QC — no vision provider configured",
    };
  }
}