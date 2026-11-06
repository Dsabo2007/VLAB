import React from 'react';
import { X, Plus, GripVertical } from 'lucide-react';
import { labAudio } from '../utils/audio';

export interface CatalogItem {
  id: string;
  nameEn: string;
  nameAr: string;
  spec: string;
  category: 'boards' | 'measurement' | 'sources';
}

export const LAB_CATALOG: CatalogItem[] = [
  // Training Board 1: Instruments & Measurements Board (IMG_20261105_122510)
  {
    id: 'measurements_board',
    nameEn: 'MEASUREMENTS TRAINING BOARD',
    nameAr: 'بورد أجهزة القياس والقياسات (EETC)',
    spec: 'Microammeter µA • 14 Capacitors • 8 Inductors • 18 Resistors • Pots',
    category: 'boards',
  },
  // Training Board 2: Electronics Experiments Board (IMG_20261105_122517)
  {
    id: 'board',
    nameEn: 'ELECTRONICS TRAINING BOARD',
    nameAr: 'بورد تجارب الإلكترونيات (EETC)',
    spec: 'Galv J0409 • Transistors • Dual LM741 • NE555 Timer • 18 Resistors',
    category: 'boards',
  },
  // Passive and active filter trainer board
  {
    id: 'filterboard',
    nameEn: 'PASSIVE & ACTIVE FILTER TRAINER',
    nameAr: 'بورد المرشحات الفعالة والسلبية',
    spec: 'Active LPF / HPF / BPF • Passive LC Filters • Cutoff Jumper Matrix',
    category: 'boards',
  },
  // Oscilloscope
  {
    id: 'scope',
    nameEn: 'UTD2102CEX+ OSCILLOSCOPE',
    nameAr: 'راسم إشارة رقمي 100MHz',
    spec: 'Dual Channel • 1GS/s Storage • Hardware Frequency Counter',
    category: 'measurement',
  },
  // Multimeter
  {
    id: 'dmm',
    nameEn: 'UNI-T UT33D+ MULTIMETER',
    nameAr: 'أفوميتر رقمي دقيق',
    spec: 'DCV / ACV / DCA • 20MΩ Resistance • Diode & Continuity Buzzer',
    category: 'measurement',
  },
  // Function Generator
  {
    id: 'gen',
    nameEn: 'LW-1641 FUNCTION GENERATOR',
    nameAr: 'مولد ترددات وإشارات 2MHz',
    spec: 'Sine / Triangle / Square • DC Offset • Symmetry • Attenuation',
    category: 'sources',
  },
  // Power Supply
  {
    id: 'psu',
    nameEn: 'ATTEN APS3005S POWER SUPPLY',
    nameAr: 'مزود قدرة مستمر 30V/5A',
    spec: 'Regulated DC 0-30V / 0-5A • Constant Voltage & Constant Current',
    category: 'sources',
  },
];

interface InstrumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInstrument: (type: string, dropCoords?: { x: number; y: number }) => void;
  onDragStartItem?: (type: string) => void;
  onDragEndItem?: () => void;
}

export const InstrumentDrawer: React.FC<InstrumentDrawerProps> = ({
  isOpen,
  onClose,
  onAddInstrument,
  onDragStartItem,
  onDragEndItem,
}) => {
  const handleDragStart = (e: React.DragEvent, typeId: string) => {
    e.dataTransfer.setData('application/lab-instrument', typeId);
    e.dataTransfer.setData('text/plain', typeId);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStartItem?.(typeId);
  };

  return (
    <aside
      className={`fixed top-12 left-0 bottom-0 w-[310px] max-w-[85vw] bg-[#0c1017] border-r border-neutral-800 shadow-[20px_0_50px_rgba(0,0,0,0.8)] z-40 flex flex-col text-neutral-100 select-none transition-transform duration-300 ease-out font-sans ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Top Header - Sharp, flush bar with X button */}
      <div className="h-11 px-4 border-b border-neutral-800 flex items-center justify-between bg-[#0a0d14] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-sky-400" />
          <h2 className="text-[11px] font-mono font-bold tracking-wider text-neutral-200 uppercase">
            INSTRUMENTS CATALOG • قائمة الأجهزة
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="إغلاق القائمة (Close)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Helper guide */}
      <div className="px-4 py-2 text-[10px] text-neutral-400 border-b border-neutral-800/60 bg-neutral-950/40 font-arabic">
        انقر على الجهاز لإضافته أو اسحبه مباشرة إلى الطاولة:
      </div>

      {/* Clean Flat List: Only lines between items, NO colorful cards! */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/80">
        {LAB_CATALOG.map((item) => (
          <div
            key={item.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragEnd={() => onDragEndItem?.()}
            onClick={() => {
              labAudio.playPlugSnap();
              onAddInstrument(item.id);
            }}
            className="p-3.5 hover:bg-neutral-800/40 cursor-grab active:cursor-grabbing transition-colors group flex items-center justify-between gap-2.5"
            title={`اسحب ${item.nameAr} إلى الطاولة أو انقر للإضافة`}
          >
            <div className="min-w-0 flex-1">
              {/* English Model Title */}
              <div className="text-[12px] font-mono font-black text-neutral-100 group-hover:text-sky-300 transition-colors truncate tracking-tight">
                {item.nameEn}
              </div>

              {/* Arabic Name */}
              <div className="text-[11px] font-bold text-neutral-300 font-arabic truncate mt-0.5">
                {item.nameAr}
              </div>

              {/* Specification Specs */}
              <div className="text-[9.5px] font-mono text-neutral-500 truncate mt-1">
                {item.spec}
              </div>
            </div>

            {/* Drag Handle / Add indicator */}
            <div className="flex items-center gap-1 shrink-0 text-neutral-500 group-hover:text-sky-400 transition-colors">
              <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Status */}
      <div className="p-2.5 bg-[#0a0d14] border-t border-neutral-800 text-[9.5px] text-neutral-500 font-mono text-center shrink-0">
        CLICK OR DRAG & DROP TO BENCH
      </div>
    </aside>
  );
};
