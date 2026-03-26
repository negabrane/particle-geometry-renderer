/**
 * 5D Geometry utilities for particle visualization
 * Generates 5D particle positions projected to 3D for visualization
 * 
 * 5D shapes are projected through multiple stages:
 * 5D -> 4D -> 3D (for display)
 * 
 * Rotation is supported on all 10 5D planes (xy, xz, xw, xv, yz, yw, yv, zw, zv, wv)
 */

export type Shape5DType = 'penteract' | 'pentaSimplex' | 'pentaOrthoplex' | 'pentaSphere' | 'pentaDemicube';

export type ProjectionMode5D = 'solid' | 'wireframe' | 'stereographic';

export interface ParticleData5D {
  positions: Float32Array;      // 3D positions for display
  positions5D: Float32Array;    // Original 5D positions
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices5D?: number[][];
}

/**
 * Generate particles for a Penteract (5D hypercube)
 * 32 vertices, 80 edges, 80 faces (squares), 40 cells (cubes), 10 tera (tesseracts)
 */
export function generatePenteractParticles(size: number, density: number, mode: ProjectionMode5D): ParticleData5D {
  const s = size;
  
  // 32 vertices of 5-cube: all combinations of (±1, ±1, ±1, ±1, ±1)
  const vertices: number[][] = [];
  for (let i = 0; i < 32; i++) {
    vertices.push([
      (i & 1) ? s : -s,
      (i & 2) ? s : -s,
      (i & 4) ? s : -s,
      (i & 8) ? s : -s,
      (i & 16) ? s : -s
    ]);
  }
  
  // 80 edges - vertices differ in exactly one coordinate
  const edges: [number, number][] = [];
  for (let i = 0; i < 32; i++) {
    for (let j = i + 1; j < 32; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4 || xor === 8 || xor === 16) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe5DFromEdges(vertices, edges, density);
  }
  
  // Solid mode - generate particles on hyperfaces (tesseract boundaries)
  // Scale density for solid mode - higher dimension needs more particles
  const solidDensity = Math.max(3, Math.floor(density / 3));
  
  const positions5D: number[] = [];
  const faceIndices: number[] = [];
  
  // 10 tesseract boundaries (each dimension at ±s)
  let cellIdx = 0;
  const step = (2 * s) / Math.max(1, solidDensity - 1);
  
  for (let fixedDim = 0; fixedDim < 5; fixedDim++) {
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
                0
              ];
              coords[fixedDim] = sign * s;
              positions5D.push(...coords);
              faceIndices.push(cellIdx);
            }
          }
        }
      }
      cellIdx++;
    }
  }
  
  // Also add edge particles for structure
  const edgeDensity = Math.max(2, Math.floor(density / 5));
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions5D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4])
      );
      faceIndices.push(0);
    }
  }
  
  const result = createParticleData5D(positions5D, faceIndices, cellIdx);
  result.edges = edges;
  result.vertices5D = vertices;
  return result;
}

/**
 * Generate particles for a 5-Simplex (Hexateron)
 * 6 vertices, 15 edges, 20 triangular faces, 15 tetrahedral cells, 6 penteract cells
 */
