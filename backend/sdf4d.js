import { vec4Length } from "./math4d.js";

function max4(values) {
  return Math.max(values[0], values[1], values[2], values[3]);
}

function smoothMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}

function sdBox4(point, bounds) {
  const q = [
    Math.abs(point[0]) - bounds[0],
    Math.abs(point[1]) - bounds[1],
    Math.abs(point[2]) - bounds[2],
    Math.abs(point[3]) - bounds[3],
  ];
  const outside = Math.hypot(
    Math.max(q[0], 0),
    Math.max(q[1], 0),
    Math.max(q[2], 0),
    Math.max(q[3], 0),
  );
  const inside = Math.min(max4(q), 0);
  return outside + inside;
}

function sdHypersphere(point, radius) {
  return vec4Length(point) - radius;
}

function sdDuocylinder(point, radiusA, radiusB) {
  const planeA = Math.hypot(point[0], point[1]) - radiusA;
  const planeB = Math.hypot(point[2], point[3]) - radiusB;
  return Math.max(planeA, planeB);
}

function sdSmoothBlend(point) {
  const box = sdBox4(point, [0.62, 0.62, 0.62, 0.62]);
  const sphere = sdHypersphere(point, 0.95);
  const capsule = sdDuocylinder(point, 0.72, 0.28);
  return smoothMin(smoothMin(box, sphere, 0.22), capsule, 0.18);
}

export const SHAPE_PRESETS = {
  hypersphere: {
    label: "Hypersphere",
    bound: 1.25,
    wExtent: 1.25,
    rotation: { xy: 0, xz: 0, xw: 24, yz: 0, yw: 36, zw: 14 },
  },
  tesseract: {
    label: "Tesseract",
    bound: 1.55,
    wExtent: 1.55,
    rotation: { xy: 16, xz: 12, xw: 38, yz: 24, yw: 29, zw: 18 },
  },
  duocylinder: {
    label: "Duocylinder",
    bound: 1.25,
    wExtent: 1.25,
    rotation: { xy: 0, xz: 0, xw: 62, yz: 18, yw: 12, zw: 48 },
  },
  smoothBlend: {
    label: "Smooth Blend",
    bound: 1.4,
    wExtent: 1.4,
    rotation: { xy: 8, xz: 12, xw: 42, yz: 24, yw: 18, zw: 10 },
  },
};

export function evaluateShape(shape, point) {
  switch (shape) {
    case "hypersphere":
      return sdHypersphere(point, 0.95);
    case "tesseract":
      return sdBox4(point, [0.72, 0.72, 0.72, 0.72]);
    case "duocylinder":
      return sdDuocylinder(point, 0.84, 0.42);
    case "smoothBlend":
      return sdSmoothBlend(point);
    default:
      return sdHypersphere(point, 0.95);
  }
}
