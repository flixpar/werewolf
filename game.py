import random
import time
import uuid
import pandas as pd
from functools import partial

from server import socketio

running = False

def play(users, config):
	global running
	running = True

	users, config = night(users, config)
	day(users, config)

def night(users, config):
	print("Night phase")

	waitUsersAck(users.userid.tolist(), "loaded", "serverReady")

	roles = config["roles"]
	socketio.emit("gameinfo", {
		"nusers": config["nusers"],
		"usernames": users.username.tolist(),
		"roles": roles,
		"daytime": config["daytime"],
	})

	random.shuffle(roles)
	users.startrole = roles[:-3]
	users.currentrole = roles[:-3]

	config["centerRoles"] = roles[-3:]
	config["startCenterRoles"] = roles[-3:]

	for i, user in users.iterrows():
		print("sending role:", user.startrole, "to", user.userid)
		socketio.emit("distributeRole", {"role": user.startrole}, namespace="/"+user.userid)

	waitUsersAck(users.userid.tolist(), "ready")

	socketio.emit("start")

	socketio.emit("werewolfTurnStart")

	werewolves = users[users.startrole == "werewolf"]
	werewolfNames = werewolves.username.tolist()
	for i, user in werewolves.iterrows():
		socketio.emit("werewolfNames", werewolfNames, namespace="/"+user.userid)

	if not werewolfNames:
		time.sleep(random.uniform(3.0, 6.0))

	waitUsersAck(werewolves.userid.tolist(), "werewolfAck")

	socketio.emit("minionTurnStart")

	if any(users.startrole == "minion"):
		minion = users[users.startrole == "minion"].iloc[0]
		socketio.emit("minionNames", werewolfNames, namespace="/"+minion.userid)
		waitUsersAck((minion.userid,), "minionAck")
	elif "minion" in roles:
		time.sleep(random.uniform(3.0, 6.0))

	socketio.emit("seerTurnStart")

	if any(users.startrole == "seer"):
		seer = users[users.startrole == "seer"].iloc[0]

		@socketio.on("seerRequest", namespace="/"+seer.userid)
		def seerRequest(names, *args):
			response = {}
			for name in names:
				u = users[users.username == name].iloc[0]
				response[name] = u.currentrole
			socketio.emit("seerResponse", response, namespace="/"+seer.userid)

		waitUsersAck((seer.userid,), "seerAck")

	elif "seer" in roles:
		time.sleep(random.uniform(3.0, 6.0))

	socketio.emit("robberTurnStart")

	if any(users.startrole == "robber"):
		robber = users[users.startrole == "robber"].iloc[0]

		@socketio.on("robberRequest", namespace="/"+robber.userid)
		def robberRequest(name, *args):
			oldrole = users[users.startrole == "robber"].iloc[0].currentrole
			newrole = users[users.username == name].iloc[0].currentrole
			users.loc[users.startrole == "robber", "currentrole"] = newrole
			users.loc[users.username == name, "currentrole"] = oldrole
			socketio.emit("robberResponse", newrole, namespace="/"+robber.userid)

		waitUsersAck((robber.userid,), "robberAck")

	elif "robber" in roles:
		time.sleep(random.uniform(3.0, 6.0))

	socketio.emit("drunkTurnStart")

	if any(users.startrole == "drunk"):
		drunk = users[users.startrole == "drunk"].iloc[0]

		@socketio.on("drunkRequest", namespace="/"+drunk.userid)
		def drunkRequest(idx, *args):
			oldrole = users[users.startrole == "drunk"].iloc[0].currentrole
			newrole = config["centerRoles"][int(idx)-1]
			users.loc[users.startrole == "drunk", "currentrole"] = newrole
			centerRoles[int(idx)-1] = oldrole

	elif "drunk" in roles:
		time.sleep(random.uniform(3.0, 6.0))

	socketio.emit("insomniacTurnStart")

	if any(users.startrole == "insomniac"):
		insomniac = users[users.startrole == "insomniac"].iloc[0]
		socketio.emit("insomniacRole", insomniac.currentrole, namespace="/"+insomniac.userid)
		waitUsersAck((insomniac.userid,), "insomniacAck")
	elif "insomniac" in roles:
		time.sleep(random.uniform(3.0, 6.0))

	return users, config

def day(users, config):
	print("Day phase")
	socketio.emit("startDay")

	votes = {u: False for u in users.userid.tolist()}
	for uid in users.userid.tolist():
		def voteRecieved(u, vote, *args):
			votes[u] = vote
		socketio.on_event("vote", partial(voteRecieved, uid), namespace="/"+uid)
	while not all(votes.values()):
		time.sleep(0.1)

	votes = list(votes.values())
	print("votes:", votes)
	maxNumVotes = max([votes.count(v) for v in votes])
	killed = [v for v in votes if votes.count(v) == maxNumVotes]

	werewolvesWin = True
	for name in killed:
		u = users[users.username == name].iloc[0]
		if u.currentrole == "werewolf":
			werewolvesWin = False

	startRoles = {user.username: user.startrole for _, user in users.iterrows()}
	for i, r in enumerate(config["startCenterRoles"]):
		startRoles[str(i+1)] = r

	finalRoles = {user.username: user.currentrole for _, user in users.iterrows()}
	for i, r in enumerate(config["centerRoles"]):
		finalRoles[str(i+1)] = r

	gameOverInfo = {
		"startRoles": startRoles,
		"finalRoles": finalRoles,
		"winningTeam": "werewolf" if werewolvesWin else "villager",
	}
	socketio.emit("gameover", gameOverInfo)


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
