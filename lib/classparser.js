var path = require('path'),
    esprima = require('esprima'),
	trim = require('trim'),
    array = require('array-extended');

function ExtClassParser(config) {
	var cfg = config || config;
	this.config = {
		includeClassPattern: cfg.includeClassPattern,
		excludeClassPattern: cfg.excludeClassPattern
	};
}

ExtClassParser.prototype = {
	EXT_DEFINE_RX: /^\s*Ext\.define\(['"]([\w.]+)['"]/m,
	DEFINE_RX: /^\/\/\s*@define\s+([\w.]+)/gm,

	ALTERNATE_NAME_RX: /@alternateClassName\s+([\w.]+)/gm,

	EXTEND_NAME_RX: /^\s*extend:\s?['"]([\w.]+)['"]/m,	 // matches[1] is superclass name
	
	EXT_REQUIRES_RX: /^\s*requires:\s?\[\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]/m,
	REQUIRE_RX: /^\/\/\s*@require\s+([\w.]+)/gm,
	
	MIXINS_RX: /^\s*mixins:\s*(\{((\s*\w+\s*:\s*['"]([\w.]+)['"],?)+)\s*\})|^\s*mixins:\s*(\[\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\])/m,
	MAPVALUE_RX: /\w+\s*:\s*/,

	parse: function (data, filePath) {
		var classData, cls;

		classData = this.getClassData(data);

		if (classData.classNames.length) {
			cls = new ExtClass(
				classData.classNames,
				classData.parentName,
				classData.dependencies,
				filePath
			);
		} else if (classData.dependencies && classData.dependencies.length) {
			cls = new ExtClass(
				[path.basename(filePath)],
				classData.parentName,
				classData.dependencies,
				filePath
			);
		}

		return cls;
	},

	getClassData: function (data) {
		var self = this,

		    ast = esprima.parse(data),

			extDefineMatches = this.EXT_DEFINE_RX.exec(data),

		    extendMatches = this.EXTEND_NAME_RX.exec(data),
		    
		    extRequiresMatches = this.EXT_REQUIRES_RX.exec(data),
		    
		    mixins = this.MIXINS_RX.exec(data),

		    classNames = [],

		    reqs = [],
		    tmpMatch, className, parentName;

		// Get @defined class names
		while (tmpMatch = this.DEFINE_RX.exec(data)) {
			classNames.push(this.getClassName(tmpMatch[1]));
		}

		// Get any @alternateClassNames
		while (tmpMatch = this.ALTERNATE_NAME_RX.exec(data)) {
			classNames.push(this.getClassName(tmpMatch[1]));
		}

		// get Ext.defined class names
		if (extDefineMatches && extDefineMatches[1]) {
			classNames.push(this.getClassName(extDefineMatches[1]));
		}

		// Get @require class names
		while (tmpMatch = this.REQUIRE_RX.exec(data)) {
			reqs.push(tmpMatch[1]);
		}

		// Get reguires: [] class names
		if (extRequiresMatches && extRequiresMatches[1]) {
			Array.prototype.push.apply(reqs, this.getClassNames(extRequiresMatches[1].split(',')));
		}

		// Get mixins: { name: 'className' } or mixins: ['className']
		if (mixins && mixins[2]) {
			Array.prototype.push.apply(reqs, this.getClassNames(mixins[2].split(',').map(function (s) {
				return s.replace(self.MAPVALUE_RX, '');
			})));
		} else if (mixins && mixins[6]) {
			Array.prototype.push.apply(reqs, this.getClassNames(mixins[6].split(',')));
		}

		// Get extend: 'className'
		parentName = extendMatches && this.getClassName(extendMatches[1]);

		if (parentName) reqs.unshift(parentName);
		
		
		classNames = array.unique(classNames);
		reqs = array.unique(reqs);

		return {
			classNames: classNames,
			parentName: parentName,
			dependencies: reqs
		};
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
		if (clsName && (!this.config.excludeClassPattern || !this.config.excludeClassPattern.test(clsName))) {
			return clsName;
		}
	}
};

function ExtClass(names, superName, dependencies, filePath) {
	this.names = names;
	this.parentName = superName;
	this.dependencies = dependencies || [];
	this.path = filePath;
	this._isClass = true;
}

module.exports = ExtClassParser;
