/*
 * grunt-extjs-dependencies
 * https://github.com/cpak/grunt-extjs-dependencies
 *
 * Copyright (c) 2013 christoferpak@gmail.com
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/**/*.js',
        'test/data/**/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      test: ['tmp'],
    },

    // Configuration to be run (and then tested).
    extjs_dependencies: {
      test: {
        options: {
          rootDir: './test/data',
          src: [{ path: 'vendor/', parse: false }, 'app/'],
          excludeClasses: ['Ext.*', 'MyApp.mixin.Bar'],
          resolveFrom: 'MyApp',
          skipParse: [
            '**/app/ux/SkipMe.js'
          ],
          // Needed for test
          tempDir: 'tmp',
          output: 'tmp/deps'
        }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  // grunt.registerTask('test', ['clean', 'extjs_dependencies', 'nodeunit']);
  grunt.registerTask('test', ['clean', 'extjs_dependencies', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
