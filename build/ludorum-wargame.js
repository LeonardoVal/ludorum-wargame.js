(function (init) { "use strict";
			if (typeof define === 'function' && define.amd) {
				define(["creatartis-base","sermat","ludorum"], init); // AMD module.
			} else if (typeof exports === 'object' && module.exports) {
				module.exports = init(require("creatartis-base"),require("sermat"),require("ludorum")); // CommonJS module.
			} else {
				this["ludorum-wargame"] = init(this.base,this.Sermat,this.ludorum); // Browser.
			}
		}).call(this,/** Module wrapper and layout.
*/
function __init__(base, Sermat, ludorum) { "use strict";
/** Import synonyms */
	var declare = base.declare,
		iterable = base.iterable,
		Iterable = base.Iterable,
		initialize = base.initialize,
		raiseIf = base.raiseIf,
		obj = base.obj;

/** Library layout. */
	var exports = {
			__package__: 'ludorum-wargame',
			__name__: 'ludorum_wargame',
			__init__: __init__,
			__dependencies__: [base, Sermat, ludorum],
			__SERMAT__: { include: [base] }
		};

/** See `__epilogue__.js`.
*/


/** # Armies

*/

/** ## Army ########################################################################################

El parámetro name refiere a un ejemplo de army, con su tipo y su lista de unidades
 */
var Army = exports.Army = declare({
	constructor: function Army(args) {
		var army = this;
		initialize(this, args)
			.string('player', { ignore: true })
			.number('score', { coerce: true, defaultValue: 0 })
			.array('units');
		if (this.units) {
			this.units.forEach(function (unit, i) {
				unit.id = army.player +'#'+ i;
				unit.army = army;
			});
		}
	},

	/** The army is enabled if it has at least one enabled unit.
	*/
	isEnabled: function isEnabled() {
		for (var i = 0, len = this.units.length; i < len; i++) {
			if (this.units[i].isEnabled) {
				return true;
			}
		}
		return false;
	},

	/** `startRound` enables all living units of the army.
	*/
	startRound: function startRound() {
		return this.units.filter(function (unit) {
			return unit.startRound();
		}).length;
	},

	/** Calculates the available `actions` for this army in the given game state.
	*/
	actions: function actions(game) {
		var activeUnit = game.activeUnit();
		if (activeUnit) {
			return activeUnit.getActions(game);
		} else {
			return this.units.filter(function (unit) {
				return unit.isEnabled;
			}).map(function (unit) {
				return new ActivateAction(unit.id);
			});
		}
	},

	/** An army is eliminated if all its units are eliminated.
	 */
	isEliminated: function isEliminated(game) {
		return this.units.filter(function (unit) {
			return !unit.isDead();
		}).length <= 0;
	},

	/** Returns the list of models that have not been destroyed.
	 */
	livingUnits: function livingUnits(){
		return this.units.filter(function (unit) {
			return !unit.isDead();
		});
	},

	worth: function worth() {
		return iterable(this.units).map(function (unit) {
			return unit.worth();
		}).sum();
	},

	// ### Serialization ###########################################################################

	'static __SERMAT__': {
		serializer: function serialize_Army(obj) {
			return [{ player: obj.player, units: obj.units, score: obj.score }];
		}
	}
}); // declare Army

/** ## Unit ########################################################################################

Unit tiene variables que pueden cambiar a lo largo del juego type refiere a las caracteristicas no
variables de la unidad models es una lista de modelos, salvo que haya un heroe seran todos del mismo
tipo hero es un modelo con type diferente, incluido en la lista models (puede tener equipments y
specials diferentes) position es del tipo [x,y] pinned refiere a si esta aturdida (stunneada) la
unidad
 */
var Unit = exports.Unit = declare({
	// Unit properties' defaults.
	radius: 0.5,
	quality: 3,
	defense: 4,

	constructor: function Unit(props) {
		initialize(this, props)
			.array('position')
			.array('models')
			.bool('isActive', { ignore: true })
			.bool('hasMoved', { ignore: true })
			.bool('isEnabled', { ignore: true })
		;
	//	this.position = new Float32Array(this.position);
	},

	cost: function cost() {
		return iterable(this.models).map(function (m) {
			return m.cost || 0;
		}).sum();
	},

	size: function size() {
		return this.models.length;
	},

	/** Returns the list of models that have not been destroyed.
	 */
	livingModels: function livingModels(){
		return this.models.filter(function (model) {
			return model.health() > 0;
		});
	},

	/** A unit's `health` is the amount of living models it has.
	*/
	health: function health() {
		return this.livingModels().length;
	},

	isDead: function isDead() {
		return this.health() <= 0;
	},

	worth: function worth() {
		return iterable(this.models).map(function (model) {
			return model.health() / model.toughness * model.cost;
		}).sum();
	},

	// ## Unit's actions ###########################################################################

	/** Calculates the unit actions.
	*/
	getActions: function getActions(game) {
		var actions = [new EndTurnAction(this.id)];
		if (this.isActive) {
			if (!this.hasMoved) {
				actions = actions.concat(this.getMoveActions(game));
			}
			actions = actions.concat(this.getShootActions(game));
		}
		return actions;
	},

	maxRange: function maxRange() {
		var r = -Infinity;
		this.livingModels().forEach(function (model) {
			model.equipments.forEach(function (equipment) {
				if (+equipment.range > r) {
					r = +equipment.range;
				}
			});
		});
		return r;
	},

	/**
	*/
	getShootActions: function getShootActions(game) {
		var enemyUnits = game.armies[game.opponent()].units,
			shooter = this,
			ret=enemyUnits.filter(function (target) {
			return game.terrain.canShoot(shooter, target)!=Infinity;
		}).map(function (target) {
			return new ShootAction(shooter.id, target.id);
		});
		return ret;
	},

	/**
	*/
	getAssaultActions: function getAssaultActions(game) {
		var enemyUnits = game.armies[game.opponent()].units,
			assaulter = this,
			ret=enemyUnits.filter(function (target) {
			return game.terrain.canShoot(assaulter, target)!=Infinity;
		}).map(function (target) {
			return new AssaultAction(assaulter.id, target.id);
		});
		return ret;
	},

	/**
	*/
	getMoveActions: function getMoveActions(game) {
		var unit = this;
		return iterable(game.terrain.reachablePositions(unit)).mapApply(function (k, v) {
			var pos = k.split(',');
			return new MoveAction(unit.id, [+pos[0], +pos[1]], v > 6);
		}).toArray();
	},

	/*FIXME
	getShootMoveActions: function getShootMoveActions (game,enemyUnit) {
		var moveShootActions = [],
			positionAux,
			objPositions = game.terrain.exploreQueryPaths(this,game.activePlayer(),6);
		for (var xKey in objPositions) {
			var xposition=[Number(xKey.split(",")[0]),Number(xKey.split(",")[1])];
			raiseIf(objPositions[xKey]>6, "Unit ", this.id, " isnt shootEnabled!");
			positionAux= this.position;
			this.position= function (game){return xposition;};
			if (game.terrain.canShoot(game, this, enemyUnit, 6) ){
				moveShootActions.push([	new MoveAction(this.id,xposition,objPositions[xKey]>6),
									   	new ShootAction(this.id, target.id)
									  ]);
			}
			this.position= positionAux;
		}
		return moveShootActions;
	},*/

	/**
	canGo: function (game, position){
		return this.health() <= 0 ? null : game.terrain.canGo(this.position(game), position);
	},
	* /
	/*
		canShoot: function canShoot(game,enemyUnit) {
			var canShoot = false;
			var unit = this;
			if (!unit.isDead() && unit.isEnabled && !enemyUnit.isDead()){
				var distance = game.terrain.canSee(unit, enemyUnit);
				var livingModels = unit.livingModels();
				livingModels.forEach(function (model) {
					model.equipments.forEach(function (eq) {
						if (eq.range >= distance) {
							canShoot = true;
						}
					});
				});
			}
			return canShoot;
		},

		canAssault: function canAssault(game,enemyUnit) {
			if (!this.isDead() && this.isEnabled && !enemyUnit.isDead()){
				if (game.terrain.canSee(this, enemyUnit) <= 12){
					return true;
				}
			}
			return false;
		},
	*/

	// ### Unit action executions ##################################################################

	/** At the beginning of its turn, every unit in the army becomes enabled, not activated and not
	moved.
	 */
	startRound: function startRound() {
		this.isActive = false;
		this.hasMoved = false;
		this.isEnabled = this.health() > 0;
		return this.isEnabled;
	},

	/** Changes the given `game` state, marking this unit as `ACTIVATED`.
	 */
	activate: function activate(game) {
		raiseIf(!this.isEnabled, "Unit ", this.id, " is not enabled!");
		raiseIf(this.isActive, "Unit ", this.id, " is already active!");
		raiseIf(this.health() <= 0, "Unit ", this.id, " has been eliminated!");

		this.isActive = true;
		game.__activeUnit__ = this;
	},

	endTurn: function endTurn(game) {
		this.isActive = false;
		this.isEnabled = false;
		if (game.__activeUnit__ === this) {
			game.__activeUnit__ = null;
		}
	},

	/**
	 */
	move: function move(game, newPosition, endTurn) {
		raiseIf(!this.isActive, "Unit ", this.id, " is not active!");
		this.position = newPosition;
		this.hasMoved = true;
		if (endTurn) {
			this.endTurn(game);
		}
	},

	/**
	 */
	suffer: function suffer(game, woundCount) {
		var models = this.models,
			model, modelHealth, i;
		for (i = 0; woundCount > 0 && i < models.length; i++) {
			model = models[i];
			modelHealth = model.health();
			if (modelHealth > 0) {
				model.wounds += Math.min(woundCount, modelHealth);
				woundCount -= modelHealth;
				if (woundCount <= 0) {
					break;
				}
			}
		}
		this.isEnabled = this.isEnabled && !this.isDead();
		return this.isEnabled;
	},

	// ### Influence mapping #######################################################################

	influence: function influence(game) {
		//TODO Rodrigo Gómez
	},

	// ### Serialization ###########################################################################

	'static __SERMAT__': {
		serializer: function serialize_Unit(obj) {
			var args = {
				position: [obj.position[0], obj.position[1]],
				models: obj.models
			};
			['isActive', 'hasMoved', 'isEnabled'].forEach(function (k) {
				if (obj.hasOwnProperty(k)) {
					args[k] = obj[k];
				}
			});
			return [args];
		}
	}
}); // declare Unit

/** ## Model #######################################################################################

Generalmente un modelo con 1 en wounds significa que está eliminado type contendrá las
características fijas del modelo
 */
var Model = exports.Model = declare({
	/** The `toughness` of a model is the number of wounds it can suffer before dying.
	 */
	toughness: 1,
	equipments: [],

	constructor: function Model(wounds) {
		this.wounds = wounds |0;
	},

	health: function health() {
		return this.toughness - this.wounds;
	},

	/** Returns all of the model's equipment that can shoot at the given range (1 by default).
	 */
	shooting: function shooting(range) {
		range = range || 1;
		return equipments.filter(function (eq) {
			return eq.range >= range;
		});
	},

	/** Returns all of the model's equipment that can be used in close combat.
	 */
	melee: function melee() {
		return equipments.filter(function (eq) {
			return eq.range < 1;
		});
	},

	// ### Serialization ###########################################################################

	'static __SERMAT__': {
		serializer: function serialize_Model(obj) {
			return [obj.wounds];
		}
	}
}); // declare Model


/** ## GameAction ##################################################################################

`GameAction` is the base class of all game actions. The game component delegates action execution on
these classes.
*/
var GameAction = exports.GameAction = declare({
	/** Game actions have no random variables by default.
	*/
	aleatories: function aleatories(game) {
		return null;
	},

	execute: base.objects.unimplemented('GameAction', 'execute(game, haps)'),

	unitById: function unitById(game, id) {
		id = id || this.unitId;
		var unit = null;
		for (var i = 0; !unit && i < game.players.length; i++) {
			var units = game.armies[game.players[i]].units;
			for (var j = 0; j < units.length; j++) {
				if (units[j].id == id) {
					unit = units[j];
					break;
				}
			}
		}
		raiseIf(!unit, 'Unit ', id, ' was not found!');
		return unit;
	},

	/** The action's `worth` is the value that the action takes after being executed. Zero by default.
	*/
	worth: function worth() {
		return 0;
	}
}); // declare GameAction

/** ## ActivateAction ##############################################################################
*/
var ActivateAction = exports.ActivateAction = declare(GameAction, {
	constructor: function ActivateAction(unitId) {
		this.unitId = unitId;
	},

	execute: function execute(game) {
		this.unitById(game).activate(game);
	},

	'static __SERMAT__': {
		identifier: 'ActivateAction',
		serializer: function serialize_ActivateAction(obj) {
			return [obj.unitId];
		}
	}
}); // declare ActivateAction

/** ## EndTurn #####################################################################################
*/
var EndTurnAction = exports.EndTurnAction = declare(GameAction, {
	constructor: function EndTurnAction(unitId) {
		this.unitId = unitId;
	},

	execute: function execute(game) {
		this.unitById(game).endTurn(game);
	},

	'static __SERMAT__': {
		identifier: 'EndTurnAction',
		serializer: function serialize_ActivateAction(obj) {
			return [obj.unitId];
		}
	}
}); // declare EndTurnAction

/** ## MoveAction ##################################################################################
*/
var MoveAction = exports.MoveAction = declare(GameAction, {
	constructor: function MoveAction(unitId, position, run) {
		this.unitId = unitId;
		this.position = position;
		this.run = run;
	},

	/** The execution of a `Move` actions changes the unit's position.
	*/
	execute: function execute(game) {
		//TODO Check the unit can really move to the position.
		this.unitById(game).move(game, this.position, this.run);
	},

	'static __SERMAT__': {
		identifier: 'MoveAction',
		serializer: function serialize_MoveAction(obj) {
			return [obj.unitId, Array.apply(Array, obj.position), obj.run];
		}
	}
}); // declare MoveAction

/** ## ShootAction #################################################################################
 */
var ShootAction = exports.ShootAction = declare(GameAction, {
	constructor: function ShootAction(unitId, targetId) {
		this.unitId = unitId;
		this.targetId = targetId;
	},

	aleatories: function aleatories(game) {
		var shooter = this.unitById(game),
			target = this.unitById(game, this.targetId),
			distance = game.terrain.canShoot(shooter, target),
			attackCount = 0;
		shooter.models.forEach(function (model) {
			model.equipments.forEach(function (equipment) {
				if (equipment.range >= distance) {
					attackCount += equipment.attacks;
				}
			});
		});
		var aleatory = new ShootAleatory(shooter.quality, target.defense, attackCount);
		return { wounds: aleatory };
	},

	execute: function execute(game, haps) {
		var wounds = haps.wounds,
			targetUnit = this.unitById(game, this.targetId);
		if (wounds > 0) {
			var targetWorth = targetUnit.worth();
			targetUnit.suffer(game, wounds);
			// The actions worth depends on the damage achieved.
			this.worth = targetWorth - targetUnit.worth();
		}
		this.unitById(game, this.unitId).endTurn(game);
	},

	/** Serialization and materialization using Sermat.
	*/
	'static __SERMAT__': {
		identifier: 'ShootAction',
		serializer: function serialize_ShootAction(obj) {
			return [obj.unitId, obj.targetId];
		}
	}
}); // declare ShootAction

/** ## AssaultAction ###############################################################################
*/
var AssaultAction = exports.AssaultAction = declare(GameAction, {
	constructor: function AssaultAction(unitId, targetId) {
		this.unitId = unitId;
		this.targetId = targetId;
	},

	aleatories: function aleatories(game) {
		return null;
	},

	//FIXME falta que targetUnit contraataque
	execute: function execute(game, haps) {
		var counterWounds = 0;
		var wounds = haps.wounds;
		var targetUnit = this.unitById(game, this.targetId);
		if (wounds > 0) {
			targetUnit.suffer(game, wounds);
		}
		var unit = this.unitById(game, this.unitId);
		unit.disable(game);
		//worth
		this.worth = 0;
		var targetCost = targetUnit.cost();
		if (targetUnit.isDead(game)){
			this.worth += targetCost;
		}
		this.worth += targetCost*wounds/targetUnit.size(); //FIXME no funciona correctamente con tought
		if (unit.isDead(game)){
			this.worth -= unit.cost();
		}
		this.worth -= unit.cost()*counterWounds/unit.size(); //FIXME no funciona correctamente con tought

	},

	/** Serialization and materialization using Sermat.
	*/
	'static __SERMAT__': {
		identifier: 'AssaultAction',
		serializer: function serialize_AssaultAction(obj) {
			return [obj.unitId, obj.targetId];
		}
	}
}); // declare AssaultAction

/** ## Dice rolls ##################################################################################

*/
var combinations = base.math.combinations;

var rolls = exports.rolls = function rolls(p, n) {
    return n <= 0 ? [1] : Iterable.range(n + 1).map(function (i) {
        return Math.pow(p, i) * Math.pow(1 - p, n - i) * combinations(n, i);
    }).toArray();
};

var rerolls = exports.rerolls = function rerolls(p, ns) {
    var r = Iterable.repeat(0, ns.length).toArray();
    ns.forEach(function (p2, n) {
        if (n === 0) { // This is only an optimization.
            r[0] += p2;
        } else {
            rolls(p, n).forEach(function (p3, i) {
                r[i] += p2 * p3;
            });
        }
    });
    return r;
};

var addRolls = exports.addRolls = function addRolls(rs1, rs2) {
	var len1 = rs1.length,
		len2 = rs2.length;
	return Iterable.range(len1 + len2 - 1).map(function (i) {
		return Iterable.range(i + 1).filter(function (j) {
			return j < len1 && (i - j) < len2;
		}, function (j) {
			return rs1[j] * rs2[i - j];
		}).sum();
	}).toArray();
};

var ShootAleatory = exports.ShootAleatory = declare(ludorum.aleatories.Aleatory, {
	constructor: function ShootAleatory(shooterQuality, targetDefense, attackCount) {
		this.shooterQuality = shooterQuality |0;
		this.targetDefense = targetDefense |0;
		this.attackCount = attackCount |0;
		this.__hitProb__ = Math.max(0, Math.min(1, (6 - shooterQuality + 1) / 6));
		this.__saveProb__ = Math.max(0, Math.min(1, (6 - targetDefense + 1) / 6));
		var rs = rerolls(this.__saveProb__, rolls(this.__hitProb__, attackCount));
		this.__distribution__ = iterable(rs).map(function (p, v) {
			return [v, p];
		}).toArray();
	},

	distribution: function distribution() {
		return iterable(this.__distribution__);
	},

	value: function value(random) {
		return (random || base.Randomness.DEFAULT).weightedChoice(this.__distribution__);
	},

	'static __SERMAT__': {
		identifier: 'ShootAleatory',
		serializer: function serialize_ShootAleatory(obj) {
			return [obj.shooterQuality, obj.targetDefense, obj.attackCount];
		}
	}
});


/** # Wargame
 *
 */
var Wargame = exports.Wargame = declare(ludorum.Game, {
	name: 'Wargame',
	players: ['Red', 'Blue'],
	rounds:5,

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
					activePlayer: obj.activePlayer(),
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


/** # Terrain

*/


var Terrain = exports.Terrain = declare({
	SURROUNDINGS: [
		{dx:-1, dy:-1, cost: Math.SQRT2},
		{dx:-1, dy: 0, cost: 1},
		{dx:-1, dy: 1, cost: Math.SQRT2},
		{dx: 0, dy:-1, cost: 1},
		{dx: 0, dy: 1, cost: 1},
		{dx: 1, dy:-1, cost: Math.SQRT2},
		{dx: 1, dy: 0, cost: 1},
		{dx: 1, dy: 1, cost: Math.SQRT2}
	],

	/** The map of the terrain is made of tiles taken from a tileSet. This is the default tile set.
	*/
	tileSet: [
		//{ passable: true, visible: true },
		{ passable: true, visible: true },
		{ passable: false, visible: false }
	],

	map: [
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000010000000000000000000000000100000000000",
		"111111111110000001111111111110000000111111111111",
		"000000000010000000000000000000000000100000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000010000000000001000000000000100000000000",
		"111111111110000000000001000000000000111111111111",
		"000000000010000000000001000000000000100000000000",
		"000000000000000000000001000000000000000000000000",
		"000000000010000000000001000000000000100000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000010000001111111111110000000100000000000",
		"000000000010000000000000000000000000100000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000"
	].map(function (line) {
		return new Uint8Array(line.split(''));
	}),

	__unitsByPosition__: {},

	constructor: function Terrain(args) {
		//TODO initialization
		this.width = this.map.length;
		this.height = this.map[0].length;
	
	},

	resetTerrain: function resetTerrain(wargame){
		this.__unitsByPosition__ = this.unitsByPosition(wargame);
	},

	unitsByPosition: function unitsByPosition(wargame){
		var armies = wargame.armies,
			result = {};
		for (var team in armies) {
			armies[team].units.forEach(function (unit) {
				if (!unit.isDead()){
		          	result[unit.position] = unit;
				}
			});
		}
		return result;
	},

	tileAt: function tileAt(position) {
		var tile = this.map[position[0]] && this.map[position[0]][position[1]];
		return this.tileSet[tile];
	},

	isPassable: function isPassable(position, checkUnits) {
		var tile = this.tileAt(position);
		return !!(tile && tile.passable &&
			(!checkUnits || !this.__unitsByPosition__.hasOwnProperty(position)));
	},

	isVisible: function isVisible(position, checkUnits) {
		var tile = this.tileAt(position);
		return !!(tile && tile.visible &&
			(!checkUnits || !this.__unitsByPosition__.hasOwnProperty(position)));
	},

	distance: function distance(p1, p2) {
		var d0 = Math.abs(p1[0] - p2[0]),
			d1 = Math.abs(p1[1] - p2[1]);
		return Math.sqrt(d0 * d0 + d1 * d1);
	},

	// ## Movement ################################################################################

	/** Returns all reachable positions of the given unit.
	*/
	reachablePositions: function reachablePositions(unit, range) {

		range = range || 12;
		var visited = {},
			pending = [unit.position],
			width = this.width,
			height = this.height,
			SURROUNDINGS = this.SURROUNDINGS,
            	pos, pos2, cost, cost2, delta, tile;
		visited[unit.position] = 0;

		for (var i = 0; i < pending.length; i++) {
			pos = pending[i];
			cost = visited[pos];
			for (var j = 0; j < SURROUNDINGS.length; j++) {
				delta = SURROUNDINGS[j];
				cost2 = cost + delta.cost;
				if (cost2 > range) continue;
				pos2 = [pos[0] + delta.dx, pos[1] + delta.dy];
				if (visited.hasOwnProperty(pos2) || !this.isPassable(pos2, true)) continue;
				visited[pos2] = cost2;
				pending.push(pos2);
			}
		}
	
		return visited;
	},
	canReachAStarInf: function canReachAStarInf(args){
		var graph = new ludorum_wargame.Graph(this, {diagonal:true,end:args.target.position,start:args.attacker.position}),
			end = graph.grid[args.target.position[0]][args.target.position[1]],
			start = graph.grid[args.attacker.position[0]][args.attacker.position[1]],
			result=graph.astar.search(graph, start, end,{exitCondition:args.exitCondition,heuristic:this.heuristicInfluence,influenceMap:args.influenceMap,role:args.role});

		return result;

	},
	canReachAStar: function canReachAStar(args){
		var graph = new ludorum_wargame.Graph(this, {diagonal:true}),
			end = graph.grid[args.target.position[0]][args.target.position[1]],
			start = graph.grid[args.attacker.position[0]][args.attacker.position[1]],
			result =graph.astar.search(graph, start, end,{exitCondition:args.exitCondition});

		return result;

	},
	getInf:function getInf(pos,role,grid){
		var x=pos[0],
			y=pos[1];
		if (role=="Red")
			return grid[x][y];
		return -grid[x][y];

	},
	heuristicInfluence: function heuristicInfluence(pos0, pos1,grid,role){
		var d1 = Math.abs(pos1.x - pos0.x),
			d2 = Math.abs(pos1.y - pos0.y),
			inf= role=="Red" ? grid[pos0.x][pos0.y]: -grid[pos0.x][pos0.y];
		return d1 + d2+inf*60;
		
	},
	distanceToTurns:function distanceToTurns(distance){
		var turns =0;
		if (distance<=6){
			return turns;
		}
		return turns =distance % 12===0 ?distance / 12:( distance/12)+1;
	},
	undefinedAsignArray: function undefinedAsign(matrix,position) {
		matrix[position]=matrix[position]!==undefined ? matrix[position] : [];
	},
	sparseMatrix:function sparseMatrix(matrix,distanceVal,pos,object){
		if (object.value!=undefined){
		matrix[pos[0]]=matrix[pos[0]]!==undefined ? matrix[pos[0]] : [];
		matrix[pos[0]][[pos[1]]]=matrix[pos[0]][[pos[1]]]!==undefined  ? matrix[pos[0]][[pos[1]]] : {};
		matrix[pos[0]][[pos[1]]][object.key]=object.value;
		}
	},

	// ## Visibility ##############################################################################

	'dual bresenham': function bresenham(point1, point2, maxRange){
		maxRange = maxRange || Infinity;
		var result = [],
			dx = Math.abs(point2[0] - point1[0]),
			dy = Math.abs(point2[1] - point1[1]),
			sx = (point1[0] < point2[0]) ? 1 : -1,
			sy = (point1[1] < point2[1]) ? 1 : -1,
			curLoc = point1.slice(),
			err = dx - dy,
			e2;
		while (maxRange--){
			result.push(curLoc.slice());
			if (curLoc[0] === point2[0] && curLoc[1] === point2[1]) break;
			e2 = err * 2;
			if (e2 > -dy) {
				err -= dy;
				curLoc[0] += sx;
			}
			if (e2 < dx) {
				err += dx;
				curLoc[1] += sy;
			}
		}
		return result;
	},

	canShoot:function canShoot(shooterUnit, targetUnit){
		if (shooterUnit.army === targetUnit.army) {
			return Infinity;
		}
		var distance = this.distance(shooterUnit.position, targetUnit.position);
		if (distance > shooterUnit.maxRange()) {
			return Infinity;
		} else {
			var sight = this.bresenham(shooterUnit.position, targetUnit.position, distance),
				pos;
			for (var i = 0; i < sight.length; i++) {
				pos = sight[i];
				if (!this.isVisible(pos) || this.__unitsByPosition__[pos] &&
						this.__unitsByPosition__[pos].id !== shooterUnit.id &&
						this.__unitsByPosition__[pos].id !== targetUnit.id) {
					return Infinity;
				}
			}

			return distance;
		}
	},

	

	areaOfSight: function areaOfSight(unit, radius) {
		radius = radius || Infinity;
		var pos = unit.position,
			terrain = this,
			area = {};
		iterable(this.BRESENHAM_CACHE).forEachApply(function (_, path) {
			var pos2;
			for (var i = 1; i < path.length && i <= radius; i++) {
				pos2 = path[i];
				pos2 = [pos[0] + pos2[0], pos[1] + pos2[1]];
				if (!terrain.isVisible(pos2)) break;
				area[pos2] = i;
				if (terrain.__unitsByPosition__[pos2]) break;
			}
		});
		return area;
	},

	// ## Utilities ###############################################################################

	'static __SERMAT__': {
		serializer: function serialize_Terrain(obj) {
			return [];
		}
	}
}); // declare Terrain

Terrain.BRESENHAM_CACHE = Terrain.prototype.BRESENHAM_CACHE = (function (radius) {
	var pointCache = {},
		result = { radius: radius };

	function cachePath(path) {
		return path.map(function (point) {
			return pointCache[point] || (pointCache[point] = point);
		});
	}

	for (var i = -radius; i <= radius; i++) {
		result[[i, -radius]] = Terrain.bresenham([0, 0], [i, -radius]);
		result[[i, +radius]] = Terrain.bresenham([0, 0], [i, +radius]);
		if (i !== -radius && i !== radius) {
			result[[-radius, i]] = Terrain.bresenham([0, 0], [-radius, i]);
			result[[+radius, i]] = Terrain.bresenham([0, 0], [+radius, i]);
		}
	}
	return result;
})(50);

//var inf= new LW.InfluenceMap(game2,"Red")

var InfluenceMap = exports.InfluenceMap = declare({
	momentum: 0.7,
	decay: 0.5,
	iterations: 50,

	constructor: function InfluenceMap(game, role){
		this.width= game.terrain.width;
		this.height= game.terrain.height;
		this.grid= this.matrix(this.width);
		this.terrain= game.terrain;
		//this.role = role;
		
	},
	getInf:function getInf(pos){
		var x=pos[0],
			y=pos[1];
		if (this.role=="Red")
			return this.grid[x][y];
		return -this.grid[x][y];

	},
	matrix:function matrix(dim){
		return  Array(dim).fill(0).map(function(v) {return   Array(dim).fill(0).map(function(v){return 0;});});
	},
	update: function update(game) {
		var influenceMap = this,
			grid = this.grid,
			pos;
		this.role = game.activePlayer();
		this.unitsInfluences(game);
		for (var i = 0; i < this.iterations; i++) {
			grid=this.spread(grid);
		}
		return grid;
	},
	unitsInfluences: function unitsInfluences(game) {
		var imap = this,
			sign,
			grid = this.grid,
			posX,
			posY;
		for (var army in game.armies){
			sign = "Red" ===army ? +1 : -1;
			game.armies[army].units.forEach(function (unit){
				if (!unit.isDead()) {
					posX = unit.position[0] |0;
					posY = unit.position[1] |0;
					if (!grid[posX]) {
						grid[posX]=[];
						grid[posX][posY]=0;
					}else if (!grid[posX][posY]){
						grid[posX][posY]= 0;
					}
					grid[posX][posY] = imap.influence(unit,sign) ;
				}
			});
		}
	},

	influence: function influence(unit,sign) {
		return unit.worth()*sign*1000; //FIXME Too simple?
	},
	getMomentumInf: function getMomentumInf(grid,r,c,decays){
		var v,
			di,dj,inf=0,absInf,absV;
		for ( di = -1; di < 2; di++) {
			for (dj = -1; dj < 2; dj++) {
				if ((di !== 0 || dj !== 0) && grid[r+di] && (v = grid[r+di][c+dj])) {
					v *= decays[di*di+dj*dj];
					absInf =inf<0 ? -inf: inf;
					absV   =v<0 ?   -v  : v;
					//	if (Math.abs(inf) < Math.abs(v)) {
					if (absInf < absV) {
						inf = v;
					}
				}
			}
		}
		return inf;
	},

	spread: function spread(grid) {
	//	var start=Date.now();
		var decay = this.decay,
			decays = [NaN, Math.exp(-1 * decay), Math.exp(-Math.SQRT2 * decay)],
			momentum = this.momentum,
			oneGrid=[],
			value,
			inf,
			terrain=this.terrain;

		for (var r= 0; r <grid.length; r++) {
			for (var c = 0; c < grid[r].length;c++) {
				value=grid[r][c];
				if (terrain.map[r][c]===1){
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  "t";
				}
				else{
					inf = this.getMomentumInf(grid,r,c,decays);
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  value * (1 - momentum) + inf * momentum;
				}
			}
		}
		return oneGrid;

    },


}); // declare InfluenceMap


exports.test = {
	/** Simple test game. 01
  */
    example0: function example0() {
      var terrain = new Terrain(),
        ARMY = GrimFuture.BattleBrothers,
        game = new Wargame({
          terrain: terrain,
          armies: {
            Red: new GrimFuture.BattleBrothers({ player: 'Red',
            //,[3,20],[4,15],[10,2]
              units: [[3,10]].map(function (position) {
                return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
              })
            }),
            Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
              units: [[40,10],[40,20],[40,15],[40,2]].map(function (position) {
                return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
              })
            })
          }
        });
            return game;
    },

    example1: function example1() {
	/*	var terrain = new Terrain([

        { type: p2.Shape.BOX, x:20,y:20, width:4, height:50}
      ]),*/
         var terrain = new Terrain(),
			ARMY = GrimFuture.BattleBrothers,
			game = new Wargame({
				terrain: terrain,
				armies: {
					Red: new GrimFuture.BattleBrothers({ player: 'Red',
            units: [[3,10],[3,20],[3,15],[3,2]].map(function (position) {
							return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
						})
					}),
					Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
						units: [[40,10],[40,20],[40,15],[40,2]].map(function (position) {
							return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
						})
					})
				}
			});
         return game;
	},

  exampleDS1: function exampleDS1() {
  var terrain = new Terrain([
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:24 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:10 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:15 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:6 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:1 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:3 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:5 }
    ]),
    ARMY = GrimFuture.BattleBrothers,
    game = new Wargame({
      terrain: terrain,
      armies: {
        Red: new GrimFuture.BattleBrothers({ player: 'Red',
          units: [[3,2]].map(function (position) {
            return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
          })
        }),
        Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
          units: [[3,4]].map(function (position) {
            return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
          })
        })
      }
    });
       return game;
},
exampleDS2: function exampleDS2() {
var terrain = new Terrain([
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:24 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:10 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:15 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:6 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:1 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:3 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:5 }
  ]),
  ARMY = GrimFuture.BattleBrothers,
  game = new Wargame({
    terrain: terrain,
    armies: {
      Red: new GrimFuture.BattleBrothers({ player: 'Red',
        units: [[3,2]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      }),
      Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
        units: [new ARMY.UNITS.BattleBrothers_Unit({ position: [3,4], models: [new ARMY.MODELS.BattleBrother(1),
            new ARMY.MODELS.BattleBrother(),new ARMY.MODELS.BattleBrother(),
            new ARMY.MODELS.BattleBrother(),new ARMY.MODELS.BattleBrother()]})]
        })
      }
  });
     return game;
},

