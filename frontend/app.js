import { CanvasMeshRenderer } from "./renderer.js";

const SHAPES = [
  { value: "tesseract", label: "Tesseract" },
  { value: "duocylinder", label: "Duocylinder" },
  { value: "smoothBlend", label: "Smooth Blend" },
  { value: "hypersphere", label: "Hypersphere" },
];

const PRESETS = {
  tesseract: {
    shape: "tesseract",
    mode: "project",
    resolution: 28,
    wSamples: 30,
    bound: 1.55,
    wExtent: 1.55,
    sliceW: 0,
    rotation: { xy: 16, xz: 12, xw: 38, yz: 24, yw: 29, zw: 18 },
  },
  duocylinder: {
    shape: "duocylinder",
    mode: "project",
    resolution: 28,
    wSamples: 32,
    bound: 1.25,
    wExtent: 1.25,
    sliceW: 0,
    rotation: { xy: 0, xz: 0, xw: 62, yz: 18, yw: 12, zw: 48 },
  },
  smoothBlend: {
    shape: "smoothBlend",
    mode: "slice",
    resolution: 28,
    wSamples: 28,
    bound: 1.4,
    wExtent: 1.4,
    sliceW: 0.18,
    rotation: { xy: 8, xz: 12, xw: 42, yz: 24, yw: 18, zw: 10 },
  },
  hypersphere: {
    shape: "hypersphere",
    mode: "slice",
    resolution: 26,
    wSamples: 24,
    bound: 1.25,
    wExtent: 1.25,
    sliceW: 0.35,
    rotation: { xy: 0, xz: 0, xw: 24, yz: 0, yw: 36, zw: 14 },
  },
};

const controls = [
  "resolution",
  "wSamples",
  "bound",
  "wExtent",
  "sliceW",
  "xy",
  "xz",
  "xw",
  "yz",
  "yw",
  "zw",
];

const state = {
  requestId: 0,
  latestAccepted: 0,
  rebuildTimer: null,
};

const worker = new Worker(new URL("../backend/worker.js", import.meta.url), {
  type: "module",
});

const canvas = document.querySelector("#viewport");
const form = document.querySelector("#controls");
const shapeSelect = document.querySelector("#shape");
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];
const status = document.querySelector("#status");
const progressBar = document.querySelector("#progress-fill");
const stats = document.querySelector("#stats");
const rebuildButton = document.querySelector("#rebuild");
const presetButton = document.querySelector("#preset");
const resetViewButton = document.querySelector("#reset-view");
const spinToggle = document.querySelector("#spin");
const renderer = new CanvasMeshRenderer(canvas);

function updateValueLabels() {
  for (const controlName of controls) {
    const input = form.elements.namedItem(controlName);
    const output = document.querySelector(`[data-value="${controlName}"]`);

    if (!input || !output) {
      continue;
    }

    output.textContent = Number(input.value).toFixed(input.step === "0.01" ? 2 : 0);
  }
}

function applyScene(scene) {
  shapeSelect.value = scene.shape;

  for (const input of modeInputs) {
    input.checked = input.value === scene.mode;
  }

  form.elements.namedItem("resolution").value = scene.resolution;
  form.elements.namedItem("wSamples").value = scene.wSamples;
  form.elements.namedItem("bound").value = scene.bound;
  form.elements.namedItem("wExtent").value = scene.wExtent;
  form.elements.namedItem("sliceW").value = scene.sliceW;

  for (const plane of ["xy", "xz", "xw", "yz", "yw", "zw"]) {
    form.elements.namedItem(plane).value = scene.rotation[plane];
  }

  updateValueLabels();
}

function collectScene() {
  const mode = modeInputs.find((input) => input.checked)?.value ?? "project";

  return {
    shape: shapeSelect.value,
    mode,
    resolution: Number(form.elements.namedItem("resolution").value),
    wSamples: Number(form.elements.namedItem("wSamples").value),
    bound: Number(form.elements.namedItem("bound").value),
    wExtent: Number(form.elements.namedItem("wExtent").value),
    sliceW: Number(form.elements.namedItem("sliceW").value),
    rotation: Object.fromEntries(
      ["xy", "xz", "xw", "yz", "yw", "zw"].map((plane) => [
        plane,
        Number(form.elements.namedItem(plane).value),
      ]),
    ),
  };
}

function setBusy(isBusy, label) {
  rebuildButton.disabled = isBusy;
  status.textContent = label;
}

function scheduleRebuild(delay = 180) {
  clearTimeout(state.rebuildTimer);
  state.rebuildTimer = setTimeout(() => requestMesh(), delay);
}

function requestMesh() {
  clearTimeout(state.rebuildTimer);
  const scene = collectScene();
  state.requestId += 1;
  setBusy(true, "Sampling 4D field...");
  progressBar.style.width = "2%";

  worker.postMessage({
    type: "generate",
    requestId: state.requestId,
    payload: scene,
  });
}

worker.onmessage = (event) => {
  const { type, requestId, payload } = event.data ?? {};

  if (requestId < state.latestAccepted) {
    return;
  }

  if (type === "progress") {
    if (requestId !== state.requestId) {
      return;
    }

    const phaseLabel = payload.phase === "meshing" ? "Meshing 3D projection..." : "Sampling 4D field...";
    setBusy(true, phaseLabel);
    progressBar.style.width = `${Math.max(4, Math.floor(payload.progress * 100))}%`;
    return;
  }

  if (type === "mesh") {
    if (requestId !== state.requestId) {
      return;
    }

    state.latestAccepted = requestId;
    renderer.setMesh({
      positions: payload.positions,
    });
    progressBar.style.width = "100%";
    setBusy(false, "Ready");
    stats.textContent = [
      `${payload.scene.mode === "project" ? "Projection" : "Slice"} mode`,
      `${payload.stats.triangles.toLocaleString()} triangles`,
      `${Math.round(payload.stats.elapsedMs)} ms`,
    ].join("  |  ");
  }
};

shapeSelect.innerHTML = SHAPES.map(
  (shape) => `<option value="${shape.value}">${shape.label}</option>`,
).join("");

applyScene(PRESETS.tesseract);
requestMesh();

shapeSelect.addEventListener("change", () => {
  applyScene(PRESETS[shapeSelect.value]);
  requestMesh();
});

for (const name of controls) {
  form.elements.namedItem(name).addEventListener("input", () => {
    updateValueLabels();
    scheduleRebuild();
  });
}

for (const input of modeInputs) {
  input.addEventListener("change", () => requestMesh());
}

spinToggle.addEventListener("change", () => {
  renderer.setSpin(spinToggle.checked);
});

rebuildButton.addEventListener("click", () => requestMesh());

presetButton.addEventListener("click", () => {
  applyScene(PRESETS[shapeSelect.value]);
  requestMesh();
});

resetViewButton.addEventListener("click", () => {
  renderer.resetView();
});
