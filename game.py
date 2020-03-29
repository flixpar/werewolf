import random
import time
import uuid
import pandas as pd
from functools import partial

from server import socketio
from flask import request, session

def play(users, config, roomid):
	users, config = night(users, config, roomid)
	day(users, config, roomid)

def night(users, config, roomid):
	print("Night phase")

	loadedStatus = {u: False for u in users.userid.tolist()}
	for uid in users.userid.tolist():
		def loadedAckHandler(u, *args):
			if not "userid" in session: raise Exception("Authorization Error")
			if not u == session["userid"]: raise Exception("Authorization Error")
			loadedStatus[u] = True
			users.loc[users.userid == u, "sid"] = request.sid
		socketio.on_event("loaded", partial(loadedAckHandler, uid), namespace=f"/{uid}")
	while not all(loadedStatus.values()):
		socketio.emit("serverReady", room=roomid)
		time.sleep(0.1)

	roles = config["roles"]
	socketio.emit("gameinfo", {
		"nusers": config["nusers"],
		"usernames": users.username.tolist(),
		"roles": roles,
		"turntime": config["turntime"],
		"daytime": config["daytime"],
		"roomid": roomid,
	}, room=roomid)

	random.shuffle(roles)
	users.startrole = roles[:-3]
	users.currentrole = roles[:-3]

	config["centerRoles"] = roles[-3:]
	config["startCenterRoles"] = roles[-3:]

	for i, user in users.iterrows():
		print("sending role:", user.startrole, "to", user.userid)
		socketio.emit("distributeRole", {"role": user.startrole}, room=user.sid)

	waitStatus = {u: False for u in users.userid.tolist()}
	for uid in users.userid.tolist():
		def readyAckRecieved(u, *args):
			if not "userid" in session: raise Exception("Authorization Error")
			if not u == session["userid"]: raise Exception("Authorization Error")
			waitStatus[u] = True
		socketio.on_event("ready", partial(readyAckRecieved, uid), namespace=f"/{uid}")
	while not all(waitStatus.values()):
		time.sleep(0.1)

	socketio.emit("start", room=roomid)

	socketio.emit("werewolfTurnStart", room=roomid)

	werewolves = users[users.startrole == "werewolf"]
	werewolfNames = werewolves.username.tolist()

	if len(werewolfNames) > 1:
		for i, user in werewolves.iterrows():
			socketio.emit("werewolfNames", werewolfNames, room=user.sid)

	elif len(werewolfNames) == 1:
		loneWerewolf = users[users.startrole == "werewolf"].iloc[0]
		socketio.emit("loneWerewolf", room=loneWerewolf.sid)

		@socketio.on("loneWerewolfRequest", namespace=f"/{loneWerewolf.userid}")
		def loneWerewolfRequest(idx):
			if not request.sid == loneWerewolf.sid: raise Exception("Authorization Error")
			r = config["centerRoles"][int(idx)-1]
			socketio.emit("loneWerewolfResponse", [idx, r], room=loneWerewolf.sid)

	socketio.sleep(config["turntime"])

	socketio.emit("minionTurnStart", room=roomid)

	if any(users.startrole == "minion"):
		minion = users[users.startrole == "minion"].iloc[0]
		socketio.emit("minionNames", werewolfNames, room=minion.sid)
	
	if "minion" in roles:
		socketio.sleep(config["turntime"])

	socketio.emit("seerTurnStart", room=roomid)

	if any(users.startrole == "seer"):
		seer = users[users.startrole == "seer"].iloc[0]

		@socketio.on("seerRequest", namespace=f"/{seer.userid}")
		def seerRequest(names, *args):
			if not request.sid == seer.sid: raise Exception("Authorization Error")
			response = {}
			for name in names:
				if name in ["1", "2", "3"]:
					response[name] = config["centerRoles"][int(name)-1]
				else:
					u = users[users.username == name].iloc[0]
					response[name] = u.currentrole
			socketio.emit("seerResponse", response, room=seer.sid)

	if "seer" in roles:
		socketio.sleep(config["turntime"])

	socketio.emit("robberTurnStart", room=roomid)

	if any(users.startrole == "robber"):
		robber = users[users.startrole == "robber"].iloc[0]

		@socketio.on("robberRequest", namespace=f"/{robber.userid}")
		def robberRequest(name, *args):
			if not request.sid == robber.sid: raise Exception("Authorization Error")
			oldrole = users[users.startrole == "robber"].iloc[0].currentrole
			newrole = users[users.username == name].iloc[0].currentrole
			users.loc[users.startrole == "robber", "currentrole"] = newrole
			users.loc[users.username == name, "currentrole"] = oldrole
			socketio.emit("robberResponse", newrole, room=robber.sid)

	if "robber" in roles:
		socketio.sleep(config["turntime"])

	socketio.emit("drunkTurnStart", room=roomid)

	if any(users.startrole == "drunk"):
		drunk = users[users.startrole == "drunk"].iloc[0]

		@socketio.on("drunkRequest", namespace=f"/{drunk.userid}")
		def drunkRequest(idx, *args):
			if not request.sid == drunk.sid: raise Exception("Authorization Error")
			oldrole = users[users.startrole == "drunk"].iloc[0].currentrole
			newrole = config["centerRoles"][int(idx)-1]
			users.loc[users.startrole == "drunk", "currentrole"] = newrole
			config["centerRoles"][int(idx)-1] = oldrole

	if "drunk" in roles:
		socketio.sleep(config["turntime"])

	socketio.emit("insomniacTurnStart", room=roomid)

	if any(users.startrole == "insomniac"):
		insomniac = users[users.startrole == "insomniac"].iloc[0]
		socketio.emit("insomniacRole", insomniac.currentrole, room=insomniac.sid)

	if "insomniac" in roles:
		socketio.sleep(config["turntime"])

	return users, config

def day(users, config, roomid):
	print("Day phase")
	socketio.emit("startDay", room=roomid)

	# TODO: time limit for voting

	votes = {u: False for u in users.userid.tolist()}
	for uid in users.userid.tolist():
		def voteRecieved(u, vote, *args):
			if not "userid" in session: raise Exception("Authorization Error")
			if not u == session["userid"]: raise Exception("Authorization Error")
			votes[u] = vote
		socketio.on_event("vote", partial(voteRecieved, uid), namespace=f"/{uid}")
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
	socketio.emit("gameover", gameOverInfo, room=roomid)
