(function (init) { "use strict";
			if (typeof define === 'function' && define.amd) {
				define(["creatartis-base","sermat","ludorum"], init); // AMD module.
			} else if (typeof exports === 'object' && module.exports) {
				module.exports = init(require("creatartis-base"),require("sermat"),require("ludorum")); // CommonJS module.
			} else {
				this.Sermat = init(this.base,this.Sermat,this.ludorum); // Browser.
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
		this.position = new Float32Array(this.position);
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
			maxRange = this.maxRange() || 0,
			ret=enemyUnits.filter(function (target) {
			return game.terrain.canShoot(shooter, target, maxRange,game)!=Infinity;
		}).map(function (target) {
			return new ShootAction(shooter.id, target.id);
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


/** # Wargame
 * 
 */
var Wargame = exports.Wargame = declare(ludorum.Game, {
	name: 'Wargame',
	players: ['Red', 'Blue'],
	rounds: 10,

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
			var nextGame = update ? this : Sermat.sermat(this); //FIXME Sermat.clone
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
            units: [[3,10],[3,20],[4,15],[3,2]].map(function (position) {
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
				new ludorum.players.MonteCarloPlayer({ simulationCount: 2, timeCap: 500 }),
				//new ludorum.players.RandomPlayer(),
				new ludorum.players.RandomPlayer()
			],
			game = new AbstractedWargame(this.example1());
		window.match = new ludorum.Match(game, players);
		match.events.on('begin', function (game, match) {
      var terrain=  game.concreteGame.terrain;
          terrain.loadUnitsBut(game.concreteGame,terrain.terrain);
          window.RENDERER.renderGrid(terrain.terrain);

		});
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
		});
		match.events.on('next', function (game, next, match) {
			var terrain=  next.concreteGame.terrain;
          terrain.loadUnitsBut(next.concreteGame,terrain.terrain);
          window.RENDERER.renderGrid(terrain.terrain);
		});
		match.run().then(function (m) {
			console.log(m.result());
		});
  },

  randomAbstractedGameDiscrete: function randomAbstractedGameDiscrete() { //FIXME window
		var players = [
				new ludorum.players.MonteCarloPlayer({ simulationCount: 5, timeCap: 2000 }),
				//new ludorum.players.RandomPlayer(),
				new ludorum.players.RandomPlayer()
			],
			game = new AbstractedWargame(this.example1());
    window.match = new ludorum.Match(game, players);
    /*
		match.events.on('begin', function (game, match) {
     // game.concreteGame.terrain.addArmiesToWorld(game.concreteGame);
      //window.RENDERER.renderGrid(game.concreteGame.terrain.terrain);
         var terrain=  game.concreteGame.terrain;
          terrain.loadUnitsBut(game.concreteGame,terrain.terrain);
          window.RENDERER.renderGrid(terrain.terrain);


    });
    */
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
    });
    /*
		match.events.on('next', function (game, next, match) {
     // next.concreteGame.terrain.addArmiesToWorld(next.concreteGame);
      //window.RENDERER.renderGrid(next.concreteGame.terrain.terrain);
      var terrain=  next.concreteGame.terrain;
          terrain.loadUnitsBut(next.concreteGame,terrain.terrain);
          window.RENDERER.renderGrid(terrain.terrain);

    });
    */
		match.run().then(function (m) {

      console.log(m.result());
      alert(m.result());
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
			distance = game.terrain.canSee(shooter, target),
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
			return [unitId, targetId];
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

var DynamicScriptingPlayer = exports.DynamicScriptingPlayer = declare(ludorum.Player, {
	/** The constructor takes the player's `name` and the following:
	 */
	constructor: function DynamicScriptingPlayer(params) {
		ludorum.Player.call(this, params);
		initialize(this, params)
		.array('rules', { defaultValue: [] });
		this.__pendingActions__ = [];
    this.__roundActions__ = [];
    this.rules = this.ownRules();
	},


	/** Returns an array with the methods of this object whose name starts with `rule`.
	 */
	ownRules: function ownRules() {
		var self = this;
		return Object.keys(Object.getPrototypeOf(this)).map(function (id) {
			return self[id];
		}).filter(function (member) {
			return typeof member === 'function' && member.name && member.name.substr(0, 4) === 'rule';
		});
	},

	/** Sorts the rules first by priority (descending), then by weight (descending).
	 */
	sortRules: function sortRules() {
		this.rules.sort(function (r1, r2) {
			return r2[0].priority - r1[0].priority || r2[1] - r1[1];
		});
	},

	/** The player makes a decision by calling the rules' functions in order. The first one to
	return a list of actions is used.
  */
	decision: function decision(game, player) {
		var rule, actions,
		pending = this.__pendingActions__,
		roundActions = this.__roundActions__;
		this.adjustWeights(game, player);
		if (pending.length < 1) {
			for (var i = 0, len = this.rules.length; i < len; i++) {
				rule = this.rules[i];
        //raiseIf(true, 'rule  ' + rule);
        actions = rule.call(this, game, player); //rule[0]
				if (actions) {
					actions.forEach(function (action) {
						action.__rule__ = rule;
					});
					pending.push.apply(pending, actions);
					roundActions.push.apply(roundActions, actions);
					break;
				}
			}
		}
		raiseIf(pending.length < 1, 'No rule applied to game!');
		return pending.shift();
	},

	/** The method `adjustWeights` check if the round has changed. If so, it adjusts the weights of
	the rules of the actions executed by the player in the round.
	 */
	adjustWeights: function adjustWeights(game, player) {
		if (!this.__lastRound__) {
			this.__lastRound__ = game;
			this.__roundActions__ = [];
		} else if (this.__lastRound__.round < game.round) {
			var diff = this.gameWorth(game) - this.gameWorth(this.__lastRound__);
			this.__roundActions__.forEach(function (action) {
				action.__rule__[1] += action.worth() + diff;
			});
			this.__lastRound__ = game;
			this.__roundActions__ = [];
			this.sortRules();
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
			deadModels = unitY.size() - unitY.livingModels();
			worth += cost*deadModels/unitY.size(); //FIXME no funciona correctamente con tough
		});
		playerUnits.forEach(function (unitX) {
			cost = unitX.cost();
			if (unitX.isDead()){
				worth -= cost;
			}
			deadModels = unitX.size() - unitX.livingModels();
			worth -= cost*deadModels/unitX.size(); //FIXME no funciona correctamente con tough
		});
	},

	'static __SERMAT__': {
		identifier: 'DynamicScriptingPlayer',
		serializer: function serialize_DynamicScriptingPlayer(obj) {
			return this.serializeAsProperties(obj, ['name', 'rules']); //TODO Check function serialization.
		}
	},


	// ## Helper functions /////////////////////////////////////////////////////////////////////////

	shoot: function shoot(unitX,unitY){
		return [new ActivateAction(unitX.id),new ShootAction(unitX.id,unitY.id)];
	},

	assault: function assault(unitX,unitY){
		return [new ActivateAction(unitX.id),new AssaultAction(unitX.id,unitY.id)];
	},

	move: function move(unitX,moveAction){
		return [new ActivateAction(unitX.id),moveAction];
	},
/*
  scape: function scape(unitX){ //FIXME
  	var mostDangerousUnits = this.mostDangerousUnits(game,unitX,player);
    mostDangerousUnits.forEach(function (mdu){
      //desde aca
      if (this.canHideFrom(unitX,mdu)){
        return move(unitX,moveAction);
      }
      if (this.canRunFrom(unitX,mdu)){
        return move(unitX,moveAction);
      }
    });
    var dangerousUnits = this.dangerousUnits(game,unitX,player);
    dangerousUnits.forEach(function (du){
      //desde aca
      if (this.canHideFrom(unitX,du)){
        return move(unitX,moveAction);
      }
      if (this.canRunFrom(unitX,du)){
        return move(unitX,moveAction);
      }
    });
  },

  //si puede correr y alejarse el rango suficiente
  canRunFrom: function canRunFrom(runningUnit,enemyUnit){
    var range =  enemyUnit.models[0].equipments[0].range;
    //corre 12 pero el enemigo se acerca 6
    if (runningUnit.isEnabled && game.terrain.canSee(enemyUnit,runningUnit)<= range+6){
      return false;
    }
  	return true;
  },

  //si puede cubrirse de las unidades enemigas tras otra unidad u terreno que quite linea de vision
  canHideFrom: function canHideFrom(hidingUnit,enemyUnit){ //TODO
  	return false;
  },

  canScape: function canScape(game,unitX,player){
  	var mostDangerousUnits = this.mostDangerousUnits(game,unitX,player);
    var canScape = true;
    mostDangerousUnits.forEach(function (mdu){
  		if (!this.canRunFrom(unitX,mdu) && !this.canHideFrom(unitX,mdu)){
  			canScape = false;
  		}
  	});
  	return canScape;
  },
  */

  // devuelve las unidades enemigas que pueden matar a la unidadX
  mostDangerousUnits: function mostDangerousUnits(game,unitX,player){
  	var mostDangerousUnits = [];
    var livingEnemyUnits = this.livingEnemyUnits(game, player);
    livingEnemyUnits.forEach(function (enemyUnit){
      if(this.canKill(game,enemyUnit,unitX)){
        mostDangerousUnits.push(enemyUnit);
      }
    });
    return mostDangerousUnits;
  },

  // devuelve las unidades enemigas que pueden atacar a la unidadX
  dangerousUnits: function dangerousUnits(game,unit,player){
    var dangerousUnits = [];
    var livingEnemyUnits = this.livingEnemyUnits(game, player);
    livingEnemyUnits.forEach(function (enemyUnit){
      if (enemyUnit.isEnabled){
        var range = enemyUnit.models[0].equipments[0].range;
        if (game.terrain.canShoot(enemyUnit,unit,range) || game.terrain.canSee(enemyUnit,unit)<=12){
          dangerousUnits.push(enemyUnit);
        }
      }
    });
    return dangerousUnits;
  },

  // devuelve verdadero si la unidad atacante puede llegar a eliminar a la defensora
  canKill: function canKill(game,attacker,target){
    if (!attacker.isDead() && attacker.isEnabled && !target.isDead()){
      if (canKillShooting(game,attacker,target) || canKillAssaulting(game,attacker,target)){
        return true;
      }
    }
    return false;
  },

  // devuelve verdadero si la unidad que dispara puede llegar a eliminar a la defensora
  canKillShooting: function canKillShooting(game,shooter,target){
    if (!shooter.isDead() && !target.isDead() && shooter.isEnabled && bestAttackResultShooting(game,shooter,target)>=100){
      return true;
    }
    return false;
  },

  // devuelve verdadero si la unidad que asalta puede llegar a eliminar a la defensora
  canKillAssaulting: function canKillAssaulting(game,assaulter,target){
    if (!assaulter.isDead() && !target.isDead() && assaulter.isEnabled && bestAttackResultAssaulting(game,assaulter,target)>=100){
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
      var distance = game.terrain.canSee(unitX, unitY);
      var attackCount = 0;
      var livingModels = unitX.livingModels();
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
      if (game.terrain.canShoot(unitX,unitY,12)){
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
			if (!playerUnits[pu].isDead() && playerUnits[pu].isEnabled){
				possibleUnits.push(playerUnits[pu]);
			}
		}
		return possibleUnits;
	},

  // devuelve una lista de unidades enemigas que pueden ser disparadas por la unidad atacante
  shootableUnits: function shootableUnits(game, player, shooter){
    var enemyUnits = this.livingEnemyUnits(game,player);
    var shootableUnits = [];
    for(var eu in enemyUnits){
      var target = enemyUnits[eu];
      var range = shooter.models[0].equipments[0].range;
      if (game.terrain.canShoot(shooter,target,range)){
        shootableUnits.push(target);
      }
    }
    return shootableUnits;
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
    var playerUnits = game.armies[player].units;
		var enemy = game.opponent(player);
    var enemyArmy = game.armies[enemy];
		var enemyUnits  = game.armies[enemy].units;
    return [playerArmy, playerUnits, enemyArmy, enemyUnits];
	},

  // devuelve true si la unidad tiene algun modelo herido
	wounded: function wounded(unit, game){
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
    var maxCost = 0;
    units.forEach(function (unit){
      var cost = unit.cost();
      if (cost > maxCost){
        maxCost = cost;
      }
    });
    return maxCost;
  },

 // devuelve la unidad con costo mayor dentro de la lista de unidades dada
  mostExpensiveUnit: function mostExpensiveUnit(units){
    var maxCost = 0;
    var mostExpensiveUnit = null;
    units.forEach(function (unit){
      var cost = unit.cost();
      if (cost > maxCost){
        maxCost = cost;
        mostExpensiveUnit = unit;
      }
    });
    return mostExpensiveUnit;
  },

	// ## Rules ////////////////////////////////////////////////////////////////////////////////////

	//priority 3 -----------------------------------------------------------------
  /*si es la ronda 1 y hay al menos 2 unidades enemigas vivas, disparar a la mas cara*/
  rule_3A: playerRule(3, function rule_3A(game, player){
    var possibleUnits = this.possibleUnits(game, player);
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var enemyArmy = this.armiesAndUnits(game,player)[2];
    if (game.round === 0){ //&& livingEnemyUnitsList.length>1){
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyUnits = this.shootableUnits(game, player, unitX);
        if (enemyUnits.length>1){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (unitY.cost() === this.mostExpensiveUnit(enemyUnits).cost()){
              return this.shoot(unitX,unitY);
            }
          }
        }
      }
    }
    return null;
  }),

	//priority 2 -----------------------------------------------------------------
  /*si es la ronda 0 y el enemigo esta herido, asaltar a ese enemigo*/
	rule_2A: playerRule(2, function rule_2A(game, player){
		var livingEnemyUnitsList = this.livingEnemyUnits(game, player);
		var possibleUnits = this.possibleUnits(game, player);
		if (game.round === 0){
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        for (var j = 0; j < livingEnemyUnitsList.length; j++) {
          var unitY = livingEnemyUnitsList[j];
					 if (this.wounded(unitY,game) && game.terrain.canShoot(unitX,unitY,12)){
						 return this.assault(unitX,unitY);
					 }
				}
			}
		}
		return null;
	}),

	//priority 1 -----------------------------------------------------------------
  /*si puede disparar a algo, disparar*/
  rule_1A: playerRule(1, function rule_1A(game, player){
    var possibleUnits = this.possibleUnits(game, player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootableUnits(game, player, unitX);
      for (var j = 0; j < enemyUnits.length; j++) {
        var unitY = enemyUnits[j];
        return this.shoot(unitX,unitY);
      }
    }
    return null;
  }),
  /*si no puede disparar a nada, moverse*/
	rule_1B: playerRule(1, function rule_1B(game, player){
		var livingEnemyUnitsList = this.livingEnemyUnits(game, player),
			possibleUnits = this.possibleUnits(game, player);
		for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < livingEnemyUnitsList.length; j++) {
        var unitY = livingEnemyUnitsList[j];
        var range = unitX.models[0].equipments[0].range;
        if (game.terrain.canShoot(unitX,unitY,range) === false){
			    var moveActions = unitX.getMoveActions(game);
			    if (moveActions.length > 0) {
				    return this.move(unitX,moveActions[0]); //FIXME que se acerque a algo (ej: a la mas eliminable)
  			  }
        }
      }
		}
		return null;
	})
}); // declare DynamicScriptingPlayer















			/*

//--------------------------------priority 15
function p15r(game){
	if ((game.round===4)&&(canKill(unitY,unitX))&&(willWoundShooting(unitX,unitY))&&(willWoundHalfAssaulting(unitX,unitY2))&&(unitX.cost>unitY2.cost)&&(!winning(game))&&(losingGameByUnitElimination(game,unitX))&&(canScape(unitX))){
		[scape(unitX)];
	}else{return null;}
}

//--------------------------------prioryty 4
function p4r1(game){ //en realidad decia "puedeAtacarSinCaminar(unitX,unitY)" en vez de sniper
	if((game.round===1)&&(unitIsStrongest(armyTwo,unitY))&&(unitX.canShoot(unitY))&&(classification(unitX,"sniper"))&&(willWound(unitX,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p4r2(game){
	if((game.round===3)&&(willWound(unitX,unitY))&&(attackTeamCanWoundALot(unitX,unitX2,unitY))&&(unitEasiestToKill(army2,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}


//--------------------------------priority 3
function p3r1(game){
	if((game.round===1)&&(unitIsStrongest(armyTwo,unitY))&&(unitX.canShoot(unitY))&&(classification(unitX,"sniper"))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r2(game){
	if((game.round===1)&&(armyOne.maxRange(unitX.range()))&&(unitIsStrongest(armyTwo,unitY)){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r3(game){
	if((game.round===1)&&(wounded(unitX2))&&(canAssist(unitX,unitX2))){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p3r4(game){
	if((game.round===1)&&(willWoundShooting(unitX,unitY))&&(unitIsStrongest(armyTwo,unitY))&&(unitIsStrongest(armyOne,unitY)){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r5(game){
	if((game.round===2)&&(wounded(unitX2))&&(canAssist(unitX,unitX2))){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p3r6(game){
	if((game.round===2)&&(unitIsStrongest(armyTwo,unitY))&&(willWound(unitX,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r7(game){
	if((game.round===2)&&(unitIsStrongest(armyTwo,unitY))&&(unitIsStrongest(armyOne,unitY))&&(willWound(unitX,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r8(game){
	if((game.round===3)&&(wounded(unitX2))&&(canAssist(unitX,unitX2))){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p3r9(game){
	if((game.round===3)&&(unitEasiestToKill(army2,unitY))&&(willWound(unitX,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r10(game){
	if((game.round===3)&&(willWound(unitX,unitY))&&(unitEasiestToKill(army2,unitY))){
		[shoot(unitX,unitY)]; //anterior en otro orden
	}else{return null;}
}
function p3r11(game){
	if((game.round===4)&&(!canKill(unitY,unitX))&&(unitX2.cost>=unitX.cost)&&(canAssist(unitX,unitX2))){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p3r12(game){
	if((game.round===1)&&(classification(unitX,"troop")&&(unitIsStrongest(armyTwo,unitY))&&(willWound(unitX,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r13(game){
	if((game.round===1)&&(unitIsCheapest(armyOne,unitX))&&(unitIsStrongest(armyTwo,unitY))&&(willWound(unitX,unitY))){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r14(game){
	if((game.round===1)&&(classification(unitX,"troop")&&(willWound(unitX,unitY))&&(unitIsStrongest(armyTwo,unitY))&&(unitIsStrongest(armyOne,unitY)){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p3r15(game){
	if((game.round===1)&&(wounded(unitX))&&(willWound(unitX,unitY))&&(unitIsStrongest(armyTwo,unitY))&&(unitIsStrongest(armyOne,unitY)){
		[assist(unitX,unitX2)];
	}else{return null;}
}

//--------------------------------priority 2
function p2r1(game){
	if ((game.round===1)&&(classification(unitX,"fastAttack")){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p2r2(game){
	if ((game.round===2)&&(classification(unitX,"fastAttack")){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p2r3(game){
	if ((game.round===3)&&(classification(unitX,"fastAttack")){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p2r4(game){
	if ((game.round===1)&&(classification(unitX,"heavySupport")){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p2r5(game){
	if ((game.round===2)&&(classification(unitX,"heavySupport")){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p2r6(game){
	if ((game.round===3)&&(classification(unitX,"heavySupport")){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p2r7(game){
	if ((game.round===1)&&(classification(unitX,"troop")){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p2r8(game){
	if ((game.round===2)&&(classification(unitX,"troop")){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p2r9(game){
	if ((game.round===3)&&(classification(unitX,"troop")){
		[assist(unitX,unitX2)];
	}else{return null;}
}
function p2r10(game){
	if ((game.round===1)&&(classification(unitX,"sniper")){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p2r11(game){
	if ((game.round===2)&&(classification(unitX,"sniper")){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p2r12(game){
	if ((game.round===3)&&(classification(unitX,"sniper")){
		[shoot(unitX,unitY)];
	}else{return null;}
}

//--------------------------------priority 1
function p1r1(game){
	if (game.round === 1){
		[scape(unitX)];
	}else{return null;}
}
function p1r2(game){
	if (game.round === 2){
		[scape(unitX)];
	}else{return null;}
}
function p1r3(game){
	if (game.round === 3){
		[scape(unitX)];
	}else{return null;}
}
function p1r4(game){
	if (game.round === 4){
		[shoot(unitX,unitY)];
	}else{return null;}
}
function p1r5(game){
	if (game.round === 4){
		[assault(unitX,unitY)];
	}else{return null;}
}

//##################################################################
/*
//	devuelve true si puede dejar pinned a la unidad
canPin: function canPin(game,unitX,unitY){ //TODO
  if (!unitX.isDead() && unitX.isEnabled && !unitY.isDead() && game.terrain.canShoot(unitX,unitY,12)){
    //queda con la mitad o menos de modelos iniciales
    var attackCount = 0;
    var livingModels = unitX.livingModels();
    livingModels.forEach(function (model) {
      model.equipments.forEach(function (eq) {
        if (eq.range === 0) {
          attackCount += eq.attacks;
        }
      });
    });
    if (attackCount >= unitY.models.length/2){
      return true;
    }
    //las unidades destruidas mas que las perdidas
    //TODO
  }
  return false;
},


function assist(unitX,unitX2){ //FIXME
	var mostDangerousUnits = mostDangerousUnits(unitX2);
	for mdu in mostDangerousUnits{
		if(canKill(unit,mdu)){
			if (canKillAssaulting(unit,mdu)){
				Assault //
				break
			}else{
				Shoot //
				break
			}
		}
		if (canBlockSight(unitX,unitX2,mdu)){
			var blockingPos = game.terrain//
			Move //
			if(unit.canShoot(mdu)){
				Shoot //
				break
			}
		}
		if(unit.canAssault(mdu)){
			Assault //
			break
		}
		if(unit.canShoot(mdu)){
			Shoot //
			break
		}
	}
	var dangerousUnits = dangerousUnits(unitX2);
	for du in dangerousUnits{
		if(canKill(unit,du)){
			if (canKillAssaulting(unit,du)){
				Assault //
				break
			}else{
				Shoot //
				break
			}
		}
		if (canBlockSight(unitX,unitX2,du)){
			var blockingPos = game.terrain//
			Move //
			if(unit.canShoot(du)){
				Shoot //
				break
			}
		}
		if(unit.canAssault(du)){
			Assault //
			break
		}
		Shoot //
	}
}



###########################


// habria que hacer lo mismo pero con minForce ?
function force(unit){//FIXME
	var force = unit.size*ataques*(7-unit.quality)/6;
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
	return force;
}
function maxForce(army){
	var maxForce = 0;
	for unit in army{
		var force = force(unit);
		if (force > maxForce){
			maxForce = force;
		}
	}
	return maxForce;
}
function unitIsStrongest(army,unit){
	if (force(unit) >= maxForce(army)){
		return true;
	}
	return false;
}
//battleBrothers: 5*1*0.67=3.35
//assaultBrothers: 5*1.5*0.67=5.025
//supportBrothers: 5*6*0.67=20.1


//si tenes armas de cuerpo a cuerpo con mas ataques que 1 o furiuos, impact(x)
function isMelee(unit){//FIXME
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
}

//armyOne.minCost(unitX.cost)
function minCost(army){
	var minCost = Infinity;
	for unit in army{
		var cost = unit.cost;
		if (cost < minCost){
			minCost = cost;
		}
	}
	return minCost;
}
function unitIsCheapest(army,unit){
	if (unit.cost <= minCost(army)){
		return true;
	}
	return false;
}


● eliminable(unidadY) = Máximos
Donde eliminable(unidadY) es una función que devuelve qué tan fácil de eliminar
completamente es una unidad, considerando la cantidad actual de modelos y la calidad.
// habria que hacer lo mismo pero con hardToKill ?
function easeToKill(unit){//FIXME
	var easeToKill = unit.size*(unit.defense); //no esta bien pensado
	if (regeneration){ easeToKill+=1;}
	if (tought(x)){ easeToKill+=1.5*x;}
	if (stealth){ easeToKill+=0.5;}
	return easeToKill;
}
function easiestToKil(army){
	var easiestToKil = 0;
	for unit in army{
		var easeToKill = easeToKill(unit);
		if (easeToKill > easiestToKil){
			easiestToKil = easeToKill;
		}
	}
	return easiestToKil;
}
function unitEasiestToKill(army,unit){
	if (easeToKill(unit) >= easiestToKil(army)){
		return true;
	}
	return false;
}
//battleBrothers: 5*6/6=5
//assaultBrothers: 5*6/6=5
//supportBrothers: 5*6/6=5



Heavy Support are the strong hitters of the army. In most games, these will be the hardest-hitting units, and are also usually the most expensive. Monstrous Creatures and tanks are usually found in this category. In a standard game, a player selects 0-3 of these.
function classification(unit,text){//FIXME
	var classification = "";
	if (unit.initialSize>4 && unit.cost<130){ classification = "troop";}
	if (unit.)
"fastAttack" // si tienen poca defensa y mucha calidad o scouts, strider, flying, fast
"heavySupport" // buena defensa o AP(x), regeneration, stealth, tought(x)
"sniper" // tenes gran rango o indirect, sniper
}



● puedeAtacarSinCaminar(unidadX a unidadY)
Devuelve verdadero si rango >= distanciaEntre(unidadX y unidadY) y
lineaVisionEntre(unidadX y unidadY).
function canAttackWithoutMoving(unitX,unitY){//TODO
	return false;
}

● puedeAsistir(unidadX a unidadZ)

//devuelve true si la unit puede ponerse entre la unitB y la unitB2 de forma tal que quite la linea de vision entre las mismas
function canBlockSight(unit,unitB,unitB2){ //TODO
	return false;
}
Devuelve verdadero si la unidadX puede cubrir a la unidadZ y/o puedeAtacar a las unidades
enemigas no activadas que puedan atacar a la unidadZ.
function canAssist(unitX,unitX2){
	var dangerousUnits = dangerousUnits(unitX2);
	var canAssist = false;
	for du in dangerousUnits{
		if (canBlockSight(unitX,unitX2,du) || unitX.canShoot(du) || unitX.canAssault(du)){
			canAssist = true;
		}
		if (canAssist === false){
			return false;
		}
	}
	return true;
}


● quedaActivacionGanadora()
Devuelve verdadero si queda al menos una unidad del jugador que no haya sido activada
esta ronda que al atacar pueda matar (o dejar “clavada”) a una unidad con puntaje tal que al
eliminarla el jugador pasaría a ganar.
function winningActivation(game){ //FIXME
	var toKillUnits = [];
	for eu in enemyUnits{
		if(game.scores(activePlayer) > (game.scores(enemyPlayer) - eu.score)){
			toKillUnits.push(eu);
		}
	}
	for na in notActivatedUnits{ //unidades aun no activadas del army del jugador activo
		for tk in toKillUnits{
			if (canKill(na,tk) || (canPin(na,tk) && game.round===4)){
				return true;
			}
		}
	}
}

● ganando()
Devuelve verdadero si el jugador va acumulando más puntos de unidades completamente
destruidas que el oponente.
function winning(game){
	return game.scores(activePlayer) > game.scores(enemyPlayer);
}

● perdiendoTrasEliminacion(unidadX)
Devuelve verdadero si tras la eliminación de la unidadX el puntaje del jugador pasa a ser
menor que el puntaje del oponente.
function losingGameByUnitElimination(game,unit){
    return (game.scores(activePlayer) - unit.score) < game.scores(enemyPlayer);
}






//TODO:
//falta implementar bestAttackTeamResult
//falta implementar expectedResultShooting
//falta implementar expectedResultAssaulting


function attackTeamCanWoundALot(unitX,unitX2,unitY){
	return bestAttacksResult(unitX,unitX2,unitY)>75;
	//bestAttackTeamResult: unitX ataca a unitY, luego unitX2 (aun no activada) ataca a unitY, se mide el maximo daño que pueden hacer
}
function willKillShooting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultShooting(unitX,unitY)===100
	//expectedResultShooting: Devuelve el porcentaje de modelos destruidos según el resultado esperado de la unidadX contra la unidadY con disparo
}
function willWoundALotShooting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultShooting(unitX,unitY)>75
}
function willWoundHalfShooting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultShooting(unitX,unitY)>=50
}
function willWoundShooting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultShooting(unitX,unitY)>0
}
function willKillAssaulting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultAssaulting(unitX,unitY)===100
	//expectedResultAssaulting: Devuelve el porcentaje de modelos que tendrá la unidad defensora respecto a su cantidad
	//inicial en el juego, luego de un ataque melee realizado por la unidadX a la unidadY.
}
function willWoundALotAssaulting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultAssaulting(unitX,unitY)>75
}
function willWoundHalfAssaulting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultAssaulting(unitX,unitY)>=50
}
function willWoundAssaulting(unitA,unitB){
	//si unitA no fue activada aun esta ronda
	return expectedResultAssaulting(unitX,unitY)>0
}

//raiseIf(true, 'range ' + range); // 24

			 */


exports.Renderer = declare({
	constructor: function Renderer(canvas) {
		canvas = this.canvas = canvas || document.getElementById('wargame-canvas');
		var ctx = this.ctx = canvas.getContext('2d');
		ctx.fillStyle = 'white';
	},

	__scope__: function __scope__(wargame, block) {
		var canvas = this.canvas,
			ctx = this.ctx,
			width = wargame.terrain.width,
			height = wargame.terrain.height;
		ctx.save();
		ctx.scale(canvas.width / width, canvas.height / height);
		try {
			block.call(this, ctx);
		} finally {
			ctx.restore();
		}
	},

	render: function render(wargame) {
		this.__scope__(wargame, function (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			var terrain = wargame.terrain;
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

	renderSight: function renderSight(wargame, unit) {
		unit = unit || wargame.__activeUnit__;
		if (unit) {
			this.__scope__(wargame, function (ctx) {
				var renderer = this,
					range = unit.maxRange(),
				 	sight = wargame.terrain.areaOfSight(unit, range);
				iterable(sight).forEachApply(function (pos, d) {
					var alpha = (1 - d / range) * 0.85 + 0.15;
					pos = pos.split(',');
					renderer.drawSquare(+pos[0], +pos[1], 1, 1, 'rgba(255,255,0,'+ alpha +')');
				});
			});
		}
	},

	drawSquare: function drawSquare(x, y, height, width, color){
		var ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.fillRect(x, y, 1, 1);
	},

////////////////////////////////////////////////////////////////////////////////////////////////////

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
	renderInfluence: function renderInfluence(wargame,grid){
		var w=grid.length,
			h=grid[0].length,
			renderer = this,
			canvas = this.canvas,
			ctx = this.ctx,
			terrain = wargame.terrain,
			world = terrain.world,
			value,
			min=Number.POSITIVE_INFINITY,
			max=Number.NEGATIVE_INFINITY,
			absMax,
			opacity,x,y;
		ctx.save();
		for ( x=0; x<w;x++){
			for ( y=0; y<h;y++){
				if (!isNaN(grid[x][y])){
					max= Math.max(max,grid[x][y]);
					min= Math.min(min,grid[x][y]);
				}
			}
		}
		absMax= Math.max(max,Math.abs(min));
		ctx.scale(canvas.width / terrain.WorldWidth, canvas.height / terrain.WorldHeight);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
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
		ctx.restore();
	},
}); //declare Renderer.






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
	
	executeMovement: function executeMovement(game, actions, update) {
		var activePlayer = game.activePlayer(),
			shooter = this.unitById(game, this.unitId),
			target = this.unitById(game, this.targetId),
			theGame=game,
			moves = actions.filter(function (m) {
				if (m instanceof MoveAction) {	//Desicion basada en influencia decidiendo si moverme o moverme para atacar //puede romper los movimientos
												//
												// Me da los movimientos en base a distancia directa, 
												// Esto supone que menor distancia = mas cerca pero caminos hace eso incorrecto
												//deberia influir la influencia en vez de distancia directa, el que le falten menos turnos tb
												//Deberia ir ya deberian estar ordenadas por estos 
					m.__distance__ = game.terrain.getDistance(shooter.position, target.position);
					return true;
				} else {
					return false;
				}
			}),// Esto se deberia remplazar por una eleccion basada en influencia de canShoot de beria sacar un filter
			
			

			approaches = [];


			approaches= moves.filter(function (m) {
				//range = shooter.model.range
				 //si ya la calcule para la unidad la deberia usar no la deberia pasar entre turno y turno pero deberia mantenersepor el turno
				m.__range__ = game.terrain.canShoot(shooter, target, shooter.maxRange(),theGame);
				return m.__range__ !== Infinity;
			});
			//hooter.areaOfSight=areaOfSight;
		//	console.log("moves"+moves);
			
		//	console.log("ap"+approaches);
		if (approaches.length > 0) {
			approaches.sort(function (m1, m2) {//Sort por influencia tambien
				return m1.__range__ - m2.__range__;
			});
			return game.next(obj(activePlayer, approaches[0]), null, update);
		} else {
			moves.sort(function (m1, m2) { //Si no hay disparo me muevo 	
											//Esto tambien deberia hacerlo por influencia y menos pasos// si primero o influencia
				return m1.__distance__ - m2.__distance__;
			});
			return game.next(obj(activePlayer, moves[0]), null, update);
		}
	},
	
	getShots: function getShots(game, actions) {
		var attack = this;
		actions = actions || game.moves()[game.activePlayer()];
		return actions.filter(function (m) {
			return m instanceof ShootAction && m.targetId === attack.targetId;
		});
	},
	
	execute: function execute(abstractedGame, update) {
		var attack = this,
			g = abstractedGame.concreteGame,
			activePlayer = g.activePlayer();
		g = g.next(obj(activePlayer, new ActivateAction(attack.unitId)), null, update); // Activate the unit.
		var actions = g.moves()[activePlayer],
			shots = this.getShots(g, actions);
		if (shots.length < 1) {
			g = this.executeMovement(g, actions, update);
			if (g.__activeUnit__ && g.__activeUnit__.id === attack.unitId) {
				shots = this.getShots(g);
			}
		} 
		if (shots.length > 0) {
			abstractedGame.concreteGame = g.next(obj(activePlayer, shots[0]), null, update).randomNext();
		} else if (g.__activeUnit__ && g.__activeUnit__.id === attack.unitId) {
			abstractedGame.concreteGame = g.next(obj(activePlayer, new EndTurnAction(attack.unitId)), null, update);
		} else {
			abstractedGame.concreteGame = g;
		}
		return abstractedGame;
	},
	
	'static __SERMAT__': {
		identifier: 'StrategicAttackAction',
		serializer: function serialize_StrategicAttackAction(obj) {
			return [obj.unitId, obj.targetId];
		}
	}
}); // declare StrategicAttackAction
 
/**TODO
*/ 
var AbstractedWargame = exports.AbstractedWargame = declare(ludorum.Game, {

	/**
	*/
	constructor: function AbstractedWargame(wargame) {
		this.players = wargame.players;
		ludorum.Game.call(this, wargame.activePlayer());
		this.concreteGame = wargame;
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
		var nextGame = update ? this : Sermat.sermat(this), //FIXME Sermat.clone
			activePlayer = this.activePlayer(),
			action = actions[activePlayer];
		action.execute(nextGame, update); //FIXME Haps.
		nextGame.activePlayers = nextGame.concreteGame.activePlayers;
		return nextGame;
	},
	
	'static __SERMAT__': {
		identifier: 'AbstractedWargame',
		serializer: function serialize_AbstractedWargame(obj) {
			return [obj.concreteGame];
		}
	}
}); // declare AbstractedWargame



/** # Terrain

*/

function distance(p1, p2) {
	var d0 = p1[0] - p2[0],
		d1 = p1[1] - p2[1];
	return Math.sqrt(d0 * d0 + d1 * d1);
}

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
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000001000000001111111100000000000000000",
		"000000000000000000000000000000000000000000000000",
		"111111000011111111111001111111111111111111111100",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"111111110011111111111001111111111111111111111100",
		"111111000011111111111001111111111111111111111100",
		"100000000011111111111001111111111111111111111100",
		"100000000111111111111001111111111111111111111100",
		"100111001111111111111001111111111111111111111100",
		"100110000111111111111001111111111111111111111100",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000001000000000000000000000000000000000",
		"000000000000001000000000000000000000000000000000",
		"000000000000001000000001111111100000000000000000",
		"000000000000001000000000000000000000000000000000",
		"000000000000001000000000000000000000000000000000",
		"000000000000001000000000000000000000000000000000",
		"000001111111111111111111111100000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"111111000011111111111001111111111111111111111100",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
		"000000000000000000000000000000000000000000000000",
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
		if (shooterUnit.army !== targetUnit.army) {
			return Infinity;
		}
		var distance = distance(shooterUnit.position, targetUnit.position);
		if (distance > shooterUnit.maxRange()) {
			return Infinity;
		} else {
			var sight = this.bresenham(shooterUnit.position, targetUnit.position, distance),
				pos;
			for (var i = 0; i < sight.length; i++) {
				pos = sight[i];
				if (!this.isVisible(pos) || this.__unitsByPosition__[pos] &&
						this.__unitsByPosition__[pos] !== targetUnit) {
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
	momentum: 0.67,
	decay: 0.21,
	iterations: 5,

	constructor: function InfluenceMap(game, role){
		this.grid = game.terrain.terrainGrid();
		this.role = role;
    },

	update: function update(game) {
		var influenceMap = this,
			grid = this.grid,
			pos;
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
			sign = army === this.role ? +1 : -1;
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
					grid[posX][posY] = imap.influence(unit) * sign;
				}
			});
		}
	},

	influence: function influence(unit) {
		return unit.worth(); //FIXME Too simple?
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
			inf;

		for (var r= 0; r <grid.length; r++) {
			for (var c = 0; c < grid[r].length;c++) {
				value=grid[r][c];
				if (!isNaN(value)) {
					inf = this.getMomentumInf(grid,r,c,decays);
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  value * (1 - momentum) + inf * momentum;
				}else{
					oneGrid[r]= !oneGrid[r] ? []: oneGrid[r];
					oneGrid[r][c] =  "t";
				}
			}
		}
		//console.log(Date.now()- start);
		return oneGrid;

    },


}); // declare InfluenceMap


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