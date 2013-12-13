var gameWidth = 800;
var gameHeight = 600;
var myBike;
var mainLoopInterval = 100;
var bikes = [];
var gameContainer;

var keyUp = 38;
var keyW = 87;
var keyRight = 39;
var keyD = 68;
var keyDown = 40;
var keyS = 83;
var keyLeft = 37;
var keyA = 65;


var socket = io.connect(document.location);
socket.on('state', function(data) {
    //console.log(data);
    if (data.state === 'connected'){
        startGame();
        for (var b in data.existedBikes){
            var bikeData = data.existedBikes[b];
            var bike = new Bike(bikeData.number);
            bike.allocate(gameContainer);
            bike.setData(bikeData);
            bikes.push(bike);
        }
    } else if (data.state === 'addBike'){
        myBike = new Bike(data.bike.number);
        myBike.allocate(gameContainer);
        myBike.setData(data.bike);
        bikes.push(myBike);

        var bikeExample = document.getElementById('bike-example');
        bikeExample.className = 'bike-' + myBike.number;
        bikeExample.style.display = 'block';
    } else if (data.state === 'update'){
        for (var lb in bikes){
            var localBike = bikes[lb];
            for (var b in data.bikes){
                var bike = data.bikes[b];
                if (bike.number === localBike.number){
                    localBike.setData(bike);
                    localBike.move(10);
                }
            }
        }
    }

});

socket.on('newPlayer', function(data){
    var bike = new Bike(data.bike.number);
    bike.allocate(gameContainer);
    bike.setData(data.bike);
    bikes.push(bike);
});


function startGame() {
    gameContainer = document.getElementById('game-container');
    var body = document.getElementsByTagName('body')[0];
    bindEvents(body);

    document.getElementById('join-btn').onclick = function(){
        var joinName = document.getElementById('join-name').value;
        console.log(joinName);
        if (joinName) {
            socket.emit('control', {'button': 'join', 'name': joinName});
        }
    };
}

function bindEvents(container) {
    container.onkeydown = function(e) {
        e = e || window.event;
        switch (e.keyCode) {
            case keyUp:
            case keyW:
                break;
            case keyRight:
            case keyD:
                myBike.turnRight();
                socket.emit('control', {'button': 'right'});
                break;
            case keyDown:
            case keyS:
                break;
            case keyLeft:
            case keyA:
                myBike.turnLeft();
                socket.emit('control', {'button': 'left'});
                break;

        }
    };
}
