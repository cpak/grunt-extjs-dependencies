
'use strict';

function ExtClass(params) {
    this.names = params.names;
    this.parentName = params.parentName;
    this.dependencies = params.dependencies || [];
    this.src = params.src;
    this.path = params.path;
    this._isClass = true;
}

exports.init = function (grunt, opts) {
    var options,
        array = require('array-extended'),
        falafel = require('falafel'),
        minimatcher = require('./minimatcher'),
        path = require('path'),
        trim = require('trim'),


        DEFINE_RX = /@define\s+([\w.]+)/gm,

        EXT_ALTERNATE_CLASS_NAME_RX = /alternateClassName:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,
        ALTERNATE_CLASS_NAME_RX = /@alternateClassName\s+([\w.]+)/gm,

        EXTEND_NAME_RX = /^\s*extend\s*:\s*['"]([\w.]+)['"]/m,

        EXT_REQUIRES_RX = /requires:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,
        AT_REQUIRE_RX = /@require\s+([\w.\/\-]+)/,

        EXT_USES_RX = /uses:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,

        MIXINS_RX = /^\s*mixins:\s*(\{((\s*\w+\s*:\s*['"]([\w.]+)['"],?)+)\s*\})|^\s*mixins:\s*(\[\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\])/m,
        MAPVALUE_RX = /\w+\s*:\s*/,

        EXT_CONTROLLERS_RX = /controllers:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,
        EXT_MODELS_RX = /models?:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,
        EXT_VIEWS_RX = /views:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,
        EXT_STORES_RX = /stores:\s*\[?\s*((['"]([\w.*]+)['"]\s*,?\s*)+)\s*\]?,?/m,

        EXT_APP_NAME_RX = /name\s*:\s*['"](\w+)['"]/,

        DOT_JS_RX = /\.js$/,

        _currentFilePath,
        _currentDirPath;

    function readOptions(opts) {
        var options = opts || {};
        return {
            excludeClasses: options.excludeClasses,
            skipParse: options.skipParse
        };
    }

    function parse(src, filePath) {
        var baseName = path.basename(filePath),
            classData, cls;


        _currentFilePath = filePath;
        _currentDirPath = path.dirname(filePath);

        if (shouldParseFile(filePath)) {
            grunt.verbose.write('Parse ' + baseName + '... ');

            classData = getClassData(src);

            if (classData.classNames.length) {
                grunt.verbose.ok('Done, defined class names: ' + classData.classNames.join(', '));
                cls = new ExtClass({
                    names: classData.classNames,
                    parentName: classData.parentName,
                    dependencies: classData.dependencies,
                    src: classData.src,
                    path: filePath
                });
            } else if (classData.dependencies && classData.dependencies.length) {
                grunt.verbose.ok('Done, no defined class name. Adding as ' + baseName);
                cls = new ExtClass({
                    names: [baseName],
                    parentName: classData.parentName,
                    dependencies: classData.dependencies,
                    src: classData.src,
                    path: filePath
                });
            }
        } else {
            grunt.verbose.writeln('Skip parse ' + baseName);
        }

        _currentFilePath = null;

        return cls;
    }

    function getClassData(src) {
        var output = {
                classNames: [],
                parentName: null,
                dependencies: [],
                src: src
            }, ast;

        ast = falafel(src, { comment: true }, function (node) {
            switch (node.type) {
                case 'ExpressionStatement':
                    if (isExtMethodCall('define', node)) {
                        parseDefineCall(node, output);
                    } else if (isExtMethodCall('application', node)) {
                        parseApplicationCall(node, output);
                    }
                    break;

                // Comments
                case 'Block':
                case 'Line':
                    parseComment(node, output);
                    break;
            }
        });

        output.src = ast.toString();

        if (output.parentName) {
            output.dependencies.push(output.parentName);
        }

        output.classNames = array.unique(output.classNames);
        output.dependencies = array.unique(output.dependencies);

        return output;
    }

    function parseDefineCall(node, output) {
        var m;
        // Get class name from Ext.define('MyApp.pkg.MyClass')
        output.definedName = getDefinedClassName(node);
        output.classNames.push(output.definedName);

        // Parse `alternateClassName`
        m = EXT_ALTERNATE_CLASS_NAME_RX.exec(node.source());
        if (m && m[1]) {
            addClassNames(output.classNames, m[1].split(','));
        }

        parseClassDefBody(node, output);
    }

    function parseApplicationCall(node, output) {
        var nodeSrc = node.source(),
            m;

        m = EXT_APP_NAME_RX.exec(nodeSrc);
        if (m && m[1]) {
            output.definedName = getClassName(m[1]);
            addClassNames(output.classNames, output.definedName);
        }

        parseClassDefBody(node, output);
    }

    function parseClassDefBody(node, output) {
        var nodeSrc = node.source(),
            m, c;
        // Parse `extend` annotation
        m = EXTEND_NAME_RX.exec(nodeSrc);
        if (m && m[1] && ( c = getClassName(m[1]) )) {
            output.parentName = c;
        }

        // Parse `requires` annotation
        m = EXT_REQUIRES_RX.exec(nodeSrc);
        if (m && m[1]) {
            addClassNames(output.dependencies, m[1].split(','));

            // Remove `requires` from parsed file
            node.update(nodeSrc.replace(EXT_REQUIRES_RX, ''));
        }

        // Parse `uses: [...]` annotation
        m = EXT_USES_RX.exec(nodeSrc);
        if (m && m[1]) {
            addClassNames(output.dependencies, m[1].split(','));

            // Remove `uses` from parsed file
            node.update(nodeSrc.replace(EXT_USES_RX, ''));
        }

        // Parse `controllers: [...]` annotation
        m = EXT_CONTROLLERS_RX.exec(nodeSrc);
        if (m && m[1]) {
            addClassNames(output.dependencies, extrapolateClassNames('controller', m[1].split(','), output.definedName));
        }

        // Parse `models: [...]` and `model: '...'` annotations
        m = EXT_MODELS_RX.exec(nodeSrc);
        if (m && m[1]) {
            addClassNames(output.dependencies, extrapolateClassNames('model', m[1].split(','), output.definedName));
        }

        // Parse `views: [...]` annotation
        m = EXT_VIEWS_RX.exec(nodeSrc);
        if (m && m[1]) {
            addClassNames(output.dependencies, extrapolateClassNames('view', m[1].split(','), output.definedName));
        }

        // Parse `stores: [...]` annotation
        m = EXT_STORES_RX.exec(nodeSrc);
        if (m && m[1]) {
            addClassNames(output.dependencies, extrapolateClassNames('store', m[1].split(','), output.definedName));
        }

        // Parse `mixins` annotation
        m = MIXINS_RX.exec(nodeSrc);
        if (m && m[2]) {
            addClassNames(output.dependencies, m[2].split(',').map(function (s) {
                return s.replace(MAPVALUE_RX, '');
            }));
        } else if (m && m[6]) {
            addClassNames(output.dependencies, m[6].split(','));
        }
    }

    function isExtMethodCall(methodName, node) {
        var expr = node.expression;
        return ( expr && expr.type === 'CallExpression' &&
            expr.callee &&
            expr.callee.object &&
            expr.callee.object.name === 'Ext' &&
            expr.callee.property &&
            expr.callee.property.name === methodName );
    }

    function getDefinedClassName(node) {
        var clsNameRaw = node.expression.arguments[0].value;
        if (typeof clsNameRaw === 'string' && clsNameRaw) {
            return getClassName(clsNameRaw);
        } else {
            grunt.fail.warn('Cannot determine class name in define call in "' + _currentFilePath + '".');
        }
    }

    function parseComment(node, output) {
        var m;
        if (node.type === 'Line') {
            m = AT_REQUIRE_RX.exec(node.value);
            if (m && m[1]) {
                if (DOT_JS_RX.test(m[1])) {
                    // @require path/to/file.js
                    output.dependencies.push(path.resolve(_currentDirPath, trim(m[1])));
                } else {
                    // @require Class.Name
                    addClassNames(output.dependencies, m[1]);
                }
            }

            while (m = DEFINE_RX.exec(node.value)) {
                if (m[1]) {
                    addClassNames(output.classNames, m[1]);
                }
            }
        } else if (node.type === 'Block') {
            while (m = ALTERNATE_CLASS_NAME_RX.exec(node.value)) {
                if (m[1]) {
                    addClassNames(output.classNames, m[1]);
                }
            }
        }
    }

    function addClassNames(target, nms) {
        var names = Array.isArray(nms) ? nms : [nms];

        names.forEach(function (raw) {
            var name = getClassName(raw);
            if (name) {
                target.push(name);
            }
        });
    }

    function getClassName(className) {
        var clsName = trim(className).replace(/'|"/g, '');
        if (isValidClassName(clsName)) {
            return clsName;
        }
    }

    function extrapolateClassNames(basePkgName, baseNms, dependentName) {
        var doti, ns, baseNames, classNames;

        if (!dependentName) {
            grunt.fail.warn('Cannot extrapolate class name without namespace, in ' + _currentFilePath);
        }

        doti = dependentName.indexOf('.');
        ns = (doti > -1 ? dependentName.substring(0, doti) : dependentName);

        if (!ns) {
            grunt.fail.warn('Cannot extrapolate class name without namespace, in ' + _currentFilePath);
        }

        baseNames = Array.isArray(baseNms) ? baseNms : [baseNms];
        classNames = [];

        baseNames.forEach(function (n) {
            var name = trim(n).replace(/'|"/g, ''),
                clsName;

            if (name) {
                if (name.substring(0, ns.length) === ns) {
                    clsName = getClassName(name);
                } else {
                    clsName = getClassName(ns + '.' + basePkgName + '.' + name);
                }
                if (clsName) {
                    classNames.push(clsName);
                }
            }
        });

        return classNames;
    }

    function shouldParseFile(filePath) {
        if (options.skipParse) {
            return !minimatcher(filePath, options.skipParse, { matchBase: true });
        }
        return true;
    }

    function isValidClassName(className) {
        if (className && options.excludeClasses) {
            return !minimatcher(className, options.excludeClasses);
        }
        return !!className;
    }

    function getClass(filePath) {
        return new ExtClass({
            names: [path.basename(filePath)],
            path: filePath
        });
    }

    options = readOptions(opts);

    exports.parse = parse;
    exports.getClass = getClass;

    return exports;
};
