import mongoose from "mongoose"

import dotenv from "dotenv"

dotenv.config()

import {Client, MessageEmbed} from "discord.js"

const client = new Client()

import EasyEmbedPages from 'easy-embed-pages'

import disbut, {MessageButton} from "discord-buttons"

import Game from "./models/game.js"

disbut(client)

import {
    createUser,
    getUser,
    getUsers,
    deleteUsers,
    getUserMatchHistory,
    getUserChampionStats
} from "./interface/user.js"

import {addToQueue, clearQueue, playersInQueue, getQueueEmbed, leaveQueue} from "./interface/queue.js"
import {findMatch} from "./interface/matchmaking.js"

import {checkPositive, formatChampions, formatRoles, formatUsers} from "./helpers/format.js"

import {getMatchMessageEmbed, getMatchEndMessageEmbed, countReadyPlayers, getPlayerSide} from "./interface/match.js"

import {convertMatchHistoryToEmbed, createGame, getGameByID, getGameEmbed, getMatchHistoryData, updateMatchID} from "./interface/games.js";
import {
    allRoleRanking,
    embedPlayerRanks,
    embedRankingPages,
    getPlayerRanking, getRoleRanking,
    updateRoleRanking
} from "./interface/ranking.js";
import {championDataToEmbed, fetchChampionIcon, getAllPlayerChampionStats} from "./interface/champion.js";
import {convertHelpToEmbed} from "./interface/help.js";

const admins = ["278604461436567552"]

let current_match = null
let match_message = null
let player_states = {}
let match_playing = false
let initiator = null
let winner = null
let champs = {}

