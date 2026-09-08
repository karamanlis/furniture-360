// ──────────────────────────────────────────────
// ZIP — streaming archive of generated images
// ──────────────────────────────────────────────
import { ZipArchive } from "archiver";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { ANGLES } from "./constants";
import { getImagesDir, getReferencePath } from "./storage";

export interface ZipOptions {
  jobId: string;
  prefix: string;
}

export async function create360ZipStream(
  options: ZipOptions,
  onError?: (err: Error) => void
): Promise<ZipArchive> {
  const archive = new ZipArchive({ zlib: { level: 6 } });

  archive.on("error", (err: Error) => {
    onError?.(err);
  });

  const imagesDir = join(process.cwd(), "data", "jobs", options.jobId, "images");

  for (const angle of ANGLES) {
    const filename = `${options.prefix}-${String(angle).padStart(3, "0")}.jpg`;
    const pngFilename = `${options.prefix}-${String(angle).padStart(3, "0")}.png`;
    const svgFilename = `${options.prefix}-${String(angle).padStart(3, "0")}.svg`;

    const jpgPath = join(imagesDir, `${String(angle).padStart(3, "0")}.jpg`);
    const pngPath = join(imagesDir, `${String(angle).padStart(3, "0")}.png`);
    const svgPath = join(imagesDir, `${String(angle).padStart(3, "0")}.svg`);

    if (existsSync(jpgPath)) {
      archive.file(jpgPath, { name: filename });
    } else if (existsSync(pngPath)) {
      archive.file(pngPath, { name: pngFilename });
    } else if (existsSync(svgPath)) {
      archive.file(svgPath, { name: svgFilename });
    }
  }

  // Include reference image
  const refPath = join(process.cwd(), "data", "jobs", options.jobId, "ref.jpg");
  const refPngPath = join(process.cwd(), "data", "jobs", options.jobId, "ref.png");
  if (existsSync(refPath)) {
    archive.file(refPath, { name: `${options.prefix}-reference.jpg` });
  } else if (existsSync(refPngPath)) {
    archive.file(refPngPath, { name: `${options.prefix}-reference.png` });
  }

  archive.finalize();
  return archive;
}