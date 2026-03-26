/**
 * 2D Geometry utilities for particle visualization
 * Generates 2D particle positions with support for up to 4D rotations
 * Regular polygons and other 2D shapes
 */

export type Shape2DType = 'point' | 'line' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'nonagon' | 'decagon' | 'hendecagon' | 'dodecagon' | 'circle' | 'star' | 'stellatedPentagon';

export type RenderMode2D = 'solid' | 'wireframe';

export interface ParticleData2D {
  positions: Float32Array;
  positions2D: Float32Array; // Original 2D positions (x, y)
  faceIndices: Float32Array;
  faceCount: number;
  count: number;
  edges?: [number, number][];
  vertices?: number[][]; // 2D vertices
}

/**
 * Generate regular polygon vertices
 */
function generateRegularPolygonVertices(sides: number, radius: number): number[][] {
  const vertices: number[][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2; // Start from top
    vertices.push([
      radius * Math.cos(angle),
      radius * Math.sin(angle)
    ]);
  }
  return vertices;
}

/**
 * Generate particles for a regular polygon
 */
export function generateRegularPolygonParticles(sides: number, size: number, density: number, mode: RenderMode2D): ParticleData2D {
  const vertices = generateRegularPolygonVertices(sides, size);
  
  // Edges connect consecutive vertices
  const edges: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    edges.push([i, (i + 1) % sides]);
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges2D(vertices, edges, density);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Fill the polygon using triangles from center
  // Center point
  const cx = 0, cy = 0;
  
  for (let tri = 0; tri < sides; tri++) {
    const v1 = vertices[tri];
    const v2 = vertices[(tri + 1) % sides];
    
    // Triangle from center to edge
    const subDensity = Math.max(2, Math.ceil(density / 2));
    
    for (let i = 0; i <= subDensity; i++) {
      for (let j = 0; j <= subDensity - i; j++) {
        const u = i / subDensity;
        const v = j / subDensity;
        
        if (u + v <= 1) {
          const x = cx + u * (v1[0] - cx) + v * (v2[0] - cx);
          const y = cy + u * (v1[1] - cy) + v * (v2[1] - cy);
          
          positions.push(x, y);
          faceIndices.push(tri);
        }
      }
    }
  }
  
  const result = createParticleData2D(positions, faceIndices, sides);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles for a triangle
 */
export function generateTriangleParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(3, size, density, mode);
}

/**
 * Generate particles for a square
 */
export function generateSquareParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  const s = size;
  const vertices = [[-s, -s], [s, -s], [s, s], [-s, s]];
  
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges2D(vertices, edges, density);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  const step = (2 * s) / Math.max(1, density - 1);
  
  for (let i = 0; i < density; i++) {
    for (let j = 0; j < density; j++) {
      const x = -s + i * step;
      const y = -s + j * step;
      positions.push(x, y);
      faceIndices.push(0);
    }
  }
  
  const result = createParticleData2D(positions, faceIndices, 1);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles for a pentagon
 */
export function generatePentagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(5, size, density, mode);
}

/**
 * Generate particles for a hexagon
 */
export function generateHexagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(6, size, density, mode);
}

/**
 * Generate particles for a heptagon (7 sides)
 */
export function generateHeptagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(7, size, density, mode);
}

/**
 * Generate particles for an octagon (8 sides)
 */
export function generateOctagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(8, size, density, mode);
}

/**
 * Generate particles for a nonagon (9 sides)
 */
export function generateNonagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(9, size, density, mode);
}

/**
 * Generate particles for a decagon (10 sides)
 */
export function generateDecagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(10, size, density, mode);
}

/**
 * Generate particles for a hendecagon (11 sides)
 */
export function generateHendecagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(11, size, density, mode);
}

/**
 * Generate particles for a dodecagon (12 sides)
 */
export function generateDodecagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  return generateRegularPolygonParticles(12, size, density, mode);
}

/**
 * Generate particles for a circle
 */
export function generateCircleParticles(radius: number, density: number, mode: RenderMode2D): ParticleData2D {
  const numPoints = density * density;
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Fill circle using concentric rings
  for (let i = 0; i < density; i++) {
    const r = (i / (density - 1)) * radius;
    const circumference = Math.max(1, Math.ceil(2 * Math.PI * r * density / radius));
    
    if (i === 0) {
      positions.push(0, 0);
      faceIndices.push(0);
    } else {
      for (let j = 0; j < circumference; j++) {
        const angle = (j / circumference) * Math.PI * 2;
        positions.push(r * Math.cos(angle), r * Math.sin(angle));
        faceIndices.push(i % 8);
      }
    }
  }
  
  return createParticleData2D(positions, faceIndices, 8);
}

