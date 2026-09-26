import React from 'react';
import { 
  Hand, 
  Move, 
  RotateCw,
  Crosshair, 
  Ruler, 
  SplitSquareVertical, 
  Scale,
  ArrowLeftRight,
  Upload, 
  Download, 
  FolderOpen, 
  FilePlus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Undo2,
  Redo2,
  PanelLeft
} from 'lucide-react';
import { ToolType } from '../types';

interface HeaderProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onExportPNG: () => void;
  onQuickUpload: () => void;
  stageZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  activeLayerShort: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onSelectTool,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportPNG,
  onQuickUpload,
  stageZoom,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  activeLayerShort,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-50 gap-2">
      {/* Brand & Identity & Sidebar Drawer Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
              isSidebarOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
            title={isSidebarOpen ? 'সাইডবার লুকান (Collapse Drawer)' : 'সাইডবার প্রদর্শন করুন (Open Drawer)'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-500/20">
          MP
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-bold text-white tracking-wide">মৌজা পেন্টাগ্রাফ প্রো</h1>
          <span className="text-xs text-sky-400 font-medium hidden sm:inline">
            ৪ স্তর (CS · SA · RS · BS)
          </span>
        </div>
      </div>

      {/* Undo / Redo Controls */}
      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
            canUndo
              ? 'text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="পূর্বাবস্থায় ফেরান (Undo - Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden md:inline">আনডু</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
            canRedo
              ? 'text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="পুনরায় করুন (Redo - Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden md:inline">রিডু</span>
        </button>
      </div>

      {/* Interactive Tool Selector Tabs */}
      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shrink-0">
        <button
          onClick={() => onSelectTool('pan')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'pan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="প্যান মোড (Space + Drag)"
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">প্যান</span>
        </button>

        <button
          onClick={() => onSelectTool('move')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'move'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title={`সক্রিয় ম্যাপ (${activeLayerShort}) মাউস দিয়ে সরাসরি সরান`}
        >
          <Move className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">ম্যাপ মুভ</span>
        </button>

        <button
          onClick={() => onSelectTool('rotate')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'rotate'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title={`সক্রিয় ম্যাপ (${activeLayerShort}) মাউস দিয়ে সরাসরি ঘোরান`}
        >
          <RotateCw className="w-3.5 h-3.5 text-sky-300" />
          <span className="hidden xl:inline">রোটেশন</span>
        </button>

        <button
          onClick={() => onSelectTool('point')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'point'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="কমন পয়েন্ট (CP01-CP30) নির্ধারণ করুন"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">পয়েন্ট মোড</span>
        </button>

        <button
          onClick={() => onSelectTool('curtain')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'curtain'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="কার্টেইন সোয়াইপ তুলনা (Curtain Compare View)"
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">কার্টেইন</span>
        </button>

        <button
          onClick={() => onSelectTool('calibrate')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'calibrate'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="ম্যাপের নির্দিষ্ট লাইন বা স্কেল দাগ দিয়ে অটো স্কেল ক্যালিব্রেট করুন"
        >
          <Scale className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden xl:inline">রেফারেন্স স্কেল</span>
        </button>

        <button
          onClick={() => onSelectTool('measure')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'measure'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="দাগের বহুভুজ অঙ্কন ও জমি জরিপ পরিমাপ (Polygon Tool)"
        >
          <Ruler className="w-3.5 h-3.5 text-sky-300" />
          <span className="hidden xl:inline">বহুভুজ পরিমাপ</span>
        </button>

        <button
          onClick={() => onSelectTool('dimension')}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            currentTool === 'dimension'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="ম্যাপে যেকোনো সীমানা বা লাইনের সঠিক ডাইমেনশন (দৈর্ঘ্য/দূরত্ব) আঁকুন"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-300" />
          <span className="hidden xl:inline">ডাইমেনশন লাইন</span>
        </button>
      </div>

      {/* Right Action & Zoom Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onQuickUpload}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          title={`সক্রিয় স্তরে (${activeLayerShort}) ফাইল আপলোড করুন`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ ফাইল আপলোড</span>
        </button>

        <div className="hidden lg:flex items-center gap-1 border-l border-slate-800 pl-2">
          <button
            onClick={onNewProject}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
            title="নতুন প্রজেক্ট"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>নতুন</span>
          </button>
          <button
            onClick={onOpenProject}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
            title="JSON প্রজেক্ট লোড করুন"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>ওপেন</span>
          </button>
          <button
            onClick={onSaveProject}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
            title="প্রজেক্ট ফাইল সেভ করুন"
          >
            <Download className="w-3.5 h-3.5" />
            <span>সেভ</span>
          </button>
          <button
            onClick={onExportPNG}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            title="হাই-রেজোলিউশন ছবি এক্সপোর্ট"
          >
            Export PNG
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 text-xs overflow-hidden">
          <button
            onClick={onZoomOut}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="জুম আউট"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono px-2 text-[11px] text-slate-300 min-w-12 text-center">
            {Math.round(stageZoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="জুম ইন"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitScreen}
            className="p-1.5 border-l border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="ভিউ ফিট করুন"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