client.on("ready", () => {
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

				let roles = formatRoles(args)

				if (roles.length != 0) {
					await addToQueue(user_id, formatRoles(args))
					message.channel.send(await getQueueEmbed())
				}
				
				break
			case "leave":
				{
					await leaveQueue(message.author.id)
					message.channel.send(await getQueueEmbed())
				}
				break
			case "test":
				{
					let id = "278604461436567552"

					let matches = await getUserMatchHistory(id)

					matches = matches.reduce((out, match) => {
						return [...out,{_id: match}]
					}, [])

					let games = await Game.find({$or : matches})

					games = games.reduce((out, game) => {
						let player = game.players.find(element => element.id == id)
						return [...out, {date: game.date, role: player.role, previousElo: player.previousElo, afterGameElo: player.afterGameElo}]
					}, [])

					//games = [{date, role, previousElo, afterGameElo},{date, role, previousElo, afterGameElo}]


				}	
			break
			case "view":
				{
					let game = await getGameByID(args[0])

					if (game) {
						let embed = getGameEmbed(game)
						message.channel.send(embed.embed)
					} else {
						message.channel.send(`Could not find match with id '${args[0]}'`)
					}
				}
				break
			case "start":
				let queue = await playersInQueue()
				let count = queue.length

				if (count < 10) {
					message.channel.send(`Not enough players in queue, need ${10 - count} more`)
					return
				}

				current_match = await findMatch()

				if (current_match != null) {
					match_playing = false
					player_states = {}
	
					for (let matchup of current_match.game) {
						player_states[matchup.player1] = {user: `<@${matchup.player1}>`, state: "none"}
						player_states[matchup.player2] = {user: `<@${matchup.player2}>`, state: "none"}
					}
	
					{
						let msg = getMatchMessageEmbed(current_match, player_states)
	
						match_message = await message.channel.send(`||${msg.msg}||`, msg.embed)
					}
				} else {
					message.channel.send("Not enough role variation to find game, try queuing in more roles")
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

						//player_states[message.author.id].state =  "accept"

						initiator = player_states[message.author.id].user
						winner = getPlayerSide(current_match, message.author.id)
						let msg = getMatchEndMessageEmbed(initiator, winner, player_states)

						match_message = await message.channel.send(`||${msg.msg}||`, msg.embed)

						if ("RED" in champs && "BLUE" in champs) {

						}
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
			case "team":
			case "lineup":
				{
					if (match_playing && message.author.id in player_states) {
						let lineup = formatChampions(args)
						let side = getPlayerSide(current_match, message.author.id)
						if (lineup.length === 5) {
							message.channel.send(`Set lineup for ${side} as: ${lineup.join(", ")}`)

							champs[side] = lineup
						} else {
							message.channel.send(`Message had too few/many champs: ${lineup.join(", ")}`)
						}
					}
				}
				break
			case "lineup2":
				{
					champs["BLUE"] = ["Tristana", "Maokai", "Warwick", "Lulu", "Fiora"]
					champs["RED"] = ["Ekko", "LeeSin", "Vladimir", "Rell", "Leona"]
				}
				break
			case "past":
			case 'history':
				message.react('📖')

				let userHistoryData = await getMatchHistoryData(message.author.id);

				let historyEmbed = convertMatchHistoryToEmbed(message.member.displayName, userHistoryData)

				message.channel.send(historyEmbed)

				break
			case 'epic':
				message.channel.send('epic');
				break
			case "link":
				updateMatchID(args[0], args[1])
				break
			case 'rank':
				message.react('👑');
	
				let playerRanks;
				let nickName;
				if (args.length === 0) {
					playerRanks = await getPlayerRanking(message.author.id);
					nickName = message.member.displayName;
				} else {
					const player = args[0].slice(3, args[0].length - 1);
					if (await getUser(player)){
						playerRanks = await getPlayerRanking(player);
						nickName = message.guild.member(player).displayName;
					} else {
						message.channel.send('Could not find player in the Database. Have they played a game before?')
						break
					}
	
				}
	
				const rankEmbed = new EasyEmbedPages(message.channel,
					{
						color: 'ff00ff',
						title: `Ranks for ${nickName}`,
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
					})
				rankEmbed.start({
					channel: message.channel,
					person: message.author
				});
				break
				case "notepic":
					message.channel.send(":poop:")
					break
				case 'ranking':
					message.react('🏅');
	
					if (args.length === 0) {
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
					} else {
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
						} else {
							message.channel.send('Are you fucking retarded? Learn to spell a role: top, jgl, mid, adc or sup.')
						}
					}
					break
				case 'champ':
				case 'champion':
                switch (args.length) {
                    case 1:
                        let champion = formatChampions([args[0]]);
                        if (champion === []) {
                            message.channel.send('Have you considered a spelling course? Could not recognise champion.')
                            break
                        }
                        champion = champion[0];

                        const user = message.author.id;
                        const nickName = message.guild.member(user).displayName;
                        const champData = await getUserChampionStats(user, champion);

                        if (champData) {
                            const rankEmbed = new MessageEmbed()
                                .setTitle(`${champion} stats for ${nickName}`)
                                .setColor('ab12ef')
                                .setDescription('Type **!champion [champion] all** to view stats of all players for that champion or **!champion [champion] @player** to view stats of that player for the champion.')
                                .setThumbnail(fetchChampionIcon(champion))
                                .addFields({
                                        name: "Total MMR gain/loss",
                                        value: `${checkPositive((champData).mmrDiff)}`,
                                        inline: true
                                    },
                                    {
                                        name: "Win/Loss",
                                        value: `${(champData).wins}/${(champData).losses}`,
                                        inline: true
                                    })

                            message.channel.send(rankEmbed);
                        } else {
                            message.channel.send(`You have not played ${champion} before.`)
                        }

                        break
                    case 2:
                        let champion1 = formatChampions([args[0]]);
                        if (champion1 === []) {
                            message.channel.send('Have you considered a spelling course? Could not recognise champion.')
                            break
                        }
                        champion1 = champion1[0];

                        if (args[1].toLowerCase() === 'all') {
                            const playerData = getAllPlayerChampionStats(await getUsers(), champion1);

                            if (playerData) {
                                const rankEmbed = new MessageEmbed()
                                    .setTitle(`${champion1} stats for all players`)
                                    .setColor('ab12ef')
                                    .setDescription('Type **!champion [champion]** to view your own stats for that champion or **!champion [champion]** to view your own stats for the champion. for the champion.')
                                    .setThumbnail(fetchChampionIcon(champion1))
                                    .addFields({
                                            name: "Player",
                                            value: championDataToEmbed(playerData, 'nickname'),
                                            inline: true
                                        },
                                        {
                                            name: "Total MMR gain/loss",
                                            value: championDataToEmbed(playerData, 'mmr'),
                                            inline: true
                                        },
                                        {
                                            name: "Win/Loss",
                                            value: championDataToEmbed(playerData, 'winLoss'),
                                            inline: true
                                        })

                                message.channel.send(rankEmbed);

                            } else {
                                message.channel.send(`No players have played ${champion1} yet.`)
                            }
                        } else {
                            const player = args[1].slice(3, args[1].length - 1);
                            const nickName = message.guild.member(player).displayName;
                            const playerData = await getUserChampionStats(player, champion1);

                            if (playerData) {
                                const rankEmbed = new MessageEmbed()
                                    .setTitle(`${champion1} stats for ${nickName}`)
                                    .setColor('ab12ef')
                                    .setDescription('Type **!champion [champion] all** to view stats of all players for that champion or **!champion [champion]** to view your own stats for the champion. for the champion.')
                                    .setThumbnail(fetchChampionIcon(champion1))
                                    .addFields({
                                            name: "Total MMR gain/loss",
                                            value: `${checkPositive((playerData).mmrDiff)}`,
                                            inline: true
                                        },
                                        {
                                            name: "Win/Loss",
                                            value: `${(playerData).wins}/${(playerData).losses}`,
                                            inline: true
                                        })

                                message.channel.send(rankEmbed);

                            } else {
                                message.channel.send(`This player hasn't played ${champion1} yet.`)
                            }
                        }
                        break
                    default:
                        message.channel.send('You messed up the command, sunshine. !champion [champion]');
                }
                break
            case 'help':
            case 'commands':
                message.react('❓');

                const helpEmbed = new EasyEmbedPages(message.channel, {
                    title: ':question: Help page :question;',
                    color: 'ffffff',
                    footer: "Discord embed layouts are cancer so the help page looks like shit :////",
                    allowStop: true,
                    time: 300000,
                    ratelimit: 1500,
                    pages: [
                        {
                            description: convertHelpToEmbed(1)
                        },
                        {
                            description: convertHelpToEmbed(2)
                        },
                        {
                            description: convertHelpToEmbed(3)
                        },
                        {
                            description: convertHelpToEmbed(4)
                        },
                    ]
                })


                helpEmbed.start({
                    channel: message.channel,
                    author: message.author
                })
                break

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

						await match_message.delete()

						await clearQueue()

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

					let count = 0

					Object.keys(player_states).forEach(player => {
						if (player_states[player].state === "accept") {
							count++
						}
					})

					if (count >= 1) {
						await match_message.delete()

						let game = await createGame(current_match.game, champs, winner)
						
						let embed = getGameEmbed(game)
						button.channel.send(`||${embed.msg}||`, embed.embed)

						current_match = null
						match_message = null
						player_states = {}
						match_playing = false
						initiator = null
						winner = null
						champs = {}
					}
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

	try {
		await button.reply.defer()
	} catch (error) {
		console.log(`Error interacting with button '${button.id}'`)
	}
	

})

mongoose.connect(`${process.env.DB_HOST}/${process.env.DB_NAME}?authSource=admin`, {
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    client.login(process.env.BOT_TOKEN)
})

