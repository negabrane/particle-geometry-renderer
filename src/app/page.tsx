'use client';

import { Suspense, useState } from 'react';
import { ParticleScene, type ParticleType, type ParticleShape, type RotationAxis3D, type Rotation4DAxis, type DimensionMode, type GradientMode, type Rotation5DAxis, type Rotation6DAxis, type Rotation7DAxis, type Rotation8DAxis, type Rotation9DAxis, type Rotation10DAxis } from '@/components/particle-scene';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Settings, X, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import type { ShapeType, RenderMode, HoneycombType } from '@/lib/shapes';
import type { Shape4DType, ProjectionMode } from '@/lib/shapes4d';
import type { Shape2DType } from '@/lib/shapes2d';
import type { Shape5DType, ProjectionMode5D } from '@/lib/shapes5d';
import type { Shape6DType, ProjectionMode6D } from '@/lib/shapes6d';
import type { Shape7DType, ProjectionMode7D } from '@/lib/shapes7d';
import type { Shape8DType, ProjectionMode8D } from '@/lib/shapes8d';
import type { Shape9DType, ProjectionMode9D } from '@/lib/shapes9d';
import type { Shape10DType, ProjectionMode10D } from '@/lib/shapes10d';

// 2D Shapes
const SHAPES_2D: { id: Shape2DType; name: string }[] = [
  { id: 'point', name: 'Point' }, { id: 'line', name: 'Line' },
  { id: 'triangle', name: 'Triangle' }, { id: 'square', name: 'Square' },
  { id: 'pentagon', name: 'Pentagon' }, { id: 'hexagon', name: 'Hexagon' },
  { id: 'heptagon', name: 'Heptagon' }, { id: 'octagon', name: 'Octagon' },
  { id: 'nonagon', name: 'Nonagon' }, { id: 'decagon', name: 'Decagon' },
  { id: 'hendecagon', name: 'Hendecagon' }, { id: 'dodecagon', name: 'Dodecagon' },
  { id: 'circle', name: 'Circle' }, { id: 'star', name: 'Star' },
  { id: 'stellatedPentagon', name: 'Stellated Pentagon' },
];

// 3D Shapes
const SHAPES_3D: { id: ShapeType; name: string }[] = [
  { id: 'cube', name: 'Cube' }, { id: 'sphere', name: 'Sphere' },
  { id: 'tetrahedron', name: 'Tetrahedron' }, { id: 'torus', name: 'Torus' },
  { id: 'octahedron', name: 'Octahedron' }, { id: 'dodecahedron', name: 'Dodecahedron' },
  { id: 'icosahedron', name: 'Icosahedron' }, { id: 'stellatedDodecahedron', name: 'Stellated Dodecahedron' },
  { id: 'kleinBottle', name: 'Klein Bottle' }, { id: 'mobiusStrip', name: 'Mobius Strip' },
  { id: 'torusKnot', name: 'Torus Knot' }, { id: 'boySurface', name: 'Boy Surface' },
];

// 3D Honeycombs (Space-filling tessellations)
const HONEYCOMBS_3D: { id: HoneycombType; name: string }[] = [
  // Euclidean (Parallelohedra)
  { id: 'cubicHoneycomb', name: 'Cubic Honeycomb' },
  { id: 'hexagonalPrismatic', name: 'Hexagonal Prismatic' },
  { id: 'rhombicDodecahedral', name: 'Rhombic Dodecahedral' },
  { id: 'elongatedDodecahedral', name: 'Elongated Dodecahedral' },
  { id: 'bitruncatedCubic', name: 'Bitruncated Cubic' },
  // Hyperbolic
  { id: 'icosahedralHoneycomb', name: 'Icosahedral Honeycomb' },
  { id: 'order5Cubic', name: 'Order-5 Cubic' },
  { id: 'order4Dodecahedral', name: 'Order-4 Dodecahedral' },
  { id: 'order5Dodecahedral', name: 'Order-5 Dodecahedral' },
];

// 4D Shapes
const SHAPES_4D: { id: Shape4DType; name: string }[] = [
  { id: 'tesseract', name: 'Tesseract' }, { id: 'hypersphere', name: 'Hypersphere' },
  { id: 'pentaCell', name: '5-Cell' }, { id: 'hexadecachoron', name: '16-Cell' },
  { id: 'icositetrachoron', name: '24-Cell' }, { id: 'hecatonicosachoron', name: '120-Cell' },
  { id: 'hexacosichoron', name: '600-Cell' },
  { id: 'duocylinder', name: 'Duocylinder' }, { id: 'duoprism', name: 'Duoprism' },
  { id: 'grandAntiprism', name: 'Grand Antiprism' },
  { id: 'elevenCell', name: '11-Cell' }, { id: 'fiftySevenCell', name: '57-Cell' },
];

// 5D Shapes
const SHAPES_5D: { id: Shape5DType; name: string }[] = [
  { id: 'penteract', name: 'Penteract' }, { id: 'pentaSimplex', name: '5-Simplex' },
  { id: 'pentaOrthoplex', name: '5-Orthoplex' }, { id: 'pentaSphere', name: '5-Sphere' },
  { id: 'pentaDemicube', name: '5-Demicube' },
];

// 6D Shapes
const SHAPES_6D: { id: Shape6DType; name: string }[] = [
  { id: 'hexeract', name: 'Hexeract' }, { id: 'hexaSimplex', name: '6-Simplex' },
  { id: 'hexaOrthoplex', name: '6-Orthoplex' }, { id: 'hexaSphere', name: '6-Sphere' },
];

