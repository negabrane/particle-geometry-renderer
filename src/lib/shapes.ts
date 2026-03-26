/**
 * Geometry utilities for particle visualization
 * Generates particle positions for various 3D shapes
 * 
 * LINE THICKNESS: Affects particle density along edges, creating staggered lines
 * for visible thickness effect. Higher values = more parallel lines per edge.
 */

export type ShapeType = 'cube' | 'sphere' | 'tetrahedron' | 'torus' | 'octahedron' | 'dodecahedron' | 'icosahedron' | 'stellatedDodecahedron' | 'kleinBottle' | 'mobiusStrip' | 'torusKnot' | 'boySurface';

export type RenderMode = 'solid' | 'wireframe';

// Re-export honeycomb types
export type { HoneycombType } from './honeycombs';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  faceIndices: Float32Array;
  count: number;
  faceCount: number;
  edges?: [number, number][];
  vertices?: number[][];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add triangle particles using barycentric coordinates
 */
function addTriangleParticles(
  positions: number[],
  faceIndices: number[],
  v0: number[],
  v1: number[],
  v2: number[],
  faceIdx: number,
  density: number
): void {
  const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
  
  for (let i = 0; i <= density; i++) {
    for (let j = 0; j <= density - i; j++) {
      const u = i / density;
      const v = j / density;
      if (u + v <= 1) {
        positions.push(
          v0[0] + u * e1[0] + v * e2[0],
          v0[1] + u * e1[1] + v * e2[1],
          v0[2] + u * e1[2] + v * e2[2]
        );
        faceIndices.push(faceIdx);
      }
    }
  }
}

/**
 * Compute edges by distance between vertices
 */
function computeEdgesByDistance(vertices: number[][], minDist: number, maxDist: number): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[j][0] - vertices[i][0];
      const dy = vertices[j][1] - vertices[i][1];
      const dz = vertices[j][2] - vertices[i][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist >= minDist && dist <= maxDist) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

/**
 * Generate wireframe from edges with LINE THICKNESS support
 * Creates staggered parallel lines for visible thickness effect
 */
function generateWireframeFromEdges(
  vertices: number[][],
  edges: [number, number][],
  density: number,
  lineThickness: number = 1
): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Number of staggered lines per edge based on thickness
  const numStaggeredLines = Math.max(1, Math.ceil(lineThickness));
  
  // Calculate perpendicular offset direction for staggering
  // For a line from v0 to v1, the perpendicular is a random direction in the plane
  // perpendicular to the line direction
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    // Direction of the edge
    const dx = v1[0] - v0[0];
    const dy = v1[1] - v0[1];
    const dz = v1[2] - v0[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Create perpendicular vectors (any two perpendicular to the edge)
    // We'll use a consistent method to get perpendicular directions
    let perpX = 0, perpY = 0, perpZ = 0;
    if (Math.abs(dx) > 0.001) {
      perpY = 1;
      perpZ = 1;
      perpX = (-dy - dz) / dx;
    } else if (Math.abs(dy) > 0.001) {
      perpX = 1;
      perpZ = 1;
      perpY = (-dx - dz) / dy;
    } else {
      perpX = 1;
      perpY = 1;
      perpZ = (-dx - dy) / dz;
    }
    const perpLen = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
    if (perpLen > 0.001) {
      perpX /= perpLen;
      perpY /= perpLen;
      perpZ /= perpLen;
    }
    
    // Generate staggered lines
    for (let lineIdx = 0; lineIdx < numStaggeredLines; lineIdx++) {
      // Calculate offset for this line
      const offsetAmount = (lineIdx - (numStaggeredLines - 1) / 2) * 0.02;
      
      // Particles per line
      const particlesPerLine = Math.max(2, Math.ceil(density / Math.max(1, numStaggeredLines)));
      
      for (let t = 0; t <= particlesPerLine; t++) {
        const alpha = t / particlesPerLine;
        
        // Interpolate along edge
        const px = v0[0] + alpha * dx;
        const py = v0[1] + alpha * dy;
        const pz = v0[2] + alpha * dz;
        
        // Add perpendicular offset for thickness
        positions.push(
          px + offsetAmount * perpX,
          py + offsetAmount * perpY,
          pz + offsetAmount * perpZ
        );
        faceIndices.push(i * 100 + j);
      }
    }
  }
  
  // Add vertex particles
  for (const v of vertices) {
    positions.push(v[0], v[1], v[2]);
    faceIndices.push(vertices.length);
  }
  
  const result = createParticleData(positions, faceIndices, edges.length + 1);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Create particle data from positions and face indices
 */
