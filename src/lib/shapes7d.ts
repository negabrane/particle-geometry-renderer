/**
 * 7D Geometry utilities for particle visualization
 * Generates 7D particle positions projected to 3D for visualization
 * 
 * 7D shapes are projected through multiple stages:
 * 7D -> 6D -> 5D -> 4D -> 3D (for display)
 * 
 * Rotation is supported on all 21 7D planes:
 * xy, xz, xw, xv, xu, xs, yz, yw, yv, yu, ys, zw, zv, zu, zs, wv, wu, ws, vu, vs, us
 */

export type Shape7DType = 'hepteract' | 'heptaSimplex' | 'heptaOrthoplex' | 'heptaSphere';

export type ProjectionMode7D = 'wireframe' | 'stereographic' | 'solid';

export interface ParticleData7D {
  positions: Float32Array;      // 3D positions for display
  positions7D: Float32Array;    // Original 7D positions
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices7D?: number[][];
}

/**
 * Create 7D particle data from positions array
 */
function createParticleData7D(positions7D: number[], faceIndices: number[], faceCount: number): ParticleData7D {
  const count = positions7D.length / 7;
  if (count === 0 || !Number.isFinite(count)) {
    const fallback: number[] = [];
    const fallbackFaces: number[] = [];
    for (let i = 0; i < 100; i++) {
      for (let d = 0; d < 7; d++) fallback.push(0);
      fallbackFaces.push(0);
    }
    return {
      positions: new Float32Array(100 * 3),
      positions7D: new Float32Array(fallback),
      faceIndices: new Float32Array(fallbackFaces),
      faceCount: 1,
      count: 100,
    };
  }
  
  const pos7DArray = new Float32Array(positions7D);
  const pos3DArray = new Float32Array(count * 3);
  const faceArray = new Float32Array(faceIndices);
  
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos7DArray[i * 7];
    pos3DArray[i * 3 + 1] = pos7DArray[i * 7 + 1];
    pos3DArray[i * 3 + 2] = pos7DArray[i * 7 + 2];
  }
  
  return {
    positions: pos3DArray,
    positions7D: pos7DArray,
    faceIndices: faceArray,
    faceCount,
    count,
  };
}

/**
 * Generate wireframe from edges with particle density
 */
function generateWireframe7DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData7D {
  const positions7D: number[] = [];
  const faceIndices: number[] = [];
  
  let edgeIdx = 0;
  const edgeDensity = Math.max(3, Math.floor(density / 3));
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions7D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6])
      );
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  for (const v of vertices) {
    positions7D.push(...v);
    faceIndices.push(edgeIdx);
  }
  
  const result = createParticleData7D(positions7D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices7D = vertices;
  return result;
}

/**
 * Generate solid particles for 7D hypercube
 * Samples particles on the 6D boundary faces with reasonable density limits
 */
function generateSolidHepteract(vertices: number[][], edges: [number, number][], size: number, density: number): ParticleData7D {
  const positions7D: number[] = [];
  const faceIndices: number[] = [];
  
  const s = size;
  
  // For 7D, we need to limit density to avoid memory issues
  // Each face is 6D, so surfaceDensity^6 particles per face
  // Limit to max 4 particles per dimension to get 4^6 = 4096 per face max
  const surfaceDensity = Math.max(2, Math.min(4, Math.floor(density / 8)));
  const edgeDensity = Math.max(2, Math.floor(density / 8));
  
  let faceIdx = 0;
  
  // 1. Generate particles on 14 boundary 6-cubes (7 dimensions × 2 faces each)
  for (let dim = 0; dim < 7; dim++) {
    for (const sign of [-1, 1]) {
      // Fill a 6D cube on this boundary
      const step = (2 * s) / Math.max(1, surfaceDensity - 1);
      
      // Use nested loops for 6 dimensions (skipping the fixed dimension)
      const indices = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== dim);
      
      for (let i0 = 0; i0 < surfaceDensity; i0++) {
        for (let i1 = 0; i1 < surfaceDensity; i1++) {
          for (let i2 = 0; i2 < surfaceDensity; i2++) {
            for (let i3 = 0; i3 < surfaceDensity; i3++) {
              for (let i4 = 0; i4 < surfaceDensity; i4++) {
                for (let i5 = 0; i5 < surfaceDensity; i5++) {
                  const coords: number[] = [];
                  let idx = 0;
                  for (let d = 0; d < 7; d++) {
                    if (d === dim) {
                      coords.push(sign * s);
                    } else {
                      const ii = [i0, i1, i2, i3, i4, i5][idx];
                      coords.push(-s + ii * step);
                      idx++;
                    }
                  }
                  positions7D.push(...coords);
                  faceIndices.push(faceIdx % 14);
                }
              }
            }
          }
        }
      }
      faceIdx++;
    }
  }
  
  // 2. Add edge particles for structure
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions7D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6])
      );
      faceIndices.push(0);
    }
  }
  
  // 3. Add vertices
  for (const v of vertices) {
    positions7D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData7D(positions7D, faceIndices, 14);
  result.edges = edges;
  result.vertices7D = vertices;
  return result;
}

