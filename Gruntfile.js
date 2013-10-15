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
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    extjs_dependencies: {
      dev: {
        options: {
          excludeClassPattern: /^Ext\./,
          includeFilePattern: /\.js$/,
          rootDir: '/Users/christofer/Projects/Dryleaf/ext4workspace/qwaya/',
          src: [{ path: 'vendor/', parse: false }, 'app/'],
          resolveFrom: 'app.js',
          output: '/Users/christofer/Projects/Dryleaf/ext4workspace/build/slim/qwaya.js'
        },
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

  grunt.registerTask('dev', ['extjs_dependencies:dev']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['dev']);

};
