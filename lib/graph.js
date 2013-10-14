function ExtClassGraph() {
    this.nodes = [];
    this.nodeNames = [];
    this.nodesByName = {};
    this.nodesByPath = {};
    this.map = {};
}
ExtClassGraph.prototype = {
    DOT_JS_RX: /\.js$/,
    DOT_RX: /\./,
    GLOB_RX: /\.\*$/,
    PATH_RX: /\//,

    addNode: function (node) {
        this.nodes.push(node);
        this.registerNodeNames(node);
        this.nodesByPath[node.path] = node;
        this.addNodeToMap(node);
    },

    registerNodeNames: function (node) {
        var nodeNames = node.names,
            i = 0,
            l = nodeNames.length;
        
        for (; i < l; i++) {
            this.nodeNames.push(nodeNames[i]);
            this.addIfNotExists(this.nodesByName, nodeNames[i], node);
        }
    },
    
    addNodeToMap: function (node) {
        var self = this;
        
        node.names.forEach(function (nodeName) {
            var path = self.splitPath(nodeName),
                i = 0,
                l = path.parents.length,
                parent = self.map;

            for (; i < l; i++) {
                self.addIfNotExists(parent, path.parents[i], {});
                parent = parent[path.parents[i]];
            }
            
            self.addIfNotExists(parent, path.node, node);
        });
    },
    
    splitPath: function (path) {
        var parts = path.replace(this.DOT_JS_RX, '').split('.'),
            parents, node;
        
        if (parts.length > 1) {
            parents = parts.slice(0, parts.length - 1);
            node = parts[parts.length - 1];
        } else {
            parents = [],
            node = path;
        }

        return {
            parents: parents,
            node: node
        }
    },
    
    addIfNotExists: function (target, key, value) {
        if (!target[key]) {
            
            if ((typeof target !== 'object')) throw new Error('Expected object');

            target[key] = value;
            return true;
        } else {
            return false;
        }
    },

    getDependencies: function (from) {
        var self = this,
            from = Array.isArray(from) ? from : [from],
            resolvedNodes = [],
            nodes = [];

            from.forEach(function (name) {
                Array.prototype.push.apply(nodes, self.resolveName(name));
            });

        self.resolveDependencies(nodes, resolvedNodes);

        return resolvedNodes;

    },

    resolveDependencies: function (nodes, resolvedNodes) {
        var self = this;
        nodes.forEach(function (node) {
            if (resolvedNodes.indexOf(node.path) === -1) {
                if (node.dependencies && node.dependencies.length) {
                    node.dependencies.forEach(function (dep) {
                        self.resolveDependencies(self.resolveName(dep), resolvedNodes);
                    });
                }
                if (!node.path) throw new Error('Node has no path');
                resolvedNodes.push(node.path);
            }
        });
    },

    resolveName: function (name) {
        if (this.PATH_RX.test(name)) {
            return this.resolvePath(name);
        } else {
            return this.resolveClassName(name);
        }
    },

    resolveClassName: function (name) {
        var lcd, key, pkg;
        if (!this.GLOB_RX.test(name)) {
            // console.log('[ExtClassGraph] looking up class name ' + name);
            if (!this.nodesByName[name]) throw new Error('Missing class "' + name + '".');
            // console.log('[ExtClassGraph] found class ' + name);
            return [this.nodesByName[name]];
        } else {
            // console.log('[ExtClassGraph] looking up package ' + name);
            pkgName = name.replace(this.GLOB_RX, '');
            lcd = pkgName.split(this.DOT_RX);
            pkg = this.map;
            
            while (key = lcd.shift()) {
                if (!pkg[key]) throw new Error('Missing package "' + lcd.concat([key]).join('.') + '".');
                pkg = pkg[key];
            }

            // console.log('[ExtClassGraph] found package ' + name + ' (' + Object.keys(pkg).length + ')');
            return this.flattenPackage(pkg);
        }
    },

    flattenPackage: function (pkg) {
        var self = this,
            nodes = [];
        Object.keys(pkg).forEach(function (nodeName) {
            var node = pkg[nodeName];
            if (!node._isClass) {
                Array.prototype.push.apply(nodes, self.flattenPackage(node));
            } else {
                nodes.push(node);
            }
        });
        return nodes;
    },

    resolvePath: function (path) {
        var node = this.nodesByPath[path];
        // console.log('[ExtClassGraph] looking up path ' + path + '...');
        if (!node) throw new Error('Missing file "' + path + '".');
        // console.log('[ExtClassGraph] found ' + path);
        return [node];
    }
};

module.exports = ExtClassGraph;
