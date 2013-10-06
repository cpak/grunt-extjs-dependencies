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
            this.addIfNotExists(this.nodesByName, nodeNames, node);
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

    getDependencies: function (className) {
        var self = this,
            resolvedNodes = [],
            nodes = this.resolveName(className);

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
                resolvedNodes.push(node.path);
            }
        });
    },

    resolveName: function (name) {
        var lcd, key, pkg;
        if (!this.GLOB_RX.test(name)) {
            if (!this.nodesByName[name]) throw new Error('Missing class ' + name);
            return [this.nodesByName[name]];
        } else {
            pkgName = name.replace(this.GLOB_RX, '');
            lcd = pkgName.split(this.DOT_RX);
            pkg = this.map;
            
            while (key = lcd.shift()) {
                if (pkg[key]) throw new Error('Missing package ' + lcd.concat([key]).join('.'));
                pkg = pkg[key];
            }

            return Object.keys(pkg).map(function (nodeName) {
                if (!pkg[nodeName]) throw new Error('Missing class ' + pkgName + '.' + nodeName);
                return pkg[nodeName];
            });
        }
    }
};

module.exports = ExtClassGraph;
