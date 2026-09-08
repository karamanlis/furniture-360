import { JobProgress } from "./types";

export const ANGLES = Object.freeze(
  Array.from({ length: 24 }, (_, i) => i * 15)
); // [0, 15, 30, ..., 345]

export const CONCURRENCY_DEFAULT = 3;
export const MAX_LOG_ENTRIES = 200;
export const POLL_INTERVAL_MS = 1200;

export const UPLOAD_MAX_MB = 10;
export const IMAGE_MAX_DIMENSION = 1024;
export const IMAGE_QUALITY = 85;

export const ZIP_FILENAME_PREFIX = "360-pack";

export function emptyProgress(): JobProgress {
  return {
    total: ANGLES.length,
    completed: 0,
    failed: 0,
    pending: 0,
    generating: 0,
    stopped: 0,
  };
}