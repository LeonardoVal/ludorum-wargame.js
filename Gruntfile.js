/** Gruntfile for [ludorum-wargame.js](https://github.com/LeonardoVal/ludorum-wargame.js).
*/
module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
	});

	require('creatartis-grunt').config(grunt, {
		sourceNames: ['__prologue__',
				'armies',
				'moves', 'wargame', 'terrain',
				'test',
				'grim-future',
				'dynamicScripting',
				'render',
				'strategic',
			'__epilogue__'],
		deps: [
			{ id: 'creatartis-base', name: 'base' },
			{ id: 'sermat', name: 'Sermat',
				path: 'node_modules/sermat/build/sermat-umd.js' },
			{ id: 'ludorum' }
		],
		docs: false
	});

	grunt.registerTask('build', ['test']);//FIXME
	grunt.registerTask('default', ['build']);
};
