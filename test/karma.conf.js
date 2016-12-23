// Karma configuration
module.exports = function(config) {
	config.set({
		basePath: '..',
		frameworks: ['jasmine', 'requirejs'],
		files: [
			'test/karma-tester.js',
			'test/specs/*.test.js',
			'node_modules/sermat/build/sermat-umd-min.js',
			'node_modules/creatartis-base/build/creatartis-base.min.js',
			'build/ludorum-wargame.js'
		],
		exclude: [ ],
		preprocessors: {
			'node_modules/sermat/build/sermat-umd-min.js': ['sourcemap'],
			'node_modules/creatartis-base/build/creatartis-base.min.js': ['sourcemap'],
			'build/ludorum-wargame.js': ['sourcemap']
		},
		reporters: ['progress'],
		port: 9876,
		colors: true,
		logLevel: config.LOG_INFO,
		autoWatch: false,
		browsers: ['PhantomJS'],
		singleRun: true
	});
};
