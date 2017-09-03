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
   this.rules = this.ownRules();
 },

 /** Returns an array with the methods of this object whose name starts with `rule`.
  */
 ownRules: function ownRules() {
   var self = this;
   return Object.keys(Object.getPrototypeOf(this)).map(function (id) {
     return [self[id], 0];
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

 /** The player makes a decision by calling the rules' functions in order. The first one to
 return a list of actions is used.
 */
 decision: function decision(game, player) {
   game.synchronizeMetagame();
   var rule, actions;
   if (this.__pendingActions__.length < 1) {
     for (var i = 0, len = this.rules.length; i < len; i++) {
       rule = this.rules[i];
       actions = rule[0].call(this, game, player);
       if (actions) {
         actions.forEach(function (action) {
           action.__rule__ = rule;
         });
         this.__pendingActions__ = this.__pendingActions__.concat(actions);
         return this.__pendingActions__.shift();
       }
     }
   }
   raiseIf(this.__pendingActions__.length < 1, 'No rule applied to game!');
   return this.__pendingActions__.shift();
 },

 training: function training(game, opponent){
   opponent = opponent || new ludorum.players.RandomPlayer();
   var player = this,
     match = new ludorum.Match(game, [this, opponent]),
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
     if (!next.isContingent && next.round > round) {
       player.adjustWeights(game,game.players[0],roundActions,lastRoundGame);
       round = next.round;
       roundActions = [];
       lastRoundGame = game;
     }
   });
   return match.run().then(function (m) {
     player.adjustWeights(game,game.players[0],roundActions,lastRoundGame);
   });
 },

 /** The method `adjustWeights` check if the round has changed. If so, it adjusts the weights of
 the rules of the actions executed by the player in the round.
  */
 adjustWeights: function adjustWeights(game, player, roundActions, lastRoundGame) {
   if (game != lastRoundGame){
     var diff = this.gameWorth(game,player) - this.gameWorth(lastRoundGame,player);
     console.log("worth de game: "+this.gameWorth(game,player));//FIXME
     console.log("worth de lastRoundGame: "+this.gameWorth(lastRoundGame,player));//FIXME
     var rulesNames = [];
     console.log(Sermat.ser(roundActions));//FIXME
     roundActions.forEach(function (action) {
       if (!action.__rule__[1]){
         action.__rule__[1] = 0;
       }
       action.__rule__[1] += action.worth;
       var name = action.__rule__[0].name;
       if (rulesNames.indexOf(name) < 0){
         action.__rule__[1] += diff;
         rulesNames.push(name);
       }
     });
     var updateRules = [];
     roundActions.forEach(function (action) {
       var name = action.__rule__[0].name;
       if (updateRules.indexOf(name) < 0){
         updateRules.push(action);
       }
     });
     for (var i=0; i<updateRules.length; i++){
       for (var j=0; j<this.rules.length; j++){
         if (this.rules[j][0].name === updateRules[i].__rule__[0].name){
           this.rules[j][1] = updateRules[i].__rule__[1];
         }
       }
     }
     this.rules.forEach(function (rule) {
       console.log(rule[0]);
       console.log(rule[1]);
     });
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

 shoot: function shoot(unitX,unitY){
   return [new ActivateAction(unitX.id),new ShootAction(unitX.id,unitY.id)];
 },

 assault: function assault(unitX,unitY){
   return [new ActivateAction(unitX.id),new AssaultAction(unitX.id,unitY.id)];
 },

 move: function move(unitX,moveAction,shootUnitY){
   if (shootUnitY){
     //el shoot ya tiene EndTurnAction incorporado, si solo se mueve hay q agregarlo
     return [new ActivateAction(unitX.id),moveAction,new ShootAction(unitX.id,shootUnitY.id)];
   } else {
     return [new ActivateAction(unitX.id),moveAction,new EndTurnAction(unitX.id)];
   }
 },

 scape: function scape(game,player,unitX,moveAction){ //TODO testear y hacer el canHideFrom
   var mostDangerousUnits = this.mostDangerousUnits(game,player,unitX);
   for (var i = 0; i < mostDangerousUnits.length; i++) {
     var mdu = mostDangerousUnits[i];
     //raiseIf(true, 'this.canHideFrom(unitX,mdu)' + this.canHideFrom(unitX,mdu));
     if (this.canHideFrom(unitX,mdu) || this.canRunFrom(unitX,mdu)){
       return move(unitX,moveAction);
     }
     raiseIf(this.canHideFrom(unitX,mdu) || this.canRunFrom(unitX,mdu), 'puede escapar mdu pero siguio de largo ');
   }
   var dangerousUnits = this.dangerousUnits(game,player,unitX);
   for (var j = 0; j < dangerousUnits.length; j++) {
     var du = dangerousUnits[j];
     raiseIf(!du, '!du');
     if (this.canHideFrom(unitX,du) || this.canRunFrom(unitX,du)){
       return move(unitX,moveAction);
     }
     raiseIf(this.canHideFrom(unitX,du) || this.canRunFrom(unitX,du), 'puede escapar du pero siguio de largo ');
   }
   //raiseIf(true, 'entro al scape pero no podia escapar '); //nunca deberia entrar aca
   return null;
 },

 canShoot: function canShoot(game,shooter,target){
   if (shooter.isEnabled){
     var areaOfSightShooter=shooter.areaOfSight|| game.terrain.areaOfSight(shooter, shooter.maxRange() )[0];
     shooter.areaOfSight=areaOfSightShooter;
     if (game.terrain.canShoot(shooter,target) != Infinity){
       return true;
     }
   }
 },

 //si puede correr y alejarse el rango suficiente
 canRunFrom: function canRunFrom(runningUnit,enemyUnit){
   var range =  enemyUnit.models[0].equipments[0].range;
   //corre 12 pero el enemigo se acerca 6
   //TODO actualizar con el nuevo codigo de terreno
   if (runningUnit.isEnabled && game.terrain.canShoot(enemyUnit,runningUnit)<= range+6){
     return false;
   }
   return true;
 },

 //si puede cubrirse de las unidades enemigas tras otra unidad u terreno que quite linea de vision
 canHideFrom: function canHideFrom(hidingUnit,enemyUnit){ //TODO
   return false;
 },

 canScape: function canScape(game,player,unitX){
   var mostDangerousUnits = this.mostDangerousUnits(game,player,unitX);
   var canScape = true;
   for (var i = 0; i < mostDangerousUnits.length; i++) {
     var mdu = mostDangerousUnits[i];
     if (!this.canRunFrom(unitX,mdu) && !this.canHideFrom(unitX,mdu)){
       canScape = false;
     }
   }
   return canScape;
 },

 // devuelve las unidades enemigas que pueden matar a la unidadX
 mostDangerousUnits: function mostDangerousUnits(game,player,unitX){
   var mostDangerousUnits = [];
   var livingEnemyUnits = this.livingEnemyUnits(game,player);
   for (var i = 0; i < livingEnemyUnits.length; i++) {
     var enemyUnit = livingEnemyUnits[i];
     if(this.canKill(game,enemyUnit,unitX)){
       mostDangerousUnits.push(enemyUnit);
     }
   }
   return mostDangerousUnits;
 },

 // devuelve las unidades enemigas que pueden atacar a la unidadX
 dangerousUnits: function dangerousUnits(game,player,unitX){
   var dangerousUnits = [];
   var livingEnemyUnits = this.livingEnemyUnits(game,player);
   for (var i = 0; i < livingEnemyUnits.length; i++) {
     var enemyUnit = livingEnemyUnits[i];
     if (this.canShoot(game,enemyUnit,unitX)){
       dangerousUnits.push(enemyUnit);
     }
   }
   return dangerousUnits;
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
     var distance = game.terrain.canShoot(unitX, unitY);
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
     if (this.canShoot(game,unitX,unitY)){ //FIXME deveria fijarse con 12 nomas
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
   var shootableUnits = [];
   var enemyUnits = this.livingEnemyUnits(game,player);
   var shootActions = shooter.getShootActions(game);
   shootActions.forEach(function(shootAction){
     for(var eu in enemyUnits){
       var target = enemyUnits[eu];
       if(shootAction.targetId === target.id){
         shootableUnits.push(target);
       }
     }
   });
   return shootableUnits;
 },

 // devuelve una lista de unidades enemigas que pueden ser asaltadas por la unidad atacante
 //TODO testear
 assaultableUnits: function assaultableUnits(game, player, assaulter){
   var assaultableUnits = [];
   var enemyUnits = this.livingEnemyUnits(game,player);
   var assaultActions = assaulter.getAssaultActions(game);
   assaultActions.forEach(function(assaultAction){
     for(var eu in enemyUnits){
       var target = enemyUnits[eu];
       if(assaultAction.targetId === target.id){
         assaultableUnits.push(target);
       }
     }
   });
   return assaultableUnits;
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

 // ## Rules /////////////////////////////////////////////////////////////////


 //-------------------------priority 1-----------------------------------------
 rule_1A: playerRule(1, function rule_1A(game, player){
   if (game.round === 0){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
         if (this.canScape(game,player,unitX)){
           var moveActions = unitX.getMoveActions(game);
           var len = moveActions.length;
           if (len > 0) {
             return this.scape(game,player,unitX,moveActions[Math.floor(Math.random()*len)]);
             //FIXME que se aleje de el que le puede atacar por ej..
           }
         }
       }
     }
   }
   return null;
 }),
 rule_1B: playerRule(1, function rule_1B(game, player){
   if (game.round === 1){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
         if (this.canScape(game,player,unitX)){
           var moveActions = unitX.getMoveActions(game);
           var len = moveActions.length;
           if (len > 0) {
             return this.scape(game,player,unitX,moveActions[Math.floor(Math.random()*len)]);
             //FIXME que se aleje de el que le puede atacar por ej..
           }
         }
       }
     }
   }
   return null;
 }),
 rule_1C: playerRule(1, function rule_1C(game, player){
   if (game.round === 2){
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
   }
   return null;
 }),
 /*rule_1D: playerRule(1, function rule_1D(game, player){
   if (game.round === 3){
     var possibleUnits = this.possibleUnits(game, player);
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
         var enemyUnits = this.assaultableUnits(game, player, unitX);
         for (var j = 0; j < enemyUnits.length; j++) {
           var unitY = enemyUnits[j];
           return this.assault(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),*/
 /*si puede disparar a algo, disparar*/
 // ex rule_1A
 rule_1E: playerRule(1, function rule_1E(game, player){
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
 /*si no puede disparar a nada, moverse*/
 // ex rule_1B
 rule_1F: playerRule(1, function rule_1F(game, player){
   var livingEnemyUnitsList = this.livingEnemyUnits(game, player),
     possibleUnits = this.possibleUnits(game, player);
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
       for (var j = 0; j < livingEnemyUnitsList.length; j++) {
         var unitY = livingEnemyUnitsList[j];
         if (!this.canShoot(game,unitX,unitY)){
           var moveActions = unitX.getMoveActions(game);
           var len = moveActions.length;
           if (len > 0) {
             return this.move(unitX,moveActions[Math.floor(Math.random()*len)]);
             //FIXME que se acerque a algo (ej: a la mas eliminable)
           }
         }
       }
     }
   }
   return null;
 })

/*
 //priority 3 -----------------------------------------------------------------
 /*si es la ronda 1 y hay al menos 2 unidades enemigas vivas, disparar a la mas cara
 rule_3A: playerRule(3, function rule_3A(game, player){
   var possibleUnits = this.possibleUnits(game, player);
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var enemyArmy = this.armiesAndUnits(game,player)[2];
   if (game.round === 0){ //&& livingEnemyUnitsList.length>1){
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
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
   }
   return null;
 }),

 //priority 2 -----------------------------------------------------------------
 /*si es la ronda 0 y el enemigo esta herido, asaltar a ese enemigo
 rule_2A: playerRule(2, function rule_2A(game, player){
   var livingEnemyUnitsList = this.livingEnemyUnits(game, player);
   var possibleUnits = this.possibleUnits(game, player);
   if (game.round === 0){
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
         for (var j = 0; j < livingEnemyUnitsList.length; j++) {
           var unitY = livingEnemyUnitsList[j];
            if (this.wounded(unitY,game) && this.canShoot(game,unitX,unitY)){
              return this.assault(unitX,unitY);
            }
         }
       }
     }
   }
   return null;
 }),

 //priority 1 -----------------------------------------------------------------
 /*si puede disparar a algo, disparar
 rule_1A: playerRule(1, function rule_1A(game, player){
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
 /*si no puede disparar a nada, moverse
 rule_1B: playerRule(1, function rule_1B(game, player){
   var livingEnemyUnitsList = this.livingEnemyUnits(game, player),
     possibleUnits = this.possibleUnits(game, player);
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     if (!unitX.isDead() && !unitX.isActive && unitX.isEnabled){
       for (var j = 0; j < livingEnemyUnitsList.length; j++) {
         var unitY = livingEnemyUnitsList[j];
         if (!this.canShoot(game,unitX,unitY)){
           var moveActions = unitX.getMoveActions(game);
           var len = moveActions.length;
           if (len > 0) {
             return this.move(unitX,moveActions[Math.floor(Math.random()*len)]);
             //FIXME que se acerque a algo (ej: a la mas eliminable)
           }
         }
       }
     }
   }
   return null;
 })
 */


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
 */
