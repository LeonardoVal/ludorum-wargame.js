var base = require('creatartis-base'),
	ludorum_wargame = require('../../build/ludorum-wargame'),
	startState = ludorum_wargame.startState,
	nextState = ludorum_wargame.nextState,
	updateState = ludorum_wargame.updateState;

var KEYS = "abcdefghijklmnopqrstuvwxyz",
	RANDOM = base.Randomness.DEFAULT,
	PROTOCHAIN = (function (MAX_LENGTH) {
		var state = startState({'_': -1}),
			chain = [state];
		for (var i = 0; i < MAX_LENGTH; i++) {
			state = nextState(state);
			state[RANDOM.choice(KEYS)] = i;
			chain.push(state)
		}
		return chain;
	})(1e5);

function getTest(chainLength, id) {
	return function () {
		return PROTOCHAIN[chainLength - 1][id];
	};
}
	
module.exports = {
	name: 'Prototype chain',
	tests: {
		'full (length=1e2)': getTest(1e2, '_'),
		'full (length=1e3)': getTest(1e3, '_'),
		'full (length=1e4)': getTest(1e4, '_'),
		'full (length=1e5)': getTest(1e5, '_'),
		'random (length=1e2)': getTest(1e2, RANDOM.choice(KEYS)),
		'random (length=1e3)': getTest(1e3, RANDOM.choice(KEYS)),
		'random (length=1e4)': getTest(1e4, RANDOM.choice(KEYS)),
		'random (length=1e5)': getTest(1e5, RANDOM.choice(KEYS))		
	}
};