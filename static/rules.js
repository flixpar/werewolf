var nplayersSelect = document.getElementById("nplayers");
var prevnroles = parseInt(nplayersSelect.value)+3;

var allRoles = [
	"werewolf",
	"minion",
	"seer",
	"robber",
	"drunk",
	"insomniac"
];

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
