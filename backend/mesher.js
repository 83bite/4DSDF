import { cross3, dot3, sub3 } from "./math4d.js";

const CUBE_CORNERS = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];

const TETRAHEDRA = [
  [0, 5, 1, 6],
  [0, 5, 6, 4],
  [0, 2, 6, 1],
  [0, 2, 3, 6],
  [0, 7, 4, 6],
  [0, 3, 7, 6],
];

function indexOf(x, y, z, resolution) {
  return x + y * resolution + z * resolution * resolution;
}

function worldPoint(origin, step, x, y, z) {
  return [origin[0] + x * step, origin[1] + y * step, origin[2] + z * step];
}

function interpolatePoint(a, b, va, vb, isoLevel) {
  const delta = vb - va;
  const t = Math.abs(delta) < 1e-6 ? 0.5 : (isoLevel - va) / delta;
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function centroid(indices, points) {
  const sum = [0, 0, 0];

  for (const index of indices) {
    sum[0] += points[index][0];
    sum[1] += points[index][1];
    sum[2] += points[index][2];
  }

  return [sum[0] / indices.length, sum[1] / indices.length, sum[2] / indices.length];
}

function pushTriangle(storage, a, b, c, insideCenter, outsideCenter) {
  const normal = cross3(sub3(b, a), sub3(c, a));
  const outward = sub3(outsideCenter, insideCenter);

  if (dot3(normal, outward) < 0) {
    storage.push(...a, ...c, ...b);
    return;
  }

  storage.push(...a, ...b, ...c);
}

function polygonizeTetra(points, values, isoLevel, storage) {
  const inside = [];
  const outside = [];

  for (let i = 0; i < 4; i += 1) {
    if (values[i] <= isoLevel) {
      inside.push(i);
    } else {
      outside.push(i);
    }
  }

  if (inside.length === 0 || inside.length === 4) {
    return;
  }

  const insideCenter = centroid(inside, points);
  const outsideCenter = centroid(outside, points);

  if (inside.length === 1 || inside.length === 3) {
    const invert = inside.length === 3;
    const sourceIndex = invert ? outside[0] : inside[0];
    const targetIndices = invert ? inside : outside;
    const triangle = targetIndices.map((targetIndex) =>
      interpolatePoint(
        points[sourceIndex],
        points[targetIndex],
        values[sourceIndex],
        values[targetIndex],
        isoLevel,
      ),
    );

    pushTriangle(storage, triangle[0], triangle[1], triangle[2], insideCenter, outsideCenter);
    return;
  }

  const [i0, i1] = inside;
  const [o0, o1] = outside;
  const a = interpolatePoint(points[i0], points[o0], values[i0], values[o0], isoLevel);
  const b = interpolatePoint(points[i0], points[o1], values[i0], values[o1], isoLevel);
  const c = interpolatePoint(points[i1], points[o0], values[i1], values[o0], isoLevel);
  const d = interpolatePoint(points[i1], points[o1], values[i1], values[o1], isoLevel);

  pushTriangle(storage, a, b, c, insideCenter, outsideCenter);
  pushTriangle(storage, b, d, c, insideCenter, outsideCenter);
}

export function meshField(field, isoLevel, onProgress) {
  const { origin, resolution, step, values } = field;
  const positions = [];

  for (let z = 0; z < resolution - 1; z += 1) {
    for (let y = 0; y < resolution - 1; y += 1) {
      for (let x = 0; x < resolution - 1; x += 1) {
        const cubePoints = CUBE_CORNERS.map(([dx, dy, dz]) =>
          worldPoint(origin, step, x + dx, y + dy, z + dz),
        );
        const cubeValues = CUBE_CORNERS.map(([dx, dy, dz]) =>
          values[indexOf(x + dx, y + dy, z + dz, resolution)],
        );

        for (const tetra of TETRAHEDRA) {
          const tetraPoints = tetra.map((cornerIndex) => cubePoints[cornerIndex]);
          const tetraValues = tetra.map((cornerIndex) => cubeValues[cornerIndex]);
          polygonizeTetra(tetraPoints, tetraValues, isoLevel, positions);
        }
      }
    }

    if (onProgress) {
      onProgress({
        phase: "meshing",
        progress: (z + 1) / (resolution - 1),
      });
    }
  }

  return {
    positions: new Float32Array(positions),
    triangleCount: positions.length / 9,
  };
}
