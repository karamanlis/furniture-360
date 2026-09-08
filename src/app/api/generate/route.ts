// ──────────────────────────────────────────────
// POST /api/generate — Create a new 360° generation job
// ──────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createJob, log } from "@/lib/job-manager";
import { ensureJobDirs, saveReferenceImage } from "@/lib/storage";
import { generationQueue } from "@/server/queue";
import { UPLOAD_MAX_MB } from "@/lib/constants";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") || "";

    let referencePath: string;
    let productName: string;
    let description: string;
    let providerName = process.env.IMAGE_GENERATION_PROVIDER || "mock";
    let modelName = "default";
    const jobId = randomUUID();

    if (contentType.includes("multipart/form-data")) {
      // ── File upload ──
      const formData = await request.formData();
      const file = formData.get("referenceImage") as File | null;
      const name = formData.get("productName") as string | null;
      const desc = formData.get("description") as string | null;

      if (!file) {
        return NextResponse.json({ error: "referenceImage is required" }, { status: 400 });
      }

      if (file.size > UPLOAD_MAX_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `File too large (max ${UPLOAD_MAX_MB}MB)` },
          { status: 400 }
        );
      }

      productName = name || "Product";
      description = desc || "";
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "image/jpeg";

      await ensureJobDirs(jobId);
      referencePath = await saveReferenceImage(jobId, buffer, mimeType);
    } else {
      // ── JSON with imageUrl ──
      const body = await request.json();
      const { imageUrl, productName: pn, description: desc } = body;

      if (!imageUrl) {
        return NextResponse.json({ error: "imageUrl or FormData with referenceImage is required" }, { status: 400 });
      }

      productName = pn || "Product";
      description = desc || "";

      // Fetch image from URL server-side (solves CORS)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch image from URL: ${response.status}` }, { status: 400 });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      await ensureJobDirs(jobId);
      referencePath = await saveReferenceImage(jobId, buffer, mimeType);
    }

    const snapshot = createJob(
      jobId,
      productName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      productName,
      description,
      referencePath,
      providerName,
      modelName
    );

    // Enqueue generation tasks
    generationQueue.enqueueJob(jobId);

    log(jobId, "success", `Job started — ${snapshot.angles.length} angles queued`);

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    console.error("POST /api/generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}