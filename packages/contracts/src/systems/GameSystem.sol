// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { 
  PlayerGame, 
  GamePlayer, 
  Configuration, 
  Map, 
  PendingGame, 
  PendingDig 
} from "../codegen/index.sol";

contract GameSystem is System {
  // Create a new game. 
  function newGame() public {
    // Is there already a game for the user?
    bytes32 gameId = PlayerGame.getGameId(_msgSender());
    require(gameId == 0, "game already in progress");

    PendingGame.set(_msgSender(), true);
  }

  function dig(uint8 x, uint8 y) public {
    require(y < Configuration.getHeight(), "y too high");
    require(x < Configuration.getWidth(), "x too high");
    require(!PlayerGame.getWin(_msgSender()), "game over, you won");
    require(!PlayerGame.getLose(_msgSender()), "game over, you lost");    
    bytes32 gameId = PlayerGame.getGameId(_msgSender());
    require(Map.get(gameId, x, y) == 0, "You already dug here");
    PendingDig.set(gameId, x, y);
  }  

  function reset() public {
    bytes32 gameId = PlayerGame.getGameId(_msgSender());
    require(gameId != 0, "no game to reset");
    PlayerGame.set(_msgSender(), bytes32(0), false, false, 0);
  }
}
