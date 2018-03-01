function playerRule(priority, fun) {
 fun.priority = priority;
 return fun;
}

function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var roundActions_global = [];

var DynamicScriptingPlayer = exports.DynamicScriptingPlayer = declare(ludorum.Player, {
 /** The constructor takes the player's `name` and the following:
  */
 constructor: function DynamicScriptingPlayer(params) {
   ludorum.Player.call(this, params);
   initialize(this, params)
    .array('rules', { defaultValue: [] });
   this.__pendingActions__ = [];
   this.rules = this.ownRules();
   this.sortRules();
   this.roundActions = [];
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

 /** Sorts the rules first by priority (descending), then by weight (descending).
  */
 sortRules: function sortRules() {
   this.rules.sort(function (r1, r2) {
     return r2[0].priority - r1[0].priority || r2[1] - r1[1];
   });
 },

 sortRuleListByWeight: function sortRuleListByWeight(ruleList) {
   if (ruleList.length > 0){
     ruleList.sort(function (r1, r2) {
       return r2[1] - r1[1];
     });
   }
 },
 //devuelve la lista de reglas de la prioridad indicada
 firstRules: function firstRules(game,player,priority){
   var rule, actions;
   var retRules = [];
   for (var i = 0, len = this.rules.length; i < len; i++) {
     if (this.rules[i][0].priority==priority){
       rule = this.rules[i];
       actions = rule[0].call(this, game, player);
       if (actions) {
         retRules.push(rule);
       }
     }
   }
   this.sortRuleListByWeight(retRules);
   return retRules;
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
   //[playerArmy, playerUnits, enemyArmy, enemyUnits]
   var armiesAndUnits = this.armiesAndUnits(game,player);
   var units = armiesAndUnits[1];
   var enableds = 0;
   for (var m=0; m<units.length;m++){
     if (units[m].isEnabled || units[m].isActive){
       enableds += 1;
     }
   }
   var gameWorth = 0;
   // si es el principio de la ronda
   if (enableds === units.length){
     gameWorth = this.gameWorth(game, player);
   }
   var roundActions = this.roundActions,
     lastRoundGame = game;
   if (this.__pendingActions__.length < 1) {
      //for (var i = 0, len = this.rules.length; i < len; i++) {
      var maxPriority = 12; //la mayor prioridad con reglas programadas
      while (maxPriority >0){
         //rule = this.rules[i];
         var firstRules = this.firstRules(game,player,maxPriority);
         if (firstRules.length>0){
           var sumWeight = 0;
           for (var j=0; j<firstRules.length; j++){
              var firstRule = firstRules[j];
              sumWeight += firstRule[1];
           }
           // ya hay alguna regla con peso asignado
           if (sumWeight > firstRules.length){
             var prob = 0;
             var sumProb = 0;
             var rand = Math.random();
             for (var k=0; k<firstRules.length; k++){
              prob = firstRules[k][1]/sumWeight;
              sumProb += prob;
              if (rand<=sumProb){
                rule = firstRules[k];
                actions = rule[0].call(this, game, player);
              }
             }
           } else { //todavia no se aplico pesos a las reglas
             rule = firstRules[Math.floor(Math.random()*firstRules.length)];
             actions = rule[0].call(this, game, player);
           }
           if (actions) {
             actions.forEach(function (action) {
               action.__rule__ = rule;
             });
             this.__pendingActions__ = this.__pendingActions__.concat(actions);
             roundActions = roundActions.concat(actions);
             this.roundActions = roundActions;
             roundActions_global = roundActions_global.concat(actions);

             var activateds = 0;
             for (var l=0; l<units.length;l++){
               if (!units[l].isEnabled || units[l].isActive){
                 activateds += 1;
               }
             }
             return this.__pendingActions__.shift();
           }
         } else { // no se cumple ninguna regla para la maxima prioridad, bajar de prioridad
           maxPriority -= 1;
         }
       }
     }
   raiseIf(this.__pendingActions__.length < 1, 'No rule applied to game!');
   return this.__pendingActions__.shift();
 },

 participate: function participate(match, role){
   this.attachToMatch(match.state(),match);
   return this;
 },

 attachToMatch: function attachToMatch(game,match){
   var player = this,
     round = 0,
     lastRoundGame = game;

   match.events.on('next', function (game, next, match) {
     //roundActions = this.roundActions;
     if (!next.isContingent && next.round > round && !game.isContingent) {
       player.adjustWeights(game,game.players[0],roundActions_global,lastRoundGame);
       //player.adjustWeights(game,game.players[0],roundActions,lastRoundGame);
       round = next.round;
       //this.roundActions = [];
       //roundActions = this.roundActions;
       roundActions_global = [];
       lastRoundGame = game;
     }
   });
 },

//en desuso
 // training: function training(game, opponent){
 //   opponent = opponent || new ludorum.players.RandomPlayer();
 //   var match = new ludorum.Match(game, [this, opponent]),
 //     lastRoundGame = game;
 //     this.attachToMatch(lastRoundGame,match);
 // },

adjustWeights: function adjustWeights(game, player, roundActions, lastRoundGame) {
  var rules = this.rules;

  for (reg=0;reg<rules.length;reg++){
    if(rules[reg][1] < 0){
      console.log("rules[reg][1]<0");
      console.log(rules[reg][0].name);
      rules[reg][1] = rules[reg][1]*(-1);
    }
    if(isNaN(rules[reg][1])){
      console.log("isNaN(rules[reg][1])");
      console.log(rules[reg][0].name);
      raiseIf(isNaN(rules[reg][1]), 'rules[reg][1]');
    }
  }

  var reglasAplicadas = [];
  roundActions.forEach(function (ra){
    if (reglasAplicadas.indexOf(ra.__rule__)<0){
      reglasAplicadas.push(ra.__rule__);
    }
  });
  var lastGameWorth = this.gameWorth(lastRoundGame,player);
  var diff = (this.gameWorth(game,player) - lastGameWorth)/10;
  // si diff da negativo, a todas las reglas, salvo las que jugaron en esta ronda, se les suma diff
  var reg,
    rap,
    name;
  if (diff <0){
    for (reg=0;reg<rules.length;reg++){
      if(reglasAplicadas.indexOf(rules[reg])<0){
        rules[reg][1] += diff*(-1);
      }
    }
  }
 else { // si diff da positivo se lo sumara una vez a cada regla aplicada en esta ronda
    for (reg=0;reg<rules.length;reg++){
      if(reglasAplicadas.indexOf(rules[reg])>=0){
        rules[reg][1] += diff;
      }
    }
  }
  // para cada accion calculo su valor
  for (var roundAction=0; roundAction<roundActions.length; roundAction++){
    var action = roundActions[roundAction];
    name = action.__rule__[0].name;
    if (!action.__rule__[1]){
      action.__rule__[1] = 1;
    }
    var worthDiv10 = 0;
    if (isFunction(action.worth)){
      worthDiv10 = action.worth()/10;
    } else {
      worthDiv10 = action.worth/10;
    }

    for (reg=0; reg<this.rules.length; reg++){
      // si el valor de la accion es < 0, a cada accion que no sea esta,
      //se le suma a su regla el valor de esta accion
      if (worthDiv10<0){
        if (this.rules[reg][0].name != name){
           this.rules[reg][1] += worthDiv10*(-1);
        }
      } else { // si da positivo, a la regla de esta accion se le suma el valor de esta accion
        if (this.rules[reg][0].name == name){
           this.rules[reg][1] += worthDiv10;
        }
      }
   }
 }
 // this.rules = rules;

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
     return this.bestAttackResult(game,attacker,target)>=75;
   }
   return false;
 },
 // devuelve true si el porcentaje de daño en el mejor caso de la unidad atacante hacia la defensora es > 0
 canWound: function canWound(game,attacker,target){
   if (!attacker.isDead() && attacker.isEnabled && !target.isDead()){
     return this.bestAttackResult(game,attacker,target)>0;
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
   if (unit.quality >=4 && unit.defense<=3){
     return "fastAttack";  // si tienen poca defensa y mucha calidad o scouts, strider, flying, fast
   }
   if (unit.defense>=7){
     return "heavySupport"; //tankes o AP(x), regeneration, stealth, tought(x)
   }
   if (unit.size()>=5 && unit.cost()<=130){
     return "troop"; //si son varios modelos y el costo es bajo
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
 canPin: function canPin(game,assaulter,target){ //FIXME cuando puede dejar a la mitad de los modelos iniciales (si es que ahora tiene mas)
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
 isMelee: function isMelee(unit){
   var shootRange = 0;
   var shootAttacks = 0;
   var livingModels = unit.livingModels();
   livingModels.forEach(function (model) {
       model.equipments.forEach(function (eq) {
         if (eq.range >= shootRange) {
           shootRange = eq.range;
           shootAttacks = eq.attacks;
         }
       });
    });
    if (shootRange === 0){
      return true;
    }
    livingModels.forEach(function (model) {
       model.equipments.forEach(function (eq) {
         if (eq.range === 0 && eq.attacks > shootAttacks) {
           return true;
         }
       });
    });
    //FIXME considerar las habilidades
    /*livingModels.forEach(function (model) {
         model.equipments.forEach(function (eq) {
           if (eq.range === 0 && eq.attacks > 1) {
             if ("furiuos" in model.specials || "impact(x)" in model.specials){
               return true;
             }
           }
         });
    });*/
    return false;
  },

 // ## Rules /////////////////////////////////////////////////////////////////

//-------------------------priority 12 ex16-----------------------------------------
/* si es la ronda final y voy perdiendo, y paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2,
y el coste de X es mayor al de Y2, y el coste de unitX2 es mayor que el de unitX,
y puede asistir a unitX2 entonces asistir*/
rule_12A: playerRule(12, function rule_12A(game, player){
    if (game.round === 3 && !this.winning(game)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyShootableUnits.length; j2++) {
                var unitY2 = enemyShootableUnits[j2];
                if (this.willWoundShooting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                  for (var k = 0; k < units.length; k++) {
                    var unitX2 = units[k];
                    if (unitX2.cost()>unitX.cost()&&this.canAssist(game,player,unitX,unitX2)){
                     console.log("rule_12A. assist");
                     return this.assist(game,player,unitX,unitX2);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy perdiendo, y queda activacion ganadora y no paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX no puede escapar, entonces asaltar a unitY2, */
rule_12B: playerRule(12, function rule_12B(game, player){
    if (game.round === 3 && !this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&!this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyAssaultableUnits.length; j2++) {
                var unitY2 = enemyAssaultableUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_12B. assault");
                   return this.assault(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy perdiendo, y queda activacion ganadora y no paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX puede escapar, entonces escapa,*/
rule_12C: playerRule(12, function rule_12C(game, player){
    if (game.round === 3 && !this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyAssaultableUnits.length; j2++) {
                var unitY2 = enemyAssaultableUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_12C. scape");
                   return this.scape(game,player,unitX);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy perdiendo, y queda una activacion ganadora
 si pueden matar a unitX y van a herirla, si unitX puede matar y va a herir,
 si el costo de unitX es mayor al del que puede mata,
 y la unitX no puede escapar entonces entonces ataca a unitY2*/
rule_12D: playerRule(12, function rule_12D(game, player){
    if (game.round === 3 && !this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&!this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyShootableUnits.length; j2++) {
                var unitY2 = enemyShootableUnits[j2];
                if (this.willWoundShooting(game,unitX,unitY2)&&this.canKill(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_12D. shoot");
                   return this.shoot(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
//-------------------------priority 11 ex15-----------------------------------------
/* si es la ronda final y voy perdiendo,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX puede escapar, entonces escapa,*/
rule_11A: playerRule(11, function rule_11A(game, player){
    if (game.round === 3 && !this.winning(game)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyAssaultableUnits.length; j2++) {
                var unitY2 = enemyAssaultableUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_11A. scape");
                   return this.scape(game,player,unitX);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy ganando, y queda activacion ganadora,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y unitX puede escapar, entonces escapa,*/
rule_11B: playerRule(11, function rule_11B(game, player){
    if (game.round === 3 && this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyAssaultableUnits.length; j2++) {
                var unitY2 = enemyAssaultableUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_11B. scape");
                   return this.scape(game,player,unitX);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy ganando, y queda activacion ganadora,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, y no unitX puede escapar, entonces asalta a Y2,*/
rule_11C: playerRule(11, function rule_11C(game, player){
    if (game.round === 3 && this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&!this.canScape(game,player,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyAssaultableUnits.length; j2++) {
                var unitY2 = enemyAssaultableUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_11C. assault");
                   return this.assault(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
/* si es la ronda final y voy perdiendo, y no queda activacion ganadora y no paso a perder si matan a unitX,
si pueden matar a unitX y van a herirla, si unitX va a herir a unitY2 mas de la mitad asaltando,
y el coste de X es mayor al de Y2, entonces asalta,*/
rule_11D: playerRule(11, function rule_11D(game, player){
    if (game.round === 3 && this.winning(game) && this.winningActivation(game,player)){
      var possibleUnits = this.playerPossibleUnits;
      //[playerArmy, playerUnits, enemyArmy, enemyUnits]
      var units = this.armiesAndUnits(game,player)[1];
      var enemyUnits = this.livingEnemyUnits(game, player);
      for (var i = 0; i < possibleUnits.length; i++) {
        var unitX = possibleUnits[i];
        var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
        if (this.canBeKilled(game,player,unitX)&&!this.losingGameByUnitElimination(game,unitX)){
          for (var j = 0; j < enemyUnits.length; j++) {
            var unitY = enemyUnits[j];
            if (this.willWoundShooting(game,unitY,unitX)){
              for (var j2 = 0; j2 < enemyAssaultableUnits.length; j2++) {
                var unitY2 = enemyAssaultableUnits[j2];
                if (this.willWoundHalfAssaulting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                   console.log("rule_11D. assault");
                   return this.assault(unitX,unitY2);
                }
              }
            }
          }
        }
      }
    }
 return null;
}),
//-------------------------priority 10 ex12-----------------------------------------
/*si ronda = 1 y this.unitIsStrongest(enemyUnits,unitY) y this.willWoundHalfAssaulting(game,unitX,unitY)
y this.isMelee(unitX) entonces this.assault(unitX,unitY)*/
rule_10A: playerRule(1000000, function rule_10A(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
      if (this.isMelee(unitX)){
        for (var j=0; j<enemyAssaultableUnits.length; j++){
          var unitY = enemyAssaultableUnits[j];
          if (this.unitIsStrongest(enemyAssaultableUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
             console.log("rule_10A. assault");
             return this.assault(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 2 y this.unitIsStrongest(enemyUnits,unitY) y this.willWoundHalfAssaulting(game,unitX,unitY)
y this.isMelee(unitX) entonces this.assault(unitX,unitY)*/
rule_10B: playerRule(10, function rule_10B(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
      if (this.isMelee(unitX)){
        for (var j=0; j<enemyAssaultableUnits.length; j++){
          var unitY = enemyAssaultableUnits[j];
          if (this.unitIsStrongest(enemyAssaultableUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
             console.log("rule_10B. assault");
             return this.assault(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),


//-------------------------priority 9 ex11-----------------------------------------
/*si ronda = 2 y this.easiestToKill(enemyUnits,unitY) y
this.willWoundHalfAssaulting(game,unitX,unitY)
entonces this.assault(unitX,unitY)*/
rule_9A: playerRule(9, function rule_9A(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
      for (var j=0; j<enemyAssaultableUnits.length; j++){
        var unitY = enemyAssaultableUnits[j];
        if (this.easiestToKill(enemyAssaultableUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
           console.log("rule_11A. assault");
           return this.assault(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 1 y this.easiestToKill(enemyUnits,unitY) y this.willWoundHalfAssaulting(game,unitX,unitY)
entonces this.assault(unitX,unitY)*/
rule_9B: playerRule(9, function rule_9B(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
      for (var j=0; j<enemyAssaultableUnits.length; j++){
        var unitY = enemyAssaultableUnits[j];
        if (this.easiestToKill(enemyAssaultableUnits,unitY)&&this.willWoundHalfAssaulting(game,unitX,unitY)){
           console.log("rule_9B. assault");
           return this.assault(unitX,unitY);
        }
      }
    }
  }
 return null;
}),

//-------------------------priority 8-----------------------------------------
/*si ronda = 3 y !this.canBeKilled(game,player,unitX) y this.winning(game) y
unitX2.cost()>unitX.cost() y !this.canAssist(game,player,unitX,unitX2) y
this.willKillShooting(game,unitX,unitY) y unitY.cost() === this.mostExpensiveUnit(enemyUnits).cost()
entonces this.shoot(unitX,unitY)*/
rule_8A: playerRule(8, function rule_8A(game, player){
  if (game.round === 3&&this.winning(game)){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      if (!this.canBeKilled(game,player,unitX)){
        for (var k=0; k<units.length;k++){
          var unitX2 = units[k];
          if (unitX2.cost()>unitX.cost()&&!this.canAssist(game,player,unitX,unitX2)){
            for (var j=0; j<enemyShootableUnits.length; j++){
              var unitY = enemyShootableUnits[j];
              if (this.willKillShooting(game,unitX,unitY)&&unitY.cost()===this.mostExpensiveUnit(enemyShootableUnits).cost()){
                 console.log("rule_8A. shoot");
                 return this.shoot(unitX,unitY);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitY2.cost() y this.winning(game)
 y entonces this.shoot(unitX,unitY2)*/
rule_8B: playerRule(8, function rule_8B(game, player){
  if (game.round === 3 && this.winning(game)){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (unitX.cost()<unitY2.cost()&&this.canKill(game,unitX,unitY2)&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyShootableUnits.length; j++){
              var unitY = enemyShootableUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 console.log("rule_8B. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.willWoundShooting(game,unitX,unitY2) y unitX.cost()>unitY2.cost() y unitX.cost()<unitX2.cost()
y this.canAssist(game,player,unitX,unitX2) entonces this.assist(game,player,unitX,unitX2)*/
rule_8C: playerRule(8, function rule_8C(game, player){
  if (game.round === 3&&this.winning(game)){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<units.length;k++){
          var unitX2 = units[k];
          if (unitX.cost()<unitX2.cost()&&this.canAssist(game,player,unitX,unitX2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                for (var j2=0; j2<enemyShootableUnits.length; j2++){
                  var unitY2 = enemyShootableUnits[j2];
                  if (this.willWoundShooting(game,unitX,unitY2)&&unitX.cost()>unitY2.cost()){
                    console.log("rule_8C. assist");
                    return this.assist(game,player,unitX,unitX2);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
//-------------------------priority 7-----------------------------------------
/*si ronda = 3 y !this.canBeKilled(game,player,unitX) y unitX2.cost()>unitX.cost()
y this.canWound(game,unitX,unitY) y this.easiestToKill(enemyUnits,unitY) entonces this.shoot(unitX,unitY)*/
rule_7A: playerRule(7, function rule_7A(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (!this.canBeKilled(game,player,unitX)){
        for (var k=0; k<units.length;k++){
          var unitX2 = units[k];
          if (unitX2.cost()>unitX.cost()){
            var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
            for (var j = 0; j < enemyShootableUnits.length; j++) {
              var unitY = enemyShootableUnits[j];
              if (this.easiestToKill(enemyShootableUnits,unitY)&&this.canWound(game,unitX,unitY)){
                 console.log("rule_7A. shoot");
                 return this.shoot(unitX,unitY);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX)
y puntaje(unidadY2) = maxEnemigos y this.canKill(game,unitX,unitY2) y
this.willWoundShooting(game,unitX,unitY2) entonces this.shoot(unitX,unitY2)*/
rule_7B: playerRule(7, function rule_7B(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var k=0; k<enemyShootableUnits.length;k++){
          var unitY2 = enemyShootableUnits[k];
          if (unitY2.cost()===this.mostExpensiveUnit(enemyUnits).cost()&&this.canKill(game,unitX,unitY2)&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 console.log("rule_7B. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.canKill(game,unitX,unitY2) y this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitY2.cost()
entonces this.shoot(unitX,unitY2)*/
rule_7C: playerRule(7, function rule_7C(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var k=0; k<enemyShootableUnits.length;k++){
          var unitY2 = enemyShootableUnits[k];
          if (unitX.cost()<unitY2.cost()&&this.canKill(game,unitX,unitY2)&&this.willWoundShooting(game,unitX,unitY2)){
            for (var j=0; j<enemyUnits.length; j++){
              var unitY = enemyUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 console.log("rule_7C. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitY2.cost() y !this.winning(game)
entonces this.shoot(unitX,unitY2)*/
rule_7D: playerRule(7, function rule_7D(game, player){
  if (game.round === 3 && !this.winning(game)){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    var enemyUnits = this.livingEnemyUnits(game,player);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyUnits.length;k++){
          var unitY2 = enemyUnits[k];
          if (unitX.cost()<unitY2.cost()&&this.willWoundShooting(game,unitX,unitY2)){
            var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
            for (var j = 0; j < enemyShootableUnits.length; j++) {
              var unitY = enemyShootableUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                 console.log("rule_7D. shoot");
                 return this.shoot(unitX,unitY2);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
!this.willWoundShooting(game,unitX,unitY2) y puntaje(unidadX) <puntaje(unidadX2)
y this.canAssist(game,player,unitX,unitX2) entonces this.assist(game,player,unitX,unitX2)*/
rule_7E: playerRule(7, function rule_7E(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      if (this.canBeKilled(game,player,unitX)){
        for (var k=0; k<enemyShootableUnits.length;k++){
          var unitY2 = enemyShootableUnits[k];
          if (!this.willWoundShooting(game,unitX,unitY2)){
            for (var j = 0; j < enemyShootableUnits.length; j++) {
              var unitY = enemyShootableUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                for (var h=0;h<possibleUnits.length;h++){
                  var unitX2 = possibleUnits[h];
                  if (unitX.cost()<unitX2.cost()&&this.canAssist(game,player,unitX,unitX2)){
                    console.log("rule_7E. assist");
                    return this.assist(game,player,unitX,unitX2);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y this.canKill(game,unitY,unitX) y this.willWoundShooting(game,unitY,unitX) y
!this.willWoundShooting(game,unitX,unitY2) y unitX.cost()<unitX2.cost()
y !this.canAssist(game,player,unitX,unitX2) y
puede escapar unitX entonces this.scape(game,player,unitX)*/
rule_7F: playerRule(7, function rule_7F(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      if (this.canBeKilled(game,player,unitX)&&this.canScape(game,player,unitX)){
        for (var k=0; k<enemyShootableUnits.length;k++){
          var unitY2 = enemyShootableUnits[k];
          if (!this.willWoundShooting(game,unitX,unitY2)){
            for (var j = 0; j < enemyShootableUnits.length; j++) {
              var unitY = enemyShootableUnits[j];
              if (this.willWoundShooting(game,unitY,unitX)){
                for (var h=0;h<possibleUnits.length;h++){
                  var unitX2 = possibleUnits[h];
                  if (unitX.cost()<unitX2.cost()&&!this.canAssist(game,player,unitX,unitX2)){
                    console.log("rule_7F. scape");
                    return this.scape(game,player,unitX);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
//-------------------------priority 6-----------------------------------------
/*si ronda = 3 y !this.canBeKilled(game,player,unitX) y
dentro de las que puede matar, disparar a la mas cara*/
rule_6A: playerRule(6, function rule_6A(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyUnits = this.shootingKillableUnits(game,player,unitX);
      if (!this.canBeKilled(game,player,unitX)){
        for (var j=0; j<enemyUnits.length; j++){
          var unitY = enemyUnits[j];
          if (unitY.cost()===this.mostExpensiveUnit(enemyUnits).cost()){
             console.log("rule_6A. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y pueden matar a unitX y van a herirla, y unitX va a herir,
si su costo es menor que el del enemigo, entonces disparale*/
rule_6B: playerRule(6, function rule_6B(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var shootingKillableUnits = this.shootingKillableUnits(game,player,unitX);
      if (this.canBeKilled(game,player,unitX)){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var j = 0; j < enemyShootableUnits.length; j++) {
          var unitY = enemyShootableUnits[j];
          if (this.willWoundShooting(game,unitY,unitX)){
            for (var k=0; k<shootingKillableUnits.length; k++){
              var unitY2 = shootingKillableUnits[k];
              if (unitX.cost()>unitY2.cost()&&this.willWoundShooting(game,unitX,unitY2)){
                 console.log("rule_6B. shoot");
                 return this.shoot(unitX,unitY);
              }
            }
          }
        }
      }
    }
  }
 return null;
}),
/*si ronda = 3 y pueden matar a unitX y van a herirla,
si puede escapar, entonces escapar*/
rule_6C: playerRule(6, function rule_6C(game, player){
  if (game.round === 3){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.canBeKilled(game,player,unitX)){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var j = 0; j < enemyShootableUnits.length; j++) {
          var unitY = enemyShootableUnits[j];
          if (this.willWoundShooting(game,unitY,unitX)){
            if (this.canScape(game,player,unitX)){
               console.log("rule_6C. scape");
               return this.scape(game,player,unitX);
            }
          }
        }
      }
    }
  }
 return null;
}),
//-------------------------priority 5-----------------------------------------
//si es la ronda 0 y la unidad puede matar disparando, y va a herir >75%, disparar
rule_5A: playerRule(5, function rule_5A(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKillShooting(game,unitX,unitY) && this.willWoundALotShooting(game,unitX,unitY)){
           console.log("rule_5A. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
//si es la ronda 1 y la unidad puede matar disparando, y va a herir >75%, disparar
rule_5B: playerRule(5, function rule_5B(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKillShooting(game,unitX,unitY) && this.willWoundALotShooting(game,unitX,unitY)){
           console.log("rule_5B. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
//i es la ronda 2 y la unidad puede matar disparando, y va a herir >75%, disparar
rule_5C: playerRule(5, function rule_5C(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKillShooting(game,unitX,unitY) && this.willWoundALotShooting(game,unitX,unitY)){
           console.log("rule_5C. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 1 y la unidad esta herida, la pueden matar
y va a herirla a la que la puede matar, entonces disparar*/
rule_5D: playerRule(5, function rule_5D(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKill(game,unitY,unitX) && this.willWoundShooting(game,unitX,unitY)){
           console.log("rule_5D. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*si es la ronda 2 y la unidad esta herida, la pueden matar
y va a herirla a la que la puede matar, entonces disparar*/
rule_5E: playerRule(5, function rule_5E(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKill(game,unitY,unitX) && this.willWoundShooting(game,unitX,unitY)){
           console.log("rule_5E. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
//si es la ronda 1 y la unidad esta herida, la pueden matar y puede escapar, entonces escapar
rule_5F: playerRule(5, function rule_5F(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKill(game,unitY,unitX) && this.canScape(game,player,unitX)){
           console.log("rule_5F. scape");
           return this.scape(game,player,unitX);
        }
      }
    }
  }
 return null;
}),
//si es la ronda 2 y la unidad esta herida, la pueden matar y puede escapar, entonces escapar
rule_5G: playerRule(5, function rule_5G(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.canKill(game,unitY,unitX) && this.canScape(game,player,unitX)){
           console.log("rule_5G. scape");
           return this.scape(game,player,unitX);
        }
      }
    }
  }
 return null;
}),




 //-------------------------priority 4-----------------------------------------
 //si es la ronda 0 y la unidad puede matar disparando, disparar
 rule_4A: playerRule(4, function rule_4A(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
       for (var j = 0; j < enemyShootableUnits.length; j++) {
         var unitY = enemyShootableUnits[j];
         if (this.canKillShooting(game,unitX,unitY)){
            console.log("rule_4A. shoot");
            return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 rule_4B: playerRule(4, function rule_4B(game, player){
   if (game.round === 1){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
       for (var j = 0; j < enemyShootableUnits.length; j++) {
         var unitY = enemyShootableUnits[j];
         if (this.canKillShooting(game,unitX,unitY)){
            console.log("rule_4B. shoot");
            return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 rule_4C: playerRule(4, function rule_4C(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
       for (var j = 0; j < enemyShootableUnits.length; j++) {
         var unitY = enemyShootableUnits[j];
         if (this.canKillShooting(game,unitX,unitY)){
            console.log("rule_4C. shoot");
            return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 /*si es ultima ronda, va ganando, no pueden matar a unitX, hay una unidad aliada unitX2
  que cuesta mas que unitX, y unitX puede asistirla, hacerlo*/
 rule_4D: playerRule(4, function rule_4D(game, player){
     if (game.round === 3 && this.winning(game)){
       var possibleUnits = this.playerPossibleUnits;
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         if (!this.canBeKilled(game,player,unitX)){
           for (var k = 0; k < units.length; k++) {
             var unitX2 = units[k];
             if (unitX2.cost()>unitX.cost()&&this.canAssist(game,player,unitX,unitX2)){
              console.log("rule_4D. assist");
              return this.assist(game,player,unitX,unitX2);
             }
           }
         }
       }
     }
  return null;
 }),
 /*si es ultima ronda, va ganando, no pueden matar a unitX, hay una unidad aliada unitX2
que cuesta mas, que unitX no puede asistirla, dentro de las unidades heridas enemigas,
disparar a la mas facil de matar*/
 rule_4E: playerRule(4, function rule_4E(game, player){
   if (game.round === 3 && this.winning(game)){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (!this.canBeKilled(game,player,unitX)){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           if (this.canWound(game,unitX,unitY) && this.easiestToKill(enemyShootableUnits,unitY)){
             for (var k = 0; k < units.length; k++) {
               var unitX2 = units[k];
               if (unitX2.cost()>unitX.cost()&&!this.canAssist(game,player,unitX,unitX2)){
                  console.log("rule_4E. shoot");
                  return this.shoot(unitX,unitY);
               }
             }
           }
         }
       }
     }
   }
  return null;
 }),


 //-------------------------priority 3-----------------------------------------
   //si es la ronda 0 y la unidad es sniper, disparar a la mas fuerte
   rule_3A: playerRule(3, function rule_3A(game, player){
     if (game.round === 0){
       var possibleUnits = this.playerPossibleUnits;
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           if (this.classification(unitX)==="sniper" && this.unitIsStrongest(enemyShootableUnits,unitY)){
              console.log("rule_3A. shoot");
              return this.shoot(unitX,unitY);
           }
         }
       }
     }
    return null;
   }),
   //si es la ronda 0 y la q tiene mayor rango, disparar a la mas fuerte
   rule_3B: playerRule(3, function rule_3B(game, player){
     if (game.round === 0){
       var possibleUnits = this.playerPossibleUnits;
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           if (this.maxRangeInUnits(possibleUnits,unitX) && this.unitIsStrongest(enemyShootableUnits,unitY)){
              console.log("rule_3B. shoot");
              return this.shoot(unitX,unitY);
           }
         }
       }
     }
    return null;
   }),
   //si es la ronda 0, si hay una unidad aliada herida y puede asistirla, asistirla
   rule_3C: playerRule(3, function rule_3C(game, player){
     if (game.round === 0){
       var possibleUnits = this.playerPossibleUnits;
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
              console.log("rule_3C. assist");
              return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
    return null;
   }),
   //si es la ronda 1, si hay una unidad aliada herida y puede asistirla, asistirla
   rule_3D: playerRule(3, function rule_3D(game, player){
     if (game.round === 1){
       var possibleUnits = this.playerPossibleUnits;
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
              console.log("rule_3D. assist");
              return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
    return null;
   }),
   //si es la ronda 2, si hay una unidad aliada herida y puede asistirla, asistirla
   rule_3E: playerRule(3, function rule_3E(game, player){
     if (game.round === 2){
       var possibleUnits = this.playerPossibleUnits;
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_3E. assist");
              return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
    return null;
   }),
/*en la ronda 3, si hay una unidad aliada que cueste mas que unitX y puede asistirla,
   y no pueden matar a unitX, entonces asistir a la aliada*/
   rule_3F: playerRule(3, function rule_F(game, player){
     if (game.round === 3){
       var possibleUnits = this.playerPossibleUnits;
       var enemyUnits = this.livingEnemyUnits(game, player);
       //[playerArmy, playerUnits, enemyArmy, enemyUnits]
       var units = this.armiesAndUnits(game,player)[1];
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (unitX2.cost()>unitX.cost() && this.canAssist(game,player,unitX,unitX2)){
             for (var k=0; k<enemyUnits.length;k++){
               var unitY = enemyUnits[k];
               if(!this.canKill(game,unitY,unitX)){
                 console.log("rule_3F. assist");
                 return this.assist(game,player,unitX,unitX2);
               }
             }
           }
         }
       }
     }
    return null;
   }),
   //si es la ronda 0 y hay al menos 2 unidades enemigas vivas, disparar a la mas cara
   rule_3G: playerRule(3, function rule_3G(game, player){
     var possibleUnits = this.playerPossibleUnits;
     if (game.round === 0){
       for (var i = 0; i < possibleUnits.length; i++) {
         var unitX = possibleUnits[i];
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         if (enemyShootableUnits.length > 1){
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
             if (unitY.cost() === this.mostExpensiveUnit(enemyShootableUnits).cost()){
               console.log("rule_3G. shoot");
               return this.shoot(unitX,unitY);
             }
           }
         }
       }
     }
     return null;
   }),
/*si ronda = 2 y cantidad(unitX2) < cantidadInicial(unitX2) y
   puedeAsistir(unitX a unitX2) entonces asiste(unitX a unitX2)*/
rule_3H: playerRule(3, function rule_3H(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < units.length; j++) {
        var unitX2 = units[j];
        if (unitX2.livingModels().length<unitX2.size() && this.canAssist(game,player,unitX,unitX2)){
          console.log("rule_3H. assist");
           return this.assist(game,player,unitX,unitX2);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 1 y cantidad(unitX2) < cantidadInicial(unitX2) y
puedeAsistir(unitX a unitX2) entonces asiste(unitX a unitX2)*/
rule_3I: playerRule(3, function rule_3I(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < units.length; j++) {
        var unitX2 = units[j];
        if (unitX2.livingModels().length<unitX2.size() && this.canAssist(game,player,unitX,unitX2)){
           console.log("rule_3I. assist");
           return this.assist(game,player,unitX,unitX2);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 0 y cantidad(unitX2) < cantidadInicial(unitX2) y
puedeAsistir(unitX a unitX2) entonces asiste(unitX a unitX2)*/
rule_3J: playerRule(3, function rule_3J(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var j = 0; j < units.length; j++) {
        var unitX2 = units[j];
        if (unitX2.livingModels().length<unitX2.size() && this.canAssist(game,player,unitX,unitX2)){
          console.log("rule_3J. assist");
          return this.assist(game,player,unitX,unitX2);
        }
      }
    }
  }
 return null;
}),
/*si ronda = 0 y fuerza(unidadY) = maxEnemigos y puedeAtacarSinCaminar(unitX a
unidadY) entonces dispara(unitX a unidadY)*/
rule_3K: playerRule(3, function rule_3K(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
          if (this.canShoot_(game,unitX,unitY,false) && this.unitIsStrongest(enemyShootableUnits,unitY)){
           console.log("rule_3K. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
/*Si es la primer ronda, la unitX va a herir a la unidad más fuerte enemiga si le dispara,
 entonces dispararle.*/ //FIXME prioridad es 3
rule_3L: playerRule(31000, function rule_3L(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1].concat(this.armiesAndUnits(game,player)[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(units,unitY)){
           console.log("rule_3L. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3M: playerRule(3, function rule_3M(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(enemyShootableUnits,unitY)){
           console.log("rule_3M. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3N: playerRule(3, function rule_3N(game, player){
  if (game.round === 1){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1].concat(this.armiesAndUnits(game,player)[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(units,unitY)){
           console.log("rule_3N. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3O: playerRule(3, function rule_3O(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(enemyShootableUnits,unitY)){
           console.log("rule_3O. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3P: playerRule(3, function rule_3P(game, player){
  if (game.round === 2){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
      for (var j = 0; j < enemyShootableUnits.length; j++) {
        var unitY = enemyShootableUnits[j];
        if (this.willWoundShooting(game,unitX,unitY) && this.easiestToKill(enemyShootableUnits,unitY)){
           console.log("rule_3P. shoot");
           return this.shoot(unitX,unitY);
        }
      }
    }
  }
 return null;
}),
rule_3Q: playerRule(3, function rule_3Q(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.classification(unitX)==="troop"){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var j = 0; j < enemyShootableUnits.length; j++) {
          var unitY = enemyShootableUnits[j];
          if (this.willWoundShooting(game,unitX,unitY)&&this.unitIsStrongest(enemyShootableUnits,unitY)){
             console.log("rule_3Q. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
rule_3R: playerRule(3, function rule_3R(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1];
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (unitX.cost() === this.cheapestUnit(units).cost()){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var j = 0; j < enemyShootableUnits.length; j++) {
          var unitY = enemyShootableUnits[j];
          if (this.willWoundShooting(game,unitX,unitY)&&this.unitIsStrongest(enemyShootableUnits,unitY)){
             console.log("rule_3R. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
rule_3S: playerRule(3, function rule_3S(game, player){
  if (game.round === 0){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var units = this.armiesAndUnits(game,player)[1].concat(this.armiesAndUnits(game,player)[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      if (this.classification(unitX)==="troop"){
        var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
        for (var j = 0; j < enemyShootableUnits.length; j++) {
          var unitY = enemyShootableUnits[j];
          if (this.willWoundShooting(game,unitX,unitY)&&this.unitIsStrongest(units,unitY)){
             console.log("rule_3S. shoot");
             return this.shoot(unitX,unitY);
          }
        }
      }
    }
  }
 return null;
}),
/* Si la unitX va a herir a la unidad más fuerte enemiga si le dispara,
y una unidad aliada está herida entonces asistirla.*/
rule_3T: playerRule(3, function rule_3T(game, player){
    var possibleUnits = this.playerPossibleUnits;
    //[playerArmy, playerUnits, enemyArmy, enemyUnits]
    var armiesAndUnits = this.armiesAndUnits(game,player);
    var units = armiesAndUnits[1];
    var allUnits = units.concat(armiesAndUnits[3]);
    for (var i = 0; i < possibleUnits.length; i++) {
      var unitX = possibleUnits[i];
      for (var k = 0; k < units.length; k++) {
        var unitX2 = units[k];
        if (this.wounded(unitX2) && this.canAssist(game,player,unitX,unitX2)){
          var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
          for (var j = 0; j < enemyShootableUnits.length; j++) {
            var unitY = enemyShootableUnits[j];
            if (this.willWoundShooting(game,unitX,unitY) && this.unitIsStrongest(allUnits,unitY)){
               console.log("rule_3T. assist");
               return this.assist(game,player,unitX,unitX2);
            }
          }
        }
      }
    }
 return null;
}),

 //-------------------------priority 2-----------------------------------------
 //si es la ronda 0 y el enemigo esta herido, asaltar a ese enemigo
  rule_2A: playerRule(2, function rule_2A(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
       if (enemyAssaultableUnits.length>0){
         for (var j = 0; j < enemyAssaultableUnits.length; j++) {
           var unitY = enemyAssaultableUnits[j];
            if (this.wounded(unitY)){
              console.log("rule_2A. assault");
              return this.assault(unitX,unitY);
            }
         }
       }
     }
   }
   return null;
 }),
 //si es la ronda 0, y la unidad es fastAttack, disparar a lo que pueda disparar
 rule_2B: playerRule(2, function rule_2B(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="fastAttack"){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           console.log("rule_2B. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
  // si es la ronda 1, y la unidad es fastAttack, disparar a lo que pueda disparar
 rule_2C: playerRule(2, function rule_2C(game, player){
   if (game.round === 1){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="fastAttack"){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           console.log("rule_2C. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
// si es la ronda 2, y la unidad es fastAttack, disparar a lo que pueda disparar
 rule_2D: playerRule(2, function rule_2D(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="fastAttack"){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           console.log("rule_2D. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
  return null;
 }),
 // si es la ronda 0, y la unidad es heavySupport, asistir a lo que pueda asistir, que ya haya jugado
 rule_2E: playerRule(2, function rule_2E(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2E. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 0, y la unidad es heavySupport, asistir a lo que pueda asistir
 rule_2F: playerRule(2, function rule_2F(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2F. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 1, y la unidad es heavySupport, asistir a lo que pueda asistir, que ya haya jugado
 rule_2G: playerRule(2, function rule_2G(game, player){
   if (game.round === 1){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2G. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 1, y la unidad es heavySupport, asistir a lo que pueda asistir
 rule_2H: playerRule(2, function rule_2H(game, player){
   if (game.round === 1){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2H. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 2, y la unidad es heavySupport, asistir a lo que pueda asistir, que ya haya jugado
 rule_2I: playerRule(2, function rule_2I(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2I. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 2, y la unidad es heavySupport, asistir a lo que pueda asistir
 rule_2J: playerRule(2, function rule_2J(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="heavySupport"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2J. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // /si es la ronda 0, y la unidad es troop, asistir a lo que pueda asistir, que ya haya jugado
 rule_2K: playerRule(2, function rule_2K(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2K. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 0, y la unidad es troop, asistir a lo que pueda asistir
 rule_2L: playerRule(2, function rule_2L(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2L. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 1, y la unidad es troop, asistir a lo que pueda asistir, que ya haya jugado
 rule_2M: playerRule(2, function rule_2M(game, player){
   if (game.round === 1){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2M. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 1, y la unidad es troop, asistir a lo que pueda asistir
 rule_2N: playerRule(1, function rule_2N(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2N. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 2, y la unidad es troop, asistir a lo que pueda asistir, que ya haya jugado
 rule_2O: playerRule(2, function rule_2O(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (!unitX2.isEnabled && this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2O. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 2, y la unidad es troop, asistir a lo que pueda asistir
 rule_2P: playerRule(2, function rule_2P(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     //[playerArmy, playerUnits, enemyArmy, enemyUnits]
     var units = this.armiesAndUnits(game,player)[1];
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="troop"){
         for (var j = 0; j < units.length; j++) {
           var unitX2 = units[j];
           if (this.canAssist(game,player,unitX,unitX2)){
             console.log("rule_2P. assist");
             return this.assist(game,player,unitX,unitX2);
           }
         }
       }
     }
   }
   return null;
 }),

 // si es la ronda 0, y la unidad es sniper, disparar a lo que pueda disparar
 rule_2Q: playerRule(2, function rule_2Q(game, player){
   if (game.round === 0 ){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="sniper"){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           console.log("rule_2Q. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 1, y la unidad es sniper, disparar a lo que pueda disparar
 rule_2R: playerRule(2, function rule_2R(game, player){
   if (game.round === 1 ){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="sniper"){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           console.log("rule_2R. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),
 // si es la ronda 2, y la unidad es sniper, disparar a lo que pueda disparar
 rule_2S: playerRule(2, function rule_2S(game, player){
   if (game.round === 2 ){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.classification(unitX)==="sniper"){
         var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
         for (var j = 0; j < enemyShootableUnits.length; j++) {
           var unitY = enemyShootableUnits[j];
           console.log("rule_2S. shoot");
           return this.shoot(unitX,unitY);
         }
       }
     }
   }
   return null;
 }),

 //-------------------------priority 1-----------------------------------------
 //si es la primer ronda y puede escaparse que se escape.
 rule_1A: playerRule(1, function rule_1A(game, player){
   if (game.round === 0){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.canScape(game,player,unitX)){
           console.log("rule_1A. scape");
           return this.scape(game,player,unitX);
       }
     }
   }
   return null;
 }),
 // si es la segunda ronda y puede escaparse que se escape.
 rule_1B: playerRule(1, function rule_1B(game, player){
   if (game.round === 1){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       if (this.canScape(game,player,unitX)){
         console.log("rule_1B. scape");
         return this.scape(game,player,unitX);
       }
     }
   }
   return null;
 }),
 //si es la tercer ronda y puede disparar que dispare.
 rule_1C: playerRule(1, function rule_1C(game, player){
   if (game.round === 2){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
       for (var j = 0; j < enemyShootableUnits.length; j++) {
         var unitY = enemyShootableUnits[j];
         console.log("rule_1C. shoot");
         return this.shoot(unitX,unitY);
       }
     }
   }
   return null;
 }),
 //si es la cuarta ronda y puede asaltar que asalte.
 rule_1D: playerRule(1, function rule_1D(game, player){
  if (game.round === 3){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
       for (var j = 0; j < enemyAssaultableUnits.length; j++) {
         var unitY = enemyAssaultableUnits[j];
         console.log("rule_1D. assault");
         return this.assault(unitX,unitY);
       }
     }
   }
   return null;
 }),

//si puede disparar que dispare
 rule_1E: playerRule(1, function rule_1E(game, player){
   var possibleUnits = this.playerPossibleUnits;
   for (var i = 0; i < possibleUnits.length; i++) {
     var unitX = possibleUnits[i];
     var enemyShootableUnits = this.enemyShootableUnits(game, player, unitX);
     for (var j = 0; j < enemyShootableUnits.length; j++) {
       var unitY = enemyShootableUnits[j];
       console.log("rule_1E. shoot");
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



//Reglas para ver q se elija lo de mas prioridad.

 /*rule_infinityA: playerRule(8, function rule_infinityA(game, player){
   var possibleUnits = this.playerPossibleUnits;
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
   var possibleUnits = this.playerPossibleUnits;
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

 // regla solo para que se escapen siempre
 rule_ZA: playerRule(10, function rule_ZA(game, player){
   var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var dangerousUnits = this.dangerousUnits(game,player,unitX);
       if (dangerousUnits.length>0){
         console.log("rule_ZA");
         return this.scape(game,player,unitX);
       }
     }
     return null;
 }),
 */
