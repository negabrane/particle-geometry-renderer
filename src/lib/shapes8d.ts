/**
 * 8D Geometry utilities for particle visualization
 * 
 * 8D shapes are projected through multiple stages:
 * 8D -> 7D -> 6D -> 5D -> 4D -> 3D
 * 
 * Rotation is supported on all 28 8D planes:
 * xy, xz, xw, xv, xu, xt, xr, yz, yw, yv, yu, yt, yr, zw, zv, zu, zt, zr, wv, wu, wt, wr, vu, vt, vr, ut, ur, tr
 */

export type Shape8DType = 'octeract' | 'octaSimplex' | 'octaOrthoplex' | 'octaSphere';

export type ProjectionMode8D = 'wireframe' | 'stereographic' | 'solid';

export interface ParticleData8D {
  positions: Float32Array;
  positions8D: Float32Array;
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices8D?: number[][];
}

function createParticleData8D(positions8D: number[], faceIndices: number[], faceCount: number): ParticleData8D {
  const count = positions8D.length / 8;
  if (count === 0 || !Number.isFinite(count)) {
    const fallback: number[] = [];
    const fallbackFaces: number[] = [];
    for (let i = 0; i < 100; i++) {
      for (let d = 0; d < 8; d++) fallback.push(0);
      fallbackFaces.push(0);
    }
    return { positions: new Float32Array(100 * 3), positions8D: new Float32Array(fallback), faceIndices: new Float32Array(fallbackFaces), faceCount: 1, count: 100 };
  }
  
  const pos8DArray = new Float32Array(positions8D);
  const pos3DArray = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos8DArray[i * 8];
    pos3DArray[i * 3 + 1] = pos8DArray[i * 8 + 1];
    pos3DArray[i * 3 + 2] = pos8DArray[i * 8 + 2];
  }
  
  return { positions: pos3DArray, positions8D: pos8DArray, faceIndices: new Float32Array(faceIndices), faceCount, count };
}

function generateWireframe8DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData8D {
  const positions8D: number[] = [];
  const faceIndices: number[] = [];
  
  const edgeDensity = Math.max(3, Math.floor(density / 3));
  let edgeIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i], v1 = vertices[j];
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      for (let d = 0; d < 8; d++) positions8D.push(v0[d] + alpha * (v1[d] - v0[d]));
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  for (const v of vertices) { positions8D.push(...v); faceIndices.push(edgeIdx); }
  
  const result = createParticleData8D(positions8D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices8D = vertices;
  return result;
}

