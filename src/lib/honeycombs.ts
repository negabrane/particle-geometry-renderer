/**
 * Honeycomb (space-filling tessellation) generators for particle visualization
 * 
 * EUCLIDEAN HONEYCOMBS (5 Parallelohedra):
 * - Cubic honeycomb - cubes filling space
 * - Hexagonal prismatic honeycomb - hexagonal prisms in honeycomb pattern
 * - Rhombic dodecahedral honeycomb - rhombic dodecahedra filling space
 * - Elongated dodecahedral honeycomb - elongated dodecahedra filling space
 * - Bitruncated cubic honeycomb - truncated octahedra filling space
 * 
 * HYPERBOLIC HONEYCOMBS:
 * - Icosahedral honeycomb - icosahedra in hyperbolic space
 * - Order-5 cubic honeycomb - cubes with 5 around each edge
 * - Order-4 dodecahedral honeycomb - dodecahedra in hyperbolic space
 * - Order-5 dodecahedral honeycomb - dodecahedra with 5 around each edge
 * 
 * All honeycombs support:
 * - Finite bounded representation
 * - Wireframe and solid rendering modes
 * - Density control
 * - 2D, 3D, and 4D rotation
 */

export type HoneycombType = 
  // Euclidean (Parallelohedra)
  | 'cubicHoneycomb' 
  | 'hexagonalPrismatic' 
  | 'rhombicDodecahedral' 
  | 'elongatedDodecahedral' 
  | 'bitruncatedCubic'
  // Hyperbolic
  | 'icosahedralHoneycomb' 
  | 'order5Cubic' 
  | 'order4Dodecahedral' 
  | 'order5Dodecahedral';

export type RenderMode = 'solid' | 'wireframe';

export interface ParticleData {
  positions: Float32Array;
  positions4D?: Float32Array;
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

function createParticleData(positions: number[], faceIndices: number[], faceCount: number, positions4D?: number[]): ParticleData {
  const count = positions.length / 3;
  if (count === 0) {
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
    positions4D: positions4D ? new Float32Array(positions4D) : undefined,
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    faceIndices: new Float32Array(faceIndices),
    count,
    faceCount,
  };
}

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

function addQuadParticles(
  positions: number[],
  faceIndices: number[],
  v0: number[],
  v1: number[],
  v2: number[],
  v3: number[],
  faceIdx: number,
  density: number
): void {
  // Split quad into two triangles
  addTriangleParticles(positions, faceIndices, v0, v1, v2, faceIdx, density);
  addTriangleParticles(positions, faceIndices, v0, v2, v3, faceIdx, density);
}

function generateWireframeFromEdges(
  vertices: number[][],
  edges: [number, number][],
  density: number
): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1]),
        v0[2] + alpha * (v1[2] - v0[2])
      );
      faceIndices.push(i * 100 + j);
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

// ============================================================================
// EUCLIDEAN HONEYCOMBS (5 Parallelohedra)
// ============================================================================

/**
 * Cubic Honeycomb
 * The simplest space-filling tessellation - cubes filling 3D space
 * Each vertex has 8 cubes meeting
 */
