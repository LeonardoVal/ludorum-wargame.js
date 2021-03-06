exports.test = {
	/** Simple test game. 01
  */
    example0: function example0() {
      var terrain = new Terrain(),
        ARMY = GrimFuture.BattleBrothers,
        game = new Wargame({
          terrain: terrain,
          armies: {
            Red: new GrimFuture.BattleBrothers({ player: 'Red',
            //,[3,20],[4,15],[10,2]
              units: [[3,10]].map(function (position) {
                return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
              })
            }),
            Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
              units: [[40,10],[40,20],[40,15],[40,2]].map(function (position) {
                return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
              })
            })
          }
        });
            return game;
    },

    example1: function example1() {
	/*	var terrain = new Terrain([

        { type: p2.Shape.BOX, x:20,y:20, width:4, height:50}
      ]),*/
         var terrain = new Terrain(),
			ARMY = GrimFuture.BattleBrothers,
			game = new Wargame({
				terrain: terrain,
				armies: {
					Red: new GrimFuture.BattleBrothers({ player: 'Red',
            units: [[3,10],[3,20],[3,15],[3,2]].map(function (position) {
							return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
						})
					}),
					Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
						units: [[40,10],[40,20],[40,15],[40,2]].map(function (position) {
							return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
						})
					})
				}
			});
         return game;
  },
  example2: function example2() {
    /*
        */
      var terrain = new Terrain(),
        ARMY = GrimFuture.BattleBrothers,
        game = new Wargame({
          terrain: terrain,
          armies: {
            Red: new GrimFuture.BattleBrothers({ player: 'Red',
              units: [new ARMY.UNITS.BattleBrothers_Unit({ position: [12,4], models:
                Array.apply(null, {length: 5}).map(function(){ return new ARMY.MODELS.BattleBrother();})}),
                    new ARMY.UNITS.AssaultBrothers_Unit({ position: [12,6], models:
                Array.apply(null, {length: 5}).map(function(){ return new ARMY.MODELS.AssaultBrother();})}),
                    new ARMY.UNITS.Engineers_Unit({ position: [12,8], models: [new ARMY.MODELS.Engineer()]}),
                    new ARMY.UNITS.SupportBikers_Unit({ position: [2,7], models: [new ARMY.MODELS.SupportBiker()]}),
                    new ARMY.UNITS.NuevoFastAttacks_Unit({ position: [12,10], models:
                Array.apply(null, {length: 5}).map(function(){ return new ARMY.MODELS.NuevoFastAttack();})}),
                    new ARMY.UNITS.NuevoMelees_Unit({ position: [12,12], models:
                Array.apply(null, {length: 3}).map(function(){ return new ARMY.MODELS.NuevoMelee();})})
              ]
            }),
            Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
              units: [new ARMY.UNITS.BattleBrothers_Unit({ position: [36,4], models:
                Array.apply(null, {length: 5}).map(function(){ return new ARMY.MODELS.BattleBrother();})}),
                    new ARMY.UNITS.AssaultBrothers_Unit({ position: [36,6], models:
                Array.apply(null, {length: 5}).map(function(){ return new ARMY.MODELS.AssaultBrother();})}),
                    new ARMY.UNITS.Engineers_Unit({ position: [36,8], models: [new ARMY.MODELS.Engineer()]}),
                    new ARMY.UNITS.SupportBikers_Unit({ position: [46,7], models: [new ARMY.MODELS.SupportBiker()]}),
                    new ARMY.UNITS.NuevoFastAttacks_Unit({ position: [36,10], models:
                Array.apply(null, {length: 5}).map(function(){ return new ARMY.MODELS.NuevoFastAttack();})}),
                    new ARMY.UNITS.NuevoMelees_Unit({ position: [36,12], models:
                Array.apply(null, {length: 3}).map(function(){ return new ARMY.MODELS.NuevoMelee();})})
              ]
            })
          }
        });
        return game;
    },

  exampleAssault: function exampleAssault() {
    var terrain = new Terrain(),
    ARMY = GrimFuture.BattleBrothers,
    game = new Wargame({
      terrain: terrain,
      armies: {
        Red: new GrimFuture.BattleBrothers({ player: 'Red',
          units: [[3,10],[3,20],[4,15],[3,2]].map(function (position) {
            return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
          })
        }),
        Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
          units: [[4,10],[4,20],[5,15],[4,2]].map(function (position) {
            return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
          })
        })
      }
    });
       return game;
},

	randomGame: function randomGame() { //FIXME window
		var RandomPlayer = ludorum.players.RandomPlayer,
			players = [new RandomPlayer(), new RandomPlayer()];
		window.match = new ludorum.Match(this.example1(), players);
		match.events.on('begin', function (game, match){
			window.RENDERER.render(game);
		});
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
		});
		match.events.on('next', function (game, next, match) {
			if (next instanceof Wargame) {
				window.RENDERER.render(next);
			}
		});
		match.run().then(function (m) {
			console.log(m.result());
		});
	},

	randomAbstractedGame: function randomAbstractedGame() { //FIXME window
		var players = [
				new ludorum.players.RandomPlayer(),
				new ludorum.players.RandomPlayer()
			],
    game = new AbstractedWargame(this.example1());
		window.match = new ludorum.Match(game, players);
		match.events.on('begin', function (game, match) {
      var terrain=  game.concreteGame.terrain;
          window.RENDERER.render(game.concreteGame);

		});
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
		});
		match.events.on('next', function (game, next, match) {
      try {
        
      
      var terrain=  next.concreteGame.terrain;
      window.RENDERER.render(next.concreteGame);
      } catch (error) {
        console.log(error);
      }
		});
		match.run().then(function (m) {
      console.log("randomAbstractedGame");
      console.log(m.result());

		});
  },

	randomAbstractedGameDiscrete: function randomAbstractedGameDiscrete() { //FIXME window
		console.time("randomAbstractedGameDiscrete");
		var players = [
				new ludorum.players.MonteCarloPlayer({ simulationCount: 10, timeCap: Infinity }),
				new ludorum.players.RandomPlayer(),
			],
			game = new AbstractedWargame(this.example1());
		window.match = new ludorum.Match(game, players);
		match.events.on('begin', function (game, match) {
			var terrain=  game.concreteGame.terrain;
			window.RENDERER.render(game.concreteGame);
		});
		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
		});
		match.events.on('next', function (game, next, match) {
			var terrain=  next.concreteGame.terrain;
			window.RENDERER.render(next.concreteGame);
		});
		match.run().then(function (m) {
			console.timeEnd("randomAbstractedGameDiscrete");
			console.log(m.result());
		});
	},

	//le paso los players, en caso de que no se pase, ahi si son aleatorios
	testGame: function testGame(player1, player2) { //FIXME window
		var RandomPlayer = ludorum.players.RandomPlayer,
			players = [
				player1 || new RandomPlayer(),
				player2 || new RandomPlayer()
			];
		window.match = new ludorum.Match(this.example1(), players);
		match.events.on('begin', function (game, match) {
			window.RENDERER.render(game);
		});

		match.events.on('move', function (game, moves, match) {
			console.log(Sermat.ser(moves));
			window.RENDERER.renderSight(game);
		});

		match.events.on('next', function (game, next, match) {
			if (next instanceof Wargame) {
				window.RENDERER.render(next);
			}
		});

		match.run().then(function (m) {
			console.log(m.result());
		});
	},

  conPesosDS_vs_sinPesosDS: function conPesosDS_vs_sinPesosDS() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new DynamicScriptingSinPesosPlayer()
    ];
    window.match = new ludorum.Match(this.example2(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },

  sinPesosDS_vs_conPesosDS: function sinPesosDS_vs_conPesosDS() { //FIXME window
    var players = [
      new DynamicScriptingSinPesosPlayer(),
      new DynamicScriptingPlayer()
    ];
    window.match = new ludorum.Match(this.example2(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },

  conPesosDS_vs_random: function conPesosDS_vs_random() { //FIXME window
    var RandomPlayer = ludorum.players.RandomPlayer;
    var players = [
      new DynamicScriptingPlayer(),
      new RandomPlayer()
    ];
    window.match = new ludorum.Match(this.example2(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      //console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },

  sinPesosDS_vs_random: function sinPesosDS_vs_random() { //FIXME window
    var RandomPlayer = ludorum.players.RandomPlayer;
    var players = [
      new DynamicScriptingSinPesosPlayer(),
      new RandomPlayer()
    ];
    window.match = new ludorum.Match(this.exampleAssault(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },

  conPesosDS_vs_random_Abstracted: function conPesosDS_vs_random_Abstracted() { //FIXME window
    var RandomPlayer = ludorum.players.RandomPlayer,
      players = [
        new DynamicScriptingPlayer(),
        new RandomPlayer()
      ];
    var game = new AbstractedWargame(this.example2());
    window.match = new ludorum.Match(game, players);
    match.events.on('begin', function (game, match) {
      var terrain=  game.concreteGame.terrain;
          window.RENDERER.render(game.concreteGame);

    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
    });
    match.events.on('next', function (game, next, match) {
      var terrain=  next.concreteGame.terrain;
      window.RENDERER.render(next.concreteGame);
    });
    match.run().then(function (m) {
      console.log("conPesosDS_vs_random_Abstracted");
      console.log(m.result());

    });
  },
  conPesosDS_vs_BasicRulePlayer_shoot: function conPesosDS_vs_BasicRulePlayer_shoot() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_shoot()
    ];
    window.match = new ludorum.Match(this.example2(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },
  conPesosDS_vs_BasicRulePlayer_assault: function conPesosDS_vs_BasicRulePlayer_assault() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_assault()
    ];
    window.match = new ludorum.Match(this.exampleAssault(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },
  conPesosDS_vs_BasicRulePlayer_assist: function conPesosDS_vs_BasicRulePlayer_assist() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_assist()
    ];
    window.match = new ludorum.Match(this.example2(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },
  conPesosDS_vs_BasicRulePlayer_scape_then_shoot: function conPesosDS_vs_BasicRulePlayer_scape_then_shoot() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_scape_then_shoot()
    ];
    window.match = new ludorum.Match(this.example2(), players);
    match.events.on('begin', function (game, match) {
      window.RENDERER.render(game);
    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
      window.RENDERER.renderSight(game);
    });
    match.events.on('next', function (game, next, match) {
      if (next instanceof Wargame) {
        window.RENDERER.render(next);
      }
    });
    match.run().then(function (m) {
      console.log(m.result());
    });
  },

  randomAbstractedTest: function randomAbstractedTest(player1, player2) { //FIXME window
    var RandomPlayer = ludorum.players.RandomPlayer,
      players = [
        player1 || new RandomPlayer(),
        player2 || new RandomPlayer()
      ];
      game = new AbstractedWargame(this.example1());
    window.match = new ludorum.Match(game, players);
    match.events.on('begin', function (game, match) {
      var terrain=  game.concreteGame.terrain;
          window.RENDERER.render(game.concreteGame);

    });
    match.events.on('move', function (game, moves, match) {
      console.log(Sermat.ser(moves));
    });
    match.events.on('next', function (game, next, match) {
      var terrain=  next.concreteGame.terrain;
      window.RENDERER.render(next.concreteGame);
    });
    match.run().then(function (m) {
      console.log("randomAbstractedGame");
      console.log(m.result());

    });
  }
}; // scenarios
