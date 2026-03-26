/**
 * 6D Geometry utilities for particle visualization
 * Generates 6D particle positions projected to 3D for visualization
 * 
 * 6D shapes are projected through multiple stages:
 * 6D -> 5D -> 4D -> 3D (for display)
 * 
 * Rotation is supported on all 15 6D planes:
 * xy, xz, xw, xv, xu, yz, yw, yv, yu, zw, zv, zu, wv, wu, vu
 */

export type Shape6DType = 'hexeract' | 'hexaSimplex' | 'hexaOrthoplex' | 'hexaSphere';

export type ProjectionMode6D = 'wireframe' | 'stereographic' | 'solid';

export interface ParticleData6D {
  positions: Float32Array;      // 3D positions for display
  positions6D: Float32Array;    // Original 6D positions
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices6D?: number[][];
}

/**
 * Generate particles for a Hexeract (6D hypercube)
 * 64 vertices, 192 edges, 240 faces (squares), 160 cells (cubes), 60 tera (tesseracts), 12 penteracts
 */
export function generateHexeractParticles(size: number, density: number, mode: ProjectionMode6D): ParticleData6D {
  const s = size;
  
  // 64 vertices of 6-cube: all combinations of (±1, ±1, ±1, ±1, ±1, ±1)
  const vertices: number[][] = [];
  for (let i = 0; i < 64; i++) {
    vertices.push([
      (i & 1) ? s : -s,
      (i & 2) ? s : -s,
      (i & 4) ? s : -s,
      (i & 8) ? s : -s,
      (i & 16) ? s : -s,
      (i & 32) ? s : -s
    ]);
  }
  
  // 192 edges - vertices differ in exactly one coordinate
  const edges: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    for (let j = i + 1; j < 64; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4 || xor === 8 || xor === 16 || xor === 32) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe6DFromEdges(vertices, edges, density);
  }
  
  // Solid mode - generate particles on hyperfaces (5D boundaries)
  const positions6D: number[] = [];
  const faceIndices: number[] = [];
  
  // Scale density for solid mode to balance quality and performance
  const solidDensity = Math.max(3, Math.floor(density / 2));
  
  // 12 penteract boundaries (each dimension at ±s)
  let cellIdx = 0;
  const step = (2 * s) / Math.max(1, solidDensity - 1);
  
  for (let fixedDim = 0; fixedDim < 6; fixedDim++) {
    for (let sign = -1; sign <= 1; sign += 2) {
      for (let i = 0; i < solidDensity; i++) {
        for (let j = 0; j < solidDensity; j++) {
          for (let k = 0; k < solidDensity; k++) {
            for (let l = 0; l < solidDensity; l++) {
              const coords = [
                -s + i * step,
                -s + j * step,
                -s + k * step,
                -s + l * step,
                0,
                0
              ];
              coords[fixedDim] = sign * s;
              positions6D.push(...coords);
              faceIndices.push(cellIdx);
            }
          }
        }
      }
      cellIdx++;
    }
  }
  
  // Also add edge particles for structure
  const edgeDensity = Math.max(2, Math.floor(density / 4));
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions6D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5])
      );
      faceIndices.push(0);
    }
  }
  
  const result = createParticleData6D(positions6D, faceIndices, cellIdx);
  result.edges = edges;
  result.vertices6D = vertices;
  return result;
}

/**
 * Generate particles for a 6-Simplex (Heptapeton)
 * 7 vertices, 21 edges, 35 triangular faces, 35 tetrahedral cells, 21 5-cell cells, 7 5-simplex cells
 */
