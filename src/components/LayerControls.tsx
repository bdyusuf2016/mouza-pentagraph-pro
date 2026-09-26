import React, { useRef, useState, useEffect } from 'react';
import { MouzaLayer, MapExtractionConfig } from '../types';
import { Sliders, Sparkles, RefreshCw, Move, RotateCw, RotateCcw, Crosshair, Compass } from 'lucide-react';

interface LayerControlsProps {
  layer: MouzaLayer;
  onUpdateLayer: (updates: Partial<MouzaLayer>) => void;
  onResetTransform: () => void;
  onCenterLayer: () => void;
  onNudge: (dx: number, dy: number) => void;
  onRotateStep: (deg: number) => void;
  stageZoom: number;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  layer,
  onUpdateLayer,
  onResetTransform,
  onCenterLayer,
  onNudge,
  onRotateStep,
  stageZoom,
}) => {
  const isLocked = layer.locked;

  const handleSetRotation = (rot: number) => {
    if (isLocked) return;
    let val = rot;
    while (val > 180) val -= 360;
    while (val < -180) val += 360;
    onUpdateLayer({ rotation: Number(val.toFixed(2)), affine: null, warp: null });
  };

  const handleExtractionChange = (patch: Partial<MapExtractionConfig>) => {
    if (isLocked) return;
    onUpdateLayer({
      mapExtraction: {
        ...layer.mapExtraction,
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Opacity slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>স্বচ্ছতা (Opacity)</span>
          <span className="font-mono text-slate-200">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          disabled={isLocked}
          value={layer.opacity}
          onChange={e => onUpdateLayer({ opacity: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Blend Mode */}
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 block">ব্লেন্ডিং মোড (Blend Mode)</label>
        <select
          value={layer.blendMode}
          disabled={isLocked}
          onChange={e => onUpdateLayer({ blendMode: e.target.value as any })}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 disabled:opacity-50"
        >
          <option value="normal">Normal (স্বাভাবিক - স্পষ্ট নকশা)</option>
          <option value="difference">Difference (পার্থক্য - দাগ মেলানোর জন্য)</option>
          <option value="multiply">Multiply (স্বচ্ছ লাইন ওভারলে)</option>
          <option value="screen">Screen (স্ক্রিন - লাইট মোড)</option>
          <option value="overlay">Overlay (ওভারলে)</option>
        </select>
      </div>

      {/* Filter / Color tint */}
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 block">কালার ফিল্টার (Filter)</label>
        <select
          value={layer.filter}
          disabled={isLocked}
          onChange={e => onUpdateLayer({ filter: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 disabled:opacity-50"
        >
          <option value="none">স্বাভাবিক রঙ</option>
          <option value="invert(1)">ইনভার্ট (সাদা ব্যাকগ্রাউন্ড কালো)</option>
          <option value="contrast(1.6) brightness(0.95)">হাই-কনট্রাস্ট (দাগ স্পষ্ট করুন)</option>
          <option value="sepia(1) hue-rotate(180deg) saturate(3)">নীল আভা (Blue Tint)</option>
          <option value="sepia(1) hue-rotate(320deg) saturate(4)">লাল আভা (Red Tint)</option>
          <option value="grayscale(1) contrast(1.5)">গ্রেস্কেল (সাদা-কালো)</option>
        </select>
      </div>

      {/* Map Extraction / Background removal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>লাইন / Background Extraction</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-sky-950 text-sky-300 border border-sky-800/60 px-2 py-0.5 rounded-full">
            {layer.mapExtraction.mode === 'original'
              ? 'Original'
              : layer.mapExtraction.mode === 'transparent'
              ? 'Transparent'
              : 'Clean Line'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="col-span-2">
            <label className="text-[11px] text-slate-400 block mb-1">ডিসপ্লে মোড</label>
            <select
              value={layer.mapExtraction.mode}
              disabled={isLocked}
              onChange={e => handleExtractionChange({ mode: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="original">Original Map (অরিজিনাল)</option>
              <option value="transparent">Transparent Background (সাদা কাগজ মুছুন)</option>
              <option value="colorize">Clean Colored Line (এক রঙে লাইন)</option>
            </select>
          </div>

          {/* Background Threshold (0 to 255) */}
          <div className="col-span-2">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Background Threshold (ব্যাকগ্রাউন্ড থ্রেশহোল্ড)</span>
              <span className="font-mono text-sky-400 font-semibold">{layer.mapExtraction.threshold ?? 235}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              step="1"
              disabled={isLocked || layer.mapExtraction.mode === 'original'}
              value={layer.mapExtraction.threshold ?? 235}
              onChange={e => handleExtractionChange({ threshold: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>0 (সর্বোচ্চ ব্যাকগ্রাউন্ড কর্তন)</span>
              <span>255 (নূন্যতম ব্যাকগ্রাউন্ড কর্তন)</span>
            </div>
          </div>

          {/* Line Clarity / Strength */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>লাইন স্পষ্টতা (Clarity)</span>
              <span className="font-mono text-sky-400 font-semibold">{(layer.mapExtraction.strength ?? 1.2).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              disabled={isLocked || layer.mapExtraction.mode === 'original'}
              value={layer.mapExtraction.strength ?? 1.2}
              onChange={e => handleExtractionChange({ strength: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Line Smoothness */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>লাইন মসৃণতা (Smooth)</span>
              <span className="font-mono text-sky-400 font-semibold">{(layer.mapExtraction.smooth ?? 1.0).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              disabled={isLocked || layer.mapExtraction.mode === 'original'}
              value={layer.mapExtraction.smooth ?? 1.0}
              onChange={e => handleExtractionChange({ smooth: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Line Color */}
          <div className="col-span-2 flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
            <label className="text-[11px] text-slate-400 whitespace-nowrap">লাইন রঙ (Color):</label>
            <input
              type="color"
              disabled={isLocked || layer.mapExtraction.mode === 'original' || (layer.mapExtraction.mode === 'transparent' && layer.mapExtraction.preserveColor)}
              value={layer.mapExtraction.color || layer.color}
              onChange={e => handleExtractionChange({ color: e.target.value })}
              className="h-7 w-20 bg-slate-950 border border-slate-800 rounded-md p-0.5 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Preserve Original Line Color */}
          <div className="col-span-2 flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id="preserveCol"
              disabled={isLocked || layer.mapExtraction.mode !== 'transparent'}
              checked={layer.mapExtraction.preserveColor ?? true}
              onChange={e => handleExtractionChange({ preserveColor: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="preserveCol" className="text-[11px] text-slate-300 cursor-pointer select-none">
              মূল নকশার কালার অক্ষুণ্ণ রেখে লাইন স্পষ্ট করুন
            </label>
          </div>
        </div>
      </div>

      {/* Scale Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>স্কেল (Scale)</span>
          <span className="font-mono text-slate-200">{Number(layer.scale).toFixed(3)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="4.0"
          step="0.002"
          disabled={isLocked}
          value={layer.scale}
          onChange={e => onUpdateLayer({ scale: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Comprehensive Map Rotation Control Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>মৌজা ম্যাপ রোটেশন (Rotation Panel)</span>
          </div>
          <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-2 py-0.5 rounded-md">
            {Number(layer.rotation).toFixed(2)}°
          </span>
        </div>

        {/* Interactive Visual Compass Dial */}
        <div className="flex items-center justify-center border-b border-slate-800/80 pb-2">
          <AngleDial
            rotation={layer.rotation}
            disabled={isLocked}
            onChange={handleSetRotation}
          />
        </div>

        {/* Angle Slider & Direct Input Field */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-180"
              max="180"
              step="0.05"
              disabled={isLocked}
              value={layer.rotation}
              onChange={e => handleSetRotation(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 flex-1"
            />
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 w-20 shrink-0">
              <input
                type="number"
                min="-360"
                max="360"
                step="0.01"
                disabled={isLocked}
                value={Number(layer.rotation.toFixed(2))}
                onChange={e => {
                  let val = parseFloat(e.target.value);
                  if (isNaN(val)) return;
                  handleSetRotation(val);
                }}
                className="w-full bg-transparent text-right font-mono text-xs text-white outline-none disabled:opacity-50"
              />
              <span className="text-xs text-slate-400">°</span>
            </div>
          </div>
        </div>

        {/* Quick Angle Presets */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={() => handleSetRotation(0)}
            disabled={isLocked}
            className={`py-1 rounded text-[11px] font-mono font-medium transition-colors border ${
              layer.rotation === 0
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            } disabled:opacity-50`}
            title="মূল অবস্থা (0° উত্তর দিক)"
          >
            0° (North)
          </button>
          <button
            onClick={() => handleSetRotation(layer.rotation + 90)}
            disabled={isLocked}
            className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono font-medium disabled:opacity-50"
            title="+90° ডান দিকে ঘোরান"
          >
            +90°
          </button>
          <button
            onClick={() => handleSetRotation(layer.rotation - 90)}
            disabled={isLocked}
            className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono font-medium disabled:opacity-50"
            title="-90° বাম দিকে ঘোরান"
          >
            -90°
          </button>
          <button
            onClick={() => handleSetRotation(layer.rotation + 180)}
            disabled={isLocked}
            className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono font-medium disabled:opacity-50"
            title="180° উল্টে দিন"
          >
            180° Flip
          </button>
        </div>

        {/* Fine Multi-Step Rotation Controls */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] text-slate-400 font-medium block">সূক্ষ্ম ঘূর্ণন ধাপ (Step Increments):</span>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => onRotateStep(-45.0)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↺ -45°
            </button>
            <button
              onClick={() => onRotateStep(-5.0)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↺ -5°
            </button>
            <button
              onClick={() => onRotateStep(-1.0)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↺ -1°
            </button>
            <button
              onClick={() => onRotateStep(-0.1)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↺ -0.1°
            </button>

            <button
              onClick={() => onRotateStep(0.1)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↻ +0.1°
            </button>
            <button
              onClick={() => onRotateStep(1.0)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↻ +1°
            </button>
            <button
              onClick={() => onRotateStep(5.0)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↻ +5°
            </button>
            <button
              onClick={() => onRotateStep(45.0)}
              disabled={isLocked}
              className="py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-mono disabled:opacity-50"
            >
              ↻ +45°
            </button>
          </div>
        </div>

        {/* 2-Point Baseline Auto Angle Alignment */}
        {layer.points.length >= 2 && (
          <div className="border-t border-slate-800 pt-2 mt-2 space-y-1.5">
            <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              <span>২-পয়েন্ট বেসলাইন কোণ সোজা করুন ({layer.points[0].label} → {layer.points[1].label}):</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  const p1 = layer.points[0];
                  const p2 = layer.points[1];
                  const dx = p2.u - p1.u;
                  const dy = p2.v - p1.v;
                  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                  handleSetRotation(-angleDeg);
                }}
                disabled={isLocked}
                className="px-2 py-1.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-200 text-[11px] font-medium text-center disabled:opacity-50"
                title={`${layer.points[0].label} ও ${layer.points[1].label} এর মধ্যবর্তী রেখাকে অনুভূমিক (Horizontal 0°) করুন`}
              >
                হরাইজন্টাল (0°) করুন
              </button>
              <button
                onClick={() => {
                  const p1 = layer.points[0];
                  const p2 = layer.points[1];
                  const dx = p2.u - p1.u;
                  const dy = p2.v - p1.v;
                  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                  handleSetRotation(90 - angleDeg);
                }}
                disabled={isLocked}
                className="px-2 py-1.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-200 text-[11px] font-medium text-center disabled:opacity-50"
                title={`${layer.points[0].label} ও ${layer.points[1].label} এর মধ্যবর্তী রেখাকে উল্লম্ব (Vertical 90°) করুন`}
              >
                ভার্টিক্যাল (90°) করুন
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nudge pad and action buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <span className="text-xs font-semibold text-slate-300 block">সূক্ষ্ম পজিশনিং (Nudge Pad)</span>
        
        <div className="flex items-center justify-between gap-3">
          {/* 3x3 D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-full max-w-[140px] shrink-0">
            <div />
            <button
              onClick={() => onNudge(0, -2 / stageZoom)}
              disabled={isLocked}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex justify-center disabled:opacity-50"
              title="উপরে সরান"
            >
              ↑
            </button>
            <div />
            <button
              onClick={() => onNudge(-2 / stageZoom, 0)}
              disabled={isLocked}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex justify-center disabled:opacity-50"
              title="বামে সরান"
            >
              ←
            </button>
            <button
              onClick={onCenterLayer}
              disabled={isLocked}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-blue-400 text-xs flex justify-center disabled:opacity-50 font-bold"
              title="কেন্দ্রে আনুন"
            >
              ◎
            </button>
            <button
              onClick={() => onNudge(2 / stageZoom, 0)}
              disabled={isLocked}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex justify-center disabled:opacity-50"
              title="ডানে সরান"
            >
              →
            </button>
            <div />
            <button
              onClick={() => onNudge(0, 2 / stageZoom)}
              disabled={isLocked}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex justify-center disabled:opacity-50"
              title="নিচে সরান"
            >
              ↓
            </button>
            <div />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onResetTransform}
            disabled={isLocked}
            className="flex-1 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors disabled:opacity-50"
          >
            ট্রান্সফর্ম রিসেট
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive Visual Angle Dial / Compass Wheel Component
 */
const AngleDial: React.FC<{
  rotation: number;
  disabled?: boolean;
  onChange: (angle: number) => void;
}> = ({ rotation, disabled, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // 0 deg is North (top, dy < 0)
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    onChange(Number(deg.toFixed(1)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    calculateAngle(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      calculateAngle(e.clientX, e.clientY);
    };
    const onUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  const rad = (rotation * Math.PI) / 180;
  const needleLength = 34;
  const nx = 50 + needleLength * Math.sin(rad);
  const ny = 50 - needleLength * Math.cos(rad);
  const oppNx = 50 - 12 * Math.sin(rad);
  const oppNy = 50 + 12 * Math.cos(rad);

  return (
    <div className="flex flex-col items-center gap-1 select-none py-1">
      <div className="relative group">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          onMouseDown={handleMouseDown}
          className={`w-24 h-24 rounded-full border border-slate-700/80 bg-slate-950 shadow-inner ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:border-sky-500'
          }`}
        >
          {/* Outer circle track */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#1e293b" strokeWidth="2" />

          {/* Dial tick marks */}
          {Array.from({ length: 12 }, (_, i) => {
            const tickDeg = i * 30;
            const tickRad = (tickDeg * Math.PI) / 180;
            const isMajor = tickDeg % 90 === 0;
            const r1 = isMajor ? 36 : 41;
            const r2 = 45;
            const x1 = 50 + r1 * Math.sin(tickRad);
            const y1 = 50 - r1 * Math.cos(tickRad);
            const x2 = 50 + r2 * Math.sin(tickRad);
            const y2 = 50 - r2 * Math.cos(tickRad);
            return (
              <line
                key={tickDeg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? '#94a3b8' : '#475569'}
                strokeWidth={isMajor ? 1.5 : 1}
              />
            );
          })}

          {/* Cardinal markers */}
          <text x="50" y="16" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
          <text x="87" y="53" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">E</text>
          <text x="50" y="90" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">S</text>
          <text x="13" y="53" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">W</text>

          {/* Needle stem */}
          <line
            x1={oppNx}
            y1={oppNy}
            x2={nx}
            y2={ny}
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* North needle tip arrow/dot */}
          <circle cx={nx} cy={ny} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.2" />
          {/* Center hub */}
          <circle cx="50" cy="50" r="4.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
        </svg>

        {/* Caption */}
        <div className="text-[10px] text-sky-400 font-mono text-center mt-1">
          ডায়াল টেনে কোণ ঘুরান
        </div>
      </div>
    </div>
  );
};
