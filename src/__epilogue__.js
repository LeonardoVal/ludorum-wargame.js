/** See __prologue__.js
*/
	[ //TODO Add serializable classes.
	].forEach(function (type) {
		type.__SERMAT__.identifier = exports.__package__ +'.'+ type.__SERMAT__.identifier;
		exports.__SERMAT__.include.push(type);
	});
	Sermat.include(exports);
	return exports;
}