export function generateHexaSimplexParticles(size: number, density: number, mode: ProjectionMode6D): ParticleData6D {
  const s = size * 1.2;
  
  // 7 vertices of regular 6-simplex
  // Using standard construction centered at origin
  const vertices: number[][] = [];
  
  // Use coordinates from the 6-simplex construction
  // Vertices are permutations of specific coordinates
  for (let i = 0; i < 7; i++) {
    const v = [];
    for (let j = 0; j < 6; j++) {
      if (i < 6) {
        v.push(i === j ? 1 : -1/6);
      } else {
        v.push(-1/6);
      }
    }
    vertices.push(v);
  }
  
  // Normalize and scale
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map(c => (c / len) * s);
  });
  
  // 21 edges - all pairs
  const edges: [number, number][] = [];
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe6DFromEdges(scaledVertices, edges, density);
  }
  
  // Solid mode - generate particles on boundary
  const positions6D: number[] = [];
  const faceIndices: number[] = [];
  
  // 7 boundary 5-simplex cells (each defined by 6 vertices)
  const cells: number[][] = [];
  for (let i = 0; i < 7; i++) {
    const cell: number[] = [];
    for (let j = 0; j < 7; j++) {
      if (i !== j) cell.push(j);
    }
    cells.push(cell);
  }
  
  let cellIdx = 0;
  for (const cell of cells) {
    // Generate particles within each 5-simplex cell
    const subD = Math.max(2, Math.ceil(density / 2));
    
    for (let i = 0; i <= subD; i++) {
      for (let j = 0; j <= subD - i; j++) {
        for (let k = 0; k <= subD - i - j; k++) {
          for (let l = 0; l <= subD - i - j - k; l++) {
            for (let m = 0; m <= subD - i - j - k - l; m++) {
              const u = i / subD;
              const v = j / subD;
              const w = k / subD;
              const t = l / subD;
              const r = m / subD;
              
              if (u + v + w + t + r <= 1) {
                // Interpolate within the 5-simplex
                const v0 = scaledVertices[cell[0]];
                const v1 = scaledVertices[cell[1]];
                const v2 = scaledVertices[cell[2]];
                const v3 = scaledVertices[cell[3]];
                const v4 = scaledVertices[cell[4]];
                const v5 = scaledVertices[cell[5]];
                
                const pos = [
                  v0[0] + u * (v1[0] - v0[0]) + v * (v2[0] - v0[0]) + w * (v3[0] - v0[0]) + t * (v4[0] - v0[0]) + r * (v5[0] - v0[0]),
                  v0[1] + u * (v1[1] - v0[1]) + v * (v2[1] - v0[1]) + w * (v3[1] - v0[1]) + t * (v4[1] - v0[1]) + r * (v5[1] - v0[1]),
                  v0[2] + u * (v1[2] - v0[2]) + v * (v2[2] - v0[2]) + w * (v3[2] - v0[2]) + t * (v4[2] - v0[2]) + r * (v5[2] - v0[2]),
                  v0[3] + u * (v1[3] - v0[3]) + v * (v2[3] - v0[3]) + w * (v3[3] - v0[3]) + t * (v4[3] - v0[3]) + r * (v5[3] - v0[3]),
                  v0[4] + u * (v1[4] - v0[4]) + v * (v2[4] - v0[4]) + w * (v3[4] - v0[4]) + t * (v4[4] - v0[4]) + r * (v5[4] - v0[4]),
                  v0[5] + u * (v1[5] - v0[5]) + v * (v2[5] - v0[5]) + w * (v3[5] - v0[5]) + t * (v4[5] - v0[5]) + r * (v5[5] - v0[5]),
                ];
                
                positions6D.push(...pos);
                faceIndices.push(cellIdx);
              }
            }
          }
        }
      }
    }
    cellIdx++;
  }
  
  const result = createParticleData6D(positions6D, faceIndices, cellIdx);
  result.edges = edges;
  result.vertices6D = scaledVertices;
  return result;
}

/**
 * Generate particles for a 6-Orthoplex (Hexacross)
 * 12 vertices, 60 edges, 160 triangular faces, 240 tetrahedral cells, 192 5-cell cells, 64 5-simplex cells
 */
export function generateHexaOrthoplexParticles(size: number, density: number, mode: ProjectionMode6D): ParticleData6D {
  const s = size;
  
  // 12 vertices - on each axis: (±s, 0, 0, 0, 0, 0), (0, ±s, 0, 0, 0, 0), etc.
  const vertices: number[][] = [];
  for (let dim = 0; dim < 6; dim++) {
    const v1 = [0, 0, 0, 0, 0, 0];
    const v2 = [0, 0, 0, 0, 0, 0];
    v1[dim] = s;
    v2[dim] = -s;
    vertices.push(v1, v2);
  }
  
  // 60 edges - each vertex connects to all except its opposite
  const edges: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      // Skip opposite pairs (same axis, different sign)
      if (Math.floor(i / 2) !== Math.floor(j / 2)) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe6DFromEdges(vertices, edges, density);
  }
  
  // Solid mode - generate particles on boundary
  const positions6D: number[] = [];
  const faceIndices: number[] = [];
  
  // Generate by connecting vertices on edges
  let cellIdx = 0;
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions6D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5])
      );
      faceIndices.push(cellIdx);
    }
    cellIdx++;
  }
  
  // Add vertices
  for (const v of vertices) {
    positions6D.push(...v);
    faceIndices.push(cellIdx);
  }
  
  const result = createParticleData6D(positions6D, faceIndices, cellIdx + 1);
  result.edges = edges;
  result.vertices6D = vertices;
  return result;
}

