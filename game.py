import random
import time
import uuid
import pandas as pd
from functools import partial

from server import socketio

running = False
roles = None
nusers = None
centerRoles = None
daytime = None

def reset():
	global roles, nusers, centerRoles, daytime
	roles = None
	nusers = None
	centerRoles = None
	daytime = None

def setConfig(r, d):
	global roles, nusers, centerRoles, daytime
	roles = r
	nusers = len(r)-3
	centerRoles = None
	daytime = d

def play(users):
	global running
	running = True
	night(users)
	day(users)

def night(users):
	print("Night phase")

	waitUsersAck(users.userid.tolist(), "loaded", "serverReady")

	socketio.emit("gameinfo", {
		"nusers": nusers,
		"usernames": users.username.tolist(),
		"roles": roles,
		"daytime": daytime,
	})

	random.shuffle(roles)
	users.startrole = roles[:-3]
	users.currentrole = roles[:-3]

	global centerRoles
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
			print("seer request:", names)
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
			print("robber swap:", robber.username, "with", name)
			print("robber new role:", newrole)
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
			newrole = centerRoles[int(idx)-1]
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

def day(users):
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

	finalRoles = {user.username: user.currentrole for _, user in users.iterrows()}
	for i, r in enumerate(centerRoles):
		finalRoles[str(i+1)] = r

	gameOverInfo = {
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
