import { initialize as zokratesInitialize } from "zokrates-js";

export const zkFunctions = async (width: number, height: number) : Promise<any> => {

    const zokrates = await zokratesInitialize()

    const hashFragment = `
        import "utils/pack/bool/pack128.zok" as pack128;
        import "hashes/poseidon/poseidon.zok" as poseidon;
        
        def hashMap(bool[${width+2}][${height+2}] map) -> field {
            bool[512] mut map1d = [false; 512];
            u32 mut counter = 0;

            for u32 x in 0..${width+2} {
              for u32 y in 0..${height+2} {
                  map1d[counter] = map[x][y];
                  counter = counter+1;
              }
            }

            field[4] hashMe = [
                pack128(map1d[0..128]),
                pack128(map1d[128..256]),
                pack128(map1d[256..384]),
                pack128(map1d[384..512])
            ];

            return poseidon(hashMe);
        }
    `

    const hashProgram = `
        ${hashFragment}

        def main(bool[${width+2}][${height+2}] map) -> field {
            return hashMap(map);
        }
    `

    const digProgram = `
        ${hashFragment}

        // The number of mines in location (x,y)
        def map2mineCount(bool[${width+2}][${height+2}] map, u32 x, u32 y) -> u8 {
            return if map[x+1][y+1] { 1 } else { 0 };
        }

        def main(private bool[${width+2}][${height+2}] map, u32 x, u32 y) -> (field, u8) {
            return (hashMap(map) ,
                if map2mineCount(map, x, y) > 0 { 0xFF } else {
                    map2mineCount(map, x-1, y-1) + map2mineCount(map, x, y-1) + map2mineCount(map, x+1, y-1) +
                    map2mineCount(map, x-1, y) + map2mineCount(map, x+1, y) +
                    map2mineCount(map, x-1, y+1) + map2mineCount(map, x, y+1) + map2mineCount(map, x+1, y+1)                                
                } 
            );
        }
    `

    const digCompiled = zokrates.compile(digProgram)
    const hashCompiled = zokrates.compile(hashProgram)

    // Create the keys for zero knowledge verification.
    // Doing this here is simple, but it might be insecure.
    // On a production system you'd want to use a setup ceremony. 
    // (https://zokrates.github.io/toolbox/trusted_setup.html#initializing-a-phase-2-ceremony).
    const keySetupResults = zokrates.setup(digCompiled.program, "")
    const verifierKey = keySetupResults.vk
    const proverKey = keySetupResults.pk

    const calculateMapHash = function(hashMe: boolean[][]): string {
        return "0x" + 
            BigInt(zokrates.computeWitness(hashCompiled, [hashMe]).output.slice(1,-1))
            .toString(16).padStart(64, "0")        
    }

    // Dig and return a zero knowledge proof of the result
    // (server-side code)
    const zkDig = function(map: boolean[][], x: number, y: number) : any {
        if (x<0 || x>=width || y<0 || y>=height)
            throw new Error("Trying to dig outside the map")

        const runResults = zokrates.computeWitness(digCompiled, 
            [map, `${x}`, `${y}`]
        )

        const proof = zokrates.generateProof(
            digCompiled.program,
            runResults.witness,
            proverKey)

        return proof
    }

    // Verify a dig's results (client-side code)
    const verifyDig = function(hashOfMap: string, digResultProof: any) : any {
        const hashInProof = "0x" + digResultProof.inputs.slice(2,-1)
            .map((x: string) => x.slice(-8)).reduce((a: string, b: string) => a+b)
        
        // The proof used the wrong map
        if (hashInProof != hashOfMap)
            return false

        if (!zokrates.verify(verifierKey, digResultProof))
            return false

        return {
            x: parseInt(digResultProof.inputs[0]),
            y: parseInt(digResultProof.inputs[1]),
            bombs: parseInt(digResultProof.inputs[digResultProof.inputs.length-1])
        }
    }

    const solidityVerifier = zokrates.exportSolidityVerifier(verifierKey)    
    const formatProof = (proof: any) => zokrates.utils.formatProof(proof)

    return {
        zkDig,
        verifyDig,
        calculateMapHash,
        solidityVerifier,
        formatProof
    }
}
