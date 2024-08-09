import { setupNetwork } from "./setupNetwork.js";

export type SetupResult = Awaited<ReturnType<typeof setup>>;

export async function setup() {
    const network = await setupNetwork();
//    const systemCalls = createSystemCalls(network, components);
  
    return {
      network,
//      systemCalls,
    };
  }