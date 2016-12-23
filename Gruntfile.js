/** Gruntfile for [ludorum-wargame.js](http://github.com/LeonardoVal/ludorum-wargame.js).
*/
var sourceFiles = ['__prologue__',
	// Add source file names here.
	'__epilogue__'].map(function (module) {
		return 'src/'+ module +'.js';
	});

var UMDWrapper = function (global, init) { "use strict";
	if (typeof define === 'function' && define.amd) {
		define(['ludorum', 'creatartis-base', 'sermat'], init); // AMD module.
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = init(require('ludorum'), require('creatartis-base'), require('sermat')); // CommonJS module.
	} else {
		global.ludorum_wargames = init(global.ludorum, global.base, global.Sermat); // Browser.
	}
};

module.exports = function(grunt) {
	grunt.file.defaultEncoding = 'utf8';
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: { //////////////////////////////////////////////////////////////////////////////////
			options: {
				separator: '\n\n',
				sourceMap: true
			},
			build_umd: {
				options: {
					banner: '('+ UMDWrapper +')(this,',
					footer: ');'
				},
				src: sourceFiles,
				dest: 'build/<%= pkg.name %>.js',
			}
		},
		uglify: { //////////////////////////////////////////////////////////////////////////////////
			options: {
				report: 'min',
				sourceMap: true
			},
			build_umd: {
				src: 'build/<%= pkg.name %>.js',
				dest: 'build/<%= pkg.name %>-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>.js.map',
					sourceMapName: 'build/<%= pkg.name %>-min.js.map'
				}
			}
		},
		karma: { ///////////////////////////////////////////////////////////////////////////////////
			options: {
				configFile: 'test/karma.conf.js'
			},
			test_chrome: { browsers: ['Chrome'] },
			test_firefox: { browsers: ['Firefox'] }
		},
		docker: { //////////////////////////////////////////////////////////////////////////////////
			document: {
				src: sourceFiles.concat(['README.md', 'docs/*.md']),
				dest: 'docs/docker',
				options: {
					colourScheme: 'borland',
					ignoreHidden: true,
					exclude: 'src/__prologue__.js,src/__epilogue__.js'
				}
			}
		}
	});
// Load tasks. /////////////////////////////////////////////////////////////////////////////////////
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-karma');
	grunt.loadNpmTasks('grunt-docker');
	
// Register tasks. /////////////////////////////////////////////////////////////////////////////////
	grunt.registerTask('compile', ['concat:build_umd', 'uglify:build_umd']); 
	grunt.registerTask('test', ['compile', 'karma:test_chrome']);
	grunt.registerTask('full-test', ['compile', 'karma:test_chrome', 'karma:test_firefox']);
	grunt.registerTask('build', ['test', 'docker:document']);
	grunt.registerTask('default', ['build']);
};