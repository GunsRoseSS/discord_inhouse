import mongoose from "mongoose"

import dotenv from "dotenv"
dotenv.config()

import { Client, MessageEmbed } from "discord.js"

const client = new Client()

import disbut, {MessageButton} from "discord-buttons"
disbut(client)

import {createUser, getUser,getUsers, deleteUsers} from "./interface/user.js"
import {addToQueue, clearQueue, playersInQueue} from "./interface/queue.js"
import { findMatch } from "./interface/matchmaking.js"

import {formatRoles, formatUsers} from "./helpers/format.js"

const admins = ["278604461436567552"]

client.on("ready",() => {
})

client.on("message", async (message) => {
	if (message.author.bot) return
	if (message.content.startsWith("!")) {
		var [cmd, ...args]  = message.content.trim().substring(1).toLowerCase().split(/\s+/)
		
		switch(cmd) {
			case "queue":
				if (args.length === 0) {
					return message.channel.send("Missing role(s)")
				}

				let user_id = message.author.id

				if (admins.includes(message.author.id)) {
					switch (args[0]) {
						case "clear":
							message.channel.send(`${await clearQueue()} player(s) removed from queue`)
							return
						case "count":
							message.channel.send(`${(await playersInQueue()).length} player(s) in queue`)
							return
						case "-u":
							user_id = args[1]
							args = args.slice(2)
							break
					}
				}

				let user = await getUser(user_id)

				if (!user) {
					user = await createUser(user_id)
				}

				await addToQueue(user_id, formatRoles(args))

				break
			case "start":
				let queue = await playersInQueue()
				const count = queue.length
				if (count < 10) {
					message.channel.send(`Not enough players in queue, need ${10 - count} more`)
					return
				}
				let match = await findMatch()

				message.channel.send("Game found")

				/*
					TODO: 

					- Display match to users (need to convert discord_id to username?)
					- Save match globally
				*/
				
				break
			case "delete":
				await deleteUsers()
				message.channel.send("All users deleted")
				break
			case "register":
				if (admins.includes(message.author.id)) {
					await createUser(args[0], args.slice(1))
					message.channel.send(`Created user '${args[0]}'`)
				}
				break
			case "players":
				const players = formatUsers(await getUsers())

				let msg = ""

				await Promise.all(players.map(async (player) => {
					try {
						const user = await client.users.fetch(player)
						if (admins.includes(player)) {
							msg += `\n - ${user.username} :crown:`
						} else {
							msg += `\n - ${user.username} :poop:`
						}
					} catch(error) {
						msg += `\n - #${player} :worried:`
					}
				}))

				const embed = new MessageEmbed()
        			.setTitle("Players")
        			.setDescription(msg)

				message.channel.send(embed)


				break
		}
	}
})

mongoose.connect(`${process.env.DB_HOST}/${process.env.DB_NAME}?authSource=admin`, {user: process.env.DB_USER, pass: process.env.DB_PASS, useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
	client.login(process.env.BOT_TOKEN)
})

/*mongoose.connect(`${process.env.db_host}/${process.env.db_name}?authSource=admin`,{user: process.env.db_user, pass: process.env.db_pass, useNewUrlParser: true,useUnifiedTopology: true}).then(() => {
	client.login(process.env.BOT_TOKEN)
})*/
