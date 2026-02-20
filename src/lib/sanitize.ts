const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
];

export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  let clean = input;
  clean = clean.replace(/&/g, "&amp;");
  clean = clean.replace(/</g, "&lt;");
  clean = clean.replace(/>/g, "&gt;");
  clean = clean.replace(/"/g, "&quot;");
  clean = clean.replace(/'/g, "&#x27;");
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, "");
  }
  return clean.trim();
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === "string") {
      (sanitized as any)[key] = sanitizeString(sanitized[key]);
    }
  }
  return sanitized;
}

export function validateEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: "Le mot de passe doit contenir au moins 8 caractères" };
  if (password.length > 128) return { valid: false, error: "Le mot de passe est trop long" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins une majuscule" };
  if (!/[a-z]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins une minuscule" };
  if (!/[0-9]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins un chiffre" };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return { valid: false, error: "Le mot de passe doit contenir au moins un caractère spécial (!@#$%...)" };
  return { valid: true };
}

export function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 100 && !/[<>{}()$]/.test(name);
}

const ALLOWED_REPORT_FIELDS = ["status", "title", "category", "format", "exportedAt"];
const ALLOWED_SESSION_FIELDS = ["title", "description", "clientName", "clientEmail", "clientPhone", "caseReference", "language", "status", "audioDuration"];

export function filterFields(body: Record<string, any>, allowedFields: string[]): Record<string, any> {
  const filtered: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      filtered[key] = typeof body[key] === "string" ? sanitizeString(body[key]) : body[key];
    }
  }
  return filtered;
}

export function filterReportFields(body: Record<string, any>) {
  return filterFields(body, ALLOWED_REPORT_FIELDS);
}

export function filterSessionFields(body: Record<string, any>) {
  return filterFields(body, ALLOWED_SESSION_FIELDS);
}
