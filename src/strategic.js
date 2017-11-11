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
			moves = actions.filter(function (m) {
				if (m instanceof MoveAction) {	//Desicion basada en influencia decidiendo si moverme o moverme para atacar //puede romper los movimientos
												//
												// Me da los movimientos en base a distancia directa,
												// Esto supone que menor distancia = mas cerca pero caminos hace eso incorrecto
												//deberia influir la influencia en vez de distancia directa, el que le falten menos turnos tb
												//Deberia ir ya deberian estar ordenadas por estos
					m.__distance__ = game.terrain.distance(m.position, target.position);
					return true;
				} else {
					return false;
				}// Esto se deberia remplazar por una eleccion basada en influencia de canShoot de beria sacar un filter
			}),

			approaches= moves.filter(function (m) {
				//range = shooter.model.range
				 //si ya la calcule para la unidad la deberia usar no la deberia pasar entre turno y turno pero deberia mantenersepor el turno
				m.__range__ = game.terrain.canShoot(shooter, target);
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
		var g = abstractedGame.concreteGame,
			attacker = this.unitById(g, this.unitId),
			target = this.unitById(g, this.targetId),
			activePlayer = g.activePlayer();
		// First activate the abstract action's unit.
		g = g.next(obj(activePlayer, new ActivateAction(this.unitId)), null, update);
		var //actions = g.moves()[activePlayer],
			canShoot = g.terrain.canShoot(attacker, target),
			shots = this.getShots(g, actions);
		if (!canShoot) {
			//FIXME Do not use generated moves, generate them.
			g = this.executeMovement(g, actions, update);
			if (g.__activeUnit__ && g.__activeUnit__.id === attack.unitId) {
				canShoot = g.terrain.canShoot(shooter, target);
			}
		}
		if (canShoot) {
			g = g.next(obj(activePlayer, new ShootAction(attacker.id, target.id)));
		}
		if (g.__activeUnit__ && g.__activeUnit__.id === attack.unitId) {
			g = g.next(obj(activePlayer, new EndTurnAction(attacker.id)), null, update);
		}
		abstractedGame.concreteGame = g;
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
		var nextGame = update ? this : Sermat.clone(this),
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
