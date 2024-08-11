import { setup } from "./mud/setup.js"
import { zkFunctions } from "./zero-knowledge.js"

const mudSetup = await setup()

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

type Game = {
    map: boolean[][]
    mapWithBorders: boolean[][]
    hash: string
}

let gamesInProgress: Record<string, Game> = {}

// We can't do anything until we have the configuration
mudSetup.network.components.Configuration.update$.subscribe(async update => {

    const height = update.value[0]?.height
    const width = update.value[0]?.width    
    const mineNumber = update.value[0]?.numberOfBombs

    // If any variable isn't defined, we don't have the configuration yet
    if (width === undefined || height == undefined || mineNumber === undefined)
        return ;

    console.log("Configuration retrieved")

    const {calculateMapHash, zkDig, verifyDig, solidityVerifier, formatProof} = 
        await zkFunctions(width, height)

    console.log("Zero-knowledge created")        

    assert((width+2)*(height+2) < 512, "map can't exceed 512 bits after adding borders")
    assert(width*height > mineNumber, "can't have more mines than the map size")  

    const newGame = function() : string {
        const newGame: Game = createGame()
        gamesInProgress[newGame.hash.toString()] = newGame
        return newGame.hash.toString()
    }

    const createGame = function() : Game
    {
        let map: boolean[][]
    
        map = new Array(width)
        for(let x=0; x<width; x++) {
            map[x] = new Array(height)
            for(let y=0; y<height; y++)
                map[x][y] = false
        }
    
        for (var i=0; i<mineNumber; i++) {
            let x: number = Math.floor(Math.random()*width)
            let y: number = Math.floor(Math.random()*height)
            while (map[x][y]) {
                x = Math.floor(Math.random()*width)
                y = Math.floor(Math.random()*height)
            }
            map[x][y] = true
        }
    
        const mapWithBorders : boolean[][] = makeMapBorders(map);
    
        return {
            map,
            mapWithBorders,
            hash: calculateMapHash(mapWithBorders)
        }
    }


    // Because of the way Zokrates works, we need to give the map empty borders
    const makeMapBorders = function(map: boolean[][]) : boolean[][] {
        let mapWithBorders = new Array(width+2)
        for(let x=0; x<width+2; x++) {
            mapWithBorders[x] = new Array(height+2)
        }

        for(let x=0; x<width; x++) {
            mapWithBorders[x+1][0] = false
            mapWithBorders[x+1][height+1] = false        
            for(let y=0; y<height; y++)
                mapWithBorders[x+1][y+1] = map[x][y]
        }
        for(let y=0; y<=height+1; y++) {
            mapWithBorders[0][y] = false
            mapWithBorders[width+1][y] = false
        }

        return mapWithBorders
    }
    
    // Handle requests for new games
    mudSetup.network.components.PendingGame.update$.subscribe(async (update) => {

        // Only create a new game if wanted
        if (!Object.values(update.value)[0]?.wantsGame)
            return

        const gameHash = newGame()
        const newGameAddress = '0x' + update.entity.slice(-40)

        console.log(`New game ${gameHash} for ${newGameAddress}`)

        const tx = await mudSetup.network.worldContract.write.app__newGameResponse(
            [newGameAddress, gameHash])

        await mudSetup.network.waitForTransaction(tx);        
    })

    mudSetup.network.components.PendingDig.update$.subscribe(async (update) => {
        
        // Only dig if requested
        if (!Object.values(update.value)[0]?.wantsDig)
            return

        console.log(`Dig in game ${update?.entity} ` + 
            `at (${Object.values(update.value)[0]?.x},${Object.values(update.value)[0]?.y})`)

        if (!gamesInProgress[update?.entity]) {
            console.log("ERROR: Trying a non-existent game")
            console.log(`\tGame identity: ${update?.entity}`)
            console.log(`\tGames in progress: ${Object.keys(gamesInProgress)}`)

            return
        }

        const digResult = zkDig(gamesInProgress[update?.entity].mapWithBorders, 
            Object.values(update.value)[0]?.x, Object.values(update.value)[0]?.y)

//        const formattedResult = formatProof(digResult)[0]
//        console.log(formattedResult)

        const tx = await mudSetup.network.worldContract.write.app__digResponse(
          [update?.entity, digResult.inputs[0], digResult.inputs[1], 
            digResult.inputs[digResult.inputs.length-1]]
        );
        await mudSetup.network.waitForTransaction(tx);        
    })   

})



