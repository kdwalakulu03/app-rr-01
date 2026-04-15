// ─── Right panel orchestrator for MentorCanvas ────
import { X } from 'lucide-react';
import type { Pin, Area, RouteData, PanelTab } from './canvas-types';
import type { MapRef } from 'react-map-gl/maplibre';
import PanelRouteInfo from './PanelRouteInfo';
import PanelPinsList from './PanelPinsList';
import PanelPinEdit from './PanelPinEdit';
import PanelAreasList from './PanelAreasList';
import PanelAreaEdit from './PanelAreaEdit';

interface Props {
  panelTab: PanelTab;
  setPanelTab: (tab: PanelTab) => void;
  onClose: () => void;

  // Route
  routeData: RouteData;
  setRouteData: React.Dispatch<React.SetStateAction<RouteData>>;
  routeId: number | null;

  // Pins
  pins: Pin[];
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
  selectedPinIdx: number | null;
  setSelectedPinIdx: (idx: number | null) => void;

  // Areas
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  selectedAreaIdx: number | null;
  setSelectedAreaIdx: (idx: number | null) => void;

  mapRef: React.RefObject<MapRef | null>;
}

export default function CanvasPanel({
  panelTab, setPanelTab, onClose,
  routeData, setRouteData, routeId,
  pins, setPins, selectedPinIdx, setSelectedPinIdx,
  areas, setAreas, selectedAreaIdx, setSelectedAreaIdx,
  mapRef,
}: Props) {
  const selectedPin = selectedPinIdx !== null ? pins[selectedPinIdx] : null;
  const selectedArea = selectedAreaIdx !== null ? areas[selectedAreaIdx] : null;

  const TABS: { key: PanelTab; label: string }[] = [
    { key: 'route', label: 'Route' },
    { key: 'pins', label: `Pins (${pins.length})` },
    { key: 'pin', label: 'Edit Pin' },
    { key: 'areas', label: `Areas (${areas.length})` },
    { key: 'area', label: 'Edit Area' },
  ];

  return (
    <div className="w-80 bg-surface-card border-l border-line flex flex-col z-10 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-line">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPanelTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              panelTab === tab.key
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-content-muted hover:text-content'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button onClick={onClose} className="px-2 text-content-muted hover:text-content">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {panelTab === 'route' && (
          <PanelRouteInfo routeData={routeData} setRouteData={setRouteData} routeId={routeId} />
        )}

        {panelTab === 'pins' && (
          <PanelPinsList
            pins={pins}
            selectedPinIdx={selectedPinIdx}
            onSelectPin={(idx) => { setSelectedPinIdx(idx); setPanelTab('pin'); }}
            mapRef={mapRef}
          />
        )}

        {panelTab === 'pin' && (
          <PanelPinEdit
            pin={selectedPin}
            pinIdx={selectedPinIdx}
            setPins={setPins}
            onDelete={() => {
              setPins(prev => prev.filter((_, i) => i !== selectedPinIdx));
              setSelectedPinIdx(null);
              setPanelTab('pins');
            }}
          />
        )}

        {panelTab === 'areas' && (
          <PanelAreasList
            areas={areas}
            selectedAreaIdx={selectedAreaIdx}
            onSelectArea={(idx) => { setSelectedAreaIdx(idx); setPanelTab('area'); }}
            mapRef={mapRef}
          />
        )}

        {panelTab === 'area' && (
          <PanelAreaEdit
            area={selectedArea}
            areaIdx={selectedAreaIdx}
            setAreas={setAreas}
            onDelete={() => {
              setAreas(prev => prev.filter((_, i) => i !== selectedAreaIdx));
              setSelectedAreaIdx(null);
              setPanelTab('areas');
            }}
          />
        )}
      </div>
    </div>
  );
}
