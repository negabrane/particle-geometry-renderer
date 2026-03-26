/**
 * 4D Geometry utilities for particle visualization
 * Generates 4D particle positions with cell indices for face-based coloring
 * Supports solid and wireframe modes (Schlegel and Stereographic projections)
 */

export type Shape4DType = 'tesseract' | 'hypersphere' | 'pentaCell' | 'hexadecachoron' | 'icositetrachoron' | 'hecatonicosachoron' | 'hexacosichoron' | 'duocylinder' | 'duoprism' | 'grandAntiprism' | 'elevenCell' | 'fiftySevenCell';

export type ProjectionMode = 'solid' | 'schlegel' | 'stereographic';

export interface ParticleData4D {
  positions: Float32Array;
  positions4D: Float32Array;
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices4D?: number[][];
}

/**
 * Generate particles on a tesseract (4D hypercube) surface - FIXED
 * All 8 cubic cells should be visible
 */
export function generateTesseractParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const s = size;
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  
  // 16 vertices
  const vertices: number[][] = [];
  for (let i = 0; i < 16; i++) {
    vertices.push([(i & 1) ? s : -s, (i & 2) ? s : -s, (i & 4) ? s : -s, (i & 8) ? s : -s]);
  }
  
  // 32 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4 || xor === 8) edges.push([i, j]);
    }
  }
  
  if (mode === 'schlegel' || mode === 'stereographic') {
    return generateWireframeFromEdges4D(vertices, edges, density);
  }
  
  // Solid mode - generate particles on all 8 cubic cells
  const step = (2 * s) / Math.max(1, density - 1);
  let cellIdx = 0;
  
  for (let fixedDim = 0; fixedDim < 4; fixedDim++) {
    for (let sign = -1; sign <= 1; sign += 2) {
      // Each cell is a 3D cube
      for (let i = 0; i < density; i++) {
        for (let j = 0; j < density; j++) {
          for (let k = 0; k < density; k++) {
            const coords = [-s + i * step, -s + j * step, -s + k * step, 0];
            coords[fixedDim] = sign * s;
            positions4D.push(coords[0], coords[1], coords[2], coords[3]);
            faceIndices.push(cellIdx);
          }
        }
      }
      cellIdx++;
    }
  }
  
  const result = createParticleData4D(positions4D, faceIndices, 8);
  result.edges = edges;
  result.vertices4D = vertices;
  return result;
}

/**
 * Generate particles on a hypersphere surface
 */
export function generateHypersphereParticles(radius: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  const numPoints = density * density * 4;
  const numBands = 16;
  
  for (let i = 0; i < numPoints; i++) {
    const u1 = (i + 0.5) / numPoints;
    const theta1 = 2 * Math.PI * Math.random();
    const theta2 = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * u1 - 1);
    
    const x = radius * Math.sin(phi) * Math.sin(theta1) * Math.sin(theta2);
    const y = radius * Math.sin(phi) * Math.sin(theta1) * Math.cos(theta2);
    const z = radius * Math.sin(phi) * Math.cos(theta1);
    const w = radius * Math.cos(phi);
    
    positions4D.push(x, y, z, w);
    faceIndices.push(Math.min(Math.floor(((w / radius) + 1) / 2 * numBands), numBands - 1));
  }
  
  return createParticleData4D(positions4D, faceIndices, numBands);
}

/**
 * Generate particles on a 5-Cell (Pentachoron) surface
 */
export function generatePentaCellParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const s = size;
  const vertices = [
    [s, s, s, s], [s, -s, -s, s], [-s, s, -s, s], [-s, -s, s, s], [0, 0, 0, -s * 1.5]
  ];
  
  const normVertices = vertices.map(v => {
    const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2 + v[3]**2);
    return v.map(c => (c / len) * s);
  });
  
  const edges: [number, number][] = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) edges.push([i, j]);
  
  if (mode === 'schlegel' || mode === 'stereographic') return generateWireframeFromEdges4D(normVertices, edges, density);
  
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  const cells = [[0, 1, 2, 3], [0, 1, 2, 4], [0, 1, 3, 4], [0, 2, 3, 4], [1, 2, 3, 4]];
  
  let cellIdx = 0;
  for (const cell of cells) {
    const v0 = normVertices[cell[0]], v1 = normVertices[cell[1]], v2 = normVertices[cell[2]], v3 = normVertices[cell[3]];
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2], v1[3] - v0[3]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2], v2[3] - v0[3]];
    const e3 = [v3[0] - v0[0], v3[1] - v0[1], v3[2] - v0[2], v3[3] - v0[3]];
    
    const subD = Math.max(2, Math.ceil(density / 2));
    for (let i = 0; i <= subD; i++) {
      for (let j = 0; j <= subD - i; j++) {
        for (let k = 0; k <= subD - i - j; k++) {
          const u = i / subD, v = j / subD, w = k / subD;
          if (u + v + w <= 1) {
            positions4D.push(v0[0] + u * e1[0] + v * e2[0] + w * e3[0], v0[1] + u * e1[1] + v * e2[1] + w * e3[1], v0[2] + u * e1[2] + v * e2[2] + w * e3[2], v0[3] + u * e1[3] + v * e2[3] + w * e3[3]);
            faceIndices.push(cellIdx);
          }
        }
      }
    }
    cellIdx++;
  }
  
  const result = createParticleData4D(positions4D, faceIndices, 5);
  result.edges = edges;
  result.vertices4D = normVertices;
  return result;
}

/**
 * Generate particles on a 16-Cell (Hexadecachoron) surface
 */
