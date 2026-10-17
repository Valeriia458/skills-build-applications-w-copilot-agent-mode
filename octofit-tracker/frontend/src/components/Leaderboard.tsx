import { CapabilityCard } from './CapabilityCard.js';
export default function Leaderboard() {
  return <CapabilityCard title="Leaderboard" description="Compare team point totals." endpoint="/api/leaderboard" collectionKey="leaderboard" emptyMessage="No leaderboard entries yet." />;
}
