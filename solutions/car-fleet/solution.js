/**
 * @param {number} target
 * @param {number[]} position
 * @param {number[]} speed
 * @return {number}
 */
function carFleet(target, position, speed) {
  const cars = position.map((p, i) => [p, speed[i]]).sort((a, b) => b[0] - a[0]); // nearest first
  let fleets = 0;
  let slowest = 0; // arrival time of the fleet just ahead
  for (const [p, s] of cars) {
    const t = (target - p) / s; // when this car would arrive on its own
    if (t > slowest) {
      // it cannot catch the fleet ahead: a new fleet
      fleets++;
      slowest = t;
    }
  }
  return fleets;
}
