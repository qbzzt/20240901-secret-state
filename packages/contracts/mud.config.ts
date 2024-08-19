import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  tables: {
    Configuration: {
      schema: {
        width: "uint8",
        height: "uint8",
        numberOfBombs: "uint16",
      },
      key: [],
    },
    VerifierAddress: {
      schema: {
        verifier: "address"
      },
      key: [],
    },
    PlayerGame: {
      schema: {
        player: "address",
        gameId: "bytes32",
        win: "bool",
        lose: "bool",
        digNumber: "uint16",
      },
      key: ["player"],
    },
    GamePlayer: {
      schema: {
        player: "address",
        gameId: "bytes32",
      },
      key: ["gameId"],
    },
    Map: {
      schema: {
        gameId: "bytes32",
        x: "uint8",
        y: "uint8",
        bombsAroundPlusOne: "uint8",        
      },
      key: [ "gameId", "x", "y" ]
    },
    PendingGame: {
      schema: {
        player: "address",
        wantsGame: "bool",
      },
      key: ["player"],
    },
    PendingDig: {
      schema: {
        gameId: "bytes32",
        x: "uint8",
        y: "uint8",
      },
      key: ["gameId"],
      type: "offchainTable"
    }
  },
  systems: {
    GameSystem: {
      openAccess: true
    },
    ServerSystem: {
      openAccess: false,
      accessList: [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      ]
    }
  }
});
