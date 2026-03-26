'use client';

/**
 * ParticleScene - Renders 2D/3D/4D/5D/6D particle visualizations using Three.js WebGPU
 * Uses InstancedMesh with billboarded quads for proper WebGPU particle rendering
 * Supports gradient textures for particles
 * 
 * Phase 2: GPU-only particle system with TSL compute shaders
 * Phase 4: Physics-based motion with attractors
 */

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three/webgpu';
import { pass, uniform } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { GPUParticleSystem, type GPUParticleConfig, type PhysicsConfig, type GradientMode as GPUGradientMode } from '@/lib/particle-compute-gpu';
import { generateShapeParticles, type ShapeType, getShapeInfo, type RenderMode as RenderMode3D, type HoneycombType } from '@/lib/shapes';
import { generateHoneycombParticles, getHoneycombInfo } from '@/lib/honeycombs';
import { generate4DShapeParticles, type Shape4DType, get4DShapeInfo, project4Dto3D, stereographicProject4Dto3D, rotate4D, type ProjectionMode as ProjectionMode4D } from '@/lib/shapes4d';
import { generate2DShapeParticles, type Shape2DType, get2DShapeInfo, rotate2DIn4D, type RenderMode2D } from '@/lib/shapes2d';
import { generate5DShapeParticles, type Shape5DType, get5DShapeInfo, rotate5D, project5Dto3D, stereographicProject5Dto3D, type ProjectionMode5D } from '@/lib/shapes5d';
import { generate6DShapeParticles, type Shape6DType, get6DShapeInfo, rotate6D, project6Dto3D, stereographicProject6Dto3D, type ProjectionMode6D } from '@/lib/shapes6d';
import { generate7DShapeParticles, type Shape7DType, get7DShapeInfo, rotate7D, project7Dto3D, stereographicProject7Dto3D, type ProjectionMode7D } from '@/lib/shapes7d';
import { generate8DShapeParticles, type Shape8DType, get8DShapeInfo, rotate8D, project8Dto3D, stereographicProject8Dto3D, type ProjectionMode8D } from '@/lib/shapes8d';
import { generate9DShapeParticles, type Shape9DType, get9DShapeInfo, rotate9D, project9Dto3D, stereographicProject9Dto3D, type ProjectionMode9D } from '@/lib/shapes9d';
import { generate10DShapeParticles, type Shape10DType, get10DShapeInfo, rotate10D, project10Dto3D, stereographicProject10Dto3D, type ProjectionMode10D } from '@/lib/shapes10d';

export type ParticleType = 'hard' | 'soft' | 'gradient1' | 'gradient2' | 'gradient3';
export type ParticleShape = 'circle' | 'square' | 'star';
export type RotationAxis3D = 'x' | 'y' | 'z';
export type Rotation4DAxis = 'xy' | 'xz' | 'xw' | 'yz' | 'yw' | 'zw';
export type Rotation5DAxis = 'xy' | 'xz' | 'xw' | 'xv' | 'yz' | 'yw' | 'yv' | 'zw' | 'zv' | 'wv';
export type Rotation6DAxis = 'xy' | 'xz' | 'xw' | 'xv' | 'xu' | 'yz' | 'yw' | 'yv' | 'yu' | 'zw' | 'zv' | 'zu' | 'wv' | 'wu' | 'vu';
export type Rotation7DAxis = 'xy' | 'xz' | 'xw' | 'xv' | 'xu' | 'xs' | 'yz' | 'yw' | 'yv' | 'yu' | 'ys' | 'zw' | 'zv' | 'zu' | 'zs' | 'wv' | 'wu' | 'ws' | 'vu' | 'vs' | 'us';
export type Rotation8DAxis = 'xy' | 'xz' | 'xw' | 'xv' | 'xu' | 'xt' | 'xr' | 'yz' | 'yw' | 'yv' | 'yu' | 'yt' | 'yr' | 'zw' | 'zv' | 'zu' | 'zt' | 'zr' | 'wv' | 'wu' | 'wt' | 'wr' | 'vu' | 'vt' | 'vr' | 'ut' | 'ur' | 'tr';
export type Rotation9DAxis = 'xy' | 'xz' | 'xw' | 'xv' | 'xu' | 'xt' | 'xr' | 'xq' | 'yz' | 'yw' | 'yv' | 'yu' | 'yt' | 'yr' | 'yq' | 'zw' | 'zv' | 'zu' | 'zt' | 'zr' | 'zq' | 'wv' | 'wu' | 'wt' | 'wr' | 'wq' | 'vu' | 'vt' | 'vr' | 'vq' | 'ut' | 'ur' | 'uq' | 'tr' | 'tq' | 'rq';
export type Rotation10DAxis = 'xy' | 'xz' | 'xw' | 'xv' | 'xu' | 'xt' | 'xr' | 'xq' | 'xp' | 'yz' | 'yw' | 'yv' | 'yu' | 'yt' | 'yr' | 'yq' | 'yp' | 'zw' | 'zv' | 'zu' | 'zt' | 'zr' | 'zq' | 'zp' | 'wv' | 'wu' | 'wt' | 'wr' | 'wq' | 'wp' | 'vu' | 'vt' | 'vr' | 'vq' | 'vp' | 'ut' | 'ur' | 'uq' | 'up' | 'tr' | 'tq' | 'tp' | 'rq' | 'rp' | 'qp';
export type DimensionMode = '2D' | '3D' | '4D' | '5D' | '6D' | '7D' | '8D' | '9D' | '10D';
export type GradientMode = 'solid' | 'position' | 'velocity' | 'rainbow' | 'rainbowMotion' | 'face' | 'faceGradient';
export type GeometryMode = 'shapes' | 'honeycombs';

interface ParticleSceneProps {
  dimensionMode: DimensionMode;
  geometryMode?: GeometryMode;
  shape2d?: Shape2DType;
  rotation2DAxes?: Rotation4DAxis[];
  shape?: ShapeType;
  honeycomb?: HoneycombType;
  rotationAxes?: RotationAxis3D[];
  rotationDirection?: 1 | -1;
  renderMode?: RenderMode3D;
  shape4d?: Shape4DType;
  rotation4DAxes?: Rotation4DAxis[];
  projectionMode?: ProjectionMode4D;
  shape5d?: Shape5DType;
  rotation5DAxes?: Rotation5DAxis[];
  projectionMode5D?: ProjectionMode5D;
  shape6d?: Shape6DType;
  rotation6DAxes?: Rotation6DAxis[];
  projectionMode6D?: ProjectionMode6D;
  shape7d?: Shape7DType;
  rotation7DAxes?: Rotation7DAxis[];
  projectionMode7D?: ProjectionMode7D;
  particleSize?: number;
  particleColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  rotationSpeed?: number;
  density?: number;
  particleType?: ParticleType;
  particleShape?: ParticleShape;
  gradientMode?: GradientMode;
  colorSaturation?: number;
  lineThickness?: number;
  // Universal higher-dimension rotation for all shapes
  universal4DRotation?: boolean;
  universal5DRotation?: boolean;
  universal6DRotation?: boolean;
  universal7DRotation?: boolean;
  universal8DRotation?: boolean;
  universal9DRotation?: boolean;
  universal10DRotation?: boolean;
  // 8D
  shape8d?: Shape8DType;
  rotation8DAxes?: Rotation8DAxis[];
  projectionMode8D?: ProjectionMode8D;
  // 9D
  shape9d?: Shape9DType;
  rotation9DAxes?: Rotation9DAxis[];
  projectionMode9D?: ProjectionMode9D;
  // 10D
  shape10d?: Shape10DType;
  rotation10DAxes?: Rotation10DAxis[];
  projectionMode10D?: ProjectionMode10D;
  // GPU Compute (Phase 2)
  gpuCompute?: boolean;
  // Physics (Phase 4)
  physicsEnabled?: boolean;
  physicsDamping?: number;
  physicsGravity?: number;
  physicsMaxVelocity?: number;
  attractor1Enabled?: boolean;
  attractor1Strength?: number;
  attractor2Enabled?: boolean;
  attractor2Strength?: number;
  // Bloom effect
  bloomEnabled?: boolean;
  bloomStrength?: number;
  bloomThreshold?: number;
  bloomRadius?: number;
  // Performance callback
  onPerfStats?: (stats: { fps: number; drawCalls: number; triangles: number; frameTime: number; updateTime: number; gpuCompute: boolean }) => void;
}

// HSL to RGB
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

const hexToHsl = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 1, 0.5];
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [h, s, l];
};

