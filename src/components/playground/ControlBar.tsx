"use client";

interface ControlBarProps {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetryAll: () => void;
  canStart: boolean;
  jobStatus?: string;
  failedCount: number;
  loading: boolean;
}

export default function ControlBar({
  onStart,
  onPause,
  onResume,
  onStop,
  onRetryAll,
  canStart,
  jobStatus,
  failedCount,
  loading,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Start */}
      {(!jobStatus || jobStatus === "idle") && (
        <button
          onClick={onStart}
          disabled={!canStart || loading}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Starting..." : "Generate 360°"}
        </button>
      )}

      {/* Pause / Resume / Stop — only when job exists */}
      {jobStatus && jobStatus !== "idle" && jobStatus !== "completed" && (
        <>
          {jobStatus === "running" && (
            <button
              onClick={onPause}
              className="px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors"
            >
              Pause
            </button>
          )}
          {jobStatus === "paused" && (
            <button
              onClick={onResume}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              Resume
            </button>
          )}
          {(jobStatus === "running" || jobStatus === "paused") && (
            <button
              onClick={onStop}
              className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-500 transition-colors"
            >
              Stop
            </button>
          )}
        </>
      )}

      {/* Retry All */}
      {failedCount > 0 && (
        <button
          onClick={onRetryAll}
          className="px-4 py-2.5 bg-zinc-700 text-zinc-100 rounded-lg text-sm font-semibold hover:bg-zinc-600 transition-colors"
        >
          Retry Failed ({failedCount})
        </button>
      )}

      {/* Status badges */}
      {jobStatus && (
        <div className="flex items-center gap-2 ml-auto">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            jobStatus === "running" ? "bg-emerald-900/50 text-emerald-400" :
            jobStatus === "paused" ? "bg-amber-900/50 text-amber-400" :
            jobStatus === "completed" ? "bg-emerald-900/50 text-emerald-400" :
            "bg-red-900/50 text-red-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              jobStatus === "running" ? "bg-emerald-400 animate-pulse" :
              "bg-current"
            }`} />
            {jobStatus}
          </span>
        </div>
      )}
    </div>
  );
}