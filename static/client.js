console.log("Client started");

var role;
var userid = document.getElementById("userid").dataset.userid;
console.log("User ID: ".concat(userid));

mainArea = document.getElementById("main");

var generalSocket = io();
var playerSocket = io("/".concat(userid));

generalSocket.on("start", _ => {
	console.log("Game starting");
	mainArea.innerHTML = "";
	mainArea.innerHTML = "Your role is: ".concat(role);
});

playerSocket.on("distributeRole", roleResponse => {
	console.log(roleResponse);
	role = roleResponse.role;
});