export function generateCubicHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Create a 3x3x3 grid of cubes (27 cubes total)
  const gridSize = 2; // -1, 0, 1
  const cellSize = size * 0.6;
  let cellIdx = 0;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  const vertexMap = new Map<string, number>();
  
  for (let gx = -gridSize; gx <= gridSize; gx++) {
    for (let gy = -gridSize; gy <= gridSize; gy++) {
      for (let gz = -gridSize; gz <= gridSize; gz++) {
        const cx = gx * cellSize * 2;
        const cy = gy * cellSize * 2;
        const cz = gz * cellSize * 2;
        
        // Generate 8 vertices of this cube
        const cubeVertices: number[] = [];
        for (let i = 0; i < 8; i++) {
          const vx = cx + ((i & 1) ? cellSize : -cellSize);
          const vy = cy + ((i & 2) ? cellSize : -cellSize);
          const vz = cz + ((i & 4) ? cellSize : -cellSize);
          
          const key = `${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, allVertices.length);
            allVertices.push([vx, vy, vz]);
          }
          cubeVertices.push(vertexMap.get(key)!);
        }
        
        // Add edges (12 per cube, but will be deduplicated)
        const edgePairs = [
          [0, 1], [2, 3], [4, 5], [6, 7], // x edges
          [0, 2], [1, 3], [4, 6], [5, 7], // y edges
          [0, 4], [1, 5], [2, 6], [3, 7], // z edges
        ];
        
        for (const [a, b] of edgePairs) {
          const edgeKey = [Math.min(cubeVertices[a], cubeVertices[b]), Math.max(cubeVertices[a], cubeVertices[b])].join('-');
          // We'll deduplicate later
        }
        
        if (mode === 'solid') {
          // Generate face particles for each of 6 faces
          const s = cellSize;
          const step = (2 * s) / Math.max(1, Math.ceil(density / 3));
          
          for (let face = 0; face < 6; face++) {
            for (let i = 0; i < Math.ceil(density / 3); i++) {
              for (let j = 0; j < Math.ceil(density / 3); j++) {
                const u = -s + i * step;
                const v = -s + j * step;
                let x: number, y: number, z: number;
                switch (face) {
                  case 0: x = cx - s; y = cy + u; z = cz + v; break;
                  case 1: x = cx + s; y = cy + u; z = cz + v; break;
                  case 2: x = cx + u; y = cy - s; z = cz + v; break;
                  case 3: x = cx + u; y = cy + s; z = cz + v; break;
                  case 4: x = cx + u; y = cy + v; z = cz - s; break;
                  default: x = cx + u; y = cy + v; z = cz + s; break;
                }
                positions.push(x, y, z);
                faceIndices.push(cellIdx);
              }
            }
          }
        }
        cellIdx++;
      }
    }
  }
  
  if (mode === 'wireframe') {
    // Deduplicate edges
    const edgeSet = new Set<string>();
    for (let gx = -gridSize; gx <= gridSize; gx++) {
      for (let gy = -gridSize; gy <= gridSize; gy++) {
        for (let gz = -gridSize; gz <= gridSize; gz++) {
          const cx = gx * cellSize * 2;
          const cy = gy * cellSize * 2;
          const cz = gz * cellSize * 2;
          
          const cubeVertices: number[] = [];
          for (let i = 0; i < 8; i++) {
            const vx = cx + ((i & 1) ? cellSize : -cellSize);
            const vy = cy + ((i & 2) ? cellSize : -cellSize);
            const vz = cz + ((i & 4) ? cellSize : -cellSize);
            const key = `${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`;
            cubeVertices.push(vertexMap.get(key)!);
          }
          
          const edgePairs = [
            [0, 1], [2, 3], [4, 5], [6, 7],
            [0, 2], [1, 3], [4, 6], [5, 7],
            [0, 4], [1, 5], [2, 6], [3, 7],
          ];
          
          for (const [a, b] of edgePairs) {
            const eKey = `${Math.min(cubeVertices[a], cubeVertices[b])}-${Math.max(cubeVertices[a], cubeVertices[b])}`;
            if (!edgeSet.has(eKey)) {
              edgeSet.add(eKey);
              allEdges.push([cubeVertices[a], cubeVertices[b]]);
            }
          }
        }
      }
    }
    
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  const result = createParticleData(positions, faceIndices, cellIdx);
  result.vertices = allVertices;
  return result;
}

/**
 * Hexagonal Prismatic Honeycomb
 * Hexagonal prisms arranged in a honeycomb pattern
 * Most efficient way to partition space into equal volume cells
 */
export function generateHexagonalPrismaticHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Hexagonal prism parameters
  const radius = size * 0.35;
  const height = size * 0.5;
  
  // Create a bounded grid of hexagonal prisms
  const cellsPerRing = 2; // Number of rings around center
  let cellIdx = 0;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  const vertexMap = new Map<string, number>();
  
  // Generate hexagonal prism cells
  // Use axial coordinates for hexagonal grid
  for (let q = -cellsPerRing; q <= cellsPerRing; q++) {
    for (let r = -cellsPerRing; r <= cellsPerRing; r++) {
      if (Math.abs(q + r) > cellsPerRing) continue; // Stay within hexagonal boundary
      
      // Convert axial to cartesian coordinates
      const cx = size * 0.8 * (q + r / 2);
      const cy = 0;
      const cz = size * 0.7 * r;
      
      // Top and bottom hexagon vertices
      const hexTop: number[] = [];
      const hexBottom: number[] = [];
      
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = cx + radius * Math.cos(angle);
        const hz = cz + radius * Math.sin(angle);
        
        // Top vertex
        const keyTop = `${hx.toFixed(4)},${(cy + height).toFixed(4)},${hz.toFixed(4)}`;
        if (!vertexMap.has(keyTop)) {
          vertexMap.set(keyTop, allVertices.length);
          allVertices.push([hx, cy + height, hz]);
        }
        hexTop.push(vertexMap.get(keyTop)!);
        
        // Bottom vertex
        const keyBottom = `${hx.toFixed(4)},${(cy - height).toFixed(4)},${hz.toFixed(4)}`;
        if (!vertexMap.has(keyBottom)) {
          vertexMap.set(keyBottom, allVertices.length);
          allVertices.push([hx, cy - height, hz]);
        }
        hexBottom.push(vertexMap.get(keyBottom)!);
      }
      
      if (mode === 'solid') {
        // Generate particles on hexagonal faces (top, bottom, and 6 side quads)
        const subD = Math.max(2, Math.ceil(density / 3));
        
        // Top hexagon face
        for (let i = 0; i < 6; i++) {
          const v0 = allVertices[hexTop[i]];
          const v1 = allVertices[hexTop[(i + 1) % 6]];
          const center = [cx, cy + height, cz];
          addTriangleParticles(positions, faceIndices, center, v0, v1, cellIdx, subD);
        }
        
        // Bottom hexagon face
        for (let i = 0; i < 6; i++) {
          const v0 = allVertices[hexBottom[i]];
          const v1 = allVertices[hexBottom[(i + 1) % 6]];
          const center = [cx, cy - height, cz];
          addTriangleParticles(positions, faceIndices, center, v0, v1, cellIdx, subD);
        }
        
        // 6 side faces (rectangles)
        for (let i = 0; i < 6; i++) {
          const v0 = allVertices[hexTop[i]];
          const v1 = allVertices[hexTop[(i + 1) % 6]];
          const v2 = allVertices[hexBottom[(i + 1) % 6]];
          const v3 = allVertices[hexBottom[i]];
          addQuadParticles(positions, faceIndices, v0, v1, v2, v3, cellIdx, subD);
        }
      }
      
      cellIdx++;
    }
  }
  
  // Build edges for wireframe
  const edgeSet = new Set<string>();
  for (let q = -cellsPerRing; q <= cellsPerRing; q++) {
    for (let r = -cellsPerRing; r <= cellsPerRing; r++) {
      if (Math.abs(q + r) > cellsPerRing) continue;
      
      const cx = size * 0.8 * (q + r / 2);
      const cy = 0;
      const cz = size * 0.7 * r;
      
      const hexTop: number[] = [];
      const hexBottom: number[] = [];
      
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = cx + radius * Math.cos(angle);
        const hz = cz + radius * Math.sin(angle);
        
        const keyTop = `${hx.toFixed(4)},${(cy + height).toFixed(4)},${hz.toFixed(4)}`;
        hexTop.push(vertexMap.get(keyTop)!);
        
        const keyBottom = `${hx.toFixed(4)},${(cy - height).toFixed(4)},${hz.toFixed(4)}`;
        hexBottom.push(vertexMap.get(keyBottom)!);
      }
      
      // Top hexagon edges
      for (let i = 0; i < 6; i++) {
        const eKey = `${Math.min(hexTop[i], hexTop[(i + 1) % 6])}-${Math.max(hexTop[i], hexTop[(i + 1) % 6])}`;
        if (!edgeSet.has(eKey)) {
          edgeSet.add(eKey);
          allEdges.push([hexTop[i], hexTop[(i + 1) % 6]]);
        }
      }
      
      // Bottom hexagon edges
      for (let i = 0; i < 6; i++) {
        const eKey = `${Math.min(hexBottom[i], hexBottom[(i + 1) % 6])}-${Math.max(hexBottom[i], hexBottom[(i + 1) % 6])}`;
        if (!edgeSet.has(eKey)) {
          edgeSet.add(eKey);
          allEdges.push([hexBottom[i], hexBottom[(i + 1) % 6]]);
        }
      }
      
      // Vertical edges
      for (let i = 0; i < 6; i++) {
        const eKey = `${Math.min(hexTop[i], hexBottom[i])}-${Math.max(hexTop[i], hexBottom[i])}`;
        if (!edgeSet.has(eKey)) {
          edgeSet.add(eKey);
          allEdges.push([hexTop[i], hexBottom[i]]);
        }
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  const result = createParticleData(positions, faceIndices, cellIdx);
  result.vertices = allVertices;
  result.edges = allEdges;
  return result;
}

/**
 * Rhombic Dodecahedral Honeycomb
 * Rhombic dodecahedra filling space
 * Each cell has 12 rhombic faces
 * Voronoi tessellation of face-centered cubic (FCC) lattice
 */
export function generateRhombicDodecahedralHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  const cellSize = size * 0.4;
  const gridSize = 2;
  let cellIdx = 0;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  const vertexMap = new Map<string, number>();
  
  // Rhombic dodecahedron vertices:
  // 8 vertices like a cube: (±1, ±1, ±1)
  // 6 vertices on axes: (±2, 0, 0), (0, ±2, 0), (0, 0, ±2)
  // Scaled appropriately
  
  // Generate cells in a bounded region
  for (let gx = -gridSize; gx <= gridSize; gx++) {
    for (let gy = -gridSize; gy <= gridSize; gy++) {
      for (let gz = -gridSize; gz <= gridSize; gz++) {
        // FCC lattice: offset every other layer
        const offset = ((gx + gy + gz) % 2 === 0) ? 0 : 0.5;
        const cx = gx * cellSize * 2 + offset * cellSize;
        const cy = gy * cellSize * 2;
        const cz = gz * cellSize * 2;
        
        // 14 vertices of rhombic dodecahedron
        const cellVertices: number[] = [];
        
        // 8 cube-like vertices
        for (let i = 0; i < 8; i++) {
          const s = cellSize * 0.5;
          const vx = cx + ((i & 1) ? s : -s);
          const vy = cy + ((i & 2) ? s : -s);
          const vz = cz + ((i & 4) ? s : -s);
          
          const key = `${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, allVertices.length);
            allVertices.push([vx, vy, vz]);
          }
          cellVertices.push(vertexMap.get(key)!);
        }
        
        // 6 axis vertices
        const axisVerts = [
          [cx + cellSize, cy, cz],
          [cx - cellSize, cy, cz],
          [cx, cy + cellSize, cz],
          [cx, cy - cellSize, cz],
          [cx, cy, cz + cellSize],
          [cx, cy, cz - cellSize],
        ];
        
        for (const v of axisVerts) {
          const key = `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, allVertices.length);
            allVertices.push(v);
          }
          cellVertices.push(vertexMap.get(key)!);
        }
        
        if (mode === 'solid') {
          // Generate particles on 12 rhombic faces
          const subD = Math.max(2, Math.ceil(density / 3));
          
          // Each rhombic face connects one axis vertex to 4 cube vertices
          const faces = [
            // +X faces (vertex 8)
            { axis: 8, corners: [0, 1, 3, 2] },
            // -X faces (vertex 9)
            { axis: 9, corners: [4, 6, 7, 5] },
            // +Y faces (vertex 10)
            { axis: 10, corners: [0, 2, 6, 4] },
            // -Y faces (vertex 11)
            { axis: 11, corners: [1, 5, 7, 3] },
            // +Z faces (vertex 12)
            { axis: 12, corners: [0, 4, 5, 1] },
            // -Z faces (vertex 13)
            { axis: 13, corners: [2, 3, 7, 6] },
          ];
          
          for (const face of faces) {
            const av = allVertices[cellVertices[face.axis]];
            const c0 = allVertices[cellVertices[face.corners[0]]];
            const c1 = allVertices[cellVertices[face.corners[1]]];
            const c2 = allVertices[cellVertices[face.corners[2]]];
            const c3 = allVertices[cellVertices[face.corners[3]]];
            
            // Split rhombus into 4 triangles
            addTriangleParticles(positions, faceIndices, av, c0, c1, cellIdx, subD);
            addTriangleParticles(positions, faceIndices, av, c1, c2, cellIdx, subD);
            addTriangleParticles(positions, faceIndices, av, c2, c3, cellIdx, subD);
            addTriangleParticles(positions, faceIndices, av, c3, c0, cellIdx, subD);
          }
        }
        
        cellIdx++;
      }
    }
  }
  
  // Build edges for wireframe (deduplicated)
  const edgeSet = new Set<string>();
  for (let gx = -gridSize; gx <= gridSize; gx++) {
    for (let gy = -gridSize; gy <= gridSize; gy++) {
      for (let gz = -gridSize; gz <= gridSize; gz++) {
        const offset = ((gx + gy + gz) % 2 === 0) ? 0 : 0.5;
        const cx = gx * cellSize * 2 + offset * cellSize;
        const cy = gy * cellSize * 2;
        const cz = gz * cellSize * 2;
        
        const cellVertices: number[] = [];
        
        for (let i = 0; i < 8; i++) {
          const s = cellSize * 0.5;
          const vx = cx + ((i & 1) ? s : -s);
          const vy = cy + ((i & 2) ? s : -s);
          const vz = cz + ((i & 4) ? s : -s);
          const key = `${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`;
          cellVertices.push(vertexMap.get(key)!);
        }
        
        const axisVerts = [
          [cx + cellSize, cy, cz],
          [cx - cellSize, cy, cz],
          [cx, cy + cellSize, cz],
          [cx, cy - cellSize, cz],
          [cx, cy, cz + cellSize],
          [cx, cy, cz - cellSize],
        ];
        
        for (const v of axisVerts) {
          const key = `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`;
          cellVertices.push(vertexMap.get(key)!);
        }
        
        // Edges from axis vertices to cube vertices
        const edgeConnections = [
          [8, 0], [8, 1], [8, 2], [8, 3],
          [9, 4], [9, 5], [9, 6], [9, 7],
          [10, 0], [10, 2], [10, 4], [10, 6],
          [11, 1], [11, 3], [11, 5], [11, 7],
          [12, 0], [12, 1], [12, 4], [12, 5],
          [13, 2], [13, 3], [13, 6], [13, 7],
        ];
        
        for (const [a, b] of edgeConnections) {
          const eKey = `${Math.min(cellVertices[a], cellVertices[b])}-${Math.max(cellVertices[a], cellVertices[b])}`;
          if (!edgeSet.has(eKey)) {
            edgeSet.add(eKey);
            allEdges.push([cellVertices[a], cellVertices[b]]);
          }
        }
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  const result = createParticleData(positions, faceIndices, cellIdx);
  result.vertices = allVertices;
  result.edges = allEdges;
  return result;
}

/**
 * Elongated Dodecahedral Honeycomb
 * Space-filling with elongated dodecahedra
 * Each cell has 8 rhombic and 4 hexagonal faces
 */
export function generateElongatedDodecahedralHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  const cellSize = size * 0.35;
  const gridSize = 2;
  let cellIdx = 0;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  const vertexMap = new Map<string, number>();
  
  // Elongated dodecahedron has a more complex structure
  // Simplified representation using a combination of shapes
  
  for (let gx = -gridSize; gx <= gridSize; gx++) {
    for (let gy = -gridSize; gy <= gridSize; gy++) {
      for (let gz = -gridSize; gz <= gridSize; gz++) {
        const cx = gx * cellSize * 2.5;
        const cy = gy * cellSize * 2.5;
        const cz = gz * cellSize * 2.5;
        
        // Create elongated dodecahedron vertices
        const s = cellSize;
        const vertices: number[][] = [];
        
        // 8 vertices forming a "stretched" structure
        // Bottom square
        vertices.push([cx - s, cy - s, cz - s * 0.5]);
        vertices.push([cx + s, cy - s, cz - s * 0.5]);
        vertices.push([cx + s, cy - s, cz + s * 0.5]);
        vertices.push([cx - s, cy - s, cz + s * 0.5]);
        
        // Middle hexagon (elongated part)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          vertices.push([
            cx + s * 0.8 * Math.cos(angle),
            cy,
            cz + s * 0.8 * Math.sin(angle)
          ]);
        }
        
        // Top square
        vertices.push([cx - s, cy + s, cz - s * 0.5]);
        vertices.push([cx + s, cy + s, cz - s * 0.5]);
        vertices.push([cx + s, cy + s, cz + s * 0.5]);
        vertices.push([cx - s, cy + s, cz + s * 0.5]);
        
        const cellVertexIndices: number[] = [];
        for (const v of vertices) {
          const key = `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, allVertices.length);
            allVertices.push(v);
          }
          cellVertexIndices.push(vertexMap.get(key)!);
        }
        
        if (mode === 'solid') {
          const subD = Math.max(2, Math.ceil(density / 3));
          
          // Bottom face
          addQuadParticles(positions, faceIndices, 
            allVertices[cellVertexIndices[0]], 
            allVertices[cellVertexIndices[1]], 
            allVertices[cellVertexIndices[2]], 
            allVertices[cellVertexIndices[3]], 
            cellIdx, subD);
          
          // Top face
          addQuadParticles(positions, faceIndices,
            allVertices[cellVertexIndices[10]],
            allVertices[cellVertexIndices[11]],
            allVertices[cellVertexIndices[12]],
            allVertices[cellVertexIndices[13]],
            cellIdx, subD);
          
          // Side faces
          for (let i = 0; i < 4; i++) {
            const bottom = cellVertexIndices[i];
            const nextBottom = cellVertexIndices[(i + 1) % 4];
            const mid1 = cellVertexIndices[4 + i];
            const mid2 = cellVertexIndices[4 + (i + 1) % 6];
            const top = cellVertexIndices[10 + i];
            const nextTop = cellVertexIndices[10 + (i + 1) % 4];
            
            // Lower trapezoid
            addQuadParticles(positions, faceIndices,
              allVertices[bottom],
              allVertices[nextBottom],
              allVertices[mid2],
              allVertices[mid1],
              cellIdx, subD);
            
            // Upper trapezoid
            addQuadParticles(positions, faceIndices,
              allVertices[mid1],
              allVertices[mid2],
              allVertices[nextTop],
              allVertices[top],
              cellIdx, subD);
          }
        }
        
        cellIdx++;
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  const result = createParticleData(positions, faceIndices, cellIdx);
  result.vertices = allVertices;
  return result;
}

/**
 * Bitruncated Cubic Honeycomb (Truncated Octahedra)
 * Space-filling with truncated octahedra
 * One of the few Archimedean solids that can tessellate 3D space
 * Each cell has 8 hexagonal and 6 square faces
 */
export function generateBitruncatedCubicHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  const cellSize = size * 0.35;
  const gridSize = 2;
  let cellIdx = 0;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  const vertexMap = new Map<string, number>();
  
  // Truncated octahedron vertices
  // 24 vertices: all permutations of (0, ±1, ±2) with even number of minus signs
  
  for (let gx = -gridSize; gx <= gridSize; gx++) {
    for (let gy = -gridSize; gy <= gridSize; gy++) {
      for (let gz = -gridSize; gz <= gridSize; gz++) {
        const cx = gx * cellSize * 3;
        const cy = gy * cellSize * 3;
        const cz = gz * cellSize * 3;
        
        // Generate 24 vertices of truncated octahedron
        const cellVertices: number[] = [];
        const s1 = cellSize;
        const s2 = cellSize * 2;
        
        // Permutations of (0, ±1, ±2)
        const perms = [
          [0, s1, s2], [0, s1, -s2], [0, -s1, s2], [0, -s1, -s2],
          [0, s2, s1], [0, s2, -s1], [0, -s2, s1], [0, -s2, -s1],
          [s1, 0, s2], [s1, 0, -s2], [-s1, 0, s2], [-s1, 0, -s2],
          [s1, s2, 0], [s1, -s2, 0], [-s1, s2, 0], [-s1, -s2, 0],
          [s2, 0, s1], [s2, 0, -s1], [-s2, 0, s1], [-s2, 0, -s1],
          [s2, s1, 0], [s2, -s1, 0], [-s2, s1, 0], [-s2, -s1, 0],
        ];
        
        for (const p of perms) {
          const v = [cx + p[0], cy + p[1], cz + p[2]];
          const key = `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, allVertices.length);
            allVertices.push(v);
          }
          cellVertices.push(vertexMap.get(key)!);
        }
        
        if (mode === 'solid') {
          // Generate particles on faces
          // 6 square faces
          const squareFaces = [
            [0, 2, 3, 1],   // front
            [4, 5, 7, 6],   // back
            [16, 17, 19, 18], // left
            [20, 22, 23, 21], // right
            [8, 12, 14, 10], // top
            [9, 11, 15, 13], // bottom
          ];
          
          const subD = Math.max(2, Math.ceil(density / 3));
          
          for (const face of squareFaces) {
            addQuadParticles(positions, faceIndices,
              allVertices[cellVertices[face[0]]],
              allVertices[cellVertices[face[1]]],
              allVertices[cellVertices[face[2]]],
              allVertices[cellVertices[face[3]]],
              cellIdx, subD);
          }
          
          // 8 hexagonal faces (simplified with triangles)
          // Using simplified hexagonal faces
          for (let i = 0; i < 8; i++) {
            const center = [cx, cy, cz];
            // Approximate hexagonal face particles
            for (let j = 0; j < 6; j++) {
              const angle = (j / 6) * Math.PI * 2 + i * 0.5;
              const r = s1 * 1.2;
              const v0 = [center[0] + r * Math.cos(angle), center[1] + r * Math.sin(angle), center[2]];
              const v1 = [center[0] + r * Math.cos(angle + Math.PI / 3), center[1] + r * Math.sin(angle + Math.PI / 3), center[2]];
              addTriangleParticles(positions, faceIndices, center, v0, v1, cellIdx, subD);
            }
          }
        }
        
        cellIdx++;
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  const result = createParticleData(positions, faceIndices, cellIdx);
  result.vertices = allVertices;
  return result;
}

// ============================================================================
// HYPERBOLIC HONEYCOMBS
// ============================================================================

/**
 * Icosahedral Honeycomb (Hyperbolic)
 * {3,5,3} - Icosahedra in hyperbolic 3-space
 * In hyperbolic geometry, icosahedra can tile space
 * Represented with a Poincaré ball-like projection
 */
export function generateIcosahedralHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Create a finite representation using a spherical boundary
  // In reality, hyperbolic space extends infinitely, but we bound it
  const numCells = 20; // Finite number of cells
  const phi = (1 + Math.sqrt(5)) / 2;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  
  // Create multiple icosahedra arranged in a hyperbolic-like pattern
  // Using Poincaré ball model inspiration
  
  // Central icosahedron
  const centralVertices: number[][] = [];
  const rawVerts = [
    [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
    [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1],
  ];
  
  for (const v of rawVerts) {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    centralVertices.push(v.map(c => (c / len) * size * 0.3));
    allVertices.push(v.map(c => (c / len) * size * 0.3));
  }
  
  // Add edges for central icosahedron
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      const dist = Math.sqrt(
        (centralVertices[i][0] - centralVertices[j][0]) ** 2 +
        (centralVertices[i][1] - centralVertices[j][1]) ** 2 +
        (centralVertices[i][2] - centralVertices[j][2]) ** 2
      );
      if (dist < size * 0.4) {
        allEdges.push([i, j]);
      }
    }
  }
  
  // Surrounding icosahedra (scaled and positioned)
  const outerScale = size * 0.7;
  const outerDistance = size * 0.6;
  
  for (let cell = 0; cell < numCells - 1; cell++) {
    const angle1 = (cell / (numCells - 1)) * Math.PI * 2;
    const angle2 = ((cell * 3) % (numCells - 1) / (numCells - 1)) * Math.PI;
    
    const cx = outerDistance * Math.cos(angle1) * Math.sin(angle2);
    const cy = outerDistance * Math.sin(angle1) * Math.sin(angle2);
    const cz = outerDistance * Math.cos(angle2);
    
    const baseIdx = allVertices.length;
    
    for (const v of rawVerts) {
      const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
      const scaled = v.map(c => (c / len) * size * 0.15);
      allVertices.push([cx + scaled[0], cy + scaled[1], cz + scaled[2]]);
    }
    
    // Add edges for this icosahedron
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const dist = Math.sqrt(
          (rawVerts[i][0] - rawVerts[j][0]) ** 2 +
          (rawVerts[i][1] - rawVerts[j][1]) ** 2 +
          (rawVerts[i][2] - rawVerts[j][2]) ** 2
        );
        if (dist < 2.5) {
          allEdges.push([baseIdx + i, baseIdx + j]);
        }
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  // Solid mode - generate particles on faces
  let faceIdx = 0;
  
  // Find triangular faces and fill them
  const triangleSet = new Set<string>();
  for (let i = 0; i < allVertices.length; i++) {
    const neighbors: number[] = [];
    for (const [a, b] of allEdges) {
      if (a === i) neighbors.push(b);
      if (b === i) neighbors.push(a);
    }
    
    for (let j = 0; j < neighbors.length; j++) {
      for (let k = j + 1; k < neighbors.length; k++) {
        const n1 = neighbors[j];
        const n2 = neighbors[k];
        
        const isConnected = allEdges.some(([a, b]) => 
          (a === n1 && b === n2) || (a === n2 && b === n1)
        );
        
        if (isConnected) {
          const key = [i, n1, n2].sort((a, b) => a - b).join('-');
          if (!triangleSet.has(key)) {
            triangleSet.add(key);
            addTriangleParticles(positions, faceIndices, 
              allVertices[i], allVertices[n1], allVertices[n2], 
              faceIdx % numCells, Math.max(2, Math.ceil(density / 3)));
            faceIdx++;
          }
        }
      }
    }
  }
  
  const result = createParticleData(positions, faceIndices, numCells);
  result.vertices = allVertices;
  result.edges = allEdges;
  return result;
}

/**
 * Order-5 Cubic Honeycomb (Hyperbolic)
 * {4,3,5} - Cubes with 5 around each edge in hyperbolic space
 * The dual of the dodecahedral honeycomb
 */
export function generateOrder5CubicHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // In hyperbolic space, 5 cubes can meet at each edge
  // Create a representation with cubes arranged in a hyperbolic-like pattern
  
  const numCubes = 12;
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  
  // Central cube
  const s = size * 0.25;
  for (let i = 0; i < 8; i++) {
    allVertices.push([
      (i & 1) ? s : -s,
      (i & 2) ? s : -s,
      (i & 4) ? s : -s
    ]);
  }
  
  // Add edges for central cube
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const xor = i ^ j;
      if (xor === 1 || xor === 2 || xor === 4) {
        allEdges.push([i, j]);
      }
    }
  }
  
  // Surrounding cubes arranged in hyperbolic-like pattern
  const outerDistance = size * 0.5;
  const outerScale = size * 0.15;
  
  for (let cell = 0; cell < numCubes - 1; cell++) {
    const angle1 = (cell / (numCubes - 1)) * Math.PI * 2;
    const angle2 = ((cell * 2) % (numCubes - 1) / (numCubes - 1)) * Math.PI;
    
    const cx = outerDistance * Math.cos(angle1) * Math.sin(angle2);
    const cy = outerDistance * Math.sin(angle1) * Math.sin(angle2);
    const cz = outerDistance * Math.cos(angle2);
    
    const baseIdx = allVertices.length;
    
    for (let i = 0; i < 8; i++) {
      allVertices.push([
        cx + ((i & 1) ? outerScale : -outerScale),
        cy + ((i & 2) ? outerScale : -outerScale),
        cz + ((i & 4) ? outerScale : -outerScale)
      ]);
    }
    
    // Add edges
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        const xor = i ^ j;
        if (xor === 1 || xor === 2 || xor === 4) {
          allEdges.push([baseIdx + i, baseIdx + j]);
        }
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  // Solid mode - generate face particles
  let faceIdx = 0;
  
  for (let cube = 0; cube < numCubes; cube++) {
    const baseIdx = cube === 0 ? 0 : 8 + (cube - 1) * 8;
    const cubeSize = cube === 0 ? s : outerScale;
    const cx = cube === 0 ? 0 : allVertices[baseIdx][0] - ((0 & 1) ? cubeSize : -cubeSize);
    const cy = cube === 0 ? 0 : allVertices[baseIdx][1] - ((0 & 2) ? cubeSize : -cubeSize);
    const cz = cube === 0 ? 0 : allVertices[baseIdx][2] - ((0 & 4) ? cubeSize : -cubeSize);
    
    const subD = Math.max(2, Math.ceil(density / 3));
    
    // 6 faces
    for (let face = 0; face < 6; face++) {
      const v0 = allVertices[baseIdx + [0, 1, 0, 1, 0, 2][face]];
      const v1 = allVertices[baseIdx + [2, 3, 4, 5, 4, 3][face]];
      const v2 = allVertices[baseIdx + [6, 7, 6, 7, 5, 7][face]];
      const v3 = allVertices[baseIdx + [4, 5, 2, 3, 1, 1][face]];
      
      addQuadParticles(positions, faceIndices, v0, v1, v2, v3, cube, subD);
      faceIdx++;
    }
  }
  
  const result = createParticleData(positions, faceIndices, numCubes);
  result.vertices = allVertices;
  result.edges = allEdges;
  return result;
}

/**
 * Order-4 Dodecahedral Honeycomb (Hyperbolic)
 * {5,3,4} - Dodecahedra with 4 around each edge in hyperbolic space
 */
export function generateOrder4DodecahedralHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  
  // Create dodecahedron vertices
  const dodecaVertices = [
    // 8 cube vertices
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    // 4 on yz plane
    [0, invPhi, phi], [0, invPhi, -phi], [0, -invPhi, phi], [0, -invPhi, -phi],
    // 4 on xz plane
    [invPhi, phi, 0], [invPhi, -phi, 0], [-invPhi, phi, 0], [-invPhi, -phi, 0],
    // 4 on xy plane
    [phi, 0, invPhi], [phi, 0, -invPhi], [-phi, 0, invPhi], [-phi, 0, -invPhi],
  ];
  
  // Central dodecahedron
  const s = size * 0.2;
  for (const v of dodecaVertices) {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    allVertices.push(v.map(c => (c / len) * s));
  }
  
  // Add edges by distance
  for (let i = 0; i < 20; i++) {
    for (let j = i + 1; j < 20; j++) {
      const dist = Math.sqrt(
        (allVertices[i][0] - allVertices[j][0]) ** 2 +
        (allVertices[i][1] - allVertices[j][1]) ** 2 +
        (allVertices[i][2] - allVertices[j][2]) ** 2
      );
      if (dist < s * 0.6 && dist > s * 0.3) {
        allEdges.push([i, j]);
      }
    }
  }
  
  // Surrounding dodecahedra
  const numCells = 6;
  const outerDistance = size * 0.55;
  
  for (let cell = 0; cell < numCells; cell++) {
    const angle = (cell / numCells) * Math.PI * 2;
    const cx = outerDistance * Math.cos(angle);
    const cy = 0;
    const cz = outerDistance * Math.sin(angle);
    
    const baseIdx = allVertices.length;
    const outerS = size * 0.12;
    
    for (const v of dodecaVertices) {
      const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
      const scaled = v.map(c => (c / len) * outerS);
      allVertices.push([cx + scaled[0], cy + scaled[1], cz + scaled[2]]);
    }
    
    for (let i = 0; i < 20; i++) {
      for (let j = i + 1; j < 20; j++) {
        const dist = Math.sqrt(
          (dodecaVertices[i][0] - dodecaVertices[j][0]) ** 2 +
          (dodecaVertices[i][1] - dodecaVertices[j][1]) ** 2 +
          (dodecaVertices[i][2] - dodecaVertices[j][2]) ** 2
        );
        if (dist < 1.2 && dist > 0.5) {
          allEdges.push([baseIdx + i, baseIdx + j]);
        }
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  // Solid mode - fill pentagonal faces
  let faceIdx = 0;
  const subD = Math.max(2, Math.ceil(density / 3));
  
  // Find pentagonal faces
  const faces = [
    [0, 8, 10, 2, 16], [0, 16, 17, 1, 12], [0, 12, 14, 4, 8],
    [1, 17, 3, 11, 9], [1, 9, 5, 14, 12], [2, 10, 6, 15, 13],
    [2, 13, 3, 17, 16], [3, 13, 15, 7, 11], [4, 14, 5, 19, 18],
    [4, 18, 6, 10, 8], [5, 9, 11, 7, 19], [6, 18, 19, 7, 15],
  ];
  
  for (let cell = 0; cell <= numCells; cell++) {
    const baseIdx = cell === 0 ? 0 : 20 + (cell - 1) * 20;
    
    for (const face of faces) {
      const faceVerts = face.map(i => allVertices[baseIdx + i]);
      
      // Center of pentagon
      const center = [0, 0, 0];
      for (const v of faceVerts) {
        center[0] += v[0];
        center[1] += v[1];
        center[2] += v[2];
      }
      center[0] /= 5;
      center[1] /= 5;
      center[2] /= 5;
      
      // Triangulate from center
      for (let i = 0; i < 5; i++) {
        addTriangleParticles(positions, faceIndices,
          center, faceVerts[i], faceVerts[(i + 1) % 5],
          faceIdx % (numCells + 1), subD);
      }
      faceIdx++;
    }
  }
  
  const result = createParticleData(positions, faceIndices, numCells + 1);
  result.vertices = allVertices;
  result.edges = allEdges;
  return result;
}

/**
 * Order-5 Dodecahedral Honeycomb (Hyperbolic)
 * {5,3,5} - Dodecahedra with 5 around each edge in hyperbolic space
 * This is one of the most compact hyperbolic honeycombs
 */
export function generateOrder5DodecahedralHoneycomb(size: number, density: number, mode: RenderMode): ParticleData {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  
  const allVertices: number[][] = [];
  const allEdges: [number, number][] = [];
  
  // More compact arrangement for order-5
  const dodecaVertices = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, invPhi, phi], [0, invPhi, -phi], [0, -invPhi, phi], [0, -invPhi, -phi],
    [invPhi, phi, 0], [invPhi, -phi, 0], [-invPhi, phi, 0], [-invPhi, -phi, 0],
    [phi, 0, invPhi], [phi, 0, -invPhi], [-phi, 0, invPhi], [-phi, 0, -invPhi],
  ];
  
  // Create central dodecahedron
  const s = size * 0.2;
  for (const v of dodecaVertices) {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    allVertices.push(v.map(c => (c / len) * s));
  }
  
  for (let i = 0; i < 20; i++) {
    for (let j = i + 1; j < 20; j++) {
      const dist = Math.sqrt(
        (allVertices[i][0] - allVertices[j][0]) ** 2 +
        (allVertices[i][1] - allVertices[j][1]) ** 2 +
        (allVertices[i][2] - allVertices[j][2]) ** 2
      );
      if (dist < s * 0.6 && dist > s * 0.3) {
        allEdges.push([i, j]);
      }
    }
  }
  
  // Surrounding dodecahedra in a more compact arrangement (5 around each edge concept)
  const numCells = 12;
  const outerDistance = size * 0.5;
  
  for (let cell = 0; cell < numCells; cell++) {
    const angle1 = (cell / numCells) * Math.PI * 2;
    const angle2 = ((cell * 2) % numCells / numCells) * Math.PI;
    
    const cx = outerDistance * Math.cos(angle1) * Math.sin(angle2);
    const cy = outerDistance * Math.sin(angle1) * Math.sin(angle2);
    const cz = outerDistance * Math.cos(angle2);
    
    const baseIdx = allVertices.length;
    const outerS = size * 0.1;
    
    for (const v of dodecaVertices) {
      const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
      const scaled = v.map(c => (c / len) * outerS);
      allVertices.push([cx + scaled[0], cy + scaled[1], cz + scaled[2]]);
    }
    
    for (let i = 0; i < 20; i++) {
      for (let j = i + 1; j < 20; j++) {
        const dist = Math.sqrt(
          (dodecaVertices[i][0] - dodecaVertices[j][0]) ** 2 +
          (dodecaVertices[i][1] - dodecaVertices[j][1]) ** 2 +
          (dodecaVertices[i][2] - dodecaVertices[j][2]) ** 2
        );
        if (dist < 1.2 && dist > 0.5) {
          allEdges.push([baseIdx + i, baseIdx + j]);
        }
      }
    }
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges(allVertices, allEdges, density);
  }
  
  // Solid mode - fill pentagonal faces
  let faceIdx = 0;
  const subD = Math.max(2, Math.ceil(density / 3));
  
  const faces = [
    [0, 8, 10, 2, 16], [0, 16, 17, 1, 12], [0, 12, 14, 4, 8],
    [1, 17, 3, 11, 9], [1, 9, 5, 14, 12], [2, 10, 6, 15, 13],
    [2, 13, 3, 17, 16], [3, 13, 15, 7, 11], [4, 14, 5, 19, 18],
    [4, 18, 6, 10, 8], [5, 9, 11, 7, 19], [6, 18, 19, 7, 15],
  ];
  
  for (let cell = 0; cell <= numCells; cell++) {
    const baseIdx = cell === 0 ? 0 : 20 + (cell - 1) * 20;
    
    for (const face of faces) {
      const faceVerts = face.map(i => allVertices[baseIdx + i]);
      
      const center = [0, 0, 0];
      for (const v of faceVerts) {
        center[0] += v[0];
        center[1] += v[1];
        center[2] += v[2];
      }
      center[0] /= 5;
      center[1] /= 5;
      center[2] /= 5;
      
      for (let i = 0; i < 5; i++) {
        addTriangleParticles(positions, faceIndices,
          center, faceVerts[i], faceVerts[(i + 1) % 5],
          faceIdx % (numCells + 1), subD);
      }
      faceIdx++;
    }
  }
  
  const result = createParticleData(positions, faceIndices, numCells + 1);
  result.vertices = allVertices;
  result.edges = allEdges;
  return result;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export function generateHoneycombParticles(
  honeycomb: HoneycombType,
  size: number = 1,
  density: number = 15,
  mode: RenderMode = 'solid'
): ParticleData {
  switch (honeycomb) {
    case 'cubicHoneycomb':
      return generateCubicHoneycomb(size, density, mode);
    case 'hexagonalPrismatic':
      return generateHexagonalPrismaticHoneycomb(size, density, mode);
    case 'rhombicDodecahedral':
      return generateRhombicDodecahedralHoneycomb(size, density, mode);
    case 'elongatedDodecahedral':
      return generateElongatedDodecahedralHoneycomb(size, density, mode);
    case 'bitruncatedCubic':
      return generateBitruncatedCubicHoneycomb(size, density, mode);
    case 'icosahedralHoneycomb':
      return generateIcosahedralHoneycomb(size, density, mode);
    case 'order5Cubic':
      return generateOrder5CubicHoneycomb(size, density, mode);
    case 'order4Dodecahedral':
      return generateOrder4DodecahedralHoneycomb(size, density, mode);
    case 'order5Dodecahedral':
      return generateOrder5DodecahedralHoneycomb(size, density, mode);
    default:
      return generateCubicHoneycomb(size, density, mode);
  }
}

export function getHoneycombInfo(honeycomb: HoneycombType): { name: string; description: string } {
  const info: Record<HoneycombType, { name: string; description: string }> = {
    cubicHoneycomb: { 
      name: 'Cubic Honeycomb', 
      description: 'Cubes filling 3D Euclidean space (Parallelohedron)' 
    },
    hexagonalPrismatic: { 
      name: 'Hexagonal Prismatic', 
      description: 'Hexagonal prisms in honeycomb pattern (Parallelohedron)' 
    },
    rhombicDodecahedral: { 
      name: 'Rhombic Dodecahedral', 
      description: 'Rhombic dodecahedra filling space (Parallelohedron)' 
    },
    elongatedDodecahedral: { 
      name: 'Elongated Dodecahedral', 
      description: 'Elongated dodecahedra filling space (Parallelohedron)' 
    },
    bitruncatedCubic: { 
      name: 'Bitruncated Cubic', 
      description: 'Truncated octahedra filling space (Parallelohedron)' 
    },
    icosahedralHoneycomb: { 
      name: 'Icosahedral Honeycomb', 
      description: 'Icosahedra in hyperbolic 3-space {3,5,3}' 
    },
    order5Cubic: { 
      name: 'Order-5 Cubic', 
      description: 'Cubes with 5 around each edge in hyperbolic space {4,3,5}' 
    },
    order4Dodecahedral: { 
      name: 'Order-4 Dodecahedral', 
      description: 'Dodecahedra with 4 around each edge in hyperbolic space {5,3,4}' 
    },
    order5Dodecahedral: { 
      name: 'Order-5 Dodecahedral', 
      description: 'Dodecahedra with 5 around each edge in hyperbolic space {5,3,5}' 
    },
  };
  return info[honeycomb];
}
