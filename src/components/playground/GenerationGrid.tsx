"use client";

import { AngleState } from "@/lib/types";
import GenerationCard from "./GenerationCard";

interface GenerationGridProps {
  angles: AngleState[];
  jobId: string;
  onRetryAngle: (angle: number) => void;
}

export default function GenerationGrid({ angles, jobId, onRetryAngle }: GenerationGridProps) {
  // Sort by angle
  const sorted = [...angles].sort((a, b) => a.angle - b.angle);

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        360° Views
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {sorted.map((angle) => (
          <GenerationCard
            key={angle.angle}
            angle={angle}
            jobId={jobId}
            onRetry={onRetryAngle}
          />
        ))}
      </div>
    </div>
  );
}