var fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    ExtClassMapper = require('./classmapper');

function ExtJsDependencies(config) {
    this.classmapper = new ExtClassMapper(config);
}

ExtJsDependencies.prototype = {
    addDir: function () {
        this.classmapper.addDir.apply(this.classmapper, arguments);
    },

    build: function (resolveFrom, outputFilePath, keepTemp) {
        var deps = this.classmapper.getDependencies(resolveFrom),
            out = path.resolve(process.cwd(), outputFilePath);

        if (fs.existsSync(out)) {
            fs.unlinkSync(out);
        }

        console.log('[ExtJsDependencies] build output: "' + out + '".');

        process.setMaxListeners(0);
        deps.forEach(function (depPath) {
            fs.appendFile(out, "\n" + fs.readFileSync(depPath), function (err) {
                if (err) throw err;
                console.log('[ExtJsDependencies] appended "' + depPath + '".');
            });
        });

        console.log('[ExtJsDependencies] build done.');

        if (keepTemp !== true) {
            console.log('[ExtJsDependencies] clean up temp dir "' + this.classmapper.config.tempDir + '"...');
            rimraf(this.classmapper.config.tempDir, function () {
                console.log('[ExtJsDependencies] done.');
            });
        }
    }
};

module.exports = function (config) {
    return new ExtJsDependencies(config);
}
