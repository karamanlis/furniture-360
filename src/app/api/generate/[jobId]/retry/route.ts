// ──────────────────────────────────────────────
// POST /api/generate/[jobId]/retry — Retry failed/stopped angles
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getJob, retryAngles } from "@/lib/job-manager";
import { generationQueue } from "@/server/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;

  const existing = getJob(jobId);
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const angles: number[] | undefined = body.angles;

    const snapshot = retryAngles(jobId, angles);
    if (!snapshot) {
      return NextResponse.json({ error: "Failed to retry angles" }, { status: 500 });
    }

    // Get the angles that were set back to pending
    const retriedAngles = snapshot.angles
      .filter((a) => a.status === "pending" && a.attempts > 0)
      .map((a) => a.angle);

    if (retriedAngles.length > 0) {
      generationQueue.enqueueAngles(jobId, retriedAngles);
    }

    return NextResponse.json(getJob(jobId));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}