const getParticleColor = (index: number, totalParticles: number, yPosition: number, rotationAngle: number, faceIndex: number, totalFaces: number, localFacePos: number, mode: GradientMode, primaryColor: string, secondaryColor: string, vibrancy: number): THREE.Color => {
  const [h1, s1, l1] = hexToHsl(primaryColor);
  const [h2, s2, l2] = hexToHsl(secondaryColor);
  let h: number, s: number, l: number;
  
  // Enhanced vibrancy effect: affects saturation and lightness more noticeably
  // vibrancy ranges from 0-1, transforms to have stronger visual impact
  const vibSatBoost = vibrancy * 0.5; // Saturation boost: 0 to +0.5
  const vibLightShift = (vibrancy - 0.5) * 0.2; // Lightness shift: -0.1 to +0.1
  
  switch (mode) {
    case 'solid': 
      h = h1; 
      s = Math.min(1, s1 + vibSatBoost); 
      l = Math.max(0.2, Math.min(0.8, l1 + vibLightShift)); 
      break;
    case 'position':
      const yNorm = (yPosition + 1) / 2;
      h = h1 + (h2 - h1) * yNorm;
      if (h < 0) h += 360; if (h > 360) h -= 360;
      s = Math.min(1, Math.max(0.5, (s1 + (s2 - s1) * yNorm) + vibSatBoost));
      l = Math.max(0.2, Math.min(0.8, (l1 + (l2 - l1) * yNorm) + vibLightShift));
      break;
    case 'velocity':
      const angleNorm = (Math.sin(rotationAngle * 0.5) + 1) / 2;
      h = h1 + (h2 - h1) * angleNorm;
      if (h < 0) h += 360; if (h > 360) h -= 360;
      s = Math.min(1, Math.max(0.5, Math.max(s1, s2) + vibSatBoost));
      l = Math.max(0.2, Math.min(0.8, (l1 + (l2 - l1) * angleNorm) + vibLightShift));
      break;
    case 'rainbow': 
      h = (index / totalParticles) * 360; 
      s = Math.min(1, 0.7 + vibrancy * 0.3); 
      l = Math.max(0.3, Math.min(0.7, 0.5 + vibLightShift)); 
      break;
    case 'rainbowMotion':
      // Combine rainbow with motion-based hue shift
      const baseHue = (index / totalParticles) * 360;
      const motionShift = (Math.sin(rotationAngle * 0.5) + 1) / 2 * 180; // 0-180 degree shift
      h = (baseHue + motionShift) % 360;
      s = Math.min(1, 0.7 + vibrancy * 0.3);
      l = Math.max(0.3, Math.min(0.7, 0.5 + vibLightShift));
      break;
    case 'face':
      const goldenAngle = 137.508;
      h = (faceIndex * goldenAngle) % 360; 
      s = Math.min(1, 0.6 + vibrancy * 0.4); 
      l = Math.max(0.3, Math.min(0.7, 0.5 + vibLightShift));
      break;
    case 'faceGradient':
      const baseH = (faceIndex * 137.508) % 360;
      h = (baseH + localFacePos * 60) % 360;
      s = Math.min(1, 0.5 + vibrancy * 0.5 + localFacePos * 0.1);
      l = Math.max(0.2, Math.min(0.8, (l1 + (l2 - l1) * localFacePos) + vibLightShift));
      break;
    default: 
      h = h1; 
      s = Math.min(1, s1 + vibSatBoost); 
      l = Math.max(0.2, Math.min(0.8, l1 + vibLightShift));
  }
  
  const [r, g, b] = hslToRgb(h, Math.min(1, s), l);
  return new THREE.Color(r / 255, g / 255, b / 255);
};

// Create particle texture with optional gradient
const createParticleTexture = (shape: ParticleShape, type: ParticleType, primaryColor?: string, secondaryColor?: string, lineThickness?: number): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const centerX = canvas.width / 2, centerY = canvas.height / 2, radius = 28;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let gradient: CanvasGradient;
  const primary = primaryColor || '#00ff88';
  const secondary = secondaryColor || '#ff6b6b';
  
  if (type === 'gradient1') {
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(0.5, secondary);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (type === 'gradient2') {
    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(0.5, secondary);
    gradient.addColorStop(1, primary);
  } else if (type === 'gradient3') {
    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(0.33, secondary);
    gradient.addColorStop(0.66, primary);
    gradient.addColorStop(1, secondary);
  } else if (type === 'soft') {
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.9, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
  }
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  
  if (shape === 'circle') {
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  } else if (shape === 'square') {
    const size = radius * 1.6;
    ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
  } else if (shape === 'star') {
    const spikes = 5, outerRadius = radius, innerRadius = radius * 0.4;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  
  ctx.fill();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// Orbit controls
class OrbitController {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  isDragging = false;
  prevMouse = { x: 0, y: 0 };
  spherical = { radius: 5, phi: Math.PI / 4, theta: Math.PI / 4 };
  initialPinchDistance = 0;
  initialRadius = 0;
  
  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.updateCamera();
    domElement.addEventListener('mousedown', this.onMouseDown);
    domElement.addEventListener('mousemove', this.onMouseMove);
    domElement.addEventListener('mouseup', this.onMouseUp);
    domElement.addEventListener('mouseleave', this.onMouseUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
    domElement.addEventListener('touchend', this.onTouchEnd);
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  onMouseDown = (e: MouseEvent) => { this.isDragging = true; this.prevMouse = { x: e.clientX, y: e.clientY }; };
  onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.spherical.theta += dx * 0.005;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005));
    this.updateCamera();
    this.prevMouse = { x: e.clientX, y: e.clientY };
  };
  onMouseUp = () => { this.isDragging = false; };
  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
    this.spherical.radius = Math.max(1.5, Math.min(20, this.spherical.radius * (1 + normalizedDelta * 0.01)));
    this.updateCamera();
  };
  onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) { this.isDragging = true; this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    else if (e.touches.length === 2) {
      this.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      this.initialRadius = this.spherical.radius;
    }
  };
  onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.prevMouse.x;
      const dy = e.touches[0].clientY - this.prevMouse.y;
      this.spherical.theta += dx * 0.005;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005));
      this.updateCamera();
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const pinchDistance = Math.sqrt(dx * dx + dy * dy);
      if (this.initialPinchDistance > 0) {
        const scaleFactor = this.initialPinchDistance / pinchDistance;
        this.spherical.radius = Math.max(1.5, Math.min(20, this.initialRadius * scaleFactor));
        this.updateCamera();
      }
    }
  };
  onTouchEnd = () => { this.isDragging = false; this.initialPinchDistance = 0; };
  updateCamera() {
    const { radius, phi, theta } = this.spherical;
    this.camera.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
    this.camera.lookAt(0, 0, 0);
  }
  update() {}
  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}

