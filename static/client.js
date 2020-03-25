console.log("Client started");

var role;
var gameinfo;

var userid = document.getElementById("userid").dataset.userid;
console.log("User ID: ".concat(userid));

mainArea = document.getElementById("main");

var generalSocket = io();
var playerSocket = io("/".concat(userid));

generalSocket.emit("loaded");

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
		generalSocket.emit("ready");
	};
	mainArea.appendChild(readyButton);
});

generalSocket.on("start", _ => {
	console.log("Game starting");
	mainArea.innerHTML = "";
	mainArea.innerHTML = "Game starting...";
});