export function generatePentaSimplexParticles(size: number, density: number, mode: ProjectionMode5D): ParticleData5D {
  const s = size * 1.2;
  
  // 6 vertices of regular 5-simplex using proper construction
  // The 5-simplex has 6 vertices, each equidistant from the center
  const vertices: number[][] = [];
  
  // Standard construction: vertices at unit distance from center
  // Use coordinates that give equal edge lengths
  const sqrt2 = Math.sqrt(2);
  const sqrt3 = Math.sqrt(3);
  const sqrt5 = Math.sqrt(5);
  const sqrt6 = Math.sqrt(6);
  const sqrt10 = Math.sqrt(10);
  const sqrt15 = Math.sqrt(15);
  
  // Proper 5-simplex vertices (normalized and scaled)
  vertices.push([1, 0, 0, 0, 0]);
  vertices.push([-1, 0, 0, 0, 0]);
  vertices.push([0, 2 * sqrt2 / 3, 0, 0, 0]);
  vertices.push([0, -sqrt2 / 3, sqrt6 / 3, 0, 0]);
  vertices.push([0, -sqrt2 / 3, -sqrt6 / 6, sqrt10 / 6, 0]);
  vertices.push([0, -sqrt2 / 3, -sqrt6 / 6, -sqrt10 / 12, sqrt15 / 12]);
  
  // Normalize and scale
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return v.map(c => (c / len) * s);
  });
  
  // 15 edges - all pairs
  const edges: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe5DFromEdges(scaledVertices, edges, density);
  }
  
  // Solid mode - generate particles on 5-simplex cells
  const positions5D: number[] = [];
  const faceIndices: number[] = [];
  
  // 6 cells (each is a 4-simplex, defined by 5 vertices)
  const cells: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const cell: number[] = [];
    for (let j = 0; j < 6; j++) {
      if (i !== j) cell.push(j);
    }
    cells.push(cell);
  }
  
  let cellIdx = 0;
  for (const cell of cells) {
    const v0 = scaledVertices[cell[0]];
    const v1 = scaledVertices[cell[1]];
    const v2 = scaledVertices[cell[2]];
    const v3 = scaledVertices[cell[3]];
    const v4 = scaledVertices[cell[4]];
    
    const e1 = sub5D(v1, v0);
    const e2 = sub5D(v2, v0);
    const e3 = sub5D(v3, v0);
    const e4 = sub5D(v4, v0);
    
    // Fill 4-simplex with particles
    const subD = Math.max(2, Math.ceil(density / 2));
    for (let i = 0; i <= subD; i++) {
      for (let j = 0; j <= subD - i; j++) {
        for (let k = 0; k <= subD - i - j; k++) {
          for (let l = 0; l <= subD - i - j - k; l++) {
            const u = i / subD;
            const v = j / subD;
            const w = k / subD;
            const t = l / subD;
            
            if (u + v + w + t <= 1) {
              positions5D.push(
                v0[0] + u * e1[0] + v * e2[0] + w * e3[0] + t * e4[0],
                v0[1] + u * e1[1] + v * e2[1] + w * e3[1] + t * e4[1],
                v0[2] + u * e1[2] + v * e2[2] + w * e3[2] + t * e4[2],
                v0[3] + u * e1[3] + v * e2[3] + w * e3[3] + t * e4[3],
                v0[4] + u * e1[4] + v * e2[4] + w * e3[4] + t * e4[4]
              );
              faceIndices.push(cellIdx);
            }
          }
        }
      }
    }
    cellIdx++;
  }
  
  const result = createParticleData5D(positions5D, faceIndices, cellIdx);
  result.edges = edges;
  result.vertices5D = scaledVertices;
  return result;
}

/**
 * Generate particles for a 5-Orthoplex (Pentacross)
 * 10 vertices, 40 edges, 80 triangular faces, 80 tetrahedral cells, 32 5-cell cells
 */
