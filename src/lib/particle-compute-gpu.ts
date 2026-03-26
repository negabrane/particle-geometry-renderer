/**
 * GPU Particle System - WebGPU with TSL
 * 
 * Uses PointsNodeMaterial with TSL for GPU-based rotation.
 * Supports all rotation axes (X, Y, Z) and multiple axes simultaneously.
 * For higher dimensions (4D+), stores ND positions and supports CPU-computed rotation updates.
 * Supports all color modes: solid, position, velocity, rainbow, rainbowMotion, face, faceGradient
 */

import * as THREE from 'three/webgpu';
import { uniform, vec3, sin, cos, attribute } from 'three/tsl';
import { PointsNodeMaterial } from 'three/webgpu';

export type GradientMode = 'solid' | 'position' | 'velocity' | 'rainbow' | 'rainbowMotion' | 'face' | 'faceGradient';

export interface GPUParticleConfig {
  particleCount: number;
  dimensionMode: '2D' | '3D' | '4D' | '5D' | '6D' | '7D' | '8D' | '9D' | '10D';
  initialPositions: Float32Array;
  initialColors?: Float32Array;
  rotationAxes?: ('x' | 'y' | 'z')[];
  // Higher dimensional position data
  positions4D?: Float32Array;
  positions5D?: Float32Array;
  positions6D?: Float32Array;
  positions7D?: Float32Array;
  positions8D?: Float32Array;
  positions9D?: Float32Array;
  positions10D?: Float32Array;
  positions2D?: Float32Array;
  // Face data for face-based coloring
  faceIndices?: Float32Array;
  faceCount?: number;
}

export interface PhysicsConfig {
  enabled: boolean;
  damping: number;
  gravity: number;
  maxVelocity: number;
  velocityInfluence: number;
  attractors: AttractorConfig[];
}

export interface AttractorConfig {
  enabled: boolean;
  position: THREE.Vector3;
  strength: number;
}

/**
 * GPUParticleSystem - WebGPU TSL Implementation
 * For 3D: Pure GPU rotation using TSL positionNode
 * For 4D+: CPU-computed N-D rotation with GPU position buffer updates
 */
export class GPUParticleSystem {
  private particleCount: number;
  private geometry: THREE.BufferGeometry | null = null;
  private material: PointsNodeMaterial | null = null;
  private pointsMesh: THREE.Points | null = null;
  private dimensionMode: '2D' | '3D' | '4D' | '5D' | '6D' | '7D' | '8D' | '9D' | '10D' = '3D';
  
  // Uniforms
  private timeUniform = uniform(0);
  private speedUniform = uniform(0.5);
  private sizeUniform = uniform(3);
  
  // Rotation axes (for 3D mode)
  private rotX = uniform(0); // 0 = off, 1 = on
  private rotY = uniform(1); // Default Y rotation
  private rotZ = uniform(0);
  
  // Higher dimensional position storage
  private positions4D: Float32Array | null = null;
  private positions5D: Float32Array | null = null;
  private positions6D: Float32Array | null = null;
  private positions7D: Float32Array | null = null;
  private positions8D: Float32Array | null = null;
  private positions9D: Float32Array | null = null;
  private positions10D: Float32Array | null = null;
  private positions2D: Float32Array | null = null;
  private originalPositions3D: Float32Array | null = null;
  
  // Face data for coloring
  private faceIndices: Float32Array | null = null;
  private faceCount: number = 1;
  
  // Color buffer
  private colorBuffer: Float32Array | null = null;
  
  private isActiveFlag = false;
  private useTSLRotation = true; // True for 3D mode, false for 4D+ modes

