# 4D SDF Playground

This project is a static 4D signed-distance-field playground that runs entirely in the browser.

- `backend/` is the compute layer.
  - `sdf4d.js` defines helper primitives, exposes example functions, and compiles user-written function bodies.
  - `field.js` samples the 4D field and either projects it into 3D along the `w` axis or slices it at a fixed `w`.
  - `mesher.js` runs marching tetrahedra to build a triangle mesh.
  - `worker.js` exposes the backend through a Web Worker message API.
- `frontend/` is the browser UI and renderer.
  - `app.js` wires the editor, example loader, sliders, persistence, and worker messaging.
  - `renderer.js` draws the returned mesh into a canvas.

## Local run

Because the app uses ES modules and a module worker, serve it over HTTP instead of opening `index.html` directly.

```powershell
npm run preview
```

Then open:

`http://127.0.0.1:8000`

## Editing functions in the GUI

The left panel includes a code editor. The editor expects a JavaScript function body that ends with `return ...`.

Available inputs:

- `x`, `y`, `z`, `w`

Available helpers include:

- `sdSphere4`, `sdBox4`, `sdDuocylinder`, `sdCross4`
- `smin`, `smax`, `opUnion`, `opIntersect`, `opSubtract`
- `length2`, `length3`, `length4`, `repeat`, `mix`, `clamp`
- `sin`, `cos`, `tan`, `PI`, `TAU`

Use the example picker to load a starting point, edit it, then click `Apply Code`.

## Backend sanity check

```powershell
npm run verify:backend
```

This compiles every shipped example plus one extra custom function and confirms that triangle meshes are generated successfully.

## GitHub Pages

This repo includes a workflow at `.github/workflows/deploy-pages.yml`.

1. Push the repository to GitHub.
2. In GitHub, enable **Settings > Pages > Build and deployment > GitHub Actions**.
3. Push to `main` or run the workflow manually.

The workflow publishes the static site without any build step.
