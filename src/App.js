import React, { Component } from 'react';
import './App.css';

import Cell from "./components/Cell.js";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSmile, faDizzy, faBars, faTimes, faBomb } from '@fortawesome/free-solid-svg-icons'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cellContents: [],
      cellsRevealed: [],
      cellsFlaged: [],
      bombCount: 30,
      contentGenerated: false,
      gameOver: false,
      menuOpen: false,
      colsNum: 10,
      rowsNum: 18,
    };

    this.gridRef = React.createRef();
  }

  setAsyncState = (newState) => {
    return new Promise((resolve) => this.setState(newState, () => resolve()));
  }

  componentDidMount() {
    let cellCount = this.state.rowsNum * this.state.colsNum;

    this.gridRef.current.style.setProperty("--larger-dimension", this.state.rowsNum);
    this.gridRef.current.style.setProperty("--smaller-dimension", this.state.colsNum);

    this.setState({
      cellContents: Array(cellCount).fill(""),
      cellsRevealed: Array(cellCount).fill(false),
      cellsFlaged: Array(cellCount).fill(false),
    });
  }

  getNeighboringCells(cellIndex) {
    var neighbors = [];
    
    let cellCount = this.state.rowsNum * this.state.colsNum;
    let rowAboveCell = cellIndex - this.state.colsNum;
    let rowBellowCell = cellIndex + this.state.colsNum;

    if (rowAboveCell > 0) {
      neighbors.push(rowAboveCell);

      if ((cellIndex + 1) % this.state.colsNum !== 1)
        neighbors.push(rowAboveCell - 1)

      if ((cellIndex + 1) % this.state.colsNum !== 0)
        neighbors.push(rowAboveCell + 1);
    }

    if ((cellIndex + 1) % this.state.colsNum !== 1)
      neighbors.push(cellIndex - 1);
    if ((cellIndex + 1) % this.state.colsNum !== 0)
      neighbors.push(cellIndex + 1);

    if (rowBellowCell < cellCount) {
      neighbors.push(rowBellowCell);

      if ((cellIndex + 1) % this.state.colsNum !== 1)
        neighbors.push(rowBellowCell - 1);
      
      if ((cellIndex + 1) % this.state.colsNum !== 0)
        neighbors.push(rowBellowCell + 1);
    }

    return neighbors;
  }

  renderGrid() {
    var cells = [];

    for(var cellIndex = 0; cellIndex < (this.state.colsNum * this.state.rowsNum); cellIndex++) {
      cells.push(
        <Cell 
          cellClick={this.cellClick.bind(this)} 
          cellFlag={this.cellFlag.bind(this)}
          content={this.state.cellContents[cellIndex]} 
          revealed={this.state.cellsRevealed[cellIndex]} 
          flaged={this.state.cellsFlaged[cellIndex]}
          cellIndex={cellIndex} 
          key={cellIndex} 
        />);
    }

    return cells;
  }

  generateCellContents(protectedCellIndex=null) {
    let cellCount = this.state.rowsNum * this.state.colsNum;
    var bombsPlaced = 0;
    var newCellContents = Array(cellCount).fill("");
    var neighboringCells = [];

    while(bombsPlaced < this.state.bombCount) {
      let bombCellIndex = Math.floor(Math.random() * cellCount);

      if (newCellContents[bombCellIndex] !== "b") {
        if (protectedCellIndex === null) {
          newCellContents[bombCellIndex] = "b";
          bombsPlaced++;
        }
        else {
          if (bombCellIndex === protectedCellIndex)
            continue;

          neighboringCells = this.getNeighboringCells(protectedCellIndex);
          var bombInProtectedArea = false;

          neighboringCells.forEach((neighborIndex) => {
            if (neighborIndex === bombCellIndex) {
              bombInProtectedArea = true;
            }
          });

          if (bombInProtectedArea) {
            continue;
          }

          newCellContents[bombCellIndex] = "b";
          bombsPlaced++;
        }
      }
    }

    for(var cellIndex = 0; cellIndex < cellCount; cellIndex++) {
      if (newCellContents[cellIndex] === "b")
        continue;

      var bombsAroundCell = 0;
      neighboringCells = this.getNeighboringCells(cellIndex);

      neighboringCells.forEach((neighborIndex) => {
        if (newCellContents[neighborIndex] === "b") {
          bombsAroundCell++;
        }
      });

      if (bombsAroundCell > 0) {
        newCellContents[cellIndex] = bombsAroundCell.toString();
      }
    }

    return this.setAsyncState({
      cellContents: newCellContents,
    });
  }

  cellFlag(cellIndex) {
    if (!this.state.cellsRevealed[cellIndex]) {
      var newCellsFlaged = this.state.cellsFlaged;
      newCellsFlaged[cellIndex] = !newCellsFlaged[cellIndex];
  
      this.setState({
        cellsFlaged: newCellsFlaged,  
      });
    }
  }

  cellClick = async (cellIndex) => {
    if (!this.state.contentGenerated) {
      await this.generateCellContents(cellIndex);

      this.setState({
        contentGenerated: true,  
      });
    }

    if (this.state.cellsRevealed[cellIndex] === false && this.state.cellsFlaged[cellIndex] === false) {
      var newCellsRevealed = this.state.cellsRevealed;
      newCellsRevealed[cellIndex] = true;
      await this.setAsyncState({
        cellsRevealed: newCellsRevealed,
      });

      this.checkCell(cellIndex);
    }
    else if (this.state.cellsRevealed[cellIndex] === true && this.state.cellContents[cellIndex] !== "") {
      var neighbors = this.getNeighboringCells(cellIndex);
      var unflagedNeighbors = [...neighbors];
      var flagCount = 0;
      
      
      neighbors.forEach((neighborIndex) => {
        if (this.state.cellsFlaged[neighborIndex]) {
          flagCount++;
        }

        if (this.state.cellsFlaged[neighborIndex] || this.state.cellsRevealed[neighborIndex]) {
          for( var ii = 0; ii < unflagedNeighbors.length; ii++){ 
            if ( unflagedNeighbors[ii] === neighborIndex) {
              unflagedNeighbors.splice(ii, 1); 
            }
          }
        }
      });

      if (flagCount === parseInt(this.state.cellContents[cellIndex])) {
        unflagedNeighbors.forEach((neighborIndex) => {
          this.cellClick(neighborIndex);
        });
      }
    }
  }

  checkCell = async (cellIndex) => {
    if (this.state.cellContents[cellIndex] === "b") {
      this.gameOver();
    }
    else if (this.state.cellContents[cellIndex] === "") {
      var neighboringCells = this.getNeighboringCells(cellIndex)

      neighboringCells.forEach((neighborIndex) => {
        if (this.state.cellContents[neighborIndex] !== "b") {
          this.cellClick(neighborIndex);
        }
      });
    }
  }

  gameOver() {
    let cellCount = this.state.rowsNum * this.state.colsNum;

    this.setState({
      cellsRevealed: Array(cellCount).fill(true),
      gameOver: true,
    });
  }
  
  resetGame() {
    let cellCount = this.state.rowsNum * this.state.colsNum;

    this.setState({
      cellContents: Array(cellCount).fill(""),
      cellsRevealed: Array(cellCount).fill(false),
      cellsFlaged: Array(cellCount).fill(false),
      contentGenerated: false,
      gameOver: false,
    });
  }

  openMenu() {
    this.setState({
      menuOpen: true,
    });
  }

  closeMenu() {
    this.setState({
      menuOpen: false,
    });
  }

  setDifficulty = async (bombCount) => {
    await this.setAsyncState({
      bombCount: bombCount,
      menuOpen: false,
    });

    this.resetGame();
  }


  render() {
    return (
      <div className="App">
        {
          this.state.menuOpen ?
            <div className="menu">
              <header className="header header--flex-start">
                <div className="button" onClick={this.closeMenu.bind(this)}>                
                  <FontAwesomeIcon icon={faTimes} />
                </div>
              </header>
              <div className="menu__body">
                <h2>
                  Set difficulty
                </h2>
                <div className="menu__option__group">
                  <div className="menu__option" onClick={() => { this.setDifficulty.bind(this)(10) }}>
                    <span>Easy</span><span>10 <FontAwesomeIcon icon={faBomb} /></span>
                  </div>
                  <div className="menu__option" onClick={() => { this.setDifficulty.bind(this)(15) }}>
                    <span>Medium</span><span>15 <FontAwesomeIcon icon={faBomb} /></span>
                  </div>
                  <div className="menu__option" onClick={() => { this.setDifficulty.bind(this)(30) }}>
                    <span>Hard</span><span>30 <FontAwesomeIcon icon={faBomb} /></span>
                  </div>
                  <div className="menu__option" onClick={() => { this.setDifficulty.bind(this)(45) }}>
                    <span>Insane</span><span>45 <FontAwesomeIcon icon={faBomb} /></span>
                  </div>
                </div>
              </div>
            </div>
          :
            null
        }

        <header className="header">
          <div className="button" onClick={this.openMenu.bind(this)}>
            <FontAwesomeIcon icon={faBars} />
          </div>
          <div className="button button--expanded" onClick={this.resetGame.bind(this)}>
            {
              this.state.gameOver ? 
                <FontAwesomeIcon icon={faDizzy} />
              :
                <FontAwesomeIcon icon={faSmile} />
            }
          </div>
          <div className="button button--invisible">
            <FontAwesomeIcon icon={faBars} />
          </div>
        </header>
        <div className="grid-wrapper">
          <main className="grid" ref={this.gridRef}>
            { this.renderGrid.bind(this)() }
          </main>
        </div>
      </div>
    );
  }
}

export default App;
