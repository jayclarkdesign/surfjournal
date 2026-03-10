import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCoordsForSpot } from '../spotCoords';
import { getCountryForSpot, BOARD_TYPES } from '../constants';
import type { Entry } from '../types';
import StarRating from './StarRating';

interface MapViewProps {
  entries: Entry[];
  onClose: () => void;
  focusSpot?: string | null;
}

function formatDate(datetime: string): string {
  try {
    const d = new Date(datetime);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) +
      ' \u2022 ' +
      d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
  } catch {
    return datetime;
  }
}

function getBoardIcon(type: string): string {
  return BOARD_TYPES.find((b) => b.value === type)?.icon ?? '';
}

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="-2 -2 32 44">
  <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="%23f5c800" stroke="%23333" stroke-width="2"/>
  <circle cx="14" cy="14" r="6" fill="%23fff" stroke="%23333" stroke-width="1.5"/>
</svg>`;

const pinIcon = L.icon({
  iconUrl: `data:image/svg+xml,${PIN_SVG}`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44],
});

interface SpotGroup {
  coords: [number, number];
  entries: Entry[];
  spotName: string;
}

export default function MapView({ entries, onClose, focusSpot }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selected, setSelected] = useState<SpotGroup | null>(null);
  const initialFocusDone = useRef(false);

  const spotGroups = useMemo(() => {
    const groups = new Map<string, SpotGroup>();
    for (const entry of entries) {
      const coords = getCoordsForSpot(entry.spot);
      if (!coords) continue;
      const key = `${coords[0]},${coords[1]}`;
      if (groups.has(key)) {
        groups.get(key)!.entries.push(entry);
      } else {
        groups.set(key, { coords, entries: [entry], spotName: entry.spot });
      }
    }
    return Array.from(groups.values());
  }, [entries]);

  const { countryCount, spotCount, sessionCount } = useMemo(() => {
    const countries = new Set<string>();
    const spots = new Set<string>();
    let sessions = 0;
    for (const group of spotGroups) {
      spots.add(group.spotName);
      sessions += group.entries.length;
      const country = getCountryForSpot(group.spotName);
      if (country) countries.add(country);
    }
    return { countryCount: countries.size, spotCount: spots.size, sessionCount: sessions };
  }, [spotGroups]);

  const { unmappedSpotCount, unmappedSessionCount } = useMemo(() => {
    const unmappedSpots = new Set<string>();
    let sessions = 0;
    for (const entry of entries) {
      if (getCoordsForSpot(entry.spot)) continue;
      unmappedSpots.add(entry.spot);
      sessions += 1;
    }
    return { unmappedSpotCount: unmappedSpots.size, unmappedSessionCount: sessions };
  }, [entries]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      zoomControl: false,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0,
      maxBounds: L.latLngBounds([-90, -180], [90, 180]),
      minZoom: 3,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
      noWrap: true,
    }).addTo(map);

    spotGroups.forEach((group) => {
      const marker = L.marker(group.coords, { icon: pinIcon }).addTo(map);
      marker.on('click', () => setSelected(group));
    });

    if (spotGroups.length > 0) {
      const bounds = L.latLngBounds(spotGroups.map((g) => g.coords));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else {
      map.setView([20, 0], 2);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [spotGroups]);

  useEffect(() => {
    if (!focusSpot || initialFocusDone.current || !mapRef.current) return;
    const group = spotGroups.find((g) =>
      g.entries.some((e) => e.spot === focusSpot)
    );
    if (group) {
      setSelected(group);
      mapRef.current.setView(group.coords, 13, { animate: false });
      initialFocusDone.current = true;
    }
  }, [focusSpot, spotGroups]);

  return (
    <div className="map-overlay">
      <div ref={mapContainer} className="map-container" />

      <button
        type="button"
        className="map-close-btn"
        onClick={onClose}
        aria-label="Close map"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H19v-2z" />
        </svg>
        <span>Back</span>
      </button>

      {spotGroups.length > 0 && (
        <div className="map-stats-badge">
          <span className="map-stat">
            <strong>{countryCount}</strong> {countryCount === 1 ? 'country' : 'countries'}
          </span>
          <span className="map-stat-divider">&bull;</span>
          <span className="map-stat">
            <strong>{spotCount}</strong> {spotCount === 1 ? 'spot' : 'spots'}
          </span>
          <span className="map-stat-divider">&bull;</span>
          <span className="map-stat">
            <strong>{sessionCount}</strong> {sessionCount === 1 ? 'session' : 'sessions'}
          </span>
        </div>
      )}

      {unmappedSessionCount > 0 && (
        <div className="map-stats-badge" style={{ top: spotGroups.length > 0 ? 92 : 28 }}>
          <span className="map-stat">
            {unmappedSessionCount} {unmappedSessionCount === 1 ? 'session' : 'sessions'} from{' '}
            {unmappedSpotCount} {unmappedSpotCount === 1 ? 'spot' : 'spots'} not shown on map (no coordinates yet)
          </span>
        </div>
      )}

      {selected && (
        <div className="map-bottom-sheet" onClick={() => setSelected(null)}>
          <div className="map-sheet-content" onClick={(e) => e.stopPropagation()}>
            {selected.entries.map((entry, i) => {
              const country = getCountryForSpot(entry.spot);
              const boardInfo = entry.boardType || entry.boardLength;
              return (
                <div key={entry.id} className="map-sheet-card">
                  <div className="map-sheet-spot-row">
                    <div className="entry-spot">
                      {entry.spot}
                      {entry.rating != null && entry.rating > 0 && (
                        <div className="entry-spot-rating">
                          <StarRating value={entry.rating} onChange={() => {}} readOnly />
                        </div>
                      )}
                      <span className="entry-country">
                        {[country, formatDate(entry.datetime)].filter(Boolean).join(' \u2022 ')}
                      </span>
                    </div>
                    {i === 0 && (
                      <button
                        type="button"
                        className="btn-retro-edit"
                        onClick={() => setSelected(null)}
                      >
                        CLOSE
                      </button>
                    )}
                  </div>
                  <div className="entry-meta">
                    <span className="tide-pill">{entry.tide} tide</span>
                    {boardInfo && (
                      <span className="board-pill">
                        {entry.boardType && <span className="board-pill-icon">{getBoardIcon(entry.boardType)}</span>}
                        {entry.boardType}{entry.boardLength ? ` \u00b7 ${entry.boardLength}` : ''}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <div className="entry-body">
                      <div className="entry-notes">{entry.notes}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
