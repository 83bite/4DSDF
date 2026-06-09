# 4D SDF Playground

This project implements a small 4D signed-distance-field playground that runs as a static site.

- `backend/` is the compute layer.
  - `sdf4d.js` defines 4D SDF primitives.
  - `field.js` samples the 4D field and either projects it into 3D along the `w` axis or slices it at a fixed `w`.
  - `mesher.js` runs marching tetrahedra to build a triangle mesh.
  - `worker.js` exposes the backend through a Web Worker message API.
- `frontend/` is the browser UI and renderer.
  - `app.js` wires controls to the worker.
  - `renderer.js` draws the returned mesh into a canvas.

## Local run

Because the app uses ES modules and a module worker, serve it over HTTP instead of opening `index.html` directly.

```powershell
npm run preview
```

Then open:

`http://127.0.0.1:8000`

## Backend sanity check

```powershell
npm run verify:backend
```

This runs a couple of small sampling scenarios and confirms that triangle meshes are generated successfully.

## GitHub Pages

This repo includes a workflow at `.github/workflows/deploy-pages.yml`.

1. Push the repository to GitHub.
2. In GitHub, enable **Settings > Pages > Build and deployment > GitHub Actions**.
3. Push to `main` or run the workflow manually.

The workflow publishes the static site without any build step.
