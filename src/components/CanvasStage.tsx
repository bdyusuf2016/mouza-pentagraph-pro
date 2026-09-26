import React, { useRef, useEffect, useState } from 'react';
import { 
  MouzaLayer, 
  ToolType, 
  STAGE_WIDTH, 
  STAGE_HEIGHT, 
  MeasurePoint,
  ControlPoint,
  MapScaleStandard,
  AreaCalculationResult,
  PolygonStyleConfig,
  ReferenceScaleConfig,
  DimensionLine,
  DimensionStyleConfig,
  DimensionCapStyle,
  DimensionDisplayUnit
} from '../types';
import { stagePointForLayerLocal, drawTPSMeshOnCanvas } from '../utils/alignmentRenderer';
import { calculatePolygonSurveyArea, toBengaliNumber, SCALE_CONFIGS } from '../utils/landSurvey';
import { Trash2, Check, Sparkles, Scale, Info, RotateCw, RotateCcw, Undo2, ArrowLeftRight, X, Ruler, Eye, EyeOff, Zap } from 'lucide-react';

/**
 * Helper to render dimension line end caps (tick, slash, arrow, dot)
 */
const renderDimensionCap = (
  p: MeasurePoint,
  angle: number,
  isEnd: boolean,
  color: string,
  lineWidth: number,
  tickSize: number,
  capStyle: DimensionCapStyle
) => {
  if (capStyle === 'tick') {
    const perpX = -Math.sin(angle) * tickSize;
    const perpY = Math.cos(angle) * tickSize;
    return (
      <line
        x1={p.x - perpX}
        y1={p.y - perpY}
        x2={p.x + perpX}
        y2={p.y + perpY}
        stroke={color}
        strokeWidth={Math.max(2, lineWidth * 1.2)}
      />
    );
  }

  if (capStyle === 'slash') {
    const slashAngle = angle + Math.PI / 4;
    const sx = Math.cos(slashAngle) * tickSize;
    const sy = Math.sin(slashAngle) * tickSize;
    return (
      <line
        x1={p.x - sx}
        y1={p.y - sy}
        x2={p.x + sx}
        y2={p.y + sy}
        stroke={color}
        strokeWidth={Math.max(2.5, lineWidth * 1.3)}
      />
    );
  }

  if (capStyle === 'arrow') {
    const baseAngle = isEnd ? angle + Math.PI : angle;
    const arrowLen = tickSize * 1.4;
    const halfWidth = tickSize * 0.45;
    const ax = p.x + Math.cos(baseAngle) * arrowLen;
    const ay = p.y + Math.sin(baseAngle) * arrowLen;
    const leftX = ax + Math.cos(baseAngle + Math.PI / 2) * halfWidth;
    const leftY = ay + Math.sin(baseAngle + Math.PI / 2) * halfWidth;
    const rightX = ax - Math.cos(baseAngle + Math.PI / 2) * halfWidth;
    const rightY = ay - Math.sin(baseAngle + Math.PI / 2) * halfWidth;

    return (
      <polygon
        points={`${p.x},${p.y} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    );
  }

  if (capStyle === 'dot') {
    return (
      <circle
        cx={p.x}
        cy={p.y}
        r={Math.max(3.5, tickSize * 0.4)}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  }

  return null;
};

/**
 * Format dimension text based on selected display unit
 */
const formatDimensionText = (links: number, feet: string, displayUnit: DimensionDisplayUnit) => {
  if (displayUnit === 'feet') return `${feet} ft`;
  if (displayUnit === 'link') return `${links} লিংক`;
  if (displayUnit === 'meter') return `${(links * 0.201168).toFixed(1)} মি.`;
  return `${feet} ft (${links} লি.)`;
};

/**
 * Dynamic badge width calculation based on unit
 */
const getBadgeWidth = (displayUnit: DimensionDisplayUnit) => {
  if (displayUnit === 'feet') return 76;
  if (displayUnit === 'link') return 88;
  if (displayUnit === 'meter') return 76;
  return 120; // 'both'
};

interface CanvasStageProps {
  layers: MouzaLayer[];
  activeLayer: MouzaLayer;
  refLayer: MouzaLayer;
  cmpLayer: MouzaLayer;
  currentTool: ToolType;
  stageZoom: number;
  stagePanX: number;
  stagePanY: number;
  onStageMouseDown: (e: React.MouseEvent) => void;
  onPointDragStart: (layer: MouzaLayer, point: ControlPoint) => void;
  onPointDelete: (layer: MouzaLayer, point: ControlPoint) => void;
  onAddPoint: (stageX: number, stageY: number) => void;
  onTriggerUpload: (layerId: string) => void;
  measurePoints: MeasurePoint[];
  curtainX: number; // 0 to 100 percentage for curtain compare
  mapScale: MapScaleStandard;
  onSetMapScale: (scale: MapScaleStandard) => void;
  onClearMeasure: () => void;
  onClosePolygonMeasure: () => void;
  isRotatingLayer?: boolean;
  onRotateStep?: (deg: number) => void;
  onResetRotation?: () => void;
  onSetRotation?: (deg: number) => void;
  isPolygonClosed?: boolean;
  onMeasurePointDragStart?: (index: number) => void;
  onDeleteMeasurePoint?: (index: number) => void;
  onUndoLastMeasurePoint?: () => void;
  polygonStyle?: PolygonStyleConfig;
  onUpdatePolygonStyle?: (patch: Partial<PolygonStyleConfig>) => void;
  customPxPerLink?: number | null;
  referenceScale?: ReferenceScaleConfig | null;
  calibratePoints?: MeasurePoint[];
  onSelectTool?: (tool: ToolType) => void;
  dimensionLines?: DimensionLine[];
  activeDimensionPoint?: MeasurePoint | null;
  onDeleteDimensionLine?: (id: string) => void;
  dimensionStyle?: DimensionStyleConfig;
  onUpdateDimensionStyle?: (patch: Partial<DimensionStyleConfig>) => void;
  onDimensionPointDragStart?: (dimId: string, pointIndex: 1 | 2) => void;
  onAlignLayerByDimensionLine?: (line: DimensionLine, targetAngleDeg: number) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  layers,
  activeLayer,
  refLayer,
  cmpLayer,
  currentTool,
  stageZoom,
  stagePanX,
  stagePanY,
  onStageMouseDown,
  onPointDragStart,
  onPointDelete,
  onAddPoint,
  onTriggerUpload,
  measurePoints,
  curtainX,
  mapScale,
  onSetMapScale,
  onClearMeasure,
  onClosePolygonMeasure,
  isRotatingLayer = false,
  onRotateStep,
  onResetRotation,
  onSetRotation,
  isPolygonClosed = false,
  onMeasurePointDragStart,
  onDeleteMeasurePoint,
  onUndoLastMeasurePoint,
  polygonStyle,
  onUpdatePolygonStyle,
  customPxPerLink,
  referenceScale,
  calibratePoints,
  onSelectTool,
  dimensionLines = [],
  activeDimensionPoint = null,
  onDeleteDimensionLine,
  dimensionStyle,
  onUpdateDimensionStyle,
  onDimensionPointDragStart,
  onAlignLayerByDimensionLine,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hoverStagePos, setHoverStagePos] = useState<MeasurePoint | null>(null);

  const defaultPolygonStyle: PolygonStyleConfig = {
    lineWidth: 2.5,
    pointSize: 7,
    lineColor: '#0284c7',
    fillOpacity: 0.2,
  };
  const pStyle = polygonStyle || defaultPolygonStyle;

  const defaultDimensionStyle: DimensionStyleConfig = {
    lineWidth: 2,
    tickSize: 10,
    color: '#10b981',
    fontSize: 11,
    displayUnit: 'both',
    capStyle: 'tick',
    visible: true,
  };
  const dStyle = dimensionStyle || defaultDimensionStyle;

  // Accurate Bangladeshi land surveying area calculation with custom reference scale support
  const effectivePxPerLink = customPxPerLink || activeLayer.referenceScale?.pxPerLink;
  const surveyResult: AreaCalculationResult | null = calculatePolygonSurveyArea(
    measurePoints,
    mapScale,
    effectivePxPerLink || undefined,
    isPolygonClosed || measurePoints.length >= 3
  );

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (stageRef.current) {
      const stageRect = stageRef.current.getBoundingClientRect();
      const x = (e.clientX - stageRect.left) / stageZoom;
      const y = (e.clientY - stageRect.top) / stageZoom;
      setHoverStagePos({ x: Math.round(x), y: Math.round(y) });
    }
  };

  const isNearFirstPoint = Boolean(
    currentTool === 'measure' &&
    !isPolygonClosed &&
    measurePoints.length >= 3 &&
    hoverStagePos &&
    Math.hypot(hoverStagePos.x - measurePoints[0].x, hoverStagePos.y - measurePoints[0].y) <= 22
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentTool === 'measure' && measurePoints.length >= 3) {
      if (!isPolygonClosed) {
        onClosePolygonMeasure();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onStageMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={() => setHoverStagePos(null)}
      onContextMenu={handleContextMenu}
      className={`relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center select-none ${
        currentTool === 'pan'
          ? 'cursor-grab active:cursor-grabbing'
          : currentTool === 'move'
          ? 'cursor-move'
          : currentTool === 'rotate'
          ? isRotatingLayer ? 'cursor-grabbing' : 'cursor-grab'
          : currentTool === 'point'
          ? 'cursor-crosshair'
          : currentTool === 'calibrate'
          ? 'cursor-crosshair'
          : currentTool === 'dimension'
          ? 'cursor-crosshair'
          : currentTool === 'measure'
          ? isNearFirstPoint ? 'cursor-pointer' : 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* Canvas Virtual Stage with Grid Background - NO transition to prevent jitter/flicker */}
      <div
        ref={stageRef}
        id="mouza-canvas-stage"
        style={{
          width: `${STAGE_WIDTH}px`,
          height: `${STAGE_HEIGHT}px`,
          transform: `translate(${stagePanX}px, ${stagePanY}px) scale(${stageZoom})`,
          transformOrigin: 'center center',
          backgroundImage: `
            linear-gradient(rgba(226, 232, 240, 0.08) 1.5px, transparent 1.5px),
            linear-gradient(90deg, rgba(226, 232, 240, 0.08) 1.5px, transparent 1.5px),
            linear-gradient(rgba(203, 213, 225, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
        }}
        className="absolute bg-slate-900 border border-slate-700/50 rounded shadow-2xl"
      >
        {/* Render 4 Survey Layers in Memoized Stack to prevent repaint flickering */}
        <MouzaLayerStack
          layers={layers}
          cmpLayerId={cmpLayer.id}
          activeLayerId={activeLayer.id}
          currentTool={currentTool}
          curtainX={curtainX}
          onTriggerUpload={onTriggerUpload}
        />

        {/* Curtain Split Divider (When in curtain tool mode) */}
        {currentTool === 'curtain' && (
          <div
            style={{ left: `${curtainX}%` }}
            className="absolute inset-y-0 w-0.5 bg-blue-400 shadow-md shadow-blue-500 pointer-events-none z-30"
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold">
              ↔
            </div>
          </div>
        )}

        {/* Control Points Overlay */}
        <div className="absolute inset-0 pointer-events-none z-40">
          {/* Reference Layer Points (Green) */}
          {refLayer.visible &&
            refLayer.points.map((pt, i) => {
              const pos = stagePointForLayerLocal(pt.u, pt.v, refLayer);
              return (
                <div
                  key={`ref-${pt.id}-${i}`}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    if (!refLayer.locked) onPointDragStart(refLayer, pt);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!refLayer.locked) onPointDelete(refLayer, pt);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500/25 border-2 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] backdrop-blur-[1px] flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-125 transition-transform group"
                >
                  {/* Transparent reticle crosshair so map intersection underneath is 100% visible */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-px bg-emerald-300/70" />
                    <div className="h-full w-px bg-emerald-300/70 absolute" />
                    <div className="w-1.5 h-1.5 rounded-full border border-emerald-200 bg-transparent" />
                  </div>
                  <span className="absolute -top-5 px-1 py-0.2 rounded bg-slate-950/90 text-emerald-300 border border-emerald-500/50 text-[9px] font-mono font-bold shadow pointer-events-none select-none">
                    {pt.label}
                  </span>
                  <span className="absolute -bottom-5 bg-slate-900/95 text-emerald-400 border border-emerald-500/40 text-[9px] px-1 py-0.2 rounded shadow pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {refLayer.short}: {pt.label}
                  </span>
                </div>
              );
            })}

          {/* Comparison Layer Points (Pink / Red - Transparent Reticle) */}
          {cmpLayer.id !== refLayer.id &&
            cmpLayer.visible &&
            cmpLayer.points.map((pt, i) => {
              const pos = stagePointForLayerLocal(pt.u, pt.v, cmpLayer);
              return (
                <div
                  key={`cmp-${pt.id}-${i}`}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    if (!cmpLayer.locked) onPointDragStart(cmpLayer, pt);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!cmpLayer.locked) onPointDelete(cmpLayer, pt);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-rose-500/25 border-2 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)] backdrop-blur-[1px] flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-125 transition-transform group"
                >
                  {/* Transparent reticle crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-px bg-rose-300/70" />
                    <div className="h-full w-px bg-rose-300/70 absolute" />
                    <div className="w-1.5 h-1.5 rounded-full border border-rose-200 bg-transparent" />
                  </div>
                  <span className="absolute -top-5 px-1 py-0.2 rounded bg-slate-950/90 text-rose-300 border border-rose-500/50 text-[9px] font-mono font-bold shadow pointer-events-none select-none">
                    {pt.label}
                  </span>
                  <span className="absolute -bottom-5 bg-slate-900/95 text-rose-400 border border-rose-500/40 text-[9px] px-1 py-0.2 rounded shadow pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {cmpLayer.short}: {pt.label}
                  </span>
                </div>
              );
            })}

          {/* Reference Scale Baseline Overlay (Calibrate Line / Current Calibrated Scale) */}
          {(referenceScale || (currentTool === 'calibrate' && calibratePoints && calibratePoints.length > 0)) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-35">
              {/* If user is currently drawing the 2 calibration points */}
              {currentTool === 'calibrate' && calibratePoints && calibratePoints.length === 1 && hoverStagePos && (() => {
                const p1 = calibratePoints[0];
                const p2 = hoverStagePos;
                const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                return (
                  <g key="calib-rubberband">
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                    />
                    <circle cx={p1.x} cy={p1.y} r={7} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
                    <circle cx={p2.x} cy={p2.y} r={6} fill="#fbbf24" stroke="#ffffff" strokeWidth={1.5} />
                    {/* Dimension badge */}
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect x={-65} y={-11} width={130} height={22} rx={4} fill="rgba(15, 23, 42, 0.95)" stroke="#f59e0b" strokeWidth={1} />
                      <text x={0} y={4} fill="#fef08a" fontSize={10} fontFamily="JetBrains Mono, monospace" textAnchor="middle" fontWeight="bold">
                        {distPx.toFixed(1)} px (২য় বিন্দু দিন)
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* Calibrated or Active Reference Line */}
              {referenceScale && (() => {
                const { p1, p2, knownLength, unit, pixelDistance } = referenceScale;
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const perpX = -Math.sin(angle) * 12;
                const perpY = Math.cos(angle) * 12;
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                const unitLabels: Record<string, string> = {
                  link: 'লিংক',
                  feet: 'ফুট',
                  meter: 'মিটার',
                  chain: 'চেইন',
                };
                const uLabel = unitLabels[unit] || unit;

                return (
                  <g key="calibrated-ref-line" className="group pointer-events-auto cursor-pointer" onClick={() => onSelectTool?.('calibrate')}>
                    {/* End caps */}
                    <line x1={p1.x - perpX} y1={p1.y - perpY} x2={p1.x + perpX} y2={p1.y + perpY} stroke="#f59e0b" strokeWidth={3} />
                    <line x1={p2.x - perpX} y1={p2.y - perpY} x2={p2.x + perpX} y2={p2.y + perpY} stroke="#f59e0b" strokeWidth={3} />
                    {/* Main dimension line */}
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#f59e0b" strokeWidth={2.5} />
                    {/* End point handles */}
                    <circle cx={p1.x} cy={p1.y} r={5.5} fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" strokeWidth={2} />
                    <circle cx={p2.x} cy={p2.y} r={5.5} fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" strokeWidth={2} />
                    {/* Scale Label Badge */}
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect x={-80} y={-11} width={160} height={22} rx={5} fill="rgba(15, 23, 42, 0.95)" stroke="#f59e0b" strokeWidth={1.5} filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))" />
                      <text x={0} y={4} fill="#fef08a" fontSize={10} fontFamily="Hind Siliguri, sans-serif" textAnchor="middle" fontWeight="bold">
                        📏 স্কেল: {knownLength} {uLabel} ({pixelDistance.toFixed(1)} px)
                      </text>
                    </g>
                  </g>
                );
              })()}
            </svg>
          )}

          {/* Dimension Lines Overlay */}
          {(((dimensionLines && dimensionLines.length > 0 && dStyle.visible) || (currentTool === 'dimension' && activeDimensionPoint))) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-32">
              <defs>
                <filter id="dim-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Live Rubberband Dimension Line (When drawing 2nd point) */}
              {currentTool === 'dimension' && activeDimensionPoint && hoverStagePos && (() => {
                const p1 = activeDimensionPoint;
                const p2 = hoverStagePos;
                const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const scaleCfg = SCALE_CONFIGS[mapScale];
                const pxPerLink = effectivePxPerLink || scaleCfg.pxPerLink || 0.625;
                const links = Math.round(distPx / pxPerLink);
                const feet = (links * 0.66).toFixed(1);
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const textLabel = formatDimensionText(links, feet, dStyle.displayUnit);
                const badgeWidth = getBadgeWidth(dStyle.displayUnit);

                return (
                  <g key="live-dimension-line" opacity={0.95}>
                    {/* End caps */}
                    {renderDimensionCap(p1, angle, false, dStyle.color, dStyle.lineWidth, dStyle.tickSize, dStyle.capStyle)}
                    {renderDimensionCap(p2, angle, true, dStyle.color, dStyle.lineWidth, dStyle.tickSize, dStyle.capStyle)}

                    {/* Main connecting line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={dStyle.color}
                      strokeWidth={dStyle.lineWidth}
                      strokeDasharray="6 3"
                    />

                    {/* Vertex points */}
                    <circle cx={p1.x} cy={p1.y} r={dStyle.tickSize * 0.5} fill="rgba(16, 185, 129, 0.25)" stroke={dStyle.color} strokeWidth={2} />
                    <circle cx={p2.x} cy={p2.y} r={dStyle.tickSize * 0.5} fill="rgba(52, 211, 153, 0.25)" stroke={dStyle.color} strokeWidth={1.5} />

                    {/* Live dimension badge */}
                    <g transform={`translate(${midX}, ${midY - 14})`} filter="url(#dim-glow)">
                      <rect
                        x={-badgeWidth / 2}
                        y={-12}
                        width={badgeWidth}
                        height={24}
                        rx={6}
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke={dStyle.color}
                        strokeWidth={1.5}
                      />
                      <text
                        x={0}
                        y={4}
                        fill="#6ee7b7"
                        fontSize={dStyle.fontSize}
                        fontFamily="JetBrains Mono, monospace"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {textLabel}
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* Saved Dimension Lines (Visible when dStyle.visible is true) */}
              {dStyle.visible && dimensionLines.map((dim, idx) => {
                const color = dim.color || dStyle.color;
                const lineWidth = dim.lineWidth || dStyle.lineWidth;
                const { p1, p2 } = dim;
                const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const scaleCfg = SCALE_CONFIGS[mapScale];
                const pxPerLink = effectivePxPerLink || scaleCfg.pxPerLink || 0.625;
                const links = Math.round(distPx / pxPerLink);
                const feet = (links * 0.66).toFixed(1);
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const textLabel = formatDimensionText(links, feet, dStyle.displayUnit);
                const baseWidth = getBadgeWidth(dStyle.displayUnit);
                const extraWidth = (onAlignLayerByDimensionLine ? 22 : 0) + (onDeleteDimensionLine ? 18 : 0);
                const badgeWidth = baseWidth + extraWidth;
                const textOffsetX = (onAlignLayerByDimensionLine ? 10 : 0) + (onDeleteDimensionLine ? -9 : 0);

                return (
                  <g key={dim.id || idx} className="group pointer-events-auto">
                    {/* End Cap 1 */}
                    {renderDimensionCap(p1, angle, false, color, lineWidth, dStyle.tickSize, dStyle.capStyle)}

                    {/* End Cap 2 */}
                    {renderDimensionCap(p2, angle, true, color, lineWidth, dStyle.tickSize, dStyle.capStyle)}

                    {/* Main Dimension Line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={color}
                      strokeWidth={lineWidth}
                    />

                    {/* Draggable interactive endpoint knobs */}
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r={Math.max(5, dStyle.tickSize * 0.55)}
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke={color}
                      strokeWidth={1.8}
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onDimensionPointDragStart?.(dim.id, 1);
                      }}
                      title="বিন্দু ১ টেনে অবস্থান পরিবর্তন করুন"
                    />
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r={Math.max(5, dStyle.tickSize * 0.55)}
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke={color}
                      strokeWidth={1.8}
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onDimensionPointDragStart?.(dim.id, 2);
                      }}
                      title="বিন্দু ২ টেনে অবস্থান পরিবর্তন করুন"
                    />

                    {/* Dimension Badge with interactive Align & Delete buttons */}
                    <g transform={`translate(${midX}, ${midY - 14})`} filter="url(#dim-glow)">
                      <rect
                        x={-badgeWidth / 2}
                        y={-11}
                        width={badgeWidth}
                        height={22}
                        rx={5}
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke={color}
                        strokeWidth={1.2}
                      />

                      {/* Align Layer button on badge */}
                      {onAlignLayerByDimensionLine && (
                        <g
                          className="cursor-pointer hover:opacity-100 opacity-75"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAlignLayerByDimensionLine(dim, e.shiftKey ? 90 : 0);
                          }}
                        >
                          <title>এই লাইন অনুযায়ী লেয়ার ০° সমান্তরাল সোজা করুন (Shift চেপে ক্লিক করলে ৯০° খাড়া হবে)</title>
                          <rect
                            x={-badgeWidth / 2 + 3}
                            y={-8}
                            width={17}
                            height={16}
                            rx={3}
                            fill="rgba(16, 185, 129, 0.25)"
                            stroke={color}
                            strokeWidth={0.8}
                          />
                          <text
                            x={-badgeWidth / 2 + 11.5}
                            y={4}
                            fill="#34d399"
                            fontSize={10}
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            ⚡
                          </text>
                        </g>
                      )}

                      <text
                        x={textOffsetX}
                        y={4}
                        fill="#f0fdf4"
                        fontSize={dStyle.fontSize}
                        fontFamily="JetBrains Mono, monospace"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {textLabel}
                      </text>

                      {/* Delete icon handle on badge */}
                      {onDeleteDimensionLine && (
                        <g
                          className="cursor-pointer hover:opacity-100 opacity-60"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDimensionLine(dim.id);
                          }}
                        >
                          <rect x={badgeWidth / 2 - 18} y={-9} width={15} height={18} rx={3} fill="rgba(239, 68, 68, 0.2)" />
                          <text x={badgeWidth / 2 - 10} y={4} fill="#f87171" fontSize={11} fontWeight="bold" textAnchor="middle">×</text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Measurement & Polygon Overlay */}
          {currentTool === 'measure' && measurePoints.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
              <defs>
                <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={pStyle.lineColor} stopOpacity={pStyle.fillOpacity} />
                  <stop offset="100%" stopColor={pStyle.lineColor} stopOpacity={Math.max(0.04, pStyle.fillOpacity * 0.7)} />
                </linearGradient>
              </defs>

              {/* Polygon fill if closed or 3+ points */}
              {measurePoints.length >= 3 && (
                <polygon
                  points={measurePoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="url(#polyGrad)"
                  stroke={pStyle.lineColor}
                  strokeWidth={pStyle.lineWidth}
                  strokeDasharray={isPolygonClosed ? undefined : '4 4'}
                />
              )}

              {/* Dynamic rubber-band guide line to live cursor when polygon is open */}
              {!isPolygonClosed && hoverStagePos && measurePoints.length > 0 && (() => {
                const lastPt = measurePoints[measurePoints.length - 1];
                const targetPt = isNearFirstPoint ? measurePoints[0] : hoverStagePos;
                const distPx = Math.hypot(targetPt.x - lastPt.x, targetPt.y - lastPt.y);
                const scaleCfg = SCALE_CONFIGS[mapScale];
                const segLinks = Math.round(distPx / scaleCfg.pxPerLink);
                const segFeet = Math.round(segLinks * 0.66);
                const midX = (lastPt.x + targetPt.x) / 2;
                const midY = (lastPt.y + targetPt.y) / 2;

                return (
                  <g key="rubber-band-guide">
                    <line
                      x1={lastPt.x}
                      y1={lastPt.y}
                      x2={targetPt.x}
                      y2={targetPt.y}
                      stroke={isNearFirstPoint ? '#22c55e' : pStyle.lineColor}
                      strokeWidth={pStyle.lineWidth}
                      strokeDasharray="6 4"
                    />
                    <rect
                      x={midX - 32}
                      y={midY - 11}
                      width={64}
                      height={20}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={isNearFirstPoint ? '#22c55e' : pStyle.lineColor}
                      strokeWidth={1}
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      fill={isNearFirstPoint ? '#86efac' : '#e0f2fe'}
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {isNearFirstPoint ? '✓ সমাপ্ত' : `${segFeet} ft`}
                    </text>
                  </g>
                );
              })()}

              {/* Boundary Lines connecting points */}
              {measurePoints.map((pt, i) => {
                const nextIdx = (i + 1) % measurePoints.length;
                // If not closed, do not draw line from last point back to first
                if (!isPolygonClosed && nextIdx === 0) return null;
                const next = measurePoints[nextIdx];
                const midX = (pt.x + next.x) / 2;
                const midY = (pt.y + next.y) / 2;
                const distPx = Math.hypot(next.x - pt.x, next.y - pt.y);
                const scaleCfg = SCALE_CONFIGS[mapScale];
                const segLinks = Math.round(distPx / scaleCfg.pxPerLink);
                const segFeet = Math.round(segLinks * 0.66);

                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={pt.x}
                      y1={pt.y}
                      x2={next.x}
                      y2={next.y}
                      stroke={pStyle.lineColor}
                      strokeWidth={pStyle.lineWidth}
                      strokeDasharray={isPolygonClosed ? undefined : '5 5'}
                    />
                    {/* Segment distance label */}
                    <rect
                      x={midX - 30}
                      y={midY - 10}
                      width={60}
                      height={18}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke={pStyle.lineColor}
                      strokeWidth={1}
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      fill="#e0f2fe"
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {segFeet} ft
                    </text>
                  </g>
                );
              })}

              {/* Point vertex handles (interactive) */}
              {measurePoints.map((pt, i) => {
                const isFirst = i === 0;
                const canClose = isFirst && !isPolygonClosed && measurePoints.length >= 3;
                const isFirstHighlighted = canClose && isNearFirstPoint;

                return (
                  <g
                    key={`vertex-${i}`}
                    className="pointer-events-auto cursor-grab active:cursor-grabbing group"
                    onMouseDown={e => {
                      e.stopPropagation();
                      if (canClose) {
                        onClosePolygonMeasure();
                      } else if (onMeasurePointDragStart) {
                        onMeasurePointDragStart(i);
                      }
                    }}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isPolygonClosed && measurePoints.length >= 3) {
                        onClosePolygonMeasure();
                      } else if (onDeleteMeasurePoint) {
                        onDeleteMeasurePoint(i);
                      }
                    }}
                  >
                    {/* Pulsing ring around first point when closeable */}
                    {canClose && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={pStyle.pointSize + 7}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Semi-transparent surveyor point ring */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isFirstHighlighted ? pStyle.pointSize + 3 : pStyle.pointSize}
                      fill={isFirstHighlighted ? 'rgba(34, 197, 94, 0.25)' : 'rgba(2, 132, 199, 0.25)'}
                      stroke={isFirstHighlighted ? '#22c55e' : pStyle.lineColor}
                      strokeWidth={Math.max(1.8, pStyle.lineWidth * 0.8)}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                      className="transition-all hover:scale-125"
                    />

                    {/* Micro crosshairs with hollow center for pixel-accurate survey vertex */}
                    <line x1={pt.x - 3.5} y1={pt.y} x2={pt.x + 3.5} y2={pt.y} stroke="#ffffff" strokeWidth={1} opacity={0.85} />
                    <line x1={pt.x} y1={pt.y - 3.5} x2={pt.x} y2={pt.y + 3.5} stroke="#ffffff" strokeWidth={1} opacity={0.85} />
                    <circle cx={pt.x} cy={pt.y} r={1.2} fill="#ffffff" />

                    <text
                      x={pt.x}
                      y={pt.y - (pStyle.pointSize + 6)}
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight="bold"
                      textAnchor="middle"
                      className="drop-shadow-md select-none pointer-events-none"
                    >
                      M{i + 1}
                    </text>
                  </g>
                );
              })}

              {/* Center Area Banner on Polygon Centroid */}
              {surveyResult && measurePoints.length >= 3 && (
                <g transform={`translate(${surveyResult.centroid.x}, ${surveyResult.centroid.y})`} className="pointer-events-none select-none">
                  <rect
                    x={-90}
                    y={-30}
                    width={180}
                    height={60}
                    rx={8}
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={isPolygonClosed ? '#10b981' : '#38bdf8'}
                    strokeWidth={1.5}
                    filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.6))"
                  />
                  <text
                    x={0}
                    y={-10}
                    fill={isPolygonClosed ? '#34d399' : '#38bdf8'}
                    fontSize={13}
                    fontWeight="bold"
                    fontFamily="Hind Siliguri, sans-serif"
                    textAnchor="middle"
                  >
                    {toBengaliNumber(surveyResult.decimals)} শতাংশ {isPolygonClosed ? '(চূড়ান্ত)' : ''}
                  </text>
                  <text
                    x={0}
                    y={8}
                    fill="#94a3b8"
                    fontSize={10}
                    fontFamily="Hind Siliguri, sans-serif"
                    textAnchor="middle"
                  >
                    {surveyResult.acres} একর · {surveyResult.perimeterFeet} ft
                  </text>
                  <text
                    x={0}
                    y={22}
                    fill="#64748b"
                    fontSize={9}
                    fontFamily="Hind Siliguri, sans-serif"
                    textAnchor="middle"
                  >
                    {surveyResult.katha} কাঠা ({surveyResult.sqFeet.toLocaleString()} sq ft)
                  </text>
                </g>
              )}
            </svg>
          )}

          {/* Interactive Rotation Gizmo Overlay on Active Layer */}
          {currentTool === 'rotate' && activeLayer.image && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
              <defs>
                <filter id="glow-rot" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {(() => {
                const cx = STAGE_WIDTH / 2 + activeLayer.x;
                const cy = STAGE_HEIGHT / 2 + activeLayer.y;
                const radius = 260;
                const rad = (activeLayer.rotation * Math.PI) / 180;
                const hx = cx + radius * Math.sin(rad);
                const hy = cy - radius * Math.cos(rad);

                return (
                  <g>
                    {/* Subtle outer guideline circular ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      strokeDasharray="6 6"
                      opacity={0.65}
                    />

                    {/* Inner guide ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius * 0.45}
                      fill="rgba(2, 132, 199, 0.05)"
                      stroke="#0284c7"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={0.4}
                    />

                    {/* Cardinal Axis ticks every 15 deg */}
                    {Array.from({ length: 24 }, (_, i) => {
                      const tickDeg = i * 15;
                      const tickRad = (tickDeg * Math.PI) / 180;
                      const isMajor = tickDeg % 45 === 0;
                      const r1 = isMajor ? radius - 14 : radius - 7;
                      const r2 = isMajor ? radius + 14 : radius + 7;
                      const x1 = cx + r1 * Math.sin(tickRad);
                      const y1 = cy - r1 * Math.cos(tickRad);
                      const x2 = cx + r2 * Math.sin(tickRad);
                      const y2 = cy - r2 * Math.cos(tickRad);
                      return (
                        <line
                          key={tickDeg}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isMajor ? '#38bdf8' : '#64748b'}
                          strokeWidth={isMajor ? 2 : 1}
                          opacity={isMajor ? 0.8 : 0.4}
                        />
                      );
                    })}

                    {/* Cardinal labels */}
                    <text x={cx} y={cy - radius - 20} fill="#f43f5e" fontSize={12} fontWeight="bold" textAnchor="middle">
                      N (০°)
                    </text>
                    <text x={cx + radius + 25} y={cy + 4} fill="#38bdf8" fontSize={11} fontWeight="bold" textAnchor="middle">
                      E (+৯০°)
                    </text>
                    <text x={cx} y={cy + radius + 28} fill="#94a3b8" fontSize={11} fontWeight="bold" textAnchor="middle">
                      S (১৮০°)
                    </text>
                    <text x={cx - radius - 25} y={cy + 4} fill="#38bdf8" fontSize={11} fontWeight="bold" textAnchor="middle">
                      W (-৯০°)
                    </text>

                    {/* Dynamic angle arc from 0° (North) to activeLayer.rotation */}
                    {Math.abs(activeLayer.rotation) > 0.5 && (() => {
                      const arcR = radius * 0.75;
                      const startX = cx;
                      const startY = cy - arcR;
                      const endX = cx + arcR * Math.sin(rad);
                      const endY = cy - arcR * Math.cos(rad);
                      const isPositive = activeLayer.rotation > 0;
                      const largeArc = Math.abs(activeLayer.rotation) > 180 ? 1 : 0;
                      const sweep = isPositive ? 1 : 0;
                      const d = `M ${startX} ${startY} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
                      return (
                        <path
                          d={d}
                          fill="none"
                          stroke={isPositive ? '#38bdf8' : '#f43f5e'}
                          strokeWidth={3}
                          strokeDasharray="4 2"
                          opacity={0.85}
                        />
                      );
                    })()}

                    {/* Pointer Needle ray from pivot to handle */}
                    <line
                      x1={cx}
                      y1={cy}
                      x2={hx}
                      y2={hy}
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      filter="url(#glow-rot)"
                    />

                    {/* Pivot crosshair */}
                    <line x1={cx - 24} y1={cy} x2={cx + 24} y2={cy} stroke="#38bdf8" strokeWidth={1.5} opacity={0.7} />
                    <line x1={cx} y1={cy - 24} x2={cx} y2={cy + 24} stroke="#38bdf8" strokeWidth={1.5} opacity={0.7} />
                    <circle cx={cx} cy={cy} r={7} fill="#0284c7" stroke="#ffffff" strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={2} fill="#ffffff" />

                    {/* Interactive rotation handle knob */}
                    <circle
                      cx={hx}
                      cy={hy}
                      r={18}
                      fill={isRotatingLayer ? '#0284c7' : '#0369a1'}
                      stroke="#ffffff"
                      strokeWidth={3}
                      filter="url(#glow-rot)"
                    />
                    <circle
                      cx={hx}
                      cy={hy}
                      r={7}
                      fill="#38bdf8"
                    />

                    {/* Floating angle badge attached near handle */}
                    <g transform={`translate(${hx + (Math.sin(rad) >= 0 ? 25 : -110)}, ${hy + (Math.cos(rad) >= 0 ? -15 : 20)})`}>
                      <rect
                        x={-6}
                        y={-14}
                        width={105}
                        height={28}
                        rx={6}
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.6))"
                      />
                      <text
                        x={46}
                        y={4}
                        fill="#e0f2fe"
                        fontSize={12}
                        fontWeight="bold"
                        fontFamily="JetBrains Mono, monospace"
                        textAnchor="middle"
                      >
                        {activeLayer.rotation > 0 ? '+' : ''}{Number(activeLayer.rotation).toFixed(2)}°
                      </text>
                    </g>
                  </g>
                );
              })()}
            </svg>
          )}
        </div>
      </div>

      {/* Floating Rotation HUD Panel when in Rotate Tool Mode */}
      {currentTool === 'rotate' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-sky-500/70 shadow-2xl rounded-2xl p-3 text-xs text-white z-50 flex flex-col sm:flex-row items-center gap-3.5 backdrop-blur-md max-w-3xl">
          {/* Active Layer Tag */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: activeLayer.color }}
            />
            <div>
              <span className="font-bold text-sky-300 font-mono text-xs flex items-center gap-1">
                <RotateCw className={`w-3.5 h-3.5 ${isRotatingLayer ? 'animate-spin' : ''}`} />
                {activeLayer.short} রোটেশন
              </span>
              <span className="text-[10px] text-slate-400 block font-sans">
                {activeLayer.name.replace(/.*\((.*)\)/, '$1')}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Slider & Degree Input */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-180"
              max="180"
              step="0.1"
              disabled={activeLayer.locked}
              value={activeLayer.rotation}
              onChange={e => onSetRotation?.(Number(e.target.value))}
              className="w-24 sm:w-32 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 disabled:opacity-50"
            />
            <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 w-16">
              <input
                type="number"
                min="-180"
                max="180"
                step="0.1"
                disabled={activeLayer.locked}
                value={Number(activeLayer.rotation.toFixed(1))}
                onChange={e => {
                  let v = parseFloat(e.target.value);
                  if (isNaN(v)) return;
                  onSetRotation?.(v);
                }}
                className="w-full bg-transparent text-right font-mono text-xs text-sky-300 font-bold outline-none disabled:opacity-50"
              />
              <span className="text-xs text-slate-400">°</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onResetRotation?.()}
              disabled={activeLayer.locked}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors border ${
                activeLayer.rotation === 0
                  ? 'bg-sky-600 text-white border-sky-500 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              } disabled:opacity-50`}
              title="উত্তর দিক (0° True North) সোজা করুন"
            >
              0° North
            </button>
            <button
              onClick={() => onRotateStep?.(-90)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono disabled:opacity-50"
              title="-90° বামে ঘোরান"
            >
              -90°
            </button>
            <button
              onClick={() => onRotateStep?.(90)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono disabled:opacity-50"
              title="+90° ডানে ঘোরান"
            >
              +90°
            </button>
            <button
              onClick={() => onRotateStep?.(180)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono disabled:opacity-50"
              title="180° উল্টে দিন"
            >
              180°
            </button>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Fine Increments */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onRotateStep?.(-1)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-mono disabled:opacity-50"
              title="-1° সূক্ষ্ম ঘূর্ণন"
            >
              ↺ -1°
            </button>
            <button
              onClick={() => onRotateStep?.(-0.1)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-mono disabled:opacity-50"
              title="-0.1° অতি সূক্ষ্ম ঘূর্ণন"
            >
              -0.1°
            </button>
            <button
              onClick={() => onRotateStep?.(0.1)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-mono disabled:opacity-50"
              title="+0.1° অতি সূক্ষ্ম ঘূর্ণন"
            >
              +0.1°
            </button>
            <button
              onClick={() => onRotateStep?.(1)}
              disabled={activeLayer.locked}
              className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-mono disabled:opacity-50"
              title="+1° সূক্ষ্ম ঘূর্ণন"
            >
              ↻ +1°
            </button>
          </div>

          {/* 2-Point baseline shortcut if points >= 2 */}
          {activeLayer.points.length >= 2 && (
            <>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <button
                onClick={() => {
                  const p1 = activeLayer.points[0];
                  const p2 = activeLayer.points[1];
                  const dx = p2.u - p1.u;
                  const dy = p2.v - p1.v;
                  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                  onSetRotation?.(-angleDeg);
                }}
                disabled={activeLayer.locked}
                className="px-2 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-[11px] font-medium flex items-center gap-1 shrink-0 disabled:opacity-50"
                title={`${activeLayer.points[0].label} ও ${activeLayer.points[1].label} অনুযায়ী বেসলাইন সোজা করুন`}
              >
                <span>২-পয়েন্ট সোজা</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating Dimension Tool Quick HUD at Canvas Top */}
      {currentTool === 'dimension' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/70 shadow-2xl rounded-2xl p-2 sm:p-2.5 text-xs text-white z-50 flex flex-wrap items-center gap-2 sm:gap-3 backdrop-blur-md max-w-4xl select-none">
          {/* Header indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="w-3 h-3 rounded-full shadow-sm ring-2 ring-emerald-400/40"
              style={{ backgroundColor: dStyle.color }}
            />
            <div>
              <span className="font-bold text-emerald-400 text-xs flex items-center gap-1 font-sans">
                <Ruler className="w-3.5 h-3.5" />
                ডাইমেনশন কন্ট্রোল
              </span>
              <span className="text-[10px] text-slate-400 block font-sans">
                {activeDimensionPoint
                  ? '২য় বিন্দুতে ক্লিক করে সম্পন্ন করুন (অথবা Esc)'
                  : 'ম্যাপে ১ম ও ২য় বিন্দু ক্লিক করুন'}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Line Width presets */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-400 font-sans mr-0.5">সাইজ:</span>
            {[1, 2, 3, 4, 6].map(w => (
              <button
                key={w}
                type="button"
                onClick={() => onUpdateDimensionStyle?.({ lineWidth: w })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                  dStyle.lineWidth === w
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Cap Style Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-400 font-sans mr-0.5">ক্যাপ:</span>
            {[
              { id: 'tick' as DimensionCapStyle, label: '| লম্ব' },
              { id: 'slash' as DimensionCapStyle, label: '/ স্ল্যাশ' },
              { id: 'arrow' as DimensionCapStyle, label: '► তীর' },
              { id: 'dot' as DimensionCapStyle, label: '● বিন্দু' },
            ].map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onUpdateDimensionStyle?.({ capStyle: c.id })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border ${
                  dStyle.capStyle === c.id
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Unit Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-400 font-sans mr-0.5">একক:</span>
            {[
              { id: 'both' as DimensionDisplayUnit, label: 'ফুট+লিংক' },
              { id: 'feet' as DimensionDisplayUnit, label: 'ফুট' },
              { id: 'link' as DimensionDisplayUnit, label: 'লিংক' },
              { id: 'meter' as DimensionDisplayUnit, label: 'মিটার' },
            ].map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => onUpdateDimensionStyle?.({ displayUnit: u.id })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border ${
                  dStyle.displayUnit === u.id
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Color Swatches */}
          <div className="flex items-center gap-1 shrink-0">
            {['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#a855f7', '#ffffff', '#eab308'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateDimensionStyle?.({ color: c })}
                style={{ backgroundColor: c }}
                className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                  dStyle.color === c ? 'ring-2 ring-white scale-125' : 'hover:scale-110 opacity-70 hover:opacity-100'
                }`}
                title={c}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Level / Align Active Layer by Dimension Line */}
          {dimensionLines.length > 0 && onAlignLayerByDimensionLine && (
            <>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-emerald-300 font-sans flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  সোজা:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const targetLine = dimensionLines[dimensionLines.length - 1];
                    onAlignLayerByDimensionLine(targetLine, 0);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 text-[10px] font-medium cursor-pointer"
                  title="সর্বশেষ আঁকা ডাইমেনশন লাইন বরাবর লেয়ার ০° অনুভূমিক সমান্তরাল সোজা করুন"
                >
                  ০° সমান্তরাল
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetLine = dimensionLines[dimensionLines.length - 1];
                    onAlignLayerByDimensionLine(targetLine, 90);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 text-[10px] font-medium cursor-pointer"
                  title="সর্বশেষ আঁকা ডাইমেনশন লাইন বরাবর লেয়ার ৯০° উল্লম্ব খাড়া করুন"
                >
                  ৯০° খাড়া
                </button>
              </div>
            </>
          )}

          {/* Visibility toggle & Cancel */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateDimensionStyle?.({ visible: !dStyle.visible })}
              className={`p-1 rounded text-slate-300 border border-slate-800 hover:bg-slate-800 ${
                !dStyle.visible ? 'text-amber-400' : 'text-slate-300'
              }`}
              title={dStyle.visible ? 'ডাইমেনশন লাইন লুকান' : 'ডাইমেনশন লাইন দেখান'}
            >
              {dStyle.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Interactive North Arrow Compass Indicator */}
      <div
        onClick={() => {
          if (!activeLayer.locked && onResetRotation) {
            onResetRotation();
          }
        }}
        className={`absolute top-4 right-4 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-xl z-30 transition-all select-none ${
          activeLayer.locked
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:border-sky-500/80 hover:bg-slate-800/95 hover:shadow-sky-500/20 group'
        }`}
        title={`উত্তর দিক নির্দেশক (True North Compass) — ক্লিক করলে ০° নর্থে সোজা হবে${
          Math.abs(activeLayer.rotation) > 0.05
            ? ` (বর্তমান ঘূর্ণন: ${activeLayer.rotation > 0 ? '+' : ''}${activeLayer.rotation.toFixed(1)}°)`
            : ''
        }`}
      >
        <div
          style={{ transform: `rotate(${-activeLayer.rotation}deg)` }}
          className="relative w-10 h-10 flex items-center justify-center transition-transform duration-100 ease-out"
        >
          {/* Compass Dial Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-slate-600/50 group-hover:border-sky-400/60" />

          {/* Cardinal markers */}
          <span className="absolute top-0 text-[8px] font-bold text-rose-500">N</span>
          <span className="absolute bottom-0 text-[7px] font-bold text-slate-500">S</span>
          <span className="absolute right-0.5 text-[7px] font-bold text-slate-500">E</span>
          <span className="absolute left-0.5 text-[7px] font-bold text-slate-500">W</span>

          {/* Needle */}
          <div className="relative w-1.5 h-7 flex flex-col items-center">
            {/* North half (red) */}
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[14px] border-b-rose-500 filter drop-shadow" />
            {/* South half (silver) */}
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[14px] border-t-slate-300" />
            {/* Pivot pin */}
            <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow" />
          </div>
        </div>

        <div className="flex items-center gap-0.5 mt-1">
          <span className="font-mono text-[9px] font-bold text-sky-400">
            {Number(activeLayer.rotation).toFixed(1)}°
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Real-time TPS Warped Canvas Subcomponent
 */
const TpsCanvas: React.FC<{ layer: MouzaLayer }> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !layer.warp || layer.warp.method !== 'tps') return;
    drawTPSMeshOnCanvas(canvasRef.current, layer);
  }, [layer, layer.warp, layer.image]);

  return (
    <canvas
      ref={canvasRef}
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

interface MouzaLayerStackProps {
  layers: MouzaLayer[];
  cmpLayerId: string;
  activeLayerId: string;
  currentTool: ToolType;
  curtainX: number;
  onTriggerUpload: (layerId: string) => void;
}

/**
 * Memoized Layer Stack — renders 4 cadastral survey sheets without re-triggering expensive
 * canvas/transform repaints when dragging or hovering polygon vertices.
 */
const MouzaLayerStack: React.FC<MouzaLayerStackProps> = React.memo(({
  layers,
  cmpLayerId,
  activeLayerId,
  currentTool,
  curtainX,
  onTriggerUpload,
}) => {
  return (
    <>
      {layers.map((layer) => {
        if (!layer.visible) return null;

        const isCurtainActive = currentTool === 'curtain' && layer.id === cmpLayerId;
        const layerClip = isCurtainActive
          ? `polygon(${curtainX}% 0%, 100% 0%, 100% 100%, ${curtainX}% 100%)`
          : undefined;

        let transformStyle = '';
        if (layer.warp && layer.warp.method === 'tps') {
          transformStyle = 'none';
        } else if (layer.affine) {
          const { a, b, c, d, e, f } = layer.affine;
          transformStyle = `matrix(${a}, ${c}, ${b}, ${d}, ${e}, ${f})`;
        } else {
          transformStyle = `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rotation}deg) scale(${layer.scale})`;
        }

        return (
          <div
            key={layer.id}
            style={{
              opacity: layer.opacity,
              mixBlendMode: layer.blendMode,
              filter: layer.filter,
              transform: transformStyle,
              transformOrigin: 'center center',
              clipPath: layerClip,
              willChange: 'transform, opacity',
            }}
            className="absolute inset-0 pointer-events-none"
          >
            {layer.image ? (
              layer.warp && layer.warp.method === 'tps' ? (
                <TpsCanvas layer={layer} />
              ) : (
                <img
                  src={layer.displayImage || layer.image}
                  alt={layer.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ willChange: 'transform' }}
                />
              )
            ) : layer.id === activeLayerId ? (
              /* Empty Placeholder Card */
              <div
                onClick={
                  currentTool === 'measure' || currentTool === 'calibrate' || currentTool === 'point'
                    ? undefined
                    : () => onTriggerUpload(layer.id)
                }
                className={`absolute inset-x-24 inset-y-20 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center gap-3.5 p-8 text-center text-slate-300 shadow-xl group ${
                  currentTool === 'measure' || currentTool === 'calibrate' || currentTool === 'point'
                    ? 'pointer-events-none opacity-40'
                    : 'pointer-events-auto cursor-pointer hover:border-blue-500 hover:bg-slate-900 transition-all'
                }`}
              >
                <span className="px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-300 font-medium">
                  স্থায়িত্বকাল: {layer.years}
                </span>
                <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  {layer.name}
                </h3>
                <p className="text-sm text-slate-400 max-w-md">
                  এই স্তরে কোনো মৌজা নকশা আপলোড করা নেই। PDF, JPG, PNG বা TIFF ফাইল আপলোড করুন অথবা সরাসরি ড্র্যাগ করে এখানে ছাড়ুন।
                </p>
                <div
                  onClick={(e) => { e.stopPropagation(); onTriggerUpload(layer.id); }}
                  className="mt-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 pointer-events-auto cursor-pointer"
                >
                  <span>📁 যেকোনো ফরম্যাটে ম্যাপ আপলোড করুন</span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
});

