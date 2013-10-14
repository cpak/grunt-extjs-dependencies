var array = require('array-extended'),
    falafel = require('falafel'),
    minimatch = require('minimatch'),
    path = require('path'),
    trim = require('trim');

function ExtClassParser(config) {
	var config = config || {};
	this.config = {
		includeClassPattern: config.includeClassPattern,
		excludeClassPattern: config.excludeClassPattern,
		skipParse: config.skipParse
	};
}

ExtClassParser.prototype = {
	// EXT_DEFINE_RX: /^\s*Ext\.define\(['"]([\w.]+)['"]/m,
	DEFINE_RX: /@define\s+([\w.]+)/gm,

	EXT_ALTERNATE_CLASS_NAME_RX: /alternateClassName:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,/m,
	ALTERNATE_CLASS_NAME_RX: /@alternateClassName\s+([\w.]+)/gm,

	EXTEND_NAME_RX: /^\s*extend\s*:\s*['"]([\w.]+)['"]/m,
	
	// EXT_REQUIRES_RX: /requires:\s*\[\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]/m,
	EXT_REQUIRES_RX: /requires:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,/m,
	AT_REQUIRE_RX: /@require\s+([\w.\/\-]+)/,
	// AT_REQUIRE_RX: /@require\s+(.+)$/,
	
	MIXINS_RX: /^\s*mixins:\s*(\{((\s*\w+\s*:\s*['"]([\w.]+)['"],?)+)\s*\})|^\s*mixins:\s*(\[\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\])/m,
	MAPVALUE_RX: /\w+\s*:\s*/,

	DOT_JS_RX: /\.js$/,

	parse: function (src, filePath) {
		var baseName = path.basename(filePath),
		    classData, cls;


		this._currentFilePath = filePath;
		this._currentDirPath = path.dirname(filePath);

		if (this.shouldParseFile(filePath)) {
			console.log('[ExtClassParser] parse ' + baseName);
			
			classData = this.getClassData(src);

			if (classData.classNames.length) {
				cls = new ExtClass({
					names: classData.classNames,
					parentName: classData.parentName,
					dependencies: classData.dependencies,
					src: classData.src,
					path: filePath
				});
			} else if (classData.dependencies && classData.dependencies.length) {
				cls = new ExtClass({
					names: [baseName],
					parentName: classData.parentName,
					dependencies: classData.dependencies,
					src: classData.src,
					path: filePath
				});
			}
		} else {
			console.log('[ExtClassParser] skip parse ' + baseName);
			cls = new ExtClass({
				names: [baseName],
				dependencies: [],
				src: classData.src,
				path: filePath
			});
		}

		delete this._currentFilePath;

		return cls;
	},

	getClassData: function (src) {
		var self = this,
		    output = {
		    	classNames: [],
		    	parentName: null,
		    	dependencies: [],
		    	src: src
		    }, ast;

		ast = falafel(src, { comment: true }, function (node) {
			switch (node.type) {
				case 'ExpressionStatement':
					if (self.isExtMethodCall('define', node)) {
						self.parseDefineCall(node, output);
					} else if (self.isExtMethodCall('application', node)) {
						self.parseApplicationCall(node, output);
					}
					break;
				
				// Comments
				case 'Block':
				case 'Line':
					self.parseComment(node, output);
					break;
			}
		});

		output.src = ast.toString();

		if (output.parentName) output.dependencies.push(output.parentName);

		output.classNames = array.unique(output.classNames);
		output.dependencies = array.unique(output.dependencies);

		return output;
	},

	parseDefineCall: function (node, output) {
		var m;
		// Get class name from Ext.define('MyApp.pkg.MyClass')
		output.classNames.push(this.getDefinedClassName(node));

		// Parse `alternateClassName`
		m = this.EXT_ALTERNATE_CLASS_NAME_RX.exec(node.source());
		if (m && m[1]) {
			this.addClassNames(output.classNames, m[1].split(','));
			// Array.prototype.push.apply(output.classNames, this.getClassNames(m[1].split(',')));
		}

		this.parseApplicationCall(node, output);
	},
	parseApplicationCall: function (node, output) {
		var self = this,
		    nodeSrc = node.source(),
		    m, c;
		// Parse `extend` annotation
		m = self.EXTEND_NAME_RX.exec(nodeSrc);
		if (m && m[1] && ( c = this.getClassName(m[1]) )) {
			output.parentName = c;
		}

		// Parse `requires` annotation
		m = self.EXT_REQUIRES_RX.exec(nodeSrc);
		if (m && m[1]) {
			this.addClassNames(output.dependencies, m[1].split(','));
			// Array.prototype.push.apply(output.dependencies, self.getClassNames(m[1].split(',')));
			
			// Remove `requires` from parsed file
			node.update(nodeSrc.replace(this.EXT_REQUIRES_RX, ''));
		}


		// Parse `mixins` annotation
		m = self.MIXINS_RX.exec(nodeSrc);
		if (m && m[2]) {
			this.addClassNames(output.dependencies, m[2].split(',').map(function (s) {
				return s.replace(self.MAPVALUE_RX, '');
			}));
			// Array.prototype.push.apply(output.dependencies, this.getClassNames(m[2].split(',').map(function (s) {
			// 	return s.replace(self.MAPVALUE_RX, '');
			// })));
		} else if (m && m[6]) {
			this.addClassNames(output.dependencies, m[6].split(','));
			// Array.prototype.push.apply(output.dependencies, this.getClassNames(m[6].split(',')));
		}
	},
	isExtMethodCall: function (methodName, node) {
		var expr = node.expression;
		return ( expr && expr.type === 'CallExpression'
			&& expr.callee
			&& expr.callee.object
			&& expr.callee.object.name === 'Ext'
			&& expr.callee.property
			&& expr.callee.property.name === methodName );
	},
	getDefinedClassName: function (node) {
		var clsNameRaw = node.expression.arguments[0].value;
		if (typeof clsNameRaw === 'string' && clsNameRaw) {
			return this.getClassName(clsNameRaw);
		} else {
			throw new Error('Cannot determine class name in define call in "' + this._currentFilePath + '".');
		}
	},

	parseComment: function (node, output) {
		var m;
		if (node.type === 'Line') {
			m = this.AT_REQUIRE_RX.exec(node.value);
			if (m && m[1]) {
				if (this.DOT_JS_RX.test(m[1])) {
					// @require path/to/file.js
					output.dependencies.push(path.resolve(this._currentDirPath, trim(m[1])));
				} else {
					// @require Class.Name
					this.addClassNames(output.dependencies, m[1]);
					// output.dependencies.push(this.getClassName(m[1]));
				}
			}

			while (m = this.DEFINE_RX.exec(node.value)) {
				if (m[1]) {
					this.addClassNames(output.classNames, m[1]);
					// output.classNames.push(this.getClassName(m[1]));
				}
			}
		} else if (node.type === 'Block') {
			while (m = this.ALTERNATE_CLASS_NAME_RX.exec(node.value)) {
				if (m[1]) {
					this.addClassNames(output.classNames, m[1]);
					// output.classNames.push(this.getClassName(m[1]));
				}
			}
		}
	},

	addClassNames: function (target, names) {
		var self = this,
		    names = Array.isArray(names) ? names : [names];
		
		names.forEach(function (raw) {
			var name = self.getClassName(raw);
			if (name) {
				target.push(name);
			}
		});
	},

	getClassNames: function (raw) {
		var self = this,
		    clsNames = [];
		raw.forEach(function (r) {
			var clsName = self.getClassName(r);
			if (clsName) {
				clsNames.push(clsName);
			}
		});
		return clsNames;
	},

	getClassName: function (className) {
		var clsName = trim(className).replace(/'|"/g, '');
		if (this.isValidClassName(clsName)) {
			return clsName;
		}
	},

	shouldParseFile: function (filePath) {
		var i, l;
		if (this.config.skipParse) {
			i = 0;
			l = this.config.skipParse.length;
			for (; i < l; i++) {
				if (minimatch(filePath, this.config.skipParse[i], { matchBase: true })) {
					return false;
				}
			}
		}
		return true;
	},

	isValidClassName: function (className) {
		return (className && (!this.config.excludeClassPattern || !this.config.excludeClassPattern.test(className)));
	},

	getClass: function (filePath) {
		return new ExtClass({
			names: [path.basename(filePath)],
			path: filePath
		});
	}
};

function ExtClass(params) {
	this.names = params.names;
	this.parentName = params.parentName;
	this.dependencies = params.dependencies || [];
	this.src = params.src;
	this.path = params.path;
	this._isClass = true;
}

module.exports = ExtClassParser;