export function generatePentaOrthoplexParticles(size: number, density: number, mode: ProjectionMode5D): ParticleData5D {
  const s = size;
  
  // 10 vertices - on each axis: (±s, 0, 0, 0, 0), (0, ±s, 0, 0, 0), etc.
  const vertices: number[][] = [];
  for (let dim = 0; dim < 5; dim++) {
    const v1 = [0, 0, 0, 0, 0];
    const v2 = [0, 0, 0, 0, 0];
    v1[dim] = s;
    v2[dim] = -s;
    vertices.push(v1, v2);
  }
  
  // 40 edges - each vertex connects to all except its opposite
  const edges: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    for (let j = i + 1; j < 10; j++) {
      // Skip opposite pairs (same axis, different sign)
      if (Math.floor(i / 2) !== Math.floor(j / 2)) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe5DFromEdges(vertices, edges, density);
  }
  
  // Solid mode - generate particles on boundary facets
  const positions5D: number[] = [];
  const faceIndices: number[] = [];
  
  // Generate particles on triangular facets (each facet is a 4-simplex)
  // 32 facets, each defined by choosing one vertex from each of 4 axes
  let cellIdx = 0;
  
  // For each combination of 4 axes (out of 5), and each sign combination
  const axes = [0, 1, 2, 3, 4];
  
  for (let skipAxis = 0; skipAxis < 5; skipAxis++) {
    // Get the 4 axes we're using
    const usedAxes = axes.filter(a => a !== skipAxis);
    
    // For each combination of signs for the 4 used axes (2^4 = 16 combinations)
    for (let signCombo = 0; signCombo < 16; signCombo++) {
      // Get the 4 vertices for this facet
      const facetVertices: number[][] = [];
      for (let i = 0; i < 4; i++) {
        const axis = usedAxes[i];
        const sign = (signCombo & (1 << i)) ? 1 : -1;
        const vertexIndex = axis * 2 + (sign > 0 ? 0 : 1);
        facetVertices.push(vertices[vertexIndex]);
      }
      
      // Fill this 4-simplex with particles
      const v0 = facetVertices[0];
      const v1 = facetVertices[1];
      const v2 = facetVertices[2];
      const v3 = facetVertices[3];
      
      const e1 = sub5D(v1, v0);
      const e2 = sub5D(v2, v0);
      const e3 = sub5D(v3, v0);
      
      const subD = Math.max(2, Math.ceil(density / 2));
      for (let i = 0; i <= subD; i++) {
        for (let j = 0; j <= subD - i; j++) {
          for (let k = 0; k <= subD - i - j; k++) {
            const u = i / subD;
            const v = j / subD;
            const w = k / subD;
            
            if (u + v + w <= 1) {
              positions5D.push(
                v0[0] + u * e1[0] + v * e2[0] + w * e3[0],
                v0[1] + u * e1[1] + v * e2[1] + w * e3[1],
                v0[2] + u * e1[2] + v * e2[2] + w * e3[2],
                v0[3] + u * e1[3] + v * e2[3] + w * e3[3],
                v0[4] + u * e1[4] + v * e2[4] + w * e3[4]
              );
              faceIndices.push(cellIdx);
            }
          }
        }
      }
      cellIdx++;
    }
  }
  
  const result = createParticleData5D(positions5D, faceIndices, cellIdx);
  result.edges = edges;
  result.vertices5D = vertices;
  return result;
}

/**
 * Generate particles for a 5-Sphere (Glome)
 */
export function generatePentaSphereParticles(radius: number, density: number, mode: ProjectionMode5D): ParticleData5D {
  const positions5D: number[] = [];
  const faceIndices: number[] = [];
  
  // Use higher density for 5-sphere
  const numPoints = density * density * density * 6;
  const numBands = 16;
  
  // Use 5D spherical coordinates (Hopf-like distribution)
  for (let i = 0; i < numPoints; i++) {
    // Generate uniform points on 4-sphere surface using Gaussian distribution
    let x = 0, y = 0, z = 0, w = 0, v = 0;
    
    // Box-Muller for Gaussian
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();
    const u4 = Math.random();
    const u5 = Math.random();
    const u6 = Math.random();
    const u7 = Math.random();
    const u8 = Math.random();
    const u9 = Math.random();
    const u10 = Math.random();
    
    x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    y = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    z = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4);
    w = Math.sqrt(-2 * Math.log(u3)) * Math.sin(2 * Math.PI * u4);
    v = Math.sqrt(-2 * Math.log(u5)) * Math.cos(2 * Math.PI * u6);
    
    // Normalize to unit sphere
    const len = Math.sqrt(x * x + y * y + z * z + w * w + v * v);
    if (len > 0) {
      x = (x / len) * radius;
      y = (y / len) * radius;
      z = (z / len) * radius;
      w = (w / len) * radius;
      v = (v / len) * radius;
    }
    
    positions5D.push(x, y, z, w, v);
    
    const band = Math.floor(((v / radius) + 1) / 2 * numBands);
    faceIndices.push(Math.min(band, numBands - 1));
  }
  
  return createParticleData5D(positions5D, faceIndices, numBands);
}

/**
 * Generate particles for a 5-Demicube (Demipenteract)
 * The 5-demicube is a uniform 5-polytope constructed from the penteract by alternating vertices.
 * It has 16 vertices (half of the 32 penteract vertices) and 80 edges.
 * Vertices are those of the penteract with an even number of positive coordinates.
 */
