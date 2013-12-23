BotSocket.prototype.onPing = function(data) {
  // nothing to do with data.latency;
};

BotSocket.prototype.beforeStart = function() {
  this.botName = 'Чемпион Капуи';
  this.updDestinationInterval = 120;
};

BotSocket.prototype.update = function() {
  if (!this.desiredPoint || this.movements % this.updDestinationInterval === 0) {
    this.desiredPoint = this.getDesiredPoint();
  }

  if ( Math.pow(this.desiredPoint[0] - this.myBike.x, 2) + Math.pow(this.desiredPoint[1] - this.myBike.y, 2) < Math.pow(this.moveStepSize, 2)) {
    this.desiredPoint = this.getDesiredPoint();
  }

  this.debugDesiredPoint();

  if (!this.desiredPoint) {
    return;
  }

  var currentPoint = [this.myBike.x, this.myBike.y];
  var path = this.algorithmLee(currentPoint, this.desiredPoint);

  if (path && typeof path[1] !== 'undefined') {
    this.moveToPoint(path[1]);
  } else {
    this.desiredPoint = this.getDesiredPoint();
  }
};

BotSocket.prototype.moveToPoint = function(point) {

  var cx = this.myBike.x;
  var cy = this.myBike.y;
  var dir = this.myBike.direction;

  var dx = point[0];
  var dy = point[1];

  if ( (dx > cx && dir === 'u') || (dx < cx && dir === 'd') ) {
    this.control({'button': 'right'});
  }

  if ( (dy > cy && dir === 'r') || (dy < cy && dir === 'l') ) {
    this.control({'button': 'right'});
  }

  if ( (dx < cx && dir === 'u') || (dx > cx && dir === 'd') ) {
    this.control({'button': 'left'});
  }

  if ( (dy < cy && dir === 'r') || (dy > cy && dir === 'l') ) {
    this.control({'button': 'left'});
  }
};

BotSocket.prototype.getDesiredPoint = function() {
  var point = [];

  var H = Object.keys(this.battleground[0]).length - 1;
  var W = Object.keys(this.battleground).length - 1;

  var x, y, i, j;

  var found = false;
  var iter = 0;
  do {
    i = this.getRandomInt(1, W);
    j = this.getRandomInt(1, H);
    x = i * this.moveStepSize;
    y = j * this.moveStepSize;
    if (this.battleground[x][y] === this.BG_EMPTY) {
      found = true;
    }
    iter++;
  } while (!found && iter < 1000);


  point = [x, y];

  return point;
};

BotSocket.prototype.debugDesiredPoint = function() {
  if (typeof this.dpDebug === 'undefined') {
    var gameContainer = document.getElementById('game-container');
    this.dpDebug = document.getElementById('dp');
      if (!this.dpDebug){
        this.dpDebug = document.createElement('div');
        this.dpDebug.style.position = 'absolute';
        this.dpDebug.style.width = '5px';
        this.dpDebug.style.height = '5px';
        this.dpDebug.id = 'dp';
        this.dpDebug.innerHTML = 'X';
        gameContainer.appendChild(this.dpDebug);
      }
  }

  if (this.desiredPoint){
    this.dpDebug.style.left = this.desiredPoint[0] + 'px';
    this.dpDebug.style.top = this.desiredPoint[1] + 'px';
  }
};
