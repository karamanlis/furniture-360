// ──────────────────────────────────────────────
// Storage — job directory, image normalization
// ──────────────────────────────────────────────
import { mkdir, writeFile, readFile, readdir, existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const readdirAsync = promisify(readdir);

const DATA_DIR = join(process.cwd(), "data", "jobs");

export function getJobDir(jobId: string): string {
  return join(DATA_DIR, jobId);
}

export function getImagesDir(jobId: string): string {
  return join(getJobDir(jobId), "images");
}

export function getReferencePath(jobId: string): string {
  return join(getJobDir(jobId), "ref.jpg");
}

export function getImagePath(jobId: string, angle: number): string {
  return join(getImagesDir(jobId), `${String(angle).padStart(3, "0")}.jpg`);
}

export function getMetaPath(jobId: string): string {
  return join(getJobDir(jobId), "meta.json");
}

export async function ensureJobDirs(jobId: string): Promise<void> {
  await mkdirAsync(getJobDir(jobId), { recursive: true });
  await mkdirAsync(getImagesDir(jobId), { recursive: true });
}

export async function saveReferenceImage(
  jobId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType === "image/png" ? ".png" : ".jpg";
  const refPath = join(getJobDir(jobId), `ref${ext}`);
  await writeFileAsync(refPath, buffer);
  return refPath;
}

export async function saveGeneratedImage(
  jobId: string,
  angle: number,
  base64Data: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType === "image/png" ? ".png" : mimeType === "image/svg+xml" ? ".svg" : ".jpg";
  const imagePath = join(getImagesDir(jobId), `${String(angle).padStart(3, "0")}${ext}`);
  const buffer = Buffer.from(base64Data, "base64");
  await writeFileAsync(imagePath, buffer);
  return imagePath;
}

export async function readImageAsBase64(filePath: string): Promise<{ base64: string; mime: string }> {
  const buffer = await readFileAsync(filePath);
  const ext = filePath.endsWith(".png") ? "image/png" : filePath.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
  return { base64: buffer.toString("base64"), mime: ext };
}

export async function listGeneratedAngles(jobId: string): Promise<{ angle: number; path: string }[]> {
  const dir = getImagesDir(jobId);
  if (!existsSync(dir)) return [];
  const files = await readdirAsync(dir);
  return files
    .filter((f) => f.match(/^\d{3}\.(jpg|png|svg)$/))
    .map((f) => ({
      angle: parseInt(f.slice(0, 3), 10),
      path: join(dir, f),
    }))
    .sort((a, b) => a.angle - b.angle);
}

export async function jobDirectoryExists(jobId: string): Promise<boolean> {
  return existsSync(getJobDir(jobId));
}

export async function writeMeta(jobId: string, data: unknown): Promise<void> {
  await writeFileAsync(getMetaPath(jobId), JSON.stringify(data, null, 2));
}