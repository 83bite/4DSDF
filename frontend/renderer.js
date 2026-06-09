import { clamp, cross3, dot3, normalize3, sub3 } from "../backend/math4d.js";

const AXES = [
  { color: "#f97066", from: [0, 0, 0], to: [1.15, 0, 0] },
  { color: "#68d391", from: [0, 0, 0], to: [0, 1.15, 0] },
  { color: "#63b3ed", from: [0, 0, 0], to: [0, 0, 1.15] },
];

function transformVertex(vertex, yaw, pitch) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = cosY * vertex[0] + sinY * vertex[2];
  const z1 = -sinY * vertex[0] + cosY * vertex[2];

  const cosX = Math.cos(pitch);
  const sinX = Math.sin(pitch);
  const y2 = cosX * vertex[1] - sinX * z1;
  const z2 = sinX * vertex[1] + cosX * z1;

  return [x1, y2, z2];
}

export class CanvasMeshRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mesh = null;
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.yaw = 0.9;
    this.pitch = -0.55;
    this.distance = 4.2;
    this.spin = false;
    this.lastTime = 0;
    this.dragging = false;
    this.render = this.render.bind(this);

    this.handleResize();
    this.attachEvents();
    requestAnimationFrame(this.render);
  }

  attachEvents() {
    window.addEventListener("resize", () => this.handleResize());

    this.canvas.addEventListener("pointerdown", (event) => {
      this.dragging = true;
      this.spin = false;
      this.lastPointer = [event.clientX, event.clientY];
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.dragging) {
        return;
      }

      const dx = event.clientX - this.lastPointer[0];
      const dy = event.clientY - this.lastPointer[1];
      this.lastPointer = [event.clientX, event.clientY];
      this.yaw += dx * 0.008;
      this.pitch = clamp(this.pitch + dy * 0.008, -1.45, 1.45);
    });

    const stopDragging = () => {
      this.dragging = false;
    };

    this.canvas.addEventListener("pointerup", stopDragging);
    this.canvas.addEventListener("pointercancel", stopDragging);
    this.canvas.addEventListener("pointerleave", stopDragging);

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.distance = clamp(this.distance + event.deltaY * 0.0025, 2.2, 8.5);
    });
  }

  handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.devicePixelRatio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.devicePixelRatio));
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
  }

  setMesh(mesh) {
    this.mesh = mesh;
  }

  setSpin(enabled) {
    this.spin = enabled;
  }

  resetView() {
    this.yaw = 0.9;
    this.pitch = -0.55;
    this.distance = 4.2;
  }

  project(viewVertex, width, height) {
    const z = viewVertex[2] + this.distance;

    if (z <= 0.15) {
      return null;
    }

    const focal = Math.min(width, height) * 0.78;
    const scale = focal / z;

    return {
      x: viewVertex[0] * scale + width * 0.5,
      y: -viewVertex[1] * scale + height * 0.5,
      z,
    };
  }

  drawBackground(width, height) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.10)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawAxes(width, height) {
    const ctx = this.ctx;

    for (const axis of AXES) {
      const start = this.project(transformVertex(axis.from, this.yaw, this.pitch), width, height);
      const end = this.project(transformVertex(axis.to, this.yaw, this.pitch), width, height);

      if (!start || !end) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = axis.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  drawMesh(width, height) {
    if (!this.mesh?.positions?.length) {
      return;
    }

    const positions = this.mesh.positions;
    const triangles = [];
    const lightDirection = normalize3([0.35, -0.4, -1]);

    for (let i = 0; i < positions.length; i += 9) {
      const worldA = [positions[i], positions[i + 1], positions[i + 2]];
      const worldB = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const worldC = [positions[i + 6], positions[i + 7], positions[i + 8]];

      const viewA = transformVertex(worldA, this.yaw, this.pitch);
      const viewB = transformVertex(worldB, this.yaw, this.pitch);
      const viewC = transformVertex(worldC, this.yaw, this.pitch);
      const normal = cross3(sub3(viewB, viewA), sub3(viewC, viewA));

      if (normal[2] >= 0) {
        continue;
      }

      const projectedA = this.project(viewA, width, height);
      const projectedB = this.project(viewB, width, height);
      const projectedC = this.project(viewC, width, height);

      if (!projectedA || !projectedB || !projectedC) {
        continue;
      }

      const shade = clamp(
        0.16 + 0.84 * Math.max(0, dot3(normalize3(normal), lightDirection)),
        0.1,
        1,
      );
      const blue = Math.round(200 + shade * 24);
      const green = Math.round(120 + shade * 70);
      const red = Math.round(60 + shade * 90);

      triangles.push({
        depth: (projectedA.z + projectedB.z + projectedC.z) / 3,
        fill: `rgb(${red}, ${green}, ${blue})`,
        stroke: `rgba(226, 232, 240, ${0.05 + shade * 0.12})`,
        vertices: [projectedA, projectedB, projectedC],
      });
    }

    triangles.sort((a, b) => b.depth - a.depth);

    for (const triangle of triangles) {
      this.ctx.beginPath();
      this.ctx.moveTo(triangle.vertices[0].x, triangle.vertices[0].y);
      this.ctx.lineTo(triangle.vertices[1].x, triangle.vertices[1].y);
      this.ctx.lineTo(triangle.vertices[2].x, triangle.vertices[2].y);
      this.ctx.closePath();
      this.ctx.fillStyle = triangle.fill;
      this.ctx.fill();
      this.ctx.strokeStyle = triangle.stroke;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  render(timestamp) {
    const elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (this.spin && !this.dragging) {
      this.yaw += elapsed * 0.00035;
    }

    const width = this.canvas.width / this.devicePixelRatio;
    const height = this.canvas.height / this.devicePixelRatio;

    this.drawBackground(width, height);
    this.drawMesh(width, height);
    this.drawAxes(width, height);

    requestAnimationFrame(this.render);
  }
}
