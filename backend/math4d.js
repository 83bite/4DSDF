export const ROTATION_PLANES = [
  ["xy", 0, 1],
  ["xz", 0, 2],
  ["xw", 0, 3],
  ["yz", 1, 2],
  ["yw", 1, 3],
  ["zw", 2, 3],
];

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function vec4Length(point) {
  return Math.hypot(point[0], point[1], point[2], point[3]);
}

export function rotate4(point, angles) {
  const rotated = point.slice(0, 4);

  for (const [name, i, j] of ROTATION_PLANES) {
    const angle = (angles?.[name] ?? 0) * (Math.PI / 180);

    if (Math.abs(angle) < 1e-7) {
      continue;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const a = rotated[i];
    const b = rotated[j];

    rotated[i] = a * cos - b * sin;
    rotated[j] = a * sin + b * cos;
  }

  return rotated;
}

export function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function length3(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

export function normalize3(vector) {
  const length = length3(vector) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
