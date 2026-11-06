import React from 'react';
import { Port, PortType } from '../types/lab';
import { labAudio } from '../utils/audio';

interface PortJackProps {
  port: Port;
  connectedCount?: number;
  isSelectedForWiring?: boolean;
  onPortClick: (port: Port) => void;
  className?: string;
  hideLabel?: boolean;
}

export const PortJack: React.FC<PortJackProps> = ({
  port,
  connectedCount = 0,
  isSelectedForWiring = false,
  onPortClick,
  className = '',
  hideLabel = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    labAudio.playPlugSnap();
    onPortClick(port);
  };

  const isBnc = port.type === 'bnc';

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex flex-col items-center justify-center cursor-pointer select-none group touch-manipulation ${className}`}
      title={`${port.label} (${isBnc ? 'BNC Connector' : 'Banana Socket'}) - Click to wire`}
      data-port-id={port.id}
    >
      {/* Expanded touch target for iPad & Android */}
      <span className="absolute -inset-3 rounded-full cursor-pointer pointer-events-auto" />
      {/* Visual Socket */}
      {isBnc ? (
        // BNC Connector Style
        <div
          data-port-anchor
          className={`relative w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-sm transition-all ${
            isSelectedForWiring
              ? 'ring-4 ring-cyan-400 ring-offset-1 scale-110'
              : 'hover:scale-105'
          } border-slate-400 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400`}
        >
          {/* Outer Bayonet Ring */}
          <div className="w-5 h-5 rounded-full border border-slate-500 bg-gradient-to-tr from-slate-100 to-slate-300 flex items-center justify-center shadow-inner">
            {/* Color collar ring */}
            <div
              style={{ backgroundColor: port.color || '#94a3b8' }}
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-inner border border-slate-600/40"
            >
              {/* Gold center pin hole */}
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-600 shadow-sm" />
            </div>
          </div>
          {/* Bayonet locking lugs */}
          <div className="absolute -left-[2px] top-1/2 -translate-y-1/2 w-[3px] h-[3px] bg-slate-600 rounded-sm" />
          <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[3px] h-[3px] bg-slate-600 rounded-sm" />
        </div>
      ) : (
        // Banana Jack Style
        <div
          data-port-anchor
          className={`relative w-6 h-6 rounded-full flex items-center justify-center border transition-all shadow-sm ${
            isSelectedForWiring
              ? 'ring-4 ring-amber-400 ring-offset-1 scale-110'
              : 'hover:scale-105'
          } border-black/20`}
          style={{
            backgroundColor: port.color || '#ef4444',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {/* Metallic socket hole */}
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700 shadow-inner flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-neutral-950" />
          </div>
        </div>
      )}

      {/* Connection Indicator Badge */}
      {connectedCount > 0 && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-600 text-[8px] font-bold text-white rounded-full flex items-center justify-center shadow">
          {connectedCount}
        </span>
      )}

      {/* Label */}
      {!hideLabel && port.label && (
        <span className="text-[9px] font-bold text-slate-800 tracking-tight mt-0.5 leading-none">
          {port.label}
        </span>
      )}
    </div>
  );
};
