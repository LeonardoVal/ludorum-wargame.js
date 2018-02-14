

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
