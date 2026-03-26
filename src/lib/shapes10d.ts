/**
 * 10D Geometry utilities for particle visualization
 * Generates 10D particle positions projected to 3D for visualization
 * 
 * 10D shapes are projected through multiple stages:
 * 10D -> 9D -> 8D -> 7D -> 6D -> 5D -> 4D -> 3D (for display)
 * 
 * Rotation is supported on all 45 10D planes:
 * xy, xz, xw, xv, xu, xt, xr, xq, xp, yz, yw, yv, yu, yt, yr, yq, yp, zw, zv, zu, zt, zr, zq, zp, wv, wu, wt, wr, wq, wp, vu, vt, vr, vq, vp, ut, ur, uq, up, tr, tq, tp, rq, rp, qp
 * 
 * Dimension coordinates: x, y, z, w, v, u, t, r, q, p
 */

export type Shape10DType = 'dekeract' | 'decaSimplex' | 'decaOrthoplex' | 'decaSphere';

export type ProjectionMode10D = 'wireframe' | 'stereographic' | 'solid';

export interface ParticleData10D {
  positions: Float32Array;      // 3D positions for display
  positions10D: Float32Array;   // Original 10D positions
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices10D?: number[][];
}

/**
 * Create 10D particle data from positions array
 */
function createParticleData10D(positions10D: number[], faceIndices: number[], faceCount: number): ParticleData10D {
  const count = positions10D.length / 10;
  if (count === 0 || !Number.isFinite(count)) {
    const fallback: number[] = [];
    const fallbackFaces: number[] = [];
    for (let i = 0; i < 100; i++) {
      for (let d = 0; d < 10; d++) fallback.push(0);
      fallbackFaces.push(0);
    }
    return {
      positions: new Float32Array(100 * 3),
      positions10D: new Float32Array(fallback),
      faceIndices: new Float32Array(fallbackFaces),
      faceCount: 1,
      count: 100,
    };
  }
  
  const pos10DArray = new Float32Array(positions10D);
  const pos3DArray = new Float32Array(count * 3);
  const faceArray = new Float32Array(faceIndices);
  
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos10DArray[i * 10];
    pos3DArray[i * 3 + 1] = pos10DArray[i * 10 + 1];
    pos3DArray[i * 3 + 2] = pos10DArray[i * 10 + 2];
  }
  
  return {
    positions: pos3DArray,
    positions10D: pos10DArray,
    faceIndices: faceArray,
    faceCount,
    count,
  };
}

/**
 * Generate wireframe from edges with particle density
 */
function generateWireframe10DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData10D {
  const positions10D: number[] = [];
  const faceIndices: number[] = [];
  
  let edgeIdx = 0;
  const edgeDensity = Math.max(2, Math.floor(density / 6));
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions10D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6]),
        v0[7] + alpha * (v1[7] - v0[7]),
        v0[8] + alpha * (v1[8] - v0[8]),
        v0[9] + alpha * (v1[9] - v0[9])
      );
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  for (const v of vertices) {
    positions10D.push(...v);
    faceIndices.push(edgeIdx);
  }
  
  const result = createParticleData10D(positions10D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices10D = vertices;
  return result;
}

/**
 * Generate solid particles for 10D hypercube
 */
