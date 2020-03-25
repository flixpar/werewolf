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

	random.shuffle(roles)
	users.role = roles[:len(users)]

	time.sleep(2)

	for i, user in users.iterrows():
		print("sending:", user.role, "to", user.userid)
		socketio.emit("distributeRole", {"role": user.role}, namespace="/"+user.userid)

	socketio.emit("start")

def day():
	pass
