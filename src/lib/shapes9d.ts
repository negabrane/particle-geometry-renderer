/**
 * 9D Geometry utilities for particle visualization
 * 
 * 9D shapes are projected through multiple stages:
 * 9D -> 8D -> 7D -> 6D -> 5D -> 4D -> 3D
 * 
 * Rotation is supported on all 36 9D planes
 */

export type Shape9DType = 'enneract' | 'enneaSimplex' | 'enneaOrthoplex' | 'enneaSphere';

export type ProjectionMode9D = 'wireframe' | 'stereographic' | 'solid';

export interface ParticleData9D {
  positions: Float32Array;
  positions9D: Float32Array;
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices9D?: number[][];
}

function createParticleData9D(positions9D: number[], faceIndices: number[], faceCount: number): ParticleData9D {
  const count = positions9D.length / 9;
  if (count === 0 || !Number.isFinite(count)) {
    const fallback: number[] = [], fallbackFaces: number[] = [];
    for (let i = 0; i < 100; i++) { for (let d = 0; d < 9; d++) fallback.push(0); fallbackFaces.push(0); }
    return { positions: new Float32Array(100 * 3), positions9D: new Float32Array(fallback), faceIndices: new Float32Array(fallbackFaces), faceCount: 1, count: 100 };
  }
  
  const pos9DArray = new Float32Array(positions9D);
  const pos3DArray = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos9DArray[i * 9];
    pos3DArray[i * 3 + 1] = pos9DArray[i * 9 + 1];
    pos3DArray[i * 3 + 2] = pos9DArray[i * 9 + 2];
  }
  return { positions: pos3DArray, positions9D: pos9DArray, faceIndices: new Float32Array(faceIndices), faceCount, count };
}

function generateWireframe9DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData9D {
  const positions9D: number[] = [], faceIndices: number[] = [];
  const edgeDensity = Math.max(3, Math.floor(density / 3));
  let edgeIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i], v1 = vertices[j];
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      for (let d = 0; d < 9; d++) positions9D.push(v0[d] + alpha * (v1[d] - v0[d]));
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  for (const v of vertices) { positions9D.push(...v); faceIndices.push(edgeIdx); }
  
  const result = createParticleData9D(positions9D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices9D = vertices;
  return result;
}

