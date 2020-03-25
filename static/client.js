console.log("Client started");

var sentLoaded = false;

var role;
var gameinfo;

var userid = document.getElementById("data-element").dataset.userid;
var username = document.getElementById("data-element").dataset.username;
console.log("User ID: ".concat(userid));
console.log("User name: ".concat(username));

mainArea = document.getElementById("main");

var generalSocket = io();
var playerSocket = io("/".concat(userid));

generalSocket.on("serverReady", _ => {
	if (!sentLoaded) {
		playerSocket.emit("loaded");
		sentLoaded = true;
	}
	console.log("sent loaded");
});

generalSocket.on("gameinfo", gameinfoResponse => {
	console.log(gameinfoResponse);
	gameinfo = gameinfoResponse;
});

playerSocket.on("distributeRole", roleResponse => {
	console.log(roleResponse);
	role = roleResponse.role;

	mainArea.innerHTML = "";

	var roleElement = document.createElement("p");
	roleElement.id = "role-display";
	roleElement.innerHTML = "Your role is: ".concat(role);
	mainArea.appendChild(roleElement);

	var readyButton = document.createElement("button");
	readyButton.id = "ready-button";
	readyButton.innerHTML = "Ready";
	readyButton.onclick = _ => {
		playerSocket.emit("ready");
	};
	mainArea.appendChild(readyButton);
});

generalSocket.on("start", _ => {
	console.log("Game starting");
	mainArea.innerHTML = "";
	mainArea.innerHTML = "<p>Game starting...</p>";
});

function turnStart(turnRole, turnInstruction) {
	console.log("Turn: ".concat(turnRole));
	mainArea.innerHTML = "";

	var turnElement = document.createElement("p");
	turnElement.id = "turn-display";
	turnElement.innerHTML = "Turn: ".concat(turnRole);
	mainArea.appendChild(turnElement);

	var message;
	if (role == turnRole) {
		message = "It's your turn! ".concat(turnInstruction);
	} else {
		message = "It's not your turn. Keep sleeping.";
	}

	var turnInfoElement = document.createElement("p");
	turnInfoElement.id = "turn-info-message";
	turnInfoElement.innerHTML = message;
	mainArea.appendChild(turnInfoElement);
}

function createReadyButton(eventName) {
	var readyButton = document.createElement("button");
	readyButton.id = "ready-button";
	readyButton.innerHTML = "Continue";
	readyButton.onclick = _ => {
		playerSocket.emit(eventName);
	};
	mainArea.appendChild(readyButton);
}

generalSocket.on("werewolfTurnStart", _ => {
	turnStart("werewolf", "Acknowledge the other werewolf if there is one.");
});

playerSocket.on("werewolfNames", names => {
	var s = "";
	for (var i = 0; i < names.length; i++) {
		s = s.concat(names[i]);
		if (i < names.length-1) {
			s = s.concat(", ");
		}
	}

	var werewolfListElement = document.createElement("p");
	werewolfListElement.id = "werewolf-list";
	werewolfListElement.innerHTML = "The werewolves are: ".concat(s);
	mainArea.appendChild(werewolfListElement);

	createReadyButton("werewolfAck");
});

generalSocket.on("minionTurnStart", _ => {
	turnStart("minion", "Check who the werewolves are.");
});

playerSocket.on("minionNames", names => {
	var s = "";
	for (var i = 0; i < names.length; i++) {
		s = s.concat(names[i]);
		if (i < names.length-1) {
			s = s.concat(", ");
		}
	}

	var werewolfListElement = document.createElement("p");
	werewolfListElement.id = "werewolf-list";
	werewolfListElement.innerHTML = "The werewolves are: ".concat(s);
	mainArea.appendChild(werewolfListElement);

	var readyButton = document.createElement("button");
	readyButton.id = "minion-ready-button";
	readyButton.innerHTML = "Continue";
	readyButton.onclick = _ => {
		playerSocket.emit("minionAck");
	};
	mainArea.appendChild(readyButton);
});
