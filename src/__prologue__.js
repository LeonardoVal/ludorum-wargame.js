/** Library wrapper and layout.
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