import { defineWorld } from "@latticexyz/world";
export default defineWorld({
    namespace: "app",
    tables: {
        Configuration: {
            schema: {
                height: "uint8",
                width: "uint8",
                numberOfBombs: "uint16",
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
            key: ["gameId", "x", "y"]
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
                wantsDig: "bool",
            },
            key: ["gameId"],
        }
    },
});
//# sourceMappingURL=mud.config.js.map