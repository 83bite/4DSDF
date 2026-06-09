import { sampleField, normalizeSceneConfig } from "./field.js";
import { meshField } from "./mesher.js";

function sendProgress(requestId, payload) {
  self.postMessage({
    type: "progress",
    requestId,
    payload,
  });
}

self.onmessage = (event) => {
  const { type, requestId, payload } = event.data ?? {};

  if (type !== "generate") {
    return;
  }

  try {
    const scene = normalizeSceneConfig(payload ?? {});
    const startedAt = performance.now();
    const field = sampleField(scene, (progress) => sendProgress(requestId, progress));
    const mesh = meshField(field, 0, (progress) => sendProgress(requestId, progress));
    const elapsedMs = performance.now() - startedAt;

    self.postMessage(
      {
        type: "mesh",
        requestId,
        payload: {
          scene,
          positions: mesh.positions,
          stats: {
            triangles: mesh.triangleCount,
            vertices: mesh.positions.length / 3,
            elapsedMs,
          },
        },
      },
      [mesh.positions.buffer],
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId,
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
};