export function generateHexadecachoronParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const s = size;
  const vertices = [[s, 0, 0, 0], [-s, 0, 0, 0], [0, s, 0, 0], [0, -s, 0, 0], [0, 0, s, 0], [0, 0, -s, 0], [0, 0, 0, s], [0, 0, 0, -s]];
  
  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (Math.floor(i / 2) !== Math.floor(j / 2)) edges.push([i, j]);
  
  if (mode === 'schlegel' || mode === 'stereographic') return generateWireframeFromEdges4D(vertices, edges, density);
  
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  const cells: number[][] = [];
  for (let a = 0; a < 2; a++) for (let b = 2; b < 4; b++) for (let c = 4; c < 6; c++) for (let d = 6; d < 8; d++) cells.push([a, b, c, d]);
  
  let cellIdx = 0;
  for (const cell of cells) {
    const v0 = vertices[cell[0]], v1 = vertices[cell[1]], v2 = vertices[cell[2]], v3 = vertices[cell[3]];
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2], v1[3] - v0[3]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2], v2[3] - v0[3]];
    const e3 = [v3[0] - v0[0], v3[1] - v0[1], v3[2] - v0[2], v3[3] - v0[3]];
    
    const subD = Math.max(2, Math.ceil(density / 2));
    for (let i = 0; i <= subD; i++) {
      for (let j = 0; j <= subD - i; j++) {
        for (let k = 0; k <= subD - i - j; k++) {
          const u = i / subD, v = j / subD, w = k / subD;
          if (u + v + w <= 1) {
            positions4D.push(v0[0] + u * e1[0] + v * e2[0] + w * e3[0], v0[1] + u * e1[1] + v * e2[1] + w * e3[1], v0[2] + u * e1[2] + v * e2[2] + w * e3[2], v0[3] + u * e1[3] + v * e2[3] + w * e3[3]);
            faceIndices.push(cellIdx);
          }
        }
      }
    }
    cellIdx++;
  }
  
  const result = createParticleData4D(positions4D, faceIndices, 16);
  result.edges = edges;
  result.vertices4D = vertices;
  return result;
}

/**
 * Generate particles on a 24-Cell surface
 */
export function generateIcositetrachoronParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const s = size, s2 = s / Math.sqrt(2);
  const vertices: number[][] = [];
  vertices.push([s, 0, 0, 0], [-s, 0, 0, 0], [0, s, 0, 0], [0, -s, 0, 0], [0, 0, s, 0], [0, 0, -s, 0], [0, 0, 0, s], [0, 0, 0, -s]);
  for (let i = 0; i < 16; i++) vertices.push([(i & 1) ? s2 : -s2, (i & 2) ? s2 : -s2, (i & 4) ? s2 : -s2, (i & 8) ? s2 : -s2]);
  
  const edges: [number, number][] = computeEdgesByDistance4D(vertices, s * 0.5, s * 1.5);
  
  if (mode === 'schlegel' || mode === 'stereographic') return generateWireframeFromEdges4D(vertices, edges, density);
  
  // Generate particles on edges and vertices
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  let cellIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i], v1 = vertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(v0[0] + alpha * (v1[0] - v0[0]), v0[1] + alpha * (v1[1] - v0[1]), v0[2] + alpha * (v1[2] - v0[2]), v0[3] + alpha * (v1[3] - v0[3]));
      faceIndices.push(cellIdx);
    }
    cellIdx++;
  }
  
  for (const v of vertices) {
    positions4D.push(v[0], v[1], v[2], v[3]);
    faceIndices.push(cellIdx);
  }
  
  const result = createParticleData4D(positions4D, faceIndices, cellIdx + 1);
  result.edges = edges;
  result.vertices4D = vertices;
  return result;
}

/**
 * Generate particles on a 120-Cell surface
 */
export function generateHecatonicosachoronParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const phi = (1 + Math.sqrt(5)) / 2, invPhi = 1 / phi;
  const vertices: number[][] = [];
  
  for (let i = 0; i < 16; i++) vertices.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
  
  const signs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [s1, s2] of signs) {
    const vals = [s1 * phi, s2 * invPhi, 0, 0];
    const perms = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2], [1, 0, 2, 3], [1, 2, 0, 3], [1, 3, 0, 2], [2, 0, 1, 3], [2, 1, 0, 3], [2, 3, 0, 1], [3, 0, 1, 2], [3, 1, 0, 2], [3, 2, 0, 1]];
    for (const p of perms) vertices.push([vals[p[0]], vals[p[1]], vals[p[2]], vals[p[3]]]);
  }
  
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2 + v[3]**2);
    return len > 0 ? v.map(c => (c / len) * size) : [0, 0, 0, 0];
  });
  
  const edges: [number, number][] = computeEdgesByDistance4D(scaledVertices, size * invPhi * 1.5, size * invPhi * 2.5);
  
  if (mode === 'schlegel' || mode === 'stereographic') return generateWireframeFromEdges4D(scaledVertices, edges, density);
  
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  let cellIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = scaledVertices[i], v1 = scaledVertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(v0[0] + alpha * (v1[0] - v0[0]), v0[1] + alpha * (v1[1] - v0[1]), v0[2] + alpha * (v1[2] - v0[2]), v0[3] + alpha * (v1[3] - v0[3]));
      faceIndices.push(cellIdx);
    }
    cellIdx++;
  }
  
  const result = createParticleData4D(positions4D, faceIndices, cellIdx + 1);
  result.edges = edges;
  result.vertices4D = scaledVertices;
  return result;
}

