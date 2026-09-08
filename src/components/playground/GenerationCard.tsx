"use client";

import { useState, useEffect } from "react";
import { AngleState } from "@/lib/types";

interface GenerationCardProps {
  angle: AngleState;
  jobId: string;
  onRetry: (angle: number) => void;
}

const statusStyles: Record<string, string> = {
  pending: "border-zinc-800",
  generating: "border-amber-600/50 animate-pulse-status",
  completed: "border-emerald-600/50",
  failed: "border-red-600/50",
  stopped: "border-zinc-700 opacity-60",
};

const statusBadge: Record<string, { label: string; class: string }> = {
  pending: { label: "PENDING", class: "bg-zinc-800 text-zinc-400" },
  generating: { label: "GENERATING", class: "bg-amber-900/50 text-amber-400" },
  completed: { label: "DONE", class: "bg-emerald-900/50 text-emerald-400" },
  failed: { label: "ERROR", class: "bg-red-900/50 text-red-400" },
  stopped: { label: "STOPPED", class: "bg-zinc-800 text-zinc-500" },
};

export default function GenerationCard({ angle, jobId, onRetry }: GenerationCardProps) {
  const [elapsed, setElapsed] = useState("");

  // Live elapsed timer for generating state
  useEffect(() => {
    if (angle.status !== "generating" || !angle.startedAt) return;
    const interval = setInterval(() => {
      const sec = Math.floor((Date.now() - angle.startedAt!) / 1000);
      setElapsed(sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [angle.status, angle.startedAt]);

  const badge = statusBadge[angle.status] || statusBadge.pending;

  return (
    <div
      className={`rounded-lg border-2 bg-zinc-900 overflow-hidden transition-all ${statusStyles[angle.status] || statusStyles.pending}`}
    >
      {/* Image area */}
      <div className="aspect-square bg-zinc-950 flex items-center justify-center relative">
        {angle.status === "completed" && angle.imagePath ? (
          <img
            src={`/api/generate/${jobId}/image/${angle.angle}`}
            alt={`${angle.angle}°`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : angle.status === "failed" ? (
          <div className="text-center p-2">
            <div className="text-2xl mb-1">⚠️</div>
            {angle.error && (
              <p className="text-[10px] text-red-400/80 leading-tight line-clamp-3">{angle.error}</p>
            )}
          </div>
        ) : angle.status === "stopped" ? (
          <div className="text-zinc-600 text-center p-2">
            <div className="text-2xl mb-1">⏹</div>
            <p className="text-[10px]">Stopped</p>
          </div>
        ) : (
          <div className="text-zinc-700 text-center">
            <div className="text-3xl mb-1">◻</div>
            {angle.status === "generating" && (
              <div className="animate-pulse-status">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-300">
            {String(angle.angle).padStart(3, "0")}°
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.class}`}>
            {badge.label}
          </span>
        </div>

        {angle.status === "generating" && elapsed && (
          <p className="text-[10px] text-amber-500">{elapsed}</p>
        )}
        {angle.status === "completed" && angle.durationMs && (
          <p className="text-[10px] text-zinc-600">{Math.round(angle.durationMs / 1000)}s</p>
        )}

        {/* QC score chip */}
        {angle.qc && (
          <div className={`text-[10px] font-medium ${
            angle.qc.passed ? "text-emerald-500" : angle.qc.score > 40 ? "text-amber-500" : "text-red-500"
          }`}>
            QC: {angle.qc.score}/100
          </div>
        )}

        {/* Retry button */}
        {(angle.status === "failed" || angle.status === "stopped") && (
          <button
            onClick={() => onRetry(angle.angle)}
            className="w-full mt-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-medium transition-colors"
          >
            RETRY
          </button>
        )}
      </div>
    </div>
  );
}