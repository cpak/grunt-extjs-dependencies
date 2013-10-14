var fs = require('fs'),
    nfs = require('node-fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    ClassParser = require('./classparser.js'),
    Graph = require('./graph');

function ExtDependencyMapper(config) {
    this.readConfig(config);
    this.graph = new Graph();
    this.parser = new ClassParser({
        includeClassPattern: this.config.includeClassPattern,
        excludeClassPattern: this.config.excludeClassPattern,
        skipParse: this.config.skipParse
    });
    this.createTempDir();
}

ExtDependencyMapper.prototype = {
    readConfig: function (config) {
        var config = config || {},
            rootDir = config.rootDir || process.cwd();
        
        this.config = {
            includeFilePattern: config.includeFilePattern,
            excludeFilePattern: config.excludeFilePattern,

            skipParse: config.skipParse,

            rootDir: rootDir,
            
            includeClassPattern: config.includeClassPattern,
            excludeClassPattern: config.excludeClassPattern,

            tempDir: path.resolve(rootDir, config.tempDir || './extjs-dependencies-tmp')
        };
    },

    createTempDir: function () {
        if (!fs.existsSync(this.config.tempDir)) {
            console.log('[ExtDependencyMapper] Creating temp dir "' + this.config.tempDir + '"...');
            this.createDir(this.config.tempDir);
        } else {
            console.log('[ExtDependencyMapper] Cleaning temp dir "' + this.config.tempDir + '"...');
            rimraf.sync(path.join(this.config.tempDir, '*'));
        }
    },

    createDir: function (dirPath) {
        if (!fs.existsSync(dirPath)) {
            nfs.mkdirSync(dirPath, 0777, true);
        }
    },

    addDir: function (dirPath, parse) {
        var parse = parse !== false,
            dirPath = dirPath.charAt(0) === '/' ? dirPath : path.join(this.config.rootDir, dirPath);
        console.log('[ExtDependencyMapper] Adding dir "' + dirPath + '".');
        this.readDir(dirPath, parse);
    },

    readDir: function (dirPath, parse) {
        var self = this;
        
        fs.readdirSync(dirPath).forEach(function (fileName) {
            var filePath = path.join(dirPath, fileName);
            if ( fs.statSync(filePath).isDirectory() ) {
                self.readDir(filePath, parse);
            } else if (self.shouldProcessFile(fileName)) {
                self.readFile(filePath, parse);
            }
        });
    },

    readFile: function (filePath, parse) {
        var outputPath = this.getOutputPath(filePath),
            data, node;
        
        if (parse) {
            data = fs.readFileSync(filePath, { encoding: 'utf-8' });
            if (data && (node = this.parser.parse(data, outputPath))) {
                this.graph.addNode(node);
                this.writeFile(outputPath, node.src);
            }
        } else {
            this.graph.addNode(this.parser.getClass(outputPath));
            this.copyFile(filePath, outputPath);
        }
    },

    getOutputPath: function (filePath) {
        return path.join(this.config.tempDir, path.relative(this.config.rootDir, filePath));
    },

    shouldProcessFile: function (fileName) {
        var p = true;
        if (this.config.includeFilePattern) {
            p = this.config.includeFilePattern.test(fileName);
        } else if (this.config.excludeFilePattern) {
            p = !this.config.excludeFilePattern.test(fileName);
        }
        return p;
    },

    getDependencies: function () {
        return this.graph.getDependencies.apply(this.graph, arguments);
    },

    writeFile: function (filePath, data) {
        var file;
        this.createDir(path.dirname(filePath));
        fs.writeFileSync(filePath, data);
        // TODO: make async
        // file = fs.createWriteStream(filePath);
        // file.write(data + "\n");
        // file.end();
    },

    copyFile: function (source, target) {
        var content = fs.readFileSync(source);
        
        this.createDir(path.dirname(target));

        fs.writeFileSync(target, content);
        
        // TODO: make async
        // fs.createReadStream(source).pipe(fs.createWriteStream(target));
    }
};

module.exports = ExtDependencyMapper;