// 7D Shapes
const SHAPES_7D: { id: Shape7DType; name: string }[] = [
  { id: 'hepteract', name: 'Hepteract' }, { id: 'heptaSimplex', name: '7-Simplex' },
  { id: 'heptaOrthoplex', name: '7-Orthoplex' }, { id: 'heptaSphere', name: '7-Sphere' },
];

// 8D Shapes
const SHAPES_8D: { id: Shape8DType; name: string }[] = [
  { id: 'octeract', name: 'Octeract' }, { id: 'octaSimplex', name: '8-Simplex' },
  { id: 'octaOrthoplex', name: '8-Orthoplex' }, { id: 'octaSphere', name: '8-Sphere' },
];

// 9D Shapes
const SHAPES_9D: { id: Shape9DType; name: string }[] = [
  { id: 'enneract', name: 'Enneract' }, { id: 'enneaSimplex', name: '9-Simplex' },
  { id: 'enneaOrthoplex', name: '9-Orthoplex' }, { id: 'enneaSphere', name: '9-Sphere' },
];

// 10D Shapes
const SHAPES_10D: { id: Shape10DType; name: string }[] = [
  { id: 'dekeract', name: 'Dekeract' }, { id: 'decaSimplex', name: '10-Simplex' },
  { id: 'decaOrthoplex', name: '10-Orthoplex' }, { id: 'decaSphere', name: '10-Sphere' },
];

const PARTICLE_TYPES: { id: ParticleType; name: string }[] = [
  { id: 'soft', name: 'Soft' }, { id: 'hard', name: 'Hard' },
  { id: 'gradient1', name: 'Gradient 1' }, { id: 'gradient2', name: 'Gradient 2' }, { id: 'gradient3', name: 'Gradient 3' },
];

const PARTICLE_SHAPES: { id: ParticleShape; name: string }[] = [
  { id: 'circle', name: 'Circle' }, { id: 'square', name: 'Square' }, { id: 'star', name: 'Star' },
];

const ROTATION_AXES_3D: { id: RotationAxis3D; name: string }[] = [
  { id: 'x', name: 'X' }, { id: 'y', name: 'Y' }, { id: 'z', name: 'Z' }
];

const ROTATION_PLANES_4D: { id: Rotation4DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'zw', name: 'ZW' },
];

const ROTATION_PLANES_5D: { id: Rotation5DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' }, { id: 'xv', name: 'XV' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'yv', name: 'YV' },
  { id: 'zw', name: 'ZW' }, { id: 'zv', name: 'ZV' }, { id: 'wv', name: 'WV' },
];

const ROTATION_PLANES_6D: { id: Rotation6DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' }, { id: 'xv', name: 'XV' }, { id: 'xu', name: 'XU' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'yv', name: 'YV' }, { id: 'yu', name: 'YU' },
  { id: 'zw', name: 'ZW' }, { id: 'zv', name: 'ZV' }, { id: 'zu', name: 'ZU' },
  { id: 'wv', name: 'WV' }, { id: 'wu', name: 'WU' }, { id: 'vu', name: 'VU' },
];

const ROTATION_PLANES_7D: { id: Rotation7DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' }, { id: 'xv', name: 'XV' }, { id: 'xu', name: 'XU' }, { id: 'xs', name: 'XS' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'yv', name: 'YV' }, { id: 'yu', name: 'YU' }, { id: 'ys', name: 'YS' },
  { id: 'zw', name: 'ZW' }, { id: 'zv', name: 'ZV' }, { id: 'zu', name: 'ZU' }, { id: 'zs', name: 'ZS' },
  { id: 'wv', name: 'WV' }, { id: 'wu', name: 'WU' }, { id: 'ws', name: 'WS' },
  { id: 'vu', name: 'VU' }, { id: 'vs', name: 'VS' }, { id: 'us', name: 'US' },
];

// 8D has 28 rotation planes
const ROTATION_PLANES_8D: { id: Rotation8DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' }, { id: 'xv', name: 'XV' }, { id: 'xu', name: 'XU' }, { id: 'xt', name: 'XT' }, { id: 'xr', name: 'XR' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'yv', name: 'YV' }, { id: 'yu', name: 'YU' }, { id: 'yt', name: 'YT' }, { id: 'yr', name: 'YR' },
  { id: 'zw', name: 'ZW' }, { id: 'zv', name: 'ZV' }, { id: 'zu', name: 'ZU' }, { id: 'zt', name: 'ZT' }, { id: 'zr', name: 'ZR' },
  { id: 'wv', name: 'WV' }, { id: 'wu', name: 'WU' }, { id: 'wt', name: 'WT' }, { id: 'wr', name: 'WR' },
  { id: 'vu', name: 'VU' }, { id: 'vt', name: 'VT' }, { id: 'vr', name: 'VR' },
  { id: 'ut', name: 'UT' }, { id: 'ur', name: 'UR' },
  { id: 'tr', name: 'TR' },
];

// 9D has 36 rotation planes
const ROTATION_PLANES_9D: { id: Rotation9DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' }, { id: 'xv', name: 'XV' }, { id: 'xu', name: 'XU' }, { id: 'xt', name: 'XT' }, { id: 'xr', name: 'XR' }, { id: 'xq', name: 'XQ' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'yv', name: 'YV' }, { id: 'yu', name: 'YU' }, { id: 'yt', name: 'YT' }, { id: 'yr', name: 'YR' }, { id: 'yq', name: 'YQ' },
  { id: 'zw', name: 'ZW' }, { id: 'zv', name: 'ZV' }, { id: 'zu', name: 'ZU' }, { id: 'zt', name: 'ZT' }, { id: 'zr', name: 'ZR' }, { id: 'zq', name: 'ZQ' },
  { id: 'wv', name: 'WV' }, { id: 'wu', name: 'WU' }, { id: 'wt', name: 'WT' }, { id: 'wr', name: 'WR' }, { id: 'wq', name: 'WQ' },
  { id: 'vu', name: 'VU' }, { id: 'vt', name: 'VT' }, { id: 'vr', name: 'VR' }, { id: 'vq', name: 'VQ' },
  { id: 'ut', name: 'UT' }, { id: 'ur', name: 'UR' }, { id: 'uq', name: 'UQ' },
  { id: 'tr', name: 'TR' }, { id: 'tq', name: 'TQ' },
  { id: 'rq', name: 'RQ' },
];

