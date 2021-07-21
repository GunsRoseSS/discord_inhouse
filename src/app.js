import mongoose from "mongoose"

import dotenv from "dotenv"

dotenv.config()

import {Client, MessageEmbed} from "discord.js"

const client = new Client()

import EasyEmbedPages from 'easy-embed-pages'

import disbut, {MessageButton} from "discord-buttons"

disbut(client)

import {
    createUser,
    getUser,
    getUsers,
    deleteUsers,
    getUserMatchHistory,
    getUserChampionStats
} from "./interface/user.js"
import {addToQueue, clearQueue, playersInQueue} from "./interface/queue.js"
import {findMatch} from "./interface/matchmaking.js"

import {checkPositive, formatChampions, formatRoles, formatUsers} from "./helpers/format.js"
import {convertMatchHistoryToEmbed, createGame, getMatchHistoryData} from "./interface/games.js";
import {
    allRoleRanking,
    embedPlayerRanks,
    embedRankingPages,
    getPlayerRanking, getRoleRanking,
    updateRoleRanking
} from "./interface/ranking.js";
import {championDataToEmbed, fetchChampionIcon, getAllPlayerChampionStats} from "./interface/champion.js";

const admins = ["278604461436567552"]

client.on("ready", () => {
    // client.channels.fetch("863014796915638296").then(channel => {
    // 	channel.send("Discord bot restarted and online!")
    // })
    console.log('Loaded!')
})

client.on("message", async (message) => {
    if (message.author.bot) return
    if (message.content.startsWith("!")) {
        var [cmd, ...args] = message.content.trim().substring(1).toLowerCase().split(/\s+/)

        switch (cmd) {
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
            // case "start":
            // 	let queue = await playersInQueue()
            // 	const count = queue.length
            // 	if (count < 10) {
            // 		message.channel.send(`Not enough players in queue, need ${10 - count} more`)
            // 		return
            // 	}
            // 	let match = await findMatch()
            //
            // 	message.channel.send("Game found")
            //
            // 	/*
            // 		TODO:
            //
            // 		- Display match to users (need to convert discord_id to username?)
            // 		- Save match globally
            // 	*/
            //
            // 	break
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
                    } catch (error) {
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
                    rankEmbed.start({
                        channel: message.channel,
                        person: message.author
                    });
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
                        rankEmbed.start({
                            channel: message.channel,
                            person: message.author
                        });
                    } else {
                        message.channel.send('Are you fucking retarded? Learn to spell a role: top, jgl, mid, adc or sup.')
                    }
                }
                break
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

        }
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

/*mongoose.connect(`${process.env.db_host}/${process.env.db_name}?authSource=admin`,{user: process.env.db_user, pass: process.env.db_pass, useNewUrlParser: true,useUnifiedTopology: true}).then(() => {
	client.login(process.env.BOT_TOKEN)
})*/

