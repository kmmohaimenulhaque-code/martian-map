import React, { useEffect, useRef } from 'react';
import {
  TerrainData,
  LineSegment,
  FeatureMarker,
  computeSolarHillshade,
  generateContourLines,
} from '../utils/terrainMath';
import {
  getColorFromStops,
  MOLA_ELEVATION_STOPS,
  SLOPE_HAZARD_STOPS,
  ROUGHNESS_STOPS,
} from '../utils/colorMaps';

interface Props {
  terrain: TerrainData;
  baseLayer: 'elevation' | 'slope' | 'roughness';
  showContours: boolean;
  contourInterval: number;
  showLandingSites: boolean;
  showSlopeHazards: boolean;
  showSolarVector: boolean;
  solarElevation: number;
  solarAzimuth: number;
  usgsFeatures: FeatureMarker[];
  onHoverTelemetry: (telemetry: {
    lat: number;
    lon: number;
    elevation: number;
    slope: number;
    roughness: number;
  } | null) => void;
}

export const TopographicMapCanvas: React.FC<Props> = ({
  terrain,
  baseLayer,
  showContours,
  contourInterval,
  showLandingSites,
  showSlopeHazards,
  showSolarVector,
  solarElevation,
  solarAzimuth,
  usgsFeatures,
  onHoverTelemetry,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, elevation, slope, roughness } = terrain;
    canvas.width = width;
    canvas.height = height;

    // 1. Compute Hillshade map
    const hillshade = computeSolarHillshade(terrain, solarAzimuth, solarElevation);

    // 2. Render Pixel Data Context Buffer
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let i = 0; i < width * height; i++) {
      let baseColor = { r: 0, g: 0, b: 0 };

      if (baseLayer === 'elevation') {
        baseColor = getColorFromStops(elevation[i], MOLA_ELEVATION_STOPS);
      } else if (baseLayer === 'slope') {
        baseColor = getColorFromStops(slope[i], SLOPE_HAZARD_STOPS);
      } else if (baseLayer === 'roughness') {
        baseColor = getColorFromStops(roughness[i], ROUGHNESS_STOPS);
      }

      // Blend Hillshade illumination
      const shade = hillshade[i] * 0.75 + 0.25; // Preserve ambient light
      const pixelIdx = i * 4;

      data[pixelIdx] = Math.min(255, baseColor.r * shade);
      data[pixelIdx + 1] = Math.min(255, baseColor.g * shade);
      data[pixelIdx + 2] = Math.min(255, baseColor.b * shade);
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);

    // 3. Highlight Slope Hazards (>15° translucent overlay)
    if (showSlopeHazards) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (slope[y * width + x] > 15.0) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }

    // 4. Render Contour Lines (Marching Squares Vectors)
    if (showContours) {
      const contours: LineSegment[] = generateContourLines(terrain, contourInterval);
      ctx.lineWidth = 0.75;

      contours.forEach((seg) => {
        const isIndexContour = Math.abs(seg.level % (contourInterval * 5)) < 1;
        ctx.strokeStyle = isIndexContour
          ? 'rgba(255, 255, 255, 0.85)'
          : 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = isIndexContour ? 1.25 : 0.6;

        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      });
    }

    // 5. Draw Solar Vector Direction Indicator
    if (showSolarVector) {
      const centerX = width - 60;
      const centerY = 60;
      const radius = 30;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      const rad = (solarAzimuth * Math.PI) / 180;
      const endX = centerX + Math.sin(rad) * (radius - 5);
      const endY = centerY - Math.cos(rad) * (radius - 5);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = '10px monospace';
      ctx.fillText(`SOLAR AZ: ${solarAzimuth}°`, centerX - 38, centerY + radius + 15);
      ctx.restore();
    }

    // 6. Draw USGS Features & Landing Site Target Reticles
    usgsFeatures.forEach((feat) => {
      if (feat.type === 'landing_site' && !showLandingSites) return;

      const px = feat.x;
      const py = feat.y;

      ctx.save();
      if (feat.type === 'landing_site') {
        // Target Reticle
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(feat.name, px + 16, py + 4);
      } else {
        // Feature Marker Dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.font = '10px sans-serif';
        ctx.fillText(feat.name, px + 6, py + 3);
      }
      ctx.restore();
    });
  }, [
    terrain,
    baseLayer,
    showContours,
    contourInterval,
    showLandingSites,
    showSlopeHazards,
    showSolarVector,
    solarElevation,
    solarAzimuth,
    usgsFeatures,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < terrain.width && y >= 0 && y < terrain.height) {
      const idx = y * terrain.width + x;
      // Convert grid indices to simulated Mars lat/lon
      const lat = 18.0 + (0.5 - y / terrain.height) * 1.5;
      const lon = 77.0 + (x / terrain.width - 0.5) * 1.5;

      onHoverTelemetry({
        lat: Number(lat.toFixed(2)),
        lon: Number(lon.toFixed(2)),
        elevation: Math.round(terrain.elevation[idx]),
        slope: Number(terrain.slope[idx].toFixed(1)),
        roughness: Number(terrain.roughness[idx].toFixed(2)),
      });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHoverTelemetry(null)}
      className="w-full h-full object-contain cursor-crosshair rounded-lg border border-slate-800 shadow-2xl"
    />
  );
};
