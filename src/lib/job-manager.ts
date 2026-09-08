// ──────────────────────────────────────────────
// JobManager — singleton in-memory job store
// ──────────────────────────────────────────────
import { ANGLES, MAX_LOG_ENTRIES, emptyProgress } from "./constants";
import {
  JobSnapshot,
  JobStatus,
  AngleState,
  AngleStatus,
  LogEntry,
} from "./types";

interface JobState {
  meta: {
    id: string;
    prefix: string;
    productName: string;
    description: string;
    referencePath: string;
    createdAt: number;
    updatedAt: number;
    provider: string;
    model: string;
  };
  status: JobStatus;
  angles: AngleState[];
  logs: LogEntry[];
}

const jobs = new Map<string, JobState>();

let consecutiveFailures = 0;

const FAILURE_STORM_THRESHOLD = 6;

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

function computeProgress(angles: AngleState[]) {
  const p = emptyProgress();
  for (const a of angles) {
    switch (a.status) {
      case "completed":
        p.completed++;
        break;
      case "failed":
        p.failed++;
        break;
      case "pending":
        p.pending++;
        break;
      case "generating":
        p.generating++;
        break;
      case "stopped":
        p.stopped++;
        break;
    }
  }
  return p;
}

function snapshot(state: JobState): JobSnapshot {
  return {
    ...state.meta,
    status: state.status,
    progress: computeProgress(state.angles),
    angles: [...state.angles],
    logs: [...state.logs],
  };
}

function touch(state: JobState) {
  state.meta.updatedAt = Date.now();
}

function appendLog(state: JobState, level: LogEntry["level"], message: string) {
  state.logs.push({ ts: Date.now(), level, message });
  if (state.logs.length > MAX_LOG_ENTRIES) {
    state.logs = state.logs.slice(-MAX_LOG_ENTRIES);
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export function createJob(
  id: string,
  prefix: string,
  productName: string,
  description: string,
  referencePath: string,
  providerName: string,
  modelName: string
): JobSnapshot {
  const angles: AngleState[] = ANGLES.map((angle) => ({
    angle,
    status: "pending" as AngleStatus,
    attempts: 0,
  }));

  const state: JobState = {
    meta: {
      id,
      prefix,
      productName,
      description,
      referencePath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      provider: providerName,
      model: modelName,
    },
    status: "running",
    angles,
    logs: [],
  };

  jobs.set(id, state);
  consecutiveFailures = 0;
  appendLog(state, "info", `Job created — ${ANGLES.length} angles queued`);
  return snapshot(state);
}

export function getJob(jobId: string): JobSnapshot | null {
  const state = jobs.get(jobId);
  return state ? snapshot(state) : null;
}

export function getJobState(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

export function updateAngleStatus(
  jobId: string,
  angle: number,
  patch: Partial<AngleState>
): void {
  const state = jobs.get(jobId);
  if (!state) return;

  const idx = state.angles.findIndex((a) => a.angle === angle);
  if (idx === -1) return;

  state.angles[idx] = { ...state.angles[idx], ...patch };
  touch(state);
}

export function setJobStatus(jobId: string, status: JobStatus): void {
  const state = jobs.get(jobId);
  if (!state) return;
  state.status = status;
  touch(state);

  if (status === "stopped") {
    // Mark pending angles as stopped
    for (const angle of state.angles) {
      if (angle.status === "pending") {
        angle.status = "stopped";
      }
    }
  }

  appendLog(state, "info", `Job ${status}`);
}

export function log(jobId: string, level: LogEntry["level"], message: string): void {
  const state = jobs.get(jobId);
  if (!state) return;
  appendLog(state, level, message);
}

export function canRunAngle(jobId: string, angle: number): boolean {
  const state = jobs.get(jobId);
  if (!state) return false;
  if (state.status !== "running") return false;
  const idx = state.angles.findIndex((a) => a.angle === angle);
  if (idx === -1) return false;
  return state.angles[idx].status === "pending";
}

export function markAngleGenerating(jobId: string, angle: number): boolean {
  const state = jobs.get(jobId);
  if (!state) return false;
  const idx = state.angles.findIndex((a) => a.angle === angle);
  if (idx === -1 || state.angles[idx].status !== "pending") return false;
  state.angles[idx] = {
    ...state.angles[idx],
    status: "generating",
    startedAt: Date.now(),
  };
  touch(state);
  appendLog(state, "info", `${angle}° generating…`);
  return true;
}

export function markAngleCompleted(
  jobId: string,
  angle: number,
  imagePath: string
): void {
  const state = jobs.get(jobId);
  if (!state) return;
  const idx = state.angles.findIndex((a) => a.angle === angle);
  if (idx === -1) return;
  const now = Date.now();
  state.angles[idx] = {
    ...state.angles[idx],
    status: "completed",
    imagePath,
    endedAt: now,
    durationMs: now - (state.angles[idx].startedAt || now),
  };
  consecutiveFailures = 0;
  touch(state);
  appendLog(state, "success", `${angle}° completed`);
  checkJobComplete(state);
}

export function markAngleFailed(jobId: string, angle: number, error: string): void {
  const state = jobs.get(jobId);
  if (!state) return;
  const idx = state.angles.findIndex((a) => a.angle === angle);
  if (idx === -1) return;
  const now = Date.now();
  state.angles[idx] = {
    ...state.angles[idx],
    status: "failed",
    error,
    endedAt: now,
    durationMs: now - (state.angles[idx].startedAt || now),
  };
  consecutiveFailures++;
  touch(state);
  appendLog(state, "error", `${angle}° failed: ${error}`);

  // Failure storm guard: if too many consecutive failures, stop the job
  if (consecutiveFailures >= FAILURE_STORM_THRESHOLD) {
    appendLog(state, "warn", `Too many consecutive failures — stopping job (check API key)`);
    setJobStatus(jobId, "stopped");
  }

  checkJobComplete(state);
}

export function retryAngles(
  jobId: string,
  angles?: number[]
): JobSnapshot | null {
  const state = jobs.get(jobId);
  if (!state) return null;

  const targets = angles
    ? angles
    : state.angles
        .filter((a) => a.status === "failed" || a.status === "stopped")
        .map((a) => a.angle);

  for (const angle of targets) {
    const idx = state.angles.findIndex((a) => a.angle === angle);
    if (idx === -1) continue;
    state.angles[idx] = {
      ...state.angles[idx],
      status: "pending",
      attempts: state.angles[idx].attempts + 1,
      error: undefined,
      startedAt: undefined,
      endedAt: undefined,
      durationMs: undefined,
    };
  }

  if (state.status === "stopped") {
    state.status = "running";
  }

  consecutiveFailures = 0;
  touch(state);
  appendLog(state, "info", `Retry enqueued for ${targets.length} angle(s)`);
  return snapshot(state);
}

// ──────────────────────────────────────────────
// Private
// ──────────────────────────────────────────────

function checkJobComplete(state: JobState) {
  const allDone = state.angles.every(
    (a) => a.status === "completed" || a.status === "failed" || a.status === "stopped"
  );
  if (allDone && state.status === "running") {
    const hasSuccess = state.angles.some((a) => a.status === "completed");
    state.status = hasSuccess ? "completed" : "stopped";
    const total = state.angles.filter((a) => a.status === "completed").length;
    appendLog(state, "success", `Job complete — ${total}/${ANGLES.length} angles generated`);
  }
}

export function isJobRunning(jobId: string): boolean {
  const state = jobs.get(jobId);
  return state?.status === "running";
}

export function resetFailureCounter(): void {
  consecutiveFailures = 0;
}