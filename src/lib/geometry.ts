/**
 * 4D Geometry utilities for particle visualization
 * Projects 4D geometry to 3D for rendering
 */

import * as THREE from 'three';

export interface Geometry4D {
  vertices: number[][];  // 4D vertices [x, y, z, w]
  edges: [number, number][];  // Edge connections
}

/**
 * Create a 4D hypercube (tesseract) geometry
 */
export function createHypercube(size: number = 1): Geometry4D {
  const s = size;
  
  // 16 vertices of a tesseract
  const vertices = [
    [-s, -s, -s, -s], [s, -s, -s, -s], [-s, s, -s, -s], [s, s, -s, -s],
    [-s, -s, s, -s], [s, -s, s, -s], [-s, s, s, -s], [s, s, s, -s],
    [-s, -s, -s, s], [s, -s, -s, s], [-s, s, -s, s], [s, s, -s, s],
    [-s, -s, s, s], [s, -s, s, s], [-s, s, s, s], [s, s, s, s],
  ];
  
  // 32 edges of a tesseract
  const edges: [number, number][] = [];
  
  // Generate edges by connecting vertices that differ by exactly one coordinate
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) {
        if (vertices[i][k] !== vertices[j][k]) diff++;
      }
      if (diff === 1) {
        edges.push([i, j]);
      }
    }
  }
  
  return { vertices, edges };
}

/**
 * Create a 3D cube geometry (with w=0 for 4D compatibility)
 */
export function createCube(size: number = 1): Geometry4D {
  const s = size;
  
  // 8 vertices of a cube in 4D (w=0)
  const vertices = [
    [-s, -s, -s, 0], [s, -s, -s, 0], [-s, s, -s, 0], [s, s, -s, 0],
    [-s, -s, s, 0], [s, -s, s, 0], [-s, s, s, 0], [s, s, s, 0],
  ];
  
  // 12 edges of a cube
  const edges: [number, number][] = [
    [0, 1], [2, 3], [4, 5], [6, 7],  // x-direction edges
    [0, 2], [1, 3], [4, 6], [5, 7],  // y-direction edges
    [0, 4], [1, 5], [2, 6], [3, 7],  // z-direction edges
  ];
  
  return { vertices, edges };
}

/**
 * Create a 4D simplex (5-cell) geometry
 */
export function createSimplex(size: number = 1): Geometry4D {
  const s = size;
  
  // 5 vertices of a 4-simplex
  const vertices = [
    [s, s, s, s],
    [s, -s, -s, s],
    [-s, s, -s, s],
    [-s, -s, s, s],
    [0, 0, 0, -s * 2],
  ];
  
  // 10 edges (each vertex connected to every other)
  const edges: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      edges.push([i, j]);
    }
  }
  
  return { vertices, edges };
}

/**
 * Project 4D vertices to 3D using perspective projection
 */
export function project4Dto3D(
  vertices: number[][],
  wDistance: number = 2
): THREE.Vector3[] {
  return vertices.map(v => {
    const [x, y, z, w] = v;
    const scale = wDistance / (wDistance - w);
    return new THREE.Vector3(x * scale, y * scale, z * scale);
  });
}

/**
 * Rotate a 4D vertex around specified planes
 */
export function rotate4D(
  vertex: number[],
  rotation: { xy?: number; xz?: number; xw?: number; yz?: number; yw?: number; zw?: number }
): number[] {
  let [x, y, z, w] = vertex;
  
  // XY rotation
  if (rotation.xy) {
    const cos = Math.cos(rotation.xy);
    const sin = Math.sin(rotation.xy);
    const newX = x * cos - y * sin;
    const newY = x * sin + y * cos;
    x = newX;
    y = newY;
  }
  
  // XZ rotation
  if (rotation.xz) {
    const cos = Math.cos(rotation.xz);
    const sin = Math.sin(rotation.xz);
    const newX = x * cos - z * sin;
    const newZ = x * sin + z * cos;
    x = newX;
    z = newZ;
  }
  
  // XW rotation
  if (rotation.xw) {
    const cos = Math.cos(rotation.xw);
    const sin = Math.sin(rotation.xw);
    const newX = x * cos - w * sin;
    const newW = x * sin + w * cos;
    x = newX;
    w = newW;
  }
  
  // YZ rotation
  if (rotation.yz) {
    const cos = Math.cos(rotation.yz);
    const sin = Math.sin(rotation.yz);
    const newY = y * cos - z * sin;
    const newZ = y * sin + z * cos;
    y = newY;
    z = newZ;
  }
  
  // YW rotation
  if (rotation.yw) {
    const cos = Math.cos(rotation.yw);
    const sin = Math.sin(rotation.yw);
    const newY = y * cos - w * sin;
    const newW = y * sin + w * cos;
    y = newY;
    w = newW;
  }
  
  // ZW rotation
  if (rotation.zw) {
    const cos = Math.cos(rotation.zw);
    const sin = Math.sin(rotation.zw);
    const newZ = z * cos - w * sin;
    const newW = z * sin + w * cos;
    z = newZ;
    w = newW;
  }
  
  return [x, y, z, w];
}

/**
 * Apply 4D rotation to all vertices
 */
export function rotateGeometry4D(
  geometry: Geometry4D,
  rotation: { xy?: number; xz?: number; xw?: number; yz?: number; yw?: number; zw?: number }
): Geometry4D {
  return {
    vertices: geometry.vertices.map(v => rotate4D(v, rotation)),
    edges: geometry.edges,
  };
}

/**
 * Generate particles along edges for visualization
 */
export function generateEdgeParticles(
  geometry: Geometry4D,
  particlesPerEdge: number = 20
): number[][] {
  const particles: number[][] = [];
  
  for (const [i, j] of geometry.edges) {
    const v1 = geometry.vertices[i];
    const v2 = geometry.vertices[j];
    
    for (let t = 0; t <= particlesPerEdge; t++) {
      const ratio = t / particlesPerEdge;
      const particle = v1.map((val, idx) => val + (v2[idx] - val) * ratio);
      particles.push(particle);
    }
  }
  
  return particles;
}

/**
 * Generate surface particles for a cube
 */
export function generateCubeSurfaceParticles(
  size: number = 1,
  density: number = 10
): number[][] {
  const s = size;
  const particles: number[][] = [];
  const step = (2 * s) / (density - 1);
  
  // Generate particles on each face
  for (let face = 0; face < 6; face++) {
    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const u = -s + i * step;
        const v = -s + j * step;
        
        let x, y, z;
        switch (face) {
          case 0: x = -s; y = u; z = v; break;  // -X face
          case 1: x = s; y = u; z = v; break;   // +X face
          case 2: x = u; y = -s; z = v; break;  // -Y face
          case 3: x = u; y = s; z = v; break;   // +Y face
          case 4: x = u; y = v; z = -s; break;  // -Z face
          case 5: x = u; y = v; z = s; break;   // +Z face
        }
        
        particles.push([x, y, z, 0]);
      }
    }
  }
  
  return particles;
}
