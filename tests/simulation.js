/** # Distributed game simulations.
 * 
*/
"use strict";
require('source-map-support').install();

/** Setting up the Capataz server.
*/
var path = require('path'),
	capataz = require('capataz'),
	base = require('creatartis-base'),
	ludorum = require('ludorum'),
	ludorum_wargame = require('../build/ludorum-wargame'),

	server = capataz.Capataz.run({
		port: 8080,
		workerCount: 4,
		desiredEvaluationTime: 20000,
		maxTaskSize: 1,
		customFiles: [{ module: ludorum }, { module: ludorum_wargame }],
		logFile: base.Text.formatDate(null, '"./tests/logs/simulation-"yyyymmdd-hhnnss".txt"'),
		maxDelay: 10000,
		maxRetries: 1000
	});

// ## Jobs #########################################################################################

var jobFunction = function (ludorum, ludorum_wargame, playerName1, playerName2, scenario) {
	var playersByName = {
			UCT10:function (){
				return new ludorum.players.MonteCarloPlayer({ simulationCount: 10, timeCap: Infinity });
			},
			UCT25:function (){
				return new ludorum.players.MonteCarloPlayer({ simulationCount: 25, timeCap: Infinity });
			},
			UCT50:function (){
				return new ludorum.players.MonteCarloPlayer({ simulationCount:50, timeCap: Infinity });
			},
			RAN:function (){
				return new ludorum.players.RandomPlayer();
			}
		},
		player1= playersByName[playerName1],
		player2= playersByName[playerName2];

	base.raiseIf(typeof player1 !== 'function', 'Invalid player 1: ', playerName1);
	base.raiseIf(typeof player2 !== 'function', 'Invalid player 2: ', playerName2);
	
	var players = [player1(), player2()],
		game = new ludorum_wargame.AbstractedWargame (ludorum_wargame.test[scenario]()),
		match = new ludorum.Match(game, players);
	
	return match.run().then(function (m) {
		return m.result();
	});
};

// ## Main #########################################################################################

var MATCH_COUNT = 100,
	STATS = new base.Statistics(),
	SCENARIOS = ['example2'],
	DUELS = ['RAN-RAN','RAN-UCT10','RAN-UCT25','RAN-UCT50',
		'UCT10-RAN','UCT10-UCT10','UCT10-UCT25','UCT10-UCT50',
		'UCT25-RAN','UCT25-UCT10','UCT25-UCT25','UCT25-UCT50',
		'UCT50-RAN','UCT50-UCT10','UCT50-UCT25','UCT50-UCT50'
	],
	FINISHED_COUNT = 0;

base.Future.all(
	base.Iterable.range(MATCH_COUNT).product(DUELS, SCENARIOS).mapApply(function (i, duel, scenario) {
		return server.schedule({
			info: 'Match #'+ i +' for duel '+ duel +' in '+ scenario,
			fun: jobFunction,
			imports: ['ludorum', 'ludorum-wargame'],
			args: duel.split('-').concat([scenario])
		}).then(function (data) {
			if (data.Red > 0) {
				STATS.add({ key: 'victories', duel: duel, scenario: scenario, role: 'Red' }, data.Red);
				STATS.add({ key: 'defeats', duel: duel, scenario: scenario, role: 'Blue' }, data.Blue);
			} else if (data.Red < 0) {
				STATS.add({ key: 'victories', duel: duel, scenario: scenario, role: 'Blue' }, data.Blue);
				STATS.add({ key: 'defeats', duel: duel, scenario: scenario, role: 'Red' }, data.Red);
			} else {
				STATS.add({ key: 'tied', duel: duel, scenario: scenario });
			}
			if (++FINISHED_COUNT % 10 == 0) {
				server.logger.info('Finished '+ FINISHED_COUNT +'/'+ 
					(DUELS.length * MATCH_COUNT) +' matches. Statistics:\n'+ STATS);
			}
		});
	})
).then(function () {
	server.logger.info("Statistics:\n"+ STATS);
	server.logger.info("Finished all matches. Stopping server.");
	setTimeout(process.exit, 10);
}, function (error) {
	server.logger.error(error +'');
	setTimeout(process.exit, 10);
});
// fin