// 10D has 45 rotation planes
const ROTATION_PLANES_10D: { id: Rotation10DAxis; name: string }[] = [
  { id: 'xy', name: 'XY' }, { id: 'xz', name: 'XZ' }, { id: 'xw', name: 'XW' }, { id: 'xv', name: 'XV' }, { id: 'xu', name: 'XU' }, { id: 'xt', name: 'XT' }, { id: 'xr', name: 'XR' }, { id: 'xq', name: 'XQ' }, { id: 'xp', name: 'XP' },
  { id: 'yz', name: 'YZ' }, { id: 'yw', name: 'YW' }, { id: 'yv', name: 'YV' }, { id: 'yu', name: 'YU' }, { id: 'yt', name: 'YT' }, { id: 'yr', name: 'YR' }, { id: 'yq', name: 'YQ' }, { id: 'yp', name: 'YP' },
  { id: 'zw', name: 'ZW' }, { id: 'zv', name: 'ZV' }, { id: 'zu', name: 'ZU' }, { id: 'zt', name: 'ZT' }, { id: 'zr', name: 'ZR' }, { id: 'zq', name: 'ZQ' }, { id: 'zp', name: 'ZP' },
  { id: 'wv', name: 'WV' }, { id: 'wu', name: 'WU' }, { id: 'wt', name: 'WT' }, { id: 'wr', name: 'WR' }, { id: 'wq', name: 'WQ' }, { id: 'wp', name: 'WP' },
  { id: 'vu', name: 'VU' }, { id: 'vt', name: 'VT' }, { id: 'vr', name: 'VR' }, { id: 'vq', name: 'VQ' }, { id: 'vp', name: 'VP' },
  { id: 'ut', name: 'UT' }, { id: 'ur', name: 'UR' }, { id: 'uq', name: 'UQ' }, { id: 'up', name: 'UP' },
  { id: 'tr', name: 'TR' }, { id: 'tq', name: 'TQ' }, { id: 'tp', name: 'TP' },
  { id: 'rq', name: 'RQ' }, { id: 'rp', name: 'RP' },
  { id: 'qp', name: 'QP' },
];

const RENDER_MODES: { id: RenderMode; name: string }[] = [
  { id: 'solid', name: 'Solid' }, { id: 'wireframe', name: 'Wireframe' }
];

const PROJECTION_MODES_4D: { id: ProjectionMode; name: string }[] = [
  { id: 'solid', name: 'Solid' }, { id: 'schlegel', name: 'Schlegel' }, { id: 'stereographic', name: 'Stereographic' }
];

const PROJECTION_MODES_5D: { id: ProjectionMode5D; name: string }[] = [
  { id: 'solid', name: 'Solid' }, { id: 'wireframe', name: 'Wireframe' }, { id: 'stereographic', name: 'Stereographic' }
];

const PROJECTION_MODES_6D: { id: ProjectionMode6D; name: string }[] = [
  { id: 'wireframe', name: 'Wireframe' }, { id: 'stereographic', name: 'Stereographic' }, { id: 'solid', name: 'Solid' }
];

const PROJECTION_MODES_7D: { id: ProjectionMode7D; name: string }[] = [
  { id: 'wireframe', name: 'Wireframe' }, { id: 'stereographic', name: 'Stereographic' }, { id: 'solid', name: 'Solid' }
];

const PROJECTION_MODES_8D: { id: ProjectionMode8D; name: string }[] = [
  { id: 'wireframe', name: 'Wireframe' }, { id: 'stereographic', name: 'Stereographic' }, { id: 'solid', name: 'Solid' }
];

const PROJECTION_MODES_9D: { id: ProjectionMode9D; name: string }[] = [
  { id: 'wireframe', name: 'Wireframe' }, { id: 'stereographic', name: 'Stereographic' }, { id: 'solid', name: 'Solid' }
];

const PROJECTION_MODES_10D: { id: ProjectionMode10D; name: string }[] = [
  { id: 'wireframe', name: 'Wireframe' }, { id: 'stereographic', name: 'Stereographic' }, { id: 'solid', name: 'Solid' }
];

const COLORS = [
  '#00ff88', '#ff6b6b', '#4ecdc4', '#ffd93d', '#6c5ce7', '#ff85c0',
  '#00d4ff', '#ff9f43', '#ffffff', '#74b9ff', '#fd79a8', '#55efc4',
  '#a29bfe', '#ffeaa7', '#dfe6e9', '#fab1a0', '#81ecec', '#fdcb6e',
];

const GRADIENT_MODES: { id: GradientMode; name: string }[] = [
  { id: 'solid', name: 'Solid' }, { id: 'position', name: 'Position' }, { id: 'velocity', name: 'Motion' },
  { id: 'rainbow', name: 'Rainbow' }, { id: 'rainbowMotion', name: 'Rainbow Motion' }, { id: 'face', name: 'Face' }, { id: 'faceGradient', name: 'Face Gradient' },
];

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-t-[#00ff88] border-gray-700 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400">Initializing WebGPU...</p>
      </div>
    </div>
  );
}

