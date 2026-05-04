const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(Number(n)) ? Number(n) : 0));

export function toPriority(score) {
  if (score >= 0.85) return 1;
  if (score >= 0.65) return 2;
  if (score >= 0.45) return 3;
  if (score >= 0.25) return 4;
  return 5;
}

export function scoreConversionCandidate(candidate) {
  const dropoff = clamp01(candidate.dropoff_score);
  const tierBoost = ['epicenter', 'prestige'].includes(candidate.normalized_tier) ? 0.18
    : candidate.normalized_tier === 'elite' ? 0.1
    : 0.04;
  return clamp01(dropoff + tierBoost);
}

export function scoreRevenueCandidate(candidate) {
  const base = clamp01(candidate.upsell_score);
  const expiryBoost = candidate.days_to_expiry <= 3 ? 0.2 : candidate.days_to_expiry <= 7 ? 0.1 : 0;
  return clamp01(base + expiryBoost);
}

export function scoreRetentionCandidate(candidate) {
  const base = clamp01(candidate.risk_score);
  const severityBoost = candidate.severity === 'critical' ? 0.22 : candidate.severity === 'high' ? 0.1 : 0;
  return clamp01(base + severityBoost);
}

export function scoreOpsAnomaly({ ratio = 0, threshold = 0.15 }) {
  if (ratio <= threshold) return 0;
  return clamp01((ratio - threshold) / Math.max(0.01, 1 - threshold));
}
