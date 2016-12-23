(function (global, init) { "use strict";
	if (typeof define === 'function' && define.amd) {
		define(['ludorum', 'creatartis-base', 'sermat'], init); // AMD module.
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = init(require('ludorum'), require('creatartis-base'), require('sermat')); // CommonJS module.
	} else {
		global.ludorum_wargames = init(global.ludorum, global.base, global.Sermat); // Browser.
	}
})(this,/** Library wrapper and layout.
*/
function __init__(ludorum, base, Sermat) { "use strict";
	var exports = {
		__package__: 'ludorum-wargame',
		__name__: 'ludorum_wargame',
		__init__: __init__,
		__dependencies__: [ludorum, base, Sermat],
		__SERMAT__: { include: [ludorum, base] }
	};
	
/** See `__epilogue__.js`.
*/

/** See __prologue__.js
*/
	return exports;
});
//# sourceMappingURL=ludorum-wargame.js.map