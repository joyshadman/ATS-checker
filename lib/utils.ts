export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

const cooldownMap = new Map<string, number>();

export function checkCooldown(action: string, userId: string, cooldownMs = 10000): boolean {
  const key = `${action}:${userId}`;
  const last = cooldownMap.get(key) || 0;
  const now = Date.now();
  if (now - last < cooldownMs) return false;
  cooldownMap.set(key, now);
  return true;
}

export function scoreToVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

export function scoreToLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 50) return "Needs Work";
  return "Poor";
}