/**
 * Generate particles for a 6-Sphere (5-Sphere boundary)
 */
export function generateHexaSphereParticles(radius: number, density: number, mode: ProjectionMode6D): ParticleData6D {
  const positions6D: number[] = [];
  const faceIndices: number[] = [];
  
  const numPoints = density * density * density * 8;
  const numBands = 16;
  
  // Use 6D spherical coordinates
  for (let i = 0; i < numPoints; i++) {
    // Random point on 5-sphere surface using normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();
    const u4 = Math.random();
    const u5 = Math.random();
    
    const theta1 = 2 * Math.PI * u1;
    const theta2 = 2 * Math.PI * u2;
    const theta3 = 2 * Math.PI * u3;
    const theta4 = 2 * Math.PI * u4;
    const phi1 = Math.acos(2 * u5 - 1);
    const phi2 = Math.acos(2 * Math.random() - 1);
    const phi3 = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi1) * Math.sin(phi2) * Math.sin(phi3) * Math.cos(theta1);
    const y = radius * Math.sin(phi1) * Math.sin(phi2) * Math.sin(phi3) * Math.sin(theta1);
    const z = radius * Math.sin(phi1) * Math.sin(phi2) * Math.cos(theta2);
    const w = radius * Math.sin(phi1) * Math.sin(phi2) * Math.sin(theta2);
    const v = radius * Math.sin(phi1) * Math.cos(phi3);
    const u = radius * Math.cos(phi1);
    
    positions6D.push(x, y, z, w, v, u);
    
    const band = Math.floor(((u / radius) + 1) / 2 * numBands);
    faceIndices.push(Math.min(band, numBands - 1));
  }
  
  return createParticleData6D(positions6D, faceIndices, numBands);
}

/**
 * Helper: Generate wireframe from edges
 */
function generateWireframe6DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData6D {
  const positions6D: number[] = [];
  const faceIndices: number[] = [];
  
  let edgeIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions6D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4]),
        v0[5] + alpha * (v1[5] - v0[5])
      );
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  // Add vertices
  for (const v of vertices) {
    positions6D.push(...v);
    faceIndices.push(edgeIdx);
  }
  
  const result = createParticleData6D(positions6D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices6D = vertices;
  return result;
}

/**
 * Create 6D particle data
 */
function createParticleData6D(positions6D: number[], faceIndices: number[], faceCount: number): ParticleData6D {
  const count = positions6D.length / 6;
  const pos6DArray = new Float32Array(positions6D);
  const pos3DArray = new Float32Array(count * 3);
  const faceArray = new Float32Array(faceIndices);
  
  // Initial projection: just take x, y, z
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos6DArray[i * 6];
    pos3DArray[i * 3 + 1] = pos6DArray[i * 6 + 1];
    pos3DArray[i * 3 + 2] = pos6DArray[i * 6 + 2];
  }
  
  return {
    positions: pos3DArray,
    positions6D: pos6DArray,
    faceIndices: faceArray,
    faceCount,
    count,
  };
}

/**
 * 6D rotation on a specified plane
 * Planes: xy, xz, xw, xv, xu, yz, yw, yv, yu, zw, zv, zu, wv, wu, vu (15 planes)
 */
export function rotate6D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const x = pos[0];
  const y = pos[1];
  const z = pos[2];
  const w = pos[3];
  const v = pos[4];
  const u = pos[5];
  
  switch (plane) {
    case 'xy':
      pos[0] = x * cos - y * sin;
      pos[1] = x * sin + y * cos;
      break;
    case 'xz':
      pos[0] = x * cos - z * sin;
      pos[2] = x * sin + z * cos;
      break;
    case 'xw':
      pos[0] = x * cos - w * sin;
      pos[3] = x * sin + w * cos;
      break;
    case 'xv':
      pos[0] = x * cos - v * sin;
      pos[4] = x * sin + v * cos;
      break;
    case 'xu':
      pos[0] = x * cos - u * sin;
      pos[5] = x * sin + u * cos;
      break;
    case 'yz':
      pos[1] = y * cos - z * sin;
      pos[2] = y * sin + z * cos;
      break;
    case 'yw':
      pos[1] = y * cos - w * sin;
      pos[3] = y * sin + w * cos;
      break;
    case 'yv':
      pos[1] = y * cos - v * sin;
      pos[4] = y * sin + v * cos;
      break;
    case 'yu':
      pos[1] = y * cos - u * sin;
      pos[5] = y * sin + u * cos;
      break;
    case 'zw':
      pos[2] = z * cos - w * sin;
      pos[3] = z * sin + w * cos;
      break;
    case 'zv':
      pos[2] = z * cos - v * sin;
      pos[4] = z * sin + v * cos;
      break;
    case 'zu':
      pos[2] = z * cos - u * sin;
      pos[5] = z * sin + u * cos;
      break;
    case 'wv':
      pos[3] = w * cos - v * sin;
      pos[4] = w * sin + v * cos;
      break;
    case 'wu':
      pos[3] = w * cos - u * sin;
      pos[5] = w * sin + u * cos;
      break;
    case 'vu':
      pos[4] = v * cos - u * sin;
      pos[5] = v * sin + u * cos;
      break;
  }
}

