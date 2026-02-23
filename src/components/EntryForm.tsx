import { useState, useCallback, type FormEvent } from 'react';
import { v4 as uuid } from 'uuid';
import { SPOTS_BY_COUNTRY, COUNTRIES, TIDES, BOARD_TYPES, getCountryForSpot } from '../constants';
import type { Entry, Tide, BoardType } from '../types';
import StarRating from './StarRating';

interface EntryFormProps {
  onAdd: (entry: Entry) => void;
  onToast: (message: string) => void;
  onClose: () => void;
  lastEntry: Entry | null;
}

function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const OTHER_VALUE = '__other__';

function deriveDefaults(lastEntry: Entry | null) {
  if (!lastEntry) return { country: '', spot: '', customSpot: '', boardType: undefined as BoardType | undefined, boardLength: '' };

  const country = getCountryForSpot(lastEntry.spot);
  const base = { boardType: lastEntry.boardType, boardLength: lastEntry.boardLength ?? '' };
  if (country) {
    return { country, spot: lastEntry.spot, customSpot: '', ...base };
  }
  return { country: OTHER_VALUE, spot: OTHER_VALUE, customSpot: lastEntry.spot, ...base };
}

export default function EntryForm({ onAdd, onToast, onClose, lastEntry }: EntryFormProps) {
  const defaults = deriveDefaults(lastEntry);

  const [country, setCountry] = useState(defaults.country);
  const [spot, setSpot] = useState(defaults.spot);
  const [customSpot, setCustomSpot] = useState(defaults.customSpot);
  const [date, setDate] = useState(toDateStr(new Date()));
  const [time, setTime] = useState(toTimeStr(new Date()));
  const [tide, setTide] = useState<Tide>('Mid');
  const [boardType, setBoardType] = useState<BoardType | undefined>(defaults.boardType);
  const [boardLength, setBoardLength] = useState(defaults.boardLength);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const spotsForCountry = country && country !== OTHER_VALUE ? SPOTS_BY_COUNTRY[country] ?? [] : [];

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    const resolvedSpot = spot === OTHER_VALUE ? customSpot.trim() : spot;
    if (!resolvedSpot) errs.spot = 'Please select or enter a spot.';
    if (!date) errs.date = 'Date is required.';
    if (!time) errs.time = 'Time is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [spot, customSpot, date, time]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const resolvedSpot = spot === OTHER_VALUE ? customSpot.trim() : spot;
      const datetime = `${date}T${time}`;

      const entry: Entry = {
        id: uuid(),
        spot: resolvedSpot,
        datetime,
        tide,
        boardType: boardType ?? undefined,
        boardLength: boardLength.trim() || undefined,
        conditions: '',
        notes: notes.trim(),
        rating: rating > 0 ? rating : undefined,
        createdAt: Date.now(),
      };

      onAdd(entry);
      setNotes('');
      setRating(0);
      setDate(toDateStr(new Date()));
      setTime(toTimeStr(new Date()));
      setErrors({});
      onToast('Session saved ✓');
      onClose();
    },
    [spot, customSpot, date, time, tide, boardType, boardLength, notes, rating, onAdd, onToast, onClose, validate]
  );

  const handleReset = useCallback(() => {
    setCountry('');
    setSpot('');
    setCustomSpot('');
    setDate(toDateStr(new Date()));
    setTime(toTimeStr(new Date()));
    setTide('Mid');
    setBoardType(undefined);
    setBoardLength('');
    setNotes('');
    setRating(0);
    setErrors({});
  }, []);

  return (
    <form className="form-modal-body" onSubmit={handleSubmit} noValidate>
      <div className="form-modal-header">
        <h2 className="form-modal-title">New Entry</h2>
        <button
          type="button"
          className="btn-icon"
          onClick={onClose}
          aria-label="Close form"
        >
          ✕
        </button>
      </div>

      {/* Rating */}
      <div className="form-group">
        <span className="form-label">Rating</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      {/* Country + Spot (side by side) */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="country">
            Country
          </label>
          <select
            id="country"
            className="form-select"
            value={country}
            onChange={(e) => {
              const val = e.target.value;
              setCountry(val);
              setSpot('');
              setCustomSpot('');
            }}
          >
            <option value="" disabled>
              Choose a country…
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER_VALUE}>Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="spot">
            Spot
          </label>
          {country === OTHER_VALUE ? (
            <input
              id="spot"
              type="text"
              className="form-input"
              placeholder="Enter spot name"
              value={customSpot}
              onChange={(e) => {
                setCustomSpot(e.target.value);
                setSpot(OTHER_VALUE);
              }}
              aria-required="true"
              aria-invalid={!!errors.spot}
            />
          ) : (
            <select
              id="spot"
              className="form-select"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.spot}
              disabled={!country}
            >
              <option value="" disabled>
                {country ? 'Choose a spot…' : 'Select country first'}
              </option>
              {spotsForCountry.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {errors.spot && (
            <div className="form-error" role="alert">
              {errors.spot}
            </div>
          )}
        </div>
      </div>

      {/* Date + Time */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="date">
            Date
          </label>
          <div className="date-input-wrapper">
            <input
              id="date"
              type="date"
              className={`form-input${date === toDateStr(new Date()) ? ' date-is-today' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.date}
            />
            {date === toDateStr(new Date()) && (
              <span className="date-today-overlay">Today</span>
            )}
          </div>
          {errors.date && (
            <div className="form-error" role="alert">
              {errors.date}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="time">
            Time
          </label>
          <input
            id="time"
            type="time"
            className="form-input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.time}
          />
          {errors.time && (
            <div className="form-error" role="alert">
              {errors.time}
            </div>
          )}
        </div>
      </div>

      {/* Tide */}
      <div className="form-group">
        <label className="form-label" htmlFor="tide">
          Tide
        </label>
        <select
          id="tide"
          className="form-select"
          value={tide}
          onChange={(e) => setTide(e.target.value as Tide)}
        >
          {TIDES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
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
          <label className="form-label" htmlFor="boardLength">
            Board length
          </label>
          <input
            id="boardLength"
            type="text"
            className="form-input"
            placeholder="e.g. 6'2&quot;"
            value={boardLength}
            onChange={(e) => setBoardLength(e.target.value)}
          />
        </div>
      </div>

      {/* Journal */}
      <div className="form-group">
        <label className="form-label" htmlFor="notes">
          Journal
        </label>
        <textarea
          id="notes"
          className="form-textarea"
          rows={4}
          placeholder="What did you work on? How did it feel?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Add entry
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleReset}>
          Reset
        </button>
      </div>
    </form>
  );
}
