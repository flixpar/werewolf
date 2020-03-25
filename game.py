import random
import time
import pandas as pd

from server import socketio

nusers = 2
roles = [
	"werewolf",
	"villager",
]

def play(users):
	night(users)
	day(users)

def night(users):
	print("night")

	waitUsersCallResponse(users.userid.tolist(), "serverReady", "loaded")

	socketio.emit("gameinfo", {
		"nusers": nusers,
		"usernames": users.username.tolist(),
		"roles": roles
	})

	random.shuffle(roles)
	users.role = roles[:len(users)]

	for i, user in users.iterrows():
		print("sending:", user.role, "to", user.userid)
		socketio.emit("distributeRole", {"role": user.role}, namespace="/"+user.userid)

	waitUsersAck(users.userid.tolist(), "ready")

	socketio.emit("start")

	socketio.emit("werewolfTurnStart")

	werewolves = users[users.role == "werewolf"]
	werewolfNames = werewolves.username.tolist()
	for i, user in werewolves.iterrows():
		socketio.emit("werewolfNames", werewolfNames, namespace="/"+user.userid)

	waitUsersPrivateAck(werewolves.userid.tolist(), "werewolfAck")

	socketio.emit("minionTurnStart")

def waitUsersAck(userids, event):
	waitStatus = {u: False for u in userids}

	@socketio.on(event)
	def ackRecieved(uid):
		waitStatus[uid] = True

	while not all(waitStatus.values()):
		time.sleep(0.1)

def waitUsersPrivateAck(userids, event):
	waitStatus = {u: False for u in userids}

	for uid in userids:
		@socketio.on(event, namespace="/"+uid)
		def ackRecieved(*args):
			waitStatus[uid] = True

	while not all(waitStatus.values()):
		time.sleep(0.1)

def waitUsersCallResponse(userids, callEvent, responseEvent):
	waitStatus = {u: False for u in userids}

	@socketio.on(responseEvent)
	def ackRecieved(uid, *args):
		waitStatus[uid] = True

	while not all(waitStatus.values()):
		socketio.emit(callEvent)
		time.sleep(0.1)

def day(users):
	pass