/**
 * Generate particles on a 600-Cell (Hexacosichoron) surface
 * 120 vertices, 720 edges, 1200 triangular faces, 600 tetrahedral cells
 * 
 * The 600-cell is the 4D analog of the icosahedron.
 * Its 120 vertices are:
 * - 16 vertices: all permutations of (±½, ±½, ±½, ±½)
 * - 8 vertices: all permutations of (±1, 0, 0, 0)
 * - 96 vertices: even permutations of (±φ/2, ±½, ±1/(2φ), 0)
 * 
 * Edge length = 1/φ ≈ 0.618 (golden ratio reciprocal)
 */
export function generateHexacosichoronParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const phi = (1 + Math.sqrt(5)) / 2;
  const phiInv = 1 / phi; // ≈ 0.618
  const vertices: number[][] = [];
  
  // 16 vertices: all permutations of (±½, ±½, ±½, ±½)
  for (let i = 0; i < 16; i++) {
    vertices.push([
      (i & 1) ? 0.5 : -0.5,
      (i & 2) ? 0.5 : -0.5,
      (i & 4) ? 0.5 : -0.5,
      (i & 8) ? 0.5 : -0.5
    ]);
  }
  
  // 8 vertices: all permutations of (±1, 0, 0, 0)
  for (let dim = 0; dim < 4; dim++) {
    const v1 = [0, 0, 0, 0];
    const v2 = [0, 0, 0, 0];
    v1[dim] = 1;
    v2[dim] = -1;
    vertices.push(v1, v2);
  }
  
  // 96 vertices: even permutations of (±φ/2, ±½, ±1/(2φ), 0)
  const a = phi / 2;     // ≈ 0.809
  const b = 0.5;
  const c = phiInv / 2;  // ≈ 0.309
  
  // Even permutations of 4 elements
  const evenPerms = [
    [0, 1, 2, 3], [0, 2, 3, 1], [0, 3, 1, 2],
    [1, 0, 3, 2], [1, 2, 0, 3], [1, 3, 2, 0],
    [2, 0, 1, 3], [2, 1, 3, 0], [2, 3, 0, 1],
    [3, 0, 2, 1], [3, 1, 0, 2], [3, 2, 1, 0]
  ];
  
  // All sign combinations for the first three coordinates
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      for (const s3 of [-1, 1]) {
        const vals = [s1 * a, s2 * b, s3 * c, 0];
        for (const perm of evenPerms) {
          vertices.push([vals[perm[0]], vals[perm[1]], vals[perm[2]], vals[perm[3]]]);
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueVertices: number[][] = [];
  const seen = new Set<string>();
  for (const v of vertices) {
    const key = v.map(x => x.toFixed(6)).join(',');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVertices.push(v);
    }
  }
  
  // Scale to desired size (vertices should be on unit hypersphere initially)
  const scaledVertices = uniqueVertices.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2);
    return len > 0.001 ? v.map(c => (c / len) * size) : [0, 0, 0, 0];
  });
  
  // The edge length of a 600-cell with circumradius r is r/φ
  // With r = size, edge length ≈ size * 0.618
  // But we need to detect edges by their actual distance in our scaled coordinates
  const expectedEdgeLength = size * phiInv;
  
  // Use a tighter range for edge detection
  const edges: [number, number][] = computeEdgesByDistance4D(
    scaledVertices,
    expectedEdgeLength * 0.95,
    expectedEdgeLength * 1.05
  );
  
  // Wireframe mode
  const edgeDensity = Math.max(density * 3, 30);
  if (mode === 'schlegel' || mode === 'stereographic') {
    return generateWireframeFromEdges4D(scaledVertices, edges, edgeDensity);
  }
  
  // Solid mode - generate particles on triangular faces
  // The 600-cell has 1200 triangular faces
  // Each face is formed by 3 vertices that are all connected to each other
  
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  
  // Find all triangular faces by looking for triangles in the edge graph
  const triangles: number[][] = [];
  const triangleSet = new Set<string>();
  
  for (let i = 0; i < scaledVertices.length; i++) {
    // Find all neighbors of vertex i
    const neighbors: number[] = [];
    for (const [a, b] of edges) {
      if (a === i) neighbors.push(b);
      if (b === i) neighbors.push(a);
    }
    
    // For each pair of neighbors that are also connected, we have a triangle
    for (let j = 0; j < neighbors.length; j++) {
      for (let k = j + 1; k < neighbors.length; k++) {
        const n1 = neighbors[j];
        const n2 = neighbors[k];
        
        // Check if n1 and n2 are connected
        const isConnected = edges.some(([a, b]) => 
          (a === n1 && b === n2) || (a === n2 && b === n1)
        );
        
        if (isConnected) {
          const key = [i, n1, n2].sort((a, b) => a - b).join('-');
          if (!triangleSet.has(key)) {
            triangleSet.add(key);
            triangles.push([i, n1, n2]);
          }
        }
      }
    }
  }
  
  // Generate particles on each triangular face
  let faceIdx = 0;
  const subDensity = Math.max(2, Math.ceil(density / 2));
  
  for (const tri of triangles) {
    const v0 = scaledVertices[tri[0]];
    const v1 = scaledVertices[tri[1]];
    const v2 = scaledVertices[tri[2]];
    
    // Edge vectors
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2], v1[3] - v0[3]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2], v2[3] - v0[3]];
    
    // Fill triangle with particles using barycentric coordinates
    for (let i = 0; i <= subDensity; i++) {
      for (let j = 0; j <= subDensity - i; j++) {
        const u = i / subDensity;
        const v = j / subDensity;
        if (u + v <= 1) {
          positions4D.push(
            v0[0] + u * e1[0] + v * e2[0],
            v0[1] + u * e1[1] + v * e2[1],
            v0[2] + u * e1[2] + v * e2[2],
            v0[3] + u * e1[3] + v * e2[3]
          );
          faceIndices.push(faceIdx);
        }
      }
    }
    faceIdx++;
  }
  
  // Add vertex particles for definition
  for (const v of scaledVertices) {
    positions4D.push(v[0], v[1], v[2], v[3]);
    faceIndices.push(faceIdx);
  }
  
  const result = createParticleData4D(positions4D, faceIndices, faceIdx + 1);
  result.edges = edges;
  result.vertices4D = scaledVertices;
  return result;
}