function generateSolid10DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData10D {
  const positions10D: number[] = [];
  const faceIndices: number[] = [];
  
  const baseDensity = Math.max(2, Math.floor(density / 6));
  const edgeDensity = Math.max(2, Math.floor(density / 7));
  
  let faceIdx = 0;
  
  const s = vertices[0][0] > 0 ? vertices[0][0] : -vertices[0][0];
  
  // 1. Generate particles on 9D boundary hyperfaces (20 boundaries for 10-cube)
  const solidDensity = Math.max(2, Math.floor(baseDensity / 2));
  const step = (2 * s) / Math.max(1, solidDensity - 1);
  
  for (let fixedDim = 0; fixedDim < 10; fixedDim++) {
    for (let sign = -1; sign <= 1; sign += 2) {
      for (let i = 0; i < solidDensity; i++) {
        for (let j = 0; j < solidDensity; j++) {
          for (let k = 0; k < solidDensity; k++) {
            for (let l = 0; l < solidDensity; l++) {
              for (let m = 0; m < solidDensity; m++) {
                for (let n = 0; n < solidDensity; n++) {
                  for (let o = 0; o < solidDensity; o++) {
                    const coords = [
                      -s + i * step,
                      -s + j * step,
                      -s + k * step,
                      -s + l * step,
                      -s + m * step,
                      -s + n * step,
                      -s + o * step,
                      0,
                      0,
                      0
                    ];
                    coords[fixedDim] = sign * s;
                    positions10D.push(...coords);
                    faceIndices.push(faceIdx);
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
  
  // 2. Generate interior points
  const numInteriorPoints = Math.floor(density * density * density * 0.15);
  
  for (let i = 0; i < numInteriorPoints; i++) {
    const point: number[] = [];
    for (let d = 0; d < 10; d++) {
      point.push(-s + Math.random() * 2 * s);
    }
    positions10D.push(...point);
    faceIndices.push(faceIdx % 20);
  }
  
  // 3. Edge particles
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions10D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6]),
        v0[7] + alpha * (v1[7] - v0[7]),
        v0[8] + alpha * (v1[8] - v0[8]),
        v0[9] + alpha * (v1[9] - v0[9])
      );
      faceIndices.push(0);
    }
  }
  
  // 4. Vertices
  for (const v of vertices) {
    positions10D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData10D(positions10D, faceIndices, 20);
  result.edges = edges;
  result.vertices10D = vertices;
  return result;
}

/**
 * Generate particles for a Dekeract (10D hypercube)
 * 1024 vertices, 5120 edges, 20 9D cubic cells
 */
export function generateDekeractParticles(size: number, density: number, mode: ProjectionMode10D): ParticleData10D {
  const s = size;
  
  // 1024 vertices of 10-cube: all combinations of (±1, ±1, ±1, ±1, ±1, ±1, ±1, ±1, ±1, ±1)
  const vertices: number[][] = [];
  for (let i = 0; i < 1024; i++) {
    vertices.push([
      (i & 1) ? s : -s,
      (i & 2) ? s : -s,
      (i & 4) ? s : -s,
      (i & 8) ? s : -s,
      (i & 16) ? s : -s,
      (i & 32) ? s : -s,
      (i & 64) ? s : -s,
      (i & 128) ? s : -s,
      (i & 256) ? s : -s,
      (i & 512) ? s : -s
    ]);
  }
  
  // 5120 edges - vertices differ in exactly one coordinate
  const edges: [number, number][] = [];
  for (let i = 0; i < 1024; i++) {
    for (let j = i + 1; j < 1024; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4 || xor === 8 || xor === 16 || xor === 32 || xor === 64 || xor === 128 || xor === 256 || xor === 512) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe10DFromEdges(vertices, edges, density);
  }
  
  return generateSolid10DFromEdges(vertices, edges, density);
}

/**
 * Generate particles for a 10-Simplex (Hendecayotton)
 * 11 vertices, 55 edges
 */
export function generateDecaSimplexParticles(size: number, density: number, mode: ProjectionMode10D): ParticleData10D {
  const s = size * 1.5;
  
  // 11 vertices of regular 10-simplex
  const vertices: number[][] = [];
  
  for (let i = 0; i < 11; i++) {
    const v: number[] = [];
    for (let j = 0; j < 10; j++) {
      if (i < 10) {
        v.push(i === j ? 1 : -1/10);
      } else {
        v.push(-1/10);
      }
    }
    vertices.push(v);
  }
  
  // Normalize and scale
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map(c => (c / len) * s);
  });
  
  // 55 edges - all pairs
  const edges: [number, number][] = [];
  for (let i = 0; i < 11; i++) {
    for (let j = i + 1; j < 11; j++) {
      edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe10DFromEdges(scaledVertices, edges, density);
  }
  
  // Solid mode
  const positions10D: number[] = [];
  const faceIndices: number[] = [];
  
  const edgeDensity = Math.max(2, Math.floor(density / 6));
  
  let idx = 0;
  for (const [i, j] of edges) {
    const v0 = scaledVertices[i];
    const v1 = scaledVertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions10D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6]),
        v0[7] + alpha * (v1[7] - v0[7]),
        v0[8] + alpha * (v1[8] - v0[8]),
        v0[9] + alpha * (v1[9] - v0[9])
      );
      faceIndices.push(idx % 11);
    }
    idx++;
  }
  
  // Interior particles
  const interiorCount = Math.floor(density * density * 1.5);
  for (let i = 0; i < interiorCount; i++) {
    let weights: number[] = [];
    let sum = 0;
    for (let j = 0; j < 11; j++) {
      weights.push(Math.random());
      sum += weights[j];
    }
    weights = weights.map(w => w / sum);
    
    const point: number[] = new Array(10).fill(0);
    for (let d = 0; d < 10; d++) {
      for (let v = 0; v < 11; v++) {
        point[d] += weights[v] * scaledVertices[v][d];
      }
    }
    positions10D.push(...point);
    faceIndices.push(idx % 11);
  }
  
  for (const v of scaledVertices) {
    positions10D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData10D(positions10D, faceIndices, 11);
  result.edges = edges;
  result.vertices10D = scaledVertices;
  return result;
}

/**
 * Generate particles for a 10-Orthoplex (Decacross)
 * 20 vertices, 180 edges
 */
export function generateDecaOrthoplexParticles(size: number, density: number, mode: ProjectionMode10D): ParticleData10D {
  const s = size;
  
  // 20 vertices - on each axis
  const vertices: number[][] = [];
  for (let dim = 0; dim < 10; dim++) {
    const v1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const v2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    v1[dim] = s;
    v2[dim] = -s;
    vertices.push(v1, v2);
  }
  
  // 180 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 20; i++) {
    for (let j = i + 1; j < 20; j++) {
      if (Math.floor(i / 2) !== Math.floor(j / 2)) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe10DFromEdges(vertices, edges, density);
  }
  
  // Solid mode
  const positions10D: number[] = [];
  const faceIndices: number[] = [];
  
  const edgeDensity = Math.max(2, Math.floor(density / 6));
  
  let idx = 0;
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions10D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6]),
        v0[7] + alpha * (v1[7] - v0[7]),
        v0[8] + alpha * (v1[8] - v0[8]),
        v0[9] + alpha * (v1[9] - v0[9])
      );
      faceIndices.push(idx % 20);
    }
    idx++;
  }
  
  // Interior particles
  const interiorCount = Math.floor(density * density * 0.8);
  for (let i = 0; i < interiorCount; i++) {
    const point: number[] = [];
    let sum = 0;
    for (let d = 0; d < 10; d++) {
      const u = Math.random() * 2 - 1;
      point.push(u);
      sum += Math.abs(u);
    }
    
    const scale = (Math.random() * s) / Math.max(sum, 0.001);
    for (let d = 0; d < 10; d++) {
      point[d] *= scale;
    }
    
    positions10D.push(...point);
    faceIndices.push(idx % 20);
  }
  
  for (const v of vertices) {
    positions10D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData10D(positions10D, faceIndices, 20);
  result.edges = edges;
  result.vertices10D = vertices;
  return result;
}

