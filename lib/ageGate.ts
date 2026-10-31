// Shared 18+ age-gate state (client only).
// AgeGate writes today's HK date to localStorage when the visitor confirms;
// other surfaces (e.g. news cover blur) read the same flag so one daily
// confirmation lifts adult-content restrictions site-wide for that day.

export const AGE_GATE_EVENT = 'jstar:age-ok';
export const AGE_GATE_STORAGE_KEY = 'jstar-…date';

export function hkDateString(d: Date): string {
  // Fixed +8 offset, independent of the visitor's machine timezone.
  const hk = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return hk.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function isAgeConfirmedToday(): boolean {
  try {
    return localStorage.getItem(AGE_GATE_STORAGE_KEY) === hkDateString(new Date());
  } catch {
    // localStorage unavailable (private mode etc.) — treat as not confirmed.
    return false;
  }
}
