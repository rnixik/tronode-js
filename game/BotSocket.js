function BotSocket(game) {
    this.game = game;

    this.id = 'bot-' + Math.floor((1 + Math.random()) * 0x10000);

    this.myBike = null;
    this.bikes = [];

    this.battleground = {};

    this.BG_OCCUPIED = 1;
    this.BG_EMPTY = 0;

    this.botName = this.id;
}

BotSocket.prototype.emit = function(event, data) {
    if (event !== 'state') {
        return;
    }
    switch (data.state) {
        case 'addBike':
            this.initializeBattleground();
            this.myBike = data.bike;
            this.bikes.push(this.myBike);
            this.occupy(this.myBike.x, this.myBike.y);
        break;
        case 'newPlayer':
            this.bikes.push(data.bike);
            this.occupy(data.bike.x, this.myBike.y);
        break;
        case 'restart':
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
                    this.occupy(bike.x, bike.y);
                }
            }
        break;
        case 'update':
            for (var lb in this.bikes) {
                var localBike = this.bikes[lb];
                for (var b in data.bikes){
                    var bike = data.bikes[b];
                    if (bike.number === localBike.number) {
                        localBike = bike;
                        this.occupy(bike.x, bike.y);
                    }
                }
            }
            if (!this.myBike.collided) {
                this.update();
            }

        break;
    }
};

BotSocket.prototype.control = function(data) {
    if (this.game) {
        this.game.onControl(this, data);
        console.log(this.id + ' : ' + data.button);
    }
};

BotSocket.prototype.initializeBattleground = function() {
    var x, y;
     this.battleground = {};
    for (x = 0; x <= this.game.gameWidth; x += this.game.moveStepSize) {
        this.battleground[x] = {};
        for (y = 0; y <= this.gameHeight; y += this.game.moveStepSize) {
            this.battleground[x][y] = this.BG_EMPTY;

            if (x === 0 || x === this.game.gameWidth || y === 0 || y === this.gameHeight) {
                this.battleground[x][y] = this.BG_OCCUPIED;
            }
        }
    }
};

BotSocket.prototype.occupy = function (x, y) {
    this.battleground[x][y] = this.BG_OCCUPIED;
};

BotSocket.prototype.start = function() {
    this.game.onControl(this, {'button': 'joinBattle', 'name': this.botName});
};

BotSocket.prototype.update = function() {
    var r = Math.random();
    if (r > 0.95) {
        this.control({'button': 'right'});
    } else if (r > 0.90) {
        this.control({'button': 'left'});
    }
};



if (typeof exports === 'object') {
    exports.BotSocket = BotSocket;
}
