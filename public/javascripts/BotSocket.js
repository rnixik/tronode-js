function BotSocket(gameParameters) {
  this.game = null;
  this.clientSocket = null;

  if (typeof gameParameters.onControl === 'function') {
    this.game = gameParameters;
  } else {
    this.clientSocket = gameParameters.socket;
  }

  this.moveStepSize = gameParameters.moveStepSize;
  this.gameWidth = gameParameters.gameWidth;
  this.gameHeight = gameParameters.gameHeight;
  this.serverMainLoopInterval = gameParameters.mainLoopInterval;
  

  this.id = 'bot-' + Math.floor((1 + Math.random()) * 0x10000);

  this.myBike = null;
  this.bikes = [];

  this.battleground = {};

  this.BG_OCCUPIED = -1;
  this.BG_EMPTY = -2;

  this.botName = this.id;

  this.movements = 0;
  this.desiredPoint = null;
  this.updDestinationInterval = 5;
}



/* ----- Block with states ----- */

BotSocket.prototype.emit = function(event, data) {
  if (event !== 'state') {
    return;
  }

  var methodName = 'on' + data.state.charAt(0).toUpperCase() + data.state.slice(1);
  if (typeof this[methodName] === 'function') {
    this[methodName](data);
  }
};

BotSocket.prototype.onAddBike = function(data) {
  this.initializeBattleground();
  this.myBike = data.bike;
  this.bikes.push(this.myBike);
  this.occupy(this.myBike.x, this.myBike.y);
};

BotSocket.prototype.onNewPlayer = function(data) {
  this.bikes.push(data.bike);
  this.occupy(data.bike.x, this.myBike.y);
};

BotSocket.prototype.onRestart = function(data) {
  this.movements = 0;
  this.nextBikeDirection = null;
  this.desiredPoint = null;
  this.initializeBattleground();

  var myBikeNumber = null;
  if (this.myBike) {
    myBikeNumber = this.myBike.number;
  }
  this.bikes = [];
  for (var b in data.bikes){
    var bike = data.bikes[b];
    this.bikes.push(bike);
    if (myBikeNumber && bike.number === myBikeNumber){
      this.myBike = bike;
    }
    this.occupy(bike.x, bike.y);
  }
};

BotSocket.prototype.onPing = function(data) {
  // nothing to do with data.latency;
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
      }
    }
  }
  if ( this.myBike && !this.myBike.collided && (prevX !== this.myBike.x || prevY !== this.myBike.y) ) {
    this.movements++;
    this.update();
  }
}


/* ----- end of block with states ----- */



BotSocket.prototype.control = function(data) {
  if (this.game) {
    this.game.onControl(this, data);
  } else {
    this.clientSocket.emit('control', data);
  }
  
};

BotSocket.prototype.initializeBattleground = function() {
  var x, y;
  this.battleground = {};
  for (x = 0; x <= this.gameWidth; x += this.moveStepSize) {
    this.battleground[x] = {};
    for (y = 0; y <= this.gameHeight; y += this.moveStepSize) {
      this.battleground[x][y] = this.BG_EMPTY;

      if (x === 0 || x === this.gameWidth || y === 0 || y === this.gameHeight) {
        this.battleground[x][y] = this.BG_OCCUPIED;
      }
    }
  }
};

BotSocket.prototype.occupy = function (x, y) {
  this.battleground[x][y] = this.BG_OCCUPIED;
};

BotSocket.prototype.start = function() {
  if (this.game) {
    this.game.onControl(this, {'button': 'joinBattle', 'name': this.botName});
  }
};

