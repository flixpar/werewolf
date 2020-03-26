from flask import Flask
from flask import render_template, redirect, request
from flask_socketio import SocketIO

import uuid
import pandas as pd

app = Flask(__name__)
socketio = SocketIO(app)

import game

rules = None
users = pd.DataFrame(columns=["userid", "username", "startrole", "currentrole"])

@app.route("/")
def handle_main():
	print(rules)
	if rules is None:
		return render_template("rules.html")
	else:
		return render_template("start.html")

@app.route("/start", methods=["POST",])
def handle_sart():
	user = {
		"username": request.form["name"],
		"userid": str(uuid.uuid4())[:8]
	}

	global users
	users = users.append(user, ignore_index=True)

	if len(users) == rules["nusers"]:
		socketio.start_background_task(game.play, users, rules)

	return redirect("/game/" + user["userid"])

@app.route("/game/<userid>")
def handle_game_page(userid):
	user = users[users.userid == userid].iloc[0]
	return render_template("game.html", name=user.username, userid=user.userid)

@app.route("/rules", methods=["POST",])
def setRules():
	reset()

	nplayers = int(request.form["nplayers"])
	daytime = int(request.form["daytime"][0]) * 60

	roles = []
	for i in range(nplayers+3):
		roles.append(request.form[f"role-select-{i+1}"])

	global rules
	rules = {
		"nusers": nplayers,
		"roles": roles,
		"daytime": daytime
	}

	return redirect("/")

@app.route("/reset", methods=["POST", "GET"])
def resetHandler():
	if game.running:
		reset()
		game.running = False
	return redirect("/")

def reset():
	global users, rules
	rules = None
	users = pd.DataFrame(columns=["userid", "username", "startrole", "currentrole"])

if __name__ == "__main__":
	socketio.run(app)
