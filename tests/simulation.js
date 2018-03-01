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
	ludorum_game_colograph = require('../build/ludorum-wargame'),

	server = capataz.Capataz.run({
		port: 8088,
		workerCount: 4,
		desiredEvaluationTime: 20000,
		customFiles: [
			{ module: ludorum },
			{ module: ludorum_game_colograph }
		],
		logFile: base.Text.formatDate(null, '"./tests/logs/simulation-"yyyymmdd-hhnnss".txt"'),
		maxDelay: 10000,
		maxRetries: 1000
	});

// ## Jobs #########################################################################################

var jobFunction = function (ludorum, ludorum_wargame) {
	var players = [
		new ludorum.players.RandomPlayer(),
		//new ludorum_wargame.DynamicScriptingPlayer(),
		//new ludorum_wargame.DynamicScriptingPlayer()
		new ludorum.players.RandomPlayer()
	],
	game = ludorum_wargame.test.example2(),
	match = new ludorum.Match(game, players);
	/*match.events.on('move', function (game, moves) {
		console.log("Performed: ", moves);
	});*/
	return match.run().then(function (m) {
		return m.result();
	});
};

// ## Main #########################################################################################

var MATCH_COUNT = 1000,
	STATS = new base.Statistics(),
	FINISHED_COUNT = 0;

base.Future.all(
	base.Iterable.range(MATCH_COUNT).map(function (i) {
		return server.schedule({
			info: 'Match #'+ i,
			fun: jobFunction,
			imports: ['ludorum', 'ludorum-wargame'],
			args: []
		}).then(function (data) {
			if (data.Red > 0) {
				STATS.add({ key: 'victories', role: 'Red' }, data.Red);
				STATS.add({ key: 'defeats', role: 'Blue' }, data.Blue);
			} else if (data.Red < 0) {
				STATS.add({ key: 'victories', role: 'Blue' }, data.Blue);
				STATS.add({ key: 'defeats', role: 'Red' }, data.Red);
			} else {
				STATS.add({ key: 'tied' });
			}
			if (++FINISHED_COUNT % 100 == 0) {
				server.logger.info('Finished match #'+ FINISHED_COUNT);
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
