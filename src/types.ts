export type Tide = 'Low' | 'Mid' | 'High' | 'Rising' | 'Falling';

export type BoardType = 'Longboard' | 'Mid-length' | 'Fish' | 'Shortboard';

export interface Entry {
  id: string;
  spot: string;
  country?: string;
  datetime: string;
  tide: Tide;
  boardType?: BoardType;
  boardLength?: string;
  conditions: string;
  notes: string;
  rating?: number;
  createdAt: number;
}

