
'use strict';

exports.init = function (grunt, opts, cb) {
    var options,
    
        fs = require('fs'),
        nfs = require('node-fs'),
        path = require('path'),
        Promise = require('promise'),
        tmp = require('tmp'),
        tmpdirp = Promise.denodeify(tmp.dir),
    
        parser,
        graph = require('./graph').init(grunt),

        fileCounter = 0,

        exports = {},

        initPromise;

    tmp.setGracefulCleanup();

    function readOptions(opts) {
        var options = opts || {},
            rootDir = options.rootDir || process.cwd();
            
        return {
            includeFilePattern: options.includeFilePattern,
            excludeFilePattern: options.excludeFilePattern,

            skipParse: options.skipParse,

            rootDir: rootDir,
            
            includeClassPattern: options.includeClassPattern,
            excludeClassPattern: options.excludeClassPattern,

            tempDir: path.resolve(rootDir, options.tempDir || './extjs-dependencies-tmp')
        };
    }
    
    function createDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            nfs.mkdirSync(dirPath, '0777', true);
        }
    }

    function readDir(dirPath, parse) {
        fs.readdirSync(dirPath).forEach(function (fileName) {
            var filePath = path.join(dirPath, fileName);
            if ( fs.statSync(filePath).isDirectory() ) {
                readDir(filePath, parse);
            } else if ( shouldProcessFile(fileName) ) {
                readFile(filePath, parse);
            }
        });
    }

    function readFile(filePath, parse) {
        var outputPath = getOutputPath(filePath),
            data, node;
        
        if (parse) {
            data = fs.readFileSync(filePath, { encoding: 'utf-8' });
            if (data && (node = parser.parse(data, outputPath))) {
                graph.addNode(node);
                writeFile(outputPath, node.src);
            }
        } else {
            graph.addNode(parser.getClass(outputPath));
            copyFile(filePath, outputPath);
        }
        fileCounter++;
    }

    function getOutputPath(filePath) {
        return path.join(options.tempDir, path.relative(options.rootDir, filePath));
    }

    function shouldProcessFile(fileName) {
        var p = true;
        if (options.includeFilePattern) {
            p = options.includeFilePattern.test(fileName);
        } else if (options.excludeFilePattern) {
            p = !options.excludeFilePattern.test(fileName);
        }
        return p;
    }

    function writeFile(filePath, data) {
        createDir(path.dirname(filePath));
        fs.writeFileSync(filePath, data);
    }

    function copyFile(source, target) {
        var content = fs.readFileSync(source);
        
        createDir(path.dirname(target));

        fs.writeFileSync(target, content);
    }

    exports.addDir = function (dirs, parse) {
        if (!Array.isArray(dirs)) {
            dirs = [{ path: dirs, parse: parse !== false }];
        }

        dirs.forEach(function (dir) {
            var dirPath, parse;
            
            if (typeof dir === 'string') {
                dirPath = dir.charAt(0) === '/' ? dir : path.join(options.rootDir, dir);
                parse = true;
            } else {
                dirPath = dir.path.charAt(0) === '/' ? dir.path : path.join(options.rootDir, dir.path);
                parse = dir.parse !== false;
            }
            
            grunt.verbose.writeln('Adding dir "' + dirPath);
            
            readDir(dirPath, parse);
        });

        return fileCounter;
    };

    exports.resolveDependencies = graph.getDependencies;



    options = readOptions(opts);
    parser = require('./parser.js').init(grunt, options);

    tmpdirp({
        mode: '0777',
        prefix: 'extjs_dependencies_',
        unsafeCleanup: true
    });

    initPromise = tmpdirp(options.tempDir).then(function (path) {
        options.tempDir = path;
        return exports;
    }, function (reason) {
        grunt.fail.warn(reason);
    });

    if (typeof cb === 'function') {
        initPromise.then(cb);
    }

    return initPromise;
};
