import React, { useState } from 'react';
import { 
  MeasurePoint, 
  MapScaleStandard, 
  AreaCalculationResult, 
  PolygonStyleConfig, 
  ReferenceScaleConfig,
  DistanceUnit,
  DimensionLine,
  DimensionStyleConfig,
  DimensionCapStyle,
  DimensionDisplayUnit
} from '../types';
import { calculatePolygonSurveyArea, toBengaliNumber, SCALE_CONFIGS } from '../utils/landSurvey';
import { 
  Ruler, 
  Trash2, 
  Check, 
  Info, 
  Square, 
  CheckCircle2, 
  Layers, 
  HelpCircle,
  Copy,
  ChevronRight,
  Sliders,
  Scale,
  Sparkles,
  RotateCcw,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';

interface MeasurementPanelProps {
  measurePoints: MeasurePoint[];
  mapScale: MapScaleStandard;
  onSetMapScale: (scale: MapScaleStandard) => void;
  onClearPoints: () => void;
  onClosePolygon: () => void;
  activeLayerName: string;
  isPolygonClosed?: boolean;
  onUndoLastPoint?: () => void;
  polygonStyle?: PolygonStyleConfig;
  onUpdatePolygonStyle?: (patch: Partial<PolygonStyleConfig>) => void;
  customPxPerLink?: number | null;
  onSetCustomPxPerLink?: (px: number | null) => void;
  referenceScale?: ReferenceScaleConfig | null;
  onStartCalibration?: () => void;
  onClearReferenceScale?: () => void;
  dimensionLines?: DimensionLine[];
  onDeleteDimensionLine?: (id: string) => void;
  onClearDimensionLines?: () => void;
  dimensionStyle?: DimensionStyleConfig;
  onUpdateDimensionStyle?: (patch: Partial<DimensionStyleConfig>) => void;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  measurePoints,
  mapScale,
  onSetMapScale,
  onClearPoints,
  onClosePolygon,
  activeLayerName,
  isPolygonClosed = false,
  onUndoLastPoint,
  polygonStyle = { lineWidth: 2.5, pointSize: 7, lineColor: '#0284c7', fillOpacity: 0.2 },
  onUpdatePolygonStyle,
  customPxPerLink,
  onSetCustomPxPerLink,
  referenceScale,
  onStartCalibration,
  onClearReferenceScale,
  dimensionLines = [],
  onDeleteDimensionLine,
  onClearDimensionLines,
  dimensionStyle = {
    lineWidth: 2,
    tickSize: 10,
    color: '#10b981',
    fontSize: 11,
    displayUnit: 'both',
    capStyle: 'tick',
    visible: true,
  },
  onUpdateDimensionStyle,
}) => {
  const [copied, setCopied] = useState(false);
  const effectivePxPerLink = customPxPerLink || referenceScale?.pxPerLink;
  const surveyResult: AreaCalculationResult | null = calculatePolygonSurveyArea(
    measurePoints,
    mapScale,
    effectivePxPerLink || undefined,
    isPolygonClosed || measurePoints.length >= 3
  );

  const handleCopyReport = () => {
    if (!surveyResult || measurePoints.length < 3) return;
    const currentScaleDesc = mapScale === 'custom' && referenceScale
      ? `কাস্টম ক্যালিব্রেটেড (${referenceScale.knownLength} ${referenceScale.unit} = ${referenceScale.pixelDistance.toFixed(1)}px)`
      : SCALE_CONFIGS[mapScale].name;

    const reportText = `[মৌজা পরিমাপ ও জমি জরিপ হিসাব]
নকশা: ${activeLayerName}
স্কেল: ${currentScaleDesc}
মোট পরিমাপ পয়েন্ট: ${measurePoints.length} টি
বহুভুজ অবস্থা: ${isPolygonClosed ? 'সম্পূর্ণ (Closed)' : 'খোলা (Open)'}
---------------------------------
ক্ষেত্রফল (শতাংশ/ডেসিমাল): ${surveyResult.decimals} শতাংশ
ক্ষেত্রফল (একর): ${surveyResult.acres} একর
কাঠা-বিঘা হিসাব: ${surveyResult.katha} কাঠা (${surveyResult.bigha} বিঘা)
বর্গফুট: ${surveyResult.sqFeet.toLocaleString()} sq ft
বর্গলিংক: ${surveyResult.sqLinks.toLocaleString()} sq links
পরিসীমা (ফুট): ${surveyResult.perimeterFeet} ফুট (${surveyResult.perimeterLinks} লিংক)
---------------------------------
(১ একর = ১০০ শতাংশ = ১০০,০০০ বর্গলিংক = ৪৩,৫৬০ বর্গফুট)`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="pb-1 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-sky-400" />
          <span>বহুভুজ দাগ পরিমাপ (Polygon Area)</span>
        </span>
        <span className="text-[11px] text-sky-400 font-mono font-semibold">
          {measurePoints.length} Points {isPolygonClosed ? '(সম্পূর্ণ)' : ''}
        </span>
      </div>

      {/* Reference Scale Calibration & Standard Selector Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>নকশার স্কেল ও রেফারেন্স সেটিং</span>
          </label>
          {referenceScale && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono font-bold">
              ✓ অটো ক্যালিব্রেটেড
            </span>
          )}
        </div>

        <select
          value={mapScale}
          onChange={e => onSetMapScale(e.target.value as MapScaleStandard)}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-medium outline-none focus:border-sky-400 cursor-pointer"
        >
          <option value="16inch">১৬" = ১ মাইল (1:3,960) [CS/RS স্ট্যান্ডার্ড নকশা]</option>
          <option value="32inch">৩২" = ১ মাইল (1:1,980) [আধা-শহরাঞ্চল নকশা]</option>
          <option value="64inch">৬৪" = ১ মাইল (1:990) [ঘনবসতিপূর্ণ প্লট]</option>
          <option value="80inch">৮০" = ১ মাইল (1:792) [সিটি/পৌরসভা জরিপ]</option>
          {referenceScale && (
            <option value="custom">★ কাস্টম ক্যালিব্রেটেড স্কেল (ম্যাপ রেফারেন্স লাইন)</option>
          )}
        </select>

        {/* Reference Scale Calibration Status / Action */}
        {referenceScale ? (
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ম্যাপ রেফারেন্স স্কেল সক্রিয়</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400">
                {referenceScale.pixelDistance.toFixed(1)} px
              </span>
            </div>
            <div className="text-[10.5px] text-slate-300 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400">রেফারেন্স লাইন:</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {referenceScale.knownLength} {referenceScale.unit === 'link' ? 'লিংক' : referenceScale.unit === 'feet' ? 'ফুট' : referenceScale.unit === 'meter' ? 'মিটার' : 'গান্টার চেইন'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">স্কেল রেশিও:</span>
                <span className="font-mono text-slate-200">
                  ১ লিংক = {referenceScale.pxPerLink.toFixed(3)} px (১০০ ফুট = {(referenceScale.pxPerLink / 0.66 * 100).toFixed(1)} px)
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-emerald-900/60">
              <button
                onClick={onStartCalibration}
                className="flex-1 py-1 px-2 rounded bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 text-[11px] font-medium transition-colors cursor-pointer text-center"
              >
                📏 পুনরায় স্কেল মাপুন
              </button>
              {onClearReferenceScale && (
                <button
                  onClick={onClearReferenceScale}
                  className="py-1 px-2 rounded bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-300 text-[11px] transition-colors cursor-pointer"
                  title="কাস্টম স্কেল বাতিল করে স্ট্যান্ডার্ড স্কেলে ফিরুন"
                >
                  রিসেট
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              onClick={onStartCalibration}
              className="w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/60 text-amber-200 hover:text-amber-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer group"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>📏 ম্যাপের লাইন দিয়ে অটো স্কেল সেট করুন</span>
            </button>
            <p className="text-[10px] text-slate-400 leading-tight">
              ম্যাপের স্কেল দাগ (Scale Bar) বা জানা দৈর্ঘ্যের সীমানা লাইনে ২ পয়েন্ট ক্লিক করে অটো স্কেল নির্ধারণ করুন।
            </p>
          </div>
        )}
      </div>

      {/* Polygon Line & Point Tool Controls */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>বহুভুজ লাইন ও পয়েন্ট কন্ট্রোল (Style)</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Right-Click = বন্ধ</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Line Size */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>লাইন সাইজ</span>
              <span className="font-mono text-sky-400 font-semibold">{polygonStyle.lineWidth.toFixed(1)} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={polygonStyle.lineWidth}
              onChange={e => onUpdatePolygonStyle?.({ lineWidth: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Point Size */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>পয়েন্ট সাইজ</span>
              <span className="font-mono text-sky-400 font-semibold">{polygonStyle.pointSize} px</span>
            </div>
            <input
              type="range"
              min="4"
              max="16"
              step="1"
              value={polygonStyle.pointSize}
              onChange={e => onUpdatePolygonStyle?.({ pointSize: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Line Color */}
          <div className="flex items-center justify-between col-span-2 pt-1 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400">লাইনের রঙ (Color):</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={polygonStyle.lineColor}
                onChange={e => onUpdatePolygonStyle?.({ lineColor: e.target.value })}
                className="h-6 w-12 bg-slate-950 border border-slate-800 rounded p-0.5 cursor-pointer"
              />
              <span className="font-mono text-[10px] text-slate-400">{polygonStyle.lineColor}</span>
            </div>
          </div>

          {/* Fill Opacity */}
          <div className="col-span-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>শেড / ফিল অপাসিটি (Fill)</span>
              <span className="font-mono text-sky-400 font-semibold">{Math.round(polygonStyle.fillOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.6"
              step="0.05"
              value={polygonStyle.fillOpacity}
              onChange={e => onUpdatePolygonStyle?.({ fillOpacity: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        <div className="pt-1 text-[10px] text-slate-500 border-t border-slate-800/60 flex items-center gap-1">
          <Info className="w-3 h-3 text-sky-400 shrink-0" />
          <span>টিপস: ক্যানভাসে মাউসের Right-Click করলে বহুভুজ স্বয়ংক্রিয়ভাবে বন্ধ হবে।</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {measurePoints.length >= 3 && (
            <button
              onClick={onClosePolygon}
              className={`flex-1 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                isPolygonClosed
                  ? 'bg-sky-600 hover:bg-sky-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isPolygonClosed ? 'সম্পাদনা মোড' : 'বহুভুজ বন্ধ করুন'}</span>
            </button>
          )}
          {measurePoints.length > 0 && onUndoLastPoint && (
            <button
              onClick={onUndoLastPoint}
              className="px-2.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="পূর্বের পরিমাপ বিন্দু মুছুন (Backspace)"
            >
              <span>↩ আগের বিন্দু</span>
            </button>
          )}
          <button
            onClick={onClearPoints}
            disabled={measurePoints.length === 0}
            className={`px-3 py-2 rounded-lg border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              measurePoints.length > 0
                ? 'hover:bg-red-950/40 text-slate-300 hover:text-red-400 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="সব পরিমাপ বিন্দু মুছুন"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>রিসেট</span>
          </button>
        </div>
      </div>

      {/* Results Display */}
      {surveyResult && measurePoints.length >= 3 ? (
        <div className="space-y-3">
          {/* Main Area Card */}
          <div className="rounded-xl border border-sky-500/40 bg-gradient-to-b from-sky-950/40 to-slate-900/90 p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] font-medium text-slate-400">মোট ক্ষেত্রফল (জমির পরিমাণ)</span>
              <button
                onClick={handleCopyReport}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                title="পরিমাপ রিপোর্ট কপি করুন"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'কপি হয়েছে!' : 'কপি'}</span>
              </button>
            </div>

            {/* Primary Land Units: Decimals & Acres */}
            <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
                  {toBengaliNumber(surveyResult.decimals)}
                </span>
                <span className="text-xs font-bold text-slate-300 ml-1.5">শতাংশ / ডেসিমাল</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-sky-300 font-mono">
                  {surveyResult.acres}
                </span>
                <span className="text-xs text-slate-400 ml-1 font-medium">একর (Acres)</span>
              </div>
            </div>

            {/* Secondary Traditional Units: Katha & Bigha */}
            <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg py-2 px-1">
                <span className="text-[10px] text-slate-400 block font-medium">কাঠা (Katha)</span>
                <span className="font-bold text-slate-200 text-sm font-mono">
                  {toBengaliNumber(surveyResult.katha)} কাঠা
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg py-2 px-1">
                <span className="text-[10px] text-slate-400 block font-medium">বিঘা (Bigha)</span>
                <span className="font-bold text-slate-200 text-sm font-mono">
                  {toBengaliNumber(surveyResult.bigha)} বিঘা
                </span>
              </div>
            </div>

            {/* Square Feet & Links breakdown */}
            <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">বর্গফুট (Sq. Feet):</span>
                <span className="font-mono font-medium text-slate-200">
                  {surveyResult.sqFeet.toLocaleString()} sq ft
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">বর্গলিংক (Sq. Links):</span>
                <span className="font-mono font-medium text-slate-200">
                  {surveyResult.sqLinks.toLocaleString()} links²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">বর্গমিটার (Sq. Meters):</span>
                <span className="font-mono font-medium text-slate-200">
                  {surveyResult.sqMeters.toLocaleString()} m²
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">মোট পরিসীমা (Perimeter):</span>
                <span className="font-mono font-medium text-sky-400">
                  {surveyResult.perimeterFeet} ফুট ({surveyResult.perimeterLinks} লিংক)
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : surveyResult && measurePoints.length === 2 ? (
        /* Line distance mode */
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2">
          <span className="text-[11px] text-slate-400 block font-medium">সীমানা রেখার দৈর্ঘ্য:</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-sky-400 font-mono">
              {surveyResult.perimeterFeet}
            </span>
            <span className="text-xs text-slate-300">ফুট</span>
            <span className="text-xs text-slate-500 font-mono ml-auto">
              ({surveyResult.perimeterLinks} লিংক / {surveyResult.perimeterMeters} মি.)
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500">
            আরও পয়েন্টে ক্লিক করে বহুভুজ (Polygon) সম্পূর্ণ করলে স্বয়ংক্রিয়ভাবে শতাংশ ও একর হিসাব প্রদর্শিত হবে।
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-sky-400">
            <Ruler className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            ম্যাপের উপর দাগের প্রতিটি কোণায় ক্লিক করুন। ৩ বা ততোধিক বিন্দু সংযোগ করে যেকোনো আঁকাবাঁকা প্লটের সঠিক শতাংশ (Decimal) ও একর হিসাব পাওয়া যাবে।
          </p>
        </div>
      )}

      {/* Dimension Line Controls (ডাইমেনশন লাইন কন্ট্রোলস) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>ডাইমেনশন লাইন কন্ট্রোল (Controls)</span>
          </span>
          <button
            onClick={() => onUpdateDimensionStyle?.({ visible: !dimensionStyle.visible })}
            className={`p-1 rounded flex items-center gap-1 text-[10px] transition-colors cursor-pointer ${
              dimensionStyle.visible ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'
            }`}
            title={dimensionStyle.visible ? 'সব ডাইমেনশন লাইন লুকান' : 'সব ডাইমেনশন লাইন প্রদর্শন করুন'}
          >
            {dimensionStyle.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{dimensionStyle.visible ? 'দৃশ্যমান' : 'লুকানো'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Line Width */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>লাইন সাইজ</span>
              <span className="font-mono text-emerald-400 font-semibold">{dimensionStyle.lineWidth} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="0.5"
              value={dimensionStyle.lineWidth}
              onChange={e => onUpdateDimensionStyle?.({ lineWidth: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* End Cap / Tick Size */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>এন্ড টিক সাইজ</span>
              <span className="font-mono text-emerald-400 font-semibold">{dimensionStyle.tickSize} px</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              step="1"
              value={dimensionStyle.tickSize}
              onChange={e => onUpdateDimensionStyle?.({ tickSize: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Cap Style Selector */}
        <div>
          <span className="text-[11px] text-slate-400 block mb-1">এন্ড ক্যাপ স্টাইল:</span>
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            {[
              { id: 'tick', label: 'লম্ব (|)' },
              { id: 'slash', label: 'স্ল্যাশ (/)' },
              { id: 'arrow', label: 'তীর (►)' },
              { id: 'dot', label: 'বিন্দু (●)' },
            ].map(cap => (
              <button
                key={cap.id}
                onClick={() => onUpdateDimensionStyle?.({ capStyle: cap.id as DimensionCapStyle })}
                className={`py-1 px-1 rounded text-center font-medium border transition-colors cursor-pointer ${
                  dimensionStyle.capStyle === cap.id
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cap.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unit Format Selector */}
        <div>
          <span className="text-[11px] text-slate-400 block mb-1">দূরত্বের একক প্রদর্শন:</span>
          <div className="grid grid-cols-4 gap-1 text-[10.5px]">
            {[
              { id: 'both', label: 'ফুট+লিংক' },
              { id: 'feet', label: 'শুধু ফুট' },
              { id: 'link', label: 'শুধু লিংক' },
              { id: 'meter', label: 'মিটার' },
            ].map(unit => (
              <button
                key={unit.id}
                onClick={() => onUpdateDimensionStyle?.({ displayUnit: unit.id as DimensionDisplayUnit })}
                className={`py-1 px-1 rounded text-center transition-colors cursor-pointer border ${
                  dimensionStyle.displayUnit === unit.id
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {unit.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
            <Palette className="w-3 h-3 text-slate-400" />
            <span>ডাইমেনশন লাইনের রং:</span>
          </span>
          <div className="flex items-center gap-1.5 pt-0.5">
            {[
              { name: 'Emerald', hex: '#10b981' },
              { name: 'Cyan', hex: '#06b6d4' },
              { name: 'Amber', hex: '#f59e0b' },
              { name: 'Rose', hex: '#f43f5e' },
              { name: 'Purple', hex: '#8b5cf6' },
              { name: 'White', hex: '#ffffff' },
              { name: 'Yellow', hex: '#eab308' },
            ].map(c => (
              <button
                key={c.hex}
                onClick={() => onUpdateDimensionStyle?.({ color: c.hex })}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  dimensionStyle.color === c.hex ? 'scale-110 border-white ring-2 ring-emerald-500/50' : 'border-slate-800 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Lines (ডাইমেনশন লাইন তালিকা) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>ডাইমেনশন লাইন ({dimensionLines.length})</span>
          </span>
          {dimensionLines.length > 0 && onClearDimensionLines && (
            <button
              onClick={onClearDimensionLines}
              className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="সবগুলো ডাইমেনশন লাইন মুছুন"
            >
              <Trash2 className="w-3 h-3" />
              <span>মুছুন</span>
            </button>
          )}
        </div>

        {dimensionLines.length === 0 ? (
          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            ম্যাপে যেকোনো সীমানা বা প্লটের লাইন মাপতে উপরের <span className="text-emerald-400 font-medium">"ডাইমেনশন লাইন"</span> টুলে ক্লিক করে ২টি পয়েন্ট চিহ্নিত করুন।
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {dimensionLines.map((dim, idx) => {
              const distPx = Math.hypot(dim.p2.x - dim.p1.x, dim.p2.y - dim.p1.y);
              const scaleCfg = SCALE_CONFIGS[mapScale];
              const pxPerLink = effectivePxPerLink || scaleCfg.pxPerLink || 0.625;
              const links = Math.round(distPx / pxPerLink);
              const feet = (links * 0.66).toFixed(1);
              const meters = (links * 0.201168).toFixed(1);

              return (
                <div
                  key={dim.id || idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] hover:border-emerald-500/40 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-slate-200">
                        {feet} ft <span className="text-slate-400 font-sans font-normal text-[10px]">({links} লিংক)</span>
                      </div>
                      <span className="text-[9.5px] text-slate-500 font-mono">
                        {meters} মি. · {distPx.toFixed(0)} px
                      </span>
                    </div>
                  </div>
                  {onDeleteDimensionLine && (
                    <button
                      onClick={() => onDeleteDimensionLine(dim.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="এই ডাইমেনশন লাইনটি মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Land Survey Reference Standards */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-[10.5px] text-slate-400">
        <span className="font-semibold text-slate-300 block flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>বাংলাদেশ ভূমির পরিমাপ একক সূত্রাবলী:</span>
        </span>
        <ul className="space-y-0.5 pl-4 list-disc text-slate-400">
          <li>১ একর = ১০০ শতাংশ (ডেসিমাল) = ৪৩,৫৬০ বর্গফুট</li>
          <li>১ শতাংশ (ডেসিমাল) = ১,০০০ বর্গলিংক = ৪৩৫.৬ বর্গফুট</li>
          <li>১ গান্টার চেইন = ৬৬ ফুট = ১০০ লিংক (১ লিংক = ৭.৯২ ইঞ্চি)</li>
          <li>১ কাঠা = ৭২০ বর্গফুট = ১.৬৫৩ শতাংশ</li>
          <li>১ বিঘা = ২০ কাঠা = ৩৩ শতাংশ</li>
        </ul>
      </div>
    </div>
  );
};
