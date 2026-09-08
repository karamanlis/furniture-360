// ──────────────────────────────────────────────
// GenerationQueue — concurrency-limited task queue
// ──────────────────────────────────────────────
import { ANGLES, CONCURRENCY_DEFAULT } from "../lib/constants";
import { getImageProvider } from "../lib/image-generation";
import { ImageProvider, GenerateParams, GenerationResult } from "../lib/image-generation/provider";
import { buildAnglePrompt } from "../lib/prompts";
import {
  markAngleGenerating,
  markAngleCompleted,
  markAngleFailed,
  canRunAngle,
  isJobRunning,
  getJobState,
  log,
  resetFailureCounter,
} from "../lib/job-manager";
import { saveGeneratedImage, readImageAsBase64, getReferencePath } from "../lib/storage";
import { readFile } from "fs/promises";

interface Task {
  jobId: string;
  angle: number;
}

class GenerationQueue {
  private pending: Task[] = [];
  private running = new Map<string, Task>();
  private activeCount = 0;
  private maxConcurrency: number;
  private provider: ImageProvider | null = null;

  constructor(concurrency: number = CONCURRENCY_DEFAULT) {
    this.maxConcurrency = concurrency;
  }

  async getProvider(): Promise<ImageProvider> {
    if (!this.provider) {
      this.provider = await getImageProvider();
    }
    return this.provider;
  }

  enqueueJob(jobId: string): void {
    for (const angle of ANGLES) {
      this.pending.push({ jobId, angle });
    }
    log(jobId, "info", "Angles queued for generation");
    this.tick();
  }

  enqueueAngles(jobId: string, angles: number[]): void {
    for (const angle of angles) {
      this.pending.push({ jobId, angle });
    }
    log(jobId, "info", `${angles.length} angle(s) re-queued`);
    this.tick();
  }

  tick(): void {
    while (this.activeCount < this.maxConcurrency && this.pending.length > 0) {
      const task = this.pending.shift()!;

      // Check if this job/angle can still run
      if (!canRunAngle(task.jobId, task.angle)) {
        // Job might be paused or stopped — skip this task
        const state = getJobState(task.jobId);
        if (state && state.status === "paused") {
          // Put it back for later
          this.pending.unshift(task);
          break; // Don't consume more for paused jobs
        }
        continue; // Skip this task, try next
      }

      const taskId = `${task.jobId}:${task.angle}`;
      this.running.set(taskId, task);
      this.activeCount++;
      this.executeTask(task, taskId);
    }
  }

  private async executeTask(task: Task, taskId: string): Promise<void> {
    const { jobId, angle } = task;

    // Mark as generating
    if (!markAngleGenerating(jobId, angle)) {
      this.cleanupTask(taskId);
      return;
    }

    try {
      const state = getJobState(jobId);
      if (!state) {
        this.cleanupTask(taskId);
        return;
      }

      const provider = await this.getProvider();

      // Read reference image
      const refPath = getReferencePath(jobId);
      const refData = await readImageAsBase64(refPath);

      // Build prompt
      const prompt = buildAnglePrompt({
        productName: state.meta.productName,
        description: state.meta.description,
        angle,
        attempts: state.angles.find((a) => a.angle === angle)?.attempts || 1,
      });

      const params: GenerateParams = {
        referenceImageBase64: refData.base64,
        referenceMime: refData.mime,
        productName: state.meta.productName,
        description: state.meta.description,
        angle,
        prompt,
      };

      const result = await provider.generate(params);

      // Save image to disk
      const imagePath = await saveGeneratedImage(jobId, angle, result.imageBase64, result.mimeType);

      markAngleCompleted(jobId, angle, imagePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      markAngleFailed(jobId, angle, message);
    } finally {
      this.cleanupTask(taskId);
      this.tick(); // Process next task
    }
  }

  private cleanupTask(taskId: string): void {
    this.running.delete(taskId);
    if (this.activeCount > 0) this.activeCount--;
  }

  pause(jobId: string): void {
    // Don't abort in-flight, just stop scheduling new ones
    log(jobId, "info", "Generation paused — in-flight calls will finish");
  }

  resume(jobId: string): void {
    log(jobId, "info", "Generation resumed");
    this.tick();
  }

  stop(jobId: string): void {
    // Remove all pending tasks for this job
    this.pending = this.pending.filter((t) => t.jobId !== jobId);
    log(jobId, "info", "Generation stopped — pending tasks cleared");
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getPendingCount(jobId?: string): number {
    if (jobId) {
      return this.pending.filter((t) => t.jobId === jobId).length;
    }
    return this.pending.length;
  }
}

// Singleton — honor GENERATION_CONCURRENCY if set (Dockerfile.vercel pins it to 1 to
// stay within the anonymous Pollinations rate limit). The env is read once at process
// start, when this module is first imported.
function resolveConcurrency(): number {
  const raw = Number(process.env.GENERATION_CONCURRENCY);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : CONCURRENCY_DEFAULT;
}

export const generationQueue = new GenerationQueue(resolveConcurrency());