var testReader = require('./index');
var fs = require('fs');

testReader.listTests('tree-construction', function (err, tests) {
    if (err) throw (err);
    queue(tests, function (test, next) {
        console.log(test);
        var parser = new testReader.TestParser;
        fs.createReadStream(test).on('error', function (e) {
            console.log(e);
            return next();
        }).pipe(parser).on('data', function (e) {
            console.log(e)
        });
        parser.on('end', next);
    });
});

function queue(data, cb) {
    var element = data[0];
    if (element) {
        cb(element, function() {
            return queue(data.slice(1), cb);
        });
    }
}
