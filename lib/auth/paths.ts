export function normalizePath(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  return decoded
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/;[^/]*/g, "")
    .replace(/\/+/g, "/")
    .replace(/\.+$/g, "")
    .replace(/\/+$/g, "") || "/";
}

function segments(pathname: string): string[] {
  return normalizePath(pathname).split("/").filter(Boolean);
}

export function isAdminPath(pathname: string): boolean {
  const segs = segments(pathname);
  if (segs[0] === "admin") return true;
  if (segs[0] === "api" && segs[1] === "admin") return true;
  return false;
}

export function isGatedStudentPath(pathname: string): boolean {
  const segs = segments(pathname);
  const first = segs[0];
  if (!first) return false;
  if (["study", "games", "spelling-game", "number-match"].includes(first)) return true;
  if (first === "api" && segs[1] === "engine") return true;
  return false;
}

export function isApiPath(pathname: string): boolean {
  return segments(pathname)[0] === "api";
}

export function isPublicPath(pathname: string): boolean {
  const segs = segments(pathname);
  const first = segs[0] ?? "";
  if (!first) return true;
  return [
    "store",
    "thank-you",
    "sign-in",
    "favicon.png",
    "images",
    "audio",
    "api",
  ].includes(first) && !(isAdminPath(pathname) || isGatedStudentPath(pathname));
}
