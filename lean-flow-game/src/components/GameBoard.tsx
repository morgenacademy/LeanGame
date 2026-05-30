import { Hud } from './Hud';
import { FactoryScene } from './FactoryScene';
import { Narrator } from './Narrator';
import { MoneyFloats } from './MoneyFloats';

export function GameBoard() {
  return (
    <div className="board">
      <Hud />
      <FactoryScene />
      <Narrator />
      <MoneyFloats />
    </div>
  );
}
