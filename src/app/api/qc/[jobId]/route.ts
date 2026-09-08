// ──────────────────────────────────────────────
// POST /api/qc/[jobId] — Identity QC check
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getJob, getJobState, updateAngleStatus, log, retryAngles } from "@/lib/job-manager";
import { readImageAsBase64, getReferencePath } from "@/lib/storage";
import { QC_THRESHOLD, AUTO_FIX_THRESHOLD } from "@/lib/vision";
import { getVisionProvider } from "@/lib/image-generation";
import { generationQueue } from "@/server/queue";
import { QCResult } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const angles: number[] | undefined = body.angles;
    const autoFix = Boolean(body.autoFix);

    // Get completed angles
    const targetAngles = angles
      ? job.angles.filter((a) => angles.includes(a.angle) && a.status === "completed")
      : job.angles.filter((a) => a.status === "completed");

    if (targetAngles.length === 0) {
      return NextResponse.json({ error: "No completed angles to check" }, { status: 400 });
    }

    // Read reference image once
    const refPath = getReferencePath(jobId);
    let refBase64 = "";
    let refMime = "";
    try {
      const ref = await readImageAsBase64(refPath);
      refBase64 = ref.base64;
      refMime = ref.mime;
    } catch {
      return NextResponse.json({ error: "Failed to read reference image" }, { status: 500 });
    }

    const visionProvider = await getVisionProvider();

    const results: { angle: number; qc: QCResult }[] = [];
    const autoFixAngles: number[] = [];

    for (const angleState of targetAngles) {
      if (!angleState.imagePath) continue;

      try {
        const genImage = await readImageAsBase64(angleState.imagePath);

        const qcData = await visionProvider.check({
          referenceImageBase64: refBase64,
          generatedImageBase64: genImage.base64,
          productName: job.productName,
          description: job.description,
          angle: angleState.angle,
        });

        const passed = qcData.same && qcData.confidence >= QC_THRESHOLD;
        const qcResult: QCResult = {
          checkedAt: Date.now(),
          passed,
          score: qcData.confidence,
          note: qcData.reason,
        };

        results.push({ angle: angleState.angle, qc: qcResult });
        updateAngleStatus(jobId, angleState.angle, { qc: qcResult });

        // Auto-fix if score too low
        if (autoFix && qcData.confidence < AUTO_FIX_THRESHOLD) {
          autoFixAngles.push(angleState.angle);
          log(jobId, "warn", `${angleState.angle}° QC score ${qcData.confidence} — auto-fix`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          angle: angleState.angle,
          qc: {
            checkedAt: Date.now(),
            passed: false,
            score: 0,
            note: `QC failed: ${message}`,
          },
        });
      }
    }

    // Process auto-fix retries
    if (autoFixAngles.length > 0) {
      const snapshot = retryAngles(jobId, autoFixAngles);
      if (snapshot) {
        generationQueue.enqueueAngles(jobId, autoFixAngles);
      }
    }

    log(jobId, "info", `QC checked ${results.length} angle(s)`);

    return NextResponse.json({
      checked: results.length,
      autoFixed: autoFixAngles.length,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "QC failed" },
      { status: 500 }
    );
  }
}