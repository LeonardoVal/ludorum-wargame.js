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
			// .bool('isPinned', { ignore: true })
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
			return game.terrain.canShoot(assaulter, target)<=12;
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
	// ### Unit action executions ##################################################################

	/** At the beginning of its turn, every unit in the army becomes enabled, not activated and not
	moved.
	 */
	startRound: function startRound() {
		this.isActive = false;
		this.hasMoved = false;
		this.isEnabled = this.health() > 0;
		// this.isPinned = this.isPinned | false;
		return this.isEnabled;
	},

	/** Changes the given `game` state, marking this unit as `ACTIVATED`.
	 */
	activate: function activate(game) {
		raiseIf(!this.isEnabled, "Unit ", this.id, " is not enabled!");
		raiseIf(this.isActive, "Unit ", this.id, " is already active!");
		raiseIf(this.health() <= 0, "Unit ", this.id, " has been eliminated!");
		// raiseIf(this.isPinned, "Unit ", this.id, " is pinned!");

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

		//FIXME para pinned: si tenia mas de la mitad de los modelos iniciales, y quedo en menos de la mitad tira MoralAleatory, si falla queda pinned.
		//si ya estaba pinned entonces muere.
		//console.log("#########################hice pinned");

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
