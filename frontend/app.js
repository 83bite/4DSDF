import { DEFAULT_EXAMPLE_ID, FUNCTION_EXAMPLES, getExampleDefinition, HELPER_SUMMARY } from "../backend/sdf4d.js";
import { CanvasMeshRenderer } from "./renderer.js";

const STORAGE_KEY = "sdf4d-playground-state-v3";
const LEGACY_STORAGE_KEYS = ["sdf4d-playground-state-v2"];
const ROTATION_PLANES = ["xy", "xz", "xw", "yz", "yw", "zw"];
const controls = [
  "resolution",
  "wSamples",
  "bound",
  "wExtent",
  "sliceW",
  ...ROTATION_PLANES,
];

const state = {
  requestId: 0,
  latestAccepted: 0,
  rebuildTimer: null,
  lastAppliedSource: "",
};

const worker = new Worker(new URL("../backend/worker.js", import.meta.url), {
  type: "module",
});

const canvas = document.querySelector("#viewport");
const form = document.querySelector("#controls");
const exampleSelect = document.querySelector("#example");
const exampleDescription = document.querySelector("#example-description");
const sourceEditor = document.querySelector("#function-source");
const helperSummary = document.querySelector("#helper-summary");
const editorStatus = document.querySelector("#editor-status");
const errorBox = document.querySelector("#error-box");
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];
const status = document.querySelector("#status");
const progressBar = document.querySelector("#progress-fill");
const stats = document.querySelector("#stats");
const rebuildButton = document.querySelector("#rebuild");
const loadExampleButton = document.querySelector("#load-example");
const applyCodeButton = document.querySelector("#apply-code");
const revertCodeButton = document.querySelector("#revert-code");
const resetSceneButton = document.querySelector("#reset-scene");
const resetViewButton = document.querySelector("#reset-view");
const spinToggle = document.querySelector("#spin");
const renderer = new CanvasMeshRenderer(canvas);

function cloneScene(scene) {
  return {
    ...scene,
    rotation: { ...scene.rotation },
  };
}

function sanitizeScene(savedScene, fallbackScene) {
  const mode = savedScene?.mode === "slice" ? "slice" : savedScene?.mode === "project" ? "project" : fallbackScene.mode;
  const numeric = (name) => {
    const value = Number(savedScene?.[name]);
    return Number.isFinite(value) ? value : fallbackScene[name];
  };

  return {
    mode,
    resolution: numeric("resolution"),
    wSamples: numeric("wSamples"),
    bound: numeric("bound"),
    wExtent: numeric("wExtent"),
    sliceW: numeric("sliceW"),
    rotation: Object.fromEntries(
      ROTATION_PLANES.map((plane) => {
        const value = Number(savedScene?.rotation?.[plane]);
        return [plane, Number.isFinite(value) ? value : fallbackScene.rotation[plane]];
      }),
    ),
  };
}

function getDefaultState(exampleId = DEFAULT_EXAMPLE_ID) {
  const example = getExampleDefinition(exampleId);

  return {
    exampleId: example.id,
    scene: cloneScene(example.scene),
    sourceDraft: example.source,
    appliedSource: example.source,
    spin: false,
  };
}

function restoreState() {
  const fallback = getDefaultState();

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let isLegacyState = false;

    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(legacyKey);

        if (raw) {
          isLegacyState = true;
          break;
        }
      }
    }

    if (!raw) {
      return fallback;
    }

    const saved = JSON.parse(raw);
    const base = getDefaultState(saved?.exampleId);

    return {
      exampleId: base.exampleId,
      scene: sanitizeScene(saved?.scene, base.scene),
      sourceDraft: typeof saved?.sourceDraft === "string" ? saved.sourceDraft : base.sourceDraft,
      appliedSource:
        typeof saved?.appliedSource === "string" && saved.appliedSource.trim()
          ? saved.appliedSource
          : base.appliedSource,
      spin:
        isLegacyState
          ? false
          : typeof saved?.spin === "boolean"
            ? saved.spin
            : base.spin,
    };
  } catch (error) {
    console.warn("Failed to restore app state", error);
    return fallback;
  }
}

function persistState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        exampleId: exampleSelect.value,
        scene: collectSceneDraft(),
        sourceDraft: sourceEditor.value,
        appliedSource: state.lastAppliedSource,
        spin: spinToggle.checked,
      }),
    );
  } catch (error) {
    console.warn("Failed to persist app state", error);
  }
}

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

function updateExampleDescription() {
  const example = getExampleDefinition(exampleSelect.value);
  exampleDescription.textContent = example.description;
}

function updateEditorStatus() {
  const dirty = sourceEditor.value !== state.lastAppliedSource;
  editorStatus.textContent = dirty ? "Draft not applied" : "Applied";
  editorStatus.dataset.dirty = dirty ? "true" : "false";
}