export function generateEnneractParticles(size: number, density: number, mode: ProjectionMode9D): ParticleData9D {
  const s = size;
  const vertices: number[][] = [];
  
  // 512 vertices
  for (let i = 0; i < 512; i++) {
    vertices.push([
      (i & 1) ? s : -s, (i & 2) ? s : -s, (i & 4) ? s : -s, (i & 8) ? s : -s,
      (i & 16) ? s : -s, (i & 32) ? s : -s, (i & 64) ? s : -s, (i & 128) ? s : -s, (i & 256) ? s : -s
    ]);
  }
  
  // 2304 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 512; i++) {
    for (let j = i + 1; j < 512; j++) {
      const xor = i ^ j;
      if ([1, 2, 4, 8, 16, 32, 64, 128, 256].includes(xor)) edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') return generateWireframe9DFromEdges(vertices, edges, density);
  
  // Solid mode - sample on 18 boundary 8-cubes
  const positions9D: number[] = [], faceIndices: number[] = [];
  const surfaceDensity = Math.max(3, Math.floor(density / 2));
  const step = (2 * s) / Math.max(1, surfaceDensity - 1);
  let faceIdx = 0;
  
  for (let dim = 0; dim < 9; dim++) {
    for (const sign of [-1, 1]) {
      for (let i0 = 0; i0 < surfaceDensity; i0++) {
        for (let i1 = 0; i1 < surfaceDensity; i1++) {
          for (let i2 = 0; i2 < surfaceDensity; i2++) {
            for (let i3 = 0; i3 < surfaceDensity; i3++) {
              for (let i4 = 0; i4 < surfaceDensity; i4++) {
                for (let i5 = 0; i5 < surfaceDensity; i5++) {
                  for (let i6 = 0; i6 < surfaceDensity; i6++) {
                    for (let i7 = 0; i7 < surfaceDensity; i7++) {
                      const coords: number[] = [];
                      let idx = 0;
                      for (let d = 0; d < 9; d++) {
                        if (d === dim) coords.push(sign * s);
                        else { coords.push(-s + [i0, i1, i2, i3, i4, i5, i6, i7][idx] * step); idx++; }
                      }
                      positions9D.push(...coords);
                      faceIndices.push(faceIdx % 18);
                    }
                  }
                }
              }
            }
          }
        }
      }
      faceIdx++;
    }
  }
  
  const result = createParticleData9D(positions9D, faceIndices, 18);
  result.edges = edges;
  result.vertices9D = vertices;
  return result;
}

export function generateEnneaSimplexParticles(size: number, density: number, mode: ProjectionMode9D): ParticleData9D {
  const s = size * 1.5;
  const vertices: number[][] = [];
  
  // 10 vertices of regular 9-simplex
  for (let i = 0; i < 10; i++) {
    const v: number[] = [];
    for (let j = 0; j < 9; j++) v.push(i < 9 ? (i === j ? 1 : -1/9) : -1/9);
    vertices.push(v);
  }
  
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map(c => (c / len) * s);
  });
  
  // 45 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) edges.push([i, j]);
  
  if (mode === 'wireframe' || mode === 'stereographic') return generateWireframe9DFromEdges(scaledVertices, edges, density);
  
  // Solid mode
  const positions9D: number[] = [], faceIndices: number[] = [];
  const interiorDensity = Math.max(2, Math.floor(density / 3));
  
  // Sample interior using barycentric-like approach
  const numInterior = Math.floor(density * density * 1.5);
  for (let i = 0; i < numInterior; i++) {
    const weights = Array(10).fill(0).map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b);
    weights.forEach((w, idx) => weights[idx] = w / sum);
    
    const point: number[] = [];
    for (let d = 0; d < 9; d++) {
      let coord = 0;
      for (let v = 0; v < 10; v++) coord += weights[v] * scaledVertices[v][d];
      point.push(coord);
    }
    positions9D.push(...point);
    faceIndices.push(0);
  }
  
  const result = createParticleData9D(positions9D, faceIndices, 10);
  result.edges = edges;
  result.vertices9D = scaledVertices;
  return result;
}

export function generateEnneaOrthoplexParticles(size: number, density: number, mode: ProjectionMode9D): ParticleData9D {
  const s = size;
  const vertices: number[][] = [];
  
  // 18 vertices on each axis
  for (let dim = 0; dim < 9; dim++) {
    const v1 = Array(9).fill(0), v2 = Array(9).fill(0);
    v1[dim] = s; v2[dim] = -s;
    vertices.push(v1, v2);
  }
  
  // 144 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 18; i++) {
    for (let j = i + 1; j < 18; j++) {
      if (Math.floor(i / 2) !== Math.floor(j / 2)) edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') return generateWireframe9DFromEdges(vertices, edges, density);
  
  // Solid mode - L1 ball sampling
  const positions9D: number[] = [], faceIndices: number[] = [];
  const interiorCount = Math.floor(density * density);
  
  for (let i = 0; i < interiorCount; i++) {
    const point: number[] = [];
    let sum = 0;
    for (let d = 0; d < 9; d++) { const u = Math.random() * 2 - 1; point.push(u); sum += Math.abs(u); }
    const scale = (Math.random() * s) / Math.max(sum, 0.001);
    for (let d = 0; d < 9; d++) point[d] *= scale;
    positions9D.push(...point);
    faceIndices.push(0);
  }
  
  const result = createParticleData9D(positions9D, faceIndices, 18);
  result.edges = edges;
  result.vertices9D = vertices;
  return result;
}

export function generateEnneaSphereParticles(radius: number, density: number, mode: ProjectionMode9D): ParticleData9D {
  const positions9D: number[] = [], faceIndices: number[] = [];
  const numSurface = Math.max(400, Math.floor(density * density * 2));
  const numInterior = mode === 'solid' ? Math.floor(density * density) : 0;
  
  for (let i = 0; i < numSurface; i++) {
    const coords: number[] = [];
    for (let d = 0; d < 9; d++) {
      const u1 = Math.random(), u2 = Math.random();
      coords.push(Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2));
    }
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    if (len > 0) {
      for (let d = 0; d < 9; d++) coords[d] = (coords[d] / len) * radius;
      positions9D.push(...coords);
      faceIndices.push(Math.floor(i / numSurface * 16));
    }
  }
  
  for (let i = 0; i < numInterior; i++) {
    const coords: number[] = [];
    for (let d = 0; d < 9; d++) {
      const u1 = Math.random(), u2 = Math.random();
      coords.push(Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2));
    }
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    const r = Math.pow(Math.random(), 1/9) * radius;
    if (len > 0) {
      for (let d = 0; d < 9; d++) coords[d] = (coords[d] / len) * r;
      positions9D.push(...coords);
      faceIndices.push(0);
    }
  }
  
  return createParticleData9D(positions9D, faceIndices, 16);
}

