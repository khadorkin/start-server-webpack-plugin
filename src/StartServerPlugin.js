import cluster from "cluster";

export default class StartServerPlugin {
  constructor(options) {
    if (options == null) {
      options = {};
    }
    if (typeof options === 'string') {
      options = {name: options};
    }
    this.options = options;
    this.afterEmit = this.afterEmit.bind(this);
    this.apply = this.apply.bind(this);
    this.startServer = this.startServer.bind(this);

    this.worker = null;
  }

  _getArgs() {
    const {options} = this;
    const execArgv = (options.nodeArgs || []).concat(process.execArgv);
    if (options.args) {
      execArgv.push('--');
      execArgv.push.apply(execArgv, options.args);
    }
    return execArgv;
  }

  afterEmit(compilation, callback) {
    if (this.worker && this.worker.isConnected()) {
      return callback();
    }

    this.startServer(compilation, callback);
  }

  apply(compiler) {
    compiler.plugin("after-emit", this.afterEmit);
  }

  startServer(compilation, callback) {
    const {options} = this;
    let name;
    const names = Object.keys(compilation.assets);
    if (options.name) {
      name = options.name;
      if (!compilation.assets[name]) {
        console.error("Entry " + name + " not found. Try one of: " + names.join(" "));
      }
    } else {
      name = names[0];
      if (names.length > 1) {
        console.log("More than one entry built, selected " + name + ". All names: " + names.join(" "));
      }
    }
    const { existsAt } = compilation.assets[name];
    const execArgv = this._getArgs();

    cluster.setupMaster({ exec: existsAt, execArgv });

    cluster.on("online", (worker) => {
      this.worker = worker;
      callback();
    });

    cluster.fork();
  }
}

module.exports = StartServerPlugin;
