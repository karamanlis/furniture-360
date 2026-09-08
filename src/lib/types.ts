// ──────────────────────────────────────────────
// AI Furniture 360 Visualizer — Shared Types
// ──────────────────────────────────────────────

export type AngleStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'stopped';
export type JobStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed';

export interface LogEntry {
  ts: number;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface QCResult {
  checkedAt: number;
  passed: boolean;
  score: number;
  note?: string;
}

export interface AngleState {
  angle: number;
  status: AngleStatus;
  attempts: number;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  error?: string;
  imagePath?: string;
  qc?: QCResult;
}

export interface JobMeta {
  id: string;
  prefix: string;
  productName: string;
  description: string;
  referencePath: string;
  createdAt: number;
  updatedAt: number;
  provider: string;
  model: string;
}

export interface JobProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  generating: number;
  stopped: number;
}

export interface JobSnapshot extends JobMeta {
  status: JobStatus;
  progress: JobProgress;
  angles: AngleState[];
  logs: LogEntry[];
}

export interface CreateJobRequest {
  productName: string;
  description: string;
}

export interface CreateJobFileRequest extends CreateJobRequest {
  referenceImage: File;
}

export interface CreateJobUrlRequest extends CreateJobRequest {
  imageUrl: string;
}

export interface CreateJobResponse {
  jobId: string;
}

export interface ControlRequest {
  action: 'pause' | 'resume' | 'stop';
}

export interface RetryRequest {
  angles?: number[];
}

export interface QcRequest {
  angles?: number[];
  autoFix?: boolean;
}