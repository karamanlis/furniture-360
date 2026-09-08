// ──────────────────────────────────────────────
// GET /api/reference/[jobId] — Serve reference image
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;

  const jobDir = join(process.cwd(), "data", "jobs", jobId);

  // Try jpg then png
  for (const filename of ["ref.jpg", "ref.png"]) {
    const refPath = join(jobDir, filename);
    if (existsSync(refPath)) {
      const buffer = await readFile(refPath);
      const contentType = filename.endsWith(".png") ? "image/png" : "image/jpeg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  return NextResponse.json({ error: "Reference image not found" }, { status: 404 });
}