const url = new URL(location.href);
const roomid = url.searchParams.get("roomid");
console.log(roomid);

if (roomid != null) {
	document.getElementById("roomid-field").value = roomid;
}
