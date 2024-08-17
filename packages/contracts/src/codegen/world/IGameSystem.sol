// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/* Autogenerated file. Do not edit manually. */

/**
 * @title IGameSystem
 * @author MUD (https://mud.dev) by Lattice (https://lattice.xyz)
 * @dev This interface is automatically generated from the corresponding system contract. Do not edit manually.
 */
interface IGameSystem {
  function app__newGame() external;

  function app__newGameResponse(address player, bytes32 gameHash) external;

  function app__dig(uint8 x, uint8 y) external;

  function app__digResponse(bytes32 gameId, uint8 x, uint8 y, uint8 bombs, uint256[8] calldata proof) external;

  function app__reset() external;

  function app__setVerifier(address verifier) external;
}
