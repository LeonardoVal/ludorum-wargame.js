var BasicRulePlayer_shoot = exports.BasicRulePlayer_shoot = declare(ludorum.Player, {
 /** The constructor takes the player's `name` and the following:
  */
 constructor: function BasicRulePlayer_shoot(params) {
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
   identifier: 'BasicRulePlayer_shoot',
   serializer: function serialize_BasicRulePlayer_shoot(obj) {
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
   var return_move = this.move(unitX,moveActions[Math.floor(Math.random()*moveActions.length)]);
   return return_move;
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

 getFewMoveActions: function getFewMoveActions(game,unitX){
   var fewMoveActions = [];
   var x = unitX.position[0];
   var y = unitX.position[1];
   fewMoveActions.push(new MoveAction(unitX.id, [x+1, y+1], false));
   //return new MoveAction(unitX.id, [+pos[0], +pos[1]], v > 6);
   return fewMoveActions;
 },

 // retorna el move que hace que unitX se acerque lo mas posible a unitZ
 getCloseTo: function getCloseTo(game,unitX,unitZ){
    //encuentro a linea de posiciones entre unitX y unitZ
    var interpolatedPos = this.interpolation(unitX.position,unitZ.position);
    //pongo en una lista todos los movimientos que lleven a la linea
    var moveActions = unitX.getMoveActions(game);
    //var moveActions = this.getFewMoveActions(game, unitX);
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
    var return_move = this.move(unitX,move);
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
 if (this.canShoot_(game,shooter,target,true)){
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

//si puede disparar que dispare
 rule_100: playerRule(100, function rule_100(game, player){
   var possibleUnits = this.playerPossibleUnits;
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
     for (var j = 0; j < enemyShootableUnits.length; j++) {
       var unitY = enemyShootableUnits[j];
       console.log("rule_100. shoot");
       return this.shoot(unitX,unitY);
     }
   }
   return null;
 }),
 // si no puede disparar que se acerque al enemigo mas facil de matar
 rule_1F: playerRule(1, function rule_1F(game, player){
   //var enemyUnits = this.livingEnemyUnits(game, player),
   var possibleUnits = this.playerPossibleUnits;
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
     if (enemyShootableUnits.length==0){
       var enemyUnits = this.livingEnemyUnits(game, player);
       for (var k=0; k<enemyUnits.length;k++){
         var eu = enemyUnits[k];
         if (this.easiestToKill(enemyUnits,eu)){
           console.log("rule_1F. move");
           var move = this.getCloseTo(game,unitX,eu);
           return move;
         }
       }
     }
   }
   return null;
 })

}); // declare DynamicScriptingPlayer
