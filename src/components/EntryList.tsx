import { useState } from 'react';
import type { Entry } from '../types';
import EntryCard from './EntryCard';
import ConfirmDialog from './ConfirmDialog';

interface EntryListProps {
  entries: Entry[];
  totalCount: number;
  search: string;
  onDelete: (id: string) => void;
  onUpdate: (entry: Entry) => void;
  onClearAll: () => void;
}

export default function EntryList({ entries, totalCount, search, onDelete, onUpdate, onClearAll }: EntryListProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <section aria-label="Surf journal entries">
      {/* List */}
      {totalCount > 0 && entries.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">
            No entries match "{search}"
          </p>
        </div>
      ) : (
        entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))
      )}

      {/* Clear all */}
      {totalCount > 0 && (
        <div className="list-footer">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setConfirmClear(true)}
          >
            Clear all entries
          </button>
        </div>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear all entries?"
          message={`This will permanently delete all ${totalCount} entries. This can't be undone.`}
          confirmLabel="Clear all"
          danger
          onConfirm={() => {
            onClearAll();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </section>
  );
}
