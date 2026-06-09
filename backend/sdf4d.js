import { vec4Length } from "./math4d.js";

function max4(values) {
  return Math.max(values[0], values[1], values[2], values[3]);
}

function length2(x, y) {
  return Math.hypot(x, y);
}

function length3(x, y, z) {
  return Math.hypot(x, y, z);
}

function length4(point) {
  return vec4Length(point);
}

function dot4(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function saturate(value) {
  return clamp(value, 0, 1);
}

function smoothMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / Math.max(k, 1e-6);
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}

function smoothMax(a, b, k) {
  return -smoothMin(-a, -b, k);
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

function sdSphere4(point, radius) {
  return vec4Length(point) - radius;
}

function sdDuocylinder(point, radiusA, radiusB) {
  const planeA = Math.hypot(point[0], point[1]) - radiusA;
  const planeB = Math.hypot(point[2], point[3]) - radiusB;
  return Math.max(planeA, planeB);
}

function sdCross4(point, armLength, thickness) {
  return Math.min(
    sdBox4(point, [armLength, thickness, thickness, thickness]),
    sdBox4(point, [thickness, armLength, thickness, thickness]),
    sdBox4(point, [thickness, thickness, armLength, thickness]),
    sdBox4(point, [thickness, thickness, thickness, armLength]),
  );
}

function repeat(value, spacing) {
  const half = spacing * 0.5;
  const wrapped = ((value + half) % spacing + spacing) % spacing;
  return wrapped - half;
}

function opUnion(a, b) {
  return Math.min(a, b);
}

function opIntersect(a, b) {
  return Math.max(a, b);
}

function opSubtract(a, b) {
  return Math.max(a, -b);
}

function normalizeSource(lines) {
  return lines.join("\n").trim();
}

export const DEFAULT_EXAMPLE_ID = "tesseract";

export const FUNCTION_EXAMPLES = {
  tesseract: {
    label: "Tesseract",
    description: "A clean 4D box. Great for seeing how XW, YW, and ZW rotation fold into 3D.",
    scene: {
      mode: "project",
      resolution: 28,
      wSamples: 30,
      bound: 1.55,
      wExtent: 1.55,
      sliceW: 0,
      rotation: { xy: 16, xz: 12, xw: 38, yz: 24, yw: 29, zw: 18 },
    },
    source: normalizeSource([
      "return sdBox4([x, y, z, w], [0.72, 0.72, 0.72, 0.72]);",
    ]),
  },
  hypersphere: {
    label: "Hypersphere",
    description: "The simplest 4D SDF. In slice mode you can watch the 3D radius shrink as w moves away from zero.",
    scene: {
      mode: "slice",
      resolution: 26,
      wSamples: 24,
      bound: 1.25,
      wExtent: 1.25,
      sliceW: 0.35,
      rotation: { xy: 0, xz: 0, xw: 24, yz: 0, yw: 36, zw: 14 },
    },
    source: normalizeSource([
      "return sdSphere4([x, y, z, w], 0.95);",
    ]),
  },
  duocylinder: {
    label: "Duocylinder",
    description: "A classic 4D shape: two orthogonal circles multiplied together, which gives ring-like 3D projections.",
    scene: {
      mode: "project",
      resolution: 28,
      wSamples: 32,
      bound: 1.25,
      wExtent: 1.25,
      sliceW: 0,
      rotation: { xy: 0, xz: 0, xw: 62, yz: 18, yw: 12, zw: 48 },
    },
    source: normalizeSource([
      "return sdDuocylinder([x, y, z, w], 0.84, 0.42);",
    ]),
  },
  smoothBlend: {
    label: "Smooth Blend",
    description: "A rounded blend between a tesseract, a hypersphere, and a duocylinder.",
    scene: {
      mode: "slice",
      resolution: 28,
      wSamples: 28,
      bound: 1.4,
      wExtent: 1.4,
      sliceW: 0.18,
      rotation: { xy: 8, xz: 12, xw: 42, yz: 24, yw: 18, zw: 10 },
    },
    source: normalizeSource([
      "const box = sdBox4([x, y, z, w], [0.62, 0.62, 0.62, 0.62]);",
      "const sphere = sdSphere4([x, y, z, w], 0.95);",
      "const duo = sdDuocylinder([x, y, z, w], 0.72, 0.28);",
      "return smin(smin(box, sphere, 0.22), duo, 0.18);",
    ]),
  },
  hyperCross: {
    label: "Hyper Cross",
    description: "Four long bars, one for each axis in 4D, unioned into a dense crossing structure.",
    scene: {
      mode: "project",
      resolution: 28,
      wSamples: 30,
      bound: 1.45,
      wExtent: 1.45,
      sliceW: 0,
      rotation: { xy: 18, xz: 22, xw: 44, yz: 8, yw: 26, zw: 34 },
    },
    source: normalizeSource([
      "return sdCross4([x, y, z, w], 1.05, 0.16);",
    ]),
  },
  latticeBloom: {
    label: "Lattice Bloom",
    description: "Repeated 4D cells that mix little spheres with a soft hyper-cross frame.",
    scene: {
      mode: "project",
      resolution: 26,
      wSamples: 26,
      bound: 1.35,
      wExtent: 1.35,
      sliceW: 0,
      rotation: { xy: 6, xz: 10, xw: 36, yz: 20, yw: 32, zw: 18 },
    },
    source: normalizeSource([
      "const cell = [repeat(x, 0.92), repeat(y, 0.92), repeat(z, 0.92), repeat(w, 0.92)];",
      "const bead = sdSphere4(cell, 0.24);",
      "const frame = sdCross4(cell, 0.34, 0.08);",
      "return smin(bead, frame, 0.10);",
    ]),
  },
  rippleShell: {
    label: "Ripple Shell",
    description: "A shell-like field with a sinusoidal ripple. Not a perfect SDF, but fun to sculpt with.",
    scene: {
      mode: "slice",
      resolution: 30,
      wSamples: 24,
      bound: 1.3,
      wExtent: 1.3,
      sliceW: 0.08,
      rotation: { xy: 14, xz: 8, xw: 28, yz: 22, yw: 18, zw: 12 },
    },
    source: normalizeSource([
      "const shell = Math.abs(length4([x, y, z, w]) - 0.92) - 0.12;",
      "const ripple = (sin(3.4 * x + 1.8 * w) * cos(3.0 * y) + sin(2.6 * z - 1.4 * w)) * 0.11;",
      "return shell + ripple;",
    ]),
  },
};

export function getExampleDefinition(exampleId) {
  const resolvedId = FUNCTION_EXAMPLES[exampleId] ? exampleId : DEFAULT_EXAMPLE_ID;
  const example = FUNCTION_EXAMPLES[resolvedId];

  return {
    id: resolvedId,
    label: example.label,
    description: example.description,
    source: example.source,
    scene: {
      ...example.scene,
      rotation: { ...example.scene.rotation },
    },
  };
}

const RUNTIME_HELPERS = Object.freeze({
  PI: Math.PI,
  TAU: Math.PI * 2,
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan2: Math.atan2,
  ceil: Math.ceil,
  clamp,
  cos: Math.cos,
  dot4,
  exp: Math.exp,
  floor: Math.floor,
  length2,
  length3,
  length4,
  log: Math.log,
  max: Math.max,
  min: Math.min,
  mix,
  opIntersect,
  opSubtract,
  opUnion,
  pow: Math.pow,
  repeat,
  round: Math.round,
  saturate,
  sdBox4,
  sdCross4,
  sdDuocylinder,
  sdSphere4,
  sin: Math.sin,
  smax: smoothMax,
  smin: smoothMin,
  sqrt: Math.sqrt,
  tan: Math.tan,
});

const HELPER_NAMES = Object.keys(RUNTIME_HELPERS).sort();

export const HELPER_SUMMARY = [
  "Inputs: x, y, z, w",
  "Primitives: sdSphere4, sdBox4, sdDuocylinder, sdCross4",
  "Ops: smin, smax, opUnion, opIntersect, opSubtract",
  "Math: sin, cos, tan, mix, clamp, repeat, length2, length3, length4",
].join(" | ");

export function compileSdfSource(source) {
  const normalizedSource = `${source ?? ""}`.replace(/\r\n/g, "\n").trim();

  if (!normalizedSource) {
    throw new Error("Function source is empty.");
  }

  let evaluator;

  try {
    evaluator = new Function(
      "helpers",
      `"use strict";
const { ${HELPER_NAMES.join(", ")} } = helpers;
return function sdf(point) {
  const [x, y, z, w] = point;
${normalizedSource}
};
`,
    )(RUNTIME_HELPERS);
  } catch (error) {
    throw new Error(`Function compile error: ${error.message}`);
  }

  let probeValue;

  try {
    probeValue = evaluator([0, 0, 0, 0]);
  } catch (error) {
    throw new Error(`Function runtime error at the origin probe: ${error.message}`);
  }

  if (!Number.isFinite(probeValue)) {
    throw new Error("Function must return a finite number. The origin probe did not.");
  }

  return evaluator;
}
