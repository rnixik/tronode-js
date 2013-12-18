var gameWidth = 800;
var gameHeight = 600;
var myBike;
var bikes = [];
var gameContainer;
var myRoomId;
var rooms;

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
    if (data.state !== 'update'){
        console.log(data);
    }

    if (data.state === 'connected'){
        startGame();
    } else if (data.state === 'gameJoined'){
        gameContainer.innerHTML = '';
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
        document.getElementById('bike-example-name').innerHTML = myBike.name;
        bikeExample.style.display = 'block';


        document.getElementById('start-btn').style.display = 'block';

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
    } else if (data.state === 'endGame'){
        document.getElementById('winner-name').innerHTML = data.winnerBike.name;
        document.getElementById('winner-time').innerHTML = Math.round(data.time / 1000);
        document.getElementById('endgame-container').style.display = 'block';

        bikes = [];
    } else if (data.state === 'newPlayer'){
        var bike = new Bike(data.bike.number);
        bike.allocate(gameContainer);
        bike.setData(data.bike);
        bikes.push(bike);
    } else if (data.state === 'update-rooms'){
        rooms = data.rooms;
        updateRoomsList();
    } else if (data.state === 'change-room'){
        myRoomId = data.room.id;
        updateRoomsList();
    }

});

function updateRoomsList() {
    var roomTpl = document.getElementById('room-tpl').innerHTML;
    var container = document.getElementById('rooms');
    var template = new EJS({text: roomTpl});
    container.innerHTML = template.render({'rooms': rooms, 'myRoomId': myRoomId});
}

function startGame() {
    gameContainer = document.getElementById('game-container');
    var body = document.getElementsByTagName('body')[0];
    bindEvents(body);

    document.getElementById('join-btn').onclick = join;
    document.getElementById('reset').onclick = reset;
    document.getElementById('start-btn').onclick = function(){
        if (myBike){
            socket.emit('control', {'button': 'start'});
            document.getElementById('start-btn').style.display = 'none';
        }
    };

    document.getElementById('join-room-btn').onclick = joinRoom;
    document.getElementById('create-room-btn').onclick = createRoom;
}

function joinRoom(){
    var checked = document.querySelector('.room-option:checked');
    if (checked) {
        var roomId = checked.value;
        socket.emit('control', {'button': 'join-room', 'roomId': roomId});
    }
}

function createRoom(){
    var roomName = document.getElementById('join-room-name').value;
    if (roomName) {
        socket.emit('control', {'button': 'create-room', 'name': roomName});
        document.getElementById('create-room-container').style.display = 'none';
    }
}

function join(){
    var joinName = document.getElementById('join-name').value;
    if (joinName) {
        socket.emit('control', {'button': 'join', 'name': joinName});
        document.getElementById('join-container').style.display = 'none';
    }
}

function reset() {
    gameContainer.innerHTML = '';
    for (var b in bikes){
        var bike = bikes[b];
        bike.allocate(gameContainer);
        bike.createHtml();
        bike.updateHtml();
    }

    document.getElementById('endgame-container').style.display = 'none';
    join();
}

function bindEvents(container) {
    container.onkeydown = function(e) {
        if (!myBike){
            return;
        }
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
