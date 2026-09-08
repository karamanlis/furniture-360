"use client";

interface DownloadAllProps {
  jobId: string | null;
  completedCount: number;
}

export default function DownloadAll({ jobId, completedCount }: DownloadAllProps) {
  if (!jobId || completedCount === 0) return null;

  return (
    <a
      href={`/api/download/${jobId}`}
      download
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm font-semibold transition-colors"
    >
      <span>⬇</span>
      Download All ({completedCount})
    </a>
  );
}