/** Gruntfile for [ludorum-wargame.js](https://github.com/LeonardoVal/ludorum-wargame.js).
*/
module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
	});

	require('creatartis-grunt').config(grunt, {
		sourceNames: ['__prologue__',
				'astar',
				'state',
				'armies',
				'wargame',
				'test',
				'moves',
				'grim-future',
				'dynamicScripting',
				'render',
				'strategic',
				'terrainDiscrete',
			'__epilogue__'],
		deps: [
			{ name: 'creatartis-base', id: 'base',
				path: 'node_modules/creatartis-base/build/creatartis-base.min.js' },
			{ name: 'sermat', id: 'Sermat',
				path: 'node_modules/sermat/build/sermat-umd.js' },
			{ name: 'ludorum', id: 'ludorum',
				path: 'node_modules/ludorum/build/ludorum.js' }
		],
		docs: false
	});

	grunt.registerTask('build', ['test']);//FIXME
	grunt.registerTask('default', ['build']);
};
