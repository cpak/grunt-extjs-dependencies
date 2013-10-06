var fs = require('fs'),
    path = require('path'),
	ClassParser = require('./classparser.js'),
    Graph = require('./graph');

function ExtDependencyMapper(config) {
	this.readConfig(config);
	this.graph = new Graph();
	this.parser = new ClassParser({
		includeClassPattern: this.config.includeClassPattern,
		excludeClassPattern: this.config.excludeClassPattern
	});
}

ExtDependencyMapper.prototype = {
	readConfig: function (config) {
		var config = config || {};
		
		this.config = {
			includeFilePattern: config.includeFilePattern,
			excludeFilePattern: config.excludeFilePattern,
			includeClassPattern: config.includeClassPattern,
			excludeClassPattern: config.excludeClassPattern
		};
	},

	readDir: function (dirPath, callback) {
		var self = this;
		
	    fs.readdirSync(dirPath).forEach(function (fileName) {
	    	var filePath = path.join(dirPath, fileName);
			if ( fs.statSync(filePath).isDirectory() ) {
				self.readDir(filePath);
			} else if (self.shouldProcessFile(fileName)) {
				self.readFile(filePath);
			}
	    });
	},

	readFile: function (filePath) {
		var data = fs.readFileSync(filePath, { encoding: 'utf-8' }),
		    cls;
		
	    if (data && (cls = this.parser.parse(data, filePath))) {
	    	this.graph.addNode(cls);
	    }
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
	}
};

module.exports = ExtDependencyMapper;
