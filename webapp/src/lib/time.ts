const TZ = "Europe/Amsterdam";

/** Milliseconds Amsterdam is ahead of UTC at a given instant (handles DST). */
function tzOffsetMs(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - instant.getTime();
}

/**
 * Start of next week = the coming Monday 00:00 in Europe/Amsterdam
 * (i.e. Sunday→Monday midnight), returned as an ISO timestamp.
 *
 * All weekly caches expire on this shared boundary so the whole cache resets
 * at the start of each week rather than on rolling per-entry 7-day timers.
 */
export function nextWeekStart(): string {
  const now = new Date();
  const offset = tzOffsetMs(now);
  // Amsterdam wall-clock "now": a Date whose UTC fields equal Ams local fields.
  const amsNow = new Date(now.getTime() + offset);
  const dow = amsNow.getUTCDay(); // 0=Sun .. 6=Sat (Amsterdam weekday)
  let days = (1 - dow + 7) % 7; // days until Monday
  if (days === 0) days = 7; // always the *next* Monday, never today
  // Monday 00:00 as an Amsterdam wall clock, expressed as a UTC-epoch guess.
  const targetWall = Date.UTC(
    amsNow.getUTCFullYear(),
    amsNow.getUTCMonth(),
    amsNow.getUTCDate() + days,
    0,
    0,
    0,
  );
  // Convert that wall clock to the real UTC instant using the offset near target.
  const offsetAtTarget = tzOffsetMs(new Date(targetWall - offset));
  return new Date(targetWall - offsetAtTarget).toISOString();
}
