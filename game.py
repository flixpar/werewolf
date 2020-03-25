import random
import time
import pandas as pd
from functools import partial

from server import socketio

nusers = 2
roles = [
	"werewolf",
	"robber",
]

def play(users):
	night(users)
	day(users)

def night(users):
	print("Night phase")

	waitUsersAck(users.userid.tolist(), "loaded", "serverReady")

	socketio.emit("gameinfo", {
		"nusers": nusers,
		"usernames": users.username.tolist(),
		"roles": roles
	})

	random.shuffle(roles)
	users.startrole = roles
	users.currentrole = roles

	for i, user in users.iterrows():
		print("sending:", user.startrole, "to", user.userid)
		socketio.emit("distributeRole", {"role": user.startrole}, namespace="/"+user.userid)

	waitUsersAck(users.userid.tolist(), "ready")

	socketio.emit("start")

	socketio.emit("werewolfTurnStart")

	werewolves = users[users.startrole == "werewolf"]
	werewolfNames = werewolves.username.tolist()
	for i, user in werewolves.iterrows():
		socketio.emit("werewolfNames", werewolfNames, namespace="/"+user.userid)

	waitUsersAck(werewolves.userid.tolist(), "werewolfAck")

	socketio.emit("minionTurnStart")

	if any(users.startrole == "minion"):
		minion = users[users.startrole == "minion"].iloc[0]
		socketio.emit("minionNames", werewolfNames, namespace="/"+minion.userid)
		waitUsersAck((minion.userid,), "minionAck")

	socketio.emit("seerTurnStart")

	if any(users.startrole == "seer"):
		seer = users[users.startrole == "seer"].iloc[0]

		@socketio.on("seerRequest", namespace="/"+seer.userid)
		def seerRequest(names, *args):
			print("seer request:", names)
			response = {}
			for name in names:
				u = users[users.username == name].iloc[0]
				response[name] = u.currentrole
			socketio.emit("seerResponse", response, namespace="/"+seer.userid)

		waitUsersAck((seer.userid,), "seerAck")

	socketio.emit("robberTurnStart")

	if any(users.startrole == "robber"):
		robber = users[users.startrole == "robber"].iloc[0]

		@socketio.on("robberRequest", namespace="/"+robber.userid)
		def robberRequest(name, *args):
			newrole = users[users.username == name].iloc[0].currentrole
			print("robber swap:", robber.username, "with", name)
			print("robber new role:", newrole)
			users.loc[users.startrole == "robber", "currentrole"] = newrole
			users.loc[users.username == name, "currentrole"] = "robber"
			socketio.emit("robberResponse", newrole, namespace="/"+robber.userid)

		waitUsersAck((robber.userid,), "robberAck")

	socketio.emit("drunkTurnStart")

def day(users):
	print("Day phase")


def waitUsersAck(userids, responseEvent, callEvent=None):
	waitStatus = {u: False for u in userids}

	for uid in userids:
		def ackRecieved(u, *args):
			waitStatus[u] = True
		socketio.on_event(responseEvent, partial(ackRecieved, uid), namespace="/"+uid)

	while not all(waitStatus.values()):
		if callEvent is not None:
			socketio.emit(callEvent)
		time.sleep(0.1)