function createParticleData(positions: number[], faceIndices: number[], faceCount: number): ParticleData {
  const count = positions.length / 3;
  if (count === 0) {
    // Return minimal cube to avoid empty renders
    const fallback: number[] = [];
    const fallbackFaces: number[] = [];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 10; j++) {
        fallback.push(0, 0, 0);
        fallbackFaces.push(0);
      }
    }
    return {
      positions: new Float32Array(fallback),
      colors: new Float32Array(60 * 3),
      sizes: new Float32Array(60),
      faceIndices: new Float32Array(fallbackFaces),
      count: 60,
      faceCount: 1,
    };
  }
  
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    faceIndices: new Float32Array(faceIndices),
    count,
    faceCount,
  };
}

// ============================================================================
// 3D SHAPE GENERATORS
// ============================================================================

/**
 * Generate particles on a cube surface
 */
export function generateCubeParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const s = size;
  const vertices: number[][] = [];
  for (let i = 0; i < 8; i++) {
    vertices.push([(i & 1) ? s : -s, (i & 2) ? s : -s, (i & 4) ? s : -s]);
  }
  
  // 12 edges of a cube
  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4) edges.push([i, j]);
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(vertices, edges, density, lineThickness);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const step = (2 * s) / Math.max(1, density - 1);
  
  // 6 faces of a cube
  for (let face = 0; face < 6; face++) {
    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const u = -s + i * step;
        const v = -s + j * step;
        let x: number, y: number, z: number;
        switch (face) {
          case 0: x = -s; y = u; z = v; break;
          case 1: x = s; y = u; z = v; break;
          case 2: x = u; y = -s; z = v; break;
          case 3: x = u; y = s; z = v; break;
          case 4: x = u; y = v; z = -s; break;
          default: x = u; y = v; z = s; break;
        }
        positions.push(x, y, z);
        faceIndices.push(face);
      }
    }
  }
  
  const result = createParticleData(positions, faceIndices, 6);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles on a sphere surface (Fibonacci sphere)
 */
