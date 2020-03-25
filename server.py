from flask import Flask
from flask import render_template, redirect, request
from flask_socketio import SocketIO

import uuid
import pandas as pd

app = Flask(__name__)
socketio = SocketIO(app)

import game

users = pd.DataFrame(columns=["userid", "username", "role"])

@app.route("/")
def handle_main():
	return render_template("index.html")

@app.route("/start", methods=["POST",])
def handle_sart():
	user = {
		"username": request.form["name"],
		"userid": str(uuid.uuid4())[:8]
	}

	global users
	users = users.append(user, ignore_index=True)

	if len(users) == game.nusers:
		socketio.start_background_task(game.play, users)

	return redirect("/game/" + user["userid"])

@app.route("/game/<userid>")
def handle_game_page(userid):
	user = users[users.userid == userid].iloc[0]
	return render_template("game.html", name=user.username, userid=user.userid)

@app.route("/reset", methods=["POST",])
def reset():
	return redirect("/")

if __name__ == "__main__":
	socketio.run(app)
