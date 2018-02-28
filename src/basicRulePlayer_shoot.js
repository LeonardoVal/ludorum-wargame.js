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
//accion basica move. puede solo moverse, o moverse y disparar
 move: function move(unitX,moveAction,shootUnitY){
   if (shootUnitY){
     //el shoot ya tiene EndTurnAction incorporado, si solo se mueve hay q agregarlo
     return [new ActivateAction(unitX.id),moveAction,new ShootAction(unitX.id,shootUnitY.id)];
   } else {
     return [new ActivateAction(unitX.id),moveAction,new EndTurnAction(unitX.id)];
   }
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

}); // declare BasicRulePlayer_shoot
