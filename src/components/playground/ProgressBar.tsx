"use client";

interface ProgressBarProps {
  completed: number;
  total: number;
  failed: number;
  generating: number;
}

export default function ProgressBar({ completed, total, failed, generating }: ProgressBarProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const failedPct = total > 0 && failed > 0 ? (failed / total) * 100 : 0;
  const generatingPct = total > 0 && generating > 0 ? (generating / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-300">360° Generation</h3>
        <span className="text-sm text-zinc-400">
          {completed} / {total} completed
          {failed > 0 && <span className="text-red-400 ml-2">· {failed} failed</span>}
          {generating > 0 && <span className="text-amber-400 ml-2">· {generating} generating</span>}
        </span>
      </div>
      <div
        className="h-3 rounded-full bg-zinc-800 overflow-hidden flex"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {failedPct > 0 && (
          <div
            className="h-full bg-red-500/60 transition-all duration-500 ease-out"
            style={{ width: `${failedPct}%` }}
          />
        )}
        {generatingPct > 0 && (
          <div
            className="h-full bg-amber-500/60 animate-pulse transition-all duration-500 ease-out"
            style={{ width: `${generatingPct}%` }}
          />
        )}
      </div>
    </div>
  );
}