/**
 * Generate particles for a 10-Sphere (9-Sphere boundary)
 */
export function generateDecaSphereParticles(radius: number, density: number, mode: ProjectionMode10D): ParticleData10D {
  const positions10D: number[] = [];
  const faceIndices: number[] = [];
  
  const numPoints = Math.max(100, Math.floor(density * density * 1.2));
  const numBands = 16;
  
  for (let i = 0; i < numPoints; i++) {
    const coords: number[] = [];
    
    for (let d = 0; d < 10; d++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      const theta = 2 * Math.PI * u2;
      coords.push(r * Math.cos(theta));
    }
    
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    if (len > 0 && Number.isFinite(len)) {
      for (let d = 0; d < 10; d++) {
        coords[d] = (coords[d] / len) * radius;
      }
      positions10D.push(...coords);
      
      const band = Math.floor(((coords[9] / radius) + 1) / 2 * numBands);
      faceIndices.push(Math.min(Math.max(0, band), numBands - 1));
    }
  }
  
  if (mode === 'solid') {
    const interiorCount = Math.floor(density * density * 0.4);
    for (let i = 0; i < interiorCount; i++) {
      const coords: number[] = [];
      
      for (let d = 0; d < 10; d++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
        const theta = 2 * Math.PI * u2;
        coords.push(r * Math.cos(theta));
      }
      
      const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
      const r = Math.pow(Math.random(), 1/10) * radius;
      if (len > 0 && Number.isFinite(len)) {
        for (let d = 0; d < 10; d++) {
          coords[d] = (coords[d] / len) * r;
        }
        positions10D.push(...coords);
        faceIndices.push(0);
      }
    }
  }
  
  const result = createParticleData10D(positions10D, faceIndices, numBands);
  return result;
}

