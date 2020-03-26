var nplayersSelect = document.getElementById("nplayers");
var prevnroles = parseInt(nplayersSelect.value)+3;

const allRoles = [
	"werewolf",
	"minion",
	"seer",
	"robber",
	"drunk",
	"insomniac",
	"villager",
];

const defaults = {
	4: ["werewolf", "werewolf", "minion", "seer", "robber", "drunk", "insomniac"],
	5: ["werewolf", "werewolf", "minion", "seer", "robber", "drunk", "insomniac", "villager"],
	6: ["werewolf", "werewolf", "minion", "seer", "robber", "drunk", "insomniac", "villager", "villager"],
};

for (var i = 1; i <= prevnroles; i++) {
	createRoleSelect(i);
}

nplayersSelect.addEventListener("change", _ => {
	var nroles = parseInt(nplayersSelect.value)+3;
	console.log("Going from ".concat(prevnroles, " to ", nroles));

	if (nroles > prevnroles) {
		for (var i = prevnroles+1; i <= nroles; i++) {
			createRoleSelect(i);
		}
	} else if (nroles < prevnroles) {
		for (var i = prevnroles; i > nroles; i--) {
			document.getElementById("role-select-".concat(i)).remove();
		}
	}

	prevnroles = nroles;
});

function createRoleSelect(n) {

	var d = document.createElement("div");
	d.id = "role-select-container-".concat(n);
	d.className = "role-select-container";
	document.getElementById("role-select-area").appendChild(d);

	var p = document.createElement("p");
	p.innerHTML = "Role ".concat(n);
	d.appendChild(p);

	var s = document.createElement("select");
	s.id = "role-select-".concat(n);
	s.name = "role-select-".concat(n);
	d.appendChild(s);

	var br = document.createElement("br");
	d.appendChild(br);

	allRoles.forEach(role => {
		var option = document.createElement("option");
		option.value = role;
		option.innerHTML = role;
		s.appendChild(option);
	});

}

document.getElementById("set-defaults").addEventListener("click", _ => {
	var nplayers = parseInt(nplayersSelect.value);
	var defaultList = defaults[nplayers];
	if (defaultList != null) {
		for (var i = 0; i < nplayers+3; i++) {
			document.getElementById("role-select-".concat(i+1)).value = defaultList[i];
		}
	}
});