export function generateSphereParticles(radius: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const numPoints = density * density * 2;
  const numBands = 16;
  
  for (let i = 0; i < numPoints; i++) {
    const y = 1 - (i / (numPoints - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    positions.push(
      Math.cos(theta) * radiusAtY * radius,
      y * radius,
      Math.sin(theta) * radiusAtY * radius
    );
    faceIndices.push(Math.min(Math.floor(((y + 1) / 2) * numBands), numBands - 1));
  }
  
  return createParticleData(positions, faceIndices, numBands);
}

/**
 * Generate particles on a tetrahedron surface
 */
export function generateTetrahedronParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const s = size;
  const vertices = [
    [s, s, s],
    [s, -s, -s],
    [-s, s, -s],
    [-s, -s, s]
  ];
  const edges: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(vertices, edges, density, lineThickness);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const faces = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
  
  for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
    const face = faces[faceIdx];
    addTriangleParticles(positions, faceIndices, vertices[face[0]], vertices[face[1]], vertices[face[2]], faceIdx, density);
  }
  
  const result = createParticleData(positions, faceIndices, 4);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles on a torus surface
 * Wireframe mode renders both major and minor circles
 */
export function generateTorusParticles(majorRadius: number, minorRadius: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const R = majorRadius;
  const r = minorRadius;
  
  if (mode === 'wireframe') {
    // For wireframe, render both major circles (the tube path) and minor circles (tube cross-sections)
    const positions: number[] = [];
    const faceIndices: number[] = [];
    const numMajor = Math.max(density, 24);
    const numMinor = Math.max(density, 12);
    const numRadial = Math.max(density, 12);
    
    // Major circles (around the torus tube) - multiple circles at different tube positions
    for (let i = 0; i < numMajor; i++) {
      const theta = (i / numMajor) * Math.PI * 2;
      const cx = R * Math.cos(theta);
      const cz = R * Math.sin(theta);
      
      // Draw a circle around this point (minor circle)
      for (let j = 0; j <= numRadial; j++) {
        const phi = (j / numRadial) * Math.PI * 2;
        const x = cx + r * Math.cos(phi) * Math.cos(theta);
        const y = r * Math.sin(phi);
        const z = cz + r * Math.cos(phi) * Math.sin(theta);
        positions.push(x, y, z);
        faceIndices.push(i);
      }
    }
    
    // Minor circles (cross-sections) - lines going around the major circle at fixed phi
    for (let j = 0; j < numMinor; j++) {
      const phi = (j / numMinor) * Math.PI * 2;
      for (let i = 0; i <= numMajor; i++) {
        const theta = (i / numMajor) * Math.PI * 2;
        const x = (R + r * Math.cos(phi)) * Math.cos(theta);
        const y = r * Math.sin(phi);
        const z = (R + r * Math.cos(phi)) * Math.sin(theta);
        positions.push(x, y, z);
        faceIndices.push(numMajor + j);
      }
    }
    
    return createParticleData(positions, faceIndices, numMajor + numMinor);
  }
  
  // Solid mode - fill the entire torus surface
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const numSegments = 16;
  
  for (let i = 0; i < density; i++) {
    for (let j = 0; j < density; j++) {
      const u = (i / density) * Math.PI * 2;
      const v = (j / density) * Math.PI * 2;
      positions.push(
        (R + r * Math.cos(v)) * Math.cos(u),
        r * Math.sin(v),
        (R + r * Math.cos(v)) * Math.sin(u)
      );
      faceIndices.push(Math.floor((i / density) * numSegments));
    }
  }
  
  return createParticleData(positions, faceIndices, numSegments);
}

/**
 * Generate particles on an octahedron surface
 */
export function generateOctahedronParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const s = size;
  const vertices = [
    [s, 0, 0], [-s, 0, 0],
    [0, s, 0], [0, -s, 0],
    [0, 0, s], [0, 0, -s]
  ];
  const edges: [number, number][] = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [2, 5], [3, 4], [3, 5]
  ];
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(vertices, edges, density, lineThickness);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  // 8 triangular faces of an octahedron
  const faces = [
    [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
    [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]
  ];
  
  for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
    const face = faces[faceIdx];
    addTriangleParticles(positions, faceIndices, vertices[face[0]], vertices[face[1]], vertices[face[2]], faceIdx, density);
  }
  
  const result = createParticleData(positions, faceIndices, 8);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles on a dodecahedron surface
 */
export function generateDodecahedronParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  
  // 20 vertices of a regular dodecahedron
  const vertices: number[][] = [
    // 8 vertices of a cube
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    // 4 vertices on yz plane
    [0, invPhi, phi], [0, invPhi, -phi], [0, -invPhi, phi], [0, -invPhi, -phi],
    // 4 vertices on xz plane
    [invPhi, phi, 0], [invPhi, -phi, 0], [-invPhi, phi, 0], [-invPhi, -phi, 0],
    // 4 vertices on xy plane
    [phi, 0, invPhi], [phi, 0, -invPhi], [-phi, 0, invPhi], [-phi, 0, -invPhi],
  ];
  
  const scaledVertices = vertices.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return v.map(c => (c / len) * size);
  });
  
  // 30 edges - each vertex connects to 3 others
  const edges: [number, number][] = computeEdgesByDistance(scaledVertices, size * 0.7, size * 1.0);
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(scaledVertices, edges, density, lineThickness);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // 12 pentagonal faces - each face connects 5 vertices
  const faces = [
    [0, 8, 10, 2, 16], [0, 16, 17, 1, 12], [0, 12, 14, 4, 8],
    [1, 17, 3, 11, 9], [1, 9, 5, 14, 12], [2, 10, 6, 15, 13],
    [2, 13, 3, 17, 16], [3, 13, 15, 7, 11], [4, 14, 5, 19, 18],
    [4, 18, 6, 10, 8], [5, 9, 11, 7, 19], [6, 18, 19, 7, 15],
  ];
  
  for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
    const face = faces[faceIdx];
    // Calculate center of pentagon
    let cx = 0, cy = 0, cz = 0;
    for (const vi of face) {
      cx += scaledVertices[vi][0];
      cy += scaledVertices[vi][1];
      cz += scaledVertices[vi][2];
    }
    cx /= 5; cy /= 5; cz /= 5;
    
    // Triangulate pentagon from center
    for (let tri = 0; tri < 5; tri++) {
      addTriangleParticles(
        positions, faceIndices,
        [cx, cy, cz],
        scaledVertices[face[tri]],
        scaledVertices[face[(tri + 1) % 5]],
        faceIdx,
        Math.max(2, Math.ceil(density / 2))
      );
    }
  }
  
  const result = createParticleData(positions, faceIndices, 12);
  result.edges = edges;
  result.vertices = scaledVertices;
  return result;
}

