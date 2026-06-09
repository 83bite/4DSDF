import { lerp, rotate4 } from "./math4d.js";
import { evaluateShape, SHAPE_PRESETS } from "./sdf4d.js";

function getPointIndex(x, y, z, resolution) {
  return x + y * resolution + z * resolution * resolution;
}

export function getShapePreset(shape) {
  return SHAPE_PRESETS[shape] ?? SHAPE_PRESETS.tesseract;
}

export function normalizeSceneConfig(scene) {
  const preset = getShapePreset(scene.shape);

  return {
    shape: scene.shape ?? "tesseract",
    mode: scene.mode ?? "project",
    resolution: Math.max(14, Math.min(40, scene.resolution ?? 26)),
    wSamples: Math.max(8, Math.min(64, scene.wSamples ?? 28)),
    sliceW: scene.sliceW ?? 0,
    bound: scene.bound ?? preset.bound,
    wExtent: scene.wExtent ?? preset.wExtent,
    rotation: {
      ...preset.rotation,
      ...(scene.rotation ?? {}),
    },
  };
}

function evaluateProjectedField(point3, scene) {
  if (scene.mode === "slice") {
    return evaluateShape(
      scene.shape,
      rotate4([point3[0], point3[1], point3[2], scene.sliceW], scene.rotation),
    );
  }

  let minValue = Number.POSITIVE_INFINITY;
  const sampleCount = scene.wSamples;

  for (let i = 0; i < sampleCount; i += 1) {
    const t = sampleCount === 1 ? 0.5 : i / (sampleCount - 1);
    const w = lerp(-scene.wExtent, scene.wExtent, t);
    const value = evaluateShape(
      scene.shape,
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
