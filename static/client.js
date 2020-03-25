console.log("Client started");

var sentLoaded = false;

var role;
var gameinfo;

var userid = document.getElementById("userid").dataset.userid;
console.log("User ID: ".concat(userid));

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

generalSocket.on("werewolfTurnStart", _ => {
	console.log("Werewolf turn");
	mainArea.innerHTML = "";

	var turnElement = document.createElement("p");
	turnElement.id = "turn-display";
	turnElement.innerHTML = "Turn: Werewolves";
	mainArea.appendChild(turnElement);

	var message;
	if (role == "werewolf") {
		message = "It's your turn! Acknowledge the other werewolf if there is one.";
	} else {
		message = "It's not your turn. Keep sleeping.";
	}

	var turnInfoElement = document.createElement("p");
	turnInfoElement.id = "turn-info-message";
	turnInfoElement.innerHTML = message;
	mainArea.appendChild(turnInfoElement);
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

	var readyButton = document.createElement("button");
	readyButton.id = "werewolf-ready-button";
	readyButton.innerHTML = "Continue";
	readyButton.onclick = _ => {
		playerSocket.emit("werewolfAck");
	};
	mainArea.appendChild(readyButton);
});

generalSocket.on("minionTurnStart", _ => {
	console.log("Minion turn");
	mainArea.innerHTML = "";

	var turnElement = document.createElement("p");
	turnElement.id = "turn-display";
	turnElement.innerHTML = "Turn: Minion";
	mainArea.appendChild(turnElement);

	var message;
	if (role == "minion") {
		message = "It's your turn! Check who the werewolves are.";
	} else {
		message = "It's not your turn. Keep sleeping.";
	}

	var turnInfoElement = document.createElement("p");
	turnInfoElement.id = "turn-info-message";
	turnInfoElement.innerHTML = message;
	mainArea.appendChild(turnInfoElement);
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
