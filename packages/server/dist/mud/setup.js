import { setupNetwork } from "./setupNetwork.js";
export async function setup() {
    const network = await setupNetwork();
    //    const systemCalls = createSystemCalls(network, components);
    return {
        network,
        //      systemCalls,
    };
}
//# sourceMappingURL=setup.js.map