import random
import time
import pandas as pd

from server import socketio

roles = [
	"werewolf",
	"werewolf",
	"villager",
	"villager",
	"villager",
]

def night(users):
	print("night")

	nusers = 1
	nloaded = 0
	nready = 0

	@socketio.on("loaded")
	def client_loaded():
		nonlocal nloaded
		nloaded += 1

	while nloaded != nusers:
		time.sleep(0.1)

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

	@socketio.on("ready")
	def client_ready():
		nonlocal nready
		nready += 1

	while nready != nusers:
		time.sleep(0.1)

	socketio.emit("start")

def day():
	pass