/**
 * Generate particles on an icosahedron surface
 */
export function generateIcosahedronParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const phi = (1 + Math.sqrt(5)) / 2;
  
  // 12 vertices of a regular icosahedron
  const rawVertices = [
    [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
    [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1],
  ];
  
  const vertices = rawVertices.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return v.map(c => (c / len) * size);
  });
  
  // 30 edges
  const edges: [number, number][] = computeEdgesByDistance(vertices, size * 0.9, size * 1.3);
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(vertices, edges, density, lineThickness);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // 20 triangular faces - compute from edge connectivity
  const faces: number[][] = [];
  for (let i = 0; i < 12; i++) {
    const neighbors: number[] = [];
    for (const [a, b] of edges) {
      if (a === i) neighbors.push(b);
      if (b === i) neighbors.push(a);
    }
    for (let j = 0; j < neighbors.length; j++) {
      for (let k = j + 1; k < neighbors.length; k++) {
        const n1 = neighbors[j], n2 = neighbors[k];
        const isEdge = edges.some(([a, b]) => (a === n1 && b === n2) || (a === n2 && b === n1));
        if (isEdge) {
          const face = [i, n1, n2].sort((a, b) => a - b);
          if (!faces.some(f => f[0] === face[0] && f[1] === face[1] && f[2] === face[2])) {
            faces.push([i, n1, n2]);
          }
        }
      }
    }
  }
  
  for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
    const face = faces[faceIdx];
    if (face && face.length === 3) {
      addTriangleParticles(positions, faceIndices, vertices[face[0]], vertices[face[1]], vertices[face[2]], faceIdx, density);
    }
  }
  
  const result = createParticleData(positions, faceIndices, faces.length);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles on a small stellated dodecahedron
 * 
 * The small stellated dodecahedron is a Kepler-Poinsot polyhedron with:
 * - 12 vertices (same positions as icosahedron)
 * - 30 edges (connecting vertices that form pentagrams, NOT nearest neighbors)
 * - 12 pentagram faces
 * 
 * CRITICAL: The vertices are the same as an icosahedron, but edges connect
 * DIFFERENTLY. In icosahedron, each vertex connects to 5 nearest neighbors.
 * In small stellated dodecahedron, each vertex connects to 5 "second-nearest"
 * neighbors (skipping the nearest), forming pentagram patterns.
 * 
 * Edge length ≈ circumradius * φ * 2/√(5+√5) where φ is golden ratio
 * This is LONGER than icosahedron edge length.
 */
export function generateStellatedDodecahedronParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618
  
  // The 12 vertices of the small stellated dodecahedron are the same as an icosahedron
  // Cyclic permutations of (0, ±1, ±φ)
  const rawVertices: number[][] = [
    // (0, ±1, ±φ) - 4 vertices
    [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
    // (±1, ±φ, 0) - 4 vertices
    [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
    // (±φ, 0, ±1) - 4 vertices
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1],
  ];
  
  // Scale vertices to desired size (normalize to circumradius = size)
  const vertices = rawVertices.map(v => {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return v.map(c => (c / len) * size);
  });
  
  // For the small stellated dodecahedron, we need to find edges by analyzing distances
  // Key insight: edges connect "second-nearest" neighbors, not nearest
  // First, compute all pairwise distances to find the two distance clusters
  const allDistances: { dist: number; i: number; j: number }[] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[j][0] - vertices[i][0];
      const dy = vertices[j][1] - vertices[i][1];
      const dz = vertices[j][2] - vertices[i][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      allDistances.push({ dist, i, j });
    }
  }
  
  // Sort by distance
  allDistances.sort((a, b) => a.dist - b.dist);
  
  // Find the two distance clusters
  // Icosahedron edges (nearest) ≈ size * 1.05
  // Stellated dodecahedron edges (second nearest) ≈ size * 1.70
  // Find the gap between clusters
  let gapIndex = 0;
  let maxGap = 0;
  for (let i = 1; i < allDistances.length; i++) {
    const gap = allDistances[i].dist - allDistances[i - 1].dist;
    if (gap > maxGap) {
      maxGap = gap;
      gapIndex = i;
    }
  }
  
  // The small stellated dodecahedron edges are the SECOND cluster (after the gap)
  const edges: [number, number][] = [];
  for (let i = gapIndex; i < Math.min(gapIndex + 30, allDistances.length); i++) {
    const { i: vi, j: vj } = allDistances[i];
    edges.push([vi, vj]);
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(vertices, edges, density, lineThickness);
  }
  
  // Solid mode: Generate particles on the pentagram faces
  // The small stellated dodecahedron has 12 pentagram faces
  // Each face is formed by 5 vertices arranged in a star pattern
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Build adjacency list from edges
  const adjacency: Map<number, number[]> = new Map();
  for (let i = 0; i < vertices.length; i++) {
    adjacency.set(i, []);
  }
  for (const [a, b] of edges) {
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  }
  
  // For the small stellated dodecahedron, find the 12 pentagram faces
  // Each pentagram face has 5 vertices that form a star pattern
  // Key insight: vertices of a pentagram face share a common "opposite" vertex
  // We can find faces by looking for sets of 5 vertices that are coplanar
  
  // Method: For each vertex, find the 5 faces it belongs to
  // A face is identified by vertices that are NOT directly connected but share a common neighbor
  
  const visitedFaces = new Set<string>();
  const faceList: number[][] = [];
  
  // The 12 pentagram faces can be identified by their geometric relationship
  // Each face normal points in one of 12 directions (same as dodecahedron faces)
  // Use the golden ratio relationship to identify face vertices
  
  // Alternative approach: find faces by looking at the star pattern
  // In a pentagram, each vertex has exactly 2 "face neighbors" for each face it belongs to
  // These are the vertices that are NOT directly connected to it but share a common neighbor
  
  // For each vertex, walk the star pattern to find faces
  for (let start = 0; start < vertices.length; start++) {
    const startNeighbors = adjacency.get(start) || [];
    
    // Each vertex belongs to 5 faces
    // For each pair of non-adjacent neighbors, find the face
    for (let i = 0; i < startNeighbors.length; i++) {
      for (let j = i + 1; j < startNeighbors.length; j++) {
        const n1 = startNeighbors[i];
        const n2 = startNeighbors[j];
        
        // n1 and n2 are both connected to start, but are they part of the same pentagram?
        // Check if n1 and n2 have a common neighbor that is NOT start
        const n1Neighbors = adjacency.get(n1) || [];
        const n2Neighbors = adjacency.get(n2) || [];
        
        for (const shared of n1Neighbors) {
          if (shared === start || shared === n2) continue;
          if (n2Neighbors.includes(shared)) {
            // Found a potential face: start-n1-shared-n2-?
            // Need to find the 5th vertex
            const sharedNeighbors = adjacency.get(shared) || [];
            
            for (const fifth of sharedNeighbors) {
              if (fifth === n1 || fifth === n2) continue;
              const fifthNeighbors = adjacency.get(fifth) || [];
              
              // Check if fifth connects to both n1 and n2 (completing the pentagram)
              if (fifthNeighbors.includes(n1) && fifthNeighbors.includes(n2)) {
                const face = [start, n1, shared, n2, fifth].sort((a, b) => a - b);
                const key = face.join('-');
                
                if (!visitedFaces.has(key)) {
                  visitedFaces.add(key);
                  // Store in original order for proper star traversal
                  faceList.push([start, n1, shared, n2, fifth]);
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Generate particles for each face
  let faceIdx = 0;
  
  for (const faceVertices of faceList) {
    const faceVerts = faceVertices.map(i => vertices[i]);
    
    // Calculate center of the pentagram
    const center: [number, number, number] = [0, 0, 0];
    for (const v of faceVerts) {
      center[0] += v[0];
      center[1] += v[1];
      center[2] += v[2];
    }
    center[0] /= 5;
    center[1] /= 5;
    center[2] /= 5;
    
    // Fill the pentagram with particles
    // Decompose into 5 triangles from center
    for (let e = 0; e < 5; e++) {
      const v0 = faceVerts[e];
      const v1 = faceVerts[(e + 1) % 5];
      
      addTriangleParticles(
        positions, faceIndices,
        center, v0, v1,
        faceIdx % 12,
        Math.max(3, Math.ceil(density / 2))
      );
    }
    faceIdx++;
  }
  
  // Also add edge particles for better definition
  const edgeDensity = Math.max(2, Math.ceil(density / 2));
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= edgeDensity; t++) {
      const alpha = t / edgeDensity;
      positions.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2])
      );
      faceIndices.push(0);
    }
  }
  
  // Add vertex particles
  for (const v of vertices) {
    positions.push(v[0], v[1], v[2]);
    faceIndices.push(0);
  }
  
  const result = createParticleData(positions, faceIndices, 12);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate Klein Bottle particles
 */
export function generateKleinBottleParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const numBands = 16;
  const actualDensity = Math.max(density, 20);
  
  for (let i = 0; i < actualDensity; i++) {
    for (let j = 0; j < actualDensity; j++) {
      const u = (i / actualDensity) * Math.PI * 2;
      const v = (j / actualDensity) * Math.PI * 2;
      
      // "Figure-8" Klein bottle immersion
      const r = 4 * (1 - Math.cos(u) / 2);
      let x: number, y: number, z: number;
      
      if (u < Math.PI) {
        x = 6 * Math.cos(u) * (1 + Math.sin(u)) + r * Math.cos(u) * Math.cos(v);
        y = 16 * Math.sin(u) + r * Math.sin(u) * Math.cos(v);
      } else {
        x = 6 * Math.cos(u) * (1 + Math.sin(u)) + r * Math.cos(v + Math.PI);
        y = 16 * Math.sin(u);
      }
      z = r * Math.sin(v);
      
      const scale = size * 0.04;
      positions.push(x * scale, y * scale, z * scale);
      faceIndices.push(Math.floor((i / actualDensity) * numBands));
    }
  }
  
  return createParticleData(positions, faceIndices, numBands);
}

/**
 * Generate Möbius Strip particles
 */
export function generateMobiusStripParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const numBands = 8;
  const actualDensity = Math.max(density, 24);
  
  for (let i = 0; i < actualDensity; i++) {
    for (let j = 0; j < actualDensity; j++) {
      const u = (i / actualDensity) * Math.PI * 2;
      const v = (j / actualDensity) * 2 - 1;
      
      const width = 0.5;
      const x = (1 + v * width * Math.cos(u / 2)) * Math.cos(u);
      const y = (1 + v * width * Math.cos(u / 2)) * Math.sin(u);
      const z = v * width * Math.sin(u / 2);
      
      positions.push(x * size, y * size, z * size);
      faceIndices.push(Math.floor((i / actualDensity) * numBands));
    }
  }
  
  return createParticleData(positions, faceIndices, numBands);
}

/**
 * Generate Torus Knot particles (Trefoil knot)
 */
export function generateTorusKnotParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const p = 2, q = 3; // Trefoil knot parameters
  const numBands = 12;
  const tubeRadius = 0.25;
  const actualDensity = Math.max(density, 20);
  
  for (let i = 0; i < actualDensity; i++) {
    for (let j = 0; j < actualDensity; j++) {
      const u = (i / actualDensity) * Math.PI * 2 * p;
      const v = (j / actualDensity) * Math.PI * 2;
      
      const r = 0.5 + tubeRadius * Math.cos(v);
      const x = r * Math.cos(q * u);
      const y = r * Math.sin(q * u);
      const z = tubeRadius * Math.sin(v) + 0.12 * Math.sin(p * u);
      
      positions.push(x * size * 1.5, y * size * 1.5, z * size * 1.5);
      faceIndices.push(Math.floor((i / actualDensity) * numBands));
    }
  }
  
  return createParticleData(positions, faceIndices, numBands);
}

