// ──────────────────────────────────────────────
// POST /api/generate/[jobId]/control — Pause/Resume/Stop
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getJob, getJobState, setJobStatus, log } from "@/lib/job-manager";
import { generationQueue } from "@/server/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;
  const state = getJobState(jobId);

  if (!state) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    const { action } = await request.json();

    switch (action) {
      case "pause":
        if (state.status !== "running") {
          return NextResponse.json({ error: "Job is not running" }, { status: 400 });
        }
        setJobStatus(jobId, "paused");
        generationQueue.pause(jobId);
        break;

      case "resume":
        if (state.status !== "paused") {
          return NextResponse.json({ error: "Job is not paused" }, { status: 400 });
        }
        setJobStatus(jobId, "running");
        generationQueue.resume(jobId);
        break;

      case "stop":
        if (state.status !== "running" && state.status !== "paused") {
          return NextResponse.json({ error: "Job is not active" }, { status: 400 });
        }
        generationQueue.stop(jobId);
        setJobStatus(jobId, "stopped");
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use pause, resume, or stop.` },
          { status: 400 }
        );
    }

    const snapshot = getJob(jobId);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}