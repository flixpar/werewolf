console.log("Client started");

var sentLoaded = false;
var hasVoted = false;

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

	createReadyButton("ready", "Ready");
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

function createReadyButton(eventName, buttonText="Continue") {
	var readyButton = document.createElement("button");
	readyButton.id = "ready-button";
	readyButton.innerHTML = buttonText;
	readyButton.onclick = _ => {
		playerSocket.emit(eventName);
		readyButton.remove();
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

	createReadyButton("minionAck");
});

generalSocket.on("seerTurnStart", _ => {
	turnStart("seer", "Pick a player or two center cards to see their role.");
	if (role == "seer") {
		seerRequest();
	}
});

function seerRequest() {
	var seerSelect = document.createElement("select");
	seerSelect.id = "seer-select";
	mainArea.appendChild(seerSelect);

	gameinfo.usernames.forEach(name => {
		if (name != username) {
			var option = document.createElement("option");
			option.innerHTML = name;
			seerSelect.appendChild(option);
		}
	});

	var seerRequestButton = document.createElement("button");
	seerRequestButton.id = "seer-request-button";
	seerRequestButton.innerHTML = "Check role";
	seerRequestButton.onclick = _ => {
		console.log("Checking: ".concat(seerSelect.value));
		playerSocket.emit("seerRequest", [seerSelect.value,]);

		seerSelect.remove();
		seerRequestButton.remove();
	};
	mainArea.appendChild(seerRequestButton);
}

playerSocket.on("seerResponse", seenRoles => {

	console.log("got seer response");
	console.log(seenRoles);

	var seerTableTitle = document.createElement("p");
	seerTableTitle.id = "seer-table-title";
	seerTableTitle.innerHTML = "Seen roles:";
	mainArea.appendChild(seerTableTitle);

	var seerResponseTable = document.createElement("table");
	seerResponseTable.id = "seer-response-table";
	mainArea.appendChild(seerResponseTable);

	var header = document.createElement("tr");
	seerResponseTable.appendChild(header);
	nameHeader = document.createElement("th");
	roleHeader = document.createElement("th");
	nameHeader.innerHTML = "Name";
	roleHeader.innerHTML = "Role";
	header.appendChild(nameHeader);
	header.appendChild(roleHeader);

	for (const name in seenRoles) {
		var row = document.createElement("tr");
		var nameElement = document.createElement("td");
		var roleElement = document.createElement("td");
		nameElement.innerHTML = name;
		roleElement.innerHTML = seenRoles[name];
		row.appendChild(nameElement);
		row.appendChild(roleElement);
		seerResponseTable.appendChild(row);
	}

	createReadyButton("seerAck");
});

generalSocket.on("robberTurnStart", _ => {
	turnStart("robber", "Swap your role with another player's role.");
	if (role == "robber") {
		robberRequest();
	}
});

function robberRequest() {
	var robberSelect = document.createElement("select");
	robberSelect.id = "robber-select";
	mainArea.appendChild(robberSelect);

	gameinfo.usernames.forEach(name => {
		if (name != username) {
			var option = document.createElement("option");
			option.innerHTML = name;
			robberSelect.appendChild(option);
		}
	});

	var robberRequestButton = document.createElement("button");
	robberRequestButton.id = "robber-request-button";
	robberRequestButton.innerHTML = "Swap";
	robberRequestButton.onclick = _ => {
		console.log("Swapping with: ".concat(robberSelect.value));
		playerSocket.emit("robberRequest", robberSelect.value);

		robberSelect.remove();
		robberRequestButton.remove();
	};
	mainArea.appendChild(robberRequestButton);
}

playerSocket.on("robberResponse", newRole => {
	console.log("got robber response");
	console.log(newRole);

	var newRoleElement = document.createElement("p");
	newRoleElement.id = "new-role";
	newRoleElement.innerHTML = "Your new role is: ".concat(newRole);
	mainArea.appendChild(newRoleElement);

	createReadyButton("robberAck");
});

generalSocket.on("drunkTurnStart", _ => {
	turnStart("drunk", "Swap your role with one in the middle.");
	if (role == "drunk") {
		drunkRequest();
	}
});

function drunkRequest() {
	var drunkSelect = document.createElement("select");
	drunkSelect.id = "drunk-select";
	mainArea.appendChild(drunkSelect);

	for (var i = 1; i <= 3; i++) {
		var option = document.createElement("option");
		option.innerHTML = i;
		drunkSelect.appendChild(option);
	}

	var drunkRequestButton = document.createElement("button");
	drunkRequestButton.id = "drunk-request-button";
	drunkRequestButton.innerHTML = "Swap";
	drunkRequestButton.onclick = _ => {
		console.log("Swapping with: ".concat(drunkSelect.value));
		playerSocket.emit("drunkRequest", drunkSelect.value);

		drunkSelect.remove();
		drunkRequestButton.remove();
	};
	mainArea.appendChild(drunkRequestButton);
}

generalSocket.on("insomniacTurnStart", _ => {
	turnStart("insomniac", "Check your current role.");
});

