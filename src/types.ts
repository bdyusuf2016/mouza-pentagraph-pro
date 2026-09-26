export interface ControlPoint {
  id: string;
  label: string;
  u: number;
  v: number;
}

export interface MapExtractionConfig {
  mode: 'original' | 'transparent' | 'colorize';
  color: string;
  threshold: number;
  strength: number;
  smooth: number;
  preserveColor: boolean;
}

export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface WarpData {
  method: 'similarity' | 'affine' | 'tps';
  sourcePoints: { x: number; y: number }[];
  targetPoints: { x: number; y: number }[];
  residuals: number[];
}

export interface AlignmentMetrics {
  rms: number;
  mean: number;
  max: number;
  maxIndex: number;
}

export interface AlignmentInfo {
  method: 'similarity' | 'affine' | 'tps';
  referenceId: string;
  comparisonId: string;
  metrics: AlignmentMetrics;
  timestamp: string;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MouzaLayer {
  id: string;
  name: string;
  short: string;
  bengali: string;
  years: string;
  desc: string;
  color: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: 'normal' | 'difference' | 'multiply' | 'screen' | 'overlay';
  filter: string;
  mapExtraction: MapExtractionConfig;
  displayImage: string | null;
  displayImageKey: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  image: string | null;
  fileType: 'pdf' | 'tiff' | 'image' | null;
  fileName: string;
  totalPages: number;
  currentPage: number;
  points: ControlPoint[];
  affine: AffineMatrix | null;
  warp: WarpData | null;
  alignment: AlignmentInfo | null;
  cropBox?: CropBox | null;
  referenceScale?: ReferenceScaleConfig | null;
  isCustom?: boolean;
}

export type ToolType = 'pan' | 'move' | 'rotate' | 'point' | 'measure' | 'curtain' | 'calibrate' | 'dimension';

export interface MeasurePoint {
  x: number;
  y: number;
}

export interface DimensionLine {
  id: string;
  p1: MeasurePoint;
  p2: MeasurePoint;
  color?: string;
  label?: string;
  lineWidth?: number;
  layerId?: string;
}

export type DimensionDisplayUnit = 'both' | 'feet' | 'link' | 'meter';

export type DimensionCapStyle = 'tick' | 'arrow' | 'slash' | 'dot';

export interface DimensionStyleConfig {
  lineWidth: number; // 1 to 6 px, default: 2
  tickSize: number; // 4 to 20 px, default: 10
  color: string; // hex color, default: '#10b981'
  fontSize: number; // 9 to 16 px, default: 11
  displayUnit: DimensionDisplayUnit; // 'both' | 'feet' | 'link' | 'meter'
  capStyle: DimensionCapStyle; // 'tick' | 'arrow' | 'slash' | 'dot'
  visible: boolean; // default: true
}

export interface PolygonStyleConfig {
  lineWidth: number; // 1 to 8 px
  pointSize: number; // 4 to 16 px
  lineColor: string; // hex color
  fillOpacity: number; // 0 to 0.6
}

export type MapScaleStandard = '16inch' | '32inch' | '64inch' | '80inch' | 'custom';

export type DistanceUnit = 'link' | 'feet' | 'meter' | 'chain';

export interface ReferenceScaleConfig {
  p1: MeasurePoint;
  p2: MeasurePoint;
  pixelDistance: number;
  knownLength: number;
  unit: DistanceUnit;
  pxPerLink: number;
  timestamp?: number;
}

export interface AreaCalculationResult {
  perimeterFeet: number;
  perimeterLinks: number;
  perimeterMeters: number;
  sqFeet: number;
  sqLinks: number;
  sqMeters: number;
  decimals: number; // শতাংশ / ডেসিমাল
  acres: number;    // একর (1 acre = 100 decimals)
  katha: number;    // কাঠা (1 katha = 1.65 decimals = 720 sq ft)
  bigha: number;    // বিঘা (1 bigha = 20 katha = 33 decimals)
  centroid: { x: number; y: number };
}

export const STAGE_WIDTH = 2000;
export const STAGE_HEIGHT = 1400;

export const INITIAL_LAYERS_CONFIG: MouzaLayer[] = [
  {
    id: "CS",
    name: "CS (Cadastral Survey)",
    short: "CS",
    bengali: "সিএস জরিপ",
    years: "১৮৮৮ – ১৯৪০ খ্রি.",
    desc: "ভারত উপমহাদেশে প্রথম বিজ্ঞানসম্মত ও সবচেয়ে প্রামাণ্য কিস্তোয়ার জরিপ",
    color: "#3b82f6",
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: "normal",
    filter: "none",
    mapExtraction: {
      mode: "original",
      color: "#3b82f6",
      threshold: 235,
      strength: 1.2,
      smooth: 1.0,
      preserveColor: true,
    },
    displayImage: null,
    displayImageKey: "",
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    image: null,
    fileType: null,
    fileName: "",
    totalPages: 1,
    currentPage: 1,
    points: [],
    affine: null,
    warp: null,
    alignment: null,
    cropBox: null,
  },
  {
    id: "SA",
    name: "SA (State Acquisition)",
    short: "SA",
    bengali: "এসএ জরিপ",
    years: "১৯৫৬ – ১৯৬৩ খ্রি.",
    desc: "১৯৫০ সালের জমিদারি উচ্ছেদ ও রাষ্ট্রীয় অধিগ্রহণ আইন পরবর্তী জরিপ",
    color: "#f59e0b",
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: "normal",
    filter: "none",
    mapExtraction: {
      mode: "original",
      color: "#f59e0b",
      threshold: 235,
      strength: 1.2,
      smooth: 1.0,
      preserveColor: true,
    },
    displayImage: null,
    displayImageKey: "",
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    image: null,
    fileType: null,
    fileName: "",
    totalPages: 1,
    currentPage: 1,
    points: [],
    affine: null,
    warp: null,
    alignment: null,
    cropBox: null,
  },
  {
    id: "RS",
    name: "RS (Revisional Survey)",
    short: "RS",
    bengali: "আরএস জরিপ",
    years: "১৯৬৬ – ১৯৮০ খ্রি.",
    desc: "CS ও SA নকশার ভুলত্রুটি সংশোধনপূর্বক সবচেয়ে নির্ভরযোগ্য আধুনিক জরিপ",
    color: "#10b981",
    visible: true,
    locked: false,
    opacity: 0.85,
    blendMode: "normal",
    filter: "none",
    mapExtraction: {
      mode: "original",
      color: "#10b981",
      threshold: 235,
      strength: 1.2,
      smooth: 1.0,
      preserveColor: true,
    },
    displayImage: null,
    displayImageKey: "",
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    image: null,
    fileType: null,
    fileName: "",
    totalPages: 1,
    currentPage: 1,
    points: [],
    affine: null,
    warp: null,
    alignment: null,
    cropBox: null,
  },
  {
    id: "BS",
    name: "BS (Bangladesh Survey)",
    short: "BS",
    bengali: "বিএস / সিটি জরিপ",
    years: "১৯৯৮ – বর্তমান",
    desc: "স্বাধীন বাংলাদেশের সর্বশেষ পূর্ণাঙ্গ আধুনিক ক্যাডাস্ট্রাল মৌজা জরিপ",
    color: "#a855f7",
    visible: true,
    locked: false,
    opacity: 0.75,
    blendMode: "normal",
    filter: "none",
    mapExtraction: {
      mode: "original",
      color: "#a855f7",
      threshold: 235,
      strength: 1.2,
      smooth: 1.0,
      preserveColor: true,
    },
    displayImage: null,
    displayImageKey: "",
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    image: null,
    fileType: null,
    fileName: "",
    totalPages: 1,
    currentPage: 1,
    points: [],
    affine: null,
    warp: null,
    alignment: null,
    cropBox: null,
  },
];