/**
 * Project 6D to 3D through multiple stages
 */
export function project6Dto3D(pos6D: Float32Array, out: Float32Array, distances: [number, number, number] = [5, 4, 3]): void {
  // First: 6D -> 5D
  const u = pos6D[5];
  const scale1 = distances[0] / (distances[0] - u);
  const clampedScale1 = Math.max(0.1, Math.min(10, scale1));
  
  const x5 = pos6D[0] * clampedScale1;
  const y5 = pos6D[1] * clampedScale1;
  const z5 = pos6D[2] * clampedScale1;
  const w5 = pos6D[3] * clampedScale1;
  const v5 = pos6D[4] * clampedScale1;
  
  // Second: 5D -> 4D
  const scale2 = distances[1] / (distances[1] - v5);
  const clampedScale2 = Math.max(0.1, Math.min(10, scale2));
  
  const x4 = x5 * clampedScale2;
  const y4 = y5 * clampedScale2;
  const z4 = z5 * clampedScale2;
  const w4 = w5 * clampedScale2;
  
  // Third: 4D -> 3D
  const scale3 = distances[2] / (distances[2] - w4);
  const clampedScale3 = Math.max(0.1, Math.min(10, scale3));
  
  out[0] = x4 * clampedScale3;
  out[1] = y4 * clampedScale3;
  out[2] = z4 * clampedScale3;
}

/**
 * Stereographic projection 6D -> 3D
 */
export function stereographicProject6Dto3D(pos6D: Float32Array, out: Float32Array): void {
  const x = pos6D[0];
  const y = pos6D[1];
  const z = pos6D[2];
  const w = pos6D[3];
  const v = pos6D[4];
  const u = pos6D[5];
  
  // Project from north pole through hyperplane
  const denom = 1 - u;
  
  if (Math.abs(denom) < 0.001) {
    out[0] = x * 50;
    out[1] = y * 50;
    out[2] = z * 50;
  } else {
    // Multi-stage stereographic
    const w3 = w / denom;
    const v3 = v / denom;
    const scale = 1 / (1 + w3 * w3 + v3 * v3);
    out[0] = x / denom * scale;
    out[1] = y / denom * scale;
    out[2] = z / denom * scale;
  }
}

/**
 * Generate particles for a given 6D shape type
 */
export function generate6DShapeParticles(
  shape: Shape6DType,
  size: number = 1,
  density: number = 15,
  mode: ProjectionMode6D = 'wireframe'
): ParticleData6D {
  switch (shape) {
    case 'hexeract':
      return generateHexeractParticles(size, density, mode);
    case 'hexaSimplex':
      return generateHexaSimplexParticles(size, density, mode);
    case 'hexaOrthoplex':
      return generateHexaOrthoplexParticles(size, density, mode);
    case 'hexaSphere':
      return generateHexaSphereParticles(size, density, mode);
    default:
      return generateHexeractParticles(size, density, mode);
  }
}

/**
 * Get 6D shape metadata
 */
export function get6DShapeInfo(shape: Shape6DType): { name: string; description: string } {
  const info: Record<Shape6DType, { name: string; description: string }> = {
    hexeract: { name: 'Hexeract', description: '6D Hypercube - 64 vertices, 192 edges' },
    hexaSimplex: { name: '6-Simplex', description: 'Heptapeton - 7 vertices, 21 edges' },
    hexaOrthoplex: { name: '6-Orthoplex', description: 'Hexacross - 12 vertices, 60 edges' },
    hexaSphere: { name: '6-Sphere', description: 'All points equidistant from center in 6D' },
  };
  return info[shape];
}
