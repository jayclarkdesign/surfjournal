import { useState, useCallback, type FormEvent } from 'react';
import { SPOTS_BY_COUNTRY, COUNTRIES, TIDES, BOARD_TYPES, getCountryForSpot } from '../constants';
import { getCoordsForSpot } from '../spotCoords';
import type { Entry, Tide, BoardType } from '../types';
import StarRating from './StarRating';
import ConfirmDialog from './ConfirmDialog';

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onUpdate: (entry: Entry) => void;
}

const OTHER_VALUE = '__other__';

function formatDate(datetime: string): string {
  try {
    const d = new Date(datetime);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) +
      ' • ' +
      d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
  } catch {
    return datetime;
  }
}

function deriveCountryAndSpot(spot: string) {
  const country = getCountryForSpot(spot);
  if (country) {
    return { country, spot, customSpot: '' };
  }
  return { country: OTHER_VALUE, spot: OTHER_VALUE, customSpot: spot };
}

function getBoardIcon(type: string): string {
  return BOARD_TYPES.find((b) => b.value === type)?.icon ?? '';
}

export default function EntryCard({ entry, onDelete, onUpdate }: EntryCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const initial = deriveCountryAndSpot(entry.spot);
  const [country, setCountry] = useState(initial.country);
  const [spot, setSpot] = useState(initial.spot);
  const [customSpot, setCustomSpot] = useState(initial.customSpot);
  const [date, setDate] = useState(entry.datetime.split('T')[0] ?? '');
  const [time, setTime] = useState(entry.datetime.split('T')[1] ?? '');
  const [tide, setTide] = useState<Tide>(entry.tide);
  const [boardType, setBoardType] = useState<BoardType | undefined>(entry.boardType);
  const [boardLength, setBoardLength] = useState(entry.boardLength ?? '');
  const [conditions, setConditions] = useState(entry.conditions);
  const [notes, setNotes] = useState(entry.notes);
  const [rating, setRating] = useState(entry.rating ?? 0);

  const spotsForCountry = country && country !== OTHER_VALUE ? SPOTS_BY_COUNTRY[country] ?? [] : [];

  const handleSave = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const resolvedSpot = spot === OTHER_VALUE ? customSpot.trim() : spot;
      if (!resolvedSpot || !date || !time) return;
      const datetime = `${date}T${time}`;

      onUpdate({
        ...entry,
        spot: resolvedSpot,
        datetime,
        tide,
        boardType: boardType ?? undefined,
        boardLength: boardLength.trim() || undefined,
        conditions: conditions.trim(),
        notes: notes.trim(),
        rating: rating > 0 ? rating : undefined,
      });
      setEditing(false);
    },
    [entry, spot, customSpot, date, time, tide, boardType, boardLength, conditions, notes, rating, onUpdate]
  );

  const handleCancelEdit = useCallback(() => {
    const restored = deriveCountryAndSpot(entry.spot);
    setCountry(restored.country);
    setSpot(restored.spot);
    setCustomSpot(restored.customSpot);
    setDate(entry.datetime.split('T')[0] ?? '');
    setTime(entry.datetime.split('T')[1] ?? '');
    setTide(entry.tide);
    setBoardType(entry.boardType);
    setBoardLength(entry.boardLength ?? '');
    setConditions(entry.conditions);
    setNotes(entry.notes);
    setRating(entry.rating ?? 0);
    setEditing(false);
  }, [entry]);

  if (editing) {
    return (
      <form className="entry-card" onSubmit={handleSave} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor={`edit-country-${entry.id}`}>Country</label>
            <select
              id={`edit-country-${entry.id}`}
              className="form-select"
              value={country}
              onChange={(e) => {
                const val = e.target.value;
                setCountry(val);
                setSpot('');
                setCustomSpot('');
              }}
            >
              <option value="" disabled>Choose a country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value={OTHER_VALUE}>Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={`edit-spot-${entry.id}`}>Spot</label>
            {country === OTHER_VALUE ? (
              <input
                id={`edit-spot-${entry.id}`}
                type="text"
                className="form-input"
                placeholder="Enter spot name"
                value={customSpot}
                onChange={(e) => {
                  setCustomSpot(e.target.value);
                  setSpot(OTHER_VALUE);
                }}
                aria-label="Custom spot name"
              />
            ) : (
              <select
                id={`edit-spot-${entry.id}`}
                className="form-select"
                value={spot}
                onChange={(e) => setSpot(e.target.value)}
                disabled={!country}
              >
                <option value="" disabled>
                  {country ? 'Choose a spot…' : 'Select country first'}
                </option>
                {spotsForCountry.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor={`edit-date-${entry.id}`}>Date</label>
            <input
              id={`edit-date-${entry.id}`}
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={`edit-time-${entry.id}`}>Time</label>
            <input
              id={`edit-time-${entry.id}`}
              type="time"
              className="form-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor={`edit-tide-${entry.id}`}>Tide</label>
          <select
            id={`edit-tide-${entry.id}`}
            className="form-select"
            value={tide}
            onChange={(e) => setTide(e.target.value as Tide)}
          >
            {TIDES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Board */}
        <div className="form-group">
          <span className="form-label">Board</span>
          <div className="board-picker">
            {BOARD_TYPES.map((b) => (
              <button
                key={b.value}
                type="button"
                className={`board-option${boardType === b.value ? ' selected' : ''}`}
                onClick={() => setBoardType(boardType === b.value ? undefined : b.value as BoardType)}
                aria-pressed={boardType === b.value}
              >
                <span className="board-option-icon">{b.icon}</span>
                <span className="board-option-label">{b.label}</span>
              </button>
            ))}
          </div>
          <div className="board-length-group">
            <label className="form-label" htmlFor={`edit-board-length-${entry.id}`}>
              Board length
            </label>
            <input
              id={`edit-board-length-${entry.id}`}
              type="text"
              className="form-input"
              placeholder="e.g. 6'2&quot;"
              value={boardLength}
              onChange={(e) => setBoardLength(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor={`edit-cond-${entry.id}`}>Conditions</label>
          <input
            id={`edit-cond-${entry.id}`}
            type="text"
            className="form-input"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor={`edit-notes-${entry.id}`}>Journal</label>
          <textarea
            id={`edit-notes-${entry.id}`}
            className="form-textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="form-group">
          <span className="form-label">Rating</span>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const boardInfo = entry.boardType || entry.boardLength;

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <div>
          <div className="entry-spot">
            {entry.spot}
            {(() => {
              const c = getCountryForSpot(entry.spot);
              return c ? <span className="entry-country">{c}</span> : null;
            })()}
          </div>
          <div className="entry-meta">
            <span>{formatDate(entry.datetime)}</span>
            <span className="tide-pill">{entry.tide} tide</span>
            {boardInfo && (
              <span className="board-pill">
                {entry.boardType && <span className="board-pill-icon">{getBoardIcon(entry.boardType)}</span>}
                {entry.boardType}{entry.boardLength ? ` · ${entry.boardLength}` : ''}
              </span>
            )}
            {entry.rating != null && entry.rating > 0 && (
              <StarRating value={entry.rating} onChange={() => {}} readOnly />
            )}
          </div>
        </div>
        <div className="entry-card-actions">
          <button
            className="btn-icon"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${entry.spot} session`}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="btn-icon"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${entry.spot} session`}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {(() => {
        const coords = getCoordsForSpot(entry.spot);
        const hasText = entry.conditions || entry.notes;
        return (
          <div className={`entry-body${coords ? ' entry-body-with-map' : ''}`}>
            {(hasText) && (
              <div className="entry-body-text">
                {entry.conditions && (
                  <div className="entry-conditions">{entry.conditions}</div>
                )}
                {entry.notes && <div className="entry-notes">{entry.notes}</div>}
              </div>
            )}
            {coords && (
              <a
                className="entry-map"
                href={`https://www.openstreetmap.org/?mlat=${coords[0]}&mlon=${coords[1]}#map=14/${coords[0]}/${coords[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in OpenStreetMap"
              >
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords[1] - 0.025},${coords[0] - 0.015},${coords[1] + 0.025},${coords[0] + 0.015}&layer=mapnik&marker=${coords[0]},${coords[1]}`}
                  loading="lazy"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </a>
            )}
          </div>
        );
      })()}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete entry?"
          message={`Remove your ${entry.spot} session? This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => onDelete(entry.id)}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
