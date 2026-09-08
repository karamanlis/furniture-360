// ──────────────────────────────────────────────
// GET /api/download/[jobId] — Download all images as ZIP
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-manager";
import { create360ZipStream } from "@/lib/zip";
import { Readable } from "stream";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const completedCount = job.angles.filter((a) => a.status === "completed").length;
  if (completedCount === 0) {
    return NextResponse.json({ error: "No completed images to download" }, { status: 400 });
  }

  try {
    const prefix = job.prefix || "product";
    const archive = await create360ZipStream({ jobId, prefix });

    // Convert Node.js stream to Web ReadableStream
    const nodeStream = archive as unknown as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err: Error) => controller.error(err));
      },
    });

    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${prefix}-360.zip"`,
      "Cache-Control": "no-cache",
    });

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("ZIP creation error:", err);
    return NextResponse.json({ error: "Failed to create ZIP" }, { status: 500 });
  }
}