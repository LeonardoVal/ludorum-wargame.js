var BasicRulePlayer_assist = exports.BasicRulePlayer_assist = declare(ludorum.Player, {
 /** The constructor takes the player's `name` and the following:
  */
 constructor: function BasicRulePlayer_assist(params) {
   ludorum.Player.call(this, params);
   initialize(this, params)
    .array('rules', { defaultValue: [] });
   this.__pendingActions__ = [];
   this.rules = this.ownRules();
   this.playerPossibleUnits = [];
   this.playerShootableUnits = [];
   this.playerAssaultableUnits = [];
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
   this.playerAssaultableUnits = this.allAssaultableUnits(game, player);
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
   identifier: 'BasicRulePlayer_assist',
   serializer: function serialize_BasicRulePlayer_assist(obj) {
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

 //metodo auxiliar para la funcion assist
 assistAux: function assistAux(game,player,enemyUnits,unitX,unitX2){
   for (var i=0;i<enemyUnits.length;i++){
      var eu = enemyUnits[i];
      if (this.canAssault(game,unitX,eu)){
        return this.assault(unitX,eu);
      }
      var moveAction;
      if (this.canBlockSight(game,unitX,unitX2,eu)){
        var blockSightMovements = this.blockSightMovements(game,unitX,unitX2,eu);
        moveAction = blockSightMovements[Math.floor(Math.random()*blockSightMovements.length)];
      }
      if (this.canShoot_(game,unitX,eu,true)){
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
// devuelve una lista de unidades enemigas que pueden ser asaltadas por cada unidad aliada
allAssaultableUnits: function allAssaultableUnits(game, player){
  var allAssaultableUnits = [];
  var possibleUnits = this.playerPossibleUnits;
  for (var i = 0; i < possibleUnits.length; i++) {
    var assaulter = possibleUnits[i];
    var assaulterAssaultableUnits = [];
    assaulterAssaultableUnits = this.assaultableUnits(game, player, assaulter);
    allAssaultableUnits[i] = [assaulter,assaulterAssaultableUnits];
  }
  return allAssaultableUnits;
},
enemyAssaultableUnits: function enemyAssaultableUnits(game, player, assaulter){
  var enemyAssaultableUnits = [];
  for (var pau=0; pau < this.playerAssaultableUnits.length; pau++){
   if(this.playerAssaultableUnits[pau][0]==assaulter){
     enemyAssaultableUnits = this.playerAssaultableUnits[pau][1];
   }
  }
  return enemyAssaultableUnits;
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
 //devuelve true si el assaulter puede asaltar al target
 canAssault: function canAssault(game,assaulter,target){
   if (!assaulter.isDead() && assaulter.isEnabled && !target.isDead()){
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
   var interForX;
   var interForY;
   if (ya===yb){
     interForX = this.interForX(xmin,xmax,y_xmin,delta);
     return interForX;
   } else {
     if (xa===xb){
       interForY = this.interForY(ymin,ymax,x_ymin,delta);
       return interForY;
     } else {
       if (Math.abs(yb-ya) >= Math.abs(xb-xa)){
         delta = Math.abs(xb-xa) / Math.abs(yb-ya);
         interForY = this.interForY(ymin,ymax,x_ymin,delta);
         return interForY;
       } else {
         delta = Math.abs(yb-ya) / Math.abs(xb-xa);
         interForX = this.interForX(xmin,xmax,y_xmin,delta);
         return interForX;
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
     if (this.canBlockSight(game,unitX,unitX2,du)||this.canShoot_(game,unitX,du,true)||this.canAssault(game,unitX,du)){
       canAssist = true;
     } else {
       canAssist = false;
       break;
     }
   }
   //si nadie lo puede atacar, no tiene de que asistir
   return canAssist;
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

 // devuelve una lista de unidades enemigas que si shooter les dispara las mata
 shootingKillableUnits: function shootingKillableUnits(game,player,shooter){
   var shootingKillableUnits = [];
   var enemyUnits = this.shootableUnitsAux(game,player,shooter);

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


 // ## Rules /////////////////////////////////////////////////////////////////
 // si puede asistit, que asista
 rule_100: playerRule(100, function rule_100(game, player){
   var possibleUnits = this.playerPossibleUnits;
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var units = this.armiesAndUnits(game,player)[1];
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     for (var j = 0; j < units.length; j++) {
       var unitX2 = units[j];
       if (this.canAssist(game,player,unitX,unitX2)){
         console.log("rule_100. assist");
         return this.assist(game,player,unitX,unitX2);
       }
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
     console.log("rule_1. move");
     return return_move;
   }
   return null;
 })

}); // declare BasicRulePlayer_assist