// ============================================================================
// ROTATION AND PROJECTION
// ============================================================================

/**
 * 10D rotation on a specified plane
 * 45 planes
 */
export function rotate10D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const x = pos[0];
  const y = pos[1];
  const z = pos[2];
  const w = pos[3];
  const v = pos[4];
  const u = pos[5];
  const t = pos[6];
  const r = pos[7];
  const q = pos[8];
  const p = pos[9];
  
  switch (plane) {
    case 'xy': pos[0] = x * cos - y * sin; pos[1] = x * sin + y * cos; break;
    case 'xz': pos[0] = x * cos - z * sin; pos[2] = x * sin + z * cos; break;
    case 'xw': pos[0] = x * cos - w * sin; pos[3] = x * sin + w * cos; break;
    case 'xv': pos[0] = x * cos - v * sin; pos[4] = x * sin + v * cos; break;
    case 'xu': pos[0] = x * cos - u * sin; pos[5] = x * sin + u * cos; break;
    case 'xt': pos[0] = x * cos - t * sin; pos[6] = x * sin + t * cos; break;
    case 'xr': pos[0] = x * cos - r * sin; pos[7] = x * sin + r * cos; break;
    case 'xq': pos[0] = x * cos - q * sin; pos[8] = x * sin + q * cos; break;
    case 'xp': pos[0] = x * cos - p * sin; pos[9] = x * sin + p * cos; break;
    case 'yz': pos[1] = y * cos - z * sin; pos[2] = y * sin + z * cos; break;
    case 'yw': pos[1] = y * cos - w * sin; pos[3] = y * sin + w * cos; break;
    case 'yv': pos[1] = y * cos - v * sin; pos[4] = y * sin + v * cos; break;
    case 'yu': pos[1] = y * cos - u * sin; pos[5] = y * sin + u * cos; break;
    case 'yt': pos[1] = y * cos - t * sin; pos[6] = y * sin + t * cos; break;
    case 'yr': pos[1] = y * cos - r * sin; pos[7] = y * sin + r * cos; break;
    case 'yq': pos[1] = y * cos - q * sin; pos[8] = y * sin + q * cos; break;
    case 'yp': pos[1] = y * cos - p * sin; pos[9] = y * sin + p * cos; break;
    case 'zw': pos[2] = z * cos - w * sin; pos[3] = z * sin + w * cos; break;
    case 'zv': pos[2] = z * cos - v * sin; pos[4] = z * sin + v * cos; break;
    case 'zu': pos[2] = z * cos - u * sin; pos[5] = z * sin + u * cos; break;
    case 'zt': pos[2] = z * cos - t * sin; pos[6] = z * sin + t * cos; break;
    case 'zr': pos[2] = z * cos - r * sin; pos[7] = z * sin + r * cos; break;
    case 'zq': pos[2] = z * cos - q * sin; pos[8] = z * sin + q * cos; break;
    case 'zp': pos[2] = z * cos - p * sin; pos[9] = z * sin + p * cos; break;
    case 'wv': pos[3] = w * cos - v * sin; pos[4] = w * sin + v * cos; break;
    case 'wu': pos[3] = w * cos - u * sin; pos[5] = w * sin + u * cos; break;
    case 'wt': pos[3] = w * cos - t * sin; pos[6] = w * sin + t * cos; break;
    case 'wr': pos[3] = w * cos - r * sin; pos[7] = w * sin + r * cos; break;
    case 'wq': pos[3] = w * cos - q * sin; pos[8] = w * sin + q * cos; break;
    case 'wp': pos[3] = w * cos - p * sin; pos[9] = w * sin + p * cos; break;
    case 'vu': pos[4] = v * cos - u * sin; pos[5] = v * sin + u * cos; break;
    case 'vt': pos[4] = v * cos - t * sin; pos[6] = v * sin + t * cos; break;
    case 'vr': pos[4] = v * cos - r * sin; pos[7] = v * sin + r * cos; break;
    case 'vq': pos[4] = v * cos - q * sin; pos[8] = v * sin + q * cos; break;
    case 'vp': pos[4] = v * cos - p * sin; pos[9] = v * sin + p * cos; break;
    case 'ut': pos[5] = u * cos - t * sin; pos[6] = u * sin + t * cos; break;
    case 'ur': pos[5] = u * cos - r * sin; pos[7] = u * sin + r * cos; break;
    case 'uq': pos[5] = u * cos - q * sin; pos[8] = u * sin + q * cos; break;
    case 'up': pos[5] = u * cos - p * sin; pos[9] = u * sin + p * cos; break;
    case 'tr': pos[6] = t * cos - r * sin; pos[7] = t * sin + r * cos; break;
    case 'tq': pos[6] = t * cos - q * sin; pos[8] = t * sin + q * cos; break;
    case 'tp': pos[6] = t * cos - p * sin; pos[9] = t * sin + p * cos; break;
    case 'rq': pos[7] = r * cos - q * sin; pos[8] = r * sin + q * cos; break;
    case 'rp': pos[7] = r * cos - p * sin; pos[9] = r * sin + p * cos; break;
    case 'qp': pos[8] = q * cos - p * sin; pos[9] = q * sin + p * cos; break;
  }
}

