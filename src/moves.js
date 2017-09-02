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