var GameState = {"PLAYING":1, "WIN":2, "LOST":3, "STOPPED": 4};
window.onload = function() {
	Game.start();
};

var Game = {
	board: null,
	view: null,
	state: GameState.STOPPED, 
	mines: 0,

	start: function(){
		if (!GameState.STOPPED)	return;
		document.getElementById("loser").style.display = "none";
		document.getElementById("winner").style.display = "none";

		this.prepareBoard();
		this.state = GameState.PLAYING;
	},

	restart : function () {
		if (this.mines <= 0) return;
		document.getElementById("loser").style.display = "none";
		document.getElementById("winner").style.display = "none";
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
