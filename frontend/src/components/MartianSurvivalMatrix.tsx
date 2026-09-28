import React, { useState, useMemo } from 'react';
import { generateMarsTerrain, FeatureMarker } from '../utils/terrainMath';
import { TopographicMapCanvas } from './TopographicMapCanvas';

const SAMPLE_USGS_FEATURES: FeatureMarker[] = [
  { id: '1', name: 'JEZERO CRATER RIM', lat: 18.38, lon: 77.58, x: 520, y: 140, elevation: -2100, type: 'crater' },
  { id: '2', name: 'NERETVA VALLIS DELTA', lat: 18.28, lon: 77.42, x: 380, y: 220, elevation: -2550, type: 'outflow' },
  { id: '3', name: 'SEITAH RUGGED UNIT', lat: 18.20, lon: 77.48, x: 440, y: 290, elevation: -2800, type: 'usgs_feature' },
  { id: '4', name: 'ALPHA LANDING SITE (PERSEVERANCE)', lat: 18.24, lon: 77.45, x: 410, y: 250, elevation: -2680, type: 'landing_site' },
];

export const MartianSurvivalMatrix: React.FC = () => {
  // Generate 800x500 DEM elevation field
  const terrain = useMemo(() => generateMarsTerrain(800, 500), []);

  // UI State
  const [activeTab, setActiveTab] = useState<'dem' | 'topo' | 'solar' | 'habitat'>('topo');
  const [baseLayer, setBaseLayer] = useState<'elevation' | 'slope' | 'roughness'>('elevation');
  const [showContours, setShowContours] = useState<boolean>(true);
  const [contourInterval, setContourInterval] = useState<number>(250);
  const [showLandingSites, setShowLandingSites] = useState<boolean>(true);
  const [showSlopeHazards, setShowSlopeHazards] = useState<boolean>(false);
  const [showSolarVector, setShowSolarVector] = useState<boolean>(true);

  // Solar Parameters
  const [solarElevation, setSolarElevation] = useState<number>(42);
  const [solarAzimuth, setSolarAzimuth] = useState<number>(115);
  const [solTime, setSolTime] = useState<string>('14:30');

  // Hover Telemetry
  const [hoverData, setHoverData] = useState<{
    lat: number;
    lon: number;
    elevation: number;
    slope: number;
    roughness: number;
  } | null>({
    lat: 18.24,
    lon: 77.45,
    elevation: -4210,
    slope: 14.2,
    roughness: 0.28,
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* HEADER TELEMETRY STRIP */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-wider text-slate-100 uppercase">
            Martian Survival Geospatial Matrix <span className="text-xs text-emerald-400 font-mono ml-2">v4.2</span>
          </h1>
        </div>

        {/* Live Cursor Telemetry */}
        <div className="flex items-center space-x-6 text-xs font-mono bg-slate-950/80 px-4 py-1.5 rounded border border-slate-800">
          <div>LAT: <span className="text-emerald-400">{hoverData ? `${hoverData.lat}° N` : '--'}</span></div>
          <div>LON: <span className="text-emerald-400">{hoverData ? `${hoverData.lon}° E` : '--'}</span></div>
          <div>ELEV: <span className="text-cyan-400">{hoverData ? `${hoverData.elevation.toLocaleString()}M` : '--'}</span></div>
          <div>SLOPE: <span className={hoverData && hoverData.slope > 15 ? 'text-red-400 font-bold' : 'text-amber-400'}>{hoverData ? `${hoverData.slope}°` : '--'}</span></div>
          <div>ROUGHNESS: <span className="text-purple-400">{hoverData ? hoverData.roughness : '--'}</span></div>
          <div>COLD: <span className="text-blue-400">-82°C</span></div>
          <div>PEROXIDES: <span className="text-rose-400">0.4%</span></div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
        {[
          { id: 'dem', label: 'TERRAIN DEM' },
          { id: 'topo', label: 'TOPOGRAPHIC MAP' },
          { id: 'solar', label: 'SOLAR / THERMAL' },
          { id: 'habitat', label: 'HABITAT SITE INDEX' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN VIEWPORT LAYOUT */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* LEFT CONTROLS SIDEBAR */}
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
              Surface Topography & Slope Analysis
            </h2>

            {/* BASE LAYER SELECTION */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Base Layer Render</label>
              {[
                { id: 'elevation', label: 'MOLA Elevation Color' },
                { id: 'slope', label: 'Slope Gradient Map' },
                { id: 'roughness', label: 'Surface Roughness' },
              ].map((layer) => (
                <label key={layer.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="baseLayer"
                    checked={baseLayer === layer.id}
                    onChange={() => setBaseLayer(layer.id as any)}
                    className="accent-emerald-500"
                  />
                  <span>{layer.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* VISUAL OVERLAYS */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <label className="text-xs font-semibold text-slate-300 block">Visual Overlays</label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span>Contour Lines</span>
              </span>
              <select
                value={contourInterval}
                onChange={(e) => setContourInterval(Number(e.target.value))}
                className="bg-slate-950 text-xs text-emerald-400 border border-slate-700 rounded px-1 py-0.5"
              >
                <option value={100}>100m</option>
                <option value={250}>250m</option>
                <option value={500}>500m</option>
              </select>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showLandingSites}
                onChange={(e) => setShowLandingSites(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Landing Site Candidates</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSlopeHazards}
                onChange={(e) => setShowSlopeHazards(e.target.checked)}
                className="accent-emerald-500"
              />
              <span className="text-rose-300 font-semibold">Slope Hazards (&gt;15°)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSolarVector}
                onChange={(e) => setShowSolarVector(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Solar Insolation Vector</span>
            </label>
          </div>

          {/* SOLAR VECTOR CONTROLS */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <label className="text-xs font-semibold text-slate-300 block">Solar Vector Controls</label>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Solar Elevation</span>
                <span className="text-emerald-400 font-mono">{solarElevation}°</span>
              </div>
              <input
                type="range"
                min={5}
                max={85}
                value={solarElevation}
                onChange={(e) => setSolarElevation(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Azimuth Angle</span>
                <span className="text-emerald-400 font-mono">{solarAzimuth}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={solarAzimuth}
                onChange={(e) => setSolarAzimuth(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Time of Sol</span>
              <span className="text-amber-400 font-mono">{solTime} LMST</span>
            </div>
          </div>

          {/* LEGEND */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Legend</span>

            {baseLayer === 'elevation' && (
              <div className="space-y-1">
                <div className="h-3 w-full rounded bg-gradient-to-r from-blue-700 via-emerald-500 via-yellow-400 to-red-600" />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>-8,000m</span>
                  <span>0m</span>
                  <span>+12,000m</span>
                </div>
              </div>
            )}

            {baseLayer === 'slope' && (
              <div className="space-y-1">
                <div className="h-3 w-full rounded bg-gradient-to-r from-green-500 via-amber-400 to-red-600" />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Safe &lt;5°</span>
                  <span>Moderate 5-15°</span>
                  <span>Hazard &gt;15°</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER CANVAS VIEWPORT */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-center relative">
          <TopographicMapCanvas
            terrain={terrain}
            baseLayer={baseLayer}
            showContours={showContours}
            contourInterval={contourInterval}
            showLandingSites={showLandingSites}
            showSlopeHazards={showSlopeHazards}
            showSolarVector={showSolarVector}
            solarElevation={solarElevation}
            solarAzimuth={solarAzimuth}
            usgsFeatures={SAMPLE_USGS_FEATURES}
            onHoverTelemetry={setHoverData}
          />
        </div>

        {/* RIGHT ASTROBIOLOGY & HABITAT SUITABILITY SIDEBAR */}
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
              Astrobiology & Habitat Suitability
            </h2>

            {/* HSI INDEX SCORE */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 tracking-wider uppercase">Habitat Suitability Index</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">78 / 100</div>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-400">
                A-
              </div>
            </div>
          </div>

          {/* MULTI-CRITERIA ANALYSIS BREAKDOWN */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">Multi-Criteria Analysis</label>

            {[
              { label: 'Radiation Shielding', score: 85, color: 'bg-emerald-500' },
              { label: 'Slope Stability', score: 90, color: 'bg-emerald-500' },
              { label: 'Thermal Inertia', score: 65, color: 'bg-amber-500' },
              { label: 'Resource Proximity (Ice)', score: 72, color: 'bg-cyan-500' },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{item.label}</span>
                  <span className="font-mono text-slate-400">{item.score}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* ENVIRONMENTAL STRESSORS */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Environmental Stressors</label>
            <div className="text-xs text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Atmospheric Pressure:</span>
                <span className="text-slate-200">6.1 mbar</span>
              </div>
              <div className="flex justify-between">
                <span>Dust Storm Risk:</span>
                <span className="text-amber-400">MODERATE</span>
              </div>
              <div className="flex justify-between">
                <span>Surface Regolith Perchlorates:</span>
                <span className="text-rose-400">HIGH</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="border-t border-slate-800 pt-4 space-y-2 mt-auto">
            <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded transition-colors uppercase tracking-wider">
              Export Scientific Report (PDF)
            </button>
            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded border border-slate-700 transition-colors uppercase tracking-wider">
              Simulate Solar Shadows
            </button>
            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded border border-slate-700 transition-colors uppercase tracking-wider">
              Initialize Habitat Mesh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
