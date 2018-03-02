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


function newPosition(unitPos, targetPos) {
 if (unitPos[0]<targetPos[0]){
	 return [targetPos[0]-1,targetPos[1]];
 }
 if (unitPos[0]>targetPos[0]){
	 return [targetPos[0]+1,targetPos[1]];
 }
 if (unitPos[1]<targetPos[1]){
	 return [targetPos[0],targetPos[1]-1];
 }
 if (unitPos[1]>=targetPos[1]){
	return [targetPos[0],targetPos[1]+1];
 }
}
/** ## AssaultAction ###############################################################################
*/
var AssaultAction = exports.AssaultAction = declare(GameAction, {

	constructor: function AssaultAction(unitId, targetId) {
		this.unitId = unitId;
		this.targetId = targetId;
	},

	aleatories: function aleatories(game) {
		var assaulter = this.unitById(game),
			target = this.unitById(game, this.targetId),
			distance = game.terrain.canShoot(assaulter, target),
			attackCount = 0;
		if (distance<=12){
			assaulter.models.forEach(function (model) {
				model.equipments.forEach(function (equipment) {
						attackCount += equipment.attacks;
				});
			});
		}
		var defense = target.defense;
		// if (target.isPinned){
		// 	defense = defense - 1;
		// }
		var aleatory = new ShootAleatory(assaulter.quality, defense, attackCount);
		var enemyAttackCount = 0;
		target.models.forEach(function (enemyModel) {
			enemyModel.equipments.forEach(function (eq) {
					enemyAttackCount += eq.attacks;
			});
		});

		// var pinnedAleatory;
		// if (enemyAttackCount < attackCount){
		// 	//FIXME MoralAleatory no ShootAleatory
		// 	pinnedAleatory = new ShootAleatory(target.quality, 0, 1);
		// 	console.log(pinnedAleatory);
		// 	if (pinnedAleatory>0){
		// 		console.log("#########################hice pinned");
		// 	   target.isPinned = true;
		// 	}
		// }else {
		// 	if (enemyAttackCount > attackCount){
		// 		//FIXME MoralAleatory no ShootAleatory
		// 		pinnedAleatory = new ShootAleatory(assaulter.quality, 0, 1);
		// 		if (pinnedAleatory>0){
		// 			console.log("#########################estoy pinned");
		// 			 assaulter.isPinned = true;
		// 		}
		// 	}
		// }


		var enemyAleatory = new ShootAleatory(target.quality, assaulter.defense, enemyAttackCount);
		return { wounds: aleatory, enemyWounds: enemyAleatory };
	},



	execute: function execute(game, haps) {
		var wounds = haps.wounds;
		var targetUnit = this.unitById(game, this.targetId);
		var unit = this.unitById(game, this.unitId);
		this.worth = 0;
		//si hay heridas se las aplica a la unidad enemiga
		if (wounds > 0) {
			targetUnit.suffer(game, wounds);
		}
		//si murio la unidad enemiga se suma su coste total
		if (targetUnit.isDead(game)){
			this.worth += targetUnit.cost();
		}
		// se suma el coste de cada herida aplicada en la unidad enemiga
		this.worth += targetUnit.cost()*wounds/targetUnit.size();

		//contraataque
		var counterWounds = haps.enemyWounds,
		  livingEnemyModels = targetUnit.livingModels().length;
		counterWounds = Math.round(livingEnemyModels * counterWounds / targetUnit.size());
		//si hay heridas se las aplica a la unidad enemiga
		if (counterWounds > 0) {
			unit.suffer(game, counterWounds);
		}
		//si murio la unidad asaltante se resta su coste total
		if (unit.isDead(game)){
			this.worth -= unit.cost();
		}
		// se resta el coste de cada herida aplicada en la unidad asaltante
		this.worth -= unit.cost()*counterWounds/unit.size();

		//la unidad asaltante se mueve al lado de la enemiga y se termina el turno
		var new_position = newPosition(unit.position, targetUnit.position);
		this.unitById(game).move(game, new_position, false);
		this.unitById(game, this.unitId).endTurn(game);
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

var MoralAleatory = exports.MoralAleatory = declare(ludorum.aleatories.Aleatory, {
	constructor: function MoralAleatory(quality) {
		this.quality = quality |0;
		this.__prob__ = Math.max(0, Math.min(1, (6 - quality + 1) / 6));
		//FIXME es una única tirada de datos que tiene que superar o igualar la quality
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
		identifier: 'MoralAleatory',
		serializer: function serialize_MoralAleatory(obj) {
			return [obj.quality];
		}
	}
});
