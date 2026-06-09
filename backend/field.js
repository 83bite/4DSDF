import { lerp, rotate4 } from "./math4d.js";
import { compileSdfSource, getExampleDefinition } from "./sdf4d.js";

function getPointIndex(x, y, z, resolution) {
  return x + y * resolution + z * resolution * resolution;
}

function formatPoint(point) {
  return point.map((value) => value.toFixed(3)).join(", ");
}

export function getShapePreset(shape) {
  return getExampleDefinition(shape).scene;
}

export function normalizeSceneConfig(scene) {
  const example = getExampleDefinition(scene.shape);

  return {
    shape: example.id,
    mode: scene.mode ?? example.scene.mode ?? "project",
    resolution: Math.max(14, Math.min(40, scene.resolution ?? example.scene.resolution ?? 26)),
    wSamples: Math.max(8, Math.min(64, scene.wSamples ?? example.scene.wSamples ?? 28)),
    sliceW: scene.sliceW ?? example.scene.sliceW ?? 0,
    bound: scene.bound ?? example.scene.bound,
    wExtent: scene.wExtent ?? example.scene.wExtent,
    functionSource: scene.functionSource ?? example.source,
    rotation: {
      ...example.scene.rotation,
      ...(scene.rotation ?? {}),
    },
  };
}

function evaluatePoint(evaluator, point4) {
  const value = evaluator(point4);

  if (!Number.isFinite(value)) {
    throw new Error(`Function returned a non-finite value near (${formatPoint(point4)}).`);
  }

  return value;
}

function evaluateProjectedField(point3, scene, evaluator) {
  if (scene.mode === "slice") {
    return evaluatePoint(
      evaluator,
      rotate4([point3[0], point3[1], point3[2], scene.sliceW], scene.rotation),
    );
  }

  let minValue = Number.POSITIVE_INFINITY;
  const sampleCount = scene.wSamples;

  for (let i = 0; i < sampleCount; i += 1) {
    const t = sampleCount === 1 ? 0.5 : i / (sampleCount - 1);
    const w = lerp(-scene.wExtent, scene.wExtent, t);
    const value = evaluatePoint(
      evaluator,
      rotate4([point3[0], point3[1], point3[2], w], scene.rotation),
    );

    if (value < minValue) {
      minValue = value;
    }
  }

  return minValue;
}

export function sampleField(sceneInput, onProgress) {
  const scene = normalizeSceneConfig(sceneInput);
  const evaluator = compileSdfSource(scene.functionSource);
  const resolution = scene.resolution;
  const origin = [-scene.bound, -scene.bound, -scene.bound];
  const step = (scene.bound * 2) / (resolution - 1);
  const values = new Float32Array(resolution * resolution * resolution);

  for (let z = 0; z < resolution; z += 1) {
    const pz = origin[2] + z * step;

    for (let y = 0; y < resolution; y += 1) {
      const py = origin[1] + y * step;

      for (let x = 0; x < resolution; x += 1) {
        const px = origin[0] + x * step;
        values[getPointIndex(x, y, z, resolution)] = evaluateProjectedField(
          [px, py, pz],
          scene,
          evaluator,
        );
      }
    }

    if (onProgress) {
      onProgress({
        phase: "sampling",
        progress: (z + 1) / resolution,
      });
    }
  }

  return {
    origin,
    resolution,
    step,
    values,
  };
}
