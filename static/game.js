console.log("Client started");

var sentLoaded = false;
var hasVoted = false;

var role;
var gameinfo;

var userid = document.getElementById("data-element").dataset.userid;
var username = document.getElementById("data-element").dataset.username;
var roomid = document.getElementById("data-element").dataset.roomid;
console.log("User ID: ".concat(userid));
console.log("User name: ".concat(username));

mainArea = document.getElementById("main");

var generalSocket = io();
var playerSocket = io("".concat("/", userid));

generalSocket.emit("joinRoom", roomid);

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
	setupBoard(gameinfo);
});

generalSocket.on("distributeRole", roleResponse => {
	console.log(roleResponse);
	role = roleResponse.role;

	mainArea.innerHTML = "";

	var roleElement = document.createElement("p");
	roleElement.id = "role-display";
	roleElement.innerHTML = "Your role is: ".concat(role);
	mainArea.appendChild(roleElement);

	createReadyButton("ready", "Ready");

	boardDisplayRole(username, role);
});

generalSocket.on("start", _ => {
	console.log("Game starting");
	mainArea.innerHTML = "";
	mainArea.innerHTML = "<p>Game starting...</p>";
	boardHideAll();
});

function turnStart(turnRole, turnInstruction) {
	console.log("Turn: ".concat(turnRole));
	mainArea.innerHTML = "";
	boardHideAll();

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

	var turnTimer = document.createElement("p");
	turnTimer.id = "turn-timer";
	mainArea.appendChild(turnTimer);

	var endTime = new Date();
	endTime.setSeconds(endTime.getSeconds() + gameinfo.turntime);
	var countdown = setInterval(function() {
		var now = new Date().getTime();
		var distance = endTime - now;
		var seconds = Math.floor((distance % (1000 * 60)) / 1000);

		turnTimer.innerHTML = "Time left: " + seconds + "s";

		if (distance < 0) {
			clearInterval(countdown);
			turnTimer.remove();
		}
	}, 250);
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

generalSocket.on("werewolfNames", names => {
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

	names.forEach(name => {
		boardDisplayRole(name, "werewolf");
	});

	createReadyButton("werewolfAck");
});

generalSocket.on("loneWerewolf", _ => {
	var messageElement = document.createElement("p");
	messageElement.innerHTML = "You are a lone werewolf. You may look at one center card.";
	mainArea.appendChild(messageElement);

	boardDisplayRole(username, "werewolf");

	var centerSelect = makeSelect("center-select", ["1", "2", "3"]);
	mainArea.appendChild(centerSelect);

	var button = document.createElement("button");
	button.innerHTML = "Check";
	mainArea.appendChild(button);
	button.addEventListener("click", _ => {
		playerSocket.emit("loneWerewolfRequest", centerSelect.value);
		centerSelect.remove();
		button.remove();
	});
});

generalSocket.on("loneWerewolfResponse", response => {
	console.log(response);

	var messageElement = document.createElement("p");
	messageElement.innerHTML = "Center card " + response[0] + " role: " + response[1];
	mainArea.appendChild(messageElement);

	boardDisplayRole(response[0], response[1]);

	createReadyButton("werewolfAck");
});

generalSocket.on("minionTurnStart", _ => {
	turnStart("minion", "Check who the werewolves are.");
});

generalSocket.on("minionNames", names => {
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

	names.forEach(name => {
		boardDisplayRole(name, "werewolf");
	});

	createReadyButton("minionAck");
});

generalSocket.on("seerTurnStart", _ => {
	turnStart("seer", "Pick a player or two center cards to see their role.");
	if (role == "seer") {
		seerRequest();
	}
});

function seerRequest() {

	var seerModeSelect = makeSelect("seer-mode-select", ["Player", "Middle"]);
	mainArea.appendChild(seerModeSelect);

	var seerSelectDiv = document.createElement("div");
	mainArea.appendChild(seerSelectDiv);

	var playerOptions = gameinfo.usernames.filter(u => {return u != username});
	var seerSelect1, seerSelect2;
	var seerSelect = makeSelect("seer-select", playerOptions);
	seerSelectDiv.appendChild(seerSelect);

	seerModeSelect.addEventListener("change", _ => {
		if (seerSelect != null)  {seerSelect.remove();}
		if (seerSelect1 != null) {seerSelect1.remove();}
		if (seerSelect2 != null) {seerSelect2.remove();}

		if (seerModeSelect.value == "Player") {
			seerSelect = makeSelect("seer-select", playerOptions);
			seerSelectDiv.appendChild(seerSelect);
		} else {
			seerSelect1 = makeSelect("seer-select-1", ["1", "2", "3"]);
			seerSelect2 = makeSelect("seer-select-2", ["1", "2", "3"]);
			seerSelectDiv.appendChild(seerSelect1);
			seerSelectDiv.appendChild(seerSelect2);
		}
	});

	var seerRequestButton = document.createElement("button");
	seerRequestButton.id = "seer-request-button";
	seerRequestButton.innerHTML = "Check role";
	seerRequestButton.onclick = _ => {
		var selected;
		if (seerModeSelect.value == "Player") {
			selected = [seerSelect.value,]
		} else {
			selected = [seerSelect1.value, seerSelect2.value]
		}
		playerSocket.emit("seerRequest", selected);
		console.log("Checking: ".concat(selected));

		seerModeSelect.remove();
		if (seerSelect != null)  {seerSelect.remove();}
		if (seerSelect1 != null) {seerSelect1.remove();}
		if (seerSelect2 != null) {seerSelect2.remove();}
		seerRequestButton.remove();
	};
	mainArea.appendChild(seerRequestButton);
}

generalSocket.on("seerResponse", seenRoles => {

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

		boardDisplayRole(name, seenRoles[name]);
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

generalSocket.on("robberResponse", newRole => {
	console.log("got robber response");
	console.log(newRole);

	var newRoleElement = document.createElement("p");
	newRoleElement.id = "new-role";
	newRoleElement.innerHTML = "Your new role is: ".concat(newRole);
	mainArea.appendChild(newRoleElement);

	boardDisplayRole(username, newRole);

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

generalSocket.on("insomniacRole", newRole => {
	console.log("got insomniac response");
	console.log(newRole);

	var newRoleElement = document.createElement("p");
	newRoleElement.id = "new-role";
	newRoleElement.innerHTML = "Your new role is: ".concat(newRole);
	mainArea.appendChild(newRoleElement);

	boardDisplayRole(username, newRole);

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
				console.log("no vote -> self-vote");
				playerSocket.emit("vote", username);
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
		startRoleElement.innerHTML = gameOverInfo.startRoles[name];
		finalRoleElement.innerHTML = gameOverInfo.finalRoles[name];
		wonElement.innerHTML = wonGame(gameOverInfo.finalRoles[name], gameOverInfo.winningTeam) ? "True" : "False";

		row.appendChild(nameElement);
		row.appendChild(startRoleElement);
		row.appendChild(finalRoleElement);
		row.appendChild(wonElement);

		finalRolesTable.appendChild(row);

		boardDisplayRole(name, gameOverInfo.finalRoles[name]);
	}

	var resetForm = document.createElement("form");
	resetForm.action = "/restart/" + gameinfo["roomid"];
	resetForm.method = "POST";
	mainArea.appendChild(resetForm);

	var resetButton = document.createElement("button");
	resetButton.name = "submit";
	resetButton.innerHTML = "Play Again";
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

function makeSelect(name, options) {
	var selectElement = document.createElement("select");
	selectElement.id = name;

	options.forEach(optionName => {
		var option = document.createElement("option");
		option.value = optionName;
		option.innerHTML = optionName;
		selectElement.appendChild(option);
	});

	return selectElement;
}
