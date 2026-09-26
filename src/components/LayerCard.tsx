import React, { useRef } from 'react';
import { MouzaLayer } from '../types';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Upload, 
  RefreshCw, 
  FileText,
  Sliders
} from 'lucide-react';

interface LayerCardProps {
  layer: MouzaLayer;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onClear: () => void;
  onUploadFile: (file: File) => void;
  onChangePage: (page: number) => void;
  onChangeOpacity: (opacity: number) => void;
  onDeleteLayer?: () => void;
}

export const LayerCard: React.FC<LayerCardProps> = ({
  layer,
  index,
  isActive,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onClear,
  onUploadFile,
  onChangePage,
  onChangeOpacity,
  onDeleteLayer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-sky-400', 'bg-sky-950/20');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-sky-400', 'bg-sky-950/20');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-sky-400', 'bg-sky-950/20');
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const opacityPct = Math.round(layer.opacity * 100);

  return (
    <div
      onClick={onSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col gap-2.5 ${
        isActive
          ? 'bg-slate-900 border-blue-500 shadow-sm shadow-blue-500/20 ring-1 ring-blue-500'
          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start gap-3">
        {/* Layer Color Tag or Map Thumbnail */}
        {layer.image ? (
          <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-700 bg-white shrink-0 relative group shadow-sm">
            <img
              src={layer.displayImage || layer.image}
              alt={layer.short}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 shadow-sm"
            style={{ backgroundColor: layer.color }}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-wide text-white">{layer.short}</span>
            <span className="text-xs text-slate-400 truncate font-medium">
              {layer.name.replace(/.*\((.*)\)/, '$1')}
            </span>
            {Math.abs(layer.rotation) > 0.05 && (
              <span
                className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-800/60 text-sky-400 font-mono text-[10px] font-semibold flex items-center gap-0.5 ml-auto shrink-0 shadow-sm"
                title={`মৌজা নকশার ঘূর্ণন কোণ: ${layer.rotation > 0 ? '+' : ''}${layer.rotation.toFixed(2)}°`}
              >
                ⟳ {layer.rotation > 0 ? '+' : ''}{layer.rotation.toFixed(1)}°
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <span style={{ color: layer.color }}>●</span>
            <span className="font-medium text-slate-300">স্থায়িত্বকাল: {layer.years}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onToggleVisible}
            title={layer.visible ? 'হাইড করুন' : 'শো করুন'}
            className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer ${
              layer.visible ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleLock}
            title={layer.locked ? 'লক করা (আনলক করতে ক্লিক করুন)' : 'আনলক'}
            className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer ${
              layer.locked ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          {layer.image && (
            <button
              onClick={onClear}
              title="নকশা ক্যানভাস থেকে মুছুন"
              className="p-1.5 rounded-md hover:bg-red-950/40 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {layer.isCustom && onDeleteLayer && (
            <button
              onClick={onDeleteLayer}
              title="এই কাস্টম লেয়ারটি সম্পূর্ণ মুছে ফেলুন"
              className="p-1.5 rounded-md hover:bg-rose-950/60 text-rose-400/80 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
            </button>
          )}
        </div>
      </div>

      {/* Individual Real-Time Opacity Slider */}
      <div 
        className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 space-y-1"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <span>স্বচ্ছতা (Opacity):</span>
          </span>
          <span className="font-mono text-xs font-semibold" style={{ color: layer.color }}>
            {opacityPct}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            disabled={layer.locked}
            value={layer.opacity}
            onChange={e => onChangeOpacity(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            title={`${layer.short} লেয়ারের স্বচ্ছতা (${opacityPct}%)`}
          />
        </div>
      </div>

      {/* Page Selector if multi-page PDF or TIFF */}
      {layer.totalPages > 1 && (
        <div
          className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs"
          onClick={e => e.stopPropagation()}
        >
          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-slate-300 font-medium">পৃষ্ঠা:</span>
          <select
            value={layer.currentPage}
            onChange={e => onChangePage(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500 cursor-pointer"
          >
            {Array.from({ length: layer.totalPages }, (_, i) => i + 1).map(p => (
              <option key={p} value={p}>
                পৃষ্ঠা {p}
              </option>
            ))}
          </select>
          <span className="text-slate-500 text-[11px] ml-auto">
            (মোট {layer.totalPages}টি পৃষ্ঠা)
          </span>
        </div>
      )}

      {/* Bottom status and direct upload trigger */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <div className="text-[11px] truncate max-w-[170px] text-slate-400">
          {layer.image ? (
            <span className="text-emerald-400 font-medium truncate flex items-center gap-1">
              ✓ {layer.fileName || `${layer.short} নকশা প্রস্তুত`}
            </span>
          ) : (
            <span className="text-slate-500 italic">নকশা লোড নেই</span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={`px-2.5 py-1 text-xs rounded-md font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
            layer.image
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
          }`}
        >
          {layer.image ? (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>পরিবর্তন</span>
            </>
          ) : (
            <>
              <Upload className="w-3 h-3" />
              <span>ফাইল আপলোড</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onUploadFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
};
