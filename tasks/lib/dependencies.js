
'use strict';

var fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    Promise = require('promise'),
    Mapper = require('./mapper'),
    appendp = Promise.denodeify(fs.appendFile);

function ExtJsDependencies(config) {
    this.mapper = new Mapper(config);
    if (config.log) {
        this.log = config.log;
    }
}

ExtJsDependencies.prototype = {
    addDir: function () {
        return this.mapper.addDir.apply(this.mapper, arguments);
    },

    resolveDependencies: function () {
        return 
    },

    build: function (resolveFrom, outputFilePath, keepTemp) {
        var self = this,
            deps = this.mapper.getDependencies(resolveFrom),
            out = path.resolve(process.cwd(), outputFilePath),
            p = [];

        if (fs.existsSync(out)) {
            fs.unlinkSync(out);
        }

        this.log('Concatenating ' + deps.length + ' files to "' + out + '".');

        deps.forEach(function (depPath) {
            p.push(appendp(out, "\n" + fs.readFileSync(depPath), function (err) {
                if (err) {
                    throw err;
                }
                this.log('Appended "' + depPath + '".');
            }));
        });

        return Promise.all(p).then(function () {
            var self = this;
            this.log('ok', 'Build done.');
            if (keepTemp !== true) {
                this.log('Clean up temp dir "' + this.mapper.config.tempDir + '"...');
                rimraf(this.mapper.config.tempDir, function () {
                    self.log('ok', 'Done.');
                });
            }
        });
    }
};

module.exports = ExtJsDependencies;
