// NOAA Global Monitoring Division's fractional-year approximation.
// Rounded district-level position keeps the public page from identifying a home.
export const SITE = { latitude: 22.53, longitude: 113.93, timezone: 8 };
export const SEASONS = [
  { id: 'spring', label: '春分', date: '2026-03-20', short: '03 / 20' },
  { id: 'summer', label: '夏至', date: '2026-06-21', short: '06 / 21' },
  { id: 'autumn', label: '秋分', date: '2026-09-23', short: '09 / 23' },
  { id: 'winter', label: '冬至', date: '2026-12-22', short: '12 / 22' },
];

const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function terms(date, localMinutes = 720) {
  const [year, month, day] = date.split('-').map(Number);
  const dayOfYear = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const days = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  const gamma = 2 * Math.PI / days * (dayOfYear - 1 + (localMinutes / 60 - 12) / 24);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  return { equation, declination };
}

export function solarPosition(date, localMinutes, site = SITE) {
  const { equation, declination } = terms(date, localMinutes);
  const latitude = site.latitude * rad;
  const hourAngle = (localMinutes + equation + 4 * site.longitude - 60 * site.timezone) / 4 * rad - Math.PI;
  const sinElevation = Math.sin(latitude) * Math.sin(declination)
    + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const elevation = Math.asin(clamp(sinElevation, -1, 1)) * deg;
  const azimuth = (Math.atan2(Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude)) * deg + 180 + 360) % 360;
  return { elevation, azimuth };
}

export function daylightTimes(date, site = SITE) {
  const { equation, declination } = terms(date);
  const latitude = site.latitude * rad;
  const cosine = (Math.cos(90.833 * rad) / (Math.cos(latitude) * Math.cos(declination)))
    - Math.tan(latitude) * Math.tan(declination);
  const hourAngle = Math.acos(clamp(cosine, -1, 1)) * deg;
  const noon = 720 - 4 * site.longitude - equation + 60 * site.timezone;
  return { sunrise: noon - 4 * hourAngle, sunset: noon + 4 * hourAngle, noon };
}

export function clockTime(minutes) {
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

export function isBlocked(position, { enabled, height, distance, bearing, width, observerHeight }) {
  if (!enabled || position.elevation <= 0) return false;
  const gap = Math.abs(((position.azimuth - bearing + 540) % 360) - 180);
  const horizon = Math.atan2(height - observerHeight, distance) * deg;
  return gap <= width / 2 && position.elevation < horizon;
}
