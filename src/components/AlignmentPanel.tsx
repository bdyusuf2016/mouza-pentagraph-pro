import React, { useState } from 'react';
import { MouzaLayer, AlignmentInfo, DimensionLine } from '../types';
import { Target, Zap, AlertTriangle, CheckCircle2, RotateCcw, Ruler, Compass, ArrowRight, Sparkles, Scale } from 'lucide-react';

interface AlignmentPanelProps {
  layers: MouzaLayer[];
  refLayerId: string;
  cmpLayerId: string;
  onSetRefLayerId: (id: string) => void;
  onSetCmpLayerId: (id: string) => void;
  alignmentMethod: 'similarity' | 'affine' | 'tps';
  onSetAlignmentMethod: (method: 'similarity' | 'affine' | 'tps') => void;
  onAutoAlign: () => void;
  onClearPoints: () => void;
  activeLayer: MouzaLayer;
  dimensionLines?: DimensionLine[];
  onAlignLayerByDimensionLine?: (line: DimensionLine, targetAngleDeg: number) => void;
  onAlignTwoDimensionLines?: (refLine: DimensionLine, cmpLine: DimensionLine) => void;
}

export const AlignmentPanel: React.FC<AlignmentPanelProps> = ({
  layers,
  refLayerId,
  cmpLayerId,
  onSetRefLayerId,
  onSetCmpLayerId,
  alignmentMethod,
  onSetAlignmentMethod,
  onAutoAlign,
  onClearPoints,
  activeLayer,
  dimensionLines = [],
  onAlignLayerByDimensionLine,
  onAlignTwoDimensionLines,
}) => {
  const [activeTab, setActiveTab] = useState<'points' | 'dimension'>('points');
  const [selectedSingleLineId, setSelectedSingleLineId] = useState<string>('');
  const [selectedRefLineId, setSelectedRefLineId] = useState<string>('');
  const [selectedCmpLineId, setSelectedCmpLineId] = useState<string>('');

  const refLayer = layers.find(l => l.id === refLayerId) || layers[0];
  const cmpLayer = layers.find(l => l.id === cmpLayerId) || layers[1];

  // Count matching control points
  const refLabels = new Set(refLayer.points.map(p => p.label));
  const matchedPointsCount = cmpLayer.points.filter(p => refLabels.has(p.label)).length;

  const minRequired = alignmentMethod === 'similarity' ? 2 : alignmentMethod === 'affine' ? 3 : 6;
  const isReady = matchedPointsCount >= minRequired;
  const alignment = cmpLayer.alignment;

  // Selected single line
  const effectiveSingleLine = dimensionLines.find(d => d.id === selectedSingleLineId) || dimensionLines[0];
  // Selected 2 lines
  const refLine = dimensionLines.find(d => d.id === selectedRefLineId) || dimensionLines[0];
  const cmpLine = dimensionLines.find(d => d.id === selectedCmpLineId) || dimensionLines[1] || dimensionLines[0];

  return (
    <div className="space-y-3.5">
      {/* Alignment Mode Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('points')}
          className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'points'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>কন্ট্রোল পয়েন্ট</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dimension')}
          className={`py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'dimension'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>ডাইমেনশন লাইন</span>
        </button>
      </div>

      {/* Reference & Comparison layer selectors */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-slate-400 block mb-1 font-medium">রেফারেন্স (স্থির নকশা)</label>
          <select
            value={refLayerId}
            onChange={e => onSetRefLayerId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          >
            {layers.map(l => (
              <option key={l.id} value={l.id}>
                {l.short} ({l.points.length} Pts)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">তুলনা নকশা (অ্যালাইন হবে)</label>
          <select
            value={cmpLayerId}
            onChange={e => onSetCmpLayerId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          >
            {layers.map(l => (
              <option key={l.id} value={l.id} disabled={l.id === refLayerId}>
                {l.short} ({l.points.length} Pts)
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeTab === 'points' ? (
        <>
          {/* Alignment Method */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 block font-medium">অ্যালগরিদম (Alignment Method)</label>
            <select
              value={alignmentMethod}
              onChange={e => onSetAlignmentMethod(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
            >
              <option value="affine">Affine Transformation (X/Y আলাদা স্কেল ও শিয়ার — প্রস্তাবিত)</option>
              <option value="similarity">Similarity (Helmert — স্কেল, ঘূর্ণন ও পজিশন)</option>
              <option value="tps">Rubber Sheet (Thin Plate Spline Mesh — স্থানীয় বিকৃতি মেলানো)</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClearPoints}
              className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors"
            >
              পয়েন্ট মুছুন
            </button>
            <button
              onClick={onAutoAlign}
              disabled={!isReady || cmpLayer.locked}
              className={`flex-1 py-2 rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-all ${
                isReady && !cmpLayer.locked
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ অটো অ্যালাইন (Auto Align)</span>
            </button>
          </div>

          {/* Points & Residual Error Metrics */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>কমন পয়েন্ট জোড়া:</span>
              </span>
              <span className="font-mono font-semibold text-emerald-400">
                {matchedPointsCount} টি / ন্যূনতম {minRequired} টি
              </span>
            </div>

            {alignment && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>পদ্ধতি:</span>
                  <span className="font-mono text-slate-200 uppercase">{alignment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span>RMS ত্রুটি (Accuracy):</span>
                  <span className="font-mono text-emerald-400 font-semibold">{alignment.metrics.rms.toFixed(2)} px</span>
                </div>
                <div className="flex justify-between">
                  <span>সর্বোচ্চ বিচ্যুতি (Max Error):</span>
                  <span className="font-mono text-slate-200">{alignment.metrics.max.toFixed(2)} px</span>
                </div>
                {alignment.metrics.max > 8 && (
                  <div className="flex items-center gap-1.5 text-amber-400 text-[11px] pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>সতর্কতা: কিছু পয়েন্টে বিচ্যুতি বেশি। দাগ নম্বর ও সীমানা মিলিয়ে পয়েন্ট পুনরায় ঠিক করুন।</span>
                  </div>
                )}
              </div>
            )}

            {!alignment && (
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                উভয় নকশায় একই স্থানে (দাগের কোণা বা ত্রি-সীমানা) মাউস দিয়ে ক্লিক করে সমনামক CP01, CP02... পয়েন্ট নির্ধারণ করুন।
              </p>
            )}
          </div>
        </>
      ) : (
        /* Dimension Line Alignment Section */
        <div className="space-y-3.5">
          {dimensionLines.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 text-center space-y-2">
              <Ruler className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300 font-medium">কোনো ডাইমেনশন লাইন পাওয়া যায়নি</p>
              <p className="text-[11px] text-slate-500">
                হেডার থেকে <b>📏 ডাইমেনশন লাইন</b> টুল নির্বাচন করে ম্যাপের যেকোনো সীমানা বা দাগে রেখা টানুন।
              </p>
            </div>
          ) : (
            <>
              {/* Feature 1: Level/Rotate Active Layer by Dimension Line */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    ১. লাইন বরাবর {activeLayer.short} সোজা করুন
                  </span>
                  <span className="text-[10px] text-slate-500">Pivots center</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 block">বেসলাইন নির্বাচন করুন:</label>
                  <select
                    value={effectiveSingleLine?.id || ''}
                    onChange={e => setSelectedSingleLineId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
                  >
                    {dimensionLines.map((dim, i) => {
                      const dx = dim.p2.x - dim.p1.x;
                      const dy = dim.p2.y - dim.p1.y;
                      const dist = Math.hypot(dx, dy).toFixed(0);
                      const deg = ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1);
                      return (
                        <option key={dim.id} value={dim.id}>
                          লাইন #{i + 1} ({dist}px, কোণ: {deg}°)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {effectiveSingleLine && (() => {
                  const dx = effectiveSingleLine.p2.x - effectiveSingleLine.p1.x;
                  const dy = effectiveSingleLine.p2.y - effectiveSingleLine.p1.y;
                  const curAngle = ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1);
                  return (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                      <span>বর্তমান কোণ:</span>
                      <span className="font-mono text-amber-300 font-bold">{curAngle}°</span>
                    </div>
                  );
                })()}

                {/* Leveling Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => effectiveSingleLine && onAlignLayerByDimensionLine?.(effectiveSingleLine, 0)}
                    disabled={activeLayer.locked}
                    className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                    title="এই ডাইমেনশন লাইনটি ০° সমান্তরাল করে পুরো নকশা সোজা করুন"
                  >
                    <span>০° অনুভূমিক সমান্তরাল</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => effectiveSingleLine && onAlignLayerByDimensionLine?.(effectiveSingleLine, 90)}
                    disabled={activeLayer.locked}
                    className="py-2 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1 shadow-md shadow-sky-600/30 cursor-pointer disabled:opacity-50"
                    title="এই ডাইমেনশন লাইনটি ৯০° খাড়া করে পুরো নকশা সোজা করুন"
                  >
                    <span>৯০° উল্লম্ব খাড়া</span>
                  </button>
                </div>
              </div>

              {/* Feature 2: 2-Line Baseline Match for 2-Layer Superimposition */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    ২. ডাইমেনশন লাইন দিয়ে ২-লেয়ার সুপারইম্পোজ
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">CAD ALIGN</span>
                </div>

                {dimensionLines.length < 2 ? (
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                    💡 <b>টিপ:</b> দুটি লেয়ার মেলানোর জন্য ন্যূনতম ২টি ডাইমেনশন লাইন প্রয়োজন। <b>{refLayer.short}</b>-এর নির্দিষ্ট সীমানায় ১ম লাইন এবং <b>{cmpLayer.short}</b>-এর একই সীমানায় ২য় লাইন আঁকুন।
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-medium">
                        রেফারেন্স বেসলাইন ({refLayer.short}):
                      </label>
                      <select
                        value={refLine?.id || ''}
                        onChange={e => setSelectedRefLineId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-mono"
                      >
                        {dimensionLines.map((dim, i) => (
                          <option key={dim.id} value={dim.id}>
                            লাইন #{i + 1} ({Math.hypot(dim.p2.x - dim.p1.x, dim.p2.y - dim.p1.y).toFixed(0)} px)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-medium">
                        তুলনা বেসলাইন ({cmpLayer.short}):
                      </label>
                      <select
                        value={cmpLine?.id || ''}
                        onChange={e => setSelectedCmpLineId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                      >
                        {dimensionLines.map((dim, i) => (
                          <option key={dim.id} value={dim.id}>
                            লাইন #{i + 1} ({Math.hypot(dim.p2.x - dim.p1.x, dim.p2.y - dim.p1.y).toFixed(0)} px)
                          </option>
                        ))}
                      </select>
                    </div>

                    {refLine && cmpLine && refLine.id !== cmpLine.id && (() => {
                      const dRef = Math.hypot(refLine.p2.x - refLine.p1.x, refLine.p2.y - refLine.p1.y);
                      const dCmp = Math.hypot(cmpLine.p2.x - cmpLine.p1.x, cmpLine.p2.y - cmpLine.p1.y);
                      const scaleFactor = (dRef / (dCmp || 1)).toFixed(3);
                      const angRef = (Math.atan2(refLine.p2.y - refLine.p1.y, refLine.p2.x - refLine.p1.x) * 180) / Math.PI;
                      const angCmp = (Math.atan2(cmpLine.p2.y - cmpLine.p1.y, cmpLine.p2.x - cmpLine.p1.x) * 180) / Math.PI;
                      let rotDelta = angRef - angCmp;
                      while (rotDelta > 180) rotDelta -= 360;
                      while (rotDelta < -180) rotDelta += 360;

                      return (
                        <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-800/40 text-[10.5px] space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span>অটো স্কেল রেশিও:</span>
                            <span className="font-mono text-emerald-300 font-bold">{scaleFactor}x</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ঘূর্ণন সমন্বয়:</span>
                            <span className="font-mono text-sky-300 font-bold">{rotDelta.toFixed(1)}°</span>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        if (refLine && cmpLine && onAlignTwoDimensionLines) {
                          onAlignTwoDimensionLines(refLine, cmpLine);
                        }
                      }}
                      disabled={cmpLayer.locked || !refLine || !cmpLine || refLine.id === cmpLine.id}
                      className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                        !cmpLayer.locked && refLine && cmpLine && refLine.id !== cmpLine.id
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>⚡ বেসলাইন মিলিয়ে সুপারইম্পোজ করুন</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