/**
 * Project 10D to 3D through multiple stages
 */
export function project10Dto3D(pos10D: Float32Array, out: Float32Array, distances: [number, number, number, number, number, number, number] = [9, 8, 7, 6, 5, 4, 3]): void {
  // 10D -> 9D
  const p = pos10D[9];
  const scale1 = distances[0] / (distances[0] - p);
  const clampedScale1 = Math.max(0.1, Math.min(10, scale1));
  
  const x9 = pos10D[0] * clampedScale1;
  const y9 = pos10D[1] * clampedScale1;
  const z9 = pos10D[2] * clampedScale1;
  const w9 = pos10D[3] * clampedScale1;
  const v9 = pos10D[4] * clampedScale1;
  const u9 = pos10D[5] * clampedScale1;
  const t9 = pos10D[6] * clampedScale1;
  const r9 = pos10D[7] * clampedScale1;
  const q9 = pos10D[8] * clampedScale1;
  
  // 9D -> 8D
  const scale2 = distances[1] / (distances[1] - q9);
  const clampedScale2 = Math.max(0.1, Math.min(10, scale2));
  
  const x8 = x9 * clampedScale2;
  const y8 = y9 * clampedScale2;
  const z8 = z9 * clampedScale2;
  const w8 = w9 * clampedScale2;
  const v8 = v9 * clampedScale2;
  const u8 = u9 * clampedScale2;
  const t8 = t9 * clampedScale2;
  const r8 = r9 * clampedScale2;
  
  // 8D -> 7D
  const scale3 = distances[2] / (distances[2] - r8);
  const clampedScale3 = Math.max(0.1, Math.min(10, scale3));
  
  const x7 = x8 * clampedScale3;
  const y7 = y8 * clampedScale3;
  const z7 = z8 * clampedScale3;
  const w7 = w8 * clampedScale3;
  const v7 = v8 * clampedScale3;
  const u7 = u8 * clampedScale3;
  const t7 = t8 * clampedScale3;
  
  // 7D -> 6D
  const scale4 = distances[3] / (distances[3] - t7);
  const clampedScale4 = Math.max(0.1, Math.min(10, scale4));
  
  const x6 = x7 * clampedScale4;
  const y6 = y7 * clampedScale4;
  const z6 = z7 * clampedScale4;
  const w6 = w7 * clampedScale4;
  const v6 = v7 * clampedScale4;
  const u6 = u7 * clampedScale4;
  
  // 6D -> 5D
  const scale5 = distances[4] / (distances[4] - u6);
  const clampedScale5 = Math.max(0.1, Math.min(10, scale5));
  
  const x5 = x6 * clampedScale5;
  const y5 = y6 * clampedScale5;
  const z5 = z6 * clampedScale5;
  const w5 = w6 * clampedScale5;
  const v5 = v6 * clampedScale5;
  
  // 5D -> 4D
  const scale6 = distances[5] / (distances[5] - v5);
  const clampedScale6 = Math.max(0.1, Math.min(10, scale6));
  
  const x4 = x5 * clampedScale6;
  const y4 = y5 * clampedScale6;
  const z4 = z5 * clampedScale6;
  const w4 = w5 * clampedScale6;
  
  // 4D -> 3D
  const scale7 = distances[6] / (distances[6] - w4);
  const clampedScale7 = Math.max(0.1, Math.min(10, scale7));
  
  out[0] = x4 * clampedScale7;
  out[1] = y4 * clampedScale7;
  out[2] = z4 * clampedScale7;
}