export function generatePentaDemicubeParticles(size: number, density: number, mode: ProjectionMode5D): ParticleData5D {
  const s = size;
  
  // 16 vertices of the demipenteract - those with even number of +1 coordinates
  // From the 32 penteract vertices, select only those where bit_count(i) is even
  const vertices: number[][] = [];
  const vertexMap = new Map<number, number>(); // Map original index to new index
  
  for (let i = 0; i < 32; i++) {
    // Count bits (number of +1 coordinates)
    const bitCount = ((i & 1) ? 1 : 0) + ((i & 2) ? 1 : 0) + ((i & 4) ? 1 : 0) + 
                     ((i & 8) ? 1 : 0) + ((i & 16) ? 1 : 0);
    
    if (bitCount % 2 === 0) {
      vertexMap.set(i, vertices.length);
      vertices.push([
        (i & 1) ? s : -s,
        (i & 2) ? s : -s,
        (i & 4) ? s : -s,
        (i & 8) ? s : -s,
        (i & 16) ? s : -s
      ]);
    }
  }
  
  // Edges connect vertices that differ in exactly 2 coordinates (distance = 2*s*sqrt(2))
  // In the demicube, vertices that were connected in the penteract by a path of length 2
  // become directly connected
  const edges: [number, number][] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      // Check if vertices differ in exactly 2 coordinates
      let diffCount = 0;
      for (let d = 0; d < 5; d++) {
        if (Math.abs(vertices[i][d] - vertices[j][d]) > 0.1) {
          diffCount++;
        }
      }
      if (diffCount === 2) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'wireframe' || mode === 'stereographic') {
    return generateWireframe5DFromEdges(vertices, edges, density);
  }
  
  // Solid mode - edges + interior
  const positions5D: number[] = [];
  const faceIndices: number[] = [];
  
  const edgeDensity = Math.max(2, Math.floor(density / 4));
  
  // Edge particles
  let idx = 0;
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions5D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4])
      );
      faceIndices.push(idx % 16);
    }
    idx++;
  }
  
  // Interior particles - sample within the demicube volume
  const interiorCount = Math.floor(density * density / 4);
  for (let i = 0; i < interiorCount; i++) {
    // Sample uniformly within the inscribed sphere
    const coords: number[] = [];
    let sum = 0;
    for (let d = 0; d < 5; d++) {
      coords.push((Math.random() * 2 - 1) * s);
      sum += coords[d] * coords[d];
    }
    
    // Only include if within reasonable bounds
    const len = Math.sqrt(sum);
    if (len < s * 1.5) {
      positions5D.push(...coords);
      faceIndices.push(0);
    }
  }
  
  // Add vertices
  for (const v of vertices) {
    positions5D.push(...v);
    faceIndices.push(0);
  }
  
  const result = createParticleData5D(positions5D, faceIndices, 16);
  result.edges = edges;
  result.vertices5D = vertices;
  return result;
}

/**
 * Helper: Subtract two 5D vectors
 */
function sub5D(a: number[], b: number[]): number[] {
  return [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
    a[3] - b[3],
    a[4] - b[4]
  ];
}

/**
 * Helper: Generate wireframe from edges
 */
function generateWireframe5DFromEdges(vertices: number[][], edges: [number, number][], density: number): ParticleData5D {
  const positions5D: number[] = [];
  const faceIndices: number[] = [];
  
  let edgeIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions5D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3]),
        v0[4] + alpha * (v1[4] - v0[4])
      );
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  // Add vertices
  for (const v of vertices) {
    positions5D.push(...v);
    faceIndices.push(edgeIdx);
  }
  
  const result = createParticleData5D(positions5D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices5D = vertices;
  return result;
}

/**
 * Create 5D particle data
 */
function createParticleData5D(positions5D: number[], faceIndices: number[], faceCount: number): ParticleData5D {
  const count = positions5D.length / 5;
  const pos5DArray = new Float32Array(positions5D);
  const pos3DArray = new Float32Array(count * 3);
  const faceArray = new Float32Array(faceIndices);
  
  // Initial projection: just take x, y, z
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos5DArray[i * 5];
    pos3DArray[i * 3 + 1] = pos5DArray[i * 5 + 1];
    pos3DArray[i * 3 + 2] = pos5DArray[i * 5 + 2];
  }
  
  return {
    positions: pos3DArray,
    positions5D: pos5DArray,
    faceIndices: faceArray,
    faceCount,
    count,
  };
}

/**
 * 5D rotation on a specified plane
 * Planes: xy, xz, xw, xv, yz, yw, yv, zw, zv, wv (10 planes)
 */
