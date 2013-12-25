BotSocket.prototype.onPing = function(data) {
  // nothing to do with data.latency;
};

BotSocket.prototype.beforeStart = function() {
  this.botName = 'Чемпион Капуи';
  this.updDestinationInterval = 120;

  this.latencyMultiplier = 2;
  this.nextBikeDirection = null;
};

if (typeof origOnRestart === 'undefined') {
  var origOnRestart = BotSocket.prototype.onRestart;
  BotSocket.prototype.onRestart = function(data) {
    origOnRestart.call(this, data);
    this.nextBikeDirection = null;
  };
}

BotSocket.prototype.control = function(data) {
    this.clientSocket.emit('control', data);
    if (data.button === 'right') {
        switch (this.myBike.direction) {
        case "r":
            this.nextBikeDirection = "d";
            break;
        case "d":
            this.nextBikeDirection = "l";
            break;
        case "l":
            this.nextBikeDirection = "u";
            break;
        case "u":
            this.nextBikeDirection = "r";
            break;
        }
    } else if (data.button === 'left') {
        switch (this.myBike.direction) {
        case "r":
            this.nextBikeDirection = "u";
            break;
        case "d":
            this.nextBikeDirection = "r";
            break;
        case "l":
            this.nextBikeDirection = "d";
            break;
        case "u":
            this.nextBikeDirection = "l";
            break;
        }
    }
};

BotSocket.prototype.onUpdate = function(data) {
  var prevX = null;
  var prevY = null;
  if (this.myBike) {
    prevX = this.myBike.x;
    prevY = this.myBike.y;
  }
  for (var lb in this.bikes) {
    var localBike = this.bikes[lb];
    for (var b in data.bikes){
      var bike = data.bikes[b];
      if (bike.number === localBike.number) {
        this.bikes[lb] = bike;
        if (this.myBike && this.myBike.number === bike.number) {
          this.myBike = bike;
        }
        this.occupy(bike.x, bike.y);
        this.occupyInRadius(bike.x, bike.y, bike.direction);
      }
    }
  }
  if ( this.myBike && !this.myBike.collided && (prevX !== this.myBike.x || prevY !== this.myBike.y) ) {
    this.movements++;
    this.update();
  }
};

BotSocket.prototype.update = function() {
  if (!this.desiredPoint || this.movements % this.updDestinationInterval === 0) {
    this.desiredPoint = this.getDesiredPoint();
  }

  this.debugDesiredPoint();

  if ( Math.pow(this.desiredPoint[0] - this.myBike.x, 2) + Math.pow(this.desiredPoint[1] - this.myBike.y, 2) < Math.pow(this.moveStepSize * this.latencyMultiplier, 2) + this.moveStepSize) {
    this.desiredPoint = this.getDesiredPoint();
  }

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

BotSocket.prototype.getPrediction = function(x, y, direction) {
    var dirVector = [0, 0];
            switch (direction) {
                case 'u':
                    dirVector[1] = -1;
                break;
                case 'r':
                    dirVector[0] = 1;
                break;
                case 'd':
                    dirVector[1] = 1;
                break;
                case 'l':
                    dirVector[0] = -1;
                break;
            }
    var x1 = x + (this.latencyMultiplier - 1) * this.moveStepSize * dirVector[0];
    var y1 = y + (this.latencyMultiplier - 1) * this.moveStepSize * dirVector[1];
    return [x1, y1];
};

BotSocket.prototype.moveToPoint = function(point) {

  var cx = this.myBike.x;
  var cy = this.myBike.y;
  var dir = this.myBike.direction;

  var dx = point[0];
  var dy = point[1];

  if (this.latencyMultiplier > 1) {
        if (!this.nextBikeDirection) {
            this.nextBikeDirection = dir;
        } else {
            dir = this.nextBikeDirection;
        }

        var prediction = this.getPrediction(cx, cy, this.nextBikeDirection);
        cx = prediction[0];
        cy = prediction[1];
  }

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

BotSocket.prototype.occupyInRadius = function(x, y, direction) {
  var dx = [1, 0, -1, 0];
  var dy = [0, 1, 0, -1];
  switch (direction) {
    case 'u':
      dx = [-1, 1];
      dy = [1, 1];
    break;
    case 'r':
      dx = [-1, -1];
      dy = [1, -1];
    break;
    case 'd':
      dx = [-1, 1];
      dy = [-1, -1];
    break;
    case 'l':
      dx = [1, 1];
      dy = [1, -1];
    break;
  }

  var i, x1, y1;
  for (var latencyIterator = this.latencyMultiplier - 1; latencyIterator > 0; latencyIterator--) {
  for (i=0; i<dx.length; i++) {
    x1 = x + latencyIterator * this.moveStepSize * dx[i];
    y1 = y + latencyIterator * this.moveStepSize * dy[i];

    if (typeof this.battleground[x1] === 'object') {
      if (typeof this.battleground[x1][y1] === 'number') {
        this.battleground[x1][y1] = this.BG_OCCUPIED;
        this.addDebugPoint(x1, y1, 'o');
      }
    }
  }
  }
};

BotSocket.prototype.initializeBattleground = function() {
  var x, y;
  this.battleground = {};
  var offsetSize = this.moveStepSize * (this.latencyMultiplier - 2);
  for (x = 0; x <= this.gameWidth; x += this.moveStepSize) {
    this.battleground[x] = {};
    for (y = 0; y <= this.gameHeight; y += this.moveStepSize) {
      this.battleground[x][y] = this.BG_EMPTY;

      if (x <= offsetSize || x >= this.gameWidth - offsetSize || y <= offsetSize || y >= this.gameHeight - offsetSize) {
        this.battleground[x][y] = this.BG_OCCUPIED;
        this.addDebugPoint(x, y, 'o');
      }
    }
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
    i = this.getRandomInt(this.latencyMultiplier + 1, W - this.latencyMultiplier - 1);
    j = this.getRandomInt(this.latencyMultiplier + 1, H - this.latencyMultiplier - 1);
    x = i * this.moveStepSize;
    y = j * this.moveStepSize;
    if (this.battleground[x][y] === this.BG_EMPTY) {
      found = true;
    }
    iter++;
  } while (!found && iter < 100);


  point = [x, y];

  return point;
};

BotSocket.prototype.debugDesiredPoint = function() {
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

  if (this.desiredPoint){
    this.dpDebug.style.left = this.desiredPoint[0] + 'px';
    this.dpDebug.style.top = this.desiredPoint[1] + 'px';
  }
};

BotSocket.prototype.addDebugPoint = function(x, y, mark) {
  var pDebug = document.createElement('div');
  pDebug.style.position = 'absolute';
  pDebug.style.width = '5px';
  pDebug.style.height = '5px';
  pDebug.innerHTML = mark;
  pDebug.style.top = (y - 4) + 'px';
  pDebug.style.left = (x - 4) + 'px';
  document.getElementById('game-container').appendChild(pDebug);
};
