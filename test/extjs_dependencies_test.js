/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

'use strict';

var grunt = require('grunt'),
    path = require('path');

exports.extjs_dependencies = {
  number_of_files: function (test) {
    test.expect(1);

    var actual = grunt.file.expand('tmp/**/*.js').length,
        expected = 18;

    test.equal(actual, expected, 'should have generated ' + expected + ' output files.');

    test.done();
  },

  dependency_order: function (test) {
    test.expect(16);

    var actual = grunt.file.read('tmp/deps').split("\n"),
        expected = grunt.file.read('test/expected/deps').split("\n");

    actual.forEach(function (actualPath, i) {
      var expectedPath = expected[i],
          expectedIndex = actualPath.length - expectedPath.length;

      actualPath = actualPath.replace(new RegExp('\\' + path.sep, 'g'), '/');

      test.equal(actualPath.indexOf(expectedPath), expectedIndex, 'should output dependencies in correct order.');
    });

    test.done();
  },

  strip_requires_and_uses: function (test) {
    test.expect(32);

    var files = grunt.file.read('test/expected/deps').split("\n").map(function (p) {
          return 'tmp/' + p;
        }),
        requires_rx = /requires:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,
        uses_rx = /uses:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m;

    files.forEach(function (filePath) {
      var content = grunt.file.read(filePath),
          actualReq = requires_rx.test(content),
          actualUse = uses_rx.test(content);

      test.equal(actualReq, false, 'should have removed all "requires: [...]" from ' + filePath);
      test.equal(actualUse, false, 'should have removed all "uses: [...]" from ' + filePath);
    });

    test.done();
  }
};
