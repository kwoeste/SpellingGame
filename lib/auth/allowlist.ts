export type AppRole = "student" | "admin";

const DEFAULT_STUDENT_EMAILS = ["mae.woeste@gmail.com"];
const DEFAULT_ADMIN_EMAILS = [
  "kevinw@mcsteen.com",
  "woeste.kevin@gmail.com",
  "molly.woeste@gmail.com",
];

export function parseEmailList(raw: string | undefined, fallback: string[]): string[] {
  const source = raw && raw.trim().length > 0 ? raw : fallback.join(",");
  return source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function studentEmailsFromEnv(): string[] {
  return parseEmailList(process.env.STUDENT_EMAILS, DEFAULT_STUDENT_EMAILS);
}

export function adminEmailsFromEnv(): string[] {
  return parseEmailList(process.env.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS);
}

export function envRoleForEmail(email: string): AppRole | null {
  const normalized = email.trim().toLowerCase();
  if (studentEmailsFromEnv().includes(normalized)) return "student";
  if (adminEmailsFromEnv().includes(normalized)) return "admin";
  return null;
}

export function defaultAllowlists(): { students: string[]; admins: string[] } {
  return {
    students: [...DEFAULT_STUDENT_EMAILS],
    admins: [...DEFAULT_ADMIN_EMAILS],
  };
}
