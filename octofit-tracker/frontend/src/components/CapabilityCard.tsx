import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Props = {
  title: string;
  description: string;
  endpoint: string;
  collectionKey: string;
  emptyMessage: string;
};

type RecordItem = Record<string, unknown>;

function isRecordItem(value: unknown): value is RecordItem {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  return String(value);
}

export function CapabilityCard({ title, description, endpoint, collectionKey, emptyMessage }: Props) {
  const [items, setItems] = useState<RecordItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError(null);

    getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        const records = response[collectionKey];
        if (!Array.isArray(records) || !records.every(isRecordItem)) {
          throw new Error('The server returned an invalid response.');
        }
        if (active) setItems(records);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load data.');
        }
      });

    return () => {
      active = false;
    };
  }, [endpoint, collectionKey]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {error ? (
          <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>
        ) : items === null ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((item, index) => {
              const details = Object.entries(item)
                .filter(([key]) => key !== '_id' && key !== '__v')
                .map(([key, value]) => formatValue(value) ? `${key}: ${formatValue(value)}` : '')
                .filter(Boolean);
              return <li className="list-group-item" key={String(item._id ?? index)}>{details.join(' · ')}</li>;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
