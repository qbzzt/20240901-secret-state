// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { 
  PlayerGame, 
  GamePlayer, 
  Configuration, 
  VerifierAddress, 
  Map, 
  PendingGame, 
  PendingDig 
} from "../codegen/index.sol";

interface IVerifier {
    struct G1Point {
      uint X;
      uint Y;
    }

    struct G2Point {
      uint[2] X;
      uint[2] Y;
    }

    struct Proof {
      G1Point a;
      G2Point b;
      G1Point c;
    }

    function verifyTx(
      Proof memory proof, uint[4] memory input
    ) external view returns (bool r);
}

contract GameSystem is System {
  // Create a new game. 
  function newGame() public {
    // Is there already a game for the user?
    bytes32 gameId = PlayerGame.getGameId(_msgSender());
    require(gameId == 0, "game already in progress");

    PendingGame.set(_msgSender(), true);
  }

  // Called when responding to a newGame request. This would eventually
  // go in the privileged System
  function newGameResponse(address player, bytes32 gameHash) public {
    PlayerGame.set(player, gameHash, false, false, 0);
    GamePlayer.set(gameHash, player);
    PendingGame.set(player, false);
  }

  function dig(uint8 x, uint8 y) public {
    require(y < Configuration.getHeight(), "y too high");
    require(x < Configuration.getWidth(), "x too high");
    require(!PlayerGame.getWin(_msgSender()), "game over, you won");
    require(!PlayerGame.getLose(_msgSender()), "game over, you lost");    
    bytes32 gameId = PlayerGame.getGameId(_msgSender());
    require(Map.get(gameId, x, y) == 0, "You already dug here");
    require(!PendingDig.getWantsDig(gameId), "Already dealing with dig request");
    PendingDig.set(gameId, x, y, true);
  }  


  // Called when responding to a dig request. This would eventually
  // go in the privileged System
  // GOON At this point, this happens without the zero knowledge proof. That part 
  // is to be added later.
  function digResponse(bytes32 gameId, uint8 x, uint8 y, uint8 bombs, uint256[8] calldata proof) external {
    require(x == PendingDig.getX(gameId) && y == PendingDig.getY(gameId),
      "Response with wrong coordinates");
    IVerifier verifier = IVerifier(VerifierAddress.get());

    require(
      verifier.verifyTx(
        IVerifier.Proof({
          a: IVerifier.G1Point({X: proof[0], Y: proof[1]}), 
          b: IVerifier.G2Point({
            X: [proof[2], proof[3]], 
            Y: [proof[4], proof[5]]
          }), 
          c: IVerifier.G1Point({X: proof[6], Y: proof[7]})
        }), 
        [uint(x), uint(y), uint(gameId), uint(bombs)]
      ), "Zero knowledge verification fail"
    );

    PendingDig.setWantsDig(gameId, false);
    processDigResult(gameId, x, y, bombs);
  }


  function processDigResult(bytes32 gameId, uint8 x, uint8 y, uint8 bombAround) 
      internal {
    address player = GamePlayer.get(gameId);
    uint16 digNumber = PlayerGame.getDigNumber(player)+1;
    PlayerGame.setDigNumber(player, digNumber);
    uint8 height = Configuration.getHeight();
    uint8 width = Configuration.getWidth();
    uint16 bombs = Configuration.getNumberOfBombs();

    if (bombAround == 255) {
      Map.set(gameId, x, y, 255);
      PlayerGame.setLose(player, true);
    } else {
      Map.set(gameId, x, y, bombAround+1);
    }
        
    if (height*width - (bombs+digNumber) == 0) {
      PlayerGame.setWin(player, true);
    }
  }

  function reset() public {
    bytes32 gameId = PlayerGame.getGameId(_msgSender());
    require(gameId != 0, "no game to reset");
    PlayerGame.set(_msgSender(), bytes32(0), false, false, 0);
  }

  function setVerifier(address verifier) public {
    VerifierAddress.set(verifier);
  }

}