export function rotate9D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const c = [pos[0], pos[1], pos[2], pos[3], pos[4], pos[5], pos[6], pos[7], pos[8]];
  const axisNames = ['x', 'y', 'z', 'w', 'v', 'u', 't', 'r', 'q'];
  
  for (let i = 0; i < 9; i++) {
    for (let j = i + 1; j < 9; j++) {
      if (plane === axisNames[i] + axisNames[j]) {
        pos[i] = c[i] * cos - c[j] * sin;
        pos[j] = c[i] * sin + c[j] * cos;
        return;
      }
    }
  }
}

export function project9Dto3D(pos9D: Float32Array, out: Float32Array): void {
  let [x, y, z, w, v, u, t, r, q] = pos9D;
  const distances = [8, 7, 6, 5, 4, 3];
  
  const scales = distances.map((d, i) => Math.max(0.1, Math.min(10, d / (d - [q, r, t, u, v, w][i]))));
  x *= scales[0]; y *= scales[0]; z *= scales[0]; w *= scales[0]; v *= scales[0]; u *= scales[0]; t *= scales[0]; r *= scales[0];
  x *= scales[1]; y *= scales[1]; z *= scales[1]; w *= scales[1]; v *= scales[1]; u *= scales[1]; t *= scales[1];
  x *= scales[2]; y *= scales[2]; z *= scales[2]; w *= scales[2]; v *= scales[2]; u *= scales[2];
  x *= scales[3]; y *= scales[3]; z *= scales[3]; w *= scales[3]; v *= scales[3];
  x *= scales[4]; y *= scales[4]; z *= scales[4]; w *= scales[4];
  
  const scale5 = Math.max(0.1, Math.min(10, distances[5] / (distances[5] - w)));
  out[0] = x * scale5;
  out[1] = y * scale5;
  out[2] = z * scale5;
}

export function stereographicProject9Dto3D(pos9D: Float32Array, out: Float32Array): void {
  const denom = 1 - pos9D[8] * 0.5;
  const scale = Math.abs(denom) < 0.001 ? 5 : 1 / denom;
  out[0] = pos9D[0] * scale;
  out[1] = pos9D[1] * scale;
  out[2] = pos9D[2] * scale;
}

export function generate9DShapeParticles(shape: Shape9DType, size: number, density: number, mode: ProjectionMode9D): ParticleData9D {
  switch (shape) {
    case 'enneract': return generateEnneractParticles(size, density, mode);
    case 'enneaSimplex': return generateEnneaSimplexParticles(size, density, mode);
    case 'enneaOrthoplex': return generateEnneaOrthoplexParticles(size, density, mode);
    case 'enneaSphere': return generateEnneaSphereParticles(size, density, mode);
    default: return generateEnneractParticles(size, density, mode);
  }
}

export function get9DShapeInfo(shape: Shape9DType): { name: string; description: string } {
  const info: Record<Shape9DType, { name: string; description: string }> = {
    enneract: { name: '9D Hypercube', description: 'Enneract - 512 vertices, 2304 edges' },
    enneaSimplex: { name: '9-Simplex', description: 'Decayotton - 10 vertices, 45 edges' },
    enneaOrthoplex: { name: '9-Orthoplex', description: 'Enneacross - 18 vertices, 144 edges' },
    enneaSphere: { name: '9-Sphere', description: 'All points equidistant from center in 9D' },
  };
  return info[shape];
}
