/** Module wrapper and layout.
*/
function __init__(base, Sermat, ludorum) { "use strict";
/** Import synonyms */
	var declare = base.declare,
		iterable = base.iterable,
		Iterable = base.Iterable,
		initialize = base.initialize,
		raiseIf = base.raiseIf,
		obj = base.obj;

/** Library layout. */
	var exports = {
			__package__: 'ludorum-wargame',
			__name__: 'ludorum_wargame',
			__init__: __init__,
			__dependencies__: [base, Sermat, ludorum],
			__SERMAT__: { include: [base] }
		};

/** See `__epilogue__.js`.
*/