/**
 * Generate particles for a star (5-pointed)
 */
export function generateStarParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  const outerRadius = size;
  const innerRadius = size * 0.4;
  const vertices: number[][] = [];
  
  // 10 vertices alternating outer and inner
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  
  // Edges connect consecutive vertices
  const edges: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    edges.push([i, (i + 1) % 10]);
  }
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges2D(vertices, edges, density);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Fill the star using triangles from center
  for (let tri = 0; tri < 10; tri++) {
    const v1 = vertices[tri];
    const v2 = vertices[(tri + 1) % 10];
    
    const subDensity = Math.max(2, Math.ceil(density / 2));
    
    for (let i = 0; i <= subDensity; i++) {
      for (let j = 0; j <= subDensity - i; j++) {
        const u = i / subDensity;
        const v = j / subDensity;
        
        if (u + v <= 1) {
          const x = u * v1[0] + v * v2[0];
          const y = u * v1[1] + v * v2[1];
          
          positions.push(x, y);
          faceIndices.push(tri);
        }
      }
    }
  }
  
  const result = createParticleData2D(positions, faceIndices, 10);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles for a stellated pentagon (pentagram)
 */
export function generateStellatedPentagonParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  const vertices = generateRegularPolygonVertices(5, size);
  
  // Pentagram edges - connect every other vertex
  const edges: [number, number][] = [
    [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]
  ];
  
  if (mode === 'wireframe') {
    return generateWireframeFromEdges2D(vertices, edges, density);
  }
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  // Fill each of the 5 triangles of the pentagram
  for (let tri = 0; tri < 5; tri++) {
    const v0 = vertices[tri];
    const v1 = vertices[(tri + 2) % 5];
    const v2 = vertices[(tri + 3) % 5];
    
    const subDensity = Math.max(2, Math.ceil(density / 2));
    
    for (let i = 0; i <= subDensity; i++) {
      for (let j = 0; j <= subDensity - i; j++) {
        const u = i / subDensity;
        const v = j / subDensity;
        
        if (u + v <= 1) {
          const x = v0[0] + u * (v1[0] - v0[0]) + v * (v2[0] - v0[0]);
          const y = v0[1] + u * (v1[1] - v0[1]) + v * (v2[1] - v0[1]);
          
          positions.push(x, y);
          faceIndices.push(tri);
        }
      }
    }
  }
  
  // Also fill the central pentagon
  const centerPentagonDensity = Math.max(2, Math.ceil(density / 2));
  for (let i = 0; i <= centerPentagonDensity; i++) {
    for (let j = 0; j <= centerPentagonDensity - i; j++) {
      for (let k = 0; k <= centerPentagonDensity - i - j; k++) {
        const u = i / centerPentagonDensity;
        const v = j / centerPentagonDensity;
        const w = k / centerPentagonDensity;
        
        if (u + v + w <= 1) {
          // Barycentric in center pentagon (approximate)
          const x = u * vertices[0][0] + v * vertices[1][0] + w * vertices[2][0];
          const y = u * vertices[0][1] + v * vertices[1][1] + w * vertices[2][1];
          
          positions.push(x, y);
          faceIndices.push(5);
        }
      }
    }
  }
  
  const result = createParticleData2D(positions, faceIndices, 6);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles for a line
 */
export function generateLineParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  const vertices = [[-size, 0], [size, 0]];
  const edges: [number, number][] = [[0, 1]];
  
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  for (let t = 0; t <= density; t++) {
    const alpha = t / density;
    positions.push(
      vertices[0][0] + alpha * (vertices[1][0] - vertices[0][0]),
      vertices[0][1] + alpha * (vertices[1][1] - vertices[0][1])
    );
    faceIndices.push(0);
  }
  
  const result = createParticleData2D(positions, faceIndices, 1);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Generate particles for a point
 */
export function generatePointParticles(size: number, density: number, mode: RenderMode2D): ParticleData2D {
  const positions = [0, 0];
  const vertices = [[0, 0]];
  
  const result = createParticleData2D(positions, [0], 1);
  result.vertices = vertices;
  return result;
}

/**
 * Helper: Generate wireframe particles from vertices and edges
 */
function generateWireframeFromEdges2D(vertices: number[][], edges: [number, number][], density: number): ParticleData2D {
  const positions: number[] = [];
  const faceIndices: number[] = [];
  
  let edgeIdx = 0;
  
  for (const [i, j] of edges) {
    const v0 = vertices[i];
    const v1 = vertices[j];
    
    for (let t = 0; t <= density; t++) {
      const alpha = t / density;
      positions.push(
        v0[0] + alpha * (v1[0] - v0[0]),
        v0[1] + alpha * (v1[1] - v0[1])
      );
      faceIndices.push(edgeIdx);
    }
    edgeIdx++;
  }
  
  // Add vertex particles
  for (let i = 0; i < vertices.length; i++) {
    positions.push(vertices[i][0], vertices[i][1]);
    faceIndices.push(edgeIdx);
  }
  
  const result = createParticleData2D(positions, faceIndices, edgeIdx + 1);
  result.edges = edges;
  result.vertices = vertices;
  return result;
}

