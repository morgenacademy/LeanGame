import { useGame } from './game/store';
import { StartScreen } from './components/StartScreen';
import { RoundIntro } from './components/RoundIntro';
import { GameBoard } from './components/GameBoard';
import { DebriefOverlay } from './components/DebriefOverlay';
import { FinalScreen } from './components/FinalScreen';
import { Tour } from './components/Tour';

export default function App() {
  const showIntro = useGame((s) => s.showIntro);
  const phase = useGame((s) => s.g.phase);
  const tourActive = useGame((s) => s.tourActive);

  if (showIntro) return <StartScreen />;
  if (phase === 'round-intro') return <RoundIntro />;
  if (phase === 'finished') return <FinalScreen />;

  return (
    <>
      <GameBoard />
      {phase === 'debrief' && <DebriefOverlay />}
      {tourActive && <Tour />}
    </>
  );
}
