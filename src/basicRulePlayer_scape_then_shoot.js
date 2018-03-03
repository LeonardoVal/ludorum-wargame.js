var BasicRulePlayer_scape_then_shoot = exports.BasicRulePlayer_scape_then_shoot = declare(ludorum.Player, {
 /** The constructor takes the player's `name` and the following:
  */
 constructor: function BasicRulePlayer_scape_then_shoot(params) {
   ludorum.Player.call(this, params);
   initialize(this, params)
    .array('rules', { defaultValue: [] });
   this.__pendingActions__ = [];
   this.rules = this.ownRules();
   this.playerPossibleUnits = [];
   this.playerShootableUnits = [];
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

 /** The player makes a decision by calling the rules' functions in order. The first one to
 return a list of actions is used.
 */
 decision: function decision(game, player) {
   game.synchronizeMetagame();
   this.playerPossibleUnits = this.possibleUnits(game, player);
   this.playerShootableUnits = this.allShootableUnits(game, player);
   var rule, actions;
   if (this.__pendingActions__.length < 1) {
     for (var i=0; i<this.rules.length; i++){
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

 'static __SERMAT__': {
   identifier: 'BasicRulePlayer_scape_then_shoot',
   serializer: function serialize_BasicRulePlayer_scape_then_shoot(obj) {
     return this.serializeAsProperties(obj, ['name', 'rules']); //TODO Check function serialization.
   }
 },

 // ## Helper functions /////////////////////////////////////////////////////////////////////////
//accion basica shoot
 shoot: function shoot(unitX,unitY){
   return [new ActivateAction(unitX.id),new ShootAction(unitX.id,unitY.id)];
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
   var return_move = this.move(unitX,moveActions[Math.floor(Math.random()*moveActions.length)]);
   return return_move;
 },

// devuelve las unidades que el jugador puede usar en su proxima accion
possibleUnits: function possibleUnits(game, player){
  //[playerArmy, playerUnits, enemyArmy, enemyUnits]
  var playerUnits = this.armiesAndUnits(game,player)[1];
  var possibleUnits = [];
  playerUnits.forEach(function (pu) {
    if ((!pu.isDead()) && (pu.isEnabled) && (!pu.isActive)){
      possibleUnits.push(pu);
    }
  });
  return possibleUnits;
},
// devuelve una lista de unidades enemigas que pueden ser disparadas por la unidad atacante
shootableUnitsAux: function shootableUnitsAux(game, player, shooter){
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
// devuelve una lista de unidades enemigas que pueden ser disparadas por cada unidad aliada
allShootableUnits: function allShootableUnits(game, player){
  var allShootableUnits = [];
  var possibleUnits = this.playerPossibleUnits;
  for (var i = 0; i < possibleUnits.length; i++) {
    var shooter = possibleUnits[i];
    var shooterShootableUnits = [];
    shooterShootableUnits = this.shootableUnitsAux(game, player, shooter);
    allShootableUnits[i] = [shooter,shooterShootableUnits];
  }
  return allShootableUnits;
},
enemyShootableUnits: function enemyShootableUnits(game, player, shooter){
  var enemyShootableUnits = [];
  for (var psu=0; psu < this.playerShootableUnits.length; psu++){
   if(this.playerShootableUnits[psu][0]==shooter){
     enemyShootableUnits = this.playerShootableUnits[psu][1];
   }
  }
  return enemyShootableUnits;
},

//devuelve true si el shooter puede dispararle al target
 canShoot_: function canShoot_(game,shooter,target,walking){
   if (!shooter.isDead() && shooter.isEnabled && !target.isDead()){
     if (game.terrain.canShoot(shooter,target) != Infinity){
       return true;
     }
   }
   return false;
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
      if (this.canShoot_(game,eu,unitX,true)||this.canAssault(game,eu,unitX)){
        du.push(eu);
      }
    }
    return du;
   //return iterable(livingEnemyUnits).filter(function (eu) {
     //return this.canShoot_(game,eu,unitX,true)||this.canAssault(game,eu,unitX);
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
 //devuelve true si el assaulter puede asaltar al target
canAssault: function canAssault(game,assaulter,target){
  if (!assaulter.isDead() && assaulter.isEnabled && !target.isDead()){
    if (game.terrain.canShoot(assaulter,target) <= 12){
      return true;
    }
  }
  return false;
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
  // ## Rules /////////////////////////////////////////////////////////////////

 //si puede escaparse que se escape.
 rule_100: playerRule(100, function rule_100(game, player){
   var possibleUnits = this.playerPossibleUnits;
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     if (this.canScape(game,player,unitX)){
         //console.log("rule_100. scape");
         return this.scape(game,player,unitX);
     }
   }
   return null;
 }),

//si puede disparar que dispare
 rule_2: playerRule(2, function rule_2(game, player){
   var possibleUnits = this.playerPossibleUnits;
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
     for (var j = 0; j < enemyShootableUnits.length; j++) {
       var unitY = enemyShootableUnits[j];
       //console.log("rule_2. shoot");
       return this.shoot(unitX,unitY);
     }
   }
   return null;
 }),
 // si no puede asaltar entonces se movera
 rule_1: playerRule(1, function rule_1(game, player){
   //var enemyUnits = this.livingEnemyUnits(game, player),
   var possibleUnits = this.playerPossibleUnits;
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     var moveActions = unitX.getMoveActions(game);
     var return_move = this.move(unitX,moveActions[Math.floor(Math.random()*moveActions.length)]);
     //console.log("rule_1. move");
     return return_move;
   }
   return null;
 })

}); // declare BasicRulePlayer_scape_then_shoot
