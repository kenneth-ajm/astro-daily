import { DateTime } from "luxon";
import * as Astronomy from "astronomy-engine";

/**
 * Deterministic Western Zodiac (tropical) Sun sign by date.
 */
export function westernSunSign(month: number, day: number): string {
  // dates are inclusive start
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  return "Pisces";
}

/**
 * Moon sign using astronomy-engine: compute Moon ecliptic longitude (tropical)
 * and map to zodiac sign (30° segments).
 */
export function westernMoonSign(utcDate: Date): string {
  const time = Astronomy.MakeTime(utcDate);
  const moonEcl = Astronomy.Ecliptic(Astronomy.GeoMoon(time)); // ecliptic lon/lat
  const lon = ((moonEcl.elon % 360) + 360) % 360;

  const signs = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  const idx = Math.floor(lon / 30);
  return signs[idx] ?? "Unknown";
}

/**
 * Chinese Zodiac animal (Earthly Branch) from Gregorian year.
 * Note: Some traditions switch at Lunar New Year; for a beginner MVP,
 * Gregorian year is deterministic and matches your 1986 Tiger correctly.
 */
export function chineseZodiacAnimal(year: number): string {
  const animals = [
    "Rat","Ox","Tiger","Rabbit","Dragon","Snake",
    "Horse","Goat","Monkey","Rooster","Dog","Pig"
  ];
  // 2008 was Rat; common anchor is year 4 = Rat in this formula
  const idx = (year - 4) % 12;
  return animals[(idx + 12) % 12];
}

/**
 * Chinese Heavenly Stem element from year (10-stem cycle).
 * Stems: Jia Yi (Wood), Bing Ding (Fire), Wu Ji (Earth), Geng Xin (Metal), Ren Gui (Water)
 * Each element appears twice in the 10-stem cycle.
 */
export function chineseYearElement(year: number): { element: string; yinYang: "Yin" | "Yang" } {
  const stems = [
    { element: "Wood", yinYang: "Yang" as const }, // Jia
    { element: "Wood", yinYang: "Yin" as const },  // Yi
    { element: "Fire", yinYang: "Yang" as const }, // Bing
    { element: "Fire", yinYang: "Yin" as const },  // Ding
    { element: "Earth", yinYang: "Yang" as const },// Wu
    { element: "Earth", yinYang: "Yin" as const }, // Ji
    { element: "Metal", yinYang: "Yang" as const },// Geng
    { element: "Metal", yinYang: "Yin" as const }, // Xin
    { element: "Water", yinYang: "Yang" as const },// Ren
    { element: "Water", yinYang: "Yin" as const }, // Gui
  ];
  const idx = (year - 4) % 10;
  return stems[(idx + 10) % 10];
}

/**
 * Parse profile dob/tob/timezone into a UTC Date deterministically.
 * - dob: "YYYY-MM-DD"
 * - tob: "HH:mm" (24h)
 * - timezone: IANA timezone preferred ("Asia/Singapore")
 */
export function toUtcDate(dob: string, tob: string, timezone: string): Date {
  // small convenience mapping for common user input
  const tz =
    timezone === "Singapore" ? "Asia/Singapore" :
    timezone === "SG" ? "Asia/Singapore" :
    timezone;

  const dt = DateTime.fromISO(`${dob}T${tob}`, { zone: tz });
  if (!dt.isValid) {
    // fallback: treat as UTC if timezone is invalid
    const fallback = DateTime.fromISO(`${dob}T${tob}`, { zone: "UTC" });
    return fallback.toJSDate();
  }
  return dt.toUTC().toJSDate();
}
