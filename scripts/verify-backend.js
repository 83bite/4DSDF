import { sampleField } from "../backend/field.js";
import { FUNCTION_EXAMPLES } from "../backend/sdf4d.js";
import { meshField } from "../backend/mesher.js";

const scenarios = Object.entries(FUNCTION_EXAMPLES).map(([shape, example]) => ({
  name: shape,
  shape,
  functionSource: example.source,
  ...example.scene,
  resolution: Math.min(example.scene.resolution, 18),
  wSamples: Math.min(example.scene.wSamples, 18),
}));

scenarios.push({
  name: "custom-shell-cut",
  shape: "hypersphere",
  mode: "slice",
  resolution: 18,
  wSamples: 16,
  bound: 1.25,
  wExtent: 1.25,
  sliceW: 0.12,
  rotation: { xy: 10, xz: 6, xw: 18, yz: 12, yw: 30, zw: 8 },
  functionSource: [
    "const shell = Math.abs(length4([x, y, z, w]) - 0.88) - 0.08;",
    "const cut = sdBox4([x, y, z, w], [0.30, 1.00, 1.00, 1.00]);",
    "return opSubtract(shell, cut);",
  ].join("\n"),
});

for (const scenario of scenarios) {
  const started = performance.now();
  const field = sampleField(scenario);
  const mesh = meshField(field, 0);
  const elapsed = performance.now() - started;

  if (mesh.triangleCount <= 0) {
    throw new Error(`No triangles generated for ${scenario.name}`);
  }

  console.log(
    JSON.stringify(
      {
        name: scenario.name,
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
