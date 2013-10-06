var fs = require('fs'),
    ExtClassMapper = require('./lib/classmapper'),
    QwayaMapper = new ExtClassMapper({
    	includeFilePattern: /\.js$/,
        excludeClassPattern: /^Ext\./
    }),
    deps, out, file;

function getScriptTag(path) {
    return '<script src="' + path.replace('/Users/christofer/Projects/Dryleaf/ext4workspace/qwaya/', '') + '"></script>';
}

// QwayaMapper.readDir('/Users/christofer/Projects/Dryleaf/ext4workspace/ext/src/');
QwayaMapper.readDir('/Users/christofer/Projects/Dryleaf/ext4workspace/qwaya/app/');

deps = QwayaMapper.getDependencies('app.js');
if (out = process.argv[2]) {
    file = fs.createWriteStream(out);
    deps.forEach(function (dep) {
        file.write(getScriptTag(dep) + "\n");
    });
    file.end();
}