/**
 * Generate Boy's Surface particles
 */
export function generateBoySurfaceParticles(size: number, density: number, mode: RenderMode = 'solid', lineThickness: number = 1): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  const numBands = 12;
  const actualDensity = Math.max(density, 20);
  
  for (let i = 0; i < actualDensity; i++) {
    for (let j = 0; j < actualDensity; j++) {
      const u = (i / actualDensity) * Math.PI;
      const v = (j / actualDensity) * Math.PI * 2;
      
      const cos_u = Math.cos(u);
      const sin_u = Math.sin(u);
      const cos_v = Math.cos(v);
      const sin_v = Math.sin(v);
      
      const a = sin_u * cos_v;
      const b = sin_u * sin_v;
      const c = cos_u;
      
      const denom = 1 + c * c + a * a + b * b;
      
      const x = (a * (1 + c * c - a * a - b * b)) / denom;
      const y = (b * (1 + c * c - a * a - b * b)) / denom;
      const z = (c * (1 + c * c - a * a - b * b)) / denom;
      
      positions.push(x * size * 1.5, y * size * 1.5, z * size * 1.5);
      faceIndices.push(Math.floor((i / actualDensity) * numBands));
    }
  }
  
  return createParticleData(positions, faceIndices, numBands);
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate particles for any 3D shape
 */
