import { MeasurePoint, AreaCalculationResult, MapScaleStandard, DistanceUnit } from '../types';

/**
 * Standard survey scales used in Bangladesh Mouza Maps:
 * - 16 inches = 1 mile (1:3,960) -> Most CS & RS sheets
 * - 32 inches = 1 mile (1:1,980) -> Urban/densely plotted sheets
 * - 64 inches = 1 mile (1:990)  -> Congested homestead/town areas
 * - 80 inches = 1 mile (1:792)  -> Detailed town/city plans
 *
 * 1 Gunther's Chain = 66 feet = 100 links (1 link = 0.66 ft = 7.92 inches).
 * 1 Acre = 100,000 sq links = 43,560 sq ft = 100 Decimals (শতাংশ).
 * 1 Decimal = 1,000 sq links = 435.6 sq ft = 40.4686 sq meters.
 * 1 Katha = 720 sq ft = 1.6528 Decimals (২০ কাঠা = ১ বিঘা = ৩৩ শতাংশ / ৩৩ ডেসিমাল).
 */
export const SCALE_CONFIGS: Record<MapScaleStandard, { name: string; desc: string; pxPerLink: number }> = {
  '16inch': {
    name: '১৬ ইঞ্চি = ১ মাইল (1:3,960)',
    desc: 'স্ট্যান্ডার্ড গ্রামীণ মৌজা নকশা (CS/RS অধিকাংশ শিট)',
    pxPerLink: 0.625,
  },
  '32inch': {
    name: '৩২ ইঞ্চি = ১ মাইল (1:1,980)',
    desc: 'ঘনবসতিপূর্ণ ও আধা-শহরাঞ্চল মৌজা নকশা',
    pxPerLink: 1.25,
  },
  '64inch': {
    name: '৬৪ ইঞ্চি = ১ মাইল (1:990)',
    desc: 'শহুরে ও ঘন বাণিজ্যিক দাগসমূহ',
    pxPerLink: 2.5,
  },
  '80inch': {
    name: '৮০ ইঞ্চি = ১ মাইল (1:792)',
    desc: 'সিটি জরিপ / অত্যন্ত ঘন বসতি নকশা',
    pxPerLink: 3.125,
  },
  'custom': {
    name: 'কাস্টম ক্যালিব্রেটেড স্কেল (ম্যাপ রেফারেন্স লাইন)',
    desc: 'ম্যাপের জানা দৈর্ঘ্যের রেফারেন্স লাইন দিয়ে অটো ক্যালিব্রেশন',
    pxPerLink: 0.625,
  },
};

export function convertToLinks(value: number, unit: DistanceUnit): number {
  switch (unit) {
    case 'link':
      return value;
    case 'feet':
      return value / 0.66; // 1 link = 0.66 ft
    case 'meter':
      return (value / 0.3048) / 0.66; // 1 m = 3.28084 ft
    case 'chain':
      return value * 100; // 1 Gunther chain = 100 links
    default:
      return value;
  }
}

export function calculatePxPerLinkFromReference(
  pixelDistance: number,
  knownLength: number,
  unit: DistanceUnit
): number {
  const totalLinks = convertToLinks(knownLength, unit);
  if (totalLinks <= 0) return 0.625;
  return pixelDistance / totalLinks;
}

/**
 * Calculates perimeter and polygon area using Shoelace formula,
 * converting to standard Bangladeshi land surveying units.
 */
export function calculatePolygonSurveyArea(
  points: MeasurePoint[],
  scaleStandard: MapScaleStandard = '16inch',
  customPxPerLink?: number,
  isClosed: boolean = true
): AreaCalculationResult | null {
  if (points.length < 2) return null;

  const defaultPxPerLink = SCALE_CONFIGS[scaleStandard]?.pxPerLink || 0.625;
  const pxPerLink = customPxPerLink && customPxPerLink > 0 
    ? customPxPerLink 
    : defaultPxPerLink;

  // 1. Calculate perimeter (stage pixels)
  let totalPerimeterPx = 0;
  for (let i = 0; i < points.length; i++) {
    const nextIdx = (i + 1) % points.length;
    // If not closed or 2 points, only measure the open segment line
    if ((!isClosed || points.length === 2) && nextIdx === 0) continue;
    const p1 = points[i];
    const p2 = points[nextIdx];
    totalPerimeterPx += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  const perimeterLinks = totalPerimeterPx / pxPerLink;
  const perimeterFeet = perimeterLinks * 0.66;
  const perimeterMeters = perimeterFeet * 0.3048;

  // 2. Shoelace Area Calculation
  let sqPixels = 0;
  let centroidX = 0;
  let centroidY = 0;

  if (points.length >= 3) {
    let crossSum = 0;
    let cxSum = 0;
    let cySum = 0;

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const factor = (points[i].x * points[j].y - points[j].x * points[i].y);
      crossSum += factor;
      cxSum += (points[i].x + points[j].x) * factor;
      cySum += (points[i].y + points[j].y) * factor;
    }

    sqPixels = Math.abs(crossSum) / 2;
    if (Math.abs(crossSum) > 1e-6) {
      centroidX = cxSum / (3 * crossSum);
      centroidY = cySum / (3 * crossSum);
    } else {
      centroidX = points.reduce((acc, p) => acc + p.x, 0) / points.length;
      centroidY = points.reduce((acc, p) => acc + p.y, 0) / points.length;
    }
  } else {
    centroidX = (points[0].x + points[1].x) / 2;
    centroidY = (points[0].y + points[1].y) / 2;
  }

  // 1 sq link = (pxPerLink)^2 sq pixels
  const sqLinks = sqPixels / (pxPerLink * pxPerLink);
  // 1 link = 0.66 ft => 1 sq link = 0.4356 sq ft
  const sqFeet = sqLinks * 0.4356;
  // 1 sq ft = 0.092903 sq meter
  const sqMeters = sqFeet * 0.092903;

  // 1 Decimal (শতাংশ) = 435.6 sq ft = 1,000 sq links
  const decimals = sqFeet / 435.6;
  // 1 Acre = 100 decimals = 43,560 sq ft
  const acres = decimals / 100;
  // 1 Katha = 720 sq ft = 1.6528 decimals
  const katha = sqFeet / 720;
  // 1 Bigha = 20 katha = 33 decimals
  const bigha = katha / 20;

  return {
    perimeterFeet: Number(perimeterFeet.toFixed(2)),
    perimeterLinks: Number(perimeterLinks.toFixed(2)),
    perimeterMeters: Number(perimeterMeters.toFixed(2)),
    sqFeet: Number(sqFeet.toFixed(2)),
    sqLinks: Number(sqLinks.toFixed(1)),
    sqMeters: Number(sqMeters.toFixed(2)),
    decimals: Number(decimals.toFixed(3)),
    acres: Number(acres.toFixed(4)),
    katha: Number(katha.toFixed(2)),
    bigha: Number(bigha.toFixed(3)),
    centroid: { x: centroidX, y: centroidY },
  };
}

/**
 * Format English numbers into Bengali digits
 */
export function toBengaliNumber(val: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/\d/g, d => bnDigits[Number(d)]);
}
