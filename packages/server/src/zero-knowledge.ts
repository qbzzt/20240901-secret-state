import { initialize as zokratesInitialize } from "zokrates-js";

export const zkFunctions = async (width: number, height: number) : Promise<any> => {

    const zokrates = await zokratesInitialize()

    const hashFragment = `
        from "hashes/pedersen/512bitBool.zok" import main as pederhash;
        import "utils/casts/bool_256_to_u32_8.zok" as bool_256_to_u32_8;
        
        def hashMap(bool[${width+2}][${height+2}] map) -> u32[8] {
            bool[512] mut map1d = [false; 512];
            u32 mut counter = 0;

            for u32 x in 0..${width+2} {
              for u32 y in 0..${height+2} {
                  map1d[counter] = map[x][y];
                  counter = counter+1;
              }
            }

            return bool_256_to_u32_8(pederhash(map1d));
        }
    `

    const hashProgram = `
        ${hashFragment}

        def main(bool[${width+2}][${height+2}] map) -> u32[8] {
            return hashMap(map);
        }
    `

    const digProgram = `
        ${hashFragment}

        // The number of mines in location (x,y)
        def map2mineCount(bool[${width+2}][${height+2}] map, u32 x, u32 y) -> u8 {
            return if map[x+1][y+1] { 1 } else { 0 };
        }

        def main(private bool[${width+2}][${height+2}] map, u32 x, u32 y) -> (u32[8], u8) {
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

    const joinHashArray = function(arr: string[]): string {
        return "0x"+arr.map(x => x.slice(2)).reduce((a,b) => a+b)
    }

    const calculateMapHash = function(hashMe: boolean[][]): string {
        return joinHashArray(JSON.parse(
            zokrates.computeWitness(hashCompiled, [hashMe]).output)
        )
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