exampleDS3: function exampleDS3() {
  var terrain = new Terrain([
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:24 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:10 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:15 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:6 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:1 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:3 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:5 }
  ]),
  ARMY = GrimFuture.BattleBrothers,
  game = new Wargame({
    terrain: terrain,
    armies: {
      Red: new GrimFuture.BattleBrothers({ player: 'Red',
        units: [[3,2]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      }),
      Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
        units: [new ARMY.UNITS.BattleBrothers_Unit({position: [3,4]}),
        new ARMY.UNITS.SupportBrothers_Unit({position: [5,2]})] //FIXME tiene q ser SupportBrothers_Unit
      })
    }
  });
     return game;
},
exampleDS4: function exampleDS4() {
var terrain = new Terrain([
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:24 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:10 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:15 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:6 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:1 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:3 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:5 }
  ]),
  ARMY = GrimFuture.BattleBrothers,
  game = new Wargame({
    terrain: terrain,
    armies: {
      Red: new GrimFuture.BattleBrothers({ player: 'Red',
        units: [[3,2]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      }),
      Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
        units: [[5,35]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      })
    }
  });
     return game;
},

	randomGame: function randomGame() { //FIXME window
		var RandomPlayer = ludorum.players.RandomPlayer,
			players = [new RandomPlayer(), new RandomPlayer()];
		window.match = new ludorum.Match(this.example1(), players);
		match.events.on('begin', function (game, match){
			window.RENDERER.render(game);
		});
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
		});
		match.events.on('next', function (game, next, match) {
			if (next instanceof Wargame) {
				window.RENDERER.render(next);
			}
		});
		match.run().then(function (m) {
			console.log(m.result());
		});
	},

	randomAbstractedGame: function randomAbstractedGame() { //FIXME window
		var players = [
				new ludorum.players.RandomPlayer(),
				new ludorum.players.RandomPlayer()
			],
    game = new AbstractedWargame(this.example1());
		window.match = new ludorum.Match(game, players);
		match.events.on('begin', function (game, match) {
      var terrain=  game.concreteGame.terrain;
          window.RENDERER.render(game.concreteGame);

		});
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
		});
		match.events.on('next', function (game, next, match) {
      try {
        
      
      var terrain=  next.concreteGame.terrain;
      window.RENDERER.render(next.concreteGame);
      } catch (error) {
        console.log(error);
      }
		});
		match.run().then(function (m) {
      console.log("randomAbstractedGame");
      console.log(m.result());
      
		});
  },

  randomAbstractedGameDiscrete: function randomAbstractedGameDiscrete() { //FIXME window
		var players = [
			//	new ludorum.players.MonteCarloPlayer({ simulationCount: 10, timeCap: 2000 }),
				
        new ludorum.players.MonteCarloPlayer({ simulationCount: 500, timeCap: 20000 }),
        new ludorum.players.RandomPlayer(),
			],
			game = new AbstractedWargame(this.example1());
      window.match = new ludorum.Match(game, players);
      match.events.on('begin', function (game, match) {
        var terrain=  game.concreteGame.terrain;
            window.RENDERER.render(game.concreteGame);
  
      });
      match.events.on('move', function (game, moves, match) {
        console.log(Sermat.ser(moves));
      });
      match.events.on('next', function (game, next, match) {
        var terrain=  next.concreteGame.terrain;
        window.RENDERER.render(next.concreteGame);
      });
      match.run().then(function (m) {
        console.log("randomAbstractedGameDiscrete");
        console.log(m.result());
      });
    },

	//le paso los players, en caso de que no se pase, ahi si son aleatorios
	testGame: function testGame(player1, player2) { //FIXME window
		var RandomPlayer = ludorum.players.RandomPlayer,
			players = [
				player1 || new RandomPlayer(),
				player2 || new RandomPlayer()
			];
		window.match = new ludorum.Match(this.example1(), players);
		match.events.on('begin', function (game, match) {
			window.RENDERER.render(game);
			//var terrain=  game.terrain;
			//terrain.loadUnitsBut(game,terrain.terrain);
			//window.RENDERER.renderGrid(terrain.terrain);
		});

		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
			window.RENDERER.renderSight(game);
		});

		match.events.on('next', function (game, next, match) {
			if (next instanceof Wargame) {
				window.RENDERER.render(next);
			}
		});

		match.run().then(function (m) {
			console.log(m.result());
		});
	}
}; // scenarios