export function generateShapeParticles(
  shape: ShapeType,
  size: number = 1,
  density: number = 15,
  mode: RenderMode = 'solid',
  lineThickness: number = 1
): ParticleData {
  switch (shape) {
    case 'cube':
      return generateCubeParticles(size, density, mode, lineThickness);
    case 'sphere':
      return generateSphereParticles(size, density, mode, lineThickness);
    case 'tetrahedron':
      return generateTetrahedronParticles(size, density, mode, lineThickness);
    case 'torus':
      return generateTorusParticles(size, size * 0.4, density, mode, lineThickness);
    case 'octahedron':
      return generateOctahedronParticles(size, density, mode, lineThickness);
    case 'dodecahedron':
      return generateDodecahedronParticles(size, density, mode, lineThickness);
    case 'icosahedron':
      return generateIcosahedronParticles(size, density, mode, lineThickness);
    case 'stellatedDodecahedron':
      return generateStellatedDodecahedronParticles(size, density, mode, lineThickness);
    case 'kleinBottle':
      return generateKleinBottleParticles(size, density, mode, lineThickness);
    case 'mobiusStrip':
      return generateMobiusStripParticles(size, density, mode, lineThickness);
    case 'torusKnot':
      return generateTorusKnotParticles(size, density, mode, lineThickness);
    case 'boySurface':
      return generateBoySurfaceParticles(size, density, mode, lineThickness);
    default:
      return generateCubeParticles(size, density, mode, lineThickness);
  }
}

/**
 * Get shape information
 */
export function getShapeInfo(shape: ShapeType): { name: string; description: string } {
  const info: Record<ShapeType, { name: string; description: string }> = {
    cube: { name: 'Cube', description: '6 faces, 8 vertices, 12 edges' },
    sphere: { name: 'Sphere', description: 'Fibonacci sphere distribution' },
    tetrahedron: { name: 'Tetrahedron', description: '4 faces, 4 vertices, 6 edges' },
    torus: { name: 'Torus', description: 'Major and minor circles' },
    octahedron: { name: 'Octahedron', description: '8 triangular faces, 6 vertices' },
    dodecahedron: { name: 'Dodecahedron', description: '12 pentagonal faces, 20 vertices' },
    icosahedron: { name: 'Icosahedron', description: '20 triangular faces, 12 vertices' },
    stellatedDodecahedron: { name: 'Stellated Dodecahedron', description: 'Small stellated dodecahedron - 12 pentagram faces' },
    kleinBottle: { name: 'Klein Bottle', description: 'Non-orientable surface' },
    mobiusStrip: { name: 'Möbius Strip', description: 'One-sided surface' },
    torusKnot: { name: 'Torus Knot', description: 'Trefoil knot' },
    boySurface: { name: 'Boy Surface', description: 'Projective plane immersion' },
  };
  return info[shape];
}
