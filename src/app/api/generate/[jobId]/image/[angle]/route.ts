// ──────────────────────────────────────────────
// GET /api/generate/[jobId]/image/[angle] — Serve generated image
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; angle: string }> }
): Promise<NextResponse> {
  const { jobId, angle } = await params;
  const angleNum = parseInt(angle, 10);

  if (isNaN(angleNum) || angleNum < 0 || angleNum > 345) {
    return NextResponse.json({ error: "Invalid angle" }, { status: 400 });
  }

  const padded = String(angleNum).padStart(3, "0");

  // Try jpg, png, svg
  const extensions = ["jpg", "png", "svg"];
  for (const ext of extensions) {
    const imagePath = join(
      process.cwd(),
      "data",
      "jobs",
      jobId,
      "images",
      `${padded}.${ext}`
    );
    if (existsSync(imagePath)) {
      const buffer = await readFile(imagePath);
      const contentType =
        ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  return NextResponse.json({ error: "Image not found" }, { status: 404 });
}