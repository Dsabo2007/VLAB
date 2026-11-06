import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { Port } from '../types/lab';
import { labAudio } from '../utils/audio';

export interface MeasurementsBoardProps {
  instanceId: string;
  ports: Port[];
  connectedPortIds: Set<string>;
  portConnectionCounts?: Map<string, number>;
  wiringSourcePort: Port | null;
  onPortClick: (port: Port) => void;
  onClose: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  meterDeflection?: number; // In µA (0 to 50)
  pot5k?: number;   // 0 to 100%
  pot100k?: number; // 0 to 100%
  pot1M?: number;   // 0 to 100%
  onPotChange?: (potKey: 'pot5k' | 'pot100k' | 'pot1M', value: number) => void;
}

/**
 * INSTRUMENTS AND MEASUREMENTS EXPERIMENTS TRAINING BOARD
 * 100% Faithful replica of the university laboratory training console from:
 * ELECTRICAL AND ELECTRONIC TECHNICAL COLLEGE • COMPUTER ENGINEERING TECHNIQUES
 * (IMG_20261105_122510.jpg)
 */
export const MeasurementsBoard: React.FC<MeasurementsBoardProps> = ({
  instanceId,
  ports,
  connectedPortIds,
  portConnectionCounts,
  wiringSourcePort,
  onPortClick,
  onClose,
  onDragStart,
  meterDeflection = 0,
  pot5k = 50,
  pot100k = 50,
  pot1M = 50,
  onPotChange,
}) => {
  // Potentiometers state
  const [internalPot5k, setInternalPot5k] = useState(pot5k);
  const [internalPot100k, setInternalPot100k] = useState(pot100k);
  const [internalPot1M, setInternalPot1M] = useState(pot1M);

  useEffect(() => setInternalPot5k(pot5k), [pot5k]);
  useEffect(() => setInternalPot100k(pot100k), [pot100k]);
  useEffect(() => setInternalPot1M(pot1M), [pot1M]);

  const handlePotUpdate = (potKey: 'pot5k' | 'pot100k' | 'pot1M', val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    if (potKey === 'pot5k') setInternalPot5k(clamped);
    if (potKey === 'pot100k') setInternalPot100k(clamped);
    if (potKey === 'pot1M') setInternalPot1M(clamped);
    onPotChange?.(potKey, clamped);
  };

  // Helper to find a port by suffix
  const getPort = (suffix: string) => {
    return ports.find((p) => p.id === `${instanceId}:${suffix}`);
  };

  // Realistic Physical Banana Socket Component
  const renderSocket = (
    portSuffix: string,
    color: 'red' | 'black' = 'red',
    customTooltip?: string
  ) => {
    const port = getPort(portSuffix);
    if (!port) return <div className="w-[20px] h-[20px]" />;

    const isConnected = connectedPortIds.has(port.id);
    const isWiringSource = wiringSourcePort?.id === port.id;
    const stacked = portConnectionCounts?.get(port.id) ?? 0;

    const collarGrad = color === 'red'
      ? 'radial-gradient(circle at 35% 30%, #ef4444 0%, #dc2626 50%, #991b1b 100%)'
      : 'radial-gradient(circle at 35% 30%, #334155 0%, #1e293b 50%, #0f172a 100%)';

    return (
      <div className="relative inline-flex flex-col items-center select-none group/sock">
        <button
          type="button"
          data-port-id={port.id}
          onClick={(e) => {
            e.stopPropagation();
            labAudio.playPlugSnap();
            onPortClick(port);
          }}
          className={`relative w-[21px] h-[21px] rounded-full flex items-center justify-center transition-transform cursor-pointer touch-manipulation ${
            isWiringSource
              ? 'ring-2 ring-cyan-400 scale-125 z-30 shadow-[0_0_12px_#22d3ee]'
              : 'hover:scale-115 active:scale-95'
          }`}
          style={{
            background: collarGrad,
            boxShadow: isConnected
              ? `0 0 0 1.5px #fbbf24, 0 0 8px 2px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.4)`
              : '0 1.5px 3px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
          }}
          title={customTooltip || `${port.name} • ${stacked > 0 ? `${stacked} سلك موصول` : 'انقر للتوصيل'}`}
        >
          {/* Expanded transparent touch hit target (min 45px for iPad & Android touchscreens) */}
          <span className="absolute -inset-3 rounded-full cursor-pointer pointer-events-auto" />
          {/* Outer Nickel/Brass Ring */}
          <div className="w-[13px] h-[13px] rounded-full bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] p-[1.5px] shadow-inner flex items-center justify-center">
            {/* Center Bore (Jack hole) */}
            <div className="w-[8px] h-[8px] rounded-full bg-[#0a0a0a] shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9)] flex items-center justify-center">
              {isConnected && (
                <div className="w-[3px] h-[3px] rounded-full bg-amber-400 shadow-[0_0_4px_#fbbf24]" />
              )}
            </div>
          </div>

          {/* Lead count badge if stacked */}
          {stacked > 1 && (
            <span className="absolute -bottom-1 -right-1 min-w-[12px] h-[12px] px-[2px] rounded-full bg-sky-600 text-white text-[7px] font-black flex items-center justify-center border border-white shadow">
              {stacked}
            </span>
          )}
        </button>
      </div>
    );
  };

  // Realistic Physical Rotary Potentiometer Knob Component
  const renderPhysicalKnob = (
    potKey: 'pot5k' | 'pot100k' | 'pot1M',
    valuePercent: number,
    label: string,
    styleType: 'black-red-cap' | 'knurled-silver' = 'black-red-cap'
  ) => {
    // Rotation range: -135deg to +135deg (270 degrees total span)
    const angle = -135 + (valuePercent / 100) * 270;

    const handlePointerDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startVal = valuePercent;

      const onPointerMove = (moveEvt: PointerEvent) => {
        // Dragging up increases, dragging down decreases
        const deltaY = startY - moveEvt.clientY;
        const deltaPercent = (deltaY / 120) * 100;
        handlePotUpdate(potKey, startVal + deltaPercent);
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        target.releasePointerCapture(upEvt.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    return (
      <div className="flex flex-col items-center select-none group/pot">
        <div
          onPointerDown={handlePointerDown}
          className="relative w-[34px] h-[34px] rounded-full cursor-ns-resize shadow-[0_3px_6px_rgba(0,0,0,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            background: styleType === 'black-red-cap'
              ? 'radial-gradient(circle at 35% 30%, #374151 0%, #1f2937 60%, #111827 100%)'
              : 'radial-gradient(circle at 35% 30%, #f1f5f9 0%, #cbd5e1 50%, #64748b 100%)',
            border: styleType === 'black-red-cap' ? '2px solid #111827' : '2px solid #475569',
          }}
          title={`${label}: ${(valuePercent).toFixed(0)}% (اسحب للأعلى أو الأسفل للتدوير)`}
        >
          {/* Fluted Edge ridges */}
          <div className="absolute inset-0.5 rounded-full border border-white/20 pointer-events-none" />

          {/* Rotating Cap & Indicator Rib */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            {styleType === 'black-red-cap' ? (
              // Red Pointer Cap & White Notch
              <div className="relative w-[18px] h-[18px] rounded-full bg-gradient-to-b from-[#ef4444] to-[#b91c1c] shadow-inner flex items-start justify-center">
                <div className="w-[2.5px] h-[6px] bg-white rounded-full mt-[1px] shadow-sm" />
              </div>
            ) : (
              // Knurled Silver Knob Center with Black Index Dot
              <div className="relative w-[18px] h-[18px] rounded-full bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] shadow-inner flex items-start justify-center">
                <div className="w-[3px] h-[5px] bg-[#0f172a] rounded-sm mt-[1px]" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Needle angle for Microammeter (0 to 50 µA spans -36deg to +36deg)
  const clampedCurrent = Math.max(0, Math.min(50, meterDeflection));
  const needleAngle = -36 + (clampedCurrent / 50) * 72;

  return (
    <div
      className="relative select-none font-sans rounded-2xl"
      style={{
        width: 1180,
        height: 740,
        // Realistic Heavy Extruded Brushed-Aluminum Chassis Frame with 45-degree mitered corners
        background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 35%, #94a3b8 70%, #cbd5e1 100%)',
        padding: '16px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.4)',
        border: '1px solid #64748b',
      }}
    >
      {/* 4 Heavy-Duty Black Industrial Corner Brackets with Countersunk Hex Screws */}
      {/* Top Left Corner */}
      <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-2xl bg-[#1e293b] border-r border-b border-neutral-700 shadow flex items-center justify-center z-20">
        <div className="w-3 h-3 rounded-full bg-neutral-400 border border-neutral-600 flex items-center justify-center shadow-inner">
          <div className="w-1.5 h-0.5 bg-neutral-700" />
        </div>
      </div>
      {/* Top Right Corner */}
      <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-2xl bg-[#1e293b] border-l border-b border-neutral-700 shadow flex items-center justify-center z-20">
        <div className="w-3 h-3 rounded-full bg-neutral-400 border border-neutral-600 flex items-center justify-center shadow-inner">
          <div className="w-1.5 h-0.5 bg-neutral-700" />
        </div>
      </div>
      {/* Bottom Left Corner */}
      <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-2xl bg-[#1e293b] border-r border-t border-neutral-700 shadow flex items-center justify-center z-20">
        <div className="w-3 h-3 rounded-full bg-neutral-400 border border-neutral-600 flex items-center justify-center shadow-inner">
          <div className="w-1.5 h-0.5 bg-neutral-700" />
        </div>
      </div>
      {/* Bottom Right Corner */}
      <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-2xl bg-[#1e293b] border-l border-t border-neutral-700 shadow flex items-center justify-center z-20">
        <div className="w-3 h-3 rounded-full bg-neutral-400 border border-neutral-600 flex items-center justify-center shadow-inner">
          <div className="w-1.5 h-0.5 bg-neutral-700" />
        </div>
      </div>

      {/* Floating Grip Handle & Close Button */}
      <div className="absolute top-1 right-10 flex items-center gap-1 z-30">
        <div
          onPointerDown={onDragStart}
          className="p-1 rounded-md bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
          title="اسحب البورد لتحريكه بحرية"
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md bg-neutral-800/60 hover:bg-red-600 text-neutral-300 hover:text-white transition-colors"
          title="إغلاق البورد"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ====================================================================
          MAIN MONOLITHIC WHITE LAB MELAMINE FACEPLATE (NO CARD BOXES!)
          Pure authentic screen-printed cobalt blue lines on ivory laminate.
         ==================================================================== */}
      <div
        className="w-full h-full relative rounded-lg overflow-hidden flex flex-col justify-between"
        style={{
          background: 'radial-gradient(circle at 50% 30%, #fbfbfa 0%, #f5f4ef 80%, #ebe8df 100%)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 2px rgba(255,255,255,0.8)',
          padding: '16px 24px 14px 24px',
        }}
      >
        {/* =================================================================
            TOP HEADER: Centered Title in Royal Blue Serif
           ================================================================= */}
        <div className="w-full text-center pb-2 border-b border-blue-900/15">
          <h1
            className="text-[21px] tracking-[0.14em] font-black uppercase text-[#0d3b82]"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            INSTRUMENTS AND MEASUREMENTS EXPERIMENTS TRAINING BOARD
          </h1>
        </div>

        {/* =================================================================
            CENTRAL WORKING PANEL (3 Main Visual Columns):
            Left Column: 14 Capacitors + 8 Inductors
            Center Column: 4 Diodes + Analog Microammeter + 2 Bridges + Knife Switches + 3 Potentiometers
            Right Column: 18-Resistor Matrix
           ================================================================= */}
        <div className="flex-1 grid grid-cols-12 gap-2 mt-2 items-start">

          {/* -------------------------------------------------------------
              LEFT SECTION: CAPACITORS (Rows 1-7) & INDUCTORS (Rows 8-11)
              (Two parallel columns of components on clean white enamel)
             ------------------------------------------------------------- */}
          <div className="col-span-4 flex flex-col justify-between h-[580px] pr-2 border-r border-blue-900/10">
            {/* Capacitors (7 rows x 2 cols) */}
            <div className="flex flex-col gap-[7px]">
              {/* Row 1: 0.001uF | 0.005uF */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_001u_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.001uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_001u_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_005u_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.005uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_005u_1:b', 'red')}
                </div>
              </div>

              {/* Row 2: 0.001uF | 0.005uF */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_001u_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.001uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_001u_2:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_005u_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.005uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_005u_2:b', 'red')}
                </div>
              </div>

              {/* Row 3: 0.01uF | 0.2uF */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_01u_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.01uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_01u_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_02u:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.2uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_02u:b', 'red')}
                </div>
              </div>

              {/* Row 4: 0.01uF | 1uF */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_01u_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.01uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_01u_2:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_1u:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">1uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_1u:b', 'red')}
                </div>
              </div>

              {/* Row 5: 0.01uF | 47uF (Electrolytic) */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_01u_3:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.01uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_01u_3:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_47u:pos', 'black')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">47uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <path d="M 24,1 Q 20,6 24,11" fill="none" stroke="#0d3b82" strokeWidth="2.2" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_47u:neg', 'red')}
                </div>
              </div>

              {/* Row 6: 0.1uF | 470uF (Electrolytic) */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_1u_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.1uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_1u_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_470u:pos', 'black')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">470uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <path d="M 24,1 Q 20,6 24,11" fill="none" stroke="#0d3b82" strokeWidth="2.2" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_470u:neg', 'red')}
                </div>
              </div>

              {/* Row 7: 0.1uF | 1000uF (Electrolytic) */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('C_1u_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">0.1uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="1" x2="24" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_1u_2:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('C_1000u:pos', 'black')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">1000uF</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="18" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="18" y1="1" x2="18" y2="11" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="square" />
                      <path d="M 24,1 Q 20,6 24,11" fill="none" stroke="#0d3b82" strokeWidth="2.2" />
                      <line x1="24" y1="6" x2="42" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('C_1000u:neg', 'red')}
                </div>
              </div>
            </div>

            {/* Inductors (4 rows x 2 cols) */}
            <div className="flex flex-col gap-[7px] pt-1 border-t border-blue-900/15">
              {/* Row 8: 5mH | 5mH */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('L_5mH_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">5mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_5mH_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('L_5mH_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">5mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_5mH_2:b', 'red')}
                </div>
              </div>

              {/* Row 9: 10mH | 10mH */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('L_10mH_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">10mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_10mH_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('L_10mH_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">10mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_10mH_2:b', 'red')}
                </div>
              </div>

              {/* Row 10: 20mH | 20mH */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('L_20mH_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">20mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_20mH_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('L_20mH_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">20mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_20mH_2:b', 'red')}
                </div>
              </div>

              {/* Row 11: 100mH | 100mH (Big Chokes) */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('L_100mH_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">100mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_100mH_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('L_100mH_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">100mH</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <line x1="0" y1="6" x2="6" y2="6" stroke="#0d3b82" strokeWidth="1.8" />
                      <path d="M 6,6 Q 10.5,-1 15,6 Q 19.5,-1 24,6 Q 28.5,-1 33,6 Q 37.5,-1 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('L_100mH_2:b', 'red')}
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------
              CENTER SECTION:
              - 4 Vertical Diodes at top
              - Industrial Analog Microammeter (µA)
              - 2 Bridge Rectifiers Stacked Beside the Meter
              - 2 Knife Switches Below
              - 3 Rotary Potentiometers at Bottom (5k, 100k, 1M)
             ------------------------------------------------------------- */}
          <div className="col-span-4 flex flex-col justify-between h-[580px] px-2 border-r border-blue-900/10">
            {/* Top row with 4 vertical diodes & Analog Microammeter */}
            <div className="flex flex-col items-center">
              {/* Row of 4 Diodes above & beside the meter */}
              <div className="w-full flex items-center justify-between px-2 mb-1">
                {/* Diode 1 */}
                <div className="flex flex-col items-center">
                  {renderSocket('D_M1:a', 'red')}
                  <svg width="12" height="24" viewBox="0 0 12 24" className="my-0.5">
                    <line x1="6" y1="0" x2="6" y2="8" stroke="#0d3b82" strokeWidth="1.8" />
                    <polygon points="1,8 11,8 6,16" fill="#0d3b82" stroke="#0d3b82" strokeWidth="1" />
                    <line x1="1" y1="16" x2="11" y2="16" stroke="#0d3b82" strokeWidth="2" />
                    <line x1="6" y1="16" x2="6" y2="24" stroke="#0d3b82" strokeWidth="1.8" />
                  </svg>
                  {renderSocket('D_M1:k', 'red')}
                </div>

                {/* Diode 2 */}
                <div className="flex flex-col items-center">
                  {renderSocket('D_M2:a', 'red')}
                  <svg width="12" height="24" viewBox="0 0 12 24" className="my-0.5">
                    <line x1="6" y1="0" x2="6" y2="8" stroke="#0d3b82" strokeWidth="1.8" />
                    <polygon points="1,8 11,8 6,16" fill="#0d3b82" stroke="#0d3b82" strokeWidth="1" />
                    <line x1="1" y1="16" x2="11" y2="16" stroke="#0d3b82" strokeWidth="2" />
                    <line x1="6" y1="16" x2="6" y2="24" stroke="#0d3b82" strokeWidth="1.8" />
                  </svg>
                  {renderSocket('D_M2:k', 'red')}
                </div>

                {/* Gap for Meter Header */}
                <div className="w-20" />

                {/* Diode 3 */}
                <div className="flex flex-col items-center">
                  {renderSocket('D_M3:a', 'red')}
                  <svg width="12" height="24" viewBox="0 0 12 24" className="my-0.5">
                    <line x1="6" y1="0" x2="6" y2="8" stroke="#0d3b82" strokeWidth="1.8" />
                    <polygon points="1,8 11,8 6,16" fill="#0d3b82" stroke="#0d3b82" strokeWidth="1" />
                    <line x1="1" y1="16" x2="11" y2="16" stroke="#0d3b82" strokeWidth="2" />
                    <line x1="6" y1="16" x2="6" y2="24" stroke="#0d3b82" strokeWidth="1.8" />
                  </svg>
                  {renderSocket('D_M3:k', 'red')}
                </div>

                {/* Diode 4 */}
                <div className="flex flex-col items-center">
                  {renderSocket('D_M4:a', 'red')}
                  <svg width="12" height="24" viewBox="0 0 12 24" className="my-0.5">
                    <line x1="6" y1="0" x2="6" y2="8" stroke="#0d3b82" strokeWidth="1.8" />
                    <polygon points="1,8 11,8 6,16" fill="#0d3b82" stroke="#0d3b82" strokeWidth="1" />
                    <line x1="1" y1="16" x2="11" y2="16" stroke="#0d3b82" strokeWidth="2" />
                    <line x1="6" y1="16" x2="6" y2="24" stroke="#0d3b82" strokeWidth="1.8" />
                  </svg>
                  {renderSocket('D_M4:k', 'red')}
                </div>
              </div>

              {/* Realistic Industrial Slate Gray Analog Microammeter Enclosure */}
              <div
                className="relative w-[210px] h-[125px] rounded-[10px] p-2 flex flex-col items-center justify-between"
                style={{
                  background: 'linear-gradient(135deg, #718096 0%, #4a5568 70%, #2d3748 100%)',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.5)',
                  border: '2px solid #2d3748',
                }}
              >
                {/* Meter Dial Glass Window with Curved Scale */}
                <div
                  className="relative w-full h-[88px] rounded-[6px] overflow-hidden flex flex-col items-center justify-between"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 100%, #ffffff 0%, #f1f5f9 65%, #e2e8f0 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                    border: '1px solid #94a3b8',
                  }}
                >
                  <svg viewBox="0 0 200 84" className="w-full h-full overflow-visible">
                    {/* Anti-parallax Mirrored Strip */}
                    <path d="M 45,56 A 65,65 0 0,1 155,56" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />

                    {/* Scale Arc Line */}
                    <path d="M 40,62 A 70,70 0 0,1 160,62" fill="none" stroke="#1e293b" strokeWidth="1.1" />

                    {/* Scale Ticks: 0, 10, 20, 30, 40, 50 */}
                    {[0, 10, 20, 30, 40, 50].map((val) => {
                      const angleRad = (((val - 25) / 25) * 36 - 90) * (Math.PI / 180);
                      const x1 = 100 + 70 * Math.cos(angleRad);
                      const y1 = 78 + 70 * Math.sin(angleRad);
                      const x2 = 100 + 62 * Math.cos(angleRad);
                      const y2 = 78 + 62 * Math.sin(angleRad);
                      const tx = 100 + 52 * Math.cos(angleRad);
                      const ty = 78 + 52 * Math.sin(angleRad) + 2.5;
                      return (
                        <g key={val}>
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f172a" strokeWidth="1.2" />
                          <text x={tx} y={ty} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a" fontFamily="'Times New Roman', serif">
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* µA Symbol in the Center */}
                    <text x="100" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0d3b82" fontFamily="'Times New Roman', serif">
                      µA
                    </text>

                    {/* Dynamic Pointer Needle */}
                    <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: '100px 78px', transition: 'transform 120ms cubic-bezier(0.2, 0.8, 0.4, 1)' }}>
                      <line x1="100" y1="78" x2="100" y2="10" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
                      <circle cx="100" cy="78" r="3" fill="#0f172a" />
                    </g>
                  </svg>

                  {/* Mechanical Zero Adjuster Screw */}
                  <div className="absolute bottom-0.5 w-3 h-3 rounded-full bg-neutral-300 border border-neutral-500 shadow-sm flex items-center justify-center">
                    <div className="w-1.5 h-0.5 bg-neutral-700" />
                  </div>
                </div>

                {/* Meter Banana Terminals */}
                <div className="w-full flex items-center justify-between px-3 mt-1">
                  <div className="flex items-center gap-1">
                    {renderSocket('UA:neg', 'black', 'Microammeter (-) Terminal')}
                    <span className="text-[7.5px] font-serif text-white font-bold">[-]</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7.5px] font-serif text-white font-bold">[+] 50µA</span>
                    {renderSocket('UA:pos', 'red', 'Microammeter (+) Terminal')}
                  </div>
                </div>
              </div>

              {/* Two center test sockets right under the meter case */}
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#1e293b] border-2 border-neutral-600 shadow-inner" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#1e293b] border-2 border-neutral-600 shadow-inner" />
              </div>
            </div>

            {/* Middle Section: Bridge Rectifiers and Knife Switches */}
            <div className="flex flex-col gap-2 mt-1">
              {/* Bridge Rectifiers (Bridge 1 & Bridge 2) */}
              <div className="grid grid-cols-2 gap-4 items-center px-1">
                {/* Bridge 1 */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[8px] font-serif font-bold text-[#0d3b82]">AC</span>
                    {renderSocket('BR1:ac1', 'red')}
                  </div>
                  <div className="flex items-center justify-between w-[90px]">
                    <div className="flex items-center gap-0.5">
                      {renderSocket('BR1:neg', 'red')}
                      <span className="text-[8.5px] font-bold text-[#0d3b82]">−</span>
                    </div>
                    {/* Diamond Bridge Schematic */}
                    <svg width="28" height="28" viewBox="0 0 28 28">
                      <polygon points="14,1 27,14 14,27 1,14" fill="none" stroke="#0d3b82" strokeWidth="1.6" />
                      <circle cx="14" cy="14" r="2" fill="#0d3b82" />
                    </svg>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[8.5px] font-bold text-[#0d3b82]">+</span>
                      {renderSocket('BR1:pos', 'red')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] font-serif font-bold text-[#0d3b82]">AC</span>
                    {renderSocket('BR1:ac2', 'red')}
                  </div>
                </div>

                {/* Bridge 2 */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[8px] font-serif font-bold text-[#0d3b82]">AC</span>
                    {renderSocket('BR2:ac1', 'red')}
                  </div>
                  <div className="flex items-center justify-between w-[90px]">
                    <div className="flex items-center gap-0.5">
                      {renderSocket('BR2:neg', 'red')}
                      <span className="text-[8.5px] font-bold text-[#0d3b82]">−</span>
                    </div>
                    {/* Diamond Bridge Schematic */}
                    <svg width="28" height="28" viewBox="0 0 28 28">
                      <polygon points="14,1 27,14 14,27 1,14" fill="none" stroke="#0d3b82" strokeWidth="1.6" />
                      <circle cx="14" cy="14" r="2" fill="#0d3b82" />
                    </svg>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[8.5px] font-bold text-[#0d3b82]">+</span>
                      {renderSocket('BR2:pos', 'red')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] font-serif font-bold text-[#0d3b82]">AC</span>
                    {renderSocket('BR2:ac2', 'red')}
                  </div>
                </div>
              </div>

              {/* Knife Switches (SW1 & SW2) */}
              <div className="grid grid-cols-2 gap-4 items-center px-2 pt-2 border-t border-blue-900/15">
                {/* Switch 1 */}
                <div className="flex items-center justify-between px-1">
                  {renderSocket('SW1:a', 'red')}
                  <svg width="40" height="14" viewBox="0 0 40 14" className="mx-1">
                    <line x1="0" y1="7" x2="10" y2="7" stroke="#0d3b82" strokeWidth="1.8" />
                    <circle cx="10" cy="7" r="2" fill="#0d3b82" />
                    <line x1="10" y1="7" x2="28" y2="1" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="30" cy="7" r="2" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    <line x1="30" y1="7" x2="40" y2="7" stroke="#0d3b82" strokeWidth="1.8" />
                  </svg>
                  {renderSocket('SW1:b', 'red')}
                </div>

                {/* Switch 2 */}
                <div className="flex items-center justify-between px-1">
                  {renderSocket('SW2:a', 'red')}
                  <svg width="40" height="14" viewBox="0 0 40 14" className="mx-1">
                    <line x1="0" y1="7" x2="10" y2="7" stroke="#0d3b82" strokeWidth="1.8" />
                    <circle cx="10" cy="7" r="2" fill="#0d3b82" />
                    <line x1="10" y1="7" x2="28" y2="1" stroke="#0d3b82" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="30" cy="7" r="2" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    <line x1="30" y1="7" x2="40" y2="7" stroke="#0d3b82" strokeWidth="1.8" />
                  </svg>
                  {renderSocket('SW2:b', 'red')}
                </div>
              </div>
            </div>

            {/* Bottom: 3 Physical Rotary Potentiometers (5K, 100K, 1M) */}
            <div className="flex items-end justify-between px-1 pt-2 border-t border-blue-900/15">
              {/* Potentiometer 1: 0 ➔ 5K Ω */}
              <div className="flex flex-col items-center">
                {renderPhysicalKnob('pot5k', internalPot5k, 'Potentiometer 5kΩ', 'black-red-cap')}
                <div className="flex items-center gap-1.5 mt-1">
                  {renderSocket('POT_5k:1', 'red')}
                  <div className="flex flex-col items-center">
                    <svg width="34" height="12" viewBox="0 0 34 12">
                      <path d="M 0,6 L 4,6 L 8,1 L 13,11 L 18,1 L 23,11 L 27,1 L 30,6 L 34,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="17" y1="12" x2="17" y2="4" stroke="#0d3b82" strokeWidth="1.6" />
                      <polygon points="14,6 17,2 20,6" fill="#0d3b82" />
                    </svg>
                    {renderSocket('POT_5k:w', 'red')}
                  </div>
                  {renderSocket('POT_5k:3', 'red')}
                </div>
                <span className="text-[8.5px] font-serif font-bold text-[#0d3b82] mt-0.5">
                  0 ➔ 5K Ω
                </span>
              </div>

              {/* Potentiometer 2: 0 ➔ 100K Ω (Knurled Metal Shaft) */}
              <div className="flex flex-col items-center">
                {renderPhysicalKnob('pot100k', internalPot100k, 'Potentiometer 100kΩ', 'knurled-silver')}
                <div className="flex items-center gap-1.5 mt-1">
                  {renderSocket('POT_100k:1', 'red')}
                  <div className="flex flex-col items-center">
                    <svg width="34" height="12" viewBox="0 0 34 12">
                      <path d="M 0,6 L 4,6 L 8,1 L 13,11 L 18,1 L 23,11 L 27,1 L 30,6 L 34,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="17" y1="12" x2="17" y2="4" stroke="#0d3b82" strokeWidth="1.6" />
                      <polygon points="14,6 17,2 20,6" fill="#0d3b82" />
                    </svg>
                    {renderSocket('POT_100k:w', 'red')}
                  </div>
                  {renderSocket('POT_100k:3', 'red')}
                </div>
                <span className="text-[8.5px] font-serif font-bold text-[#0d3b82] mt-0.5">
                  0 ➔ 100K Ω
                </span>
              </div>

              {/* Potentiometer 3: 0 ➔ 1M Ω */}
              <div className="flex flex-col items-center">
                {renderPhysicalKnob('pot1M', internalPot1M, 'Potentiometer 1MΩ', 'black-red-cap')}
                <div className="flex items-center gap-1.5 mt-1">
                  {renderSocket('POT_1M:1', 'red')}
                  <div className="flex flex-col items-center">
                    <svg width="34" height="12" viewBox="0 0 34 12">
                      <path d="M 0,6 L 4,6 L 8,1 L 13,11 L 18,1 L 23,11 L 27,1 L 30,6 L 34,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                      <line x1="17" y1="12" x2="17" y2="4" stroke="#0d3b82" strokeWidth="1.6" />
                      <polygon points="14,6 17,2 20,6" fill="#0d3b82" />
                    </svg>
                    {renderSocket('POT_1M:w', 'red')}
                  </div>
                  {renderSocket('POT_1M:3', 'red')}
                </div>
                <span className="text-[8.5px] font-serif font-bold text-[#0d3b82] mt-0.5">
                  0 ➔ 1M Ω
                </span>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------
              RIGHT SECTION: RESISTOR MATRIX (18 RESISTORS IN 2 COLUMNS)
              (Direct screen-printed blue zigzag symbols and values on white)
             ------------------------------------------------------------- */}
          <div className="col-span-4 flex flex-col justify-between h-[580px] pl-2">
            <div className="flex flex-col gap-[7px]">
              {/* Row 1: 5K Ω | 50 Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_5k_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">5K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_5k_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_50:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">50 Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_50:b', 'red')}
                </div>
              </div>

              {/* Row 2: 10K Ω | 100 Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_10k_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">10K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_10k_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_100:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">100 Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_100:b', 'red')}
                </div>
              </div>

              {/* Row 3: 10K Ω | 220 Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_10k_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">10K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_10k_2:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_220:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">220 Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_220:b', 'red')}
                </div>
              </div>

              {/* Row 4: 50K Ω | 470 Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_50k:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">50K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_50k:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_470:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">470 Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_470:b', 'red')}
                </div>
              </div>

              {/* Row 5: 100K Ω | 560 Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_100k:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">100K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_100k:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_560:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">560 Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_560:b', 'red')}
                </div>
              </div>

              {/* Row 6: 200K Ω | 1K Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_200k_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">200K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_200k_1:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_1k_1:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">1K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_1k_1:b', 'red')}
                </div>
              </div>

              {/* Row 7: 200K Ω | 1K Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_200k_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">200K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_200k_2:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_1k_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">1K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_1k_2:b', 'red')}
                </div>
              </div>

              {/* Row 8: 500K Ω | 2.2K Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_500k:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">500K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_500k:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_2k2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">2.2K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_2k2:b', 'red')}
                </div>
              </div>

              {/* Row 9: 1M Ω | 5K Ω */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between">
                  {renderSocket('R_1M:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">1M Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_1M:b', 'red')}
                </div>
                <div className="flex items-center justify-between">
                  {renderSocket('R_5k_2:a', 'red')}
                  <div className="flex flex-col items-center mx-1">
                    <span className="text-[9px] font-bold font-serif text-[#0d3b82] leading-none mb-0.5">5K Ω</span>
                    <svg width="42" height="12" viewBox="0 0 42 12">
                      <path d="M 0,6 L 6,6 L 10,1 L 15,11 L 20,1 L 25,11 L 30,1 L 34,11 L 37,6 L 42,6" fill="none" stroke="#0d3b82" strokeWidth="1.8" />
                    </svg>
                  </div>
                  {renderSocket('R_5k_2:b', 'red')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            BOTTOM FOOTER: Authentic Screen-Printed University Titles
            Left: COMPUTER ENGINEERING TECHNIQUES
            Right: ELECTRICAL AND ELECTRONIC TECHNICAL COLLEGE
           ================================================================= */}
        <div className="w-full flex items-end justify-between pt-2 border-t border-blue-900/15">
          <span
            className="text-[13px] font-black tracking-wider uppercase text-[#0d3b82]"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            COMPUTER ENGINEERING TECHNIQUES
          </span>

          <div
            className="text-right text-[12.5px] font-black tracking-wider uppercase leading-tight text-[#0d3b82]"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            <div>ELECTRICAL AND ELECTRONIC</div>
            <div>TECHNICAL COLLEGE</div>
          </div>
        </div>
      </div>
    </div>
  );
};
