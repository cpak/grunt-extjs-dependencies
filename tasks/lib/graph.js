
'use strict';

exports.init = function (grunt) {
    var allNodes = [],
        allNodeNames = [],
        allNodesByName = {},
        allNodesByPath = {},
        map = {},

        DOT_JS_RX = /\.js$/,
        DOT_RX = /\./,
        GLOB_RX = /\.\*$/,

        path = require('path'),

        exports = {};


    function addNode(node) {
        allNodes.push(node);
        registerNodeNames(node);
        allNodesByPath[node.path] = node;
        addNodeToMap(node);
    }

    function registerNodeNames(node) {
        var nodeNames = node.names,
            i = 0,
            l = nodeNames.length;

        for (; i < l; i++) {
            allNodeNames.push(nodeNames[i]);
            addIfNotExists(allNodesByName, nodeNames[i], node);
        }
    }

    function addNodeToMap(node) {
        node.names.forEach(function (nodeName) {
            var path = splitPath(nodeName),
                i = 0,
                l = path.parents.length,
                parent = map;

            for (; i < l; i++) {
                addIfNotExists(parent, path.parents[i], {});
                parent = parent[path.parents[i]];
            }

            addIfNotExists(parent, path.node, node);
        });
    }

    function splitPath(path) {
        var parts = path.replace(DOT_JS_RX, '').split('.'),
            parents, node;

        if (parts.length > 1) {
            parents = parts.slice(0, parts.length - 1);
            node = parts[parts.length - 1];
        } else {
            parents = [];
            node = path;
        }

        return {
            parents: parents,
            node: node
        };
    }

    function addIfNotExists(target, key, value) {
        if (!target[key]) {

            if ((typeof target !== 'object')) {
                throw new Error('Expected object');
            }

            target[key] = value;
            return true;
        } else {
            return false;
        }
    }

    function getDependencies(fromName) {
        var from = Array.isArray(fromName) ? fromName : [fromName],
            resolvedNodes = [],
            nodes = [];

        grunt.verbose.writeln('Resolve from ' + from.join(', '));

        from.forEach(function (name) {
            Array.prototype.push.apply(nodes, resolveName(name));
        });

        resolveDependencies(nodes, resolvedNodes);

        grunt.verbose.ok('Resolved ' + resolvedNodes.length + ' nodes from ' + from.join(', '));

        return resolvedNodes;
    }

    function getAllNodePaths () {
        return Object.keys(allNodesByPath);
    }

    function resolveDependencies(nodes, resolvedNodes) {
        nodes.forEach(function (node) {
            if (resolvedNodes.indexOf(node.path) === -1) {
                if (node.dependencies && node.dependencies.length) {
                    node.dependencies.forEach(function (dep) {
                        grunt.verbose.writeln('Resolve dependency ' + dep);
                        resolveDependencies(resolveName(dep), resolvedNodes);
                    });
                }
                if (!node.path) {
                    grunt.fail.warn('Node has no path');
                }
                resolvedNodes.push(node.path);
            }
        });
    }

    function resolveName(name) {
        if (~(name || '').indexOf(path.sep)) {
            return resolvePath(name);
        } else {
            return resolveClassName(name);
        }
    }

    function resolveClassName(name) {
        var lcd, key, pkg, pkgName;
        if (!GLOB_RX.test(name)) {
            grunt.verbose.writeln('Looking up class name ' + name);
            if (!allNodesByName[name]) {
                grunt.fail.warn('Missing class "' + name + '".');
            }
            grunt.verbose.ok('Found class ' + name);
            return [allNodesByName[name]];
        } else {
            grunt.verbose.writeln('Looking up package ' + name);
            pkgName = name.replace(GLOB_RX, '');
            lcd = pkgName.split(DOT_RX);
            pkg = map;

            while (key = lcd.shift()) {
                if (!pkg[key]) {
                    grunt.fail.warn('Missing package "' + lcd.concat([key]).join('.') + '".');
                }
                pkg = pkg[key];
            }

            grunt.verbose.ok('Found package ' + name + ' (' + Object.keys(pkg).length + ')');
            return flattenPackage(pkg);
        }
    }

    function flattenPackage(pkg) {
        var nodes = [];
        Object.keys(pkg).forEach(function (nodeName) {
            var node = pkg[nodeName];
            if (!node._isClass) {
                Array.prototype.push.apply(nodes, flattenPackage(node));
            } else {
                nodes.push(node);
            }
        });
        return nodes;
    }

    function resolvePath(path) {
        var node = allNodesByPath[path];
        grunt.verbose.writeln('Looking up path ' + path + '...');
        if (!node) {
            grunt.fail.warn('Missing file "' + path + '".');
        }
        grunt.verbose.ok('Found file ' + path);
        return [node];
    }

    exports.addNode = addNode;
    exports.getDependencies = getDependencies;
    exports.getAllNodePaths = getAllNodePaths;

    return exports;
};
