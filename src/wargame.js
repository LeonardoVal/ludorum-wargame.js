/** # Wargame
 *
 */
var Wargame = exports.Wargame = declare(ludorum.Game, {
	name: 'Wargame',
	players: ['Red', 'Blue'],
	rounds:10,

	/** ## Constructor and state handling ##########################################################

	The constructor takes the following parameters:
	*/
	constructor: function Wargame(params) {
		ludorum.Game.call(this, params.activePlayer || this.players[0]);
		initialize(this, params)
			/** + `armies`: An object of the form `{player: Army}`.
			*/
			.object('armies')
			/** + `terrain`: The terrain on which the game is being played.
			*/
			.object('terrain')
			/** + `round`: The current round number. A round is completed after all players have
			finished their turns.
			*/
			.integer('round', { coerce: true, defaultValue: -1 })
			/** + `rounds`: A limit of rounds for the game; 5 by default.
			*/
			.number('rounds', { coerce: true, ignore: true })
			/** + '__activeUnit__': The unit that is being played.
			*/
			.object('__activeUnit__', { ignore: true })
		;
		if (this.round < 0) {
			this.nextRound();
		} else {
			this.nextTurn();
		}
	},

	/** Advance the game to the next (or the first) turn.
	*/
	nextTurn: function nextTurn() {
		var activePlayer = this.activePlayer();
		if (!this.armies[activePlayer].isEnabled()) {
			var i = (this.players.indexOf(activePlayer) + 1) % this.players.length;
			this.activePlayers = [this.players[i]]; //FIXME Use Game.activatePlayer.
			if (!i) {
				this.nextRound();
			}
		}
		return this;
	},

	nextRound: function nextRound() {
		this.round++;
		var armies = this.armies;
		for (var p in armies) {
			armies[p].startRound();
		}
		return this;
	},

	// ## Game ending and scores ###################################################################

	/** An array with the minimum and maximum possible results.
	 */
	//resultBounds: [0,750], //TODO Calcular los topes reales.

	/**
	 * A medida que se destruye por completo a una unidad enemiga, el score incrementa segun el coste de dicha unidad eliminada.
	 * Diccionario con claves los jugadores y valor su score. Ejemplo {One: 0, Two: 0};
	 */
	scores: function scores() {
		return iterable(this.armies).mapApply(function (name, army) {
			return [name, army.worth()];
		}).toObject();
	},

	/**
	 * returns an object with the game's result if the game is final.
	 */
	result: function result() {
		var player1 = this.players[0],
			player2 = this.players[1];
		if (this.armies[player1].isEliminated(this) ||
				this.armies[player2].isEliminated(this) ||
				this.round >= this.rounds
			) {
			var scores = this.scores();
			return this.zerosumResult(scores[player1] - scores[player2], player1);
		}
		return null; // Game continues.
	},

	/** The definitions of the metagame have to be synchronized with the current game state before
	any calculation is performed.
	*/
	synchronizeMetagame: function synchronizeMetagame() {
		this.terrain.resetTerrain(this);
	},

	/** An `activeUnit` is a unit that can take actions in this game state.
	*/
	activeUnit: function activeUnit() {
		return this.__activeUnit__;
	},

	/** The `moves` method calculates the active player's actions for this game state.
	*/
	moves: function moves() {
		if (!this.result()) { // There are no moves for a finished game.
			this.synchronizeMetagame();
			var activePlayer = this.activePlayer();
			return obj(activePlayer, this.armies[activePlayer].actions(this));
		}
		return null;
	},

	/** Executes the given action on this game state. If the action has aleatories, a contingent
	game state is returned.
	*/
	next: function next(actions, haps, update){
		var activePlayer = this.activePlayer(),
			action = actions[activePlayer];
		raiseIf(!action, 'Active player ', activePlayer, ' has no actions!');
		var aleatories = action.aleatories(this);
		raiseIf(!aleatories && haps, 'Unexpected haps! ', haps);
		if (aleatories && !haps) {
			return new ludorum.Contingent(this, actions, aleatories, update);
		} else {
			var nextGame = update ? this : Sermat.clone(this);
			action.execute(nextGame, haps);
			return nextGame.nextTurn();
		}
	},

	// ## Serialization ############################################################################

	'static __SERMAT__': {
		serializer: function serialize_Wargame(obj) {
			var args = {
					armies: obj.armies,
					terrain: obj.terrain,
					round: obj.round,
					rounds: obj.rounds
				};
			if (obj.__activeUnit__) {
				args.__activeUnit__ = obj.__activeUnit__;
			}
			return [args];
		}
	}
}); // declare Wargame
