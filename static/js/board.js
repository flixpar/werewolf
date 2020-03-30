function setupBoard(gameinfo) {

	let board = document.getElementById("board");
	let row1 = document.getElementById("board-row-1");
	let row2 = document.getElementById("board-row-2");
	let row3 = document.getElementById("board-row-3");

	for (let i = 0; i < Math.floor(gameinfo.nusers/2); i++) {
		let card = createCard(i, gameinfo["usernames"][i], "top");
		row1.appendChild(card);
	}
	for (let i = 0; i < 3; i++) {
		let card = createCard("center-".concat(i), String(i+1), "none");
		row2.appendChild(card);
	}
	for (let i = Math.floor(gameinfo.nusers/2); i < gameinfo.nusers; i++) {
		let card = createCard(i, gameinfo["usernames"][i], "bottom");
		row3.appendChild(card);
	}

	boardHideAll()
}

function boardDisplayRole(uname, role) {
	let cardImg = document.querySelector("[data-username='" + uname + "'] .card-img");
	cardImg.src = getRoleImgURL(role);
}

function boardHideAll() {
	document.querySelectorAll(".card-img").forEach(img => {img.src = getRoleImgURL("back");});
}

function boardHideRole(uname) {
	let cardImg = document.querySelector("[data-username='" + uname + "'] .card-img");
	cardImg.src = getRoleImgURL("back");
}

function createCard(cardId, username, namePosition) {
	let cardWrapper = document.createElement("div");
	cardWrapper.id = "cardwrapper-".concat(cardId);
	cardWrapper.className = "card-wrapper";
	cardWrapper.dataset.username = username;

	let usernameElement = document.createElement("span");
	usernameElement.className = "card-username";
	usernameElement.innerHTML = username;

	let card = document.createElement("div");
	card.id = "card-".concat(cardId);
	card.className = "card";

	let cardImg = document.createElement("img");
	cardImg.id = "card-img-".concat(cardId);
	cardImg.className = "card-img";
	card.appendChild(cardImg);

	if (namePosition === "top") {
		cardWrapper.appendChild(usernameElement);
		cardWrapper.appendChild(card);
	} else if (namePosition === "bottom") {
		cardWrapper.appendChild(card);
		cardWrapper.appendChild(usernameElement);
	} else {
		cardWrapper.appendChild(card);
	}

	return cardWrapper;
}

function getRoleImgURL(role) {
	switch (role) {
		case "werewolf":
			return "/static/img/werewolf.png";
		case "minion":
			return "/static/img/minion.png";
		case "seer":
			return "/static/img/seer.png";
		case "robber":
			return "/static/img/robber.png";
		case "drunk":
			return "/static/img/drunk.png";
		case "insomniac":
			return "/static/img/insomniac.png";
		case "villager":
			return "/static/img/villager.png";
		case "back":
			return "/static/img/back.png";
		default:
			return "/static/img/back.png"
	}
}
