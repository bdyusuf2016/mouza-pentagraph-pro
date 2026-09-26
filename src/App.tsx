import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MouzaLayer, 
  ToolType, 
  STAGE_WIDTH, 
  STAGE_HEIGHT, 
  MeasurePoint, 
  ControlPoint, 
  MapScaleStandard,
  INITIAL_LAYERS_CONFIG,
  PolygonStyleConfig,
  ReferenceScaleConfig,
  DistanceUnit,
  DimensionLine,
  DimensionStyleConfig
} from './types';
import { 
  parsePdfDocument, 
  renderPdfPageToDataUrl, 
  parseTiffDocument, 
  renderTiffPageToDataUrl, 
  renderRasterImageFile 
} from './utils/fileLoader';
import { extractMapImage, mapStyleKey } from './utils/imageProcessing';
import { 
  solveSimilarityTransform, 
  solveAffineTransform, 
  collectMatchedControlPoints,
  stageToLayerLocal,
  layerLocalToStage,
  alignLayerToDimensionAngle,
  alignLayerByTwoDimensionLines
} from './utils/alignment';
import { stagePointForLayerLocal } from './utils/alignmentRenderer';
import { calculatePxPerLinkFromReference, convertToLinks, calculatePolygonSurveyArea, SCALE_CONFIGS, toBengaliNumber } from './utils/landSurvey';
import { Header } from './components/Header';
import { LayerCard } from './components/LayerCard';
import { LayerControls } from './components/LayerControls';
import { AlignmentPanel } from './components/AlignmentPanel';
import { MeasurementPanel } from './components/MeasurementPanel';
import { CanvasStage } from './components/CanvasStage';
import { 
  Layers, 
  Sliders, 
  Target, 
  Ruler,
  Scale,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';

const POINT_NAMES = Array.from({ length: 30 }, (_, i) => `CP${String(i + 1).padStart(2, '0')}`);
const MAX_HISTORY_LENGTH = 30;

export default function App() {
  const [layers, setLayers] = useState<MouzaLayer[]>(INITIAL_LAYERS_CONFIG);
  const [activeLayerId, setActiveLayerId] = useState<string>('CS');
  const [refLayerId, setRefLayerId] = useState<string>('CS');
  const [cmpLayerId, setCmpLayerId] = useState<string>('RS');
  const [alignmentMethod, setAlignmentMethod] = useState<'similarity' | 'affine' | 'tps'>('affine');
  
  // Undo / Redo history state
  const [history, setHistory] = useState<MouzaLayer[][]>([INITIAL_LAYERS_CONFIG]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  // Active Sidebar Tab & Collapsible Drawer State
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'adjust' | 'align' | 'measure'>('layers');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [currentTool, setCurrentTool] = useState<ToolType>('pan');

  // Virtual Canvas Viewport
  const [stageZoom, setStageZoom] = useState<number>(0.75);
  const [stagePan, setStagePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [curtainX, setCurtainX] = useState<number>(50); // 0 to 100%
  
  // Custom Polygon Measurement points and scale standards
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const [draggedMeasureIndex, setDraggedMeasureIndex] = useState<number | null>(null);
  const [mapScale, setMapScale] = useState<MapScaleStandard>('16inch');
  const [polygonStyle, setPolygonStyle] = useState<PolygonStyleConfig>({
    lineWidth: 2.5,
    pointSize: 7,
    lineColor: '#0284c7',
    fillOpacity: 0.2,
  });

  // Dimension Line Tool states
  const [dimensionLines, setDimensionLines] = useState<DimensionLine[]>([]);
  const [activeDimensionPoint, setActiveDimensionPoint] = useState<MeasurePoint | null>(null);
  const [dimensionStyle, setDimensionStyle] = useState<DimensionStyleConfig>({
    lineWidth: 2,
    tickSize: 10,
    color: '#10b981',
    fontSize: 11,
    displayUnit: 'both',
    capStyle: 'tick',
    visible: true,
  });
  const [draggedDimensionInfo, setDraggedDimensionInfo] = useState<{ dimId: string; pointIndex: 1 | 2 } | null>(null);

  // Reference Scale Calibration state
  const [customPxPerLink, setCustomPxPerLink] = useState<number | null>(null);
  const [referenceScale, setReferenceScale] = useState<ReferenceScaleConfig | null>(null);
  const [calibratePoints, setCalibratePoints] = useState<MeasurePoint[]>([]);
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [tempCalibrateData, setTempCalibrateData] = useState<{ p1: MeasurePoint; p2: MeasurePoint; pixelDistance: number } | null>(null);
  const [calibrateInputLength, setCalibrateInputLength] = useState<string>('100');
  const [calibrateUnit, setCalibrateUnit] = useState<DistanceUnit>('link');

  // Dragging and interaction tracking
  const [isPanning, setIsPanning] = useState(false);
  const [isMovingLayer, setIsMovingLayer] = useState(false);
  const [isRotatingLayer, setIsRotatingLayer] = useState(false);
  const isSpaceDownRef = useRef(false);
  const [draggedPointInfo, setDraggedPointInfo] = useState<{ layerId: string; point: ControlPoint } | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialPan: { x: number; y: number };
    initialLayerPos: { x: number; y: number };
    startAngle: number;
    initialRotation: number;
    centerX: number;
    centerY: number;
  }>({
    clientX: 0,
    clientY: 0,
    initialPan: { x: 0, y: 0 },
    initialLayerPos: { x: 0, y: 0 },
    startAngle: 0,
    initialRotation: 0,
    centerX: 0,
    centerY: 0,
  });

  const layersRef = useRef(layers);
  layersRef.current = layers;

  // UI notifications
  const [statusMessage, setStatusMessage] = useState<string>('রেডি — CS, SA, RS বা BS মৌজা নকশা লোড করুন');
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [modalInfo, setModalInfo] = useState<{ title: string; content: string } | null>(null);

  // Hidden file inputs
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // References to active, reference, and comparison layers
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];
  const refLayer = layers.find(l => l.id === refLayerId) || layers[0];
  const cmpLayer = layers.find(l => l.id === cmpLayerId) || layers[2];

  /**
   * Push state to Undo/Redo history stack
   */
  const pushHistory = useCallback((newLayers: MouzaLayer[]) => {
    if (isUndoRedoAction.current) return;
    setHistory(prev => {
      const updated = prev.slice(0, historyIndex + 1);
      if (updated.length >= MAX_HISTORY_LENGTH) {
        updated.shift();
      }
      return [...updated, newLayers];
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_LENGTH - 1));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetState = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setLayers(targetState);
      setStatusMessage('পূর্বাবস্থায় ফেরানো হয়েছে (Undo)');
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 50);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const targetState = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setLayers(targetState);
      setStatusMessage('পুনরায় করা হয়েছে (Redo)');
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 50);
    }
  }, [history, historyIndex]);

  // Global Keyboard shortcuts for Undo (Ctrl+Z, Cmd+Z) and Redo (Ctrl+Y, Ctrl+Shift+Z, Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') {
        return;
      }
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrMeta && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if (!isCtrlOrMeta && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setCurrentTool(prev => {
          const next = prev === 'rotate' ? 'pan' : 'rotate';
          setStatusMessage(next === 'rotate' ? 'রোটেশন মোড সক্রিয় — মাউস টেনে ম্যাপ ঘুরান (Shift চেপে ১৫° স্ন্যাপ)' : 'প্যান মোড সক্রিয়');
          return next;
        });
      }

      if (e.key === 'Escape') {
        if (activeDimensionPoint) {
          setActiveDimensionPoint(null);
          setStatusMessage('ডাইমেনশন লাইন অঙ্কন বাতিল করা হয়েছে');
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (currentTool === 'dimension' && activeDimensionPoint) {
          setActiveDimensionPoint(null);
          setStatusMessage('ডাইমেনশন লাইন বাতিল হয়েছে');
        } else if (currentTool === 'measure' && measurePoints.length > 0) {
          if (isPolygonClosed) {
            setIsPolygonClosed(false);
            setStatusMessage('বহুভুজ সম্পাদনা মোড');
          } else {
            setMeasurePoints(prev => prev.slice(0, -1));
            setStatusMessage('পূর্বের পরিমাপ বিন্দু মোছা হয়েছে');
          }
        }
      }

      if (e.code === 'Space' && !e.repeat) {
        isSpaceDownRef.current = true;
      }

      if (e.key === 'Enter') {
        if (currentTool === 'measure' && measurePoints.length >= 3 && !isPolygonClosed) {
          setIsPolygonClosed(true);
          setStatusMessage('✓ বহুভুজ দাগ পরিমাপ সম্পন্ন হয়েছে');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, currentTool, measurePoints.length, isPolygonClosed, activeDimensionPoint]);

  // Auto-refresh extracted line transparent images when extraction parameters change
  useEffect(() => {
    let isCancelled = false;
    const processActiveLayer = async () => {
      if (!activeLayer.image) return;
      if (activeLayer.mapExtraction.mode === 'original') {
        if (activeLayer.displayImage !== activeLayer.image) {
          setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, displayImage: l.image, displayImageKey: '' } : l));
        }
        return;
      }
      try {
        const extractedDataUrl = await extractMapImage(activeLayer);
        if (!isCancelled && extractedDataUrl) {
          setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, displayImage: extractedDataUrl, displayImageKey: mapStyleKey(activeLayer) } : l));
        }
      } catch (err) {
        console.error("Line extraction failed", err);
      }
    };
    processActiveLayer();
    return () => { isCancelled = true; };
  }, [activeLayer.image, activeLayer.mapExtraction]);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
  };

  // Sync referenceScale when active layer changes
  useEffect(() => {
    if (activeLayer.referenceScale) {
      setReferenceScale(activeLayer.referenceScale);
      setCustomPxPerLink(activeLayer.referenceScale.pxPerLink);
      setMapScale('custom');
    }
  }, [activeLayer.id]);

  const handleApplyReferenceScale = () => {
    if (!tempCalibrateData) return;
    const knownLength = parseFloat(calibrateInputLength);
    if (!knownLength || knownLength <= 0 || isNaN(knownLength)) {
      showNotification('অনুগ্রহ করে সঠিক দৈর্ঘ্য সংখ্যায় লিখুন');
      return;
    }
    const calculatedPxPerLink = calculatePxPerLinkFromReference(
      tempCalibrateData.pixelDistance,
      knownLength,
      calibrateUnit
    );

    const newRefScale: ReferenceScaleConfig = {
      p1: tempCalibrateData.p1,
      p2: tempCalibrateData.p2,
      pixelDistance: tempCalibrateData.pixelDistance,
      knownLength,
      unit: calibrateUnit,
      pxPerLink: calculatedPxPerLink,
      timestamp: Date.now(),
    };

    setReferenceScale(newRefScale);
    setCustomPxPerLink(calculatedPxPerLink);
    setMapScale('custom');
    setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, referenceScale: newRefScale } : l));
    setShowCalibrateModal(false);
    setCalibratePoints([]);
    setCurrentTool('measure');
    setSidebarTab('measure');
    showNotification(`✓ রেফারেন্স স্কেল সক্রিয়: ১ লিংক = ${calculatedPxPerLink.toFixed(3)} px`);
  };

  const handleClearReferenceScale = () => {
    setReferenceScale(null);
    setCustomPxPerLink(null);
    setMapScale('16inch');
    setLayers(prev => prev.map(l => l.id === activeLayer.id ? { ...l, referenceScale: null } : l));
    showNotification('কাস্টম স্কেল রিসেট করা হয়েছে (স্ট্যান্ডার্ড ১৬ ইঞ্চি স্কেল সক্রিয়)');
  };

  /**
   * Upload and process file for target layer (PDF, TIFF, Image)
   */
  const handleUploadForLayer = async (layerId: string, file: File) => {
    setLoadingText(`${layerId} ফাইল প্রসেস করা হচ্ছে...`);
    showNotification(`লোড হচ্ছে: ${file.name}`);

    try {
      const name = file.name.toLowerCase();
      const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
      const isTiff = name.endsWith('.tif') || name.endsWith('.tiff') || file.type.includes('tiff');

      let updatedLayers: MouzaLayer[];

      if (isPdf) {
        const pdfDoc = await parsePdfDocument(file);
        const { dataUrl } = await renderPdfPageToDataUrl(pdfDoc, 1);

        updatedLayers = layers.map(l => {
          if (l.id !== layerId) return l;
          return {
            ...l,
            image: dataUrl,
            displayImage: null,
            fileType: 'pdf',
            fileName: file.name,
            totalPages: pdfDoc.numPages,
            currentPage: 1,
            visible: true,
            opacity: 1.0,
          };
        });
        showNotification(`✓ ${layerId} মৌজা নকশা (পৃষ্ঠা ১) সফলভাবে লোড হয়েছে`);
      } else if (isTiff) {
        const tiffDoc = await parseTiffDocument(file);
        const count = await tiffDoc.getImageCount();
        const { dataUrl } = await renderTiffPageToDataUrl(tiffDoc, 1);

        updatedLayers = layers.map(l => {
          if (l.id !== layerId) return l;
          return {
            ...l,
            image: dataUrl,
            displayImage: null,
            fileType: 'tiff',
            fileName: file.name,
            totalPages: count,
            currentPage: 1,
            visible: true,
            opacity: 1.0,
          };
        });
        showNotification(`✓ ${layerId} TIFF নকশা সফলভাবে লোড হয়েছে`);
      } else {
        // Standard Image (JPG, PNG, WEBP, BMP, SVG)
        const { dataUrl } = await renderRasterImageFile(file);
        updatedLayers = layers.map(l => {
          if (l.id !== layerId) return l;
          return {
            ...l,
            image: dataUrl,
            displayImage: null,
            fileType: 'image',
            fileName: file.name,
            totalPages: 1,
            currentPage: 1,
            visible: true,
            opacity: 1.0,
          };
        });
        showNotification(`✓ ${layerId} ইমেজ সফলভাবে লোড হয়েছে`);
      }

      setLayers(updatedLayers);
      pushHistory(updatedLayers);
      setActiveLayerId(layerId);
    } catch (err: any) {
      console.error(err);
      setModalInfo({
        title: 'ফাইল লোড ত্রুটি',
        content: `ফাইলটি প্রক্রিয়াকরণ করা সম্ভব হয়নি: ${err?.message || err}. সমর্থিত ফরম্যাট: PDF, TIFF, JPG, PNG, WEBP, BMP.`,
      });
      showNotification('ফাইল লোড ব্যর্থ');
    } finally {
      setLoadingText(null);
    }
  };

  /**
   * Multi-page PDF/TIFF page switching
   */
  const handleChangePage = async (layerId: string, pageNum: number) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.fileName) return;

    setLoadingText(`${layer.short} পৃষ্ঠা ${pageNum} পরিবর্তন হচ্ছে...`);
    try {
      showNotification(`পৃষ্ঠা ${pageNum} পরিবর্তন করা হয়েছে`);
      const updated = layers.map(l => (l.id === layerId ? { ...l, currentPage: pageNum } : l));
      setLayers(updated);
      pushHistory(updated);
    } catch (err: any) {
      setModalInfo({
        title: 'পৃষ্ঠা রেন্ডার ব্যর্থ',
        content: err?.message || 'পৃষ্ঠা পরিবর্তন করা সম্ভব হয়নি।',
      });
    } finally {
      setLoadingText(null);
    }
  };

  /**
   * Layer Transform & Configuration Updates
   */
  const updateActiveLayer = (patch: Partial<MouzaLayer>, recordHistory = true) => {
    const updated = layers.map(l => (l.id === activeLayerId ? { ...l, ...patch } : l));
    setLayers(updated);
    if (recordHistory) {
      pushHistory(updated);
    }
  };

  const handleResetTransform = (layerId = activeLayerId) => {
    const updated = layers.map(l =>
      l.id === layerId
        ? {
            ...l,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            affine: null,
            warp: null,
            alignment: null,
          }
        : l
    );
    setLayers(updated);
    pushHistory(updated);
    showNotification('ট্রান্সফর্ম রিসেট করা হয়েছে');
  };

  const handleCenterLayer = () => {
    updateActiveLayer({ x: 0, y: 0 });
    showNotification('নকশা কেন্দ্রে আনা হয়েছে');
  };

  const handleNudge = (dx: number, dy: number) => {
    if (activeLayer.locked) return;
    updateActiveLayer({ x: activeLayer.x + dx, y: activeLayer.y + dy });
  };

  const handleRotateStep = (deg: number) => {
    if (activeLayer.locked) return;
    let newRot = Number((activeLayer.rotation + deg).toFixed(2));
    while (newRot > 180) newRot -= 360;
    while (newRot < -180) newRot += 360;
    updateActiveLayer({ rotation: newRot, affine: null, warp: null });
  };

  const handleResetRotation = () => {
    if (activeLayer.locked) return;
    updateActiveLayer({ rotation: 0, affine: null, warp: null });
    showNotification(`✓ ${activeLayer.short} নকশা ০° উত্তর দিকে (True North) সোজা করা হয়েছে`);
  };

  const handleSetRotation = (rot: number) => {
    if (activeLayer.locked) return;
    let r = rot;
    while (r > 180) r -= 360;
    while (r < -180) r += 360;
    updateActiveLayer({ rotation: Number(r.toFixed(2)), affine: null, warp: null });
  };

  /**
   * Auto Alignment Execution (Similarity, Affine, Rubber Sheet / TPS)
   */
  const handleAutoAlign = () => {
    if (refLayer.id === cmpLayer.id) {
      setModalInfo({
        title: 'ভুল সিলেকশন',
        content: 'রেফারেন্স ও তুলনা নকশা আলাদা নির্বাচন করুন।',
      });
      return;
    }

    const pairs = collectMatchedControlPoints(refLayer, cmpLayer);
    const minRequired = alignmentMethod === 'similarity' ? 2 : alignmentMethod === 'affine' ? 3 : 6;

    if (pairs.length < minRequired) {
      setModalInfo({
        title: 'পর্যাপ্ত কন্ট্রোল পয়েন্ট নেই',
        content: `${alignmentMethod.toUpperCase()} অ্যালাইনমেন্টের জন্য ন্যূনতম ${minRequired}টি সমনামক পয়েন্ট প্রয়োজন। বর্তমানে ${pairs.length}টি পয়েন্ট পাওয়া গেছে।`,
      });
      return;
    }

    const refPts = pairs.map(p => p.ref);
    const cmpPts = pairs.map(p => p.cmp);

    let updatedLayers: MouzaLayer[];

    if (alignmentMethod === 'similarity') {
      const sol = solveSimilarityTransform(refPts, cmpPts);
      if (!sol) {
        setModalInfo({
          title: 'অ্যালাইনমেন্ট ব্যর্থ',
          content: 'পয়েন্টগুলোর জ্যামিতি থেকে সঠিক সমাধান পাওয়া যায়নি। ভিন্ন ভিন্ন দাগের কোণায় পয়েন্ট বসান।',
        });
        return;
      }
      updatedLayers = layers.map(l => {
        if (l.id !== cmpLayer.id) return l;
        return {
          ...l,
          scale: sol.scale,
          rotation: sol.rotation,
          x: sol.x,
          y: sol.y,
          affine: null,
          warp: null,
          alignment: {
            method: 'similarity',
            referenceId: refLayer.id,
            comparisonId: cmpLayer.id,
            metrics: {
              rms: sol.rmsError,
              mean: sol.meanError,
              max: sol.maxError,
              maxIndex: sol.maxIndex,
            },
            timestamp: new Date().toISOString(),
          },
        };
      });
      showNotification(`✓ ${cmpLayer.short} Similarity অ্যালাইন সম্পন্ন — RMS: ${sol.rmsError.toFixed(2)} px`);
    } else if (alignmentMethod === 'affine') {
      const sol = solveAffineTransform(refPts, cmpPts);
      if (!sol) {
        setModalInfo({
          title: 'অ্যালাইনমেন্ট ব্যর্থ',
          content: 'অ্যাফাইন রূপান্তর নির্ণয় করা যায়নি। পয়েন্টগুলো একই রেখায় অবস্থিত না করে চারকোণায় ছড়িয়ে দিন।',
        });
        return;
      }
      updatedLayers = layers.map(l => {
        if (l.id !== cmpLayer.id) return l;
        return {
          ...l,
          scale: 1,
          rotation: 0,
          x: 0,
          y: 0,
          affine: {
            a: sol.a,
            b: sol.b,
            c: sol.c,
            d: sol.d,
            e: sol.a * (STAGE_WIDTH / 2) + sol.b * (STAGE_HEIGHT / 2) + sol.e,
            f: sol.c * (STAGE_WIDTH / 2) + sol.d * (STAGE_HEIGHT / 2) + sol.f,
          },
          warp: null,
          alignment: {
            method: 'affine',
            referenceId: refLayer.id,
            comparisonId: cmpLayer.id,
            metrics: {
              rms: sol.rmsError,
              mean: sol.meanError,
              max: sol.maxError,
              maxIndex: sol.maxIndex,
            },
            timestamp: new Date().toISOString(),
          },
        };
      });
      showNotification(`✓ ${cmpLayer.short} Affine অ্যালাইন সম্পন্ন — RMS: ${sol.rmsError.toFixed(2)} px`);
    } else {
      // Rubber Sheet (TPS)
      const affineSol = solveAffineTransform(refPts, cmpPts);
      if (!affineSol) return;

      updatedLayers = layers.map(l => {
        if (l.id !== cmpLayer.id) return l;
        return {
          ...l,
          scale: 1,
          rotation: 0,
          x: 0,
          y: 0,
          affine: {
            a: affineSol.a,
            b: affineSol.b,
            c: affineSol.c,
            d: affineSol.d,
            e: affineSol.a * (STAGE_WIDTH / 2) + affineSol.b * (STAGE_HEIGHT / 2) + affineSol.e,
            f: affineSol.c * (STAGE_WIDTH / 2) + affineSol.d * (STAGE_HEIGHT / 2) + affineSol.f,
          },
          warp: {
            method: 'tps',
            sourcePoints: cmpPts.map(p => ({ x: p.u + STAGE_WIDTH / 2, y: p.v + STAGE_HEIGHT / 2 })),
            targetPoints: refPts.map(p => ({ x: p.x, y: p.y })),
            residuals: affineSol.residuals,
          },
          alignment: {
            method: 'tps',
            referenceId: refLayer.id,
            comparisonId: cmpLayer.id,
            metrics: {
              rms: affineSol.rmsError,
              mean: affineSol.meanError,
              max: affineSol.maxError,
              maxIndex: affineSol.maxIndex,
            },
            timestamp: new Date().toISOString(),
          },
        };
      });
      showNotification(`✓ ${cmpLayer.short} Rubber Sheet (TPS Mesh) সক্রিয় হয়েছে`);
    }

    setLayers(updatedLayers);
    pushHistory(updatedLayers);
  };

  /**
   * Dimension Line Handlers
   */
  const handleDeleteDimensionLine = (id: string) => {
    setDimensionLines(prev => prev.filter(d => d.id !== id));
    showNotification('ডাইমেনশন লাইন মুছে ফেলা হয়েছে');
  };

  const handleClearDimensionLines = () => {
    setDimensionLines([]);
    setActiveDimensionPoint(null);
    showNotification('সব ডাইমেনশন লাইন মুছে ফেলা হয়েছে');
  };

  /**
   * Align Active Layer by Dimension Line (0° Horizontal or 90° Vertical)
   */
  const handleAlignLayerByDimensionLine = (line: DimensionLine, targetAngleDeg: number = 0) => {
    if (activeLayer.locked) {
      setModalInfo({
        title: 'লেয়ার লক করা',
        content: `${activeLayer.short} লক করা রয়েছে। অ্যালাইন করার আগে আনলক করুন।`,
      });
      return;
    }

    const res = alignLayerToDimensionAngle(activeLayer, line.p1, line.p2, targetAngleDeg);
    updateActiveLayer({
      rotation: res.rotation,
      x: res.x,
      y: res.y,
      affine: null,
      warp: null,
    }, true);

    const angleName = targetAngleDeg === 0 ? 'অনুভূমিক সমান্তরাল (০°)' : 'উল্লম্ব খাড়া (৯০°)';
    showNotification(`✓ ডাইমেনশন লাইন অনুযায়ী ${activeLayer.short} ${angleName} সোজা করা হয়েছে`);
  };

  /**
   * Superimpose Comparison Layer to Reference Layer using two Dimension Lines (2-point Helmert)
   */
  const handleAlignTwoDimensionLines = (refLine: DimensionLine, cmpLine: DimensionLine) => {
    if (cmpLayer.locked) {
      setModalInfo({
        title: 'লেয়ার লক করা',
        content: `${cmpLayer.short} লক করা রয়েছে। সুপারইম্পোজিশনের আগে আনলক করুন।`,
      });
      return;
    }

    const sol = alignLayerByTwoDimensionLines(refLine, cmpLine, cmpLayer);
    if (!sol) {
      setModalInfo({
        title: 'অ্যালাইনমেন্ট গণনা ব্যর্থ',
        content: 'ডাইমেনশন লাইনের দৈর্ঘ্য বা অবস্থান থেকে রূপান্তর নির্ণয় করা যায়নি।',
      });
      return;
    }

    const updatedLayers = layers.map(l => {
      if (l.id !== cmpLayer.id) return l;
      return {
        ...l,
        scale: Number(sol.scale.toFixed(4)),
        rotation: Number(sol.rotation.toFixed(2)),
        x: Math.round(sol.x),
        y: Math.round(sol.y),
        affine: null,
        warp: null,
        alignment: {
          method: 'similarity' as const,
          referenceId: refLayer.id,
          comparisonId: cmpLayer.id,
          metrics: {
            rms: sol.rmsError,
            mean: sol.meanError,
            max: sol.maxError,
            maxIndex: sol.maxIndex,
          },
          timestamp: new Date().toISOString(),
        },
      };
    });

    setLayers(updatedLayers);
    pushHistory(updatedLayers);
    showNotification(`✓ ডাইমেনশন লাইন মিলিয়ে ${cmpLayer.short} সুপারইম্পোজ সম্পন্ন (স্কেল: ${sol.scale.toFixed(3)}x, ঘূর্ণন: ${sol.rotation.toFixed(1)}°)`);
  };

  /**
   * Custom Layer Management (নতুন লেয়ার যুক্ত ও মুছা)
   */
  const handleAddNewLayer = () => {
    const customCount = layers.filter(l => l.isCustom).length + 1;
    const customColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#eab308'];
    const color = customColors[(customCount - 1) % customColors.length];
    const newId = `CUSTOM_${Date.now()}`;
    const newLayer: MouzaLayer = {
      id: newId,
      name: `নতুন লেয়ার ${customCount} (Custom Drawing)`,
      short: `L${layers.length + 1}`,
      bengali: `কাস্টম লেয়ার ${customCount}`,
      years: 'বর্তমান (ড্রয়িং/ট্রেসিং)',
      desc: 'ব্যবহারকারী নির্ধারিত ড্রয়িং, স্কেচ ও ট্রেসিং লেয়ার',
      color,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: 'normal',
      filter: 'none',
      mapExtraction: {
        mode: 'original',
        color,
        threshold: 235,
        strength: 1.2,
        smooth: 1.0,
        preserveColor: true,
      },
      displayImage: null,
      displayImageKey: '',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      image: null,
      fileType: null,
      fileName: '',
      totalPages: 1,
      currentPage: 1,
      points: [],
      affine: null,
      warp: null,
      alignment: null,
      isCustom: true,
    };

    const updated = [...layers, newLayer];
    setLayers(updated);
    setActiveLayerId(newId);
    pushHistory(updated);
    showNotification(`✓ ${newLayer.name} যুক্ত হয়েছে`);
  };

  const handleDeleteLayer = (layerId: string) => {
    const target = layers.find(l => l.id === layerId);
    if (!target) return;
    if (!confirm(`আপনি কি "${target.name}" লেয়ারটি মুছে ফেলতে চান?`)) return;

    const updated = layers.filter(l => l.id !== layerId);
    setLayers(updated);
    if (activeLayerId === layerId) {
      setActiveLayerId(updated[0]?.id || 'CS');
    }
    pushHistory(updated);
    showNotification(`"${target.short}" লেয়ার মুছে ফেলা হয়েছে`);
  };

  /**
   * Project Save & Export
   */
  const handleSaveProject = () => {
    try {
      const projectData = {
        app: "Mouza Pantograph Pro",
        version: "5.0",
        timestamp: new Date().toISOString(),
        stageZoom,
        layers: layers.map(l => ({
          ...l,
          displayImage: null, // do not bloat JSON with generated transparent thumbnails
        })),
        measurePoints,
        mapScale,
        dimensionLines,
        dimensionStyle,
      };
      const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mouza-pentagraph-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('প্রজেক্ট JSON সফলভাবে সেভ হয়েছে');
    } catch (err: any) {
      setModalInfo({ title: 'সেভ ব্যর্থ', content: err?.message || 'প্রজেক্ট সেভ করা যায়নি।' });
    }
  };

  const handleOpenProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const proj = JSON.parse(reader.result as string);
        if (!proj.layers || !Array.isArray(proj.layers)) throw new Error('অবৈধ প্রজেক্ট ফাইল');
        const updated = layers.map((l, i) => {
          const saved = proj.layers.find((s: any) => s.id === l.id) || proj.layers[i];
          return saved ? { ...l, ...saved, displayImage: null } : l;
        });
        if (Array.isArray(proj.measurePoints)) {
          setMeasurePoints(proj.measurePoints);
        }
        if (proj.mapScale) {
          setMapScale(proj.mapScale);
        }
        if (Array.isArray(proj.dimensionLines)) {
          setDimensionLines(proj.dimensionLines);
        }
        if (proj.dimensionStyle && typeof proj.dimensionStyle === 'object') {
          setDimensionStyle(prev => ({ ...prev, ...proj.dimensionStyle }));
        }
        setLayers(updated);
        pushHistory(updated);
        showNotification('✓ প্রজেক্ট ফাইল সফলভাবে লোড হয়েছে');
      } catch (err: any) {
        setModalInfo({ title: 'ওপেন ব্যর্থ', content: 'প্রজেক্ট ফাইলটি পড়া যায়নি: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleExportPNG = async () => {
    setLoadingText('হাই-রেজোলিউশন ম্যাপ এক্সপোর্ট হচ্ছে...');
    try {
      const exportScale = 2.0;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(STAGE_WIDTH * exportScale);
      canvas.height = Math.round(STAGE_HEIGHT * exportScale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas create failed');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const l of layers) {
        if (!l.visible || !l.image) continue;

        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode === 'normal' ? 'source-over' : l.blendMode;

        ctx.scale(exportScale, exportScale);
        if (l.affine) {
          ctx.translate(STAGE_WIDTH / 2, STAGE_HEIGHT / 2);
          ctx.transform(l.affine.a, l.affine.c, l.affine.b, l.affine.d, l.affine.e, l.affine.f);
        } else {
          const cx = STAGE_WIDTH / 2 + l.x;
          const cy = STAGE_HEIGHT / 2 + l.y;
          ctx.translate(cx, cy);
          ctx.rotate((l.rotation * Math.PI) / 180);
          ctx.scale(l.scale, l.scale);
        }

        if (l.filter && l.filter !== 'none') {
          ctx.filter = l.filter;
        }

        const img = new Image();
        img.src = l.displayImage || l.image;
        await new Promise(r => {
          if (img.complete) r(null);
          img.onload = () => r(null);
          img.onerror = () => r(null);
        });

        ctx.drawImage(img, -STAGE_WIDTH / 2, -STAGE_HEIGHT / 2, STAGE_WIDTH, STAGE_HEIGHT);
        ctx.restore();
      }

      // Draw Polygon Measurements on export canvas if present
      if (measurePoints.length >= 2) {
        ctx.save();
        ctx.scale(exportScale, exportScale);

        if (measurePoints.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(measurePoints[0].x, measurePoints[0].y);
          for (let i = 1; i < measurePoints.length; i++) {
            ctx.lineTo(measurePoints[i].x, measurePoints[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = polygonStyle.lineColor + '33'; // ~20% opacity
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(measurePoints[0].x, measurePoints[0].y);
        for (let i = 1; i < measurePoints.length; i++) {
          ctx.lineTo(measurePoints[i].x, measurePoints[i].y);
        }
        if (isPolygonClosed || measurePoints.length >= 3) {
          ctx.closePath();
        }
        ctx.strokeStyle = polygonStyle.lineColor;
        ctx.lineWidth = polygonStyle.lineWidth;
        ctx.stroke();

        // Draw vertex nodes
        measurePoints.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, polygonStyle.pointSize, 0, Math.PI * 2);
          ctx.fillStyle = polygonStyle.lineColor + '40';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`M${idx + 1}`, pt.x, pt.y - polygonStyle.pointSize - 3);
        });

        // Area badge at centroid
        if (measurePoints.length >= 3) {
          const effectivePx = customPxPerLink || activeLayer.referenceScale?.pxPerLink || SCALE_CONFIGS[mapScale]?.pxPerLink || 0.625;
          const res = calculatePolygonSurveyArea(measurePoints, mapScale, effectivePx, true);
          if (res) {
            const { centroid, decimals, acres, perimeterFeet } = res;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(centroid.x - 70, centroid.y - 25, 140, 50, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${decimals} শতাংশ`, centroid.x, centroid.y - 5);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${acres} একর · ${perimeterFeet} ft`, centroid.x, centroid.y + 12);
          }
        }
        ctx.restore();
      }

      // Draw Dimension Lines on export canvas
      if (dimensionStyle.visible && dimensionLines.length > 0) {
        ctx.save();
        ctx.scale(exportScale, exportScale);
        dimensionLines.forEach(dim => {
          const color = dim.color || dimensionStyle.color;
          const lineWidth = dim.lineWidth || dimensionStyle.lineWidth;
          const { p1, p2 } = dim;
          const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const effectivePx = customPxPerLink || activeLayer.referenceScale?.pxPerLink || SCALE_CONFIGS[mapScale]?.pxPerLink || 0.625;
          const links = Math.round(distPx / effectivePx);
          const feet = (links * 0.66).toFixed(1);
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          let textLabel = `${feet} ft (${links} L)`;
          if (dimensionStyle.displayUnit === 'feet') textLabel = `${feet} ft`;
          else if (dimensionStyle.displayUnit === 'link') textLabel = `${links} লিংক`;
          else if (dimensionStyle.displayUnit === 'meter') textLabel = `${(links * 0.201168).toFixed(1)} মি.`;

          const tickSize = dimensionStyle.tickSize;
          ctx.strokeStyle = color;
          ctx.fillStyle = color;

          if (dimensionStyle.capStyle === 'tick') {
            const perpX = -Math.sin(angle) * tickSize;
            const perpY = Math.cos(angle) * tickSize;
            ctx.lineWidth = Math.max(2, lineWidth * 1.2);
            ctx.beginPath();
            ctx.moveTo(p1.x - perpX, p1.y - perpY);
            ctx.lineTo(p1.x + perpX, p1.y + perpY);
            ctx.moveTo(p2.x - perpX, p2.y - perpY);
            ctx.lineTo(p2.x + perpX, p2.y + perpY);
            ctx.stroke();
          } else if (dimensionStyle.capStyle === 'slash') {
            const slashAngle = angle + Math.PI / 4;
            const sx = Math.cos(slashAngle) * tickSize;
            const sy = Math.sin(slashAngle) * tickSize;
            ctx.lineWidth = Math.max(2.5, lineWidth * 1.3);
            ctx.beginPath();
            ctx.moveTo(p1.x - sx, p1.y - sy);
            ctx.lineTo(p1.x + sx, p1.y + sy);
            ctx.moveTo(p2.x - sx, p2.y - sy);
            ctx.lineTo(p2.x + sx, p2.y + sy);
            ctx.stroke();
          } else if (dimensionStyle.capStyle === 'arrow') {
            const drawArrow = (p: MeasurePoint, baseAng: number) => {
              const arrowLen = tickSize * 1.4;
              const halfWidth = tickSize * 0.45;
              const ax = p.x + Math.cos(baseAng) * arrowLen;
              const ay = p.y + Math.sin(baseAng) * arrowLen;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(ax + Math.cos(baseAng + Math.PI / 2) * halfWidth, ay + Math.sin(baseAng + Math.PI / 2) * halfWidth);
              ctx.lineTo(ax - Math.cos(baseAng + Math.PI / 2) * halfWidth, ay - Math.sin(baseAng + Math.PI / 2) * halfWidth);
              ctx.closePath();
              ctx.fill();
            };
            drawArrow(p1, angle);
            drawArrow(p2, angle + Math.PI);
          } else if (dimensionStyle.capStyle === 'dot') {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, Math.max(3.5, tickSize * 0.4), 0, Math.PI * 2);
            ctx.arc(p2.x, p2.y, Math.max(3.5, tickSize * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }

          // Main line
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Dimension badge
          const badgeW = dimensionStyle.displayUnit === 'feet' || dimensionStyle.displayUnit === 'meter' ? 76 : (dimensionStyle.displayUnit === 'link' ? 88 : 110);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(midX - badgeW / 2, midY - 22, badgeW, 22, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f0fdf4';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(textLabel, midX, midY - 7);
        });
        ctx.restore();
      }

      // Draw matched control points
      refLayer.points.forEach((pt, i) => {
        const p = stagePointForLayerLocal(pt.u, pt.v, refLayer);
        ctx.beginPath();
        ctx.arc(p.x * exportScale, p.y * exportScale, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10b981';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pt.label || `CP${i + 1}`, (p.x + 12) * exportScale, (p.y + 4) * exportScale);
      });

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `mouza-composite-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      showNotification('✓ PNG ডাউনলোড সম্পন্ন');
    } catch (err: any) {
      setModalInfo({ title: 'এক্সপোর্ট ব্যর্থ', content: err?.message || 'ইমেজ এক্সপোর্ট করা সম্ভব হয়নি।' });
    } finally {
      setLoadingText(null);
    }
  };

  /**
   * Stage Viewport Mouse Event Handlers
   */
  const handleStageMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.point-marker')) return;

    const stageEl = document.getElementById('mouza-canvas-stage') as HTMLElement;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    const stageX = (e.clientX - stageRect.left) / stageZoom;
    const stageY = (e.clientY - stageRect.top) / stageZoom;

    if (currentTool === 'point') {
      if (activeLayer.locked) {
        setModalInfo({
          title: 'লেয়ার লক করা',
          content: `${activeLayer.short} লক করা রয়েছে। পয়েন্ট বসাতে আগে আনলক করুন।`,
        });
        return;
      }
      const local = stageToLayerLocal(stageX, stageY, activeLayer);
      const usedLabels = new Set(activeLayer.points.map(p => p.label));
      const nextLabel = POINT_NAMES.find(n => !usedLabels.has(n)) || `CP${activeLayer.points.length + 1}`;

      const newPoint: ControlPoint = {
        id: nextLabel,
        label: nextLabel,
        u: local.u,
        v: local.v,
      };

      const updated = layers.map(l => (l.id === activeLayer.id ? { ...l, points: [...l.points, newPoint] } : l));
      setLayers(updated);
      pushHistory(updated);
      showNotification(`✓ ${activeLayer.short}-এ ${nextLabel} চিহ্নিত করা হয়েছে`);
      return;
    }

    if (currentTool === 'measure') {
      // Right click to close polygon if at least 3 points
      if (e.button === 2) {
        if (measurePoints.length >= 3 && !isPolygonClosed) {
          setIsPolygonClosed(true);
          showNotification('✓ বহুভুজ দাগ পরিমাপ সম্পন্ন হয়েছে');
        }
        return;
      }

      // Only left-click adds vertices
      if (e.button !== 0) return;

      if (isPolygonClosed) {
        return;
      }
      if (measurePoints.length >= 3) {
        const p0 = measurePoints[0];
        const dist = Math.hypot(stageX - p0.x, stageY - p0.y);
        if (dist <= 22) {
          setIsPolygonClosed(true);
          showNotification('✓ বহুভুজ সম্পন্ন হয়েছে');
          return;
        }
      }
      setMeasurePoints(prev => [...prev, { x: Math.round(stageX), y: Math.round(stageY) }]);
      showNotification(`পরিমাপ বিন্দু #${measurePoints.length + 1} যোগ করা হয়েছে`);
      return;
    }

    if (currentTool === 'dimension') {
      // Right click cancels active drawing
      if (e.button === 2) {
        if (activeDimensionPoint) {
          setActiveDimensionPoint(null);
          showNotification('ডাইমেনশন লাইন অঙ্কন বাতিল করা হয়েছে');
        }
        return;
      }
      if (e.button !== 0) return;

      const clickedPt: MeasurePoint = { x: Math.round(stageX), y: Math.round(stageY) };
      if (!activeDimensionPoint) {
        setActiveDimensionPoint(clickedPt);
        showNotification('১ম বিন্দু চিহ্নিত হয়েছে। ২য় বিন্দুতে ক্লিক করে ডাইমেনশন সম্পন্ন করুন।');
      } else {
        const p1 = activeDimensionPoint;
        const p2 = clickedPt;
        const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (distPx < 3) {
          showNotification('বিন্দু দুটি খুব কাছাকাছি। স্পষ্ট দূরত্বে ক্লিক করুন।');
          return;
        }
        const newDim: DimensionLine = {
          id: `dim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          p1,
          p2,
          color: dimensionStyle.color,
          lineWidth: dimensionStyle.lineWidth,
        };
        setDimensionLines(prev => [...prev, newDim]);
        setActiveDimensionPoint(null);
        showNotification('✓ ডাইমেনশন লাইন যুক্ত হয়েছে');
      }
      return;
    }

    if (currentTool === 'calibrate') {
      if (e.button !== 0) return;
      const clickedPt: MeasurePoint = { x: Math.round(stageX), y: Math.round(stageY) };
      if (calibratePoints.length === 0) {
        setCalibratePoints([clickedPt]);
        showNotification('১ম পয়েন্ট চিহ্নিত হয়েছে। এবার রেফারেন্স লাইনের ২য় বিন্দুতে ক্লিক করুন।');
      } else {
        const p1 = calibratePoints[0];
        const p2 = clickedPt;
        const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (distPx < 3) {
          showNotification('বিন্দু দুটি খুব কাছাকাছি। স্পষ্ট দূরত্বে ক্লিক করুন।');
          return;
        }
        setCalibratePoints([p1, p2]);
        setTempCalibrateData({ p1, p2, pixelDistance: distPx });
        setShowCalibrateModal(true);
      }
      return;
    }

    if (currentTool === 'curtain') {
      const containerRect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - containerRect.left) / containerRect.width) * 100));
      setCurtainX(pct);
    }

    if (currentTool === 'rotate') {
      if (activeLayer.locked) {
        setModalInfo({
          title: 'লেয়ার লক করা',
          content: `${activeLayer.short} লক করা রয়েছে। ঘোরানোর আগে আনলক করুন।`,
        });
        return;
      }
      const centerX = STAGE_WIDTH / 2 + activeLayer.x;
      const centerY = STAGE_HEIGHT / 2 + activeLayer.y;
      const startAngle = (Math.atan2(stageY - centerY, stageX - centerX) * 180) / Math.PI;

      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initialPan: { ...stagePan },
        initialLayerPos: { x: activeLayer.x, y: activeLayer.y },
        startAngle,
        initialRotation: activeLayer.rotation || 0,
        centerX,
        centerY,
      };

      setIsRotatingLayer(true);
      return;
    }

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialPan: { ...stagePan },
      initialLayerPos: { x: activeLayer.x, y: activeLayer.y },
      startAngle: 0,
      initialRotation: 0,
      centerX: 0,
      centerY: 0,
    };

    if (currentTool === 'pan' || e.button === 1 || isSpaceDownRef.current) {
      setIsPanning(true);
    } else if (currentTool === 'move') {
      if (!activeLayer.locked) setIsMovingLayer(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggedDimensionInfo) {
        const stageEl = document.getElementById('mouza-canvas-stage') as HTMLElement;
        if (!stageEl) return;
        const stageRect = stageEl.getBoundingClientRect();
        const stageX = (e.clientX - stageRect.left) / stageZoom;
        const stageY = (e.clientY - stageRect.top) / stageZoom;
        const newPoint = { x: Math.round(stageX), y: Math.round(stageY) };
        setDimensionLines(prev =>
          prev.map(dim => {
            if (dim.id !== draggedDimensionInfo.dimId) return dim;
            return {
              ...dim,
              p1: draggedDimensionInfo.pointIndex === 1 ? newPoint : dim.p1,
              p2: draggedDimensionInfo.pointIndex === 2 ? newPoint : dim.p2,
            };
          })
        );
        return;
      }

      if (draggedMeasureIndex !== null) {
        const stageEl = document.getElementById('mouza-canvas-stage') as HTMLElement;
        if (!stageEl) return;
        const stageRect = stageEl.getBoundingClientRect();
        const stageX = (e.clientX - stageRect.left) / stageZoom;
        const stageY = (e.clientY - stageRect.top) / stageZoom;
        setMeasurePoints(prev =>
          prev.map((pt, idx) => (idx === draggedMeasureIndex ? { x: Math.round(stageX), y: Math.round(stageY) } : pt))
        );
        return;
      }

      if (draggedPointInfo) {
        const stageEl = document.getElementById('mouza-canvas-stage') as HTMLElement;
        if (!stageEl) return;
        const stageRect = stageEl.getBoundingClientRect();
        const stageX = (e.clientX - stageRect.left) / stageZoom;
        const stageY = (e.clientY - stageRect.top) / stageZoom;
        const targetLayer = layers.find(l => l.id === draggedPointInfo.layerId);
        if (!targetLayer) return;

        const local = stageToLayerLocal(stageX, stageY, targetLayer);
        setLayers(prev =>
          prev.map(l => {
            if (l.id !== targetLayer.id) return l;
            return {
              ...l,
              points: l.points.map(p =>
                p.id === draggedPointInfo.point.id ? { ...p, u: local.u, v: local.v } : p
              ),
            };
          })
        );
        return;
      }

      if (isRotatingLayer) {
        const stageEl = document.getElementById('mouza-canvas-stage') as HTMLElement;
        if (!stageEl) return;
        const stageRect = stageEl.getBoundingClientRect();
        const stageX = (e.clientX - stageRect.left) / stageZoom;
        const stageY = (e.clientY - stageRect.top) / stageZoom;

        const { centerX, centerY, startAngle, initialRotation } = dragStartRef.current;
        const currentAngle = (Math.atan2(stageY - centerY, stageX - centerX) * 180) / Math.PI;
        let delta = currentAngle - startAngle;

        let newRot = initialRotation + delta;
        if (e.shiftKey) {
          // Snap to 15 degrees when holding Shift
          newRot = Math.round(newRot / 15) * 15;
        }

        while (newRot > 180) newRot -= 360;
        while (newRot < -180) newRot += 360;

        updateActiveLayer({
          rotation: Number(newRot.toFixed(2)),
          affine: null,
          warp: null,
        }, false);
        return;
      }

      if (isPanning) {
        const dx = e.clientX - dragStartRef.current.clientX;
        const dy = e.clientY - dragStartRef.current.clientY;
        setStagePan({
          x: dragStartRef.current.initialPan.x + dx,
          y: dragStartRef.current.initialPan.y + dy,
        });
      } else if (isMovingLayer) {
        const dx = (e.clientX - dragStartRef.current.clientX) / stageZoom;
        const dy = (e.clientY - dragStartRef.current.clientY) / stageZoom;
        updateActiveLayer({
          x: dragStartRef.current.initialLayerPos.x + dx,
          y: dragStartRef.current.initialLayerPos.y + dy,
        }, false);
      }
    };

    const handleMouseUp = () => {
      if (isMovingLayer || isRotatingLayer || draggedPointInfo) {
        pushHistory(layersRef.current);
      }
      setIsPanning(false);
      setIsMovingLayer(false);
      setIsRotatingLayer(false);
      setDraggedPointInfo(null);
      setDraggedMeasureIndex(null);
      setDraggedDimensionInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isMovingLayer, isRotatingLayer, draggedPointInfo, draggedDimensionInfo, stageZoom, layers, activeLayerId, pushHistory]);

  // Mouse wheel zoom
  useEffect(() => {
    const container = document.getElementById('canvas-viewport-root');
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setStageZoom(prev => Math.max(0.1, Math.min(5.0, prev * zoomFactor)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Application Header */}
      <Header
        currentTool={currentTool}
        onSelectTool={tool => {
          setCurrentTool(tool);
          if (tool === 'measure') {
            setSidebarTab('measure');
            showNotification('বহুভুজ পরিমাপ মোড — ক্যানভাসে ক্লিক করে দাগের সীমানা বা বহুভুজ আঁকুন');
          } else if (tool === 'calibrate') {
            setSidebarTab('measure');
            setCalibratePoints([]);
            showNotification('রেফারেন্স স্কেল মোড — ম্যাপের স্কেল দাগ বা জানা লাইনের ১ম ও ২য় বিন্দুতে ক্লিক করুন');
          }
        }}
        onNewProject={() => {
          if (confirm('নতুন প্রজেক্ট খুলবেন? বর্তমান অসংরক্ষিত সব তথ্য রিসেট হয়ে যাবে।')) {
            setLayers(INITIAL_LAYERS_CONFIG);
            setMeasurePoints([]);
            pushHistory(INITIAL_LAYERS_CONFIG);
            showNotification('নতুন প্রজেক্ট প্রস্তুত');
          }
        }}
        onOpenProject={() => projectFileInputRef.current?.click()}
        onSaveProject={handleSaveProject}
        onExportPNG={handleExportPNG}
        onQuickUpload={() => quickFileInputRef.current?.click()}
        stageZoom={stageZoom}
        onZoomIn={() => setStageZoom(z => Math.min(5.0, z * 1.2))}
        onZoomOut={() => setStageZoom(z => Math.max(0.1, z / 1.2))}
        onFitScreen={() => {
          setStageZoom(0.75);
          setStagePan({ x: 0, y: 0 });
          showNotification('ভিউ ফিট করা হয়েছে');
        }}
        activeLayerShort={activeLayer.short}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Main Workspace with Sidebar & Canvas */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar (Collapsible Drawer) */}
        <aside
          className={`border-r border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out z-30 ${
            isSidebarOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden border-none pointer-events-none'
          }`}
        >
          {/* Drawer Title Bar with Collapse Button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/90 text-xs shrink-0">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>নিয়ন্ত্রণ প্যানেল</span>
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="px-2 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="সাইডবার লুকান (Collapse Drawer)"
            >
              <span>লুকান</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-1 shrink-0 text-xs">
            <button
              onClick={() => setSidebarTab('layers')}
              className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === 'layers'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>ম্যাপ স্তর ({layers.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('adjust')}
              className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === 'adjust'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>সমন্বয়</span>
            </button>
            <button
              onClick={() => setSidebarTab('align')}
              className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === 'align'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>অ্যালাইন</span>
            </button>
            <button
              onClick={() => {
                setSidebarTab('measure');
                setCurrentTool('measure');
              }}
              className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === 'measure'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-sky-400" />
              <span>পরিমাপ</span>
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1">
            {sidebarTab === 'layers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    মৌজা জরিপ স্তরসমূহ ({layers.length})
                  </span>
                  <button
                    onClick={handleAddNewLayer}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    title="নতুন ড্রয়িং/ট্রেসিং বা জরিপ লেয়ার যুক্ত করুন"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ নতুন লেয়ার</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  {layers.map((l, i) => (
                    <LayerCard
                      key={l.id}
                      layer={l}
                      index={i}
                      isActive={l.id === activeLayerId}
                      onSelect={() => setActiveLayerId(l.id)}
                      onToggleVisible={() => {
                        const updated = layers.map(item => (item.id === l.id ? { ...item, visible: !item.visible } : item));
                        setLayers(updated);
                        pushHistory(updated);
                      }}
                      onToggleLock={() => {
                        const updated = layers.map(item => (item.id === l.id ? { ...item, locked: !item.locked } : item));
                        setLayers(updated);
                        pushHistory(updated);
                      }}
                      onClear={() => {
                        if (confirm(`${l.short} ম্যাপ পরিষ্কার করতে চান?`)) {
                          const updated = layers.map(item =>
                            item.id === l.id
                              ? { ...item, image: null, displayImage: null, fileName: '', points: [] }
                              : item
                          );
                          setLayers(updated);
                          pushHistory(updated);
                          showNotification(`${l.short} নকশা পরিষ্কার করা হয়েছে`);
                        }
                      }}
                      onUploadFile={file => handleUploadForLayer(l.id, file)}
                      onChangePage={pageNum => handleChangePage(l.id, pageNum)}
                      onChangeOpacity={opacity => {
                        if (l.locked) return;
                        setLayers(prev =>
                          prev.map(item => (item.id === l.id ? { ...item, opacity } : item))
                        );
                      }}
                      onDeleteLayer={() => handleDeleteLayer(l.id)}
                    />
                  ))}

                  {/* Add New Custom Layer Button */}
                  <button
                    onClick={handleAddNewLayer}
                    className="w-full py-2.5 rounded-xl border border-dashed border-blue-500/50 bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 hover:text-blue-300 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    title="নতুন ড্রয়িং বা ওভারলে লেয়ার তৈরি করুন"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন লেয়ার যুক্ত করুন (Custom / Tracing Layer)</span>
                  </button>
                </div>
              </div>
            )}

            {sidebarTab === 'adjust' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs uppercase font-bold text-slate-300">
                    সক্রিয় লেয়ার সমন্বয়: <b className="text-blue-400">{activeLayer.short}</b>
                  </span>
                  <button
                    onClick={() => updateActiveLayer({ locked: !activeLayer.locked })}
                    className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer ${
                      activeLayer.locked ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {activeLayer.locked ? 'লক করা' : 'আনলক'}
                  </button>
                </div>

                <LayerControls
                  layer={activeLayer}
                  onUpdateLayer={updateActiveLayer}
                  onResetTransform={() => handleResetTransform()}
                  onCenterLayer={handleCenterLayer}
                  onNudge={handleNudge}
                  onRotateStep={handleRotateStep}
                  stageZoom={stageZoom}
                />
              </div>
            )}

            {sidebarTab === 'align' && (
              <div className="space-y-3">
                <div className="pb-1 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-300">
                    মৌজা ডিজিটাল সুপারইম্পোজিশন
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">v5.0 Pro</span>
                </div>

                <AlignmentPanel
                  layers={layers}
                  refLayerId={refLayerId}
                  cmpLayerId={cmpLayerId}
                  onSetRefLayerId={setRefLayerId}
                  onSetCmpLayerId={setCmpLayerId}
                  alignmentMethod={alignmentMethod}
                  onSetAlignmentMethod={setAlignmentMethod}
                  onAutoAlign={handleAutoAlign}
                  onClearPoints={() => {
                    const updated = layers.map(l => (l.id === activeLayer.id ? { ...l, points: [] } : l));
                    setLayers(updated);
                    pushHistory(updated);
                    showNotification(`${activeLayer.short}-এর পয়েন্ট মুছে ফেলা হয়েছে`);
                  }}
                  activeLayer={activeLayer}
                  dimensionLines={dimensionLines}
                  onAlignLayerByDimensionLine={handleAlignLayerByDimensionLine}
                  onAlignTwoDimensionLines={handleAlignTwoDimensionLines}
                />
              </div>
            )}

            {sidebarTab === 'measure' && (
              <MeasurementPanel
                measurePoints={measurePoints}
                mapScale={mapScale}
                onSetMapScale={setMapScale}
                isPolygonClosed={isPolygonClosed}
                onClearPoints={() => {
                  setMeasurePoints([]);
                  setIsPolygonClosed(false);
                  showNotification('পরিমাপ পয়েন্টগুলো মুছে ফেলা হয়েছে');
                }}
                onClosePolygon={() => {
                  if (measurePoints.length >= 3) {
                    setIsPolygonClosed(prev => !prev);
                    showNotification(!isPolygonClosed ? '✓ বহুভুজ সম্পন্ন হয়েছে' : 'বহুভুজ সম্পাদনা মোড সক্রিয়');
                  }
                }}
                onUndoLastPoint={() => {
                  if (isPolygonClosed) {
                    setIsPolygonClosed(false);
                  } else {
                    setMeasurePoints(prev => prev.slice(0, -1));
                  }
                  showNotification('পূর্বের পরিমাপ বিন্দু মোছা হয়েছে');
                }}
                activeLayerName={activeLayer.name}
                polygonStyle={polygonStyle}
                onUpdatePolygonStyle={patch => setPolygonStyle(prev => ({ ...prev, ...patch }))}
                customPxPerLink={customPxPerLink}
                onSetCustomPxPerLink={setCustomPxPerLink}
                referenceScale={referenceScale}
                onStartCalibration={() => {
                  setCurrentTool('calibrate');
                  setCalibratePoints([]);
                  showNotification('ম্যাপের স্কেল দাগ বা জানা লাইনের ১ম ও ২য় বিন্দুতে ক্লিক করুন');
                }}
                onClearReferenceScale={handleClearReferenceScale}
                dimensionLines={dimensionLines}
                onDeleteDimensionLine={handleDeleteDimensionLine}
                onClearDimensionLines={handleClearDimensionLines}
                dimensionStyle={dimensionStyle}
                onUpdateDimensionStyle={patch => setDimensionStyle(prev => ({ ...prev, ...patch }))}
              />
            )}
          </div>
        </aside>

        {/* Center Interactive Stage */}
        <main id="canvas-viewport-root" className="flex-1 relative overflow-hidden">
          {/* Floating Drawer Open Button when Sidebar is Collapsed */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-4 left-4 z-40 bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500 shadow-2xl rounded-xl px-3 py-2 flex items-center gap-2 text-sky-400 hover:text-white transition-all backdrop-blur-md cursor-pointer group"
              title="সাইডবার খুলুন (Open Sidebar Drawer)"
            >
              <PanelLeftOpen className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-200">প্যানেল খুলুন</span>
            </button>
          )}

          <CanvasStage
            layers={layers}
            activeLayer={activeLayer}
            refLayer={refLayer}
            cmpLayer={cmpLayer}
            currentTool={currentTool}
            stageZoom={stageZoom}
            stagePanX={stagePan.x}
            stagePanY={stagePan.y}
            onStageMouseDown={handleStageMouseDown}
            onPointDragStart={(layer, point) => setDraggedPointInfo({ layerId: layer.id, point })}
            onPointDelete={(layer, point) => {
              const updated = layers.map(l => (l.id === layer.id ? { ...l, points: l.points.filter(p => p.id !== point.id) } : l));
              setLayers(updated);
              pushHistory(updated);
              showNotification(`পয়েন্ট ${point.label} মুছে ফেলা হয়েছে`);
            }}
            onAddPoint={(x, y) => {}}
            onTriggerUpload={layerId => {
              setActiveLayerId(layerId);
              quickFileInputRef.current?.click();
            }}
            measurePoints={measurePoints}
            curtainX={curtainX}
            mapScale={mapScale}
            onSetMapScale={setMapScale}
            onClearMeasure={() => {
              setMeasurePoints([]);
              setIsPolygonClosed(false);
              showNotification('পরিমাপ পয়েন্ট রিসেট করা হয়েছে');
            }}
            onClosePolygonMeasure={() => {
              if (measurePoints.length >= 3) {
                setIsPolygonClosed(prev => !prev);
                showNotification(!isPolygonClosed ? '✓ বহুভুজ সম্পন্ন হয়েছে' : 'বহুভুজ সম্পাদনা মোড সক্রিয়');
              }
            }}
            isPolygonClosed={isPolygonClosed}
            onMeasurePointDragStart={(index) => setDraggedMeasureIndex(index)}
            onDeleteMeasurePoint={(index) => {
              setMeasurePoints(prev => {
                const next = prev.filter((_, i) => i !== index);
                if (next.length < 3) setIsPolygonClosed(false);
                return next;
              });
              showNotification(`পরিমাপ বিন্দু M${index + 1} মুছে ফেলা হয়েছে`);
            }}
            onUndoLastMeasurePoint={() => {
              if (isPolygonClosed) {
                setIsPolygonClosed(false);
              } else {
                setMeasurePoints(prev => prev.slice(0, -1));
              }
              showNotification('পূর্বের বিন্দু মোছা হয়েছে');
            }}
            isRotatingLayer={isRotatingLayer}
            onRotateStep={handleRotateStep}
            onResetRotation={handleResetRotation}
            onSetRotation={handleSetRotation}
            polygonStyle={polygonStyle}
            onUpdatePolygonStyle={patch => setPolygonStyle(prev => ({ ...prev, ...patch }))}
            customPxPerLink={customPxPerLink}
            referenceScale={referenceScale}
            calibratePoints={calibratePoints}
            onSelectTool={setCurrentTool}
            dimensionLines={dimensionLines}
            activeDimensionPoint={activeDimensionPoint}
            onDeleteDimensionLine={handleDeleteDimensionLine}
            dimensionStyle={dimensionStyle}
            onUpdateDimensionStyle={patch => setDimensionStyle(prev => ({ ...prev, ...patch }))}
            onDimensionPointDragStart={(dimId, pointIndex) => setDraggedDimensionInfo({ dimId, pointIndex })}
            onAlignLayerByDimensionLine={handleAlignLayerByDimensionLine}
          />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-slate-950 px-4 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-300 font-sans">{statusMessage}</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-500">
          <span>পরিমাপ: ক্লিকে দাগের কোণা নির্ধারণ</span>
          <span>Undo: Ctrl+Z</span>
          <span>Redo: Ctrl+Y</span>
          <span>প্যান: Space + Drag</span>
        </div>
      </footer>

      {/* Hidden File Inputs */}
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleOpenProject(f);
          e.target.value = '';
        }}
      />
      <input
        ref={quickFileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleUploadForLayer(activeLayerId, f);
          e.target.value = '';
        }}
      />

      {/* Loading Modal Overlay */}
      {loadingText && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-sm text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-white">{loadingText}</span>
          </div>
        </div>
      )}

      {/* Dialog Modal */}
      {modalInfo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">{modalInfo.title}</h3>
              <button
                onClick={() => setModalInfo(null)}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{modalInfo.content}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalInfo(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Scale Calibration Modal Dialog */}
      {showCalibrateModal && tempCalibrateData && (() => {
        const inputVal = parseFloat(calibrateInputLength);
        const validLength = !isNaN(inputVal) && inputVal > 0 ? inputVal : 100;
        const previewLinks = convertToLinks(validLength, calibrateUnit);
        const previewPxPerLink = previewLinks > 0 ? tempCalibrateData.pixelDistance / previewLinks : 0.625;
        const previewPxPer100Ft = (previewPxPerLink / 0.66) * 100;

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/60 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">রেফারেন্স স্কেল ক্যালিব্রেশন</h3>
                    <span className="text-[10.5px] text-amber-300">ম্যাপের জানা লাইনের দৈর্ঘ্য নির্ধারণ</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCalibrateModal(false);
                    setCalibratePoints([]);
                  }}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pixel measurement banner */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">ম্যাপে চিহ্নিত রেখার দৈর্ঘ্য:</span>
                  <span className="text-base font-bold font-mono text-sky-400">
                    {tempCalibrateData.pixelDistance.toFixed(1)} px
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">সক্রিয় স্তর:</span>
                  <span className="text-xs font-semibold text-slate-200">{activeLayer.name}</span>
                </div>
              </div>

              {/* Known Length and Unit inputs */}
              <div className="space-y-3">
                <label className="text-[11px] font-semibold text-slate-200 block">
                  এই রেখাটির প্রকৃত মাঠের দৈর্ঘ্য লিখুন ও একক নির্বাচন করুন:
                </label>
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={calibrateInputLength}
                      onChange={e => setCalibrateInputLength(e.target.value)}
                      placeholder="যেমন: ১০০ বা ৬৬"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold outline-none focus:border-amber-400"
                      autoFocus
                    />
                  </div>
                  <div className="w-44">
                    <select
                      value={calibrateUnit}
                      onChange={e => setCalibrateUnit(e.target.value as DistanceUnit)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-sky-300 font-semibold outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="link">লিংক (Links)</option>
                      <option value="feet">ফুট (Feet)</option>
                      <option value="meter">মিটার (Meters)</option>
                      <option value="chain">গান্টার চেইন (Chains)</option>
                    </select>
                  </div>
                </div>
                <div className="text-[10.5px] text-slate-400">
                  {calibrateUnit === 'link' && '১০০ লিংক = ১ গান্টার চেইন = ৬৬ ফুট'}
                  {calibrateUnit === 'feet' && '৬৬ ফুট = ১০০ লিংক = ১ গান্টার চেইন'}
                  {calibrateUnit === 'meter' && '১ মিটার = ৩.২৮১ ফুট = ৪.৯৭ লিংক'}
                  {calibrateUnit === 'chain' && '১ গান্টার চেইন = ১০০ লিংক = ৬৬ ফুট'}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5 text-[11px]">
                <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wide">
                  হিসাবকৃত অটো স্কেল রেশিও:
                </span>
                <div className="flex justify-between text-slate-300">
                  <span>প্রতি ১ লিংক (Link):</span>
                  <span className="font-mono font-bold text-amber-300">{previewPxPerLink.toFixed(3)} পিক্সেল</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>প্রতি ১০০ ফুট (Feet):</span>
                  <span className="font-mono text-slate-200">{previewPxPer100Ft.toFixed(1)} পিক্সেল</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>১ গান্টার চেইন (৬৬ ফুট):</span>
                  <span className="font-mono text-slate-200">{(previewPxPerLink * 100).toFixed(1)} পিক্সেল</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setShowCalibrateModal(false);
                    setCalibratePoints([]);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleApplyReferenceScale}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>স্কেল প্রয়োগ করুন</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
