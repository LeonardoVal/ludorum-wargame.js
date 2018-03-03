var BasicRulePlayer_assault = exports.BasicRulePlayer_assault = declare(ludorum.Player, {
 /** The constructor takes the player's `name` and the following:
  */
 constructor: function BasicRulePlayer_assault(params) {
   ludorum.Player.call(this, params);
   initialize(this, params)
    .array('rules', { defaultValue: [] });
   this.__pendingActions__ = [];
   this.rules = this.ownRules();
   this.playerPossibleUnits = [];
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
   identifier: 'BasicRulePlayer_assault',
   serializer: function serialize_BasicRulePlayer_assault(obj) {
     return this.serializeAsProperties(obj, ['name', 'rules']); //TODO Check function serialization.
   }
 },

 // ## Helper functions /////////////////////////////////////////////////////////////////////////

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

 //devuelve true si el assaulter puede asaltar al target
 canAssault: function canAssault(game,assaulter,target){
   if (!assaulter.isDead() && assaulter.isEnabled && !target.isDead()){
     if (game.terrain.canShoot(assaulter,target) <= 12){
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


 // ## Rules /////////////////////////////////////////////////////////////////

 //si puede asaltar que asalte.
 rule_100: playerRule(100, function rule_100(game, player){
     var possibleUnits = this.playerPossibleUnits;
     for (var i = 0; i < possibleUnits.length; i++) {
       var unitX = possibleUnits[i];
       var enemyAssaultableUnits = this.enemyAssaultableUnits(game, player, unitX);
       for (var j = 0; j < enemyAssaultableUnits.length; j++) {
         var unitY = enemyAssaultableUnits[j];
         //console.log("rule_100. assault");
         return this.assault(unitX,unitY);
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

}); // declare BasicRulePlayer_assault