/** # Grim Future

*/
var GrimFuture = exports.GrimFuture = (function () {
	var GrimFuture = {};

/** ## Battle Brothers #############################################################################

*/
	var EQUIPMENTS = {
			LightClaws: { range: 0, attacks: 1 },
			CClaws: { range: 0, attacks: 2 },
			Pistol: { range: 12, attacks: 1 },
			AssaultRifle: { range: 24, attacks: 1 },
			HeavyFlamethrower: { range: 12, attacks: 6, ap: 1 }
		},
		MODELS = {
			BattleBrother: declare(Model, {
				cost: 22,
				equipments: [EQUIPMENTS.AssaultRifle, EQUIPMENTS.LightClaws],
				constructor: function BattleBrother(wounds) {
					Model.call(this, wounds);
				}
			}),
			AssaultBrother: declare(Model, {
				cost: 22,
				equipments: [EQUIPMENTS.Pistol, EQUIPMENTS.CClaws]
			}),
			SupportBrother: declare(Model, {
				cost: 50,
				equipments: [EQUIPMENTS.HeavyFlamethrower, EQUIPMENTS.LightClaws],
				constructor: function SupportBrother(wounds) {
					Model.call(this, wounds);
				}
			})
		},
		UNITS = {
			BattleBrothers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				fearless: true,
				constructor: function BattleBrothers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(5).map(function () {
							return new MODELS.BattleBrother();
						}).toArray();
					}
					Unit.call(this, props);
				}
			}),
			AssaultBrothers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				models: Iterable.repeat(MODELS.AssaultBrother, 5).toArray(),
				fearless: true
			}),
			SupportBrothers_Unit: declare(Unit, {
				quality: 3,
				defense: 6,
				fearless: true,
				constructor: function SupportBrothers_Unit(props) {
					props = props || {};
					if (!props.models) {
						props.models = Iterable.range(5).map(function () {
							return new MODELS.SupportBrother();
						}).toArray();
					}
					Unit.call(this, props);
				}
			})
		};

	var BattleBrothers = GrimFuture.BattleBrothers = declare(Army, {
		faction: 'BattleBrothers',
		'static MODELS': MODELS,
		'static UNITS': UNITS,

		constructor: function BattleBrothers(args) {
			Army.call(this, args);
		}
	});

//TODO More factions.
	return GrimFuture;
})();


function playerRule(priority, fun) {
 fun.priority = priority;
 return fun;
}