playerSocket.on("insomniacRole", newRole => {
	console.log("got insomniac response");
	console.log(newRole);

	var newRoleElement = document.createElement("p");
	newRoleElement.id = "new-role";
	newRoleElement.innerHTML = "Your new role is: ".concat(newRole);
	mainArea.appendChild(newRoleElement);

	createReadyButton("insomniacAck");
});

generalSocket.on("startDay", _ => {
	console.log("day");
	mainArea.innerHTML = "";

	var timer = document.createElement("p");
	timer.id = "timer";
	mainArea.appendChild(timer);

	var el1 = document.createElement("p");
	el1.innerHTML = "Vote:";
	mainArea.appendChild(el1);

	var voteSelect = document.createElement("select");
	voteSelect.id = "vote-select";
	mainArea.appendChild(voteSelect);
	gameinfo.usernames.forEach(name => {
		var option = document.createElement("option");
		option.innerHTML = name;
		voteSelect.appendChild(option);
	});

	var voteButton = document.createElement("button");
	voteButton.id = "vote-button";
	voteButton.innerHTML = "Vote";
	voteButton.onclick = _ => {
		console.log("Voting for: ".concat(voteSelect.value));
		playerSocket.emit("vote", voteSelect.value);

		voteSelect.remove();
		voteButton.remove();
		el1.remove();
		hasVoted = true;
	};
	mainArea.appendChild(voteButton);

	var endTime = new Date();
	endTime.setSeconds(endTime.getSeconds() + gameinfo.daytime);
	var countdown = setInterval(function() {
		var now = new Date().getTime();
		var distance = endTime - now;

		var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		var seconds = Math.floor((distance % (1000 * 60)) / 1000);

		timer.innerHTML = "Time left: " + minutes + "m " + seconds + "s ";

		if (distance < 0) {
			clearInterval(countdown);
			timer.remove();
			if (!hasVoted) {
				console.log("no vote");
				playerSocket.emit("vote", "none");
				voteSelect.remove();
				voteButton.remove();
				el1.remove();
				hasVoted = true;
			}
		}
	}, 250);
});

generalSocket.on("gameover", gameOverInfo => {

	console.log("game over!");
	console.log(gameOverInfo);

	if (document.getElementById("timer") != null) {
		document.getElementById("timer").remove();
	}

	var finalRole = gameOverInfo.finalRoles[username];

	var winStatusElement = document.createElement("p");
	winStatusElement.id = "win-status";
	mainArea.appendChild(winStatusElement);

	var message = "";
	message += (gameOverInfo.winningTeam == "werewolf") ? "Werewolf team wins!<br>" : "Villager team wins!<br>";
	message += "Your role was: ".concat(finalRole, "<br>");
	message += wonGame(finalRole, gameOverInfo.winningTeam) ? "You won!" : "You lost.";

	winStatusElement.innerHTML = message;

	var tableTitle = document.createElement("p");
	tableTitle.id = "roles-table-title";
	tableTitle.innerHTML = "Final Roles";
	mainArea.appendChild(tableTitle);

	var finalRolesTable = document.createElement("table");
	finalRolesTable.id = "final-roles-table";
	mainArea.appendChild(finalRolesTable);

	var header = document.createElement("tr");
	finalRolesTable.appendChild(header);
	nameHeader = document.createElement("th");
	startRoleHeader = document.createElement("th");
	finalRoleHeader = document.createElement("th");
	wonHeader = document.createElement("th");
	nameHeader.innerHTML = "Name";
	startRoleHeader.innerHTML = "Start Role";
	finalRoleHeader.innerHTML = "End Role";
	wonHeader.innerHTML = "Won?";
	header.appendChild(nameHeader);
	header.appendChild(startRoleHeader);
	header.appendChild(finalRoleHeader);
	header.appendChild(wonHeader);

	for (const name in gameOverInfo.finalRoles) {
		var row = document.createElement("tr");

		var nameElement = document.createElement("td");
		var startRoleElement = document.createElement("td");
		var finalRoleElement = document.createElement("td");
		var wonElement = document.createElement("td");

		nameElement.innerHTML = name;
		startRoleElement.innerHTML = gameOverInfo.finalRoles[name];
		finalRoleElement.innerHTML = gameOverInfo.startRoles[name];
		wonElement.innerHTML = wonGame(gameOverInfo.finalRoles[name], gameOverInfo.winningTeam) ? "True" : "False";

		row.appendChild(nameElement);
		row.appendChild(startRoleElement);
		row.appendChild(finalRoleElement);
		row.appendChild(wonElement);

		finalRolesTable.appendChild(row);
	}

	var resetForm = document.createElement("form");
	resetForm.action = "/reset";
	resetForm.method = "POST";
	mainArea.appendChild(resetForm);

	var resetButton = document.createElement("button");
	resetButton.name = "submit";
	resetButton.innerHTML = "New Game";
	resetForm.appendChild(resetButton);

});

function wonGame(finalRole, winningTeam) {
	if (winningTeam == "werewolf") {
		switch (finalRole) {
			case "werewolf":
				return true;
			case "minion":
				return true;
			default:
				return false;
		}
	} else {
		switch (finalRole) {
			case "werewolf":
				return false;
			case "minion":
				return false;
			default:
				return true;
		}
	}
}