BotSocket.prototype.update = function() {
  var destination;
  var updDestinationInterval = 1;
  if (!this.desiredPoint || this.movements % this.updDestinationInterval === 0) {
    this.desiredPoint = this.getDesiredPoint();
  }

  if ( Math.pow(this.desiredPoint[0] - this.myBike.x, 2) + Math.pow(this.desiredPoint[1] - this.myBike.y, 2) < Math.pow(this.moveStepSize, 2)) {
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

BotSocket.prototype.getDesiredPointHeadhunter = function() {
  var dx = [1, 0, -1, 0];
  var dy = [0, 1, 0, -1];
  var i, k;
  var possibilies = [];
  

  this.updDestinationInterval = 1;

  for (var b in this.bikes) {
    var bike = this.bikes[b];
    var bikePossibilities = [];
    if (!bike.collided && bike.number !== this.myBike.number) {
      var pos = [bike.x, bike.y];
      var dirVector = [0, 0];
      switch (bike.direction) {
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

      for (i=1; i<=3; i++) {
        var p = [
          pos[0] + i * this.moveStepSize * dirVector[0], 
          pos[1] + i * this.moveStepSize * dirVector[1]
        ];
        bikePossibilities.push(p);
        possibilies.push(p);
      }
      
      var len = bikePossibilities.length;
      var possibility;
      for (i = 0; i < len; i++) {
        for (k = 0; k < 4; k++) {
          possibility = [bikePossibilities[i][0], bikePossibilities[i][1]];
          possibility[0] += dx[k] * this.moveStepSize;
          possibility[1] += dy[k] * this.moveStepSize;
          possibilies.push(possibility);
        }
      }
    }
  }


  var filteredPossibilies = [];
  for (i in possibilies) {
    if (typeof this.battleground[possibilies[i][0]] !== 'undefined' 
      &&  typeof this.battleground[possibilies[i][0]][possibilies[i][1]] === 'number' 
      && this.battleground[possibilies[i][0]][possibilies[i][1]] === this.BG_EMPTY) {
      filteredPossibilies.push(possibilies[i]);
    }
  }

  if (filteredPossibilies.length) {
    var index = this.getRandomInt(0, filteredPossibilies.length);
    return filteredPossibilies[index];
  }
  
};

BotSocket.prototype.getDesiredPoint = function() {
  var point = [];

  point = this.getDesiredPointHeadhunter();
  if (point) {
    return point;
  }
  
  this.updDestinationInterval = 80;
  
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

BotSocket.prototype.getRandomInt = function(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
};

BotSocket.prototype.algorithmLee = function(start, end) {
  var grid = {};
  var x, y;
  var H = Object.keys(this.battleground[0]).length;
  var W = Object.keys(this.battleground).length;

  var i, j;
  x = 0;
  for (i in this.battleground) {
    y = 0;
    grid[x] = {};
    for (j in this.battleground[i]) {
      grid[x][y] = this.battleground[i][j];
      y++;
    }
    x++;
  }
  W = x - 1;
  H = y - 1;

  var steps = this.moveStepSize;
  var ax = start[0] / steps;
  var ay = start[1] / steps;
  var bx = end[0] / steps;
  var by = end[1] / steps;

  var dx = [1, 0, -1, 0];
  var dy = [0, 1, 0, -1];
  var d, k;
  var stop;
  var len;

  // 1. Initialisation
  d = 0;
  grid[ax][ay] = 0;

  // 2. Wave expansion
  do {
  stop = true;
  for ( x = 1; x < W - 1; ++x ) {
    for ( y = 1; y < H - 1; ++y ) {
    if ( grid[x][y] == d ) {
      for ( k = 0; k < 4; k++ ) {

        try {
          if ( grid[x + dx[k]][y + dy[k]] === this.BG_EMPTY ) {
            stop = false;
            grid[x + dx[k]][y + dy[k]] = d + 1;
          }
        } catch (e) {
          console.log(x + dx[k], e);
        }
      }
    }
    }
  }
  d++;
  } while ( !stop && grid[bx][by] === this.BG_EMPTY );

  if (grid[bx][by] === this.BG_EMPTY) {
    return false;
  }

  // 3. Backtrace
  len = grid[bx][by];
  x = bx;
  y = by;
  d = len;
  var path = [];
  while ( d > 0 ) {
  path[d] = [x, y];
  d--;
  for (k = 0; k < 4; k++)
    if (grid[x + dx[k]][y + dy[k]] == d)
    {
    x = x + dx[k];
    y = y + dy[k];
    break;
    }
  }

  path[0] = [ax, ay];

  for (i in path) {
  path[i] = [path[i][0] * steps, path[i][1] * steps];
  }

  return path;
};


if (typeof exports === 'object') {
  exports.BotSocket = BotSocket;
}
