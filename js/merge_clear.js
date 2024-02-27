function Board (model, view) {
	this.model = model;
	this.view = view;

	// events
	this.hasMine = new Event(this);
	this.demined = new Event(this);

	// handlers
	this.model.cellOpened.attach(this.checkMine.bind(this));
	this.view.clicked.attach(this.viewClickHandler.bind(this));
	this.view.rightClicked.attach(this.viewRightClickHandler.bind(this));
}

Board.prototype.refresh = function (mines) {
	this.model.clear();
	this.model.setMines(mines);
	this.model.findNeighbors();
	this.view.render();
};

Board.prototype.viewClickHandler = function (sender, args) {
	if (Game.state == GameState.LOST) return;
	this.model.open(args.column, args.row);
};

Board.prototype.viewRightClickHandler = function (sender, args) {
	if (Game.state == GameState.LOST) return;
	this.model.switchFlag(args.column, args.row);
};

Board.prototype.checkMine = function (sender, args) {
	if (args.cell.hasMine) {
		Game.changeState(GameState.LOST);
		this.hasMine.notify();
	} else {
		let opened = this.model.getColumns()*this.model.getRows() - Game.mines;
		if (this.model.openedCount == opened)	{
			Game.changeState(GameState.WIN);
			this.demined.notify();
		}
	}
};

Board.prototype.openAllMines = function () {
	this.model.openAllMines();
};

function Cell () {
	this.hasMine = false;
	this.isOpen = false;
	this.hasFlag = false;
	this.neighbors = 0;
}

var BoardModel = (function() {
	var _width = 0;
	var _height = 0;
	var _cells = 0;

	function BoardModel (width, height) {
		_width = width;
		_height = height;
		this.openedCount = 0;
		this.cellOpened = new Event(this);
		this.flagSwitched = new Event(this);

		_cells = new Array(this.width);

		for (var i = 0; i<_width; i++) {
			_cells[i] = new Array(_height);
			for (var j = 0; j<_height; j++) {
				_cells[i][j] = new Cell();
			}
		}
	}

	BoardModel.prototype.getRows = function () {
		return _height;
	};

	BoardModel.prototype.getColumns= function () {
		return _width;
	};

	BoardModel.prototype.clear = function () {
		for (var i = 0; i<_width; i++) {
			for (var j = 0; j<_height; j++) {
				_cells[i][j].isOpen = false;
				_cells[i][j].hasMine = false;
				_cells[i][j].hasFlag = false;
				_cells[i][j].neighbors = 0;
			}
		}
		this.openedCount = 0;
	};

	BoardModel.prototype.setMines = function (bombs) {
		while (bombs > 0) {
			var i = Math.floor(Math.random() * _width);
			var j = Math.floor(Math.random() * _height);
			if (_cells[i][j].hasMine) continue;
			_cells[i][j].hasMine = true;
			bombs--;
		}
	};

	BoardModel.prototype.findNeighbors = function () {
		for (var i = 0; i<_width; i++) {
			for (var j = 0; j<_height; j++) {
				_cells[i][j].neighbors = this.getBombsAround(i, j);
			}
		}
	};

	BoardModel.prototype.getBombsAround = function (column, row) {
		var bombs = 0;
		for (var i = column-1;i<column+2;i++) {
			if (i<0 || i>=_cells.length) continue;
			for (var j = row-1;j<row+2;j++) {
				if (j<0 || j>=_cells[i].length || (i == column && j == row) ) continue;
				if (_cells[i][j].hasMine) bombs++;
			}
		}
		return bombs;
	};

	BoardModel.prototype.open = function (column, row) {
		//TODO: check bounds
		if (_cells[column][row].isOpen) return;
		if (_cells[column][row].hasFlag) return;

		_cells[column][row].isOpen = true;
		this.openedCount++;

		let result;

		if (_cells[column][row].hasMine) {
			result = -1;
		} else {
			result = _cells[column][row].neighbors;
			if (result == 0) {
				// open empty spots
				for (let i = column-1;i<column+2;i++) {
					if (i<0 || i>=_cells.length) continue;
					for (let j = row-1;j<row+2;j++) {
						if (j<0 || j>=_cells[i].length || (i == column && j == row) ) continue;
						this.open(i,j);
					}
				}
			}
		}

		this.cellOpened.notify({column: column, row: row, cell: _cells[column][row]});
	};

	BoardModel.prototype.switchFlag = function (column, row) {
		if (_cells[column][row].isOpen) return;

		_cells[column][row].hasFlag = !_cells[column][row].hasFlag;
		this.flagSwitched.notify({column: column, row: row, hasFlag: _cells[column][row].hasFlag});
	};

	BoardModel.prototype.openAllMines = function () {
		for (var i = 0; i<_width; i++) {
			for (var j = 0; j<_height; j++) {
				if (!_cells[i][j].hasMine || _cells[i][j].isOpen) continue;

				_cells[i][j].hasFlag = false;
				_cells[i][j].isOpen = false;
				this.cellOpened.notify({column: i, row: j, cell: _cells[i][j]});
			}
		}
		this.openedCount = 0;
	};

	return BoardModel;
})();
function BoardView (model, elementId) {
	this.model = model;
	this.element = document.getElementById(elementId);
	this.element.innerHTML = "";
	this.table = document.createElement("table");
	this.element.appendChild(this.table);

	// events
	this.clicked = new Event(this);
	this.rightClicked = new Event(this);

	// model handlers
	this.model.cellOpened.attach(this.updateCell.bind(this));
	this.model.flagSwitched.attach(this.flagHandler.bind(this));
}

