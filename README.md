# 4D SDF Playground

4D SDF Playground is a small browser-based experiment for exploring signed-distance fields in four dimensions.

It lets you:

- switch between a few 4D primitives and blends
- inspect either a 3D projection along the `w` axis or a fixed `w` slice
- generate triangle meshes in the browser with a worker-backed meshing pipeline

The app is designed as a lightweight static site, so it can be hosted directly on GitHub Pages without a build step.

## Tech Notes

- Rendering and UI live in `frontend/`
- SDF sampling and meshing live in `backend/`
- The meshing pipeline runs through a Web Worker to keep the UI responsive

## Development

Contributor and debugging notes live in [DEVELOPMENT.md](./DEVELOPMENT.md).