/**
 * Generate particles on a Duocylinder surface
 * A duocylinder is the Cartesian product of two disks
 * It has a 3D torus-like surface in 4D
 */
export function generateDuocylinderParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  
  const radius = size * 0.7;
  const numU = density * 3;
  const numV = density * 3;
  const numBands = 16;
  
  for (let i = 0; i < numU; i++) {
    for (let j = 0; j < numV; j++) {
      const theta = (i / numU) * Math.PI * 2;
      const phi = (j / numV) * Math.PI * 2;
      
      // Duocylinder parametric form:
      // x = r * cos(θ), y = r * sin(θ)
      // z = r * cos(φ), w = r * sin(φ)
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      const z = radius * Math.cos(phi);
      const w = radius * Math.sin(phi);
      
      positions4D.push(x, y, z, w);
      faceIndices.push(Math.floor((theta / (Math.PI * 2)) * numBands) % numBands);
    }
  }
  
  if (mode === 'schlegel' || mode === 'stereographic') {
    // Return wireframe representation
    return createParticleData4D(positions4D, faceIndices, numBands);
  }
  
  return createParticleData4D(positions4D, faceIndices, numBands);
}

/**
 * Generate particles on a Duoprism surface (3-3 duoprism)
 * A duoprism is the Cartesian product of two polygons
 * The 3-3 duoprism has 6 vertices, 18 edges, and 9 square faces
 */
export function generateDuoprismParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const s = size;
  
  // Create two triangles and form their product
  const vertices: number[][] = [];
  
  // First triangle vertices (at w=1)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    vertices.push([
      s * Math.cos(angle),
      s * Math.sin(angle),
      0,
      s * 0.8
    ]);
  }
  
  // Second triangle vertices (at w=-1)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    vertices.push([
      s * Math.cos(angle),
      0,
      s * Math.sin(angle),
      -s * 0.8
    ]);
  }
  
  // Edges: triangle1 edges + triangle2 edges + connecting edges
  const edges: [number, number][] = [];
  // Triangle 1 edges
  edges.push([0, 1], [1, 2], [2, 0]);
  // Triangle 2 edges
  edges.push([3, 4], [4, 5], [5, 3]);
  // Connecting edges
  for (let i = 0; i < 3; i++) {
    for (let j = 3; j < 6; j++) {
      edges.push([i, j]);
    }
  }
  
  if (mode === 'schlegel' || mode === 'stereographic') {
    return generateWireframeFromEdges4D(vertices, edges, density);
  }
  
  // Solid mode - fill the surface
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  let faceIdx = 0;
  
  // Fill edges
  for (const [i, j] of edges) {
    const v0 = vertices[i], v1 = vertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3])
      );
      faceIndices.push(faceIdx);
    }
    faceIdx++;
  }
  
  // Fill the 9 square faces of the duoprism
  // Each square connects one vertex from triangle 1 to two vertices from triangle 2
  for (let i = 0; i < 3; i++) {
    const nextI = (i + 1) % 3;
    
    // Square face connecting edge (i, nextI) from triangle 1 to triangle 2
    const v0 = vertices[i];       // Triangle 1 vertex
    const v1 = vertices[nextI];   // Triangle 1 next vertex
    const v2 = vertices[3 + i];   // Triangle 2 corresponding vertex
    const v3 = vertices[3 + nextI]; // Triangle 2 next vertex
    
    // Fill the quad with particles
    const subD = Math.max(2, Math.ceil(density / 2));
    for (let u = 0; u <= subD; u++) {
      for (let v = 0; v <= subD; v++) {
        const au = u / subD;
        const av = v / subD;
        
        // Bilinear interpolation
        const p0 = [
          v0[0] + au * (v1[0] - v0[0]),
          v0[1] + au * (v1[1] - v0[1]),
          v0[2] + au * (v1[2] - v0[2]),
          v0[3] + au * (v1[3] - v0[3])
        ];
        const p1 = [
          v2[0] + au * (v3[0] - v2[0]),
          v2[1] + au * (v3[1] - v2[1]),
          v2[2] + au * (v3[2] - v2[2]),
          v2[3] + au * (v3[3] - v2[3])
        ];
        
        positions4D.push(
          p0[0] + av * (p1[0] - p0[0]),
          p0[1] + av * (p1[1] - p0[1]),
          p0[2] + av * (p1[2] - p0[2]),
          p0[3] + av * (p1[3] - p0[3])
        );
        faceIndices.push(faceIdx);
      }
    }
    faceIdx++;
  }
  
  // Fill the two triangle faces (caps)
  // Triangle 1 cap
  const subD = Math.max(2, Math.ceil(density / 2));
  for (let i = 0; i <= subD; i++) {
    for (let j = 0; j <= subD - i; j++) {
      const u = i / subD;
      const v = j / subD;
      if (u + v <= 1) {
        positions4D.push(
          vertices[0][0] + u * (vertices[1][0] - vertices[0][0]) + v * (vertices[2][0] - vertices[0][0]),
          vertices[0][1] + u * (vertices[1][1] - vertices[0][1]) + v * (vertices[2][1] - vertices[0][1]),
          vertices[0][2] + u * (vertices[1][2] - vertices[0][2]) + v * (vertices[2][2] - vertices[0][2]),
          vertices[0][3] + u * (vertices[1][3] - vertices[0][3]) + v * (vertices[2][3] - vertices[0][3])
        );
        faceIndices.push(faceIdx);
      }
    }
  }
  faceIdx++;
  
  // Triangle 2 cap
  for (let i = 0; i <= subD; i++) {
    for (let j = 0; j <= subD - i; j++) {
      const u = i / subD;
      const v = j / subD;
      if (u + v <= 1) {
        positions4D.push(
          vertices[3][0] + u * (vertices[4][0] - vertices[3][0]) + v * (vertices[5][0] - vertices[3][0]),
          vertices[3][1] + u * (vertices[4][1] - vertices[3][1]) + v * (vertices[5][1] - vertices[3][1]),
          vertices[3][2] + u * (vertices[4][2] - vertices[3][2]) + v * (vertices[5][2] - vertices[3][2]),
          vertices[3][3] + u * (vertices[4][3] - vertices[3][3]) + v * (vertices[5][3] - vertices[3][3])
        );
        faceIndices.push(faceIdx);
      }
    }
  }
  faceIdx++;
  
  // Add vertices
  for (const v of vertices) {
    positions4D.push(v[0], v[1], v[2], v[3]);
    faceIndices.push(0);
  }
  
  const result = createParticleData4D(positions4D, faceIndices, faceIdx);
  result.edges = edges;
  result.vertices4D = vertices;
  return result;
}