function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var DynamicScriptingPlayer = exports.DynamicScriptingPlayer = declare(ludorum.Player, {
 /** The constructor takes the player's `name` and the following:
  */
 constructor: function DynamicScriptingPlayer(params) {
   ludorum.Player.call(this, params);
   initialize(this, params)
    .array('rules', { defaultValue: [] });
   this.__pendingActions__ = [];
   this.rules = this.ownRules();
   this.sortRules();
 },

 /** Returns an array with the methods of this object whose name starts with `rule`.
  */
 ownRules: function ownRules() {
   var self = this;
   return Object.keys(Object.getPrototypeOf(this)).map(function (id) {
     return [self[id], 1];
   }).filter(function (member) {
     var f = member[0];
     return typeof f === 'function' && f.name && f.name.substr(0, 4) === 'rule';
   });
 },

 /** Sorts the rules first by priority (descending), then by weight (descending).
  */
 sortRules: function sortRules() {
   this.rules.sort(function (r1, r2) {
     return r2[0].priority - r1[0].priority || r2[1] - r1[1];
   });
 },

 sortRuleListByWeight: function sortRuleListByWeight(ruleList) {
   ruleList.sort(function (r1, r2) {
     return r2[1] - r1[1];
   });
 },
 //devuelve la lista de reglas de la prioridad indicada
 firstRules: function firstRules(game,player,priority){
   var rule, actions;
   var retRules = [];
   for (var i = 0, len = this.rules.length; i < len; i++) {
     if (this.rules[i][0].priority==priority){
       rule = this.rules[i];
       actions = rule[0].call(this, game, player);
       if (actions) {
         retRules.push(rule);
       }
     }
   }
   this.sortRuleListByWeight(retRules);
   return retRules;
  },


 /** The player makes a decision by calling the rules' functions in order. The first one to
 return a list of actions is used.
 */
 decision: function decision(game, player) {
   game.synchronizeMetagame();
   var rule, actions;
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var armiesAndUnits = this.armiesAndUnits(game,player);
   var units = armiesAndUnits[1];
   var enableds = 0;
   for (var m=0; m<units.length;m++){
     if (units[m].isEnabled || units[m].isActive){
       enableds += 1;
     }
   }
   var gameWorth = 0;
   // si es el principio de la ronda
   if (enableds === units.length){
     gameWorth = this.gameWorth(game, player);
   }
   var roundActions = [],
     lastRoundGame = game;
   if (this.__pendingActions__.length < 1) {
      //for (var i = 0, len = this.rules.length; i < len; i++) {
      var maxPriority = 12; //la mayor prioridad con reglas programadas
      while (maxPriority >0){
         //rule = this.rules[i];
         var firstRules = this.firstRules(game,player,maxPriority);
         if (firstRules.length>0){
           var sumWeight = 0;
           for (var j=0; j<firstRules.length; j++){
              var firstRule = firstRules[j];
              sumWeight += firstRule[1];
           }
           // ya hay alguna regla con peso asignado
           if (sumWeight > firstRules.length){
             var prob = 0;
             var sumProb = 0;
             var rand = Math.random();
             for (var k=0; j<firstRules.length; k++){
              prob = firstRules[k][1]/sumWeight;
              sumProb += prob;
              if (rand<=sumProb){
                rule = firstRules[k];
                actions = rule[0].call(this, game, player);
              }
             }
           } else { //todavia no se aplico pesos a las reglas
             rule = firstRules[Math.floor(Math.random()*firstRules.length)];
             actions = rule[0].call(this, game, player);
           }
           if (actions) {
             actions.forEach(function (action) {
               action.__rule__ = rule;
             });
             this.__pendingActions__ = this.__pendingActions__.concat(actions);
             roundActions = roundActions.concat(actions);

             var activateds = 0;
             for (var l=0; l<units.length;l++){
               if (!units[l].isEnabled || units[l].isActive){
                 activateds += 1;
               }
             }
             // si estan todas activadas, termino la ronda
             //if (activateds === units.length-1){
               //this.adjustWeights(game,game.players[0],roundActions,gameWorth);
             //}
             return this.__pendingActions__.shift();
           }
         } else { // no se cumple ninguna regla para la maxima prioridad, bajar de prioridad
           maxPriority -= 1;
         }
       }
     }
   raiseIf(this.__pendingActions__.length < 1, 'No rule applied to game!');
   return this.__pendingActions__.shift();
 },

 participate: function participate(match, role){
   this.attachToMatch(match.state(),match);
   return this;
 },
 attachToMatch: function attachToMatch(game,match){
   var player = this,
     round = 0,
     roundActions = [],
     lastRoundGame = game;
   match.events.on('move', function (game, moves, match) {
     var activePlayer = game.activePlayer();
     if (activePlayer === game.players[0]) {
          roundActions.push(moves[activePlayer]);
     }
   });
   match.events.on('next', function (game, next, match) {
     if (!next.isContingent && next.round > round && !game.isContingent) {
       player.adjustWeights(game,game.players[0],roundActions,lastRoundGame);
       round = next.round;
       roundActions = [];
       lastRoundGame = game;
     }
   });
  // return match.run().then(function (m) {
  //   player.adjustWeights(game,game.players[0],roundActions,lastRoundGame);
  // });
 },

 training: function training(game, opponent){
   opponent = opponent || new ludorum.players.RandomPlayer();
   var match = new ludorum.Match(game, [this, opponent]),
     lastRoundGame = game;
     this.attachToMatch(lastRoundGame,match);
 },

 /** The method `adjustWeights` check if the round has changed. If so, it adjusts the weights of
 the rules of the actions executed by the player in the round.
  */
 adjustWeights: function adjustWeights(game, player, roundActions, lastRoundGame) {
     //reglas aplicadas esta ronda
     var reglasAplicadas = [];
     roundActions.forEach(function (ra){
       reglasAplicadas.push(ra.__rule__);
     });
     var lastGameWorth = this.gameWorth(lastRoundGame,player);
     var diff = (this.gameWorth(game,player) - lastGameWorth)/10;
     // si diff da negativo, a todas las reglas, salvo las que jugaron en esta ronda, se les suma diff
     var reg,
       rap,
       name;
     if (diff <0){
       for (reg=0; reg<this.rules.length; reg++){
         for (rap=0; rap<reglasAplicadas.length; rap++){
           if (this.rules[reg][0].name != reglasAplicadas[rap][0].name){
             this.rules[reg][1] -= diff;
           }
         }
       }
     } else { // si diff da positivo se lo sumara una vez a cada regla aplicada en esta ronda
       var rulesNames = [];
       for (rap=0; rap<reglasAplicadas.length; rap++){
         name = reglasAplicadas[rap][0].name;
         if (rulesNames.indexOf(name) < 0){
           //comparo si las reglas tienen el mismo nombre que la regla aplicada
           for (reg=0; reg<this.rules.length; reg++){
             if (this.rules[reg][0].name == name){
               this.rules[reg][1] += diff;
               rulesNames.push(name);
             }
           }
         }
       }
     }
     // para cada accion calculo su valor
     for (var roundAction=0; roundAction<roundActions.length; roundAction++){
       var action = roundActions[roundAction];
       name = action.__rule__[0].name;
       if (!action.__rule__[1]){
         action.__rule__[1] = 1;
       }
       var worthDiv10 = 0;
       if (isFunction(action.worth)){
         worthDiv10 = action.worth()/10;
       } else {
         worthDiv10 = action.worth/10;
       }

       for (reg=0; reg<this.rules.length; reg++){
         // si el valor de la accion es < 0, a cada accion que no sea esta,
         //se le resta a su regla el valor de esta accion
         if (worthDiv10<0){
           if (this.rules[reg][0].name != name){
             this.rules[reg][1] -= worthDiv10;
           }
         } else { // si da positivo, a la regla de esta accion se le suma el valor de esta accion
           if (this.rules[reg][0].name == name){
             this.rules[reg][1] += worthDiv10;
           }
         }
      }
    }
 },

 /** Calculates the worth of a game state from the point of view of the player. This is the cost
 of opponent's eliminated models and units minus own eliminated models and units.
  */
 gameWorth: function gameWorth(game, player) {
   var worth = 0;
   var cost = 0;
   var deadModels = 0;
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var armiesAndUnits = this.armiesAndUnits(game,player);
   var playerUnits = armiesAndUnits[1];
   var enemyUnits = armiesAndUnits[3];
   enemyUnits.forEach(function (unitY) {
     cost = unitY.cost();
     if (unitY.isDead()){
       worth += cost;
     }
     deadModels = unitY.size() - unitY.livingModels().length;
     worth += cost*deadModels/unitY.size(); //FIXME no funciona correctamente con tough
   });

   playerUnits.forEach(function (unitX) {
     cost = unitX.cost();
     if (unitX.isDead()){
       worth -= cost;
     }
     deadModels = unitX.size() - unitX.livingModels().length;
     worth -= cost*deadModels/unitX.size(); //FIXME no funciona correctamente con tough
   });
   return worth;
 },

 'static __SERMAT__': {
   identifier: 'DynamicScriptingPlayer',
   serializer: function serialize_DynamicScriptingPlayer(obj) {
     return this.serializeAsProperties(obj, ['name', 'rules']); //TODO Check function serialization.
   }
 },

 // ## Helper functions /////////////////////////////////////////////////////////////////////////
//accion basica shoot
 shoot: function shoot(unitX,unitY){
   return [new ActivateAction(unitX.id),new ShootAction(unitX.id,unitY.id)];
 },
//accion basica assault
 assault: function assault(unitX,unitY){
   return [new ActivateAction(unitX.id),new AssaultAction(unitX.id,unitY.id)];
 },
//accion basica move. puede solo moverse, o moverse y disparar
 move: function move(unitX,moveAction,shootUnitY){
   if (shootUnitY){
     //el shoot ya tiene EndTurnAction incorporado, si solo se mueve hay q agregarlo
     return [new ActivateAction(unitX.id),moveAction,new ShootAction(unitX.id,shootUnitY.id)];
   } else {
     return [new ActivateAction(unitX.id),moveAction,new EndTurnAction(unitX.id)];
   }
 },
//metodo auxiliar para la funcion scape
scapeAux: function scapeAux(game,player,enemyUnits,unitX){
  for (var i = 0; i < enemyUnits.length; i++) {
    var eu = enemyUnits[i];
    var moves = [];
    if (this.canHide(game,unitX,eu)){
      var hideMoves = this.hideMoves(game,unitX,eu);
      for (var j=0; j<hideMoves.length; j++){
        if (game.terrain.distance(eu.position,hideMoves[j].position)<=eu.maxRange()+6){
          return this.move(unitX,hideMoves[j]);
        }
      }
      moves = moves.concat(hideMoves);
    }
    if (this.canRun(game,unitX,eu)){
      var runMoves = this.runMoves(game,unitX,eu);
      for (var k=0; k<runMoves.length; k++){
        if (game.terrain.distance(eu.position,runMoves[k].position)<=eu.maxRange()+6){
          return this.move(unitX,runMoves[k]);
        }
      }
      moves = moves.concat(runMoves);
    }
    if (moves.length>0){
      return this.move(unitX,moves[Math.floor(Math.random()*moves.length)]);
    }
  }
},
//retorna un move, que le sirva a unitX para escapar de los enemigos peligrosos
 scape: function scape(game,player,unitX){
   var mostDangerousUnits = this.mostDangerousUnits(game,player,unitX);
   var scapeMdu = this.scapeAux(game,player,mostDangerousUnits,unitX);
   if (scapeMdu){
     return scapeMdu;
   }
   var dangerousUnits = this.dangerousUnits(game,player,unitX);
   var scapeDu = this.scapeAux(game,player,mostDangerousUnits,unitX);
   if (scapeDu){
     return scapeDu;
   }
   console.log("no escapa cuando deberia");
   var moveActions = unitX.getMoveActions(game);
   return this.moves(unitX,moveActions[Math.floor(Math.random()*moveActions.length)]);
 },
 //metodo auxiliar para la funcion assist
 assistAux: function assistAux(game,player,enemyUnits,unitX,unitX2){
   for (var i=0;i<enemyUnits.length;i++){
      var eu = enemyUnits[i];
      /*if (this.canAssault(game,unitX,eu)){ //FIXME assault
        return this.assault(unitX,eu);
      }*/
      var moveAction;
      if (this.canBlockSight(game,unitX,unitX2,eu)){
        var blockSightMovements = this.blockSightMovements(game,unitX,unitX2,eu);
        moveAction = blockSightMovements[Math.floor(Math.random()*blockSightMovements.length)];
      }
      if (this.canShoot(game,unitX,eu,true)){
        if (moveAction){
          return this.move(unitX,moveAction,eu);
        } else {
          return this.shoot(unitX,eu);
        }
      } else{
        if (moveAction){
          return this.move(unitX,moveAction);
        }
      }
    }
    return null;
 },
/*al enemigo que pueda atacar a unitX2, intenta asaltarlo, o moverse para bloquear su vista y dispararlo
empezando por los enemigos mas peligrosos
*/
 assist: function assist(game,player,unitX,unitX2){
   var mostDangerousUnits = this.mostDangerousUnits(game,player,unitX2);
   var assistMdu = this.assistAux(game,player,mostDangerousUnits,unitX,unitX2);
   if (assistMdu){
     return assistMdu;
   }
   var dangerousUnits = this.dangerousUnits(game,player,unitX2);
   var assistDu = this.assistAux(game,player,dangerousUnits,unitX,unitX2);
   if (assistDu){
     return assistDu;
   }
   console.log("no asiste cuando deberia");
   var moveActions = unitX.getMoveActions(game);
   return this.moves(unitX,moveActions[Math.floor(Math.random()*moveActions.length)]);
 },
 // retorna el move que hace que unitX se acerque lo mas posible a unitZ
 getCloseTo: function getCloseTo(game,unitX,unitZ){
    //encuentro a linea de posiciones entre unitX y unitZ
    var interpolatedPos = this.interpolation(unitX.position,unitZ.position);
    //pongo en una lista todos los movimientos que lleven a la linea
    var moveActions = unitX.getMoveActions(game);
    var possibleMoves = [];
    for (var i=0; i<moveActions.length; i++){
      var pos = moveActions[i].position;
      interpolatedPos.forEach(function(elem){
        if(pos[0]===elem[0]&&pos[1]===elem[1]){
          possibleMoves.push(moveActions[i]);
        }
      });
    }
    // recorro la lista para ver cual esta mas cerca a unitZ
    var closest = unitX.position;
    var move = moveActions[Math.floor(Math.random()*moveActions.length)];
    for (var j=0; j<possibleMoves.length;j++){
      var movePos = possibleMoves[j].position;
      if (game.terrain.distance(movePos,unitZ.position)<game.terrain.distance(closest,unitZ.position)){
        closest = movePos;
        move = possibleMoves[j];
      }
    }
    return this.move(unitX,move);
},
//devuelve true si el shooter puede dispararle al target
 canShoot: function canShoot(game,shooter,target,walking){
   if (!shooter.isDead() && shooter.isEnabled && !target.isDead()){
     var areaOfSightShooter;
     if (walking){
       areaOfSightShooter=shooter.areaOfSight|| game.terrain.areaOfSight(shooter, shooter.maxRange()+6)[0];
     } else {
       areaOfSightShooter=shooter.areaOfSight|| game.terrain.areaOfSight(shooter, shooter.maxRange())[0];
     }
     shooter.areaOfSight=areaOfSightShooter;
     if (game.terrain.canShoot(shooter,target) != Infinity){
       return true;
     }
   }
   return false;
 },
 //devuelve true si el assaulter puede asaltar al target
 canAssault: function canAssault(game,assaulter,target){
   if (!assaulter.isDead() && assaulter.isEnabled && !target.isDead()){
     var areaOfSightAssaulter=assaulter.areaOfSight|| game.terrain.areaOfSight(assaulter, 12 )[0];
     assaulter.areaOfSight=areaOfSightAssaulter;
     if (game.terrain.canShoot(assaulter,target) <= 12){
       return true;
     }
   }
   return false;
 },
 /*metodo auxiliar de interpolation
  para cuando la distancia entre las X es mayor que la distancia entre las Y*/
 interForX: function interForX(xmin,xmax,y_xmin,delta){
   var interpolatedPos = [];
   var y=y_xmin;
   for (var x=xmin+1;x<xmax;x++){
      interpolatedPos.push([parseInt(x),parseInt(y)]);
     y += delta;
   }
   return interpolatedPos;
 },
 /*metodo auxiliar de interpolation
  para cuando la distancia entre las Y es mayor que la distancia entre las X*/
 interForY: function interFory(ymin,ymax,x_ymin,delta){
   var interpolatedPos = [];
   var x=x_ymin;
   for (var y=ymin+1;y<ymax;y++){
      interpolatedPos.push([parseInt(x),parseInt(y)]);
     x += delta;
   }
   return interpolatedPos;
 },
//genera un array de puntos entre el pointA y el pointB
 interpolation: function interpolation(pointA,pointB){
   var x=0,
    y=0,
    delta=0;
   var xa = pointA[0],
    xb = pointB[0],
    ya = pointA[1],
    yb = pointB[1];
   var xmin = Math.min(xa,xb),
    xmax = Math.max(xa,xb),
    ymin = Math.min(ya,yb),
    ymax = Math.max(ya,yb);
   var x_ymin,
    y_xmin;
   if (xmin === xa){
     y_xmin = ya;
   }else{
     y_xmin = yb;
   }
   if (ymin === ya){
     x_ymin = xa;
   }else{
     x_ymin = xb;
   }
   //interForX(xmin,xmax,y_xmin,delta)
   //interForY(ymin,ymax,x_ymin,delta)
   if (ya===yb){
     return this.interForX(xmin,xmax,y_xmin,delta);
   } else {
     if (xa===xb){
       return this.interForY(ymin,ymax,x_ymin,delta);
     } else {
       if (Math.abs(yb-ya) >= Math.abs(xb-xa)){
         delta = Math.abs(xb-xa) / Math.abs(yb-ya);
         return this.interForY(ymin,ymax,x_ymin,delta);
       } else {
         delta = Math.abs(yb-ya) / Math.abs(xb-xa);
         return this.interForX(xmin,xmax,y_xmin,delta);
       }
     }
   }
 },
 /*devuelve las posiciones en que la unitX puede ponerse entre la unitA y la unitB
 de forma tal que quite la linea de vision entre las mismas */
 blockSightMovements: function blockSightMovements(game,unitX,unitA,unitB){
   //dadas las posiciones de unitA y unitB
   var posA = unitA.position;
   var posB = unitB.position;
   //calcula las posiciones intermedias y las pone en un array
   var interpolatedPos = this.interpolation(posA,posB);
   //devuelve la posicion de los moveActions de unitX que coincidan con alguna del array
   var possibleMoves = [];
   var moveActions = unitX.getMoveActions(game);
   for (var i=0; i<moveActions.length; i++){
     var pos = moveActions[i].position;
     interpolatedPos.forEach(function(elem){
       if(pos[0]===elem[0]&&pos[1]===elem[1]){
         possibleMoves.push(moveActions[i]);
       }
     });
   }
   return possibleMoves;
 },
 /*devuelve true si la unitX puede ponerse entre la unitA y la unitB
 de forma tal que quite la linea de vision entre las mismas */
 canBlockSight: function canBlockSight(game,unitX,unitA,unitB){
   return (this.blockSightMovements(game,unitX,unitA,unitB).length>0);
 },
 /*Devuelve true si la unitX puede cubrir a la unitX2
 y/o puedeAtacar a las unidades enemigas no activadas que puedan atacar a la unitX2.*/
 canAssist: function canAssist(game,player,unitX,unitX2){
  var dangerousUnits = this.dangerousUnits(game,player,unitX2);
  var canAssist = false;
  for (var i=0;i<dangerousUnits.length;i++){
     var du = dangerousUnits[i];
     if (this.canBlockSight(game,unitX,unitX2,du)||this.canShoot(game,unitX,du,true)||this.canAssault(game,unitX,du)){
       canAssist = true;
     } else {
       canAssist = false;
       break;
     }
   }
   //si nadie lo puede atacar, no tiene de que asistir
   return canAssist;
},
 //devuelve true si puede correr y alejarse el rango suficiente
 canRun: function canRun(game,runningUnit,enemyUnit){
   var range = enemyUnit.maxRange()+6;
   //corre 12 pero el enemigo se acerca 6
   if (runningUnit.isEnabled && game.terrain.canShoot(enemyUnit,runningUnit)<=range){
     return false;
   }
   return true;
 },
 /*devuelve true si puede cubrirse de las unidades enemigas
 tras otra unidad u terreno que quite linea de vision*/
 canHide: function canHide(game,hidingUnit,enemyUnit){//TODO
   return false;
 },
 /*Retorna el move que hace que unitX se aleje lo mas posible de unitZ.
 Lo devuelve en una lista*/
 runMoves: function runMoves(game,unitX,unitZ){
    var zPos = unitZ.position;
    var farest = unitX.position;
    var moveActions = unitX.getMoveActions(game);
    var move = moveActions[Math.floor(Math.random()*moveActions.length)];
    for (var i=0; i<moveActions.length;i++){
      var movePos = moveActions[i].position;
      if (game.terrain.distance(movePos,zPos)>game.terrain.distance(farest,zPos)){
        farest = movePos;
        move = moveActions[i];
      }
    }
    if (game.terrain.distance(unitZ.position,farest)<=unitZ.maxRange()+6){
      console.log("run y puede huir");
     return [move];
    }
    console.log("run y huyo lo maximo q pudo pero igual lo alcanzan");
    return [move];
 },
 //devuelve la lista de movimientos en los que la hidingUnit puede esconderse  de la enemyUnit
 hideMoves: function hideMoves(game,hidingUnit,enemyUnit){//TODO
   return [];
 },
// devuelve true si unitX puede escaparse de las unidades que la pueden matar
 canScape: function canScape(game,player,unitX){
   var mostDangerousUnits = this.mostDangerousUnits(game,player,unitX);
   //si nadie lo puede matar, no tiene de quien escapar
   if (mostDangerousUnits.length === 0){
     return false;
   }
   var canScape = true;
   for (var i = 0; i < mostDangerousUnits.length; i++) {
     var mdu = mostDangerousUnits[i];
     if (!this.canRun(game,unitX,mdu) && !this.canHide(game,unitX,mdu)){
       canScape = false;
     }
   }
   return canScape;
 },
 // devuelve las unidades enemigas que pueden matar a la unitX
 mostDangerousUnits: function mostDangerousUnits(game,player,unitX){
   var livingEnemyUnits = this.livingEnemyUnits(game,player),
    mdu = [];
   for (var i=0;i<livingEnemyUnits.length;i++){
     var u = livingEnemyUnits[i];
     if (this.canKill(game,u,unitX)){
       mdu.push(u);
     }
   }
   return mdu;
   //return iterable(livingEnemyUnits).filter(function (u) {
  //    return this.canKill(game,u,unitX);
   //});
 },
 // devuelve las unidades enemigas que pueden atacar a la unitX
 dangerousUnits: function dangerousUnits(game,player,unitX){
   var livingEnemyUnits = this.livingEnemyUnits(game,player),
     du = [];
    for (var i=0;i<livingEnemyUnits.length;i++){
      var eu = livingEnemyUnits[i];
      if (this.canShoot(game,eu,unitX,true)||this.canAssault(game,eu,unitX)){
        du.push(eu);
      }
    }
    return du;
   //return iterable(livingEnemyUnits).filter(function (eu) {
     //return this.canShoot(game,eu,unitX,true)||this.canAssault(game,eu,unitX);
    //});
 },
 //devuelve verdadero si las unidades enemigas no pueden matar a unit en este turno
 canBeKilled: function canBeKilled(game,player,unit){
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var enemyUnits = this.armiesAndUnits(game,player)[3];
   for (var i = 0; i < enemyUnits.length; i++) {
     if (this.canKill(game,enemyUnits[i],unit)){
       return true;
     }
   }
   return false;
 },
 // devuelve verdadero si la unidad atacante puede llegar a eliminar a la defensora
 canKill: function canKill(game,attacker,target){
   if (!attacker.isDead() && attacker.isEnabled && !target.isDead()){
     if (this.canKillShooting(game,attacker,target) || this.canKillAssaulting(game,attacker,target)){
       return true;
     }
   }
   return false;
 },
 // devuelve verdadero si la unidad que dispara puede llegar a eliminar a la defensora
 canKillShooting: function canKillShooting(game,shooter,target){
   if (!shooter.isDead() && !target.isDead() && shooter.isEnabled && this.bestAttackResultShooting(game,shooter,target)>=100){
     return true;
   }
   return false;
 },
 // devuelve verdadero si la unidad que asalta puede llegar a eliminar a la defensora
 canKillAssaulting: function canKillAssaulting(game,assaulter,target){
   if (!assaulter.isDead() && !target.isDead() && assaulter.isEnabled && this.bestAttackResultAssaulting(game,assaulter,target)>=100){
     return true;
   }
   return false;
 },
 // devuelve un porcentaje de destruccion de la unidad defensora tras un ataque de la unidad atacante
 // devuelve el mejor porcentaje posible
 bestAttackResult: function bestAttackResult(game,attacker,target){
   if (!attacker.isDead() && attacker.isEnabled && !target.isDead()){
     var barShooting = this.bestAttackResultShooting(game,attacker,target);
     var barAssaulting = this.bestAttackResultAssaulting(game,attacker,target);
     var bestAttackResult = Math.max(barShooting, barAssaulting);
     return bestAttackResult;
   }
   return 0;
 },
 // devuelve un porcentaje de destruccion de la unidad defensora tras un disparo de la unidad atacante
 // donde el mejor porcentaje posible: cada ataque supera las tiradas de dados, y el defensor falla los bloqueos
 bestAttackResultShooting: function bestAttackResultShooting(game,unitX,unitY){
   if (!unitX.isDead() && unitX.isEnabled && !unitY.isDead()){
     var distance = game.terrain.distance(unitX.position, unitY.position);
     var livingModels = unitX.livingModels();
     var attackCount = 0;
   livingModels.forEach(function (model) {
       model.equipments.forEach(function (eq) {
         if (eq.range >= distance) {
           attackCount += eq.attacks;
         }
       });
     });
     var unitYModelsAlive = unitY.livingModels().length;
     var bestAttackResult = attackCount*100/unitYModelsAlive;
     if (bestAttackResult > 100){
       bestAttackResult = 100;
     }
     return bestAttackResult;
   }
   return 0;
 },
 // devuelve un porcentaje de destruccion de la unidad defensora tras un asalto de la unidad atacante
 // donde el mejor porcentaje posible: cada ataque supera las tiradas de dados, y el defensor falla los bloqueos
 bestAttackResultAssaulting: function bestAttackResultAssaulting(game,unitX,unitY){
   if (!unitX.isDead() && unitX.isEnabled && !unitY.isDead()){
     if (this.canAssault(game,unitX,unitY)){
       var attackCount = 0;
       var livingModels = unitX.livingModels();
       livingModels.forEach(function (model) {
         model.equipments.forEach(function (eq) {
           if (eq.range === 0) {
             attackCount += eq.attacks;
           }
         });
       });
       var unitYModelsAlive = unitY.livingModels().length;
       var bestAttackResult = attackCount*100/unitYModelsAlive;
       if (bestAttackResult > 100){
         bestAttackResult = 100;
       }
       return bestAttackResult;
     }
   }
   return 0;
 },
 // devuelve las unidades que el jugador puede usar en su proxima accion
 possibleUnits: function possibleUnits(game, player){
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var playerUnits = this.armiesAndUnits(game,player)[1];
   var possibleUnits = [];
   for(var pu in playerUnits){
     if (!playerUnits[pu].isDead() && playerUnits[pu].isEnabled && !playerUnits[pu].isActive){
       possibleUnits.push(playerUnits[pu]);
     }
   }
   return possibleUnits;
 },
 // devuelve una lista de unidades enemigas que pueden ser disparadas por la unidad atacante
 shootableUnits: function shootableUnits(game, player, shooter){
   var shootableUnits = [];
   var enemyUnits = this.livingEnemyUnits(game,player);
   var shootActions = shooter.getShootActions(game);
   shootActions.forEach(function(shootAction){
     enemyUnits.forEach(function(target){
       if(shootAction.targetId === target.id){
         shootableUnits.push(target);
       }
     });
   });
   return shootableUnits;
 },
 // devuelve una lista de unidades enemigas que pueden ser asaltadas por la unidad atacante
 assaultableUnits: function assaultableUnits(game, player, assaulter){
   var assaultableUnits = [];
   var enemyUnits = this.livingEnemyUnits(game,player);
   var assaultActions = assaulter.getAssaultActions(game);
   assaultActions.forEach(function(assaultAction){
     enemyUnits.forEach(function (target){
       if(assaultAction.targetId === target.id){
         assaultableUnits.push(target);
       }
     });
   });
   return assaultableUnits;
 },
 // devuelve una lista de unidades enemigas que si shooter les dispara las mata
 shootingKillableUnits: function shootingKillableUnits(game,player,shooter){
   var shootingKillableUnits = [];
   var enemyUnits = this.shootableUnits(game,player,shooter);

   for (var i=0; i<enemyUnits.length;i++){
     var target = enemyUnits[i];
     if (this.willKillShooting(game,shooter,target)){
       shootingKillableUnits.push(target);
     }
   }
   return shootingKillableUnits;
 },
 // devuelve una lista de las unidades enemigas que aun estan vivas
 livingEnemyUnits: function livingEnemyUnits(game, player){
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var enemyArmy = this.armiesAndUnits(game,player)[2];
   return enemyArmy.livingUnits();
 },
 // devuelve un array que facilita los datos: playerArmy, playerUnits, enemyArmy, enemyUnits
 armiesAndUnits: function armiesAndUnits(game, player){
   var playerArmy = game.armies[player];
   var playerUnits = playerArmy.units;
   var enemy = game.opponent(player);
   var enemyArmy = game.armies[enemy];
   var enemyUnits  = enemyArmy.units;
   return [playerArmy, playerUnits, enemyArmy, enemyUnits];
 },
 // devuelve true si la unidad tiene algun modelo herido
 wounded: function wounded(unit){
   return unit.livingModels().length < unit.size(); //FIXME no considero tough
 },
 // devuelve true si el porcentaje de daño en el mejor caso de la unidad atacante hacia la defensora es >= 75
 canWoundALot: function canWoundALot(game,attacker,target){
   if (!attacker.isDead() && attacker.isEnabled && !target.isDead()){
     return bestAttackResult(game,attacker,target)>=75;
   }
   return false;
 },
 // devuelve true si el porcentaje de daño en el mejor caso de la unidad atacante hacia la defensora es > 0
 canWound: function canWound(game,attacker,target){
   if (!attacker.isDead() && attacker.isEnabled && !target.isDead()){
     return bestAttackResult(game,attacker,target)>0;
   }
   return false;
 },
 // devuelve el costo de unidad maximo entre la lista de unidades dada
 maxCost: function maxCost(units){
   return iterable(units).map(function (unit) { unit.cost(); }).max(0);
 },
// devuelve la unidad con costo mayor dentro de la lista de unidades dada
 mostExpensiveUnit: function mostExpensiveUnit(units){
   //var meu = iterable(units).greater(function (unit) { return unit.cost(); });
   var meu;
   var maxCost=0;
   for (var i=0;i<units.length;i++){
     if (units[i].cost()>maxCost){
       meu=units[i];
       maxCost=meu.cost();
     }
   }
   return meu;
 },
 // devuelve la unidad con costo menor de la lista de unidades dada
 cheapestUnit: function cheapestUnit(units){
   //var meu = iterable(units).greater(function (unit) { return unit.cost(); });
   var chu;
   var minCost=0;
   for (var i=0;i<units.length;i++){
     if (units[i].cost()>minCost){
       chu=units[i];
       minCost=chu.cost();
     }
   }
   return chu;
 },
 //devuelve un valor relativo a que tan fuerte es una unidad
 unitForce: function unitForce(unit){
   var livingModels = unit.livingModels();
   var attackCount = 0;
   livingModels.forEach(function (model) {
       model.equipments.forEach(function (eq) {
           attackCount += eq.attacks;
       });
     });
     var force = unit.quality*attackCount + unit.defense/2 + unit.cost()/10;
     return force;
     /* //FIXME considerar habilidades
     if (blast(x)){ force+=1*x;}
     if (deadlly){ force+=3;}
     if (poison(x)){ force+=1*x;}
     if (rending){ force+=1;}
     if (sniper){ force+=2;}
     if (isMelee(unit)){
       if (furiuos){ force+= 0.5;}
       if (impact(x)){ force+= 1*x;}
     } else {
       if (linked){ force+=unit.size;}
     }
    */
 },
 //devuelve verdadero si la unit es de las mas fuertes de units
 unitIsStrongest: function unitIsStrongest(units,unit){ //TODO
   var strongest;
   var maxForce=0;
   for (var i=0;i<units.length;i++){
     if (this.unitForce(units[i])>maxForce){
       strongest=units[i];
       maxForce=this.unitForce(strongest);
     }
   }
   return this.unitForce(unit)===maxForce;
   //return unit.cost()===this.mostExpensiveUnit(units).cost();
 },
 classification: function classification(unit){ //FIXME: considerar las habilidades
   if (unit.quality <=2 && unit.defense<=3){
     return "fastAttack";  // si tienen poca defensa y mucha calidad o scouts, strider, flying, fast
   }
   if (unit.defense>=5){
     return "heavySupport"; //tankes o AP(x), regeneration, stealth, tought(x)
   }
   if (unit.size()>=5 && unit.cost()<=130){
     return "troop"; //si son varias unidades y el costo es bajo
   }
   if (unit.maxRange() >=36){
     return "sniper"; //el maxRange es mayor a 36, o indirect, sniper
   }
   return "";
 },
 // devuelve true si la unidad es una de las que tiene el mayor rango de una lista de unidades dada
maxRangeInUnits: function maxRangeInUnits(units,unit){
    var maxRange = iterable(units).map(function (unit) {
      return unit.maxRange();
    }).max(0);
    return unit.maxRange() === maxRange;
  },
 // devuelve true si la unidad es una de las mas faciles de eliminar de una lista de unidades dada
 easiestToKill: function easiestToKill(units,unit){
   var easeToKill = iterable(units).map(function (u) {
     return u.livingModels().length * u.defense;
   }).max(0);
   return unit.livingModels().length * unit.defense === easeToKill;
   /* en realidad deberiamos considerar esto tambien:
   if (regeneration){ easeToKill+=1;}
   if (tought(x)){ easeToKill+=1.5*x;}
   if (stealth){ easeToKill+=0.5;}*/
 },
/*devuelve el porcentaje de modelos destruidos según el resultado esperado
luego de un ataque de disparo realizado por la shooter a la target*/
 expectedResultShooting: function expectedResultShooting(game,shooter,target){
 if (this.canShoot(game,shooter,target,true)){
     var distance = game.terrain.distance(shooter.position, target.position);
     var livingModels = shooter.livingModels();
     var attackCount = 0;
   livingModels.forEach(function (model) {
       model.equipments.forEach(function (eq) {
         if (eq.range >= distance) {
           attackCount += eq.attacks;
         }
       });
     });
     //se calculan los hits
     var diceResult = 0;
     var hits = 0;
     for (var h=0;h<attackCount;h++){
       diceResult = Math.floor(3+Math.random()*4); //o 3 o 4
       if (shooter.quality>diceResult){
         hits += 1;
       }
     }
     //se calculan los blocks
     var blocks = 0;
     for (var b=0;b<hits;b++){
       diceResult = Math.floor(1+Math.random()*6);
       if (target.defense>diceResult){
         blocks += 1;
       }
     }
     //se restan y se calcula el porcentaje
     var wounds = hits - blocks;
     var targetModelsAlive = target.livingModels().length;
     var expectedResult = wounds*100/targetModelsAlive;
     if (expectedResult > 100){
       expectedResult = 100;
     }
     return expectedResult;
   }
   return 0;
   },
/*devuelve el porcentaje de modelos que tendra la unidad defensora respecto a su cantidad
inicial en el juego, luego de un ataque melee realizado por la assaulter a la target*/
  expectedResultAssaulting: function expectedResultAssaulting(game,assaulter,target){
     return 0; //TODO
   },
  willKillShooting: function willKillShooting(game,shooter,target){
    return this.expectedResultShooting(game,shooter,target)===100;
  },
  willWoundALotShooting: function willWoundALotShooting(game,shooter,target){
    return this.expectedResultShooting(game,shooter,target)>75;
  },
  willWoundHalfShooting: function willWoundHalfShooting(game,shooter,target){
    return this.expectedResultShooting(game,shooter,target)>=50;
  },
  willWoundShooting: function willWoundShooting(game,shooter,target){
    return this.expectedResultShooting(game,shooter,target)>0;
  },
  willKillAssaulting: function willKillAssaulting(game,assaulter,target){
    return this.expectedResultAssaulting(game,assaulter,target)===100;
  },
  willWoundALotAssaulting: function willWoundALotAssaulting(game,assaulter,target){
    return this.expectedResultAssaulting(game,assaulter,target)>75;
  },
  willWoundHalfAssaulting: function willWoundHalfAssaulting(game,assaulter,target){
    return this.expectedResultAssaulting(game,assaulter,target)>=50;
  },
  willWoundAssaulting: function willWoundAssaulting(game,assaulter,target){
    return this.expectedResultAssaulting(game,assaulter,target)>0;
  },
  /*Devuelve verdadero si el jugador va acumulando mas puntos de unidades completamente
  destruidas que el oponente.*/
  winning: function winning(game){
    var activePlayer = game.activePlayer();
    var enemyPlayer = game.players[0];
    if (activePlayer === game.players[0]) {
      enemyPlayer = game.players[1];
    }
     return game.scores(activePlayer) > game.scores(enemyPlayer);
  },
  /*Devuelve verdadero si tras la eliminación de la unitX el puntaje del jugador pasa a ser
  menor que el puntaje del oponente.*/
  losingGameByUnitElimination: function losingGameByUnitElimination(game,unit){
    var activePlayer = game.activePlayer();
    var enemyPlayer = game.players[0];
    if (activePlayer === game.players[0]) {
      enemyPlayer = game.players[1];
    }
    return (game.scores(activePlayer) - unit.cost()) < game.scores(enemyPlayer);
  },
  /*Devuelve verdadero si queda al menos una unidad del jugador que no haya sido activada
  esta ronda que al atacar pueda matar (o dejar pinned) a una unidad con puntaje tal que al
  eliminarla el jugador pasaria a ganar. */
  winningActivation: function winningActivation(game,player){
    if (game.round===4){
      var activePlayer = game.activePlayer();
      var enemyPlayer = game.players[0];
      if (activePlayer === game.players[0]) {
        enemyPlayer = game.players[1];
      }
     var toKillUnits = [];
     var enemyUnits = this.livingEnemyUnits(game,player);
     enemyUnits.forEach(function (eu){
       if(game.scores(activePlayer) > (game.scores(enemyPlayer)-eu.cost())){
         toKillUnits.push(eu);
       }
     });
     var possibleUnits = this.possibleUnits(game, player);
     for (i=0; i<possibleUnits.length;i++){
       var pos = possibleUnits[i];
       for (j=0; j<toKillUnits.length;j++){
         var tk = toKillUnits[j];
         if (this.canKill(game,pos,tk)||this.canPin(game,pos,tk)){
           return true;
         }
       }
     }
    }
    return false;
 },
 //	devuelve true si puede dejar pinned a la unidad
 canPin: function canPin(game,assaulter,target){ //FIXME verificar las reglas
  if (this.canAssault(game,assaulter,target)){
    //queda con la mitad o menos de modelos iniciales
    var attackCount = 0;
    var livingModels = assaulter.livingModels();
    livingModels.forEach(function (model) {
      model.equipments.forEach(function (eq) {
        if (eq.range === 0) {
          attackCount += eq.attacks;
        }
      });
    });
    if (attackCount >= (target.size())/2){
      return true;
    }
  }
  return false;
 },
 //si tenes armas de cuerpo a cuerpo con mas ataques que 1 o furiuos o impact(x)
 isMelee: function isMelee(unit){//TODO
   return false;
   /*
  var shootRange = 0;
  var shootAttacks = 0;
  for eq in model.equipments{
    if (eq.range > shootRange){
      shootRange = eq.range;
      shootAttacks = eq.attacks;
    }
  }
  for eq in model.equipments{
    if (eq.range === 0 && eq.attacks >shootAttacks){
      return true;
    }
  }
  for eq in model.equipments{
    if (eq.range === 0 && eq.attacks >1){
      if ("furiuos" in model.specials || "impact(x)" in model.specials){
        return true;
      }
    }
  }
  if (shootRange === 0){
    return true;
  }
  return false;
  */
},

 // ## Rules /////////////////////////////////////////////////////////////////

//-------------------------priority 12 ex16-----------------------------------------
/* si es la ronda final y voy perdiendo, y paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2,
y el coste de X es mayor al de Y2, y el coste de unitX2 es mayor que el de unitX,
y puede asistir a unitX2 entonces asistir*/
rule_12A: playerRule(12, function rule_12A(game, player){
    if (game.round === 3 && !this.winning(game)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundShooting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                  for (var k = 0; k < units.length; k++) {
                    var unitX2 = units[k];
                    if (unitX2.cost()>unitX.cost()&&this.canAssist(game,player,unitX,unitX2)){
                     //console.log("rule_12A. assist");
                     return this.assist(game,player,unitX,unitX2);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy perdiendo, y queda activacion ganadora y no paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX no puede escapar, entonces asaltar a unitY2, */
/*rule_12B: playerRule(12, function rule_12B(game, player){ //FIXME assault
    if (game.round === 3 && !this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&!this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_12B. assault");
                   return this.assault(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),*/
/* si es la ronda final y voy perdiendo, y queda activacion ganadora y no paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX puede escapar, entonces escapa, */
rule_12C: playerRule(12, function rule_12C(game, player){ //FIXME assault
    if (game.round === 3 && !this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_12C. scape");
                   return this.scape(game,player,unitX);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy perdiendo, y queda una activacion ganadora
 si pueden matar a unitX y van a herirla, si unitX puede matar y va a herir,
 si el costo de unitX es mayor al del que puede mata,
 y la unitX no puede escapar entonces entonces ataca a unitY2*/
rule_12D: playerRule(12, function rule_12D(game, player){
    if (game.round === 3 && !this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&!this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundShooting(game,unitX,unitY2)&&this.canKill(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_12D. shoot");
                   return this.shoot(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
//-------------------------priority 11 ex15-----------------------------------------
/* si es la ronda final y voy perdiendo,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX puede escapar, entonces escapa, */
rule_11A: playerRule(11, function rule_11A(game, player){
    if (game.round === 3 && !this.winning(game)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_11A. scape");
                   return this.scape(game,player,unitX);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy ganando, y queda activacion ganadora,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX puede escapar, entonces escapa, */
rule_11B: playerRule(11, function rule_11B(game, player){
    if (game.round === 3 && this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_11B. scape");
                   return this.scape(game,player,unitX);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy ganando, y queda activacion ganadora,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y no unitX puede escapar, entonces asalta a Y2, */ //FIXME assault
/*rule_11C: playerRule(11, function rule_11C(game, player){
    if (game.round === 3 && this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&!this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_11C. assault");
                   return this.assault(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),*/
/* si es la ronda final y voy perdiendo, y no queda activacion ganadora y no paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, entonces asalta, */ //FIXME assault
/*rule_11D: playerRule(11, function rule_11D(game, player){
    if (game.round === 3 && this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.possibleUnits(game, player);
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        if (this.canBeKilled(game,player,unitX)&&!this.losingGameByUnitElimination(game,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyUnits.length; j2++) {
                var unitY2 = enemyUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   //console.log("rule_11D. assault");
                   return this.assault(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),*/
//-------------------------priority 10 ex12-----------------------------------------
/*si ronda = 1 y this.unitIsStrongest(enemyUnits,unitY) y this.willWoundHalfAssaulting(game,unitX,unitY)
y this.isMelee(unitX) entonces this.assault(unitX,unitY)*/
/*rule_10A: playerRule(10, function rule_10A(game, player){//FIXME assault
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.isMelee(unitX)){
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.unitIsStrongest(enemyUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
             //console.log("rule_10A. assault");
             return this.assault(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),*/
/*si ronda = 2 y this.unitIsStrongest(enemyUnits,unitY) y this.willWoundHalfAssaulting(game,unitX,unitY)
y this.isMelee(unitX) entonces this.assault(unitX,unitY)*/
/*rule_10B: playerRule(10, function rule_10B(game, player){//FIXME assault
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.isMelee(unitX)){
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.unitIsStrongest(enemyUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
             //console.log("rule_10B. assault");
             return this.assault(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),*/


//-------------------------priority 9 ex11-----------------------------------------
/*si ronda = 2 y this.easiestToKill(enemyUnits,unitY) y
this.willWoundHalfAssaulting(game,unitX,unitY)
entonces this.assault(unitX,unitY)*/
/*rule_9A: playerRule(9, function rule_9A(game, player){ //FIXME assault
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.easiestToKill(enemyUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
           //console.log("rule_11A. assault");
           return this.assault(unitX,unitY);
        }
      }
    }
  }
 return null;
}),*/
/*si ronda = 1 y this.easiestToKill(enemyUnits,unitY) y this.willWoundHalfAssaulting(game,unitX,unitY)
entonces this.assault(unitX,unitY)*/
/*rule_9B: playerRule(9, function rule_9B(game, player){//FIXME assault
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.easiestToKill(enemyUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
           //console.log("rule_9B. assault");
           return this.assault(unitX,unitY);
        }
      }
    }
  }
 return null;
}),*/






//-------------------------priority 8-----------------------------------------
/*si ronda = 3 y !this.canBeKilled(game,player,unitX) y this.winning(game) y
unitX2.cost()>unitX.cost() y !this.canAssist(game,player,unitX,unitX2) y
this.willKillShooting(game,unitX,unitY) y unitY.cost() === this.mostExpensiveUnit(enemyUnits).cost()
entonces this.shoot(unitX,unitY)*/
rule_8A: playerRule(8, function rule_8A(game, player){
  if (game.round === 3&&this.winning(game)){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (!this.canBeKilled(game,player,unitX)){
        for (var k=0; k<units.length;k++){
          var unitX2 = units[k];
          if (unitX2.cost()>unitX.cost()&&!this.canAssist(game,player,unitX,unitX2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willKillShooting(game,unitX,unitY)&&unitY.cost()===this.mostExpensiveUnit(enemyUnits).cost()){
                 //console.log("rule_8A. shoot");
                 return this.shoot(unitX,unitY);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitY2.cost() y this.winning(game)
 y entonces this.shoot(unitX,unitY2)*/
rule_8B: playerRule(8, function rule_8B(game, player){
  if (game.round === 3 && this.winning(game)){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (unitX.cost()<unitY2.cost()&&this.canKill(game,unitX,unitY2)&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 //console.log("rule_8B. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.willWoundShooting(game,unitX,unitY2) y unitX.cost()>unitY2.cost() y unitX.cost()<unitX2.cost()
y this.canAssist(game,player,unitX,unitX2) entonces this.assist(game,player,unitX,unitX2)*/
rule_8C: playerRule(8, function rule_8C(game, player){
  if (game.round === 3&&this.winning(game)){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<units.length;k++){
          var unitX2 = units[k];
          if (unitX.cost()<unitX2.cost()&&this.canAssist(game,player,unitX,unitX2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                for (var j2=0; j2<enemyUnits.length; j2++){
                  var unitY2 = enemyUnits[j2];
                  if (this.willWoundShooting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                    //console.log("rule_8C. assist");
                    return this.assist(game,player,unitX,unitX2);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
//-------------------------priority 7-----------------------------------------
/*si ronda = 3 y !this.canBeKilled(game,player,unitX) y unitX2.cost()>unitX.cost()
y this.canWound(game,unitX,unitY) y this.easiestToKill(enemyUnits,unitY) entonces this.shoot(unitX,unitY)*/
rule_7A: playerRule(7, function rule_7A(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (!this.canBeKilled(game,player,unitX)){
        for (var k=0; k<units.length;k++){
          var unitX2 = units[k];
          if (unitX2.cost()>unitX.cost()){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.easiestToKill(enemyUnits,unitY)&&this.canWound(game,unitX,unitY)){
                 //console.log("rule_7A. shoot");
                 return this.shoot(unitX,unitY);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX)
y puntaje(unidadY2) = maxEnemigos y this.canKill(game,unitX,unitY2) y
this.willWoundShooting(game,unitX,unitY2) entonces this.shoot(unitX,unitY2)*/
rule_7B: playerRule(7, function rule_7B(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (unitY2.cost()===this.mostExpensiveUnit(enemyUnits).cost()&&this.canKill(game,unitX,unitY2)&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 //console.log("rule_7B. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.canKill(game,unitX,unitY2) y this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitY2.cost()
entonces this.shoot(unitX,unitY2)*/
rule_7C: playerRule(7, function rule_7C(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (unitX.cost()<unitY2.cost()&&this.canKill(game,unitX,unitY2)&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 //console.log("rule_7C. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitY2.cost() y !this.winning(game)
entonces this.shoot(unitX,unitY2)*/
rule_7D: playerRule(7, function rule_7D(game, player){
  if (game.round === 3 && !this.winning(game)){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (unitX.cost()<unitY2.cost()&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 //console.log("rule_7D. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
!this.willWoundShooting(game,unitX,unitY2) y puntaje(unidadX) <puntaje(unidadX2)
y this.canAssist(game,player,unitX,unitX2) entonces this.assist(game,player,unitX,unitX2)*/
rule_7E: playerRule(7, function rule_7E(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (!this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                for (h=0;h<units.length;h++){
                  if (unitX.cost()<unitX2.cost()&&this.canAssist(game,player,unitX,unitX2)){
                    //console.log("rule_7E. assist");
                    return this.assist(game,player,unitX,unitX2);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
!this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitX2.cost()
y !this.canAssist(game,player,unitX,unitX2) y puede escapar unitX entonces this.scape(game,player,unitX)*/
rule_7F: playerRule(7, function rule_7F(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (!this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                for (h=0;h<units.length;h++){
                  if (unitX.cost()<unitX2.cost()&&!this.canAssist(game,player,unitX,unitX2)){
                    //console.log("rule_7F. scape");
                    return this.scape(game,player,unitX);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
//-------------------------priority 6-----------------------------------------
/*si ronda = 3 y !this.canBeKilled(game,player,unitX) y
dentro de las que puede matar, disparar a la mas cara*/
rule_6A: playerRule(6, function rule_6A(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootingKillableUnits(game,player,unitX);
      if (!this.canBeKilled(game,player,unitX)){
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (unitY.cost()===this.mostExpensiveUnit(enemyUnits).cost()){
             //console.log("rule_6A. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y pueden matar a unitX y van a herirla, y unitX va a herir,
si su costo es menor que el del enemigo, entonces disparale*/
rule_6B: playerRule(6, function rule_6B(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    var enemyUnits = this.livingEnemyUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var shootingKillableUnits = this.shootingKillableUnits(game,player,unitX);
      if (this.canBeKilled(game,player,unitX)){
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.willWoundShooting(game,unitY,unitX)){
            for (var k=0; k<shootingKillableUnits.length; k++){
              var unitY2 = shootingKillableUnits[k];
              if (unitX.cost()>unitY2.cost()&&this.willWoundShooting(game,unitX,unitY2)){
                 //console.log("rule_6B. shoot");
                 return this.shoot(unitX,unitY);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y pueden matar a unitX y van a herirla,
si puede escapar, entonces escapar */
rule_6C: playerRule(6, function rule_6C(game, player){
  if (game.round === 3){
    var possibleUnits = this.possibleUnits(game, player);
    var enemyUnits = this.livingEnemyUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.willWoundShooting(game,unitY,unitX)){
            if (this.canScape(game,player,unitX)){
               //console.log("rule_6C. scape");
               return this.scape(game,player,unitX);
            }
          }
        }
      }
    }
  }
 return null;
}),
//-------------------------priority 5-----------------------------------------
/*si es la ronda 0 y la unidad puede matar disparando, y va a herir >75%, disparar*/
rule_5A: playerRule(5, function rule_5A(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKillShooting(game,unitX,unitY) && this.willWoundALotShooting(game,unitX,unitY)){
           //console.log("rule_5A. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 1 y la unidad puede matar disparando, y va a herir >75%, disparar*/
rule_5B: playerRule(5, function rule_5B(game, player){
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKillShooting(game,unitX,unitY) && this.willWoundALotShooting(game,unitX,unitY)){
           //console.log("rule_5B. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 2 y la unidad puede matar disparando, y va a herir >75%, disparar*/
rule_5C: playerRule(5, function rule_5C(game, player){
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKillShooting(game,unitX,unitY) && this.willWoundALotShooting(game,unitX,unitY)){
           //console.log("rule_5C. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 1 y la unidad esta herida, la pueden matar
y va a herirla a la que la puede matar, entonces disparar*/
rule_5D: playerRule(5, function rule_5D(game, player){
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKill(game,unitY,unitX) && this.willWoundShooting(game,unitX,unitY)){
           //console.log("rule_5D. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 2 y la unidad esta herida, la pueden matar
y va a herirla a la que la puede matar, entonces disparar*/
rule_5E: playerRule(5, function rule_5E(game, player){
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKill(game,unitY,unitX) && this.willWoundShooting(game,unitX,unitY)){
           //console.log("rule_5E. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 1 y la unidad esta herida, la pueden matar y puede escapar, entonces escapar*/
rule_5F: playerRule(5, function rule_5F(game, player){
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKill(game,unitY,unitX) && this.canScape(game,player,unitX)){
           //console.log("rule_5F. scape");
           return this.scape(game,player,unitX);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 2 y la unidad esta herida, la pueden matar y puede escapar, entonces escapar*/
rule_5G: playerRule(5, function rule_5G(game, player){
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.canKill(game,unitY,unitX) && this.canScape(game,player,unitX)){
           //console.log("rule_5G. scape");
           return this.scape(game,player,unitX);
        }
      }
    }
  }
 return null;
}),
/*




 //-------------------------priority 4-----------------------------------------
 /*si es la ronda 0 y la unidad puede matar disparando, disparar*/
 rule_4A: playerRule(4, function rule_4A(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyUnits = this.shootableUnits(game, player, unitX);
       for (var j=0; j<enemyUnits.length; j++){
         var unitY = enemyUnits[j];
         if (this.canKillShooting(game,unitX,unitY)){
            //console.log("rule_4A. shoot");
            return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 rule_4B: playerRule(4, function rule_4B(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyUnits = this.shootableUnits(game, player, unitX);
       for (var j=0; j<enemyUnits.length; j++){
         var unitY = enemyUnits[j];
         if (this.canKillShooting(game,unitX,unitY)){
            //console.log("rule_4B. shoot");
            return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 rule_4C: playerRule(4, function rule_4C(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyUnits = this.shootableUnits(game, player, unitX);
       for (var j=0; j<enemyUnits.length; j++){
         var unitY = enemyUnits[j];
         if (this.canKillShooting(game,unitX,unitY)){
            //console.log("rule_4C. shoot");
            return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 /*si es ultima ronda, va ganando, no pueden matar a unitX, hay una unidad aliada unitX2
  que cuesta mas que unitX, y unitX puede asistirla, hacerlo*/
 rule_4D: playerRule(4, function rule_4D(game, player){
     if (game.round === 3 && this.winning(game)){
       var possibleUnits = this.possibleUnits(game, player);
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         if (!this.canBeKilled(game,player,unitX)){
           for (var k = 0; k < units.length; k++) {
             var unitX2 = units[k];
             if (unitX2.cost()>unitX.cost()&&this.canAssist(game,player,unitX,unitX2)){
              //console.log("rule_4D. assist");
              return this.assist(game,player,unitX,unitX2);
             }
           }
         }
       }
     }
  return null;
 }),
 /*si es ultima ronda, va ganando, no pueden matar a unitX, hay una unidad aliada unitX2
que cuesta mas, que unitX no puede asistirla, dentro de las unidades heridas enemigas,
disparar a la mas facil de matar*/
 rule_4E: playerRule(4, function rule_4E(game, player){
   if (game.round === 3 && this.winning(game)){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!this.canBeKilled(game,player,unitX)){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j=0; j<enemyUnits.length; j++){
           var unitY = enemyUnits[j];
           if (this.canWound(game,unitX,unitY) && this.easiestToKill(enemyUnits,unitY)){
             for (var k = 0; k < units.length; k++) {
               var unitX2 = units[k];
               if (unitX2.cost()>unitX.cost()&&!this.canAssist(game,player,unitX,unitX2)){
                  //console.log("rule_4E. shoot");
                  return this.shoot(unitX,unitY);
               }
             }
           }
         }
       }
     }
   }
  return null;
 }),


 //-------------------------priority 3-----------------------------------------
   /*si es la ronda 0 y la unidad es sniper, disparar a la mas fuerte*/
   rule_3A: playerRule(3, function rule_3A(game, player){
     if (game.round === 0){
       var possibleUnits = this.possibleUnits(game, player);
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j=0; j<enemyUnits.length; j++){
           var unitY = enemyUnits[j];
           if (this.classification(unitX)==="sniper" && this.unitIsStrongest(enemyUnits,unitY)){
              //console.log("rule_3A. shoot");
              return this.shoot(unitX,unitY);
           }
         }
       }
     }
    return null;
   }),
   /*si es la ronda 0 y la q tiene mayor rango, disparar a la mas fuerte*/
   rule_3B: playerRule(3, function rule_3B(game, player){
     if (game.round === 0){
       var possibleUnits = this.possibleUnits(game, player);
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j=0; j<enemyUnits.length; j++){
           var unitY = enemyUnits[j];
           if (this.maxRangeInUnits(possibleUnits,unitX) && this.unitIsStrongest(enemyUnits,unitY)){
              //console.log("rule_3B. shoot");
              return this.shoot(unitX,unitY);
           }
         }
       }
     }
    return null;
   }),
   /*si es la ronda 0, si hay una unidad aliada herida y puede asistirla, asistirla*/
   rule_3C: playerRule(3, function rule_3C(game, player){
     if (game.round === 0){
       var possibleUnits = this.possibleUnits(game, player);
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
              //console.log("rule_3C. assist");
              return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
    return null;
   }),
   /*si es la ronda 1, si hay una unidad aliada herida y puede asistirla, asistirla*/
   rule_3D: playerRule(3, function rule_3D(game, player){
     if (game.round === 1){
       var possibleUnits = this.possibleUnits(game, player);
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
              //console.log("rule_3D. assist");
              return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
    return null;
   }),
   /*si es la ronda 2, si hay una unidad aliada herida y puede asistirla, asistirla*/
   rule_3E: playerRule(3, function rule_3E(game, player){
     if (game.round === 2){
       var possibleUnits = this.possibleUnits(game, player);
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_3E. assist");
              return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
    return null;
   }),
/*en la ronda 3, si hay una unidad aliada que cueste mas que unitX y puede asistirla,
   y no pueden matar a unitX, entonces asistir a la aliada*/
   rule_3F: playerRule(3, function rule_F(game, player){
     if (game.round === 3){
       var possibleUnits = this.possibleUnits(game, player);
       var enemyUnits = this.livingEnemyUnits(game, player);
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (unitX2.cost()>unitX.cost() && this.canAssist(game,player,unitX,unitX2)){
             for (var k=0; k<enemyUnits.length;k++){
               var unitY = enemyUnits[k];
               if(!this.canKill(game,unitY,unitX)){
                 //console.log("rule_3F. assist");
                 return this.assist(game,player,unitX,unitX2);
               }
             }
           }
         }
       }
     }
    return null;
   }),
   /*si es la ronda 0 y hay al menos 2 unidades enemigas vivas, disparar a la mas cara*/
   rule_3G: playerRule(3, function rule_3G(game, player){
     var possibleUnits = this.possibleUnits(game, player);
     if (game.round === 0){
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         var enemyUnits = this.shootableUnits(game, player, unitX);
         if (enemyUnits.length>1){
           for (var j = 0; j < enemyUnits.length; j++) {
             var unitY = enemyUnits[j];
             if (unitY.cost() === this.mostExpensiveUnit(enemyUnits).cost()){
               //console.log("rule_3G. shoot");
               return this.shoot(unitX,unitY);
             }
           }
         }
       }
     }
     return null;
   }),
/*si ronda = 2 y cantidad(unitX2) < cantidadInicial(unitX2) y
   puedeAsistir(unitX a unitX2) entonces asiste(unitX a unitX2)*/
rule_3H: playerRule(3, function rule_3H(game, player){
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < units.length; j++) {
        var unitX2 = units[j];
        if (unitX2.livingModels().length<unitX2.size() && this.canAssist(game,player,unitX,unitX2)){
          //console.log("rule_3H. assist");
           return this.assist(game,player,unitX,unitX2);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 1 y cantidad(unitX2) < cantidadInicial(unitX2) y
puedeAsistir(unitX a unitX2) entonces asiste(unitX a unitX2)*/
rule_3I: playerRule(3, function rule_3I(game, player){
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < units.length; j++) {
        var unitX2 = units[j];
        if (unitX2.livingModels().length<unitX2.size() && this.canAssist(game,player,unitX,unitX2)){
          //console.log("rule_3I. assist");
           return this.assist(game,player,unitX,unitX2);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 0 y cantidad(unitX2) < cantidadInicial(unitX2) y
puedeAsistir(unitX a unitX2) entonces asiste(unitX a unitX2)*/
rule_3J: playerRule(3, function rule_3J(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < units.length; j++) {
        var unitX2 = units[j];
        if (unitX2.livingModels().length<unitX2.size() && this.canAssist(game,player,unitX,unitX2)){
          //console.log("rule_3J. assist");
          return this.assist(game,player,unitX,unitX2);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 0 y fuerza(unidadY) = maxEnemigos y puedeAtacarSinCaminar(unitX a
unidadY) entonces dispara(unitX a unidadY)*/
rule_3K: playerRule(3, function rule_3K(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player,unitX);
      //console.log(enemyUnits);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
          if (this.canShoot(game,unitX,unitY,false) && this.unitIsStrongest(enemyUnits,unitY)){
           //console.log("rule_3K. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*
Si es la primer ronda, la unitX va a herir a la unidad más fuerte enemiga si le dispara,
 entonces dispararle.
*/
rule_3L: playerRule(3, function rule_3L(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1].concat(this.armiesAndUnits[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player,unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(units,unitY)){
           //console.log("rule_3L. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3M: playerRule(3, function rule_3M(game, player){
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game,player,unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(enemyUnits,unitY)){
           //console.log("rule_3M. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3N: playerRule(3, function rule_3N(game, player){
  if (game.round === 1){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1].concat(this.armiesAndUnits(game,player)[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player,unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(units,unitY)){
           //console.log("rule_3N. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3O: playerRule(3, function rule_3O(game, player){
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player,unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(enemyUnits,unitY)){
           //console.log("rule_3O. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3P: playerRule(3, function rule_3P(game, player){
  if (game.round === 2){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player,unitX);
      for (var j=0; j<enemyUnits.length; j++){
        var unitY = enemyUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.easiestToKill(enemyUnits,unitY)){
           //console.log("rule_3P. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3Q: playerRule(3, function rule_3Q(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.classification(unitX)==="troop"){
        var enemyUnits = this.shootableUnits(game, player,unitX);
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.willWoundShooting(game,unitX,unitY)&&this.unitIsStrongest(enemyUnits,unitY)){
             //console.log("rule_3Q. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
rule_3R: playerRule(3, function rule_3R(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (unitX.cost() === this.cheapestUnit(units).cost()){
        var enemyUnits = this.shootableUnits(game, player,unitX);
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.willWoundShooting(game,unitX,unitY)&&this.unitIsStrongest(enemyUnits,unitY)){
             //console.log("rule_3R. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
rule_3S: playerRule(3, function rule_3S(game, player){
  if (game.round === 0){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1].concat(this.armiesAndUnits(game,player)[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.classification(unitX)==="troop"){
        var enemyUnits = this.shootableUnits(game, player,unitX);
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (this.willWoundShooting(game,unitX,unitY)&&this.unitIsStrongest(units,unitY)){
             //console.log("rule_3S. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
/*
Si la unitX va a herir a la unidad más fuerte enemiga si le dispara,
y una unidad aliada está herida entonces asistirla.
*/
rule_3T: playerRule(3, function rule_3T(game, player){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var armiesAndUnits = this.armiesAndUnits(game,player);
    var units = armiesAndUnits[1];
    var allUnits = units.concat(armiesAndUnits[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var k = 0; k < units.length; k++) {
        var unitX2 = units[k];
        if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
          var enemyUnits = this.shootableUnits(game, player,unitX);
          for (var j=0; j<enemyUnits.length; j++){
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(allUnits,unitY)){
               //console.log("rule_3T. assist");
               return this.assist(game,player,unitX,unitX2);
            }
          }
        }
      }
    }
 return null;
}),

 //-------------------------priority 2-----------------------------------------
 /*si es la ronda 0 y el enemigo esta herido, asaltar a ese enemigo*/ //FIXME assault
  /*rule_2A: playerRule(2, function rule_2A(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyUnits = this.assaultableUnits(game,player,unitX);
       for (var j = 0; j < enemyUnits.length; j++) {
         var unitY = enemyUnits[j];
          if (this.wounded(unitY)){
            //console.log("rule_2A. assault");
            return this.assault(unitX,unitY);
          }
       }
     }
   }
   return null;
 }),*/
 /*si es la ronda 0, y la unidad es fastAttack, disparar a lo que pueda disparar*/
 rule_2B: playerRule(2, function rule_2B(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="fastAttack"){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           //console.log("rule_2B. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
  /*si es la ronda 1, y la unidad es fastAttack, disparar a lo que pueda disparar*/
 rule_2C: playerRule(2, function rule_2C(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="fastAttack"){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           //console.log("rule_2C. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
  /*si es la ronda 2, y la unidad es fastAttack, disparar a lo que pueda disparar*/
 rule_2D: playerRule(2, function rule_2D(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="fastAttack"){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           //console.log("rule_2D. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 /*si es la ronda 0, y la unidad es heavySupport, asistir a lo que pueda asistir, que ya haya jugado*/
 rule_2E: playerRule(2, function rule_2E(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2E. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 0, y la unidad es heavySupport, asistir a lo que pueda asistir*/
 rule_2F: playerRule(2, function rule_2F(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2F. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 1, y la unidad es heavySupport, asistir a lo que pueda asistir, que ya haya jugado*/
 rule_2G: playerRule(2, function rule_2G(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2G. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 1, y la unidad es heavySupport, asistir a lo que pueda asistir*/
 rule_2H: playerRule(2, function rule_2H(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2H. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 2, y la unidad es heavySupport, asistir a lo que pueda asistir, que ya haya jugado*/
 rule_2I: playerRule(2, function rule_2I(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2I. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 2, y la unidad es heavySupport, asistir a lo que pueda asistir*/
 rule_2J: playerRule(2, function rule_2J(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2J. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 0, y la unidad es troop, asistir a lo que pueda asistir, que ya haya jugado*/
 rule_2K: playerRule(2, function rule_2K(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2K. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 0, y la unidad es troop, asistir a lo que pueda asistir*/
 rule_2L: playerRule(2, function rule_2L(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2L. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 1, y la unidad es troop, asistir a lo que pueda asistir, que ya haya jugado*/
 rule_2M: playerRule(2, function rule_2M(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2M. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 1, y la unidad es troop, asistir a lo que pueda asistir*/
 rule_2N: playerRule(1, function rule_2N(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2N. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 2, y la unidad es troop, asistir a lo que pueda asistir, que ya haya jugado*/
 rule_2O: playerRule(2, function rule_2O(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2O. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 2, y la unidad es troop, asistir a lo que pueda asistir*/
 rule_2P: playerRule(2, function rule_2P(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             //console.log("rule_2P. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),

 /*si es la ronda 0, y la unidad es sniper, disparar a lo que pueda disparar*/
 rule_2Q: playerRule(2, function rule_2Q(game, player){
   if (game.round === 0 ){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="sniper"){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           //console.log("rule_2Q. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 1, y la unidad es sniper, disparar a lo que pueda disparar*/
 rule_2R: playerRule(2, function rule_2R(game, player){
   if (game.round === 1 ){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="sniper"){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           //console.log("rule_2R. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),
 /*si es la ronda 2, y la unidad es sniper, disparar a lo que pueda disparar*/
 rule_2S: playerRule(2, function rule_2S(game, player){
   if (game.round === 2 ){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="sniper"){
         var enemyUnits = this.shootableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           //console.log("rule_2S. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),

 //-------------------------priority 1-----------------------------------------
 // si es la primer ronda y puede escaparse que se escape.
 rule_1A: playerRule(1, function rule_1A(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.canScape(game,player,unitX)){
           //console.log("rule_1A. scape");
           return this.scape(game,player,unitX);
       }
     }
   }
   return null;
 }),
 // si es la segunda ronda y puede escaparse que se escape.
 rule_1B: playerRule(1, function rule_1B(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.canScape(game,player,unitX)){
         //console.log("rule_1B. scape");
           return this.scape(game,player,unitX);
       }
     }
   }
   return null;
 }),
 // si es la tercer ronda y puede disparar que dispare.
 rule_1C: playerRule(1, function rule_1C(game, player){
   if (game.round === 2){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyUnits = this.shootableUnits(game, player, unitX);
       for (var j = 0; j < enemyUnits.length; j++) {
         var unitY = enemyUnits[j];
         //console.log("rule_1C. shoot");
         return this.shoot(unitX,unitY);
       }
     }
   }
   return null;
 }),
 // si es la cuarta ronda y puede asaltar que asalte.
 /*rule_1D: playerRule(1, function rule_1D(game, player){ //FIXME assault
   if (game.round === 3){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyUnits = this.assaultableUnits(game, player, unitX);
       for (var j = 0; j < enemyUnits.length; j++) {
         var unitY = enemyUnits[j];
         //console.log("rule_1D. assault");
         return this.assault(unitX,unitY);
       }
     }
   }
   return null;
 }),*/
 // si puede disparar a algo, disparar
 rule_1E: playerRule(1, function rule_1E(game, player){
   var possibleUnits = this.possibleUnits(game, player);
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     var enemyUnits = this.shootableUnits(game, player, unitX);
     for (var j = 0; j < enemyUnits.length; j++) {
       var unitY = enemyUnits[j];
       //console.log("rule_1E. shoot");
       return this.shoot(unitX,unitY);
     }
   }
   return null;
 }),
 // si no puede disparar a nada, moverse
 rule_1F: playerRule(1, function rule_1F(game, player){
   var enemyUnits = this.livingEnemyUnits(game, player),
     possibleUnits = this.possibleUnits(game, player);
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     if (this.shootableUnits(game, player, unitX).length==0){
       for (var k=0; k<enemyUnits.length;k++){
         var eu = enemyUnits[k];
         if (this.easiestToKill(enemyUnits,eu)){
           //console.log("rule_1F. move");
           return this.getCloseTo(game,unitX,eu);
         }
       }
     }
   }
   return null;
 })

}); // declare DynamicScriptingPlayer



//Reglas para ver q se elija lo de mas prioridad.

 /*rule_infinityA: playerRule(8, function rule_infinityA(game, player){
   var possibleUnits = this.possibleUnits(game, player);
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
       var enemyUnits = this.shootableUnits(game, player, unitX);
       for (var j = 0; j < enemyUnits.length; j++) {
         var unitY = enemyUnits[j];
         return this.shoot(unitX,unitY);
       }
     }
   }
   return null;
 }),
 rule_infinityB: playerRule(8, function rule_infinityB(game, player){
   var possibleUnits = this.possibleUnits(game, player);
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
       var enemyUnits = this.shootableUnits(game, player, unitX);
       for (var j = 0; j < enemyUnits.length; j++) {
         var unitY = enemyUnits[j];
         return this.shoot(unitX,unitY);
       }
     }
   }
   return null;
 }),

 // regla solo para que se escapen siempre
 rule_ZA: playerRule(10, function rule_ZA(game, player){
   var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var dangerousUnits = this.dangerousUnits(game,player,unitX);
       if (dangerousUnits.length>0){
         //console.log("rule_ZA");
         return this.scape(game,player,unitX);
       }
     }
     return null;
 }),
 */


exports.Renderer = declare({
	constructor: function Renderer(canvas) {
		canvas = this.canvas = canvas || document.getElementById('wargame-canvas');
		var ctx = this.ctx = canvas.getContext('2d');
		ctx.fillStyle = 'white';
	},

	renderScope: function renderScope(width, height, block) {
		var canvas = this.canvas,
			ctx = this.ctx;
		ctx.save();
		ctx.scale(canvas.width / width, canvas.height / height);
		try {
			block.call(this, ctx);
		} finally {
			ctx.restore();
		}
	},

	render: function render(wargame) {
		var terrain = wargame.terrain;
		this.renderScope(terrain.width, terrain.height, function (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for (var x = 0, width = terrain.width; x < width; x++) {
				for (var y = 0, height = terrain.height; y < height; y++) {
					if (!terrain.isPassable([x, y])) {
						this.drawSquare(x, y, 1, 1, "black");
					} else {
						this.drawSquare(x, y, 1, 1, "#CCCCCC");
					}
				}
			}
			var renderer = this,
				armies = wargame.armies;
			ctx.strokeStyle = 'black';
			ctx.font = "1px Arial";
			for (var team in armies) {
				armies[team].units.forEach(function (unit) {
					if (!unit.isDead()){
						renderer.drawSquare(unit.position[0], unit.position[1], 1, 1, unit.army.player);
						ctx.fillStyle = 'black';
						ctx.fillText(unit.id, unit.position[0], unit.position[1]);
					}
				});
			}
		});
	},
	renderPath: function renderPath(wargame,path,color) {
		var terrain = wargame.terrain;
		this.renderScope(terrain.width, terrain.height, function (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for (var x = 0, width = terrain.width; x < width; x++) {
				for (var y = 0, height = terrain.height; y < height; y++) {
					if (!terrain.isPassable([x, y])) {
						this.drawSquare(x, y, 1, 1, "black");
					} else {
						this.drawSquare(x, y, 1, 1, "#CCCCCC");
					}
				}
			}
			var renderer = this,
				armies = wargame.armies;
			ctx.strokeStyle = 'black';
			ctx.font = "1px Arial";
			for (var team in armies) {
				armies[team].units.forEach(function (unit) {
					if (!unit.isDead()){
						renderer.drawSquare(unit.position[0], unit.position[1], 1, 1, unit.army.player);
						ctx.fillStyle = 'black';
						ctx.fillText(unit.id, unit.position[0], unit.position[1]);
					}
				});
			}
			for (var move in path) {
			
				renderer.drawSquare(path[move].x, path[move].y, 1, 1, color || 'red');
				
			}
		});
	},

	renderSight: function renderSight(wargame, unit) {
		unit = unit || wargame.__activeUnit__;
		if (unit) {
			var terrain = wargame.terrain;
			this.renderScope(terrain.width, terrain.height, function (ctx) {
				var range = unit.maxRange(),
				 	sight = terrain.areaOfSight(unit, range),
					alpha, pos;
				for (var p in sight) {
					alpha = (1 - sight[p] / range) * 0.8 + 0.2;
					pos = p.split(',');
					this.drawSquare(+pos[0], +pos[1], 1, 1, 'rgba(255,255,0,'+ alpha +')');
				}
			});
		}
	},
	renderMoves : function renderMoves(wargame,moves){
		
				var renderer = this,
					canvas = this.canvas,
					ctx = this.ctx,
					terrain = wargame.terrain,
					world = terrain.world;
				this.render(wargame);
				ctx.save();
				ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);
		
				for (var army in moves){
					moves[army].forEach(function (move){
						if (move.constructor==MoveAction){
							ctx.save();
							ctx.fillStyle = '#32CD32';
							ctx.beginPath();
							ctx.arc(move.position[0], move.position[1],1, 0, 2 * Math.PI);
							ctx.fill();
							ctx.restore();
						}
					});
				}
				ctx.restore();
		},

	drawSquare: function drawSquare(x, y, height, width, color){
		var ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.fillRect(x, y, 1, 1);
	},
	renderInfluence: function renderInfluence(wargame,grid){
		
		var terrain = wargame.terrain;
		this.renderScope(terrain.width, terrain.height, function (ctx) {
			var w=grid.length,
			h=grid[0].length,
			renderer = this,
			canvas = this.canvas,
			terrain = wargame.terrain,
			world = terrain.world,
			value,
			min=Number.POSITIVE_INFINITY,
			max=Number.NEGATIVE_INFINITY,
			absMax,
			opacity,x,y,
			width = terrain.width,
			height = terrain.height;
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for ( x = 0, width; x < width; x++) {
				for ( y = 0, height; y < height; y++) {
					if (!terrain.isPassable([x, y])) {
						this.drawSquare(x, y, 1, 1, "black");
					} else {
						this.drawSquare(x, y, 1, 1, "#CCCCCC");
					}
				}
			}
			for ( x=0; x<w;x++){
				for ( y=0; y<h;y++){
					if (!isNaN(grid[x][y])){
						max= Math.max(max,grid[x][y]);
						min= Math.min(min,grid[x][y]);
					}
				}
			}
		absMax= Math.max(max,Math.abs(min));
			for ( x=0; x<w;x++){
				for ( y=0; y<h;y++){
					value=grid[x][y];
					if (value =="t" ){
						this.drawSquare(x,y,1,1,"black");
					}
					else if (value >0 ){
						opacity = value / absMax;
						this.drawSquare(x,y,1,1,"rgba(255,0,0,"+opacity+")" );
					}
					else if (value <0 ){
						opacity = -value / absMax;
						this.drawSquare(x,y,1,1,"rgba(0,0,255,"+opacity+")");
					}
				}
			}
		});
	},

////////////////////////////////////////////////////////////////////////////////////////////////////
/*
	render2: function render2(wargame) {
		var renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			terrain = wargame.terrain,
			world = terrain.world;
		terrain.addArmiesToWorld(wargame);
		ctx.save();
		ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		world.bodies.forEach(function (body) {
			switch (body.shapes[0].type){
				case 1:
					renderer.drawCircle(body);
					break;
				case 8:
					renderer.drawBox(body);
					break;
			}
		});
		ctx.restore();
	},
	renderMoves : function renderrenderMoves(wargame,moves){

		var renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			terrain = wargame.terrain,
			world = terrain.world;
		this.renderGrid(wargame.terrain.terrain);
		ctx.save();
		ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);

		for (var army in moves){
			moves[army].forEach(function (move){
				if (move.constructor==MoveAction){
					ctx.save();
					ctx.fillStyle = '#32CD32';
					ctx.beginPath();
					ctx.arc(move.position[0], move.position[1],1, 0, 2 * Math.PI);
					ctx.fill();
					ctx.restore();
				}
			});
		}
		ctx.restore();
	},
	drawCircle: function drawCircle(body) {
		var ctx = this.ctx;
		ctx.beginPath();
		var x = body.position[0],
			y = body.position[1];
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(body.interpolatedAngle);//FIXME
		ctx.fillStyle = {
			Blue: 'blue', Red: 'red', Terrain: 'black'
		}[body.team];
		ctx.arc(0, 0, body.shapes[0].radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	},
	drawBox:function drawBox(boxBody){
		var renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			boxShape=boxBody.shapes[0],
			x = boxBody.position[0],
			y = boxBody.position[1];
				ctx.save();
			ctx.beginPath();

		//	ctx.translate(x, y);        // Translate to the center of the box
			ctx.rotate(boxBody.interpolatedAngle);  // Rotate to the box body frame
			ctx.rect(x - boxShape.width/2, y - boxShape.height/2, boxShape.width, boxShape.height);
			ctx.stroke();
			ctx.fill();
			ctx.restore();
	},

	renderGrid:function renderGrid(grid){
		var canvas = this.canvas,
			ctx = this.ctx,x,y,value,w=grid.length,
			h=grid[0].length;
					ctx.save();

		ctx.scale(canvas.width / 48, canvas.height / 48);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'black';
		ctx.font = "1px Arial";

		for ( x=0; x<w;x++){
			for ( y=0; y<h;y++){
				value=grid[x][y];
				if (value =="t"){
					this.drawSquare(x,y,1,1,"black");
				}else if(value.army){
					this.drawSquare(value.position[0],value.position[1],1,1,value.army.player);

					ctx.fillStyle = 'black';
					ctx.font = "2px Arial";
					ctx.fillText(value.id,value.position[0],value.position[1]);
					ctx.font = "1px Arial";
				}
				else{
				ctx.fillText(value,x-0.5, y+0.5);
				}

			}
		}
		ctx.restore();

	},
	renderGridSight:function renderGridSight(grid){
		var canvas = this.canvas,
			ctx = this.ctx,x,y,value;
					ctx.save();

		ctx.scale(canvas.width / 48, canvas.height / 48);
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'black';
		ctx.font = "1px Arial";

		for (var a in grid){
			 x=a.split(",")[0];
			 y=a.split(",")[1];
			this.drawSquare(x,y,1,1, "rgba(0, 255, 0, 0.7)");

		}
		ctx.restore();

	},
	*/
}); //declare Renderer.

/*




// Interpolates two [r,g,b] colors and returns an [r,g,b] of the result
// Taken from the awesome ROT.js roguelike dev library at
// https://github.com/ondras/rot.js
var _interpolateColor = function(color1, color2, factor) {
  if (arguments.length < 3) { factor = 0.5; }
  var result = color1.slice();
  for (var i=0;i<3;i++) {
    result[i] = Math.round(result[i] + factor*(color2[i]-color1[i]));
  }
  return result;
};
*/




/** # AbstractedWargame

An astracted wargame provides a strategic level by hiding part of the complexity of the wargame. The
players' actions are simplified, and the number of plies is reduced. One ply of the abstracted
wargame may include many plies of the concrete game.
 */
var StrategicAttackAction = exports.StrategicAttackAction = declare(GameAction, {
	constructor: function StrategicAttackAction(unitId, targetId) {
		this.unitId = unitId;
		this.targetId = targetId;
	},

	executeMovement: function executeMovement(game, moves, update) {
		var activePlayer = game.activePlayer(),
			attacker = this.unitById(game, this.unitId),
			target = this.unitById(game, this.targetId),
			canShootThisTurn=moves.shootPositions,
			canAssaultThisTurn =moves.assaultPositions,
			canMoveThisTurn =moves.movePositions;

		if (canShootThisTurn.length > 0) {
			canShootThisTurn.sort(function (m1, m2) {//Sort por influencia tambien
				return m2.influence - m1.influence;
			});
			
			game=game.next(obj(activePlayer,new MoveAction(attacker.id, canShootThisTurn[0].position,false)), null, update);
			game=game.next(obj(activePlayer, new ShootAction(attacker.id, target.id)));
			if (game.isContingent) {
				game = game.randomNext();
			}	
		}else {
			game=game.next(obj(activePlayer, new MoveAction(attacker.id, canMoveThisTurn[canMoveThisTurn.length-1].position,true)), null, update);
		}
		if (game.__activeUnit__ && g.__activeUnit__.id === attack.unitId) {
			game = game.next(obj(activePlayer, new EndTurnAction(attacker.id)), null, update);
		}
		return game;
	},
	synchronizeMetagame: function synchronizeMetagame() {
		this.terrain.resetTerrain(this);
	},


	strategicPositions:function strategicPositions(abstractedGame,influenceMap,areaOfSight){
		
		var g = abstractedGame,
			attacker = this.unitById(g, this.unitId),
			target = this.unitById(g, this.targetId),
			moves,
			role=g.activePlayer(),
			posibleActions={movePositions:[],shootPositions:[],assaultPositions:[]};
		if (influenceMap){
			moves= g.terrain.canReachAStarInf({target:target,attacker:attacker,influenceMap:influenceMap,role:role});
			
			//RENDERER.renderInfluence(g,influenceMap);
			//RENDERER.renderPath(g,moves);

			//moves= g.terrain.canReachAStarInf({target:target,attacker:attacker,exitCondition:areaOfSight,influenceMap:influenceMap});
		}else{
			moves =g.terrain.canReachAStar({target:target,attacker:attacker});
		}
		moves.unshift({x:attacker.position[0],y:attacker.position[1]});
		
		for (var i =0; i<moves.length;i++) {
			var pos=moves[i],
				shootDistance= areaOfSight[pos.x+","+pos.y],
				influence=this.getInf([pos.x,pos.y],role,influenceMap),
				canShootThisTurn= i<=6 && shootDistance!==undefined,
				canAssaultThisTurn = shootDistance<=2,
				canMoveThisTurn = i <=12;
			if ((target.position[0]==pos.x && target.position[1]==pos.y)){
				continue;
			}
			if (canShootThisTurn){ //CanShootThisTurn
				posibleActions.shootPositions.push({position:[pos.x,pos.y],influence:influence,shootDistance:shootDistance});
			}else if (canMoveThisTurn){
				posibleActions.movePositions.push({position:[pos.x,pos.y],influence:influence,shootDistance:shootDistance});	
			}else if (canAssaultThisTurn){
				posibleActions.assaultPositions.push({position:[pos.x,pos.y],influence:influence,shootDistance:shootDistance});	
			}
		}
		return posibleActions;
		

	},
	getInf:function getInf(pos,role,grid){
		var x=pos[0],
			y=pos[1];
		if (role=="Red")
			return grid[x][y];
		return -grid[x][y];

	},

	execute: function execute(abstractedGame, update) {
		abstractedGame.concreteGame.synchronizeMetagame();
		var g = abstractedGame.concreteGame,
			attacker = this.unitById(g, this.unitId),
			target = this.unitById(g, this.targetId),
			activePlayer = g.activePlayer(),
			attack=this,
			areaOfSight=g.terrain.areaOfSight(target, attacker.maxRange()),
			posibleActions=this.strategicPositions(g,abstractedGame.concreteInfluence,areaOfSight);
		

		if (g.result()){
			return null;

		}
		// First activate the abstract action's unit.
		g = g.next(obj(activePlayer, new ActivateAction(this.unitId)), null, update);

		
		g = this.executeMovement(g, posibleActions, update);

		raiseIf(!(g instanceof Wargame), "Executing action ", this, " did not yield a Wargame instance!");
		abstractedGame.concreteGame = g;
		return abstractedGame;
	},

	'static __SERMAT__': {
		identifier: 'StrategicAttackAction',
		serializer: function serialize_StrategicAttackAction(obj) {
			return [obj.unitId, obj.targetId];
		}
	},

	toString: function toString() {
		return Sermat.ser(this);
	}
}); // declare StrategicAttackAction

/**TODO
*/
var AbstractedWargame = exports.AbstractedWargame = declare(ludorum.Game, {

	/**
	*/
	constructor: function AbstractedWargame(wargame) {
		raiseIf(!(wargame instanceof Wargame), "Invalid concrete wargame ", wargame, "!");
		this.players = wargame.players;
		ludorum.Game.call(this, wargame.activePlayer());
		this.concreteGame = wargame;
		this.influenceMap =new ludorum_wargame.InfluenceMap(wargame);
		this.concreteInfluence=this.influenceMap.update(wargame);

	},

	/**
	*/
	result: function result() {
		return this.concreteGame.result();
	},

	/**
	*/
	moves: function moves() {
		if (this.result()) {
			return null;
		}
		var game = this.concreteGame,
			activePlayer = this.activePlayer(),
			r = {};
		r[activePlayer] = Iterable.product(
			game.armies[activePlayer].units.filter(function (unit) {
				return !unit.isDead(game) && unit.isEnabled;
			}),
			game.armies[game.opponent()].units.filter(function (unit) {
				return !unit.isDead();
			})
		).mapApply(function (attacker, target) {
			return new StrategicAttackAction(attacker.id, target.id);
		}).toArray();
		return r;
	},

	/**
	*/
	next: function next(actions, haps, update) {
		var nextGame = update ? this : Sermat.clone(this),
			activePlayer = this.activePlayer(),
			action = actions[activePlayer];
		action.execute(nextGame, update); //FIXME Haps.
		nextGame.activePlayers = nextGame.concreteGame.activePlayers;
		nextGame.concreteInfluence=nextGame.influenceMap.update(nextGame.concreteGame);
		return nextGame;
	},

	'static __SERMAT__': {
		identifier: 'AbstractedWargame',
		serializer: function serialize_AbstractedWargame(obj) {
			return [obj.concreteGame];
		}
	}
}); // declare AbstractedWargame






/**
 
var graph = new LW.Graph([
		[0,0,0,1],
		[1,0,0,1],
		[1,1,0,0]
	]);
	var start = graph.grid[0][0];
	var end = graph.grid[1][2];
	var result = graph.astar.search(graph, start, end);
  
 */

var astar = exports.astar = declare({
  pathTo:function pathTo(node) {
    var curr = node,
        path = [];
    while (curr.parent) {
      path.unshift(curr);
      curr = curr.parent;
    }
    return path;
  },
  getHeap: function getHeap() {
    return new BinaryHeap(function(node) {
      return node.f;
    });
  },
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(graph, start, end, options) {
    graph.cleanDirty();
    options = options || {};
    
    var heuristic = options.heuristic || this.heuristics.manhattan,
        closest = options.closest || false,
        openHeap = this.getHeap(),
        exitCondition=options.exitCondition,
        closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end,options.influenceMap,options.role);
    graph.markDirty(start);

    openHeap.push(start);

    while (openHeap.size() > 0) {

      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end  ||  (exitCondition && exitCondition[currentNode.x+","+currentNode.y])) {
        return this.pathTo(currentNode);
      }
      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      var neighbors = graph.neighbors(currentNode);

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        var gScore = currentNode.g + neighbor.getCost(currentNode);
        var beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end,options.influenceMap);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return this.pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan: function(pos0, pos1) {
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
      var D = 1;
      var D2 = Math.sqrt(2);
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    }
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
});


var Graph = exports.Graph = declare({

  constructor: function Graph(terrain, options) {
    options = options || {};
    this.nodes = [];
    this.diagonal = !!options.diagonal;
    this.grid = [];
    this.astar=new astar();
    var node,x,y,valueOfNode,row,check1,check2;
    for (x = 0; x < terrain.width; x++) {
      this.grid[x] = [];
      for (y = 0; y < terrain.height; y++) {
          check1= options.start[0] ==x && options.start[1] ==y;
          check1= options.end[0] ==x && options.end[1] ==y;
          valueOfNode=(terrain.isPassable([x,y], true) || check1 || check2) ===true?1: 0;
          node = new GridNode(x, y, valueOfNode);
          this.grid[x][y] = node;
          this.nodes.push(node);
      }
    }
    this.init();
  },
  init : function init() {
    this.dirtyNodes = [];
    for (var i = 0; i < this.nodes.length; i++) {
      this.astar.cleanNode(this.nodes[i]);
    }
  },
  cleanDirty :  function cleanDirty() {
    for (var i = 0; i < this.dirtyNodes.length; i++) {
      this.astar.cleanNode(this.dirtyNodes[i]);
    }
    this.dirtyNodes = [];
  },
  markDirty: function markDirty(node) {
    this.dirtyNodes.push(node);
  },
  neighbors : function neighbors (node) {
    var ret = [];
    var x = node.x;
    var y = node.y;
    var grid = this.grid;

    // West
    if (grid[x - 1] && grid[x - 1][y]) {
      ret.push(grid[x - 1][y]);
    }

    // East
    if (grid[x + 1] && grid[x + 1][y]) {
      ret.push(grid[x + 1][y]);
    }

    // South
    if (grid[x] && grid[x][y - 1]) {
      ret.push(grid[x][y - 1]);
    }

    // North
    if (grid[x] && grid[x][y + 1]) {
      ret.push(grid[x][y + 1]);
    }

    if (this.diagonal) {
      // Southwest
      if (grid[x - 1] && grid[x - 1][y - 1]) {
        ret.push(grid[x - 1][y - 1]);
      }

      // Southeast
      if (grid[x + 1] && grid[x + 1][y - 1]) {
        ret.push(grid[x + 1][y - 1]);
      }

      // Northwest
      if (grid[x - 1] && grid[x - 1][y + 1]) {
        ret.push(grid[x - 1][y + 1]);
      }

      // Northeast
      if (grid[x + 1] && grid[x + 1][y + 1]) {
        ret.push(grid[x + 1][y + 1]);
      }
    }

    return ret;
  },
  toString : function toString() {
    var graphString = [];
    var nodes = this.grid;
    for (var x = 0; x < nodes.length; x++) {
      var rowDebug = [];
      var row = nodes[x];
      for (var y = 0; y < row.length; y++) {
        rowDebug.push(row[y].weight);
      }
      graphString.push(rowDebug.join(" "));
    }
    return graphString.join("\n");
  },
});


var GridNode = exports.GridNode = declare({
  constructor: function GridNode(x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
  },
  toString : function toString() {
    return "[" + this.x + " " + this.y + "]";
  },
  getCost : function getCost(fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
      return this.weight * 1.41421;
    }
    return this.weight;
  },
  isWall : function isWall() {
    return this.weight === 0;
  },

});

var BinaryHeap = exports.BinaryHeap = declare({
 constructor: function BinaryHeap(scoreFunction)  {
    this.content = [];
    this.scoreFunction = scoreFunction;
  },
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }

});







/** See __prologue__.js
*/
	[ //TODO Add serializable classes.
	].forEach(function (type) {
		type.__SERMAT__.identifier = exports.__package__ +'.'+ type.__SERMAT__.identifier;
		exports.__SERMAT__.include.push(type);
	});
	Sermat.include(exports);
	return exports;
});
//# sourceMappingURL=ludorum-wargame.js.map