function showError(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function applySceneControls(scene) {
  for (const input of modeInputs) {
    input.checked = input.value === scene.mode;
  }

  form.elements.namedItem("resolution").value = scene.resolution;
  form.elements.namedItem("wSamples").value = scene.wSamples;
  form.elements.namedItem("bound").value = scene.bound;
  form.elements.namedItem("wExtent").value = scene.wExtent;
  form.elements.namedItem("sliceW").value = scene.sliceW;

  for (const plane of ROTATION_PLANES) {
    form.elements.namedItem(plane).value = scene.rotation[plane];
  }

  updateValueLabels();
}

function collectSceneDraft() {
  const mode = modeInputs.find((input) => input.checked)?.value ?? "project";

  return {
    mode,
    resolution: Number(form.elements.namedItem("resolution").value),
    wSamples: Number(form.elements.namedItem("wSamples").value),
    bound: Number(form.elements.namedItem("bound").value),
    wExtent: Number(form.elements.namedItem("wExtent").value),
    sliceW: Number(form.elements.namedItem("sliceW").value),
    rotation: Object.fromEntries(
      ROTATION_PLANES.map((plane) => [
        plane,
        Number(form.elements.namedItem(plane).value),
      ]),
    ),
  };
}

function collectScene() {
  return {
    shape: exampleSelect.value,
    functionSource: state.lastAppliedSource,
    ...collectSceneDraft(),
  };
}

function setBusy(isBusy, label) {
  rebuildButton.disabled = isBusy;
  loadExampleButton.disabled = isBusy;
  applyCodeButton.disabled = isBusy;
  status.textContent = label;
}

function scheduleRebuild(delay = 180) {
  clearTimeout(state.rebuildTimer);
  state.rebuildTimer = setTimeout(() => requestMesh(), delay);
}

function requestMesh() {
  clearTimeout(state.rebuildTimer);
  clearError();
  state.requestId += 1;
  setBusy(true, "Sampling 4D field...");
  progressBar.style.width = "2%";

  worker.postMessage({
    type: "generate",
    requestId: state.requestId,
    payload: collectScene(),
  });
}

function loadExample(exampleId) {
  const example = getExampleDefinition(exampleId);
  exampleSelect.value = example.id;
  sourceEditor.value = example.source;
  state.lastAppliedSource = example.source;
  applySceneControls(example.scene);
  updateExampleDescription();
  updateEditorStatus();
  persistState();
  requestMesh();
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

  if (type === "error") {
    if (requestId !== state.requestId) {
      return;
    }

    setBusy(false, "Function error");
    progressBar.style.width = "0%";
    showError(payload.message);
    stats.textContent = "Mesh unchanged | Fix the function and apply again";
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
    clearError();
    progressBar.style.width = "100%";
    setBusy(false, "Ready");
    stats.textContent = [
      `${payload.scene.mode === "project" ? "Projection" : "Slice"} mode`,
      `${payload.stats.triangles.toLocaleString()} triangles`,
      `${Math.round(payload.stats.elapsedMs)} ms`,
    ].join("  |  ");
  }
};

exampleSelect.innerHTML = Object.entries(FUNCTION_EXAMPLES)
  .map(([value, example]) => `<option value="${value}">${example.label}</option>`)
  .join("");

helperSummary.textContent = HELPER_SUMMARY;

const restored = restoreState();
exampleSelect.value = restored.exampleId;
applySceneControls(restored.scene);
sourceEditor.value = restored.sourceDraft;
state.lastAppliedSource = restored.appliedSource;
spinToggle.checked = restored.spin;
renderer.setSpin(spinToggle.checked);
updateExampleDescription();
updateEditorStatus();
requestMesh();

exampleSelect.addEventListener("change", () => {
  updateExampleDescription();
  persistState();
});

loadExampleButton.addEventListener("click", () => {
  loadExample(exampleSelect.value);
});

applyCodeButton.addEventListener("click", () => {
  state.lastAppliedSource = sourceEditor.value.replace(/\r\n/g, "\n");
  updateEditorStatus();
  persistState();
  requestMesh();
});

revertCodeButton.addEventListener("click", () => {
  sourceEditor.value = state.lastAppliedSource;
  updateEditorStatus();
  persistState();
});

resetSceneButton.addEventListener("click", () => {
  const example = getExampleDefinition(exampleSelect.value);
  applySceneControls(example.scene);
  persistState();
  requestMesh();
});

for (const name of controls) {
  form.elements.namedItem(name).addEventListener("input", () => {
    updateValueLabels();
    persistState();
    scheduleRebuild();
  });
}

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    persistState();
    requestMesh();
  });
}

sourceEditor.addEventListener("input", () => {
  updateEditorStatus();
  persistState();
});

spinToggle.addEventListener("change", () => {
  renderer.setSpin(spinToggle.checked);
  persistState();
});

rebuildButton.addEventListener("click", () => requestMesh());

resetViewButton.addEventListener("click", () => {
  renderer.resetView();
});
