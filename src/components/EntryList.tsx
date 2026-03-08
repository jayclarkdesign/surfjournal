import type { Entry } from '../types';
import EntryCard from './EntryCard';

interface EntryListProps {
  entries: Entry[];
  onDelete: (id: string) => void;
  onUpdate: (entry: Entry) => void;
  onOpenMap?: (spot: string) => void;
}

export default function EntryList({ entries, onDelete, onUpdate, onOpenMap }: EntryListProps) {
  return (
    <section aria-label="Surf journal entries">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onOpenMap={onOpenMap ? () => onOpenMap(entry.spot) : undefined}
        />
      ))}
    </section>
  );
}
