var fs = require('fs');
var util = require('util');
var stream = require('stream');

module.exports = {
    listTests: function(type, cb) {
        return fs.readdir(__dirname + '/data/' + type, function (err, tests) {
            if (err) return cb(err);

            cb(null, tests.map(function (e) { return __dirname + '/data/' + type + '/' + e; }));
        });
    },
    TestParser: TestParser,
    serialize: require('./serializeTestOutput')
};

function TestParser(options) {
    if (!options) options = {};
    options.decodeStrings = true;
    stream.Transform.call(this, options);

    this._pending = "";
    this._nextOutput = {};
    this._readableState.objectMode = true;
    this._writableState.objectMode = true;
}

util.inherits(TestParser, stream.Transform);

TestParser.prototype._transform = function parseSuite(chunk, encoding, callback) {
    chunk = this._pending + chunk;
    while ((off = chunk.indexOf('\n')) != -1) {
        handleLine.call(this, chunk.slice(0, off));
        chunk = chunk.slice(off + 1);
    }

    this._pending = chunk;
    callback();
};

TestParser.prototype._flush = function (callback) {
    emit.call(this);
    callback();
};

function handleLine(line) {
    if (line.length == 0) {
        emit.call(this);
    } else if (m = /^#(.*)$/.exec(line)) {
        this._currentHeading = m[1];
        if (m[1] == 'errors') {
            this._nextOutput[m[1]] = [];
        } else {
            this._nextOutput[m[1]] = "";
        }
    } else if (this._currentHeading) {
        if (this._currentHeading == 'document') {
            this._nextOutput[this._currentHeading] += line.replace(/^\| /, '') + '\n';
        } else if (this._currentHeading == 'errors') {
            handleError.call(this, line);
        } else {
            this._nextOutput[this._currentHeading] += line + '\n';
        }
    }
}

function emit() {
    if (Object.keys(this._nextOutput).length) {
        this.push(this._nextOutput);
    }
    this._nextOutput = {};
}

function handleError(line) {
    var m = /\((\d+),\s*(\d+)\):? (.*)/.exec(line);
    this._nextOutput[this._currentHeading].push(m ? {
        line: parseInt(m[1], 10),
        column: parseInt(m[2], 10),
        message: m[3]
    } : { message: line });
}
