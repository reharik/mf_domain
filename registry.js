/**
 * Created by parallels on 9/3/15.
 */
var dagon = require('dagon');

module.exports = function(_options) {
    var options = _options || {};
    var container = dagon(options.dagon);
    return new container(x=>
        x.pathToRoot(__dirname)
            .requireDirectoryRecursively('./src')
            .groupAllInDirectory('./src/AggregateRoots', 'AggregateRoots_hash')
            .for('bluebird').renameTo('Promise')
            .for('corelogger').renameTo('logger').instanciate(i=>i.asFunc().withParameters(options.logger || {}))
            .complete());
};
