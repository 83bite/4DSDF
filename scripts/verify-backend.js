import { sampleField } from "../backend/field.js";
import { meshField } from "../backend/mesher.js";

const scenarios = [
  {
    shape: "tesseract",
    mode: "project",
    resolution: 18,
    wSamples: 18,
    bound: 1.55,
    wExtent: 1.55,
    sliceW: 0,
    rotation: { xy: 16, xz: 12, xw: 38, yz: 24, yw: 29, zw: 18 },
  },
  {
    shape: "smoothBlend",
    mode: "slice",
    resolution: 18,
    wSamples: 16,
    bound: 1.4,
    wExtent: 1.4,
    sliceW: 0.18,
    rotation: { xy: 8, xz: 12, xw: 42, yz: 24, yw: 18, zw: 10 },
  },
];

for (const scenario of scenarios) {
  const started = performance.now();
  const field = sampleField(scenario);
  const mesh = meshField(field, 0);
  const elapsed = performance.now() - started;

  if (mesh.triangleCount <= 0) {
    throw new Error(`No triangles generated for ${scenario.shape} (${scenario.mode})`);
  }

  console.log(
    JSON.stringify(
      {
        shape: scenario.shape,
        mode: scenario.mode,
        triangles: mesh.triangleCount,
        vertices: mesh.positions.length / 3,
        elapsedMs: Math.round(elapsed),
      },
      null,
      2,
    ),
  );
}
