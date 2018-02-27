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
            units: [[3,10],[3,20],[4,15],[3,2]].map(function (position) {
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



  exampleDS1: function exampleDS1() {
  var terrain = new Terrain([
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:24 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:10 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:15 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:6 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:1 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:3 },
      { type: p2.Shape.CIRCLE, radius: 2, x:12, y:5 }
    ]),
    ARMY = GrimFuture.BattleBrothers,
    game = new Wargame({
      terrain: terrain,
      armies: {
        Red: new GrimFuture.BattleBrothers({ player: 'Red',
          units: [[3,2]].map(function (position) {
            return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
          })
        }),
        Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
          units: [[3,4]].map(function (position) {
            return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
          })
        })
      }
    });
       return game;
},
exampleDS2: function exampleDS2() {
var terrain = new Terrain([
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:24 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:10 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:15 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:6 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:1 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:3 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:5 }
  ]),
  ARMY = GrimFuture.BattleBrothers,
  game = new Wargame({
    terrain: terrain,
    armies: {
      Red: new GrimFuture.BattleBrothers({ player: 'Red',
        units: [[3,2]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      }),
      Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
        units: [new ARMY.UNITS.BattleBrothers_Unit({ position: [3,4], models: [new ARMY.MODELS.BattleBrother(1),
            new ARMY.MODELS.BattleBrother(),new ARMY.MODELS.BattleBrother(),
            new ARMY.MODELS.BattleBrother(),new ARMY.MODELS.BattleBrother()]})]
        })
      }
  });
     return game;
},

exampleDS3: function exampleDS3() {
  var terrain = new Terrain([
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:24 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:10 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:15 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:6 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:1 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:3 },
    { type: p2.Shape.CIRCLE, radius: 2, x:12, y:5 }
  ]),
  ARMY = GrimFuture.BattleBrothers,
  game = new Wargame({
    terrain: terrain,
    armies: {
      Red: new GrimFuture.BattleBrothers({ player: 'Red',
        units: [[3,2]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      }),
      Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
        units: [new ARMY.UNITS.BattleBrothers_Unit({position: [3,4]}),
        new ARMY.UNITS.SupportBrothers_Unit({position: [5,2]})] //FIXME tiene q ser SupportBrothers_Unit
      })
    }
  });
     return game;
},
exampleDS4: function exampleDS4() {
var terrain = new Terrain([
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:24 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:10 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:15 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:6 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:1 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:3 },
    { type: p2.Shape.CIRCLE, radius: 3, x:12, y:5 }
  ]),
  ARMY = GrimFuture.BattleBrothers,
  game = new Wargame({
    terrain: terrain,
    armies: {
      Red: new GrimFuture.BattleBrothers({ player: 'Red',
        units: [[3,2]].map(function (position) {
          return new ARMY.UNITS.BattleBrothers_Unit({ position: position });
        })
      }),
      Blue: new GrimFuture.BattleBrothers({ player: 'Blue',
        units: [[5,35]].map(function (position) {
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
				//new ludorum.players.MonteCarloPlayer({ simulationCount: 1000}),
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
      var terrain=  next.concreteGame.terrain;
      window.RENDERER.render(next.concreteGame);
		});
		match.run().then(function (m) {
      console.log("randomAbstractedGame");
      console.log(m.result());

		});
  },

  randomAbstractedGameDiscrete: function randomAbstractedGameDiscrete() { //FIXME window
		var players = [
				new ludorum.players.MonteCarloPlayer({ simulationCount: 100, timeCap: 20000 }),
				//new ludorum.players.RandomPlayer(),
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
        var terrain=  next.concreteGame.terrain;
        window.RENDERER.render(next.concreteGame);
      });
      match.run().then(function (m) {
        console.log("randomAbstractedGameDiscrete");
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

  sinPesosDS_vs_conPesosDS: function sinPesosDS_vs_conPesosDS() { //FIXME window
    var players = [
      new DynamicScriptingSinPesosPlayer(),
      new DynamicScriptingPlayer()
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

  conPesosDS_vs_random: function conPesosDS_vs_random() { //FIXME window
    var RandomPlayer = ludorum.players.RandomPlayer;
    var players = [
      new DynamicScriptingPlayer(),
      new RandomPlayer()
    ];
    window.match = new ludorum.Match(this.example1(), players);
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
    var game = new AbstractedWargame(this.example1());
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
  conPesosDS_vs_BasicRulePlayer_assault: function conPesosDS_vs_BasicRulePlayer_assault() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_assault()
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
  conPesosDS_vs_BasicRulePlayer_assist: function conPesosDS_vs_BasicRulePlayer_assist() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_assist()
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
  conPesosDS_vs_BasicRulePlayer_scape_then_shoot: function conPesosDS_vs_BasicRulePlayer_scape_then_shoot() { //FIXME window
    var players = [
      new DynamicScriptingPlayer(),
      new BasicRulePlayer_scape_then_shoot()
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
