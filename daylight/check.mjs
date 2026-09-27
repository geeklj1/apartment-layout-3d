import assert from 'node:assert/strict';
import { SEASONS, SITE, solarPosition, daylightTimes, isBlocked } from './solar.js';

const durations = [];
for (const season of SEASONS) {
  const { sunrise, noon, sunset } = daylightTimes(season.date, SITE);
  assert.ok(sunrise < noon && noon < sunset, `${season.label}: times are ordered`);
  assert.ok(Math.abs(solarPosition(season.date, sunrise, SITE).elevation + 0.833) < 0.5, `${season.label}: sunrise horizon`);
  assert.ok(Math.abs(solarPosition(season.date, sunset, SITE).elevation + 0.833) < 0.5, `${season.label}: sunset horizon`);
  durations.push(sunset - sunrise);
}
assert.ok(durations[1] > durations[0] && durations[0] > durations[3], 'Shenzhen daylight season order');
assert.ok(solarPosition(SEASONS[1].date, daylightTimes(SEASONS[1].date).noon).elevation > 85, 'summer noon near zenith');
const scenario = { enabled: true, height: 100, distance: 60, bearing: 285, width: 40, observerHeight: 58 };
assert.equal(isBlocked({ azimuth: 285, elevation: 10 }, scenario), true);
assert.equal(isBlocked({ azimuth: 180, elevation: 10 }, scenario), false);
assert.equal(isBlocked({ azimuth: 285, elevation: 45 }, scenario), false);
console.log('Solar times, positions, and obstruction scenario: OK');