export function rotate5D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const x = pos[0];
  const y = pos[1];
  const z = pos[2];
  const w = pos[3];
  const v = pos[4];
  
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
    case 'zw':
      pos[2] = z * cos - w * sin;
      pos[3] = z * sin + w * cos;
      break;
    case 'zv':
      pos[2] = z * cos - v * sin;
      pos[4] = z * sin + v * cos;
      break;
    case 'wv':
      pos[3] = w * cos - v * sin;
      pos[4] = w * sin + v * cos;
      break;
  }
}

/**
 * Project 5D to 4D using perspective projection
 */
export function project5Dto4D(pos5D: Float32Array, out: Float32Array, distance: number = 4): void {
  const v = pos5D[4];
  const scale = distance / (distance - v);
  const clampedScale = Math.max(0.1, Math.min(10, scale));
  
  out[0] = pos5D[0] * clampedScale;
  out[1] = pos5D[1] * clampedScale;
  out[2] = pos5D[2] * clampedScale;
  out[3] = pos5D[3] * clampedScale;
}

/**
 * Project 5D to 3D through 4D
 */
export function project5Dto3D(pos5D: Float32Array, out: Float32Array, distance5D: number = 4, distance4D: number = 3): void {
  // First: 5D -> 4D
  const v = pos5D[4];
  const scale1 = distance5D / (distance5D - v);
  const clampedScale1 = Math.max(0.1, Math.min(10, scale1));
  
  const x4 = pos5D[0] * clampedScale1;
  const y4 = pos5D[1] * clampedScale1;
  const z4 = pos5D[2] * clampedScale1;
  const w4 = pos5D[3] * clampedScale1;
  
  // Second: 4D -> 3D
  const scale2 = distance4D / (distance4D - w4);
  const clampedScale2 = Math.max(0.1, Math.min(10, scale2));
  
  out[0] = x4 * clampedScale2;
  out[1] = y4 * clampedScale2;
  out[2] = z4 * clampedScale2;
}

/**
 * Stereographic projection 5D -> 3D
 */
export function stereographicProject5Dto3D(pos5D: Float32Array, out: Float32Array): void {
  const x = pos5D[0];
  const y = pos5D[1];
  const z = pos5D[2];
  const w = pos5D[3];
  const v = pos5D[4];
  
  // Project from north pole (0,0,0,0,1) through w=0, v=0 hyperplane
  const denom = 1 - v;
  
  if (Math.abs(denom) < 0.001) {
    out[0] = x * 50;
    out[1] = y * 50;
    out[2] = z * 50;
  } else {
    // Project w first
    const w3 = w / denom;
    const scale = 1 / (1 + w3 * w3);
    out[0] = x / denom * scale;
    out[1] = y / denom * scale;
    out[2] = z / denom * scale;
  }
}

/**
 * Generate particles for a given 5D shape type
 */
export function generate5DShapeParticles(
  shape: Shape5DType,
  size: number = 1,
  density: number = 15,
  mode: ProjectionMode5D = 'wireframe'
): ParticleData5D {
  switch (shape) {
    case 'penteract':
      return generatePenteractParticles(size, density, mode);
    case 'pentaSimplex':
      return generatePentaSimplexParticles(size, density, mode);
    case 'pentaOrthoplex':
      return generatePentaOrthoplexParticles(size, density, mode);
    case 'pentaSphere':
      return generatePentaSphereParticles(size, density, mode);
    case 'pentaDemicube':
      return generatePentaDemicubeParticles(size, density, mode);
    default:
      return generatePenteractParticles(size, density, mode);
  }
}

/**
 * Get 5D shape metadata
 */
export function get5DShapeInfo(shape: Shape5DType): { name: string; description: string } {
  const info: Record<Shape5DType, { name: string; description: string }> = {
    penteract: { name: 'Penteract', description: '5D Hypercube - 32 vertices, 80 edges' },
    pentaSimplex: { name: '5-Simplex', description: 'Hexateron - 6 vertices, 15 edges' },
    pentaOrthoplex: { name: '5-Orthoplex', description: 'Pentacross - 10 vertices, 40 edges' },
    pentaSphere: { name: '5-Sphere', description: 'Glome - All points equidistant from center' },
    pentaDemicube: { name: '5-Demicube', description: 'Demipenteract - 16 vertices, 80 edges' },
  };
  return info[shape];
}
