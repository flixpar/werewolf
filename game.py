import random
import time
import uuid
import pandas as pd
from functools import partial

from server import socketio

roles = [
	"werewolf",
	"minion",
	"seer",
	"robber",
	"insomniac",
]
nusers = len(roles) - 3
centerRoles = None

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
	users.startrole = roles[:-3]
	users.currentrole = roles[:-3]
	centerRoles = roles[-3:]

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
			oldrole = users[users.startrole == "robber"].iloc[0].currentrole
			newrole = users[users.username == name].iloc[0].currentrole
			print("robber swap:", robber.username, "with", name)
			print("robber new role:", newrole)
			users.loc[users.startrole == "robber", "currentrole"] = newrole
			users.loc[users.username == name, "currentrole"] = oldrole
			socketio.emit("robberResponse", newrole, namespace="/"+robber.userid)

		waitUsersAck((robber.userid,), "robberAck")

	socketio.emit("drunkTurnStart")

	if any(users.startrole == "drunk"):
		drunk = users[users.startrole == "drunk"].iloc[0]

		@socketio.on("drunkRequest", namespace="/"+drunk.userid)
		def drunkRequest(idx, *args):
			oldrole = users[users.startrole == "drunk"].iloc[0].currentrole
			newrole = centerRoles[int(idx)-1]
			users.loc[users.startrole == "drunk", "currentrole"] = newrole
			centerRoles[int(idx)-1] = oldrole

	socketio.emit("insomniacTurnStart")

	if any(users.startrole == "insomniac"):
		insomniac = users[users.startrole == "insomniac"].iloc[0]
		socketio.emit("insomniacRole", insomniac.currentrole, namespace="/"+insomniac.userid)
		waitUsersAck((insomniac.userid,), "insomniacAck")

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
