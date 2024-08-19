import { reset } from "viem/actions";
import { useMUD } from "./MUDContext";
import { useState } from "react";

// Styles 
const dugAlready = {
  backgroundColor: "white",
  color: "black",
  fontSize: "30px",
  width: "1.5em",
}

const digHere = {
  backgroundColor: "black",
  color: "white",
  fontSize: "30px",
  width: "1.5em",  
}

const digHereHover = {
  backgroundColor: "yellow",
  color: "black",
  fontSize: "30px",
  width: "1.5em",  
}

const controlButton = {
  fontSize: "30px",
  display: "inline-block",
  cursor: "pointer",  
}


function useHover(styleOnHover: CSSProperties, styleOnNotHover: CSSProperties = {})
{
    const [style, setStyle] = useState(styleOnNotHover);

    const onMouseEnter = () => setStyle(styleOnHover)
    const onMouseLeave = () => setStyle(styleOnNotHover)

    return {style, onMouseEnter, onMouseLeave}
}


const MapCell = attrs => {
  const hover = useHover(digHereHover, digHere)
  
  return (
    <button disabled={attrs.GameMap!==undefined || !attrs.active}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      style={attrs.GameMap===undefined ? hover.style : dugAlready}
      onClick={() => {
        attrs.dig(attrs.x, attrs.y)
      }}
    >
      {
        attrs.GameMap===undefined ? "?" : 
        attrs.GameMap===254 ? "💣" : 
        attrs.GameMap.toString()
      }
    </button>
  ) 
}

const Map = attrs => {
  return (
    <table>
      {attrs.lines.map((line, y) => (
        <tr key={`tr_${y}`}>
          {attrs.columns.map((column, x) => (
            <td key={`td_${x}_${y}`}>
              <MapCell
                active={attrs.active} 
                x={x} 
                y={y}
                GameMap={attrs.gameMap[`${x},${y}`]} 
                dig={attrs.dig} 
              />
            </td>
            )
          )}
        </tr>
        )
      )}
    </table>  
  )
}

const NewGame = (attrs) => {
  return (
    <>
      <h4>Click to start a new game</h4>
      <button
        style={controlButton}
        onClick={() => attrs.newGame()}
      >
        New Game
      </button>
    </>
  )
}

const EndGame = (attrs) => {
  return (
    <>
      {
        attrs.win ? 
        (<h4>You won!</h4>) 
        : (<h4>You lost</h4>)
      }
      <Map 
        lines={attrs.lines} 
        columns={attrs.columns} 
        gameMap={attrs.gameMap} 
        active={false}
      />
      <br />      
      <button
        style={controlButton}
        onClick={() => attrs.reset()}
      >
        Reset
      </button>
    </>
  )
}

export const App = () => {
  const {
    network: { tables, useStore, walletClient },
    systemCalls: { dig, reset, newGame },
  } = useMUD();

  const { width, height, numberOfBombs } = useStore(state => {
    const configuration = Object.values(state.getRecords(tables.Configuration))
    if (configuration.length > 0)
      return Object.values(state.getRecords(tables.Configuration))[0].value
    else // If we don't have the values yet
      return {}
  })

  const gameRecord = useStore(state => {
    const address = walletClient.account.address
    const records = Object.values(state.getRecords(tables.PlayerGame))
    const relevantRecord = records.filter(record => record.key.player == address)[0]
    return relevantRecord?.value
  })

  const gameMap = useStore(state => {
    const filteredMap = Object.values(state.getRecords(tables.Map))
      .filter(mapItem => mapItem.key.gameId == gameRecord?.gameId)
    const keyValueMap = filteredMap.reduce((result, item) =>
      {
        result[`${item.key.x},${item.key.y}`] = item.value.bombsAroundPlusOne-1
        return result
      }, 
      {})
    return keyValueMap;
  })

  const lines = new Array(height)
  lines.fill("", 0, height)
  
  const columns = new Array(width)
  columns.fill("", 0, width)

  const digsLeft = height*width - (numberOfBombs+gameRecord?.digNumber)

  return (
    <>
      <h2>Minesweeper Game</h2>
      Configuration: {width} x {height}, {numberOfBombs} <br />
      Digs left: {digsLeft} <br />
      { gameRecord && gameRecord?.gameId != 0 ? 
          gameRecord.win || gameRecord.lose ?
            ( <EndGame 
                reset={reset} 
                win={gameRecord.win} 
                lines={lines}
                columns={columns}
                gameMap={gameMap}
              /> ) 
              : ( <Map 
                    lines={lines} 
                    columns={columns} 
                    gameMap={gameMap} 
                    dig={dig}
                    active={true}
                  /> )
        : ( <NewGame newGame={newGame} /> )
      }

    </>
  )
};