export function ParticleScene({
  dimensionMode = '3D', geometryMode = 'shapes', shape = 'cube', honeycomb = 'cubicHoneycomb', shape2d = 'square', shape4d = 'tesseract', shape5d = 'penteract', shape6d = 'hexeract', shape7d = 'hepteract', shape8d = 'octeract', shape9d = 'enneract', shape10d = 'dekeract',
  particleSize = 12, particleColor = '#00ff88', secondaryColor = '#ff6b6b', backgroundColor = '#0a0a0f',
  rotationSpeed = 0.5, rotationAxes = ['y'], rotationDirection = 1, rotation2DAxes = ['xy', 'zw'],
  rotation4DAxes = ['xw', 'zw'], rotation5DAxes = ['xv', 'zw', 'yw'], rotation6DAxes = ['xu', 'zw', 'yv'], rotation7DAxes = ['xs', 'zw', 'yv'], rotation8DAxes = ['xr', 'zw', 'yv'], rotation9DAxes = ['xq', 'zw', 'yv'], rotation10DAxes = ['xp', 'zw', 'yv'],
  density = 15, particleType = 'soft', particleShape = 'circle', gradientMode = 'solid', colorSaturation = 0.5,
  renderMode = 'solid', projectionMode = 'solid', projectionMode5D = 'solid', projectionMode6D = 'wireframe', projectionMode7D = 'wireframe', projectionMode8D = 'wireframe', projectionMode9D = 'wireframe', projectionMode10D = 'wireframe',
  lineThickness = 1, universal4DRotation = false, universal5DRotation = false, universal6DRotation = false, universal7DRotation = false, universal8DRotation = false, universal9DRotation = false, universal10DRotation = false,
  // GPU Compute (Phase 2)
  gpuCompute = false,
  // Physics (Phase 4)
  physicsEnabled = false,
  physicsDamping = 0.98,
  physicsGravity = 0,
  physicsMaxVelocity = 2,
  attractor1Enabled = false,
  attractor1Strength = 0.5,
  attractor2Enabled = false,
  attractor2Strength = 0.5,
  // Bloom effect
  bloomEnabled = true,
  bloomStrength = 2.5,
  bloomThreshold = 0.2,
  bloomRadius = 0.5,
  // Performance callback
  onPerfStats,
}: ParticleSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGPURenderer | null>(null);
  const particlesRef = useRef<THREE.InstancedMesh | null>(null);
  const controlsRef = useRef<OrbitController | null>(null);
  const animationIdRef = useRef(0);
  const initializedRef = useRef(false);
  const currentCountRef = useRef(0);
  
  // GPU Compute refs
  const gpuParticleSystemRef = useRef<GPUParticleSystem | null>(null);
  const gpuParticlesRef = useRef<THREE.Points | null>(null);
  const gpuComputeActiveRef = useRef(false);
  
  // Bloom refs - stored at component level for useEffect access
  const bloomPassRef = useRef<any>(null);
  
  // Performance monitoring
  const perfRef = useRef({
    frameCount: 0,
    lastTime: performance.now(),
    fps: 0,
    frameTime: 0,
    updateTime: 0,
    gpuComputeEnabled: false,
  });
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [perfStats, setPerfStats] = useState({ fps: 0, drawCalls: 0, triangles: 0, geometries: 0, textures: 0, frameTime: 0, updateTime: 0, gpuCompute: false });

  // Determine if wireframe mode
  const isWireframeMode = renderMode === 'wireframe' || 
    (dimensionMode === '4D' && projectionMode !== 'solid') ||
    (dimensionMode === '5D' && projectionMode5D === 'wireframe') ||
    (dimensionMode === '6D' && projectionMode6D === 'wireframe') ||
    (dimensionMode === '7D' && projectionMode7D === 'wireframe') ||
    (dimensionMode === '8D' && projectionMode8D === 'wireframe') ||
    (dimensionMode === '9D' && projectionMode9D === 'wireframe') ||
    (dimensionMode === '10D' && projectionMode10D === 'wireframe');

  // Particle size stays constant - line thickness affects density, not size
  const effectiveParticleSize = particleSize;

  const particleData2D = useMemo(() => generate2DShapeParticles(shape2d, 1, density, renderMode === 'wireframe' ? 'wireframe' : 'solid'), [shape2d, density, renderMode]);
  const particleData3D = useMemo(() => {
    if (geometryMode === 'honeycombs') {
      return generateHoneycombParticles(honeycomb, 1, density, renderMode === 'wireframe' ? 'wireframe' : 'solid');
    }
    return generateShapeParticles(shape, 1, density, renderMode === 'wireframe' ? 'wireframe' : 'solid', lineThickness);
  }, [geometryMode, honeycomb, shape, density, renderMode, lineThickness]);
  const particleData4D = useMemo(() => generate4DShapeParticles(shape4d, 1, density, projectionMode === 'stereographic' ? 'stereographic' : (renderMode === 'wireframe' || projectionMode === 'schlegel') ? 'schlegel' : 'solid'), [shape4d, density, projectionMode, renderMode]);
  const particleData5D = useMemo(() => generate5DShapeParticles(shape5d, 1, density, projectionMode5D), [shape5d, density, projectionMode5D]);
  const particleData6D = useMemo(() => generate6DShapeParticles(shape6d, 1, density, projectionMode6D), [shape6d, density, projectionMode6D]);
  const particleData7D = useMemo(() => generate7DShapeParticles(shape7d, 1, density, projectionMode7D), [shape7d, density, projectionMode7D]);
  const particleData8D = useMemo(() => generate8DShapeParticles(shape8d, 1, density, projectionMode8D), [shape8d, density, projectionMode8D]);
  const particleData9D = useMemo(() => generate9DShapeParticles(shape9d, 1, density, projectionMode9D), [shape9d, density, projectionMode9D]);
  const particleData10D = useMemo(() => generate10DShapeParticles(shape10d, 1, density, projectionMode10D), [shape10d, density, projectionMode10D]);
  
  const particleData = useMemo(() => {
    switch (dimensionMode) {
      case '2D': return particleData2D;
      case '3D': return particleData3D;
      case '4D': return particleData4D;
      case '5D': return particleData5D;
      case '6D': return particleData6D;
      case '7D': return particleData7D;
      case '8D': return particleData8D;
      case '9D': return particleData9D;
      case '10D': return particleData10D;
      default: return particleData3D;
    }
  }, [dimensionMode, particleData2D, particleData3D, particleData4D, particleData5D, particleData6D, particleData7D, particleData8D, particleData9D, particleData10D]);
  
  const particleCount = particleData.count;
  const shapeInfo = useMemo(() => {
    switch (dimensionMode) {
      case '2D': return get2DShapeInfo(shape2d);
      case '3D': return geometryMode === 'honeycombs' ? getHoneycombInfo(honeycomb) : getShapeInfo(shape);
      case '4D': return get4DShapeInfo(shape4d);
      case '5D': return get5DShapeInfo(shape5d);
      case '6D': return get6DShapeInfo(shape6d);
      case '7D': return get7DShapeInfo(shape7d);
      case '8D': return get8DShapeInfo(shape8d);
      case '9D': return get9DShapeInfo(shape9d);
      case '10D': return get10DShapeInfo(shape10d);
      default: return getShapeInfo(shape);
    }
  }, [dimensionMode, geometryMode, shape2d, shape, honeycomb, shape4d, shape5d, shape6d, shape7d, shape8d, shape9d, shape10d]);

  // Refs
  const refs = {
    dimensionMode: useRef(dimensionMode), geometryMode: useRef(geometryMode), rotationSpeed: useRef(rotationSpeed), rotationAxes: useRef(rotationAxes),
    rotationDirection: useRef(rotationDirection), rotation2DAxes: useRef(rotation2DAxes), rotation4DAxes: useRef(rotation4DAxes),
    rotation5DAxes: useRef(rotation5DAxes), rotation6DAxes: useRef(rotation6DAxes), rotation7DAxes: useRef(rotation7DAxes),
    rotation8DAxes: useRef(rotation8DAxes), rotation9DAxes: useRef(rotation9DAxes), rotation10DAxes: useRef(rotation10DAxes),
    particleSize: useRef(particleSize),
    particleColor: useRef(particleColor), secondaryColor: useRef(secondaryColor), particleType: useRef(particleType),
    particleShape: useRef(particleShape), particleData: useRef(particleData), gradientMode: useRef(gradientMode),
    colorSaturation: useRef(colorSaturation), projectionMode: useRef(projectionMode), projectionMode5D: useRef(projectionMode5D),
    projectionMode6D: useRef(projectionMode6D), projectionMode7D: useRef(projectionMode7D),
    projectionMode8D: useRef(projectionMode8D), projectionMode9D: useRef(projectionMode9D), projectionMode10D: useRef(projectionMode10D),
    lineThickness: useRef(lineThickness),
    universal4DRotation: useRef(universal4DRotation), universal5DRotation: useRef(universal5DRotation),
    universal6DRotation: useRef(universal6DRotation), universal7DRotation: useRef(universal7DRotation),
    universal8DRotation: useRef(universal8DRotation), universal9DRotation: useRef(universal9DRotation),
    universal10DRotation: useRef(universal10DRotation), effectiveParticleSize: useRef(effectiveParticleSize),
    // GPU Compute refs
    gpuCompute: useRef(gpuCompute),
    physicsEnabled: useRef(physicsEnabled),
    physicsDamping: useRef(physicsDamping),
    physicsGravity: useRef(physicsGravity),
    physicsMaxVelocity: useRef(physicsMaxVelocity),
    attractor1Enabled: useRef(attractor1Enabled),
    attractor1Strength: useRef(attractor1Strength),
    attractor2Enabled: useRef(attractor2Enabled),
    attractor2Strength: useRef(attractor2Strength),
    // Bloom refs
    bloomEnabled: useRef(bloomEnabled),
    bloomStrength: useRef(bloomStrength),
    bloomThreshold: useRef(bloomThreshold),
    bloomRadius: useRef(bloomRadius),
  };

  useEffect(() => { refs.dimensionMode.current = dimensionMode; }, [dimensionMode]);
  useEffect(() => { refs.geometryMode.current = geometryMode; }, [geometryMode]);
  useEffect(() => { refs.rotationSpeed.current = rotationSpeed; }, [rotationSpeed]);
  useEffect(() => { refs.rotationAxes.current = rotationAxes; }, [rotationAxes]);
  useEffect(() => { refs.rotationDirection.current = rotationDirection; }, [rotationDirection]);
  useEffect(() => { refs.rotation2DAxes.current = rotation2DAxes; }, [rotation2DAxes]);
  useEffect(() => { refs.rotation4DAxes.current = rotation4DAxes; }, [rotation4DAxes]);
  useEffect(() => { refs.rotation5DAxes.current = rotation5DAxes; }, [rotation5DAxes]);
  useEffect(() => { refs.rotation6DAxes.current = rotation6DAxes; }, [rotation6DAxes]);
  useEffect(() => { refs.rotation7DAxes.current = rotation7DAxes; }, [rotation7DAxes]);
  useEffect(() => { refs.rotation8DAxes.current = rotation8DAxes; }, [rotation8DAxes]);
  useEffect(() => { refs.rotation9DAxes.current = rotation9DAxes; }, [rotation9DAxes]);
  useEffect(() => { refs.rotation10DAxes.current = rotation10DAxes; }, [rotation10DAxes]);
  useEffect(() => { refs.particleSize.current = particleSize; }, [particleSize]);
  useEffect(() => { refs.particleColor.current = particleColor; }, [particleColor]);
  useEffect(() => { refs.secondaryColor.current = secondaryColor; }, [secondaryColor]);
  useEffect(() => { refs.particleType.current = particleType; }, [particleType]);
  useEffect(() => { refs.particleShape.current = particleShape; }, [particleShape]);
  useEffect(() => { refs.particleData.current = particleData; }, [particleData]);
  useEffect(() => { refs.gradientMode.current = gradientMode; }, [gradientMode]);
  useEffect(() => { refs.colorSaturation.current = colorSaturation; }, [colorSaturation]);
  useEffect(() => { refs.projectionMode.current = projectionMode; }, [projectionMode]);
  useEffect(() => { refs.projectionMode5D.current = projectionMode5D; }, [projectionMode5D]);
  useEffect(() => { refs.projectionMode6D.current = projectionMode6D; }, [projectionMode6D]);
  useEffect(() => { refs.projectionMode7D.current = projectionMode7D; }, [projectionMode7D]);
  useEffect(() => { refs.projectionMode8D.current = projectionMode8D; }, [projectionMode8D]);
  useEffect(() => { refs.projectionMode9D.current = projectionMode9D; }, [projectionMode9D]);
  useEffect(() => { refs.projectionMode10D.current = projectionMode10D; }, [projectionMode10D]);
  useEffect(() => { refs.lineThickness.current = lineThickness; }, [lineThickness]);
  useEffect(() => { refs.universal4DRotation.current = universal4DRotation; }, [universal4DRotation]);
  useEffect(() => { refs.universal5DRotation.current = universal5DRotation; }, [universal5DRotation]);
  useEffect(() => { refs.universal6DRotation.current = universal6DRotation; }, [universal6DRotation]);
  useEffect(() => { refs.universal7DRotation.current = universal7DRotation; }, [universal7DRotation]);
  useEffect(() => { refs.universal8DRotation.current = universal8DRotation; }, [universal8DRotation]);
  useEffect(() => { refs.universal9DRotation.current = universal9DRotation; }, [universal9DRotation]);
  useEffect(() => { refs.universal10DRotation.current = universal10DRotation; }, [universal10DRotation]);
  useEffect(() => { refs.effectiveParticleSize.current = effectiveParticleSize; }, [effectiveParticleSize]);
  useEffect(() => { refs.gpuCompute.current = gpuCompute; }, [gpuCompute]);
  useEffect(() => { refs.physicsEnabled.current = physicsEnabled; }, [physicsEnabled]);
  useEffect(() => { refs.physicsDamping.current = physicsDamping; }, [physicsDamping]);
  useEffect(() => { refs.physicsGravity.current = physicsGravity; }, [physicsGravity]);
  useEffect(() => { refs.physicsMaxVelocity.current = physicsMaxVelocity; }, [physicsMaxVelocity]);
  useEffect(() => { refs.attractor1Enabled.current = attractor1Enabled; }, [attractor1Enabled]);
  useEffect(() => { refs.attractor1Strength.current = attractor1Strength; }, [attractor1Strength]);
  useEffect(() => { refs.attractor2Enabled.current = attractor2Enabled; }, [attractor2Enabled]);
  useEffect(() => { refs.attractor2Strength.current = attractor2Strength; }, [attractor2Strength]);
  // Bloom useEffects - update refs for render loop access
  useEffect(() => { refs.bloomEnabled.current = bloomEnabled; }, [bloomEnabled]);
  useEffect(() => { refs.bloomStrength.current = bloomStrength; }, [bloomStrength]);
  useEffect(() => { refs.bloomThreshold.current = bloomThreshold; }, [bloomThreshold]);
  useEffect(() => { refs.bloomRadius.current = bloomRadius; }, [bloomRadius]);

  // GPU Compute toggle handler - initialize/dispose GPU system on toggle
  useEffect(() => {
    if (!initializedRef.current || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    
    if (gpuCompute && !gpuComputeActiveRef.current) {
      // Enable GPU Compute - initialize GPU system
      try {
        console.log('Enabling GPU Compute...');
        
        const positions = refs.particleData.current.positions;
        const count = positions.length / 3;
        
        const gpuConfig: GPUParticleConfig = {
          particleCount: count,
          dimensionMode: refs.dimensionMode.current,
          initialPositions: positions,
          rotationAxes: refs.rotationAxes.current,
          // Pass higher dimensional positions for N-D rotation
          positions4D: (refs.particleData.current as any).positions4D,
          positions5D: (refs.particleData.current as any).positions5D,
          positions6D: (refs.particleData.current as any).positions6D,
          positions7D: (refs.particleData.current as any).positions7D,
          positions8D: (refs.particleData.current as any).positions8D,
          positions9D: (refs.particleData.current as any).positions9D,
          positions10D: (refs.particleData.current as any).positions10D,
          positions2D: (refs.particleData.current as any).positions2D,
          // Face data for coloring
          faceIndices: (refs.particleData.current as any).faceIndices,
          faceCount: (refs.particleData.current as any).faceCount || 1,
        };
        
        const physicsConfig: PhysicsConfig = {
          enabled: refs.physicsEnabled.current,
          damping: refs.physicsDamping.current,
          gravity: refs.physicsGravity.current,
          maxVelocity: refs.physicsMaxVelocity.current,
          velocityInfluence: 1,
          attractors: [
            { enabled: refs.attractor1Enabled.current, position: new THREE.Vector3(2, 0, 0), strength: refs.attractor1Strength.current },
            { enabled: refs.attractor2Enabled.current, position: new THREE.Vector3(-2, 0, 0), strength: refs.attractor2Strength.current },
          ],
        };
        
        // Create GPU particle system with config
        const gpuSystem = new GPUParticleSystem(gpuConfig, physicsConfig);
        
        // Initialize with position data and rotation axes
        const success = gpuSystem.initialize(positions, refs.rotationAxes.current);
        
        if (success) {
          gpuParticleSystemRef.current = gpuSystem;
          gpuComputeActiveRef.current = true;
          
          // Add GPU particles mesh to scene
          const gpuMesh = gpuSystem.getPointsMesh();
          if (gpuMesh) {
            scene.add(gpuMesh);
            gpuParticlesRef.current = gpuMesh;
            console.log('GPU Points mesh added to scene');
          }
          
          // Hide CPU mesh immediately
          if (particlesRef.current) {
            particlesRef.current.visible = false;
            console.log('CPU mesh hidden');
          }
          
          console.log('GPU Compute enabled successfully');
        } else {
          console.warn('GPU Compute initialization failed');
        }
      } catch (error) {
        console.error('Failed to enable GPU Compute:', error);
      }
    } else if (!gpuCompute && gpuComputeActiveRef.current) {
      // Disable GPU Compute - dispose GPU system
      console.log('Disabling GPU Compute...');
      
      // Remove GPU mesh from scene
      if (gpuParticlesRef.current && scene) {
        scene.remove(gpuParticlesRef.current);
      }
      
      // Dispose GPU system
      if (gpuParticleSystemRef.current) {
        gpuParticleSystemRef.current.dispose();
        gpuParticleSystemRef.current = null;
      }
      
      gpuParticlesRef.current = null;
      gpuComputeActiveRef.current = false;
      
      // Show CPU mesh
      if (particlesRef.current) {
        particlesRef.current.visible = true;
        console.log('CPU mesh shown');
      }
      
      console.log('GPU Compute disabled');
    }
  }, [gpuCompute]);
  
  // Reinitialize GPU system when particleData changes (shape/dimension change)
  useEffect(() => {
    if (!gpuComputeActiveRef.current || !gpuParticleSystemRef.current || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const positions = refs.particleData.current.positions;
    
    console.log('Reinitializing GPU system due to particleData change');
    
    // Hide CPU mesh IMMEDIATELY before any GPU operations
    if (particlesRef.current) {
      particlesRef.current.visible = false;
    }
    
    // Remove old GPU mesh
    if (gpuParticlesRef.current) {
      scene.remove(gpuParticlesRef.current);
    }
    
    // Dispose old system
    gpuParticleSystemRef.current.dispose();
    
    // Create new system with updated positions
    const count = positions.length / 3;
    const gpuConfig: GPUParticleConfig = {
      particleCount: count,
      dimensionMode: refs.dimensionMode.current,
      initialPositions: positions,
      rotationAxes: refs.rotationAxes.current,
      // Pass higher dimensional positions for N-D rotation
      positions4D: (refs.particleData.current as any).positions4D,
      positions5D: (refs.particleData.current as any).positions5D,
      positions6D: (refs.particleData.current as any).positions6D,
      positions7D: (refs.particleData.current as any).positions7D,
      positions8D: (refs.particleData.current as any).positions8D,
      positions9D: (refs.particleData.current as any).positions9D,
      positions10D: (refs.particleData.current as any).positions10D,
      positions2D: (refs.particleData.current as any).positions2D,
      // Face data for coloring
      faceIndices: (refs.particleData.current as any).faceIndices,
      faceCount: (refs.particleData.current as any).faceCount || 1,
    };
    
    const physicsConfig: PhysicsConfig = {
      enabled: refs.physicsEnabled.current,
      damping: refs.physicsDamping.current,
      gravity: refs.physicsGravity.current,
      maxVelocity: refs.physicsMaxVelocity.current,
      velocityInfluence: 1,
      attractors: [
        { enabled: refs.attractor1Enabled.current, position: new THREE.Vector3(2, 0, 0), strength: refs.attractor1Strength.current },
        { enabled: refs.attractor2Enabled.current, position: new THREE.Vector3(-2, 0, 0), strength: refs.attractor2Strength.current },
      ],
    };
    
    const gpuSystem = new GPUParticleSystem(gpuConfig, physicsConfig);
    const success = gpuSystem.initialize(positions, refs.rotationAxes.current);
    
    if (success) {
      gpuParticleSystemRef.current = gpuSystem;
      const gpuMesh = gpuSystem.getPointsMesh();
      if (gpuMesh) {
        scene.add(gpuMesh);
        gpuParticlesRef.current = gpuMesh;
      }
      
      // Double-check CPU mesh is hidden
      if (particlesRef.current) {
        particlesRef.current.visible = false;
        console.log('CPU mesh hidden after GPU reinit');
      }
    }
  }, [particleData, dimensionMode]);
  
  // Update rotation axes on GPU system
  useEffect(() => {
    if (!gpuParticleSystemRef.current || !gpuComputeActiveRef.current) return;
    gpuParticleSystemRef.current.updateRotationAxes(rotationAxes);
  }, [rotationAxes]);

  const createParticleMesh = useCallback((count: number, positions: Float32Array, faceIndices?: Float32Array, faceCount?: number): THREE.InstancedMesh => {
    const texture = createParticleTexture(refs.particleShape.current, refs.particleType.current, refs.particleColor.current, refs.secondaryColor.current, refs.lineThickness.current);
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    
    const geometry = new THREE.PlaneGeometry(0.1, 0.1);
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    
    const colors = new Float32Array(count * 3);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const color = new THREE.Color();
    
    const particlePositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      particlePositions.push(pos.clone());
      const s = refs.effectiveParticleSize.current * 0.01;
      scl.set(s, s, 1);
      quat.identity();
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
      
      const faceIdx = faceIndices ? faceIndices[i] : 0;
      const totalFaces = faceCount || 1;
      color.set(getParticleColor(i, count, pos.y, 0, faceIdx, totalFaces, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
      mesh.setColorAt(i, color);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    
    (mesh as any).userData = {
      positions: particlePositions,
      positions4D: refs.particleData.current.positions4D,
      positions5D: (refs.particleData.current as any).positions5D,
      positions6D: (refs.particleData.current as any).positions6D,
      positions7D: (refs.particleData.current as any).positions7D,
      positions8D: (refs.particleData.current as any).positions8D,
      positions9D: (refs.particleData.current as any).positions9D,
      positions10D: (refs.particleData.current as any).positions10D,
      positions2D: (refs.particleData.current as any).positions2D,
      faceIndices,
      faceCount: faceCount || 1,
    };
    
    return mesh;
  }, []);

  const updateParticleMesh = useCallback(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    // Store current visibility state before removing
    const wasVisible = particlesRef.current?.visible ?? true;
    
    if (particlesRef.current) {
      scene.remove(particlesRef.current);
      particlesRef.current.geometry.dispose();
      (particlesRef.current.material as THREE.Material).dispose();
    }
    
    const positions = refs.particleData.current.positions;
    const faceIndices = (refs.particleData.current as any).faceIndices;
    const faceCount = (refs.particleData.current as any).faceCount;
    const newCount = positions.length / 3;
    
    const mesh = createParticleMesh(newCount, positions, faceIndices, faceCount);
    
    // If GPU compute is active, keep CPU mesh hidden
    if (gpuComputeActiveRef.current) {
      mesh.visible = false;
    } else {
      // Preserve previous visibility state
      mesh.visible = wasVisible;
    }
    
    scene.add(mesh);
    particlesRef.current = mesh;
    currentCountRef.current = newCount;
  }, [createParticleMesh]);

  useEffect(() => {
    if (initializedRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const timeoutId = setTimeout(async () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) { setStatus('error'); setStatusMessage('No container dimensions'); return; }

      let mounted = true;

      try {
        setStatus('loading');
        setStatusMessage('Checking WebGPU...');
        if (!navigator.gpu) throw new Error('WebGPU not supported. Use Chrome 113+ or Edge 113+.');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(backgroundColor);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        camera.position.set(3, 2.5, 3);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        setStatusMessage('Creating WebGPU renderer...');
        const renderer = new THREE.WebGPURenderer({ antialias: true });
        await renderer.init();
        if (!mounted) return;

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitController(camera, renderer.domElement);
        controlsRef.current = controls;

        // Set up bloom post-processing with TSL using RenderPipeline
        // Reference: three.js/examples/webgpu_postprocessing_bloom.html
        // Create post-processing nodes
        const scenePassNode = pass(scene, camera);
        const scenePassColor = scenePassNode.getTextureNode('output');
        
        // bloom() returns a BloomNode with .threshold, .strength, .radius properties (UniformNodes)
        // Default strength=1, radius=0, threshold=0
        const bloomPass = bloom(scenePassColor);
        
        // Always use bloom output - control visibility via strength (0 = disabled)
        // This ensures the RenderPipeline is configured correctly from the start
        const bloomOutput = scenePassColor.add(bloomPass);
        
        // Create RenderPipeline for post-processing
        const renderPipeline = new THREE.RenderPipeline(renderer);
        
        // Store bloomPass in component-level ref for useEffect access
        bloomPassRef.current = bloomPass;
        
        // Initialize bloom values from current props
        // When disabled, set strength to 0 (no bloom effect)
        const effectiveStrength = refs.bloomEnabled.current ? refs.bloomStrength.current : 0;
        bloomPass.threshold.value = refs.bloomThreshold.current;
        bloomPass.strength.value = effectiveStrength;
        bloomPass.radius.value = refs.bloomRadius.current;
        
        // Always use the bloom output - the strength uniform controls the effect
        renderPipeline.outputNode = bloomOutput;
        
        // Store renderPipeline for render loop
        (refs as any).renderPipeline = renderPipeline;
        
        console.log('Bloom initialized:', {
          enabled: refs.bloomEnabled.current,
          strength: bloomPass.strength.value,
          threshold: bloomPass.threshold.value,
          radius: bloomPass.radius.value
        });

        setStatusMessage('Creating particles...');
        const positions = refs.particleData.current.positions;
        const faceIndices = (refs.particleData.current as any).faceIndices;
        const faceCount = (refs.particleData.current as any).faceCount;
        const count = positions.length / 3;
        currentCountRef.current = count;
        
        // Initialize GPU Compute if enabled
        let gpuComputeActive = false;
        if (refs.gpuCompute.current) {
          try {
            console.log('Initializing GPU Compute...');
            
            const gpuConfig: GPUParticleConfig = {
              particleCount: count,
              dimensionMode: refs.dimensionMode.current,
              initialPositions: positions,
              rotationAxes: refs.rotationAxes.current,
              // Pass higher dimensional positions for N-D rotation
              positions4D: (refs.particleData.current as any).positions4D,
              positions5D: (refs.particleData.current as any).positions5D,
              positions6D: (refs.particleData.current as any).positions6D,
              positions7D: (refs.particleData.current as any).positions7D,
              positions8D: (refs.particleData.current as any).positions8D,
              positions9D: (refs.particleData.current as any).positions9D,
              positions10D: (refs.particleData.current as any).positions10D,
              positions2D: (refs.particleData.current as any).positions2D,
              // Face data for coloring
              faceIndices: (refs.particleData.current as any).faceIndices,
              faceCount: (refs.particleData.current as any).faceCount || 1,
            };
            
            const physicsConfig: PhysicsConfig = {
              enabled: refs.physicsEnabled.current,
              damping: refs.physicsDamping.current,
              gravity: refs.physicsGravity.current,
              maxVelocity: refs.physicsMaxVelocity.current,
              velocityInfluence: 1,
              attractors: [
                { enabled: refs.attractor1Enabled.current, position: new THREE.Vector3(2, 0, 0), strength: refs.attractor1Strength.current },
                { enabled: refs.attractor2Enabled.current, position: new THREE.Vector3(-2, 0, 0), strength: refs.attractor2Strength.current },
              ],
            };
            
            const gpuSystem = new GPUParticleSystem(gpuConfig, physicsConfig);
            gpuComputeActive = gpuSystem.initialize(positions);
            
            if (gpuComputeActive) {
              gpuParticleSystemRef.current = gpuSystem;
              gpuComputeActiveRef.current = true;
              
              // Add GPU particles mesh to scene
              const gpuMesh = gpuSystem.getPointsMesh();
              if (gpuMesh) {
                scene.add(gpuMesh);
                gpuParticlesRef.current = gpuMesh;
              }
              
              console.log('GPU Compute initialized successfully');
            } else {
              console.warn('GPU Compute initialization failed, using CPU fallback');
            }
          } catch (error) {
            console.error('GPU Compute error:', error);
            gpuComputeActive = false;
          }
        }
        
        // Create CPU mesh (used as fallback or when GPU compute is disabled)
        const mesh = createParticleMesh(count, positions, faceIndices, faceCount);
        scene.add(mesh);
        particlesRef.current = mesh;
        
        // Hide CPU mesh if GPU compute is active
        if (gpuComputeActive) {
          mesh.visible = false;
        }

        const grid = new THREE.GridHelper(4, 20, 0x444466, 0x222244);
        grid.position.y = -1.5;
        scene.add(grid);

        initializedRef.current = true;
        setStatus('ready');
        setStatusMessage('WebGPU Renderer');

        const startTime = Date.now();
        
        const animate = () => {
          if (!mounted || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

          const frameStartTime = performance.now();
          const elapsed = (Date.now() - startTime) * 0.001;
          const dt = 0.016; // Fixed timestep

          if (controlsRef.current) controlsRef.current.update();

          // Update GPU compute if active
          if (gpuComputeActiveRef.current && gpuParticleSystemRef.current) {
            gpuParticleSystemRef.current.updateTime(elapsed, dt);
            gpuParticleSystemRef.current.updateSpeed(refs.rotationSpeed.current);
            gpuParticleSystemRef.current.updateParticleSize(refs.particleSize.current);
            
            // Update physics if enabled
            if (refs.physicsEnabled.current) {
              gpuParticleSystemRef.current.updatePhysics({
                enabled: true,
                damping: refs.physicsDamping.current,
                gravity: refs.physicsGravity.current,
                maxVelocity: refs.physicsMaxVelocity.current,
                velocityInfluence: 1,
                attractors: [
                  { enabled: refs.attractor1Enabled.current, position: new THREE.Vector3(2, 0, 0), strength: refs.attractor1Strength.current },
                  { enabled: refs.attractor2Enabled.current, position: new THREE.Vector3(-2, 0, 0), strength: refs.attractor2Strength.current },
                ],
              });
            }
            
            // For 4D+ modes, compute N-D rotations on CPU and update GPU positions
            if (!gpuParticleSystemRef.current.isUsingTSLRotation()) {
              const gpuPositions = gpuParticleSystemRef.current.getPositionsND();
              const dimMode = refs.dimensionMode.current;
              const speed = refs.rotationSpeed.current;
              const angle = elapsed * speed * 0.3;
              
              // Determine which dimension to use
              const use10DRotation = dimMode === '10D';
              const use9DRotation = dimMode === '9D';
              const use8DRotation = dimMode === '8D';
              const use7DRotation = dimMode === '7D';
              const use6DRotation = dimMode === '6D';
              const use5DRotation = dimMode === '5D';
              const use4DRotation = dimMode === '4D';
              const use2DRotation = dimMode === '2D';
              
              // Get the appropriate N-D positions and rotation axes
              let positionsND: Float32Array | null = null;
              let dim = 3;
              let axes: string[] = [];
              let projectionModeStr = 'solid';
              
              if (use10DRotation && gpuPositions.positions10D) {
                positionsND = gpuPositions.positions10D;
                dim = 10;
                axes = refs.rotation10DAxes.current;
                projectionModeStr = refs.projectionMode10D.current;
              } else if (use9DRotation && gpuPositions.positions9D) {
                positionsND = gpuPositions.positions9D;
                dim = 9;
                axes = refs.rotation9DAxes.current;
                projectionModeStr = refs.projectionMode9D.current;
              } else if (use8DRotation && gpuPositions.positions8D) {
                positionsND = gpuPositions.positions8D;
                dim = 8;
                axes = refs.rotation8DAxes.current;
                projectionModeStr = refs.projectionMode8D.current;
              } else if (use7DRotation && gpuPositions.positions7D) {
                positionsND = gpuPositions.positions7D;
                dim = 7;
                axes = refs.rotation7DAxes.current;
                projectionModeStr = refs.projectionMode7D.current;
              } else if (use6DRotation && gpuPositions.positions6D) {
                positionsND = gpuPositions.positions6D;
                dim = 6;
                axes = refs.rotation6DAxes.current;
                projectionModeStr = refs.projectionMode6D.current;
              } else if (use5DRotation && gpuPositions.positions5D) {
                positionsND = gpuPositions.positions5D;
                dim = 5;
                axes = refs.rotation5DAxes.current;
                projectionModeStr = refs.projectionMode5D.current;
              } else if (use4DRotation && gpuPositions.positions4D) {
                positionsND = gpuPositions.positions4D;
                dim = 4;
                axes = refs.rotation4DAxes.current;
                projectionModeStr = refs.projectionMode.current;
              } else if (use2DRotation && gpuPositions.positions2D) {
                positionsND = gpuPositions.positions2D;
                dim = 4; // 2D shapes embedded in 4D for rotation
                axes = refs.rotation2DAxes.current;
              } else if (gpuPositions.originalPositions3D) {
                // Fallback to 3D positions
                positionsND = gpuPositions.originalPositions3D;
                dim = 3;
              }
              
              if (positionsND && dim > 3) {
                // Compute N-D rotations and project to 3D
                const count = positionsND.length / dim;
                const newPositions3D = new Float32Array(count * 3);
                
                for (let i = 0; i < count; i++) {
                  // Create rotated position array
                  const rotatedPos = new Float32Array(dim);
                  for (let d = 0; d < dim; d++) {
                    rotatedPos[d] = positionsND[i * dim + d];
                  }
                  
                  // Apply rotations based on dimension
                  if (dim === 10) {
                    for (const axis of axes) rotate10D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject10Dto3D(rotatedPos, projected);
                    } else {
                      project10Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  } else if (dim === 9) {
                    for (const axis of axes) rotate9D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject9Dto3D(rotatedPos, projected);
                    } else {
                      project9Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  } else if (dim === 8) {
                    for (const axis of axes) rotate8D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject8Dto3D(rotatedPos, projected);
                    } else {
                      project8Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  } else if (dim === 7) {
                    for (const axis of axes) rotate7D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject7Dto3D(rotatedPos, projected);
                    } else {
                      project7Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  } else if (dim === 6) {
                    for (const axis of axes) rotate6D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject6Dto3D(rotatedPos, projected);
                    } else {
                      project6Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  } else if (dim === 5) {
                    for (const axis of axes) rotate5D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject5Dto3D(rotatedPos, projected);
                    } else {
                      project5Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  } else if (dim === 4) {
                    for (const axis of axes) rotate4D(rotatedPos, axis, angle);
                    const projected = new Float32Array(3);
                    if (projectionModeStr === 'stereographic') {
                      stereographicProject4Dto3D(rotatedPos, projected);
                    } else {
                      project4Dto3D(rotatedPos, projected);
                    }
                    newPositions3D[i * 3] = projected[0];
                    newPositions3D[i * 3 + 1] = projected[1];
                    newPositions3D[i * 3 + 2] = projected[2];
                  }
                }
                
                // Update GPU positions
                gpuParticleSystemRef.current.updatePositions(newPositions3D);
              }
            }
            
            // Update colors for all GPU modes (both 3D TSL and 4D+ CPU rotation)
            // Get current positions for color calculation
            const gpuMesh = gpuParticleSystemRef.current.getPointsMesh();
            if (gpuMesh) {
              const positionAttr = gpuMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
              if (positionAttr) {
                // Parse colors from hex to RGB
                const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
                  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                  if (!result) return { r: 0, g: 1, b: 0.5 };
                  return {
                    r: parseInt(result[1], 16) / 255,
                    g: parseInt(result[2], 16) / 255,
                    b: parseInt(result[3], 16) / 255,
                  };
                };
                
                const primaryRgb = hexToRgb(refs.particleColor.current);
                const secondaryRgb = hexToRgb(refs.secondaryColor.current);
                
                gpuParticleSystemRef.current.updateColors(
                  positionAttr.array as Float32Array,
                  elapsed,
                  refs.gradientMode.current as GPUGradientMode,
                  primaryRgb,
                  secondaryRgb,
                  refs.colorSaturation.current
                );
              }
            }
            
            // Execute compute shader on GPU
            const computeNode = gpuParticleSystemRef.current.getComputeNode();
            if (computeNode) {
              rendererRef.current.compute(computeNode);
            }
          }

          if (particlesRef.current && !gpuComputeActiveRef.current) {
            // CPU-based particle updates (fallback when GPU compute is disabled)
            const pmesh = particlesRef.current;
            const camPos = camera.position;
            const dimMode = refs.dimensionMode.current;
            const use4D = refs.universal4DRotation.current;
            const use5D = refs.universal5DRotation.current;
            const use6D = refs.universal6DRotation.current;
            const use7D = refs.universal7DRotation.current;
            const use8D = refs.universal8DRotation.current;
            const use9D = refs.universal9DRotation.current;
            const use10D = refs.universal10DRotation.current;
            
            const lookDir = new THREE.Vector3();
            const m = new THREE.Matrix4();
            const q = new THREE.Quaternion();
            const s = new THREE.Vector3();
            const color = new THREE.Color();
            const speed = refs.rotationSpeed.current;
            
            const faceIndices = (pmesh as any).userData.faceIndices;
            const faceCount = (pmesh as any).userData.faceCount || 1;
            const storedPositions = (pmesh as any).userData.positions as THREE.Vector3[];
            
            // Higher dimension rotation priority: 10D > 9D > 8D > 7D > 6D > 5D > 4D > 3D
            const use10DRotation = use10D || dimMode === '10D';
            const use9DRotation = use9D || dimMode === '9D';
            const use8DRotation = use8D || dimMode === '8D';
            const use7DRotation = use7D || dimMode === '7D';
            const use6DRotation = use6D || dimMode === '6D';
            const use5DRotation = use5D || dimMode === '5D';
            const use4DRotation = use4D || dimMode === '4D' || dimMode === '5D' || dimMode === '6D' || dimMode === '7D' || dimMode === '8D' || dimMode === '9D' || dimMode === '10D';
            
            if (use10DRotation) {
              // 10D rotation with projection
              const positions10D = (pmesh as any).userData.positions10D as Float32Array | undefined;
              const positions9D = (pmesh as any).userData.positions9D as Float32Array | undefined;
              const positions8D = (pmesh as any).userData.positions8D as Float32Array | undefined;
              const positions7D = (pmesh as any).userData.positions7D as Float32Array | undefined;
              const basePositions = positions10D || positions9D || positions8D || positions7D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0, 0, 0, 0, 0, 0, 0]);
              const dim = positions10D ? 10 : positions9D ? 9 : positions8D ? 8 : positions7D ? 7 : 3;
              const count = basePositions.length / dim;
              const rotatedPos = new Float32Array(10);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation10DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                for (let d = 0; d < 10; d++) rotatedPos[d] = d < dim ? basePositions[i * dim + d] : 0;
                
                for (const axis of axes) rotate10D(rotatedPos, axis, angle);
                
                if (refs.projectionMode10D.current === 'stereographic') {
                  stereographicProject10Dto3D(rotatedPos, projectedPos3D);
                } else {
                  project10Dto3D(rotatedPos, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos[dim - 1], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (use9DRotation) {
              // 9D rotation with projection
              const positions9D = (pmesh as any).userData.positions9D as Float32Array | undefined;
              const positions8D = (pmesh as any).userData.positions8D as Float32Array | undefined;
              const positions7D = (pmesh as any).userData.positions7D as Float32Array | undefined;
              const basePositions = positions9D || positions8D || positions7D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0, 0, 0, 0, 0, 0]);
              const dim = positions9D ? 9 : positions8D ? 8 : positions7D ? 7 : 3;
              const count = basePositions.length / dim;
              const rotatedPos = new Float32Array(9);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation9DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                for (let d = 0; d < 9; d++) rotatedPos[d] = d < dim ? basePositions[i * dim + d] : 0;
                
                for (const axis of axes) rotate9D(rotatedPos, axis, angle);
                
                if (refs.projectionMode9D.current === 'stereographic') {
                  stereographicProject9Dto3D(rotatedPos, projectedPos3D);
                } else {
                  project9Dto3D(rotatedPos, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos[dim - 1], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (use8DRotation) {
              // 8D rotation with projection
              const positions8D = (pmesh as any).userData.positions8D as Float32Array | undefined;
              const positions7D = (pmesh as any).userData.positions7D as Float32Array | undefined;
              const basePositions = positions8D || positions7D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0, 0, 0, 0, 0]);
              const dim = positions8D ? 8 : positions7D ? 7 : 3;
              const count = basePositions.length / dim;
              const rotatedPos = new Float32Array(8);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation8DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                for (let d = 0; d < 8; d++) rotatedPos[d] = d < dim ? basePositions[i * dim + d] : 0;
                
                for (const axis of axes) rotate8D(rotatedPos, axis, angle);
                
                if (refs.projectionMode8D.current === 'stereographic') {
                  stereographicProject8Dto3D(rotatedPos, projectedPos3D);
                } else {
                  project8Dto3D(rotatedPos, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos[dim - 1], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (use7DRotation) {
              // 7D rotation with projection
              const positions7D = (pmesh as any).userData.positions7D as Float32Array | undefined;
              const positions6D = (pmesh as any).userData.positions6D as Float32Array | undefined;
              const positions5D = (pmesh as any).userData.positions5D as Float32Array | undefined;
              const positions4D = (pmesh as any).userData.positions4D as Float32Array | undefined;
              const basePositions = positions7D || positions6D || positions5D || positions4D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0, 0, 0, 0]);
              const dim = positions7D ? 7 : positions6D ? 6 : positions5D ? 5 : positions4D ? 4 : 3;
              const count = basePositions.length / dim;
              const rotatedPos = new Float32Array(7);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation7DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                for (let d = 0; d < 7; d++) rotatedPos[d] = d < dim ? basePositions[i * dim + d] : 0;
                
                for (const axis of axes) rotate7D(rotatedPos, axis, angle);
                
                if (refs.projectionMode7D.current === 'stereographic') {
                  stereographicProject7Dto3D(rotatedPos, projectedPos3D);
                } else {
                  project7Dto3D(rotatedPos, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos[dim - 1], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (use6DRotation) {
              // 6D rotation with projection
              const positions6D = (pmesh as any).userData.positions6D as Float32Array | undefined;
              const positions5D = (pmesh as any).userData.positions5D as Float32Array | undefined;
              const positions4D = (pmesh as any).userData.positions4D as Float32Array | undefined;
              const basePositions = positions6D || positions5D || positions4D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0, 0, 0]);
              const dim = positions6D ? 6 : positions5D ? 5 : positions4D ? 4 : 3;
              const count = basePositions.length / dim;
              const rotatedPos = new Float32Array(6);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation6DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                for (let d = 0; d < 6; d++) rotatedPos[d] = d < dim ? basePositions[i * dim + d] : 0;
                
                for (const axis of axes) rotate6D(rotatedPos, axis, angle);
                
                if (refs.projectionMode6D.current === 'stereographic') {
                  stereographicProject6Dto3D(rotatedPos, projectedPos3D);
                } else {
                  project6Dto3D(rotatedPos, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos[dim - 1], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (use5DRotation) {
              // 5D rotation with projection
              const positions5D = (pmesh as any).userData.positions5D as Float32Array | undefined;
              const positions4D = (pmesh as any).userData.positions4D as Float32Array | undefined;
              const basePositions = positions5D || positions4D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0, 0]);
              const dim = positions5D ? 5 : positions4D ? 4 : 3;
              const count = basePositions.length / dim;
              const rotatedPos = new Float32Array(5);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation5DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                for (let d = 0; d < 5; d++) rotatedPos[d] = d < dim ? basePositions[i * dim + d] : 0;
                
                for (const axis of axes) rotate5D(rotatedPos, axis, angle);
                
                if (refs.projectionMode5D.current === 'stereographic') {
                  stereographicProject5Dto3D(rotatedPos, projectedPos3D);
                } else {
                  project5Dto3D(rotatedPos, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos[dim - 1], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (use4DRotation) {
              // 4D rotation
              const positions4D = (pmesh as any).userData.positions4D as Float32Array | undefined;
              const basePositions = positions4D || storedPositions.flatMap(p => [p.x, p.y, p.z, 0]);
              const dim = positions4D ? 4 : 3;
              const count = basePositions.length / dim;
              const rotatedPos4D = new Float32Array(4);
              const projectedPos3D = new Float32Array(3);
              const axes = refs.rotation4DAxes.current;
              const angle = elapsed * speed * 0.3;
              
              for (let i = 0; i < count; i++) {
                rotatedPos4D[0] = basePositions[i * dim];
                rotatedPos4D[1] = basePositions[i * dim + 1];
                rotatedPos4D[2] = basePositions[i * dim + 2];
                rotatedPos4D[3] = dim > 3 ? basePositions[i * dim + 3] : 0;
                
                for (const axis of axes) rotate4D(rotatedPos4D, axis, angle);
                
                if (refs.projectionMode.current === 'stereographic') {
                  stereographicProject4Dto3D(rotatedPos4D, projectedPos3D);
                } else {
                  project4Dto3D(rotatedPos4D, projectedPos3D);
                }
                
                const rotatedPos3D = new THREE.Vector3(projectedPos3D[0], projectedPos3D[1], projectedPos3D[2]);
                lookDir.copy(camPos).sub(rotatedPos3D).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos3D, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                color.set(getParticleColor(i, count, rotatedPos4D[3], elapsed, faceIdx, faceCount, 0, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            } else if (dimMode === '3D' || dimMode === '2D') {
              // Standard 3D rotation
              const count = storedPositions.length;
              const axes = refs.rotationAxes.current;
              const direction = refs.rotationDirection.current;
              
              const groupQuat = new THREE.Quaternion();
              const tempQuat = new THREE.Quaternion();
              const angle = elapsed * speed * 0.2 * direction;
              
              if (axes.includes('x')) { tempQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle); groupQuat.multiply(tempQuat); }
              if (axes.includes('y')) { tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle); groupQuat.multiply(tempQuat); }
              if (axes.includes('z')) { tempQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle); groupQuat.multiply(tempQuat); }
              
              const rotatedPos = new THREE.Vector3();
              
              for (let i = 0; i < count; i++) {
                rotatedPos.copy(storedPositions[i]).applyQuaternion(groupQuat);
                lookDir.copy(camPos).sub(rotatedPos).normalize();
                q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lookDir);
                s.set(refs.effectiveParticleSize.current * 0.01, refs.effectiveParticleSize.current * 0.01, 1);
                m.compose(rotatedPos, q, s);
                pmesh.setMatrixAt(i, m);
                
                const faceIdx = faceIndices ? faceIndices[i] : 0;
                const localPos = (i % Math.ceil(count / faceCount)) / Math.ceil(count / faceCount);
                color.set(getParticleColor(i, count, rotatedPos.y, elapsed, faceIdx, faceCount, localPos, refs.gradientMode.current, refs.particleColor.current, refs.secondaryColor.current, refs.colorSaturation.current));
                pmesh.setColorAt(i, color);
              }
            }
            
            pmesh.instanceMatrix.needsUpdate = true;
            if (pmesh.instanceColor) pmesh.instanceColor.needsUpdate = true;
          }

          // Update bloom parameters every frame (ensures UI changes are applied)
          if (bloomPassRef.current) {
            const enabled = refs.bloomEnabled.current;
            const strength = enabled ? refs.bloomStrength.current : 0;
            bloomPassRef.current.strength.value = strength;
            bloomPassRef.current.threshold.value = refs.bloomThreshold.current;
            bloomPassRef.current.radius.value = refs.bloomRadius.current;
          }
          
          // ALWAYS use RenderPipeline - outputNode switches between bloom/no-bloom
          // This ensures bloom works for both CPU and GPU particle paths
          if ((refs as any).renderPipeline) {
            (refs as any).renderPipeline.render();
          } else {
            // Fallback (should never happen if initialized correctly)
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          
          // Performance tracking
          const frameEndTime = performance.now();
          const frameTime = frameEndTime - frameStartTime;
          perfRef.current.frameCount++;
          perfRef.current.frameTime = frameTime;
          
          if (frameEndTime - perfRef.current.lastTime >= 1000) {
            perfRef.current.fps = Math.round(perfRef.current.frameCount * 1000 / (frameEndTime - perfRef.current.lastTime));
            perfRef.current.frameCount = 0;
            perfRef.current.lastTime = frameEndTime;
            
            // Call performance callback
            if (onPerfStats) {
              onPerfStats({
                fps: perfRef.current.fps,
                drawCalls: rendererRef.current.info.render.calls,
                triangles: rendererRef.current.info.render.triangles,
                frameTime: perfRef.current.frameTime,
                updateTime: 0,
                gpuCompute: refs.gpuCompute.current,
              });
            }
          }
          
          animationIdRef.current = requestAnimationFrame(animate);
        };

        animate();

      } catch (err) {
        if (!mounted) return;
        console.error('WebGPU init failed:', err);
        setStatus('error');
        setStatusMessage(err instanceof Error ? err.message : 'WebGPU init failed');
      }

      const onResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      };
      
      window.addEventListener('resize', onResize);

      return () => {
        mounted = false;
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(animationIdRef.current);
        
        if (rendererRef.current && containerRef.current) {
          try { containerRef.current.removeChild(rendererRef.current.domElement); } catch {}
          rendererRef.current.dispose();
        }
        if (controlsRef.current) controlsRef.current.dispose();
        
        sceneRef.current = null;
        cameraRef.current = null;
        rendererRef.current = null;
        particlesRef.current = null;
        controlsRef.current = null;
        initializedRef.current = false;
      };
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [createParticleMesh]);

  useEffect(() => {
    if (!initializedRef.current) return;
    updateParticleMesh();
  }, [particleData, dimensionMode, updateParticleMesh]);

  useEffect(() => {
    if (!particlesRef.current || !initializedRef.current) return;
    const oldMat = particlesRef.current.material as THREE.MeshBasicMaterial;
    const oldTex = oldMat.map;
    oldTex?.dispose();
    const texture = createParticleTexture(particleShape, particleType, particleColor, secondaryColor, lineThickness);
    oldMat.map = texture;
    oldMat.needsUpdate = true;
  }, [particleShape, particleType, particleColor, secondaryColor, lineThickness]);

  useEffect(() => {
    if (!sceneRef.current || !initializedRef.current) return;
    sceneRef.current.background = new THREE.Color(backgroundColor);
  }, [backgroundColor]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3 text-sm space-y-2 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'loading' ? 'bg-yellow-400 animate-pulse' : status === 'ready' ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-gray-300">{statusMessage}</span>
        </div>
        {status === 'ready' && (
          <div className="text-gray-400 text-xs">{shapeInfo.name} • {particleCount.toLocaleString()} particles</div>
        )}
      </div>
      {status === 'ready' && (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-gray-400 pointer-events-none z-10">
          <p>Drag to rotate • Scroll/pinch to zoom</p>
        </div>
      )}
    </div>
  );
}
