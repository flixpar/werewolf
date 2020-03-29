from flask import Flask
from flask import render_template, redirect, request, abort, session
from flask_socketio import SocketIO

import os
import uuid
import pandas as pd

app = Flask(__name__)
socketio = SocketIO(app)
app.secret_key = os.urandom(16).hex()

import game

rooms = {}

@app.route("/")
def handleMain():
	return render_template("index.html")

@app.route("/newgame", methods=["GET", "POST"])
def handleNewGame():
	if request.method == "GET":
		roomid = str(uuid.uuid4())[:8]
		return render_template("rules.html", roomid=roomid)
	else:
		roomid = request.form["roomid"]
		rules = handleRulesForm()
		rooms[roomid] = {
			"starts": 0,
			"rules":  rules,
			"users":  pd.DataFrame(columns=["userid", "username", "startrole", "currentrole"])
		}
		return redirect(f"/join?roomid={roomid}")

@app.route("/join", methods=["GET", "POST"])
def handleJoinGame():
	if request.method == "GET":
		return render_template("start.html")

	else:
		roomid = request.form["roomid"]
		user = {
			"username": request.form["name"],
			"userid": str(uuid.uuid4())[:8]
		}
		session["userid"] = user["userid"]

		rooms[roomid]["users"] = rooms[roomid]["users"].append(user, ignore_index=True)
		rooms[roomid]["starts"] += 1

		if rooms[roomid]["starts"] == rooms[roomid]["rules"]["nusers"]:
			rooms[roomid]["starts"] = 0
			socketio.start_background_task(game.play, rooms[roomid]["users"], rooms[roomid]["rules"], roomid)

		return redirect(f"/game/{roomid}")

@app.route("/game/<roomid>")
def handleGamePage(roomid):
	if roomid not in rooms: abort(404)
	uid = session["userid"]
	user = rooms[roomid]["users"][rooms[roomid]["users"]["userid"] == uid].iloc[0]
	return render_template("game.html", username=user.username, userid=user.userid, roomid=roomid)

def handleRulesForm():
	nplayers = int(request.form["nplayers"])
	turntime = int(request.form["turntime"])
	daytime = int(request.form["daytime"][0]) * 60

	roles = []
	for i in range(nplayers+3):
		roles.append(request.form[f"role-select-{i+1}"])

	rules = {
		"nusers": nplayers,
		"roles": roles,
		"turntime": turntime,
		"daytime": daytime
	}
	return rules

@app.route("/restart/<roomid>", methods=["POST", "GET"])
def restartHandler(roomid):
	rooms[roomid]["starts"] += 1
	rooms[roomid]["users"]["startRole"] = None
	rooms[roomid]["users"]["currentrole"] = None

	if rooms[roomid]["starts"] == rooms[roomid]["rules"]["nusers"]:
		rooms[roomid]["starts"] = 0
		socketio.start_background_task(game.play, rooms[roomid]["users"], rooms[roomid]["rules"], roomid)

	return redirect(f"/game/{roomid}")

@app.route("/reset/<roomid>", methods=["POST", "GET"])
def resetHandler(roomid):
	rooms[roomid]["starts"] = 0
	rooms[roomid]["users"] = pd.DataFrame(columns=["userid", "username", "startrole", "currentrole"])
	return redirect(f"/join?roomid={roomid}")

@app.route("/hardreset", methods=["POST", "GET"])
def hardResetHandler():
	rooms = {}
	return redirect("/")

if __name__ == "__main__":
	socketio.run(app)