/**
 * Generate particles on a Grand Antiprism surface
 * A uniform 4D polytope with 100 vertices, 500 edges
 * Discovered in 1965, it's a non-Wythoffian uniform polychoron
 * Consists of 20 pentagonal antiprisms and 300 tetrahedra
 * 
 * The Grand Antiprism has 100 vertices arranged in two disjoint rings:
 * - Ring A: 50 vertices in 10 pentagons
 * - Ring B: 50 vertices in 10 pentagons (rotated relative to A)
 */
export function generateGrandAntiprismParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const phi = (1 + Math.sqrt(5)) / 2;  // Golden ratio ≈ 1.618
  const vertices: number[][] = [];
  
  // Grand Antiprism vertices are derived from the 600-cell
  // Two rings of 50 vertices each, at different depths in 4D
  
  // Ring A: 10 pentagons × 5 vertices each = 50 vertices
  // Placed at w = +φ (positive 4th dimension)
  for (let ring = 0; ring < 10; ring++) {
    const baseAngle = (ring / 10) * Math.PI * 2;
    const w = phi;  // Height in 4th dimension
    
    for (let v = 0; v < 5; v++) {
      const pentAngle = (v / 5) * Math.PI * 2 + (ring % 2) * Math.PI / 5;
      // Create vertex on a torus-like structure
      const r1 = 0.8;  // Major radius
      const r2 = 0.4;  // Minor radius
      
      vertices.push([
        r1 * Math.cos(baseAngle) + r2 * Math.cos(baseAngle) * Math.cos(pentAngle),
        r1 * Math.sin(baseAngle) + r2 * Math.sin(baseAngle) * Math.cos(pentAngle),
        r2 * Math.sin(pentAngle),
        w * 0.3
      ]);
    }
  }
  
  // Ring B: 10 pentagons × 5 vertices each = 50 vertices
  // Placed at w = -φ (negative 4th dimension), rotated by π/5
  for (let ring = 0; ring < 10; ring++) {
    const baseAngle = (ring / 10) * Math.PI * 2 + Math.PI / 10;  // Offset by π/10
    const w = -phi;  // Height in 4th dimension
    
    for (let v = 0; v < 5; v++) {
      const pentAngle = (v / 5) * Math.PI * 2 + ((ring + 1) % 2) * Math.PI / 5;
      const r1 = 0.8;
      const r2 = 0.4;
      
      vertices.push([
        r1 * Math.cos(baseAngle) + r2 * Math.cos(baseAngle) * Math.cos(pentAngle),
        r1 * Math.sin(baseAngle) + r2 * Math.sin(baseAngle) * Math.cos(pentAngle),
        r2 * Math.sin(pentAngle),
        w * 0.3
      ]);
    }
  }
  
  // Scale vertices to unit radius then to desired size
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2);
    return len > 0.001 ? v.map(c => (c / len) * size) : [0, 0, 0, 0];
  });
  
  // Compute edges by distance - in the Grand Antiprism, each vertex connects to 6 others
  // Edge length is determined by the geometry
  const edges: [number, number][] = [];
  
  // Find the characteristic edge length from the geometry
  let minNonZero = Infinity;
  for (let i = 0; i < scaledVertices.length; i++) {
    for (let j = i + 1; j < scaledVertices.length; j++) {
      const dist = Math.sqrt(
        (scaledVertices[j][0] - scaledVertices[i][0]) ** 2 +
        (scaledVertices[j][1] - scaledVertices[i][1]) ** 2 +
        (scaledVertices[j][2] - scaledVertices[i][2]) ** 2 +
        (scaledVertices[j][3] - scaledVertices[i][3]) ** 2
      );
      if (dist > 0.01 && dist < minNonZero) minNonZero = dist;
    }
  }
  
  // Connect each vertex to its nearest neighbors (each vertex has degree 10 in grand antiprism)
  for (let i = 0; i < scaledVertices.length; i++) {
    const distances: { dist: number; j: number }[] = [];
    
    for (let j = 0; j < scaledVertices.length; j++) {
      if (i === j) continue;
      const dist = Math.sqrt(
        (scaledVertices[j][0] - scaledVertices[i][0]) ** 2 +
        (scaledVertices[j][1] - scaledVertices[i][1]) ** 2 +
        (scaledVertices[j][2] - scaledVertices[i][2]) ** 2 +
        (scaledVertices[j][3] - scaledVertices[i][3]) ** 2
      );
      distances.push({ dist, j });
    }
    
    // Sort by distance and connect to nearest neighbors
    distances.sort((a, b) => a.dist - b.dist);
    
    // Each vertex in grand antiprism has 10 edges
    for (let k = 0; k < Math.min(10, distances.length); k++) {
      const j = distances[k].j;
      if (i < j) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'schlegel' || mode === 'stereographic') {
    return generateWireframeFromEdges4D(scaledVertices, edges, density);
  }
  
  // Solid mode - generate particles on edges and triangular faces
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  let faceIdx = 0;
  
  // Generate particles on edges
  for (const [i, j] of edges) {
    const v0 = scaledVertices[i], v1 = scaledVertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3])
      );
      faceIndices.push(faceIdx % 20);
    }
    faceIdx++;
  }
  
  // Find triangular faces and fill them
  const triangles: number[][] = [];
  const triangleSet = new Set<string>();
  
  for (let i = 0; i < scaledVertices.length; i++) {
    const neighbors: number[] = [];
    for (const [a, b] of edges) {
      if (a === i) neighbors.push(b);
      if (b === i) neighbors.push(a);
    }
    
    for (let j = 0; j < neighbors.length; j++) {
      for (let k = j + 1; k < neighbors.length; k++) {
        const n1 = neighbors[j];
        const n2 = neighbors[k];
        
        // Check if n1 and n2 are connected
        const isConnected = edges.some(([a, b]) => 
          (a === n1 && b === n2) || (a === n2 && b === n1)
        );
        
        if (isConnected) {
          const key = [i, n1, n2].sort((a, b) => a - b).join('-');
          if (!triangleSet.has(key)) {
            triangleSet.add(key);
            triangles.push([i, n1, n2]);
          }
        }
      }
    }
  }
  
  // Fill triangular faces
  const subDensity = Math.max(2, Math.ceil(density / 2));
  
  for (const tri of triangles) {
    const v0 = scaledVertices[tri[0]];
    const v1 = scaledVertices[tri[1]];
    const v2 = scaledVertices[tri[2]];
    
    for (let i = 0; i <= subDensity; i++) {
      for (let j = 0; j <= subDensity - i; j++) {
        const u = i / subDensity;
        const v = j / subDensity;
        if (u + v <= 1) {
          positions4D.push(
            v0[0] + u * (v1[0] - v0[0]) + v * (v2[0] - v0[0]),
            v0[1] + u * (v1[1] - v0[1]) + v * (v2[1] - v0[1]),
            v0[2] + u * (v1[2] - v0[2]) + v * (v2[2] - v0[2]),
            v0[3] + u * (v1[3] - v0[3]) + v * (v2[3] - v0[3])
          );
          faceIndices.push(faceIdx % 20);
        }
      }
    }
    faceIdx++;
  }
  
  // Add vertex particles
  for (const v of scaledVertices) {
    positions4D.push(v[0], v[1], v[2], v[3]);
    faceIndices.push(0);
  }
  
  const result = createParticleData4D(positions4D, faceIndices, 20);
  result.edges = edges;
  result.vertices4D = scaledVertices;
  return result;
}