/**
 * Stereographic projection 10D -> 3D
 */
export function stereographicProject10Dto3D(pos10D: Float32Array, out: Float32Array): void {
  const x = pos10D[0];
  const y = pos10D[1];
  const z = pos10D[2];
  
  const denom = 1 - pos10D[9] * 0.5;
  
  if (Math.abs(denom) < 0.001) {
    out[0] = x * 5;
    out[1] = y * 5;
    out[2] = z * 5;
  } else {
    const scale = 1 / denom;
    out[0] = x * scale;
    out[1] = y * scale;
    out[2] = z * scale;
  }
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export function generate10DShapeParticles(
  shape: Shape10DType,
  size: number = 1,
  density: number = 15,
  mode: ProjectionMode10D = 'wireframe'
): ParticleData10D {
  switch (shape) {
    case 'dekeract':
      return generateDekeractParticles(size, density, mode);
    case 'decaSimplex':
      return generateDecaSimplexParticles(size, density, mode);
    case 'decaOrthoplex':
      return generateDecaOrthoplexParticles(size, density, mode);
    case 'decaSphere':
      return generateDecaSphereParticles(size, density, mode);
    default:
      return generateDekeractParticles(size, density, mode);
  }
}

export function get10DShapeInfo(shape: Shape10DType): { name: string; description: string } {
  const info: Record<Shape10DType, { name: string; description: string }> = {
    dekeract: { name: 'Dekeract', description: '10D Hypercube - 1024 vertices, 5120 edges' },
    decaSimplex: { name: '10-Simplex', description: 'Hendecayotton - 11 vertices, 55 edges' },
    decaOrthoplex: { name: '10-Orthoplex', description: 'Decacross - 20 vertices, 180 edges' },
    decaSphere: { name: '10-Sphere', description: 'All points equidistant from center in 10D' },
  };
  return info[shape];
}
