const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => value * value * (3 - 2 * value);
const mix = (a, b, t) => a + (b - a) * t;

export function getParkingScrollProgress({ top, height, viewportHeight, navHeight }) {
  const travel = height - (viewportHeight - navHeight);
  return travel > 0 ? clamp((navHeight - top) / travel) : 0;
}

export function getParkingScrollView(progress) {
  const p = clamp(progress);
  const keyframes = [
    { progress: 0, camera: [2.8, 1.7, 3.8] },
    { progress: .5, camera: [.4, 4.5, .9] },
    { progress: .65, camera: [.8, 5.6, 3.2] },
    { progress: 1, camera: [10, 9.5, 13] },
  ];
  const index = p <= .5 ? 0 : p <= .65 ? 1 : 2;
  const from = keyframes[index], to = keyframes[index + 1];
  const t = (p - from.progress) / (to.progress - from.progress);
  const span = to.progress - from.progress;
  // Shared tangents carry velocity through camera keyframes without a stop.
  const camera = from.camera.map((value, axis) => {
    const previous = keyframes[Math.max(0, index - 1)];
    const next = keyframes[Math.min(keyframes.length - 1, index + 2)];
    const startSlope = index === 0 ? 0 : (to.camera[axis] - previous.camera[axis]) / (to.progress - previous.progress);
    const endSlope = index === keyframes.length - 2 ? 0 : (next.camera[axis] - value) / (next.progress - from.progress);
    return (2*t*t*t - 3*t*t + 1)*value + (t*t*t - 2*t*t + t)*span*startSlope
      + (-2*t*t*t + 3*t*t)*to.camera[axis] + (t*t*t - t*t)*span*endSlope;
  });
  const reveal = ease(clamp((p - .65) / .35));
  return {
    camera,
    target: [0, .3 * (1 - reveal), 0],
    reveal,
    carScale: mix(1.8, 1, reveal),
    carYaw: mix(-.28 * (1 - ease(clamp(p / .5))), Math.PI, reveal),
    sequenceTime: 3 + p * 36.5,
    step: p < .28 ? "find" : p < .72 ? "arrive" : "park",
  };
}