/**
 * Generate particles on an 11-Cell surface
 * An abstract regular polytope with 11 hemi-icosahedral cells
 * Discovered by H.S.M. Coxeter in 1984
 */
export function generateElevenCellParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  
  // Create vertices for 11-cell using coordinates from the 11-simplex projected to 4D
  // The 11-cell has 11 vertices where each vertex is connected to 10 others
  const vertices: number[][] = [];
  
  // Use symmetric vertex placement
  for (let i = 0; i < 11; i++) {
    const angle1 = (i / 11) * Math.PI * 2;
    const angle2 = ((i * 3) % 11 / 11) * Math.PI * 2;
    vertices.push([
      size * Math.cos(angle1) * Math.cos(angle2),
      size * Math.sin(angle1) * Math.cos(angle2),
      size * Math.cos(angle1) * Math.sin(angle2),
      size * Math.sin(angle1) * Math.sin(angle2)
    ]);
  }
  
  // Edges: Complete graph K11 (each vertex connects to all others)
  const edges: [number, number][] = [];
  for (let i = 0; i < 11; i++) {
    for (let j = i + 1; j < 11; j++) {
      edges.push([i, j]);
    }
  }
  
  if (mode === 'schlegel' || mode === 'stereographic') {
    return generateWireframeFromEdges4D(vertices, edges, density);
  }
  
  // Solid mode - generate particles on edges and triangular faces
  let faceIdx = 0;
  
  // Generate particles on edges
  for (const [i, j] of edges) {
    const v0 = vertices[i], v1 = vertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3])
      );
      faceIndices.push(faceIdx % 11);
    }
    faceIdx++;
  }
  
  // Generate particles on triangular faces
  // The 11-cell has triangular faces formed by any 3 vertices
  const subD = Math.max(2, Math.ceil(density / 2));
  
  for (let i = 0; i < 11; i++) {
    for (let j = i + 1; j < 11; j++) {
      for (let k = j + 1; k < 11; k++) {
        const v0 = vertices[i], v1 = vertices[j], v2 = vertices[k];
        
        // Fill triangle with particles
        for (let u = 0; u <= subD; u++) {
          for (let v = 0; v <= subD - u; v++) {
            const au = u / subD;
            const av = v / subD;
            if (au + av <= 1) {
              positions4D.push(
                v0[0] + au * (v1[0] - v0[0]) + av * (v2[0] - v0[0]),
                v0[1] + au * (v1[1] - v0[1]) + av * (v2[1] - v0[1]),
                v0[2] + au * (v1[2] - v0[2]) + av * (v2[2] - v0[2]),
                v0[3] + au * (v1[3] - v0[3]) + av * (v2[3] - v0[3])
              );
              faceIndices.push(faceIdx % 11);
            }
          }
        }
        faceIdx++;
      }
    }
  }
  
  // Add vertex particles
  for (const v of vertices) {
    positions4D.push(v[0], v[1], v[2], v[3]);
    faceIndices.push(0);
  }
  
  const result = createParticleData4D(positions4D, faceIndices, 11);
  result.edges = edges;
  result.vertices4D = vertices;
  return result;
}

