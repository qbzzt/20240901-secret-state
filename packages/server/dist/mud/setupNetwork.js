import { createPublicClient, fallback, webSocket, http, createWalletClient, getContract, } from "viem";
import * as chains from 'viem/chains';
import { syncToRecs } from "@latticexyz/store-sync/recs";
import { createBurnerAccount, transportObserver } from "@latticexyz/common";
import { transactionQueue, writeObserver } from "@latticexyz/common/actions";
import { Subject, share } from "rxjs";
import fs from 'node:fs';
import { createWorld } from "@latticexyz/recs";
import * as dotenv from "dotenv";
import mudConfig from "./mud.config.js";
dotenv.config();
const IWorldAbi = JSON.parse(fs.readFileSync('./IWorld.abi.json', 'utf8'));
const setupNetworkConfig = () => {
    const getChain = (chainId) => {
        for (const chain of Object.values(chains)) {
            if ('id' in chain) {
                if (chain.id === chainId) {
                    return chain;
                }
            }
        }
        throw new Error(`Chain with id ${chainId} not found`);
    };
    const chainId = parseInt(process.env.CHAIN_ID || "31337");
    return {
        worldAddress: process.env.WORLD_ADDRESS || "0x8d8b6b8414e1e3dcfd4168561b9be6bd3bf6ec4b",
        chainId: chainId,
        chain: getChain(chainId),
        // The default is the second key in default anvil
        // funded with 10k test ETH
        privateKey: process.env.PRIVATE_KEY ||
            "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        initialBlockNumber: Number(process.env.INITIAL_BLOCK) || 0n
    };
};
export async function setupNetwork() {
    const networkConfig = setupNetworkConfig();
    const clientOptions = {
        chain: networkConfig.chain,
        transport: transportObserver(fallback([webSocket(), http()])),
        pollingInterval: 1000,
    };
    const publicClient = createPublicClient(clientOptions);
    const write$ = new Subject();
    const walletClient = createWalletClient({
        ...clientOptions,
        account: createBurnerAccount(networkConfig.privateKey),
    })
        .extend(transactionQueue())
        .extend(writeObserver({ onWrite: (write) => write$.next(write) }));
    const worldContract = getContract({
        address: networkConfig.worldAddress,
        abi: IWorldAbi,
        client: { public: publicClient, wallet: walletClient },
    });
    const world = createWorld();
    const { components, latestBlock$, storedBlockLogs$, waitForTransaction } = await syncToRecs({
        world,
        config: mudConfig,
        address: networkConfig.worldAddress,
        publicClient: publicClient,
        startBlock: BigInt(networkConfig.initialBlockNumber),
    });
    return {
        world,
        networkConfig,
        publicClient,
        walletClient,
        worldContract,
        write$: write$.asObservable().pipe(share()),
        components,
        latestBlock$,
        storedBlockLogs$,
        waitForTransaction
    };
}
//# sourceMappingURL=setupNetwork.js.map