import mongoose from "mongoose"

import dotenv from "dotenv"
dotenv.config()

import { Client, MessageEmbed } from "discord.js"

const client = new Client()

import EasyEmbedPages from 'easy-embed-pages'

import disbut from "discord-buttons"
disbut(client)

import {createUser, getUser,getUsers, getUserMatchHistory} from "./interface/user.js"
import {addToQueue, clearQueue, playersInQueue} from "./interface/queue.js"
import { findMatch } from "./interface/matchmaking.js"

import {formatRoles, formatUsers} from "./helpers/format.js"

import { getMatchMessageEmbed,getMatchEndMessageEmbed, countReadyPlayers, getPlayerSide } from "./interface/match.js"

import {convertMatchHistoryToEmbed, createGame, getMatchHistoryData} from "./interface/games.js";
import {
	allRoleRanking,
	embedPlayerRanks,
	embedRankingPages,
	getPlayerRanking, getRoleRanking,
	updateRoleRanking
} from "./interface/ranking.js";

const admins = ["278604461436567552"]

let current_match = null
let match_message = null
let player_states = {}
let match_playing = false
let initiator = null
let winner = null

client.on("ready",() => {
	// client.channels.fetch("863014796915638296").then(channel => {
	// 	channel.send("Discord bot restarted and online!")
	// })
	console.log('Loaded!')
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
				let count = queue.length

				if (count < 10) {
					message.channel.send(`Not enough players in queue, need ${10 - count} more`)
					return
				}

				current_match = await findMatch()

				match_playing = false
				player_states = {}

				for (let matchup of current_match.game) {
					let user1 = matchup.player1
					let user2 = matchup.player2
					try {
						user1 = await client.users.fetch(user1)
						user2 = await client.users.fetch(user2)
					} catch (error) {}

					player_states[matchup.player1] = {user: user1, state: "none"}
					player_states[matchup.player2] = {user: user2, state: "none"}
				}

				{
					let msg = getMatchMessageEmbed(current_match, player_states)

					match_message = await message.channel.send(`||${msg.msg}||`, msg.embed)
				}
			
				break
			case "players":
				{
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

					let embed = new MessageEmbed()
        				.setTitle("Players")
        				.setDescription(msg)

					message.channel.send(embed)
				}
				break
			case "win":
			case "won":
				if (match_playing) {
					if (message.author.id in player_states) {
						Object.keys(player_states).forEach(player => {
							player_states[player].state = "none"
						})

						player_states[message.author.id].state =  "accept"
						initiator = player_states[message.author.id].user
						winner = getPlayerSide(current_match, message.author.id)
						let msg = getMatchEndMessageEmbed(initiator, winner, player_states)

						match_message = await message.channel.send(`||${msg.msg}||`, msg.embed)
					}			
				}
				break
			case "loss":
			case "lose":
				if (match_playing) {
					if (message.author.id in player_states) {
						Object.keys(player_states).forEach(player => {
							player_states[player].state = "none"
						})
						
						player_states[message.author.id].state =  "accept"
						initiator = player_states[message.author.id].user
						winner = getPlayerSide(current_match, message.author.id, true)
						let msg = getMatchEndMessageEmbed(initiator, winner, player_states)

						match_message = await message.channel.send(`||${msg.msg}||`, msg.embed)
					}			
				}
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
				message.channel.send('epic');
				break
			case 'rank':
				message.react('👑');

				let playerRanks = await getPlayerRanking(message.author.id)

				const rankEmbed = new EasyEmbedPages(message.channel,
					{
						color: 'ff00ff',
						title: `Ranks for ${message.member.displayName}`,
						description: 'Type !ranking or !ranking [role] for role rankings',
						pages: [
							{
								fields: [
									{
										name: "Role & Rank",
										value: embedPlayerRanks(playerRanks, 'rank'),
										inline: true
									},
									{
										name: "MMR",
										value: embedPlayerRanks(playerRanks, 'mmr'),
										inline: true
									},
									{
										name: "Win/Loss",
										value: embedPlayerRanks(playerRanks, 'winLoss'),
										inline: true
									}
								]
							}
						]
					}
				)
				rankEmbed.start({
					channel: message.channel,
					person: message.author
				});
				break
			case 'ranking':
				message.react('🏅');

				if (args.length === 0){
					let ranking = await allRoleRanking();
					let pages = embedRankingPages(ranking, true)

					const rankEmbed = new EasyEmbedPages(message.channel,
						{
							color: 'ff77ff',
							title: `Ranks for all roles`,
							description: 'Type !ranking [role] for a specific role',
							pages: pages,
							allowStop: true,
							time: 300000,
							ratelimit: 1500
						}
					)
					rankEmbed.start();
				} else{
					if (args[0].toLowerCase() === 'top' || args[0].toLowerCase() === 'jgl' || args[0].toLowerCase() === 'mid' || args[0].toLowerCase() === 'adc' || args[0].toLowerCase() === 'sup') {
						let ranking = await getRoleRanking(args[0]);
						let pages = embedRankingPages(ranking, false)

						const rankEmbed = new EasyEmbedPages(message.channel,
							{
								color: 'aa77ff',
								title: `Ranks for ${args[0]}`,
								description: 'Type !ranking for a ranking of all roles.',
								pages: pages,
								allowStop: true,
								time: 300000,
								ratelimit: 1500
							}
						)
						rankEmbed.start();
					} else{
						message.channel.send('Are you fucking retarded? Learn to spell a role: top, jgl, mid, adc or sup.')
					}
				}

		}
	}
})

client.on("clickButton", async (button) => {
	switch (button.id) {
		case "accept_game":
			{
				if (button.clicker.id in player_states) {
					player_states[button.clicker.id].state = "accept"
					let msg = getMatchMessageEmbed(current_match, player_states)
	
					match_message.edit(`||${msg.msg}||`, msg.embed)
	
					if (countReadyPlayers(player_states) <= 1 && match_playing === false) {
						let msg = getMatchMessageEmbed(current_match, player_states, true)
						await button.channel.send(`||${msg.msg}||`, msg.embed)
						match_playing = true
						match_message.delete()

					}
				}
				
			}

			break
		case "decline_game":
			{
				if (button.clicker.id in player_states) {
					player_states[button.clicker.id].state = "decline"
					let msg = getMatchMessageEmbed(current_match, player_states)
	
					match_message.edit(`||${msg.msg}||`, msg.embed)
				}
				
			}
			break
		case "confirm_win":
			{
				if (button.clicker.id in player_states) {
					player_states[button.clicker.id].state = "accept"

					let msg = getMatchEndMessageEmbed(initiator, winner, player_states)

					match_message.edit(`||${msg.msg}||`, msg.embed)
				}
			}
			break
		case "deny_win":
			{
				if (button.clicker.id in player_states) {
					player_states[button.clicker.id].state = "decline"

					let msg = getMatchEndMessageEmbed(initiator, winner, player_states)
					
					match_message.edit(`||${msg.msg}||`, msg.embed)
				}
			}
			break
	}

	button.reply.defer()
})

mongoose.connect(`${process.env.DB_HOST}/${process.env.DB_NAME}?authSource=admin`, {user: process.env.DB_USER, pass: process.env.DB_PASS, useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
	client.login(process.env.BOT_TOKEN)
})