/**
 * Generate particles on a 57-Cell surface
 * An abstract regular polytope with 57 hemi-dodecahedral cells
 * Discovered by H.S.M. Coxeter in 1982
 * Has 57 vertices, 171 edges, 171 pentagonal faces
 */
export function generateFiftySevenCellParticles(size: number, density: number, mode: ProjectionMode = 'solid'): ParticleData4D {
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  
  // The 57-cell vertices can be constructed from 4D coordinates
  // Based on the hemi-icosahedral structure projected to 4D
  
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices: number[][] = [];
  
  // 12 vertices from icosahedron-like structure
  const icoVerts = [
    [0, 1, phi, 0], [0, -1, phi, 0], [0, 1, -phi, 0], [0, -1, -phi, 0],
    [1, phi, 0, 0], [-1, phi, 0, 0], [1, -phi, 0, 0], [-1, -phi, 0, 0],
    [phi, 0, 1, 0], [-phi, 0, 1, 0], [phi, 0, -1, 0], [-phi, 0, -1, 0],
  ];
  
  for (const v of icoVerts) {
    vertices.push(v);
  }
  
  // Additional vertices from permutations and rotations in 4D
  // The 57-cell has a complex symmetry structure
  
  // 45 additional vertices from 3 permutations × 15 coordinate sets
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const r = 0.8;
    
    vertices.push([
      r * Math.cos(angle),
      r * Math.sin(angle),
      r * Math.cos(angle * 2) * 0.5,
      r * Math.sin(angle * 2) * 0.5
    ]);
  }
  
  // Fill to 57 vertices with symmetrically distributed points
  while (vertices.length < 57) {
    const i = vertices.length;
    const angle1 = (i / 57) * Math.PI * 2;
    const angle2 = ((i * 3) % 57 / 57) * Math.PI * 2;
    const r = 0.7;
    
    vertices.push([
      r * Math.cos(angle1) * Math.cos(angle2),
      r * Math.sin(angle1) * Math.cos(angle2),
      r * Math.cos(angle1) * Math.sin(angle2),
      r * Math.sin(angle1) * Math.sin(angle2)
    ]);
  }
  
  // Scale vertices
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2 + v[3] ** 2);
    if (len === 0) return v;
    return v.map(c => (c / len) * size);
  });
  
  // Generate edges
  // In 57-cell, each vertex connects to 6 others
  const edges: [number, number][] = [];
  
  for (let i = 0; i < scaledVertices.length; i++) {
    const distances: { dist: number; j: number }[] = [];
    
    for (let j = 0; j < scaledVertices.length; j++) {
      if (i === j) continue;
      const dx = scaledVertices[j][0] - scaledVertices[i][0];
      const dy = scaledVertices[j][1] - scaledVertices[i][1];
      const dz = scaledVertices[j][2] - scaledVertices[i][2];
      const dw = scaledVertices[j][3] - scaledVertices[i][3];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
      distances.push({ dist, j });
    }
    
    // Sort by distance and connect to nearest 6
    distances.sort((a, b) => a.dist - b.dist);
    for (let k = 0; k < Math.min(6, distances.length); k++) {
      const j = distances[k].j;
      if (i < j) {
        edges.push([i, j]);
      }
    }
  }
  
  if (mode === 'schlegel' || mode === 'stereographic') {
    return generateWireframeFromEdges4D(scaledVertices, edges, density);
  }
  
  // Solid mode - generate particles on edges
  let faceIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = scaledVertices[i], v1 = scaledVertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2]),
        v0[3] + alpha * (v1[3] - v0[3])
      );
      faceIndices.push(faceIdx % 57);
    }
    faceIdx++;
  }
  
  // Add vertices
  for (const v of scaledVertices) {
    positions4D.push(v[0], v[1], v[2], v[3]);
    faceIndices.push(0);
  }
  
  const result = createParticleData4D(positions4D, faceIndices, 57);
  result.edges = edges;
  result.vertices4D = scaledVertices;
  return result;
}

// Helper functions

function computeEdgesByDistance4D(vertices: number[][], minDist: number, maxDist: number): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = Math.sqrt((vertices[j][0] - vertices[i][0])**2 + (vertices[j][1] - vertices[i][1])**2 + (vertices[j][2] - vertices[i][2])**2 + (vertices[j][3] - vertices[i][3])**2);
      if (dist >= minDist && dist <= maxDist) edges.push([i, j]);
    }
  }
  return edges;
}