BoardView.prototype.flagHandler = function (sender, args) {

	let x = args.column;
	let y = args.row;
	let elem = this.table.rows[y].cells[x];

	if (args.hasFlag) {
		elem.innerHTML = "<span class='flag'>&#x2691;</span>";
	} else {
		elem.innerHTML = "";
	}
};

BoardView.prototype.updateCell = function (sender, args) {
	let x = args.column;
	let y = args.row;
	let cell = args.cell;
	let elem = this.table.rows[y].cells[x];
	elem.className = "";

	if (cell.hasMine) {
		elem.innerHTML = "<span class='bomb'>&#x1f4a3;</span>";
	} else {
		if (cell.neighbors == 0) {
			elem.innerHTML = "<span class='number"+cell.neighbors+"'></span>";
		} else {
			elem.innerHTML = "<span class='number"+cell.neighbors+"'>"+cell.neighbors+"</span>";
		}
	}
};

BoardView.prototype.render = function () {
	this.table.innerHTML = "";
	let _this = this;

	// add click handlers to the cells in the table
	for (let i = 0; i<this.model.getRows(); i++) {
		let row = this.table.insertRow();
		for (let j = 0; j<this.model.getColumns(); j++) {
			let cell = row.insertCell();
			cell.className = 'closed';

			cell.onclick = function () {
				_this.clicked.notify({column:j,row:i});
			};

			cell.oncontextmenu = function () {
				_this.rightClicked.notify({column:j,row:i});
				return false;
			};
		}
	}
};
var Event = function (sender) {
	this._sender = sender;
	this._listeners = [];
}

Event.prototype = {

	attach: function (listener) {
		this._listeners.push(listener);
	},

	notify: function (args) {
		for (var i = 0; i < this._listeners.length; i++) {
			this._listeners[i](this._sender, args);
		}
	}

};
var GameState = {"PLAYING":1, "WIN":2, "LOST":3, "STOPPED": 4};
window.onload = function() {
	Game.start();
	document.getElementById("bombCount").innerHTML = Game.mines;

}

document.oncontextmenu = function(){
 // your code
	document.getElementById("flagCount").innerHTML = (document.getElementsByClassName("flag").length - 1).toString();
}

var Game = {
	board: null,
	view: null,
	state: GameState.STOPPED,
	mines: 0,

	start: function(){
		if (!GameState.STOPPED)	return;
		document.getElementById("loser").style.display = "none";
		document.getElementById("winner").style.display = "none";
		document.getElementById("info").style.display = "block";
		document.getElementById("flagCount").innerHTML = "0";

		this.prepareBoard();
		this.state = GameState.PLAYING;
	},

	restart : function () {
		if (this.mines <= 0) return;
		document.getElementById("loser").style.display = "none";
		document.getElementById("winner").style.display = "none";
		document.getElementById("info").style.display = "block";
		document.getElementById("flagCount").innerHTML = "0";

		this.state = GameState.PLAYING;
		this.board.refresh(this.mines);
	},

	prepareBoard: function() {
		let level = "intermediate"
		let size = 0;


		switch (level) {

			case 'debug':
				size = 8;
				this.mines = 2;
				break;
			case 'beginner':
				size = 8;
				this.mines = 10;
				break;

			case 'intermediate':
				size = 16;
				this.mines = 40;
				break;

			case 'expert':
				size = 25;
				this.mines = 99;
				break;

			default:
				// TODO: wrong level
				break;
		}

		let model, view;

		model = new BoardModel(size,size);
		view = new BoardView(model, "board");

		this.board = new Board(model, view);
		this.board.refresh(this.mines);
	},

	changeState: function(state) {
		if(this.state == state) return;
		this.state = state;
		switch(state) {
			case GameState.WIN:
				document.getElementById("winner-coord").innerHTML = "N45 00.000, E007 00.000";
				document.getElementById("info").style.display = "none";
				document.getElementById("winner").style.display = "block";
				break;
			case GameState.LOST:
				document.getElementById("info").style.display = "none";
				document.getElementById("loser").style.display = "block";
				this.board.openAllMines();
				break;
		}
	},
};