  constructor(config: GPUParticleConfig, _physicsConfig: PhysicsConfig) {
    this.particleCount = config.particleCount;
    this.dimensionMode = config.dimensionMode;
    
    // Store higher dimensional positions
    this.positions4D = config.positions4D || null;
    this.positions5D = config.positions5D || null;
    this.positions6D = config.positions6D || null;
    this.positions7D = config.positions7D || null;
    this.positions8D = config.positions8D || null;
    this.positions9D = config.positions9D || null;
    this.positions10D = config.positions10D || null;
    this.positions2D = config.positions2D || null;
    
    // Store face data
    this.faceIndices = config.faceIndices || null;
    this.faceCount = config.faceCount || 1;
    
    // For 4D+ modes, we need to compute rotations on CPU
    this.useTSLRotation = config.dimensionMode === '3D' || config.dimensionMode === '2D';
  }

  initialize(initialPositions: Float32Array, rotationAxes?: ('x' | 'y' | 'z')[]): boolean {
    try {
      this.particleCount = initialPositions.length / 3;
      
      // Store original positions for CPU rotation computation
      this.originalPositions3D = new Float32Array(initialPositions);
      
      // Create geometry with position attribute
      this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(initialPositions), 3));
      
      // Create color buffer
      this.colorBuffer = new Float32Array(this.particleCount * 3);
      this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorBuffer, 3));
      
      // Set rotation axes (for 3D mode)
      this.rotX.value = rotationAxes?.includes('x') ? 1 : 0;
      this.rotY.value = rotationAxes?.includes('y') ? 1 : 0;
      this.rotZ.value = rotationAxes?.includes('z') ? 1 : 0;
      
      // Default to Y if nothing specified
      if (!rotationAxes || rotationAxes.length === 0) {
        this.rotY.value = 1;
      }
      
      // Create PointsNodeMaterial
      this.material = new PointsNodeMaterial();
      
      if (this.useTSLRotation) {
        // 3D mode: Use TSL positionNode for pure GPU rotation
        const posAttr = attribute('position');
        const angle = this.timeUniform.mul(this.speedUniform);
        const c = cos(angle);
        const s = sin(angle);
        
        let rotatedPos = posAttr;
        
        // X-axis rotation (rotates in YZ plane)
        const xRotY = rotatedPos.y.mul(c).sub(rotatedPos.z.mul(s));
        const xRotZ = rotatedPos.y.mul(s).add(rotatedPos.z.mul(c));
        rotatedPos = vec3(
          rotatedPos.x,
          this.rotX.mul(xRotY).add(this.rotX.oneMinus().mul(rotatedPos.y)),
          this.rotX.mul(xRotZ).add(this.rotX.oneMinus().mul(rotatedPos.z))
        );
        
        // Y-axis rotation (rotates in XZ plane)
        const yRotX = rotatedPos.x.mul(c).sub(rotatedPos.z.mul(s));
        const yRotZ = rotatedPos.x.mul(s).add(rotatedPos.z.mul(c));
        rotatedPos = vec3(
          this.rotY.mul(yRotX).add(this.rotY.oneMinus().mul(rotatedPos.x)),
          rotatedPos.y,
          this.rotY.mul(yRotZ).add(this.rotY.oneMinus().mul(rotatedPos.z))
        );
        
        // Z-axis rotation (rotates in XY plane)
        const zRotX = rotatedPos.x.mul(c).sub(rotatedPos.y.mul(s));
        const zRotY = rotatedPos.x.mul(s).add(rotatedPos.y.mul(c));
        rotatedPos = vec3(
          this.rotZ.mul(zRotX).add(this.rotZ.oneMinus().mul(rotatedPos.x)),
          this.rotZ.mul(zRotY).add(this.rotZ.oneMinus().mul(rotatedPos.y)),
          rotatedPos.z
        );
        
        this.material.positionNode = rotatedPos;
      }
      // For 4D+ modes, positionNode stays null (positions updated via updatePositions)
      
      // Set color from attribute
      this.material.colorNode = attribute('color');
      
      // Set size
      this.material.sizeNode = this.sizeUniform;
      this.material.sizeAttenuation = true;
      this.material.transparent = true;
      this.material.depthWrite = false;
      
      // Create Points mesh
      this.pointsMesh = new THREE.Points(this.geometry, this.material);
      this.pointsMesh.frustumCulled = false;
      
      this.isActiveFlag = true;
      console.log('GPU Particles initialized:', this.particleCount, 'particles, dimension:', this.dimensionMode, 'TSL rotation:', this.useTSLRotation);
      return true;
    } catch (error) {
      console.error('GPU Particles failed:', error);
      this.isActiveFlag = false;
      return false;
    }
  }

  /**
   * Update positions from CPU-computed rotation (for 4D+ modes)
   */
  updatePositions(newPositions: Float32Array): void {
    if (!this.geometry || this.useTSLRotation) return;
    
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (positionAttr && positionAttr.array.length === newPositions.length) {
      positionAttr.array.set(newPositions);
      positionAttr.needsUpdate = true;
    }
  }

  /**
   * Update colors based on current positions and color mode
   */
  updateColors(
    positions: Float32Array,
    elapsed: number,
    gradientMode: GradientMode,
    primaryColor: { r: number; g: number; b: number },
    secondaryColor: { r: number; g: number; b: number },
    saturation: number
  ): void {
    if (!this.geometry || !this.colorBuffer) return;
    
    const count = this.particleCount;
    
    // Helper function to get HSL from RGB
    const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
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
    
    // Helper function to get RGB from HSL
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
      
      return [r + m, g + m, b + m];
    };
    
    const [h1, s1, l1] = rgbToHsl(primaryColor.r, primaryColor.g, primaryColor.b);
    const [h2, s2, l2] = rgbToHsl(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    
    // Vibrancy effects
    const vibSatBoost = saturation * 0.5;
    const vibLightShift = (saturation - 0.5) * 0.2;
    
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const faceIdx = this.faceIndices ? this.faceIndices[i] : 0;
      
      let h: number, s: number, l: number;
      let r: number, g: number, b: number;
      
      switch (gradientMode) {
        case 'solid':
          h = h1;
          s = Math.min(1, s1 + vibSatBoost);
          l = Math.max(0.2, Math.min(0.8, l1 + vibLightShift));
          break;
          
        case 'position':
          const yNorm = (y + 1) / 2;
          h = h1 + (h2 - h1) * yNorm;
          if (h < 0) h += 360;
          if (h > 360) h -= 360;
          s = Math.min(1, Math.max(0.5, (s1 + (s2 - s1) * yNorm) + vibSatBoost));
          l = Math.max(0.2, Math.min(0.8, (l1 + (l2 - l1) * yNorm) + vibLightShift));
          break;
          
        case 'velocity':
          const angleNorm = (Math.sin(elapsed * 0.5) + 1) / 2;
          h = h1 + (h2 - h1) * angleNorm;
          if (h < 0) h += 360;
          if (h > 360) h -= 360;
          s = Math.min(1, Math.max(0.5, Math.max(s1, s2) + vibSatBoost));
          l = Math.max(0.2, Math.min(0.8, (l1 + (l2 - l1) * angleNorm) + vibLightShift));
          break;
          
        case 'rainbow':
          h = (i / count) * 360;
          s = Math.min(1, 0.7 + saturation * 0.3);
          l = Math.max(0.3, Math.min(0.7, 0.5 + vibLightShift));
          break;
          
        case 'rainbowMotion':
          const baseHue = (i / count) * 360;
          const motionShift = (Math.sin(elapsed * 0.5) + 1) / 2 * 180;
          h = (baseHue + motionShift) % 360;
          s = Math.min(1, 0.7 + saturation * 0.3);
          l = Math.max(0.3, Math.min(0.7, 0.5 + vibLightShift));
          break;
          
        case 'face':
          const goldenAngle = 137.508;
          h = (faceIdx * goldenAngle) % 360;
          s = Math.min(1, 0.6 + saturation * 0.4);
          l = Math.max(0.3, Math.min(0.7, 0.5 + vibLightShift));
          break;
          
        case 'faceGradient':
          const baseHF = (faceIdx * 137.508) % 360;
          const localFacePos = (i % Math.max(1, Math.floor(count / this.faceCount))) / Math.max(1, Math.floor(count / this.faceCount));
          h = (baseHF + localFacePos * 60) % 360;
          s = Math.min(1, 0.5 + saturation * 0.5 + localFacePos * 0.1);
          l = Math.max(0.2, Math.min(0.8, (l1 + (l2 - l1) * localFacePos) + vibLightShift));
          break;
          
        default:
          h = h1;
          s = Math.min(1, s1 + vibSatBoost);
          l = Math.max(0.2, Math.min(0.8, l1 + vibLightShift));
      }
      
      [r, g, b] = hslToRgb(h, Math.min(1, s), l);
      
      this.colorBuffer[i * 3] = r;
      this.colorBuffer[i * 3 + 1] = g;
      this.colorBuffer[i * 3 + 2] = b;
    }
    
    // Mark color attribute as needing update
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    if (colorAttr) {
      colorAttr.needsUpdate = true;
    }
  }

  /**
   * Get the dimension mode
   */
  getDimensionMode(): string {
    return this.dimensionMode;
  }

  /**
   * Check if using TSL rotation (3D mode) or CPU rotation (4D+ mode)
   */
  isUsingTSLRotation(): boolean {
    return this.useTSLRotation;
  }

  /**
   * Get higher dimensional positions for CPU rotation computation
   */
  getPositionsND(): {
    positions4D: Float32Array | null;
    positions5D: Float32Array | null;
    positions6D: Float32Array | null;
    positions7D: Float32Array | null;
    positions8D: Float32Array | null;
    positions9D: Float32Array | null;
    positions10D: Float32Array | null;
    positions2D: Float32Array | null;
    originalPositions3D: Float32Array | null;
  } {
    return {
      positions4D: this.positions4D,
      positions5D: this.positions5D,
      positions6D: this.positions6D,
      positions7D: this.positions7D,
      positions8D: this.positions8D,
      positions9D: this.positions9D,
      positions10D: this.positions10D,
      positions2D: this.positions2D,
      originalPositions3D: this.originalPositions3D,
    };
  }
  
  /**
   * Get face data for coloring
   */
  getFaceData(): { faceIndices: Float32Array | null; faceCount: number } {
    return { faceIndices: this.faceIndices, faceCount: this.faceCount };
  }

  getComputeNode(): THREE.ComputeNode | null {
    return null;
  }

  getPointsMesh(): THREE.Points | null {
    return this.pointsMesh;
  }

  updateTime(t: number, _dt?: number): void {
    this.timeUniform.value = t;
  }

  updateSpeed(speed: number): void {
    this.speedUniform.value = speed;
  }

  updateParticleSize(size: number): void {
    this.sizeUniform.value = size * 0.3;
  }

  updateRotationAxes(axes: ('x' | 'y' | 'z')[]): void {
    this.rotX.value = axes.includes('x') ? 1 : 0;
    this.rotY.value = axes.includes('y') ? 1 : 0;
    this.rotZ.value = axes.includes('z') ? 1 : 0;
    
    // Default to Y if nothing specified
    if (axes.length === 0) {
      this.rotY.value = 1;
    }
  }

  updatePhysics(_config: Partial<PhysicsConfig>): void {}

  isActive(): boolean {
    return this.isActiveFlag;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    this.pointsMesh = null;
    this.geometry = null;
    this.material = null;
    this.positions4D = null;
    this.positions5D = null;
    this.positions6D = null;
    this.positions7D = null;
    this.positions8D = null;
    this.positions9D = null;
    this.positions10D = null;
    this.positions2D = null;
    this.originalPositions3D = null;
    this.faceIndices = null;
    this.colorBuffer = null;
    this.isActiveFlag = false;
  }
}

export function isWebGPUComputeAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}
