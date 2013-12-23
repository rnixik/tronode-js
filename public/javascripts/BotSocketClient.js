BotSocket.prototype.setGameParameters = function(gameParameters) {
  this.clientSocket = gameParameters.socket;

  this.moveStepSize = gameParameters.moveStepSize;
  this.gameWidth = gameParameters.gameWidth;
  this.gameHeight = gameParameters.gameHeight;
  this.serverMainLoopInterval = gameParameters.mainLoopInterval;
};

BotSocket.prototype.control = function(data) {
    this.clientSocket.emit('control', data);
};

BotSocket.prototype.start = function() {
  this.beforeStart();
  this.clientSocket.emit('control', {'button': 'joinBattle', 'name': this.botName});
};

BotSocket.prototype.onPing = function(data) {
  // nothing to do with data.latency;
};

BotSocket.prototype.beforeStart = function() {
  this.botName = 'My AI';
};

BotSocket.loadScript = function(url, callback) {
    var t = new Date().getTime();
    if (/\?/.test(url)) {
      url += '&_t=' + t;
    } else {
      url += '?_t=' + t;
    }
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onreadystatechange = callback;
    script.onload = callback;
    head.appendChild(script);
};