/**
 * Generate particles for a Hepteract (7D hypercube)
 * 128 vertices, 448 edges, 14 6D cubic cells
 */
export function generateHepteractParticles(size: number, density: number, mode: ProjectionMode7D): ParticleData7D {
  const s = size;
  
  // 128 vertices of 7-cube
  const vertices: number[][] = [];
  for (let i = 0; i < 128; i++) {
    vertices.push([
      (i & 1) ? s : -s,
      (i & 2) ? s : -s,
      (i & 4) ? s : -s,
      (i & 8) ? s : -s,
      (i & 16) ? s : -s,
      (i & 32) ? s : -s,
      (i & 64) ? s : -s
    ]);
  }
  
  // 448 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 128; i++) {
    for (let j = i + 1; j < 128; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4 || xor === 8 || xor === 16 || xor === 32 || xor === 64) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe7DFromEdges(vertices, edges, density);
  }
  
  return generateSolidHepteract(vertices, edges, size, density);
}

/**
 * Generate particles for a 7-Simplex (Octaexon)
 * 8 vertices, 28 edges
 */
export function generateHeptaSimplexParticles(size: number, density: number, mode: ProjectionMode7D): ParticleData7D {
  const s = size * 1.5;
  
  // 8 vertices of regular 7-simplex
  const vertices: number[][] = [];
  for (let i = 0; i < 8; i++) {
    const v: number[] = [];
    for (let j = 0; j < 7; j++) {
      if (i < 7) {
        v.push(i === j ? 1 : -1/7);
      } else {
        v.push(-1/7);
      }
    }
    vertices.push(v);
  }
  
  // Normalize and scale
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map(c => (c / len) * s);
  });
  
  // 28 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe7DFromEdges(scaledVertices, edges, density);
  }
  
  // Solid mode - fill simplex volume
  const positions7D: number[] = [];
  const faceIndices: number[] = [];
  
  const edgeDensity = Math.max(2, Math.floor(density / 5));
  // Limit interior density to prevent memory issues with 7 nested loops
  const interiorDensity = Math.max(2, Math.min(4, Math.floor(density / 8)));
  
  // Edge particles
  let idx = 0;
  for (const [i, j] of edges) {
    const v0 = scaledVertices[i];
    const v1 = scaledVertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions7D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6])
      );
      faceIndices.push(idx % 8);
    }
    idx++;
  }
  
  // Interior particles using barycentric coordinates
  for (let i0 = 0; i0 <= interiorDensity; i0++) {
    for (let i1 = 0; i1 <= interiorDensity - i0; i1++) {
      for (let i2 = 0; i2 <= interiorDensity - i0 - i1; i2++) {
        for (let i3 = 0; i3 <= interiorDensity - i0 - i1 - i2; i3++) {
          for (let i4 = 0; i4 <= interiorDensity - i0 - i1 - i2 - i3; i4++) {
            for (let i5 = 0; i5 <= interiorDensity - i0 - i1 - i2 - i3 - i4; i5++) {
              for (let i6 = 0; i6 <= interiorDensity - i0 - i1 - i2 - i3 - i4 - i5; i6++) {
                const i7 = interiorDensity - i0 - i1 - i2 - i3 - i4 - i5 - i6;
                
                if (i7 >= 0) {
                  const total = interiorDensity;
                  const bary = [i0, i1, i2, i3, i4, i5, i6, i7].map(x => x / total);
                  
                  const point: number[] = [];
                  for (let d = 0; d < 7; d++) {
                    let coord = 0;
                    for (let v = 0; v < 8; v++) {
                      coord += bary[v] * scaledVertices[v][d];
                    }
                    point.push(coord);
                  }
                  positions7D.push(...point);
                  faceIndices.push(idx % 8);
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Add vertices
  for (const v of scaledVertices) {
    positions7D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData7D(positions7D, faceIndices, 8);
  result.edges = edges;
  result.vertices7D = scaledVertices;
  return result;
}

/**
 * Generate particles for a 7-Orthoplex (Heptacross)
 * 14 vertices, 84 edges
 */
export function generateHeptaOrthoplexParticles(size: number, density: number, mode: ProjectionMode7D): ParticleData7D {
  const s = size;
  
  // 14 vertices - on each axis
  const vertices: number[][] = [];
  for (let dim = 0; dim < 7; dim++) {
    const v1 = [0, 0, 0, 0, 0, 0, 0];
    const v2 = [0, 0, 0, 0, 0, 0, 0];
    v1[dim] = s;
    v2[dim] = -s;
    vertices.push(v1, v2);
  }
  
  // 84 edges - each vertex connects to all except its opposite
  const edges: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    for (let j = i + 1; j < 14; j++) {
      if (Math.floor(i / 2) !== Math.floor(j / 2)) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe7DFromEdges(vertices, edges, density);
  }
  
  // Solid mode - fill with particles
  const positions7D: number[] = [];
  const faceIndices: number[] = [];
  
  const edgeDensity = Math.max(3, Math.floor(density / 4));
  const interiorCount = Math.floor(density * density);
  
  // Edge particles
  let idx = 0;
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions7D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5]),
        v0[6] + alpha * (v1[6] - v0[6])
      );
      faceIndices.push(idx % 14);
    }
    idx++;
  }
  
  // Interior particles - sample within L1 ball
  for (let i = 0; i < interiorCount; i++) {
    const point: number[] = [];
    let sum = 0;
    for (let d = 0; d < 7; d++) {
      const u = Math.random() * 2 - 1;
      point.push(u);
      sum += Math.abs(u);
    }
    
    const scale = (Math.random() * s) / Math.max(sum, 0.001);
    for (let d = 0; d < 7; d++) {
      point[d] *= scale;
    }
    
    positions7D.push(...point);
    faceIndices.push(idx % 14);
  }
  
  // Add vertices
  for (const v of vertices) {
    positions7D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData7D(positions7D, faceIndices, 14);
  result.edges = edges;
  result.vertices7D = vertices;
  return result;
}

/**
 * Generate particles for a 7-Sphere (6-Sphere boundary)
 */
export function generateHeptaSphereParticles(radius: number, density: number, mode: ProjectionMode7D): ParticleData7D {
  const positions7D: number[] = [];
  const faceIndices: number[] = [];
  
  // Scale particle count with density
  const numSurface = Math.max(200, Math.floor(density * density * 2));
  const numInterior = mode === 'solid' ? Math.floor(density * density) : 0;
  const numBands = 16;
  
  // Surface particles using Gaussian distribution
  for (let i = 0; i < numSurface; i++) {
    const coords: number[] = [];
    for (let d = 0; d < 7; d++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      const theta = 2 * Math.PI * u2;
      coords.push(r * Math.cos(theta));
    }
    
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    if (len > 0 && Number.isFinite(len)) {
      for (let d = 0; d < 7; d++) {
        coords[d] = (coords[d] / len) * radius;
      }
      positions7D.push(...coords);
      
      const band = Math.floor(((coords[6] / radius) + 1) / 2 * numBands);
      faceIndices.push(Math.min(Math.max(0, band), numBands - 1));
    }
  }
  
  // Interior particles for solid mode
  for (let i = 0; i < numInterior; i++) {
    const coords: number[] = [];
    for (let d = 0; d < 7; d++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      const theta = 2 * Math.PI * u2;
      coords.push(r * Math.cos(theta));
    }
    
    const len = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
    const r = Math.pow(Math.random(), 1/7) * radius;
    if (len > 0 && Number.isFinite(len)) {
      for (let d = 0; d < 7; d++) {
        coords[d] = (coords[d] / len) * r;
      }
      positions7D.push(...coords);
      faceIndices.push(0);
    }
  }
  
  const result = createParticleData7D(positions7D, faceIndices, numBands);
  return result;
}

// ============================================================================
// ROTATION AND PROJECTION
// ============================================================================

/**
 * 7D rotation on a specified plane
 */
export function rotate7D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const x = pos[0], y = pos[1], z = pos[2], w = pos[3], v = pos[4], u = pos[5], s = pos[6];
  
  switch (plane) {
    case 'xy': pos[0] = x * cos - y * sin; pos[1] = x * sin + y * cos; break;
    case 'xz': pos[0] = x * cos - z * sin; pos[2] = x * sin + z * cos; break;
    case 'xw': pos[0] = x * cos - w * sin; pos[3] = x * sin + w * cos; break;
    case 'xv': pos[0] = x * cos - v * sin; pos[4] = x * sin + v * cos; break;
    case 'xu': pos[0] = x * cos - u * sin; pos[5] = x * sin + u * cos; break;
    case 'xs': pos[0] = x * cos - s * sin; pos[6] = x * sin + s * cos; break;
    case 'yz': pos[1] = y * cos - z * sin; pos[2] = y * sin + z * cos; break;
    case 'yw': pos[1] = y * cos - w * sin; pos[3] = y * sin + w * cos; break;
    case 'yv': pos[1] = y * cos - v * sin; pos[4] = y * sin + v * cos; break;
    case 'yu': pos[1] = y * cos - u * sin; pos[5] = y * sin + u * cos; break;
    case 'ys': pos[1] = y * cos - s * sin; pos[6] = y * sin + s * cos; break;
    case 'zw': pos[2] = z * cos - w * sin; pos[3] = z * sin + w * cos; break;
    case 'zv': pos[2] = z * cos - v * sin; pos[4] = z * sin + v * cos; break;
    case 'zu': pos[2] = z * cos - u * sin; pos[5] = z * sin + u * cos; break;
    case 'zs': pos[2] = z * cos - s * sin; pos[6] = z * sin + s * cos; break;
    case 'wv': pos[3] = w * cos - v * sin; pos[4] = w * sin + v * cos; break;
    case 'wu': pos[3] = w * cos - u * sin; pos[5] = w * sin + u * cos; break;
    case 'ws': pos[3] = w * cos - s * sin; pos[6] = w * sin + s * cos; break;
    case 'vu': pos[4] = v * cos - u * sin; pos[5] = v * sin + u * cos; break;
    case 'vs': pos[4] = v * cos - s * sin; pos[6] = v * sin + s * cos; break;
    case 'us': pos[5] = u * cos - s * sin; pos[6] = u * sin + s * cos; break;
  }
}

/**
 * Project 7D to 3D through multiple stages
 */
export function project7Dto3D(pos7D: Float32Array, out: Float32Array, distances: [number, number, number, number] = [6, 5, 4, 3]): void {
  const s = pos7D[6];
  const scale1 = distances[0] / (distances[0] - s);
  const clampedScale1 = Math.max(0.1, Math.min(10, scale1));
  
  const x6 = pos7D[0] * clampedScale1;
  const y6 = pos7D[1] * clampedScale1;
  const z6 = pos7D[2] * clampedScale1;
  const w6 = pos7D[3] * clampedScale1;
  const v6 = pos7D[4] * clampedScale1;
  const u6 = pos7D[5] * clampedScale1;
  
  const scale2 = distances[1] / (distances[1] - u6);
  const clampedScale2 = Math.max(0.1, Math.min(10, scale2));
  
  const x5 = x6 * clampedScale2;
  const y5 = y6 * clampedScale2;
  const z5 = z6 * clampedScale2;
  const w5 = w6 * clampedScale2;
  const v5 = v6 * clampedScale2;
  
  const scale3 = distances[2] / (distances[2] - v5);
  const clampedScale3 = Math.max(0.1, Math.min(10, scale3));
  
  const x4 = x5 * clampedScale3;
  const y4 = y5 * clampedScale3;
  const z4 = z5 * clampedScale3;
  const w4 = w5 * clampedScale3;
  
  const scale4 = distances[3] / (distances[3] - w4);
  const clampedScale4 = Math.max(0.1, Math.min(10, scale4));
  
  out[0] = x4 * clampedScale4;
  out[1] = y4 * clampedScale4;
  out[2] = z4 * clampedScale4;
}

/**
 * Stereographic projection 7D -> 3D
 */
export function stereographicProject7Dto3D(pos7D: Float32Array, out: Float32Array): void {
  const x = pos7D[0], y = pos7D[1], z = pos7D[2], w = pos7D[3], v = pos7D[4], u = pos7D[5], s = pos7D[6];
  
  const denom = 1 - s * 0.5;
  
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

/**
 * Generate particles for a given 7D shape type
 */
export function generate7DShapeParticles(
  shape: Shape7DType,
  size: number = 1,
  density: number = 15,
  mode: ProjectionMode7D = 'wireframe'
): ParticleData7D {
  switch (shape) {
    case 'hepteract': return generateHepteractParticles(size, density, mode);
    case 'heptaSimplex': return generateHeptaSimplexParticles(size, density, mode);
    case 'heptaOrthoplex': return generateHeptaOrthoplexParticles(size, density, mode);
    case 'heptaSphere': return generateHeptaSphereParticles(size, density, mode);
    default: return generateHepteractParticles(size, density, mode);
  }
}

/**
 * Get 7D shape metadata
 */
export function get7DShapeInfo(shape: Shape7DType): { name: string; description: string } {
  const info: Record<Shape7DType, { name: string; description: string }> = {
    hepteract: { name: 'Hepteract', description: '7D Hypercube - 128 vertices, 448 edges' },
    heptaSimplex: { name: '7-Simplex', description: 'Octaexon - 8 vertices, 28 edges' },
    heptaOrthoplex: { name: '7-Orthoplex', description: 'Heptacross - 14 vertices, 84 edges' },
    heptaSphere: { name: '7-Sphere', description: 'All points equidistant from center in 7D' },
  };
  return info[shape];
}