export function generateOcteractParticles(size: number, density: number, mode: ProjectionMode8D): ParticleData8D {
  const s = size;
  const vertices: number[][] = [];
  
  // 256 vertices
  for (let i = 0; i < 256; i++) {
    vertices.push([
      (i & 1) ? s : -s, (i & 2) ? s : -s, (i & 4) ? s : -s, (i & 8) ? s : -s,
      (i & 16) ? s : -s, (i & 32) ? s : -s, (i & 64) ? s : -s, (i & 128) ? s : -s
    ]);
  }
  
  // 1024 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 256; i++) {
    for (let j = i + 1; j < 256; j++) {
      const xor = i ^ j;
      if ([1, 2, 4, 8, 16, 32, 64, 128].includes(xor)) edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') return generateWireframe8DFromEdges(vertices, edges, density);
  
  // Solid mode
  const positions8D: number[] = [];
  const faceIndices: number[] = [];
  
  const surfaceDensity = Math.max(3, Math.floor(density / 2));
  const step = (2 * s) / Math.max(1, surfaceDensity - 1);
  let faceIdx = 0;
  
  // Sample on 16 boundary 7-cubes
  for (let dim = 0; dim < 8; dim++) {
    for (const sign of [-1, 1]) {
      const indices = [0, 1, 2, 3, 4, 5, 6, 7].filter(d => d !== dim);
      for (let i0 = 0; i0 < surfaceDensity; i0++) {
        for (let i1 = 0; i1 < surfaceDensity; i1++) {
          for (let i2 = 0; i2 < surfaceDensity; i2++) {
            for (let i3 = 0; i3 < surfaceDensity; i3++) {
              for (let i4 = 0; i4 < surfaceDensity; i4++) {
                for (let i5 = 0; i5 < surfaceDensity; i5++) {
                  for (let i6 = 0; i6 < surfaceDensity; i6++) {
                    const coords: number[] = [];
                    let idx = 0;
                    for (let d = 0; d < 8; d++) {
                      if (d === dim) coords.push(sign * s);
                      else { coords.push(-s + [i0, i1, i2, i3, i4, i5, i6][idx] * step); idx++; }
                    }
                    positions8D.push(...coords);
                    faceIndices.push(faceIdx % 16);
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
  
  const result = createParticleData8D(positions8D, faceIndices, 16);
  result.edges = edges;
  result.vertices8D = vertices;
  return result;
}

export function generateOctaSimplexParticles(size: number, density: number, mode: ProjectionMode8D): ParticleData8D {
  const s = size * 1.5;
  const vertices: number[][] = [];
  
  // 9 vertices of regular 8-simplex
  for (let i = 0; i < 9; i++) {
    const v: number[] = [];
    for (let j = 0; j < 8; j++) {
      v.push(i < 8 ? (i === j ? 1 : -1/8) : -1/8);
    }
    vertices.push(v);
  }
  
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map(c => (c / len) * s);
  });
  
  // 36 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) edges.push([i, j]);
  
  if (mode === 'wireframe' || mode === 'stereographic') return generateWireframe8DFromEdges(scaledVertices, edges, density);
  
  // Solid mode
  const positions8D: number[] = [];
  const faceIndices: number[] = [];
  const interiorDensity = Math.max(2, Math.floor(density / 3));
  
  for (let i0 = 0; i0 <= interiorDensity; i0++) {
    for (let i1 = 0; i1 <= interiorDensity - i0; i1++) {
      for (let i2 = 0; i2 <= interiorDensity - i0 - i1; i2++) {
        for (let i3 = 0; i3 <= interiorDensity - i0 - i1 - i2; i3++) {
          for (let i4 = 0; i4 <= interiorDensity - i0 - i1 - i2 - i3; i4++) {
            for (let i5 = 0; i5 <= interiorDensity - i0 - i1 - i2 - i3 - i4; i5++) {
              for (let i6 = 0; i6 <= interiorDensity - i0 - i1 - i2 - i3 - i4 - i5; i6++) {
                for (let i7 = 0; i7 <= interiorDensity - i0 - i1 - i2 - i3 - i4 - i5 - i6; i7++) {
                  const i8 = interiorDensity - i0 - i1 - i2 - i3 - i4 - i5 - i6 - i7;
                  if (i8 >= 0) {
                    const total = interiorDensity;
                    const bary = [i0, i1, i2, i3, i4, i5, i6, i7, i8].map(x => x / total);
                    const point: number[] = [];
                    for (let d = 0; d < 8; d++) {
                      let coord = 0;
                      for (let v = 0; v < 9; v++) coord += bary[v] * scaledVertices[v][d];
                      point.push(coord);
                    }
                    positions8D.push(...point);
                    faceIndices.push(0);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  const result = createParticleData8D(positions8D, faceIndices, 9);
  result.edges = edges;
  result.vertices8D = scaledVertices;
  return result;
}

export function generateOctaOrthoplexParticles(size: number, density: number, mode: ProjectionMode8D): ParticleData8D {
  const s = size;
  const vertices: number[][] = [];
  
  // 16 vertices on each axis
  for (let dim = 0; dim < 8; dim++) {
    const v1 = [0, 0, 0, 0, 0, 0, 0, 0], v2 = [0, 0, 0, 0, 0, 0, 0, 0];
    v1[dim] = s; v2[dim] = -s;
    vertices.push(v1, v2);
  }
  
  // 112 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      if (Math.floor(i / 2) !== Math.floor(j / 2)) edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') return generateWireframe8DFromEdges(vertices, edges, density);
  
  // Solid mode - L1 ball sampling
  const positions8D: number[] = [];
  const faceIndices: number[] = [];
  const interiorCount = Math.floor(density * density);
  
  for (let i = 0; i < interiorCount; i++) {
    const point: number[] = [];
    let sum = 0;
    for (let d = 0; d < 8; d++) { const u = Math.random() * 2 - 1; point.push(u); sum += Math.abs(u); }
    const scale = (Math.random() * s) / Math.max(sum, 0.001);
    for (let d = 0; d < 8; d++) point[d] *= scale;
    positions8D.push(...point);
    faceIndices.push(0);
  }
  
  const result = createParticleData8D(positions8D, faceIndices, 16);
  result.edges = edges;
  result.vertices8D = vertices;
  return result;
}

export function generateOctaSphereParticles(radius: number, density: number, mode: ProjectionMode8D): ParticleData8D {
  const positions8D: number[] = [];
  const faceIndices: number[] = [];
  
  const numSurface = Math.max(300, Math.floor(density * density * 2));
  const numInterior = mode === 'solid' ? Math.floor(density * density) : 0;
  
  for (let i = 0; i < numSurface; i++) {
    const coords: number[] = [];
    for (let d = 0; d < 8; d++) {
      const u1 = Math.random(), u2 = Math.random();
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      coords.push(r * Math.cos(2 * Math.PI * u2));
    }
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    if (len > 0) {
      for (let d = 0; d < 8; d++) coords[d] = (coords[d] / len) * radius;
      positions8D.push(...coords);
      faceIndices.push(Math.floor(i / numSurface * 16));
    }
  }
  
  for (let i = 0; i < numInterior; i++) {
    const coords: number[] = [];
    for (let d = 0; d < 8; d++) {
      const u1 = Math.random(), u2 = Math.random();
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      coords.push(r * Math.cos(2 * Math.PI * u2));
    }
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    const r = Math.pow(Math.random(), 1/8) * radius;
    if (len > 0) {
      for (let d = 0; d < 8; d++) coords[d] = (coords[d] / len) * r;
      positions8D.push(...coords);
      faceIndices.push(0);
    }
  }
  
  return createParticleData8D(positions8D, faceIndices, 16);
}

export function rotate8D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const c = [pos[0], pos[1], pos[2], pos[3], pos[4], pos[5], pos[6], pos[7]];
  const idx: Record<string, [number, number]> = {
    'xy': [0, 1], 'xz': [0, 2], 'xw': [0, 3], 'xv': [0, 4], 'xu': [0, 5], 'xt': [0, 6], 'xr': [0, 7],
    'yz': [1, 2], 'yw': [1, 3], 'yv': [1, 4], 'yu': [1, 5], 'yt': [1, 6], 'yr': [1, 7],
    'zw': [2, 3], 'zv': [2, 4], 'zu': [2, 5], 'zt': [2, 6], 'zr': [2, 7],
    'wv': [3, 4], 'wu': [3, 5], 'wt': [3, 6], 'wr': [3, 7],
    'vu': [4, 5], 'vt': [4, 6], 'vr': [4, 7],
    'ut': [5, 6], 'ur': [5, 7],
    'tr': [6, 7]
  };
  const [i, j] = idx[plane] || [0, 1];
  pos[i] = c[i] * cos - c[j] * sin;
  pos[j] = c[i] * sin + c[j] * cos;
}

export function project8Dto3D(pos8D: Float32Array, out: Float32Array, distances: [number, number, number, number, number] = [7, 6, 5, 4, 3]): void {
  let [x, y, z, w, v, u, t, r] = pos8D;
  
  const scale1 = Math.max(0.1, Math.min(10, distances[0] / (distances[0] - r)));
  x *= scale1; y *= scale1; z *= scale1; w *= scale1; v *= scale1; u *= scale1; t *= scale1;
  
  const scale2 = Math.max(0.1, Math.min(10, distances[1] / (distances[1] - t)));
  x *= scale2; y *= scale2; z *= scale2; w *= scale2; v *= scale2; u *= scale2;
  
  const scale3 = Math.max(0.1, Math.min(10, distances[2] / (distances[2] - u)));
  x *= scale3; y *= scale3; z *= scale3; w *= scale3; v *= scale3;
  
  const scale4 = Math.max(0.1, Math.min(10, distances[3] / (distances[3] - v)));
  x *= scale4; y *= scale4; z *= scale4; w *= scale4;
  
  const scale5 = Math.max(0.1, Math.min(10, distances[4] / (distances[4] - w)));
  out[0] = x * scale5;
  out[1] = y * scale5;
  out[2] = z * scale5;
}

export function stereographicProject8Dto3D(pos8D: Float32Array, out: Float32Array): void {
  const denom = 1 - pos8D[7] * 0.5;
  const scale = Math.abs(denom) < 0.001 ? 5 : 1 / denom;
  out[0] = pos8D[0] * scale;
  out[1] = pos8D[1] * scale;
  out[2] = pos8D[2] * scale;
}

export function generate8DShapeParticles(shape: Shape8DType, size: number, density: number, mode: ProjectionMode8D): ParticleData8D {
  switch (shape) {
    case 'octeract': return generateOcteractParticles(size, density, mode);
    case 'octaSimplex': return generateOctaSimplexParticles(size, density, mode);
    case 'octaOrthoplex': return generateOctaOrthoplexParticles(size, density, mode);
    case 'octaSphere': return generateOctaSphereParticles(size, density, mode);
    default: return generateOcteractParticles(size, density, mode);
  }
}

export function get8DShapeInfo(shape: Shape8DType): { name: string; description: string } {
  const info: Record<Shape8DType, { name: string; description: string }> = {
    octeract: { name: 'Octeract', description: '8D Hypercube - 256 vertices, 1024 edges' },
    octaSimplex: { name: '8-Simplex', description: 'Enneazetton - 9 vertices, 36 edges' },
    octaOrthoplex: { name: '8-Orthoplex', description: 'Octacross - 16 vertices, 112 edges' },
    octaSphere: { name: '8-Sphere', description: 'All points equidistant from center in 8D' },
  };
  return info[shape];
}
