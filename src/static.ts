import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME_BY_EXT: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function defaultPublicDir(): string {
  return path.join(moduleDir, "..", "public");
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function resolvePublicFile(publicDir: string, urlPath: string): string | null {
  if (!urlPath.startsWith("/") || urlPath.includes("..")) {
    return null;
  }

  const relative = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const filePath = path.resolve(publicDir, relative);
  const root = path.resolve(publicDir);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return filePath;
}

export async function tryServeStatic(
  req: IncomingMessage,
  res: ServerResponse,
  publicDir: string = defaultPublicDir(),
): Promise<boolean> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const urlPath = (req.url ?? "").split("?")[0] ?? "";
  const filePath = resolvePublicFile(publicDir, urlPath);
  if (!filePath) {
    return false;
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return false;
  }

  if (!fileStat.isFile()) {
    return false;
  }

  res.writeHead(200, { "Content-Type": contentType(filePath) });

  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    res.on("error", reject);
    stream.pipe(res);
    stream.on("end", () => resolve());
  });

  return true;
}
