const DURATION = 40;
const START = -5.8;
const APPROACH = -.8;
const BAY_X = 1.92;
const BAY_Z = -2.25;
const smooth = (value) => value * value * (3 - 2 * value);
const mix = (a, b, t) => a + (b - a) * t;

function turn(progress) {
  const t = smooth(progress);
  const u = 1 - t;
  const x = u * u * u * APPROACH + (3 * u * u * t + 3 * u * t * t + t * t * t) * BAY_X;
  const z = 3 * u * t * t * -.7 + t * t * t * BAY_Z;
  // Tangent uses curve progress rather than easing, so headings remain defined at stops.
  const dx = 3 * u * u * (BAY_X - APPROACH);
  const dz = 6 * u * t * -.7 + 3 * t * t * (BAY_Z + .7);
  return { x, z, yaw: Math.atan2(dx, dz), steer: Math.sin(Math.PI * t) * .48 };
}

export function getParkingSequence(elapsed) {
  const time = ((elapsed % DURATION) + DURATION) % DURATION;
  let main;
  let stage;
  if (time < 8) {
    main = { x: mix(START, APPROACH, smooth(time / 8)), z: 0, yaw: Math.PI / 2, steer: 0 };
    stage = "Arriving";
  } else if (time < 14) {
    main = turn((time - 8) / 6);
    stage = "Parking";
  } else if (time < 26) {
    main = { x: BAY_X, z: BAY_Z, yaw: Math.PI, steer: 0 };
    stage = "Parked";
  } else if (time < 32) {
    main = turn(1 - (time - 26) / 6);
    stage = "Reversing";
  } else {
    main = { x: mix(APPROACH, -START, smooth((time - 32) / 8)), z: 0, yaw: Math.PI / 2, steer: 0 };
    stage = "Departing";
  }
  main.visible = Math.abs(main.x) < 5.35;
  main.reverse = stage === "Reversing";
  main.braking = (stage === "Parked" && time < 15.5) || (stage === "Arriving" && time > 6.5) || (stage === "Parking" && time > 12.5);
  main.indicator = stage === "Parking" || stage === "Reversing";
  const passing = { x: mix(START, -START, smooth(Math.min(1, Math.max(0, (time - 16) / 8)))), z: 0, yaw: Math.PI / 2, steer: 0 };
  passing.visible = time > 16 && time < 24 && Math.abs(passing.x) < 5.35;
  return { main, passing, stage, time };
}