// Reusable section component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{title}</div>
      {children}
    </div>
  );
}

// Reusable button group
function ButtonGroup<T extends string>({ options, value, onChange, cols = 3 }: {
  options: { id: T; name: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
            value === opt.id
              ? 'bg-[#00ff88] text-black'
              : 'bg-white/10 text-white/90 hover:bg-white/20'
          }`}
        >
          {opt.name}
        </button>
      ))}
    </div>
  );
}

// Toggle button group (multiple selection)
function ToggleGroup<T extends string>({ options, values, onChange, cols = 3 }: {
  options: { id: T; name: string }[];
  values: T[];
  onChange: (v: T[]) => void;
  cols?: number;
}) {
  const toggle = (id: T) => {
    onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  };
  
  return (
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => toggle(opt.id)}
          className={`px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
            values.includes(opt.id)
              ? 'bg-[#00ff88] text-black'
              : 'bg-white/10 text-white/90 hover:bg-white/20'
          }`}
        >
          {opt.name}
        </button>
      ))}
    </div>
  );
}

// Slider component
function SliderControl({ label, value, onChange, min, max, step, unit = '' }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-400">{label}</span>
        <span className="text-white/80">{value}{unit}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

// Color picker with smaller squares
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="grid grid-cols-9 gap-0.5">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`aspect-square rounded-sm transition-transform hover:scale-110 ${
              value === c ? 'ring-1 ring-white ring-offset-0.5 ring-offset-black' : ''
            }`}
            style={{ backgroundColor: c, width: '18px', height: '18px' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>('3D');
  const [geometryMode, setGeometryMode] = useState<'shapes' | 'honeycombs'>('shapes');
  const [shape2d, setShape2d] = useState<Shape2DType>('hexagon');
  const [rotation2DAxes, setRotation2DAxes] = useState<Rotation4DAxis[]>(['xy', 'zw']);
  const [shape, setShape] = useState<ShapeType>('cube');
  const [honeycomb, setHoneycomb] = useState<HoneycombType>('cubicHoneycomb');
  const [rotationAxes, setRotationAxes] = useState<RotationAxis3D[]>(['y']);
  const [rotationDirection, setRotationDirection] = useState<1 | -1>(1);
  const [renderMode, setRenderMode] = useState<RenderMode>('solid');
  const [shape4d, setShape4d] = useState<Shape4DType>('tesseract');
  const [rotation4DAxes, setRotation4DAxes] = useState<Rotation4DAxis[]>(['xw', 'zw']);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('solid');
  const [shape5d, setShape5d] = useState<Shape5DType>('penteract');
  const [rotation5DAxes, setRotation5DAxes] = useState<Rotation5DAxis[]>(['xv', 'zw', 'yw']);
  const [projectionMode5D, setProjectionMode5D] = useState<ProjectionMode5D>('solid');
  const [shape6d, setShape6d] = useState<Shape6DType>('hexeract');
  const [rotation6DAxes, setRotation6DAxes] = useState<Rotation6DAxis[]>(['xu', 'zw', 'yv']);
  const [projectionMode6D, setProjectionMode6D] = useState<ProjectionMode6D>('wireframe');
  const [shape7d, setShape7d] = useState<Shape7DType>('hepteract');
  const [rotation7DAxes, setRotation7DAxes] = useState<Rotation7DAxis[]>(['xs', 'zw', 'yv']);
  const [projectionMode7D, setProjectionMode7D] = useState<ProjectionMode7D>('wireframe');
  const [shape8d, setShape8d] = useState<Shape8DType>('octeract');
  const [rotation8DAxes, setRotation8DAxes] = useState<Rotation8DAxis[]>(['xr', 'zw', 'yv']);
  const [projectionMode8D, setProjectionMode8D] = useState<ProjectionMode8D>('wireframe');
  const [shape9d, setShape9d] = useState<Shape9DType>('enneract');
  const [rotation9DAxes, setRotation9DAxes] = useState<Rotation9DAxis[]>(['xq', 'zw', 'yv']);
  const [projectionMode9D, setProjectionMode9D] = useState<ProjectionMode9D>('wireframe');
  const [shape10d, setShape10d] = useState<Shape10DType>('dekeract');
  const [rotation10DAxes, setRotation10DAxes] = useState<Rotation10DAxis[]>(['xp', 'zw', 'yv']);
  const [projectionMode10D, setProjectionMode10D] = useState<ProjectionMode10D>('wireframe');
  const [particleSize, setParticleSize] = useState(12);
  const [lineThickness, setLineThickness] = useState(1);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [particleColor, setParticleColor] = useState('#00ff88');
  const [density, setDensity] = useState(25);
  const [particleType, setParticleType] = useState<ParticleType>('soft');
  const [particleShape, setParticleShape] = useState<ParticleShape>('circle');
  const [secondaryColor, setSecondaryColor] = useState('#ff6b6b');
  const [gradientMode, setGradientMode] = useState<GradientMode>('solid');
  const [colorSaturation, setColorSaturation] = useState(0.5);
  const [universal4DRotation, setUniversal4DRotation] = useState(false);
  const [universal5DRotation, setUniversal5DRotation] = useState(false);
  const [universal6DRotation, setUniversal6DRotation] = useState(false);
  const [universal7DRotation, setUniversal7DRotation] = useState(false);
  const [universal8DRotation, setUniversal8DRotation] = useState(false);
  const [universal9DRotation, setUniversal9DRotation] = useState(false);
  const [universal10DRotation, setUniversal10DRotation] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  
  // GPU Compute (Phase 2) - disabled by default, enable for GPU-accelerated particles
  const [gpuCompute, setGpuCompute] = useState(false);
  
  // Physics (Phase 4)
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [physicsDamping, setPhysicsDamping] = useState(0.98);
  const [physicsGravity, setPhysicsGravity] = useState(0);
  const [physicsMaxVelocity, setPhysicsMaxVelocity] = useState(2);
  const [attractor1Enabled, setAttractor1Enabled] = useState(false);
  const [attractor1Strength, setAttractor1Strength] = useState(0.5);
  const [attractor2Enabled, setAttractor2Enabled] = useState(false);
  const [attractor2Strength, setAttractor2Strength] = useState(0.5);
  
  // Bloom effect - defaults optimized for visibility
  const [bloomEnabled, setBloomEnabled] = useState(true); // Enable by default for visual feedback
  const [bloomStrength, setBloomStrength] = useState(2.5); // Higher strength for visible glow
  const [bloomThreshold, setBloomThreshold] = useState(0.2); // Threshold to control which areas bloom
  const [bloomRadius, setBloomRadius] = useState(0.5); // Medium radius for nice blur
  
  // Performance stats
  const [perfStats, setPerfStats] = useState({ fps: 0, drawCalls: 0, triangles: 0, frameTime: 0, gpuCompute: true });

  const handleReset = () => {
    setDimensionMode('3D');
    setGeometryMode('shapes');
    setShape2d('hexagon');
    setShape('cube');
    setHoneycomb('cubicHoneycomb');
    setShape4d('tesseract');
    setShape5d('penteract');
    setShape6d('hexeract');
    setShape7d('hepteract');
    setShape8d('octeract');
    setShape9d('enneract');
    setShape10d('dekeract');
    setParticleSize(12);
    setLineThickness(1);
    setRotationSpeed(0.5);
    setParticleColor('#00ff88');
    setDensity(25);
    setRotationAxes(['y']);
    setRotationDirection(1);
    setRotation2DAxes(['xy', 'zw']);
    setRotation4DAxes(['xw', 'zw']);
    setRotation5DAxes(['xv', 'zw', 'yw']);
    setRotation6DAxes(['xu', 'zw', 'yv']);
    setRotation7DAxes(['xs', 'zw', 'yv']);
    setRotation8DAxes(['xr', 'zw', 'yv']);
    setRotation9DAxes(['xq', 'zw', 'yv']);
    setRotation10DAxes(['xp', 'zw', 'yv']);
    setParticleType('soft');
    setParticleShape('circle');
    setSecondaryColor('#ff6b6b');
    setGradientMode('solid');
    setColorSaturation(0.5);
    setRenderMode('solid');
    setProjectionMode('solid');
    setProjectionMode5D('solid');
    setProjectionMode6D('wireframe');
    setProjectionMode7D('wireframe');
    setProjectionMode8D('wireframe');
    setProjectionMode9D('wireframe');
    setProjectionMode10D('wireframe');
    setUniversal4DRotation(false);
    setUniversal5DRotation(false);
    setUniversal6DRotation(false);
    setUniversal7DRotation(false);
    setUniversal8DRotation(false);
    setUniversal9DRotation(false);
    setUniversal10DRotation(false);
    // GPU Compute & Physics reset
    setGpuCompute(false);
    setPhysicsEnabled(false);
    setPhysicsDamping(0.98);
    setPhysicsGravity(0);
    setPhysicsMaxVelocity(2);
    setAttractor1Enabled(false);
    setAttractor1Strength(0.5);
    setAttractor2Enabled(false);
    setAttractor2Strength(0.5);
    // Bloom reset
    setBloomEnabled(true);
    setBloomStrength(2.5);
    setBloomThreshold(0.2);
    setBloomRadius(0.5);
  };

  // Get current shapes based on dimension
  const shapes = dimensionMode === '2D' ? SHAPES_2D :
                 dimensionMode === '3D' ? (geometryMode === 'honeycombs' ? HONEYCOMBS_3D : SHAPES_3D) :
                 dimensionMode === '4D' ? SHAPES_4D :
                 dimensionMode === '5D' ? SHAPES_5D :
                 dimensionMode === '6D' ? SHAPES_6D :
                 dimensionMode === '7D' ? SHAPES_7D :
                 dimensionMode === '8D' ? SHAPES_8D :
                 dimensionMode === '9D' ? SHAPES_9D : SHAPES_10D;
  const currentShape = dimensionMode === '2D' ? shape2d :
                       dimensionMode === '3D' ? (geometryMode === 'honeycombs' ? honeycomb : shape) :
                       dimensionMode === '4D' ? shape4d :
                       dimensionMode === '5D' ? shape5d :
                       dimensionMode === '6D' ? shape6d :
                       dimensionMode === '7D' ? shape7d :
                       dimensionMode === '8D' ? shape8d :
                       dimensionMode === '9D' ? shape9d : shape10d;
  const setShapeState = dimensionMode === '2D' ? setShape2d :
                        dimensionMode === '3D' ? (geometryMode === 'honeycombs' ? setHoneycomb as any : setShape) :
                        dimensionMode === '4D' ? setShape4d :
                        dimensionMode === '5D' ? setShape5d :
                        dimensionMode === '6D' ? setShape6d :
                        dimensionMode === '7D' ? setShape7d :
                        dimensionMode === '8D' ? setShape8d :
                        dimensionMode === '9D' ? setShape9d : setShape10d;

  return (
    <main className="h-screen w-screen flex flex-col bg-[#0a0a0f] overflow-hidden relative">
      <div className="absolute inset-0">
        <Suspense fallback={<LoadingFallback />}>
          <ParticleScene
            dimensionMode={dimensionMode}
            geometryMode={geometryMode}
            shape2d={shape2d}
            rotation2DAxes={rotation2DAxes}
            shape={shape}
            honeycomb={honeycomb}
            rotationAxes={rotationAxes}
            rotationDirection={rotationDirection}
            renderMode={renderMode}
            shape4d={shape4d}
            rotation4DAxes={rotation4DAxes}
            projectionMode={projectionMode}
            shape5d={shape5d}
            rotation5DAxes={rotation5DAxes}
            projectionMode5D={projectionMode5D}
            shape6d={shape6d}
            rotation6DAxes={rotation6DAxes}
            projectionMode6D={projectionMode6D}
            shape7d={shape7d}
            rotation7DAxes={rotation7DAxes}
            projectionMode7D={projectionMode7D}
            shape8d={shape8d}
            rotation8DAxes={rotation8DAxes}
            projectionMode8D={projectionMode8D}
            shape9d={shape9d}
            rotation9DAxes={rotation9DAxes}
            projectionMode9D={projectionMode9D}
            shape10d={shape10d}
            rotation10DAxes={rotation10DAxes}
            projectionMode10D={projectionMode10D}
            particleSize={particleSize}
            particleColor={particleColor}
            secondaryColor={secondaryColor}
            rotationSpeed={rotationSpeed}
            density={density}
            particleType={particleType}
            particleShape={particleShape}
            gradientMode={gradientMode}
            colorSaturation={colorSaturation}
            lineThickness={lineThickness}
            universal4DRotation={universal4DRotation}
            universal5DRotation={universal5DRotation}
            universal6DRotation={universal6DRotation}
            universal7DRotation={universal7DRotation}
            universal8DRotation={universal8DRotation}
            universal9DRotation={universal9DRotation}
            universal10DRotation={universal10DRotation}
            // GPU Compute (Phase 2)
            gpuCompute={gpuCompute}
            // Physics (Phase 4)
            physicsEnabled={physicsEnabled}
            physicsDamping={physicsDamping}
            physicsGravity={physicsGravity}
            physicsMaxVelocity={physicsMaxVelocity}
            attractor1Enabled={attractor1Enabled}
            attractor1Strength={attractor1Strength}
            attractor2Enabled={attractor2Enabled}
            attractor2Strength={attractor2Strength}
            // Bloom effect
            bloomEnabled={bloomEnabled}
            bloomStrength={bloomStrength}
            bloomThreshold={bloomThreshold}
            bloomRadius={bloomRadius}
            // Performance callback
            onPerfStats={setPerfStats}
          />
        </Suspense>
      </div>

      {/* Settings toggle button */}
      <button
        onClick={() => setControlsOpen(!controlsOpen)}
        className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-md rounded-full p-3 text-white hover:bg-black/80 transition-colors"
        aria-label={controlsOpen ? 'Close' : 'Open'}
      >
        {controlsOpen ? <X size={24} /> : <Settings size={24} />}
      </button>
      
      {/* Performance stats display - visible on all devices */}
      <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 text-xs pointer-events-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-green-400 font-mono">{perfStats.fps} FPS</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">{perfStats.drawCalls} draw</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">{perfStats.triangles.toLocaleString()} tri</span>
          <span className="text-gray-400">|</span>
          <span className={`${perfStats.gpuCompute ? 'text-cyan-400' : 'text-amber-400'}`}>
            {perfStats.gpuCompute ? 'GPU' : 'CPU'}
          </span>
        </div>
      </div>

      {/* Controls panel */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 ${controlsOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="absolute inset-0 bg-black/30 -z-10 lg:hidden" onClick={() => setControlsOpen(false)} />

        {/* Semi-transparent panel */}
        <div className="bg-black/60 backdrop-blur-xl rounded-t-2xl lg:rounded-none lg:bg-black/60 lg:h-full lg:relative lg:w-80 lg:left-auto lg:right-0 lg:top-0 lg:bottom-auto lg:translate-y-0 lg:border-l lg:border-white/10">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 lg:hidden">
            <div className="w-12 h-1.5 bg-gray-500 rounded-full cursor-pointer" onClick={() => setControlsOpen(false)} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm">Controls</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setControlsExpanded(!controlsExpanded)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                {controlsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className={`overflow-y-auto transition-all ${controlsExpanded ? 'max-h-[60vh] lg:max-h-[calc(100vh-50px)]' : 'max-h-0 lg:max-h-[calc(100vh-50px)]'}`}>
            <div className="p-3 space-y-3 text-xs">

              {/* Dimension selector */}
              <Section title="Dimension">
                <ButtonGroup
                  options={[{ id: '2D', name: '2D' }, { id: '3D', name: '3D' }, { id: '4D', name: '4D' }, { id: '5D', name: '5D' }, { id: '6D', name: '6D' }, { id: '7D', name: '7D' }, { id: '8D', name: '8D' }, { id: '9D', name: '9D' }, { id: '10D', name: '10D' }]}
                  value={dimensionMode}
                  onChange={(v) => setDimensionMode(v)}
                  cols={9}
                />
              </Section>

              <Separator className="bg-white/10" />

              {/* 3D Geometry Mode Toggle */}
              {dimensionMode === '3D' && (
                <>
                  <Section title="Geometry Type">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setGeometryMode('shapes')}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                          geometryMode === 'shapes' ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        Shapes
                      </button>
                      <button
                        onClick={() => setGeometryMode('honeycombs')}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                          geometryMode === 'honeycombs' ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        Honeycombs
                      </button>
                    </div>
                  </Section>
                  <Separator className="bg-white/10" />
                </>
              )}

              {/* Shape selector */}
              <Section title={dimensionMode === '3D' && geometryMode === 'honeycombs' ? 'Honeycomb' : 'Shape'}>
                <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
                  {shapes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setShapeState(s.id as any)}
                      className={`px-2 py-1.5 rounded text-[10px] font-medium transition-all text-left truncate ${
                        currentShape === s.id
                          ? 'bg-[#00ff88] text-black'
                          : 'bg-white/10 text-white/90 hover:bg-white/20'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </Section>

              <Separator className="bg-white/10" />

              {/* Render/Projection Mode */}
              <Section title="Render Mode">
                {dimensionMode === '2D' || dimensionMode === '3D' ? (
                  <ButtonGroup options={RENDER_MODES} value={renderMode} onChange={setRenderMode} cols={2} />
                ) : dimensionMode === '4D' ? (
                  <ButtonGroup options={PROJECTION_MODES_4D} value={projectionMode} onChange={setProjectionMode} cols={3} />
                ) : dimensionMode === '5D' ? (
                  <ButtonGroup options={PROJECTION_MODES_5D} value={projectionMode5D} onChange={setProjectionMode5D} cols={3} />
                ) : dimensionMode === '6D' ? (
                  <ButtonGroup options={PROJECTION_MODES_6D} value={projectionMode6D} onChange={setProjectionMode6D} cols={3} />
                ) : dimensionMode === '7D' ? (
                  <ButtonGroup options={PROJECTION_MODES_7D} value={projectionMode7D} onChange={setProjectionMode7D} cols={3} />
                ) : dimensionMode === '8D' ? (
                  <ButtonGroup options={PROJECTION_MODES_8D} value={projectionMode8D} onChange={setProjectionMode8D} cols={3} />
                ) : dimensionMode === '9D' ? (
                  <ButtonGroup options={PROJECTION_MODES_9D} value={projectionMode9D} onChange={setProjectionMode9D} cols={3} />
                ) : (
                  <ButtonGroup options={PROJECTION_MODES_10D} value={projectionMode10D} onChange={setProjectionMode10D} cols={3} />
                )}
              </Section>

              <Separator className="bg-white/10" />

              {/* Rotation controls */}
              <Section title="Rotation Axes">
                {dimensionMode === '2D' && (
                  <ToggleGroup options={ROTATION_PLANES_4D} values={rotation2DAxes} onChange={setRotation2DAxes} cols={3} />
                )}
                {dimensionMode === '3D' && (
                  <>
                    <ToggleGroup options={ROTATION_AXES_3D} values={rotationAxes} onChange={setRotationAxes} cols={3} />
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => setRotationDirection(1)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                          rotationDirection === 1 ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        Clockwise
                      </button>
                      <button
                        onClick={() => setRotationDirection(-1)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                          rotationDirection === -1 ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        Counter
                      </button>
                    </div>
                  </>
                )}
                {dimensionMode === '4D' && (
                  <ToggleGroup options={ROTATION_PLANES_4D} values={rotation4DAxes} onChange={setRotation4DAxes} cols={3} />
                )}
                {dimensionMode === '5D' && (
                  <ToggleGroup options={ROTATION_PLANES_5D} values={rotation5DAxes} onChange={setRotation5DAxes} cols={5} />
                )}
                {dimensionMode === '6D' && (
                  <ToggleGroup options={ROTATION_PLANES_6D} values={rotation6DAxes} onChange={setRotation6DAxes} cols={5} />
                )}
                {dimensionMode === '7D' && (
                  <ToggleGroup options={ROTATION_PLANES_7D} values={rotation7DAxes} onChange={setRotation7DAxes} cols={6} />
                )}
                {dimensionMode === '8D' && (
                  <ToggleGroup options={ROTATION_PLANES_8D} values={rotation8DAxes} onChange={setRotation8DAxes} cols={7} />
                )}
                {dimensionMode === '9D' && (
                  <ToggleGroup options={ROTATION_PLANES_9D} values={rotation9DAxes} onChange={setRotation9DAxes} cols={8} />
                )}
                {dimensionMode === '10D' && (
                  <ToggleGroup options={ROTATION_PLANES_10D} values={rotation10DAxes} onChange={setRotation10DAxes} cols={9} />
                )}
              </Section>

              {/* Higher dimension rotation toggles */}
              {(dimensionMode === '2D' || dimensionMode === '3D') && (
                <>
                  <Separator className="bg-white/10" />
                  <Section title="Higher-D Rotation">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setUniversal4DRotation(!universal4DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal4DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        4D
                      </button>
                      <button
                        onClick={() => setUniversal5DRotation(!universal5DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal5DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        5D
                      </button>
                      <button
                        onClick={() => setUniversal6DRotation(!universal6DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal6DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        6D
                      </button>
                      <button
                        onClick={() => setUniversal7DRotation(!universal7DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal7DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        7D
                      </button>
                      <button
                        onClick={() => setUniversal8DRotation(!universal8DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal8DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        8D
                      </button>
                      <button
                        onClick={() => setUniversal9DRotation(!universal9DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal9DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        9D
                      </button>
                      <button
                        onClick={() => setUniversal10DRotation(!universal10DRotation)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all min-w-[60px] ${
                          universal10DRotation ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                        }`}
                      >
                        10D
                      </button>
                    </div>
                  </Section>
                </>
              )}

              <Separator className="bg-white/10" />

              {/* Particle settings */}
              <Section title="Particle">
                <ButtonGroup options={PARTICLE_SHAPES} value={particleShape} onChange={setParticleShape} cols={3} />
                <div className="mt-2">
                  <div className="text-[10px] text-gray-400 mb-1">Type</div>
                  <ButtonGroup options={PARTICLE_TYPES} value={particleType} onChange={setParticleType} cols={5} />
                </div>
              </Section>

              <Separator className="bg-white/10" />

              {/* Sliders */}
              <Section title="Parameters">
                <div className="space-y-2">
                  <SliderControl label="Density" value={density} onChange={setDensity} min={5} max={100} step={1} />
                  <SliderControl label="Particle Size" value={particleSize} onChange={setParticleSize} min={2} max={40} step={1} unit="px" />
                  <SliderControl label="Line Thickness" value={lineThickness} onChange={setLineThickness} min={0.5} max={5} step={0.5} unit="x" />
                  <SliderControl label="Speed" value={rotationSpeed} onChange={setRotationSpeed} min={0} max={5} step={0.1} />
                  <SliderControl label="Vibrancy" value={colorSaturation} onChange={setColorSaturation} min={0} max={1} step={0.05} unit="%" />
                </div>
              </Section>

              <Separator className="bg-white/10" />

              {/* Color mode - moved above colors */}
              <Section title="Color Mode">
                <ButtonGroup options={GRADIENT_MODES} value={gradientMode} onChange={setGradientMode} cols={4} />
              </Section>

              <Separator className="bg-white/10" />

              {/* Colors */}
              <Section title="Primary Color">
                <ColorPicker label="" value={particleColor} onChange={setParticleColor} />
              </Section>

              <Section title="Secondary Color">
                <ColorPicker label="" value={secondaryColor} onChange={setSecondaryColor} />
              </Section>

              <Separator className="bg-white/10" />

              {/* Bloom Effect */}
              <Section title="Bloom Effect">
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBloomEnabled(!bloomEnabled)}
                      className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                        bloomEnabled ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                      }`}
                    >
                      {bloomEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  
                  {bloomEnabled && (
                    <>
                      <div className="mt-2">
                        <SliderControl
                          label="Strength"
                          value={bloomStrength}
                          onChange={setBloomStrength}
                          min={0} max={3} step={0.1}
                        />
                      </div>
                      
                      <div className="mt-2">
                        <SliderControl
                          label="Threshold"
                          value={bloomThreshold}
                          onChange={setBloomThreshold}
                          min={0} max={1} step={0.05}
                        />
                      </div>
                      
                      <div className="mt-2">
                        <SliderControl
                          label="Radius"
                          value={bloomRadius}
                          onChange={setBloomRadius}
                          min={0} max={2} step={0.1}
                        />
                      </div>
                    </>
                  )}
                  
                  <p className="text-[8px] text-gray-500 mt-1">
                    Adds glowing effect to bright areas (works with both CPU and GPU)
                  </p>
                </div>
              </Section>

              <Separator className="bg-white/10" />

              {/* GPU Compute (Phase 2) */}
              <Section title="GPU Compute">
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setGpuCompute(!gpuCompute)}
                      className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                        gpuCompute ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                      }`}
                    >
                      {gpuCompute ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">
                    GPU compute for {dimensionMode} particle rotations using TSL shaders
                  </p>
                </div>
              </Section>

              <Separator className="bg-white/10" />

              {/* Physics (Phase 4) */}
              <Section title="Physics">
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPhysicsEnabled(!physicsEnabled)}
                      className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                        physicsEnabled ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white/90 hover:bg-white/20'
                      }`}
                    >
                      {physicsEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  
                  {physicsEnabled && (
                    <>
                      <div className="mt-2">
                        <label className="text-[9px] text-gray-400">Damping (Friction)</label>
                        <Slider
                          value={[physicsDamping]}
                          onValueChange={([v]) => setPhysicsDamping(v)}
                          min={0.8} max={1} step={0.01}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="mt-2">
                        <label className="text-[9px] text-gray-400">Gravity</label>
                        <Slider
                          value={[physicsGravity]}
                          onValueChange={([v]) => setPhysicsGravity(v)}
                          min={0} max={2} step={0.1}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="mt-2">
                        <label className="text-[9px] text-gray-400">Max Velocity</label>
                        <Slider
                          value={[physicsMaxVelocity]}
                          onValueChange={([v]) => setPhysicsMaxVelocity(v)}
                          min={0.5} max={5} step={0.1}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>
              </Section>

              {/* Attractors (Phase 4) */}
              <Section title="Attractors">
                <div className="space-y-2">
                  {/* Attractor 1 */}
                  <div className="p-2 rounded bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-gray-400">Attractor 1 (Right)</span>
                      <button
                        onClick={() => setAttractor1Enabled(!attractor1Enabled)}
                        className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${
                          attractor1Enabled ? 'bg-emerald-500/50 text-white' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {attractor1Enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {attractor1Enabled && (
                      <Slider
                        value={[attractor1Strength]}
                        onValueChange={([v]) => setAttractor1Strength(v)}
                        min={-2} max={2} step={0.1}
                        className="mt-1"
                      />
                    )}
                  </div>
                  
                  {/* Attractor 2 */}
                  <div className="p-2 rounded bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-gray-400">Attractor 2 (Left)</span>
                      <button
                        onClick={() => setAttractor2Enabled(!attractor2Enabled)}
                        className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${
                          attractor2Enabled ? 'bg-emerald-500/50 text-white' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {attractor2Enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {attractor2Enabled && (
                      <Slider
                        value={[attractor2Strength]}
                        onValueChange={([v]) => setAttractor2Strength(v)}
                        min={-2} max={2} step={0.1}
                        className="mt-1"
                      />
                    )}
                  </div>
                  
                  <p className="text-[8px] text-gray-500 mt-1">
                    Positive = attract, Negative = repel
                  </p>
                </div>
              </Section>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
