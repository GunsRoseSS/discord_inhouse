import crypto from "crypto"
import mongoose from "mongoose"
import {performance} from "perf_hooks"

import dotenv from "dotenv"
dotenv.config()

import { Client, MessageEmbed } from "discord.js"

const client = new Client()
const PREFIX = "!"

import disbut, {MessageButton} from "discord-buttons"
disbut(client)

import {createUser, getUser,getUsers, addElo, deleteUsers} from "./interface/user.js"
import {addToQueue, getQueue, clearQueue, playersInQueue, playersInRole} from "./interface/queue.js"

import {getMatchups} from "./interface/matchup.js"

import {formatRoles, formatUsers} from "./helpers/format.js"

const admins = ["278604461436567552"]

client.on("ready",() => {
})

//Takes a list of matchups
//Returns true if 1 or more players appear in multiple matchups
//e.g. matchups = [{role: top, player1: Kiwi, player2: Richard}, {role: jgl, player1: Kiwi, player2: Richard}] would return true
const hasPlayerConflict = (matchups) => {
	for (let i=0;i<matchups.length-1;i++) {
		for (let j=i+1;j<matchups.length;j++) {
			const matchup = matchups[i]
			const matchup2 = matchups[j]
			if (matchup.player1 === matchup2.player1 || matchup.player2 === matchup2.player2 || matchup.player1 === matchup2.player2 || matchup.player2 === matchup2.player1) {
				return true
			}
		}
	}

	return false
}

client.on("message", async (message) => {
	if (message.author.bot) return
	if (message.content.startsWith("!")) {
		var [cmd, ...args]  = message.content.trim().substring(1).toLowerCase().split(/\s+/)
		
		switch(cmd) {
			case "queue":
				if (args.length === 0) return message.channel.send("Missing role(s)")

				var user_id = message.author.id

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

				var user = await getUser(user_id)

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
					
				}

				let role_permutations = {}
			
				const roles = ["top","jgl","mid", "adc","sup"]

				//Matchups per role = n^2 - n (including inverted)
				//Without inversion = (n^2 - n) / 2

				let start = performance.now()

				for (const role of roles) {
					const players = await playersInRole(role)
					role_permutations[role] = await getMatchups(role, formatUsers(players))
				}

				console.log("Got matchups in : " + (performance.now() - start) + "ms")

				let game_permutations = []

				start = performance.now()

				console.log("start")

				role_permutations["top"].forEach((t) => {
					role_permutations["jgl"].forEach((j) => {
						if (!hasPlayerConflict([t,j])) {
							role_permutations["mid"].forEach((m) => {
								if (!hasPlayerConflict([t,j,m])) {
									role_permutations["adc"].forEach((a) => {
										if (!hasPlayerConflict([t,j,m,a])) {
											role_permutations["sup"].forEach((s) => {
												if (!hasPlayerConflict([t,j,m,a,s])) {
													game_permutations.push([t,j,m,a,s])
												}
												
											})
										}
										
									})
								}
							})		
						}
										
					})
				})

				console.log(`Calculated ${game_permutations.length} game permutations in:` + (performance.now() - start) + "ms")
				
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

				var msg = ""

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