/**
 * Create 2D particle data
 */
function createParticleData2D(positions: number[], faceIndices: number[], faceCount: number): ParticleData2D {
  const count = positions.length / 2;
  
  if (count === 0) {
    return generateSquareParticles(1, 15, 'solid');
  }
  
  const pos2DArray = new Float32Array(positions);
  const pos3DArray = new Float32Array(count * 3);
  const faceArray = new Float32Array(faceIndices);
  
  // Convert 2D to 3D (z = 0)
  for (let i = 0; i < count; i++) {
    pos3DArray[i * 3] = pos2DArray[i * 2];
    pos3DArray[i * 3 + 1] = pos2DArray[i * 2 + 1];
    pos3DArray[i * 3 + 2] = 0;
  }
  
  return {
    positions: pos3DArray,
    positions2D: pos2DArray,
    faceIndices: faceArray,
    faceCount,
    count,
  };
}

/**
 * Rotate 2D point in a higher dimension plane
 */
export function rotate2DIn4D(pos: Float32Array, plane: string, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // 2D point embedded in 4D: (x, y, 0, 0)
  const x = pos[0] || 0;
  const y = pos[1] || 0;
  const z = pos[2] || 0;
  const w = pos[3] || 0;
  
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
    case 'yz':
      pos[1] = y * cos - z * sin;
      pos[2] = y * sin + z * cos;
      break;
    case 'yw':
      pos[1] = y * cos - w * sin;
      pos[3] = y * sin + w * cos;
      break;
    case 'zw':
      pos[2] = z * cos - w * sin;
      pos[3] = z * sin + w * cos;
      break;
  }
}

/**
 * Generate particles for a given 2D shape type
 */
export function generate2DShapeParticles(
  shape: Shape2DType,
  size: number = 1,
  density: number = 15,
  mode: RenderMode2D = 'solid'
): ParticleData2D {
  switch (shape) {
    case 'point':
      return generatePointParticles(size, density, mode);
    case 'line':
      return generateLineParticles(size, density, mode);
    case 'triangle':
      return generateTriangleParticles(size, density, mode);
    case 'square':
      return generateSquareParticles(size, density, mode);
    case 'pentagon':
      return generatePentagonParticles(size, density, mode);
    case 'hexagon':
      return generateHexagonParticles(size, density, mode);
    case 'heptagon':
      return generateHeptagonParticles(size, density, mode);
    case 'octagon':
      return generateOctagonParticles(size, density, mode);
    case 'nonagon':
      return generateNonagonParticles(size, density, mode);
    case 'decagon':
      return generateDecagonParticles(size, density, mode);
    case 'hendecagon':
      return generateHendecagonParticles(size, density, mode);
    case 'dodecagon':
      return generateDodecagonParticles(size, density, mode);
    case 'circle':
      return generateCircleParticles(size, density, mode);
    case 'star':
      return generateStarParticles(size, density, mode);
    case 'stellatedPentagon':
      return generateStellatedPentagonParticles(size, density, mode);
    default:
      return generateSquareParticles(size, density, mode);
  }
}

/**
 * Get 2D shape metadata
 */
export function get2DShapeInfo(shape: Shape2DType): { name: string; description: string } {
  const info: Record<Shape2DType, { name: string; description: string }> = {
    point: { name: 'Point', description: 'Single point' },
    line: { name: 'Line', description: 'Line segment' },
    triangle: { name: 'Triangle', description: '3 sides' },
    square: { name: 'Square', description: '4 sides' },
    pentagon: { name: 'Pentagon', description: '5 sides' },
    hexagon: { name: 'Hexagon', description: '6 sides' },
    heptagon: { name: 'Heptagon', description: '7 sides' },
    octagon: { name: 'Octagon', description: '8 sides' },
    nonagon: { name: 'Nonagon', description: '9 sides' },
    decagon: { name: 'Decagon', description: '10 sides' },
    hendecagon: { name: 'Hendecagon', description: '11 sides' },
    dodecagon: { name: 'Dodecagon', description: '12 sides' },
    circle: { name: 'Circle', description: 'Continuous curve' },
    star: { name: 'Star', description: '5-pointed star' },
    stellatedPentagon: { name: 'Pentagram', description: 'Stellated pentagon' },
  };
  return info[shape];
}
