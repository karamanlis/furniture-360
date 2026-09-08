"use client";

import { useEffect, useRef } from "react";
import { LogEntry } from "@/lib/types";

interface LiveLogProps {
  logs: LogEntry[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

const levelColors: Record<string, string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export default function LiveLog({ logs }: LiveLogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="px-4 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Live Log</h3>
      </div>
      <div
        ref={ref}
        className="log-scroll h-40 overflow-y-auto p-4 space-y-1 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-600 italic">No log entries yet</p>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className={`${levelColors[entry.level]} leading-5`}>
              <span className="text-zinc-600">[{formatTime(entry.ts)}]</span>{" "}
              {entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}