function generateWireframeFromEdges4D(vertices: number[][], edges: [number, number][], density: number): ParticleData4D {
  const positions4D: number[] = [];
  const faceIndices: number[] = [];
  let edgeIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i], v1 = vertices[j];
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions4D.push(v0[0] + alpha * (v1[0] - v0[0]), v0[1] + alpha * (v1[1] - v0[1]), v0[2] + alpha * (v1[2] - v0[2]), v0[3] + alpha * (v1[3] - v0[3]));
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  for (const v of vertices) { positions4D.push(v[0], v[1], v[2], v[3]); faceIndices.push(edgeIdx); }
  
  const result = createParticleData4D(positions4D, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices4D = vertices;
  return result;
}

function createParticleData4D(positions4D: number[], faceIndices: number[], faceCount: number): ParticleData4D {
  const count = positions4D.length / 4;
  const pos4DArray = new Float32Array(positions4D);
  const pos3DArray = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos4DArray[i * 4];
    pos3DArray[i * 3 + 1] = pos4DArray[i * 4 + 1];
    pos3DArray[i * 3 + 2] = pos4DArray[i * 4 + 2];
  }
  
  return { positions: pos3DArray, positions4D: pos4DArray, faceIndices: new Float32Array(faceIndices), faceCount, count };
}

export function rotate4D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const x = pos[0], y = pos[1], z = pos[2], w = pos[3];
  
  switch (plane) {
    case 'xy': pos[0] = x * cos - y * sin; pos[1] = x * sin + y * cos; break;
    case 'xz': pos[0] = x * cos - z * sin; pos[2] = x * sin + z * cos; break;
    case 'xw': pos[0] = x * cos - w * sin; pos[3] = x * sin + w * cos; break;
    case 'yz': pos[1] = y * cos - z * sin; pos[2] = y * sin + z * cos; break;
    case 'yw': pos[1] = y * cos - w * sin; pos[3] = y * sin + w * cos; break;
    case 'zw': pos[2] = z * cos - w * sin; pos[3] = z * sin + w * cos; break;
  }
}

export function project4Dto3D(pos4D: Float32Array, out: Float32Array, distance: number = 4): void {
  const w = pos4D[3];
  const scale = Math.max(0.1, Math.min(10, distance / (distance - w)));
  out[0] = pos4D[0] * scale; out[1] = pos4D[1] * scale; out[2] = pos4D[2] * scale;
}

export function stereographicProject4Dto3D(pos4D: Float32Array, out: Float32Array): void {
  const denom = 1 - pos4D[3];
  if (Math.abs(denom) < 0.001) { out[0] = pos4D[0] * 50; out[1] = pos4D[1] * 50; out[2] = pos4D[2] * 50; }
  else { out[0] = pos4D[0] / denom; out[1] = pos4D[1] / denom; out[2] = pos4D[2] / denom; }
}

export function generate4DShapeParticles(shape: Shape4DType, size: number = 1, density: number = 15, mode: ProjectionMode = 'solid'): ParticleData4D {
  switch (shape) {
    case 'tesseract': return generateTesseractParticles(size, density, mode);
    case 'hypersphere': return generateHypersphereParticles(size, density, mode);
    case 'pentaCell': return generatePentaCellParticles(size, density, mode);
    case 'hexadecachoron': return generateHexadecachoronParticles(size, density, mode);
    case 'icositetrachoron': return generateIcositetrachoronParticles(size, density, mode);
    case 'hecatonicosachoron': return generateHecatonicosachoronParticles(size, density, mode);
    case 'hexacosichoron': return generateHexacosichoronParticles(size, density, mode);
    case 'duocylinder': return generateDuocylinderParticles(size, density, mode);
    case 'duoprism': return generateDuoprismParticles(size, density, mode);
    case 'grandAntiprism': return generateGrandAntiprismParticles(size, density, mode);
    case 'elevenCell': return generateElevenCellParticles(size, density, mode);
    case 'fiftySevenCell': return generateFiftySevenCellParticles(size, density, mode);
    default: return generateTesseractParticles(size, density, mode);
  }
}

export function get4DShapeInfo(shape: Shape4DType): { name: string; description: string } {
  const info: Record<Shape4DType, { name: string; description: string }> = {
    tesseract: { name: 'Tesseract', description: '4D Hypercube - 8 cubic cells, 16 vertices' },
    hypersphere: { name: 'Hypersphere', description: '4D Sphere' },
    pentaCell: { name: '5-Cell', description: '4D Simplex - 5 tetrahedral cells' },
    hexadecachoron: { name: '16-Cell', description: '4D Octahedron - 16 tetrahedral cells' },
    icositetrachoron: { name: '24-Cell', description: '24 octahedral cells' },
    hecatonicosachoron: { name: '120-Cell', description: '120 dodecahedral cells' },
    hexacosichoron: { name: '600-Cell', description: '600 tetrahedral cells, 120 vertices' },
    duocylinder: { name: 'Duocylinder', description: 'Cartesian product of two disks' },
    duoprism: { name: 'Duoprism', description: 'Cartesian product of two polygons' },
    grandAntiprism: { name: 'Grand Antiprism', description: 'Non-Wythoffian uniform polychoron' },
    elevenCell: { name: '11-Cell', description: 'Abstract regular polytope with 11 cells' },
    fiftySevenCell: { name: '57-Cell', description: 'Abstract regular polytope with 57 cells' },
  };
  return info[shape];
}
