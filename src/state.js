/** # State handling.

Handling of state with different versions.
*/

/** A state is an object with a hidden read-only property called '#', that indicates the version of
the state in a chain of updates. The first version is 0.
*/
var startState = exports.startState = function startState(data) {
	Object.defineProperty(data, '#', { value: 0 });
	return data;
};

/** When building a next game state, the previous one must be cloned using `nextState`. Memory 
sharing in the update chain uses Javascript's prototype system.
*/
var nextState = exports.nextState = function nextState(state) {
	var result = Object.create(state);
	Object.defineProperty(result, '#', { value: (state['#'] || 0) + 1 });
	return result;
};

/** The state is carefully updated in order to maximize memory sharing. The function `updateState`
takes a `path` of the value to be updated. This path is an array of object keys (strings) or array
indices (integers). Once the value is updated, containers (object or arrays) are replicated is the
current state is reusing them from previous versions.
*/
var updateState = exports.updateState = function updateState(state, path, value) {
	var version = state['#'],
		obj = state,
		trace = path.map(function (p) {
			var r = obj;
			obj = obj[p];
			return r;
		}),
		result = value;
	for (var i = trace.length - 1, temp; i >= 0; i--) {
		temp = trace[i];
		if (temp['#'] !== version) {
			if (Array.isArray(temp)) {				
				temp = temp.slice(); // Clone array.
			} else {
				temp = Object.create(temp);
			}
			Object.defineProperty(temp, '#', { value: version });
		}
		temp[path[i]] = result;
		result = temp;
	}
	return result;
};
