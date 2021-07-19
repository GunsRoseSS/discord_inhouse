import mongoose from "mongoose"

import dotenv from "dotenv"
dotenv.config()

import { Client, MessageEmbed } from "discord.js"

const client = new Client()

import disbut, {MessageButton} from "discord-buttons"
disbut(client)

import {createUser, getUser,getUsers, deleteUsers, getUserMatchHistory} from "./interface/user.js"
import {addToQueue, clearQueue, playersInQueue} from "./interface/queue.js"
import { findMatch } from "./interface/matchmaking.js"

import {formatRoles, formatUsers} from "./helpers/format.js"
import { getRoleEmoji } from "./helpers/emoji.js"

const admins = ["278604461436567552"]

let current_game = null
let game_message = null
let player_states = {}
let result = "win"
let result_confirm = []

client.on("ready",() => {
	// client.channels.fetch("863014796915638296").then(channel => {
	// 	channel.send("Discord bot restarted and online!")
	// })
	console.log('Loaded!')
})

const updateGameCard = async () => {
	if (game_message) {
		let game_embed = new MessageEmbed()
		.setTitle("Game found")
		.setDescription(`Expected outcome: ${(current_game.expected_outcome  * 100.0000).toFixed(2)}% ${(current_game.expected_outcome >= 0.5000) ? "BLUE" :"RED"} \n
		Average matchup deviation: ${(current_game.avg_matchup_deviation * 100.0000).toFixed(2)}% \n\n`)
		.setFooter("\u2800".repeat(50))
		.setTimestamp()

		let msg_blue_side = ""
		let msg_red_side = ""
		let msg_outcome = ""

		let x = 0

		let msg_ping = ""

		for (const matchup of current_game.game) {	
			let p1_name = matchup.player1
			let p2_name = matchup.player2
			try {
				p1_name = await client.users.fetch(matchup.player1)
				msg_ping += `${p1_name}`
				p2_name = await client.users.fetch(matchup.player2)
				msg_ping += `${p2_name}`
			} catch(error) {}

			msg_blue_side += `${getRoleEmoji(x)} \u2800 ${player_states[matchup.player1]} ${p1_name} \u2800 \n`
			msg_red_side += `${getRoleEmoji(x)} \u2800 ${player_states[matchup.player2]} ${p2_name} \u2800 \n`
			msg_outcome += `${(matchup.probability * 100.0000).toFixed(2)}% \n`
			x++
		}


		game_embed.addField("BLUE", msg_blue_side, true)
		game_embed.addField("RED", msg_red_side, true)
		game_embed.addField("OUTCOME", msg_outcome, true)

		let btn_accept = new MessageButton()
		.setLabel("Accept")
		.setID("accept_game")
		.setStyle("green")

		let btn_decline = new MessageButton()
		.setLabel("Decline")
		.setID("decline_game")
		.setStyle("red")

		game_message.edit(`||${msg_ping}||`, {buttons: [btn_accept, btn_decline], embed: game_embed})
	}
}

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
				let count = queue.length

				if (count < 10) {
					message.channel.send(`Not enough players in queue, need ${10 - count} more`)
					return
				}

				current_game = await findMatch()

				/*
					TODO: 

					- Display match to users (need to convert discord_id to username?)
					- Save match globally
					- Clear queue
				*/

				console.log(current_game)

				let game_embed = new MessageEmbed()
				.setTitle("Game found")
				.setDescription(`Expected outcome: ${(current_game.expected_outcome  * 100.0000).toFixed(2)}% ${(current_game.expected_outcome >= 0.5000) ? "BLUE" :"RED"} \n
				Average matchup deviation: ${(current_game.avg_matchup_deviation * 100.0000).toFixed(2)}% \n\n`)
				.setFooter("\u2800".repeat(50))
				.setTimestamp()

				let msg_blue_side = ""
				let msg_red_side = ""
				let msg_outcome = ""
				let msg_ping = ""

				let x = 0

				for (const matchup of current_game.game) {
					player_states[matchup.player1] = ":arrows_counterclockwise:"
					player_states[matchup.player2] = ":arrows_counterclockwise:"			
					let p1_name = matchup.player1
					let p2_name = matchup.player2
					try {
						p1_name = await client.users.fetch(matchup.player1)
						msg_ping += `${p1_name}`
						p1_name = await client.users.fetch(matchup.player2)
						msg_ping += `${p2_name}`
					} catch(error) {}

					msg_blue_side += `${getRoleEmoji(x)} \u2800 ${player_states[matchup.player1]} ${p1_name} \u2800 \n`
					msg_red_side += `${getRoleEmoji(x)} \u2800 ${player_states[matchup.player2]} ${p2_name} \u2800 \n`
					msg_outcome += `${(matchup.probability * 100.0000).toFixed(2)}% \n`
					x++
				}


				game_embed.addField("BLUE", msg_blue_side, true)
				game_embed.addField("RED", msg_red_side, true)
				game_embed.addField("OUTCOME", msg_outcome, true)

				let btn_accept = new MessageButton()
				.setLabel("Accept")
				.setID("accept_game")
				.setStyle("green")

				let btn_decline = new MessageButton()
				.setLabel("Decline")
				.setID("decline_game")
				.setStyle("red")

				game_message = await message.channel.send(`||${msg_ping}||`, {buttons: [btn_accept, btn_decline], embed: game_embed})
			
				break
			case "won":
			case "win":
				
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
			case 'history':
				message.react('📖')

				let userHistoryData = await getMatchHistoryData(await getUserMatchHistory(message.author.id), message.author.id);

				const historyEmbed = new MessageEmbed()
					.setTitle(`:book: Match history for ${message.member.displayName} :book:`)
					.setColor('0099ff')
					.addFields({
						name: 'Match ID',
						value: await convertMatchHistoryToEmbed(userHistoryData.matches),
						inline: true
					},
						{
							name: 'Date',
							value: await convertMatchHistoryToEmbed(userHistoryData.dates),
							inline: true
						},
						{
							name: 'Role',
							value: await convertMatchHistoryToEmbed(userHistoryData.roles),
							inline: true
						},
						{
							name: 'Champion',
							value: await convertMatchHistoryToEmbed(userHistoryData.champions),
							inline: true
						},
						{
							name: 'Win/Loss',
							value: await convertMatchHistoryToEmbed(userHistoryData.winLoss),
							inline: true
						},
						{
							name: 'MMR gain/loss',
							value: await convertMatchHistoryToEmbed(userHistoryData.mmrGainLoss),
							inline: true
						},)
					.addField('How to view Match History',
						'In order to view your match, click on the link below and log in. Then,' +
						'click on any of your matches and replace the FIRST set of numbers with your match ID.', false)
					.addField('Link', 'https://matchhistory.euw.leagueoflegends.com/en/', false)

				message.channel.send(historyEmbed)
				break
			case 'epic':
				message.channel.send('epic')
				break
		}
	}
})

client.on("clickButton", async (button) => {
	switch (button.id) {
		case "accept_game":
			player_states[button.clicker.id] = ":white_check_mark:"
			updateGameCard()
			break
		case "decline_game":
			player_states[button.clicker.id] = ":x:"
			updateGameCard()
			break
	}

	button.reply.defer()
})

mongoose.connect(`${process.env.DB_HOST}/${process.env.DB_NAME}?authSource=admin`, {user: process.env.DB_USER, pass: process.env.DB_PASS, useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
	client.login(process.env.BOT_TOKEN)
})

