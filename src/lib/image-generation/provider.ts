// ──────────────────────────────────────────────
// Image Provider — Abstract Interface
// ──────────────────────────────────────────────

export interface GenerateParams {
  referenceImageBase64: string;
  referenceMime: string;
  productName: string;
  description: string;
  angle: number;
  prompt: string;
}

export interface GenerationResult {
  imageBase64: string;
  mimeType: string;
  provider: string;
  model: string;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(params: GenerateParams): Promise<GenerationResult>;
}

// ──────────────────────────────────────────────
// Vision Provider — Identity QC Interface
// ──────────────────────────────────────────────

export interface QcParams {
  referenceImageBase64: string;
  generatedImageBase64: string;
  productName: string;
  description: string;
  angle: number;
}

export interface QCResultData {
  same: boolean;
  confidence: number;
  reason: string;
}

export interface VisionProvider {
  readonly name: string;
  check(params: QcParams): Promise<QCResultData>;
}