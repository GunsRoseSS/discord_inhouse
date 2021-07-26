import mongoose from "mongoose";
import dotenv from "dotenv";
import {Client, MessageEmbed} from "discord.js";
import EasyEmbedPages from 'easy-embed-pages';
import disbut from "discord-buttons";
import fs from "fs";

import {createUser, getUser, getUsers, getUserChampionStats} from "./interface/user.js"
import {addToQueue, clearQueue, playersInQueue, getQueueEmbed, leaveQueue} from "./interface/queue.js"
import {
    getMatchMessageEmbed,
    getMatchEndMessageEmbed,
    countReadyPlayers,
    getPlayerSide,
    countDeclinedPlayers
} from "./interface/match.js"
import {
    convertMatchHistoryToEmbed,
    createGame,
    getGameByID,
    getGameEmbed,
    getMatchHistoryData,
    updateMatchID,
    getGameByMatchID
} from "./interface/games.js"
import {
    allRoleRanking,
    embedPlayerRanks,
    embedRankingPages,
    getPlayerRanking,
    getRoleRanking,
    updateRoleRanking
} from "./interface/ranking.js"
import {championDataToEmbed, fetchChampionIcon, getAllPlayerChampionStats} from "./interface/champion.js"
import {convertHelpToEmbed} from "./interface/help.js"
import {generateGraph, generateRoleGraph} from "./interface/graph.js"
import {findMatch} from "./interface/matchmaking.js"
import {checkPositive, formatChampions, formatRoles} from "./helpers/format.js";
import {convertTeammateDataToEmbed, getTeammateStats} from "./interface/teammates.js";

dotenv.config()

const client = new Client()

disbut(client)

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
    let user_id, user, embedData, ranking, nickname, embed, champion, pages;
    if (message.content.startsWith("!")) {
        var [cmd, ...args] = message.content.trim().substring(1).toLowerCase().split(/\s+/)

        switch (cmd) {
            case "queue":
            {
                message.react('⚔');

                let admin = message.member.hasPermission("ADMINISTRATOR");

                if (args.length === 0) {
                    return message.channel.send("Missing role(s)")
                }

                user_id = message.author.id;


                switch (args[0]) {
                    case "clear":
                        if (admin) {
                            message.channel.send(`${await clearQueue()} player(s) removed from queue`)
                            return
                        } else {
                            message.channel.send("Shut up nerd, you're not an admin.")
                            return
                        }
                    case "count":
                        if (admin) {
                            message.channel.send(`${(await playersInQueue()).length} player(s) in queue`)
                            return
                        } else {
                            message.channel.send("Shut up nerd, you're not an admin.")
                            return
                        }
                    case "-u":
                        if (admin) {
                            user_id = args[1]
                            args = args.slice(2)
                            break
                        } else {
                            message.channel.send("Shut up nerd, you're not an admin.")
                            return
                        }
                }


                user = await getUser(user_id);

                if (!user) {
                    user = await createUser(user_id);
                    await updateRoleRanking();
                }

                let roles = formatRoles(args);

                if (roles.length != 0) {
                    await addToQueue(user_id, roles);
                    message.channel.send(await getQueueEmbed());
                } else {
                    message.channel.send('Something went wrong while trying to add you to the queue. Did you spell your roles correctly?')
                }

                break
            }
            case "cancel": {
                if (message.member.hasPermission("ADMINISTRATOR") && current_match) {
                    current_match = null
                    match_message = null
                    player_states = {}
                    match_playing = false
                    initiator = null
                    winner = null
                    champs = {}
                    message.channel.send("Current game has been cancelled")
                } else {
                    message.channel.send("There is no game being played or you do not have permission to cancel it")
                }
            }
                break
            case "leave":
                message.react('🏳️');

                let succes = await leaveQueue(message.author.id)
                if (succes.n === 0){
                    message.channel.send("You can't leave the queue if you're not in it.");
                } else {
                    message.channel.send(await getQueueEmbed());
                }
                break
            case "view": {
                message.react('👀');

                let game;

                if (args[0] > 10000) {
                    game = await getGameByMatchID(args[0])
                } else {
                    game = await getGameByID(args[0])
                }

                if (game) {
                    let embed = getGameEmbed(game)
                    message.channel.send(embed.embed)
                } else {
                    message.channel.send(`Could not find match with id '${args[0]}'`)
                }
                break
            }
            case "start":
                message.react('☄');

                if (current_match === null) {
                    let queue = await playersInQueue()
                    let inQueue = false;
                    for (let player of queue){
                        if (player._id === message.author.id){
                            inQueue = true;
                        }
                    }
                    if (!inQueue){
                        message.channel.send("Nice try loser, you're not in the queue.");
                        break
                    }
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
                } else {
                    message.channel.send('There already is a match going on, are u stupid?');
                }
                break
            case 'loss':
            case 'lose':
            case "win":
            case "won":
                message.react('💸');

                if (match_playing) {
                    if (message.author.id in player_states) {
                        if ("RED" in champs && "BLUE" in champs) {
                            Object.keys(player_states).forEach(player => {
                                player_states[player].state = "none"
                            })

                            player_states[message.author.id].state = "accept"
                            initiator = player_states[message.author.id].user
                            winner = getPlayerSide(current_match, message.author.id, !["win", "won"].includes(cmd))
                            let msg = getMatchEndMessageEmbed(initiator, winner, player_states)

                            match_message = await message.channel.send(`||${msg.msg}||`, msg.embed)
                        } else {
                            message.channel.send("One of the teams still needs to do !lineup");
                        }
                    } else {
                        message.channel.send("You're not in the match, fuck off!");
                    }
                } else {
                    message.channel.send("Can't win a match if there's no match going on. :sunglasses:");
                }
                break
            case "team":
            case "lineup":
                message.react('🤝');

                if (match_playing && message.author.id in player_states) {
                    let lineup = formatChampions(args)
                    let side = getPlayerSide(current_match, message.author.id)
                    if (lineup.length === 5) {
                        message.channel.send(`Set lineup for ${side} as: ${lineup.join(", ")}`)

                        champs[side] = lineup
                    } else {
                        message.channel.send(`Message had too few/many champs: ${lineup.join(", ")}`)
                    }
                } else {
                    message.channel.send("Either there is no match being played or you're not in the current match.")
                }
                break
            case "lineup2":
                champs["BLUE"] = ["Tristana", "Maokai", "Warwick", "Lulu", "Fiora"]
                champs["RED"] = ["Ekko", "LeeSin", "Vladimir", "Rell", "Leona"]
                break
            case "past":
            case 'history':
                message.react('📖')

                if (args.length > 0) {
                    message.channel.send('You can only look up history for yourself (dabs)');
                    break
                }

                embedData = await getMatchHistoryData(message.author.id)

                if (!embedData.matches[0]) {
                    message.channel.send('You have not played any matches yet.')
                    break
                }

                pages = convertMatchHistoryToEmbed(message.member.displayName, embedData)
                embed = new EasyEmbedPages(message.channel,
                    {
                        title: `:book: Match history for ${message.member.displayName} :book:`,
                        color: '0099ff',
                        pages: pages,
                        allowStop: true,
                        time: 300000,
                        ratelimit: 1500
                    })

                embed.start({
                    channel: message.channel,
                    person: message.author
                })

                break
            case 'epic':
                message.channel.send('epic');
                break
            case "matchid":
            case "link":
                if (args.length > 1) {
                    message.react('⛓');
                    let success = updateMatchID(args[0], args[1]);
                    if (success !== null) {
                        message.channel.send(`Game id ${args[0]} not found, do you need a pair of glasses?`)
                    }
                } else {
                    message.channel.send("No, that's not how that works. !link [matchID] [RiotID]")
                }
              break
            case 'rank':
                message.react('👑');

                if (args.length === 0) {
                    ranking = await getPlayerRanking(message.author.id);
                    nickname = message.member.displayName;
                } else {
                    user_id = args[0].slice(3, args[0].length - 1);
                    if (await getUser(user_id)) {
                        ranking = await getPlayerRanking(user_id);
                        nickname = message.guild.member(user_id).displayName;
                    } else {
                        message.channel.send('Could not find player in the Database. Have they played a game before?')
                        break
                    }
                }
                if (!ranking){
                    message.channel.send(`could not find any games for ${nickname}`);
                    break
                }

                embed = new EasyEmbedPages(message.channel,
                    {
                        color: 'ff00ff',
                        title: `Ranks for ${nickname}`,
                        description: 'Type !ranking or !ranking [role] for role rankings',
                        pages: [
                            {
                                fields: [
                                    {
                                        name: "Role & Rank",
                                        value: embedPlayerRanks(ranking, 'rank'),
                                        inline: true
                                    },
                                    {
                                        name: "MMR",
                                        value: embedPlayerRanks(ranking, 'mmr'),
                                        inline: true
                                    },
                                    {
                                        name: "Win/Loss",
                                        value: embedPlayerRanks(ranking, 'winLoss'),
                                        inline: true
                                    }
                                ]
                            }
                        ]
                    })
                embed.start({
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
                        })
                    rankEmbed.start();
                } else {
                    let role = formatRoles([args[0]]);
                    if (role.length > 0) {
                        let ranking = await getRoleRanking(role[0]);
                        let pages = embedRankingPages(ranking, false)

                        const rankEmbed = new EasyEmbedPages(message.channel,
                            {
                                color: 'aa77ff',
                                title: `Ranks for ${role[0]}`,
                                description: 'Type !ranking for a ranking of all roles.',
                                pages: pages,
                                allowStop: true,
                                time: 300000,
                                ratelimit: 1500
                            }
                        )
                        rankEmbed.start();
                    } else {
                        message.channel.send({files: ["https://cdn.discordapp.com/attachments/868935612709888042/868935649150005268/20181028_2027572.jpg"]})
                    }
                }
                break
            case 'champ':
            case 'champion':
                message.react('🧙‍♀️');

                switch (args.length) {
                    case 1:
                        champion = formatChampions([args[0]]);
                        if (champion.length == 0) {
                            message.channel.send('Have you considered a spelling course? Could not recognise champion.')
                            break
                        }
                        champion = champion[0];

                        user_id = message.author.id;
                        nickname = message.guild.member(user_id).displayName;
                        embedData = await getUserChampionStats(user_id, champion);

                        if (embedData) {
                            embed = new MessageEmbed()
                                .setTitle(`${champion} stats for ${nickname}`)
                                .setColor('ab12ef')
                                .setDescription('Type **!champion [champion] all** to view stats of all players for that champion or **!champion [champion] [@player]** to view stats of that player for the champion.')
                                .setThumbnail(fetchChampionIcon(champion))
                                .addFields({
                                        name: "Total MMR gain/loss",
                                        value: `${checkPositive((embedData).mmrDiff)}`,
                                        inline: true
                                    },
                                    {
                                        name: "Win/Loss",
                                        value: `${(embedData).wins}/${(embedData).losses}`,
                                        inline: true
                                    })

                            message.channel.send(embed);
                        } else {
                            message.channel.send(`You have not played ${champion} before.`)
                        }

                        break
                    case 2:
                        champion = formatChampions([args[0]]);
                        if (champion === []) {
                            message.channel.send('Have you considered a spelling course? Could not recognise champion.')
                            break
                        }
                        champion = champion[0];

                        if (args[1].toLowerCase() === 'all') {
                            embedData = getAllPlayerChampionStats(await getUsers(), champion);

                            if (embedData) {
                                embed = new MessageEmbed()
                                    .setTitle(`${champion} stats for all players`)
                                    .setColor('ab12ef')
                                    .setDescription('Type **!champion [champion]** to view your own stats for that champion or **!champion [champion] [@player]** to view stats of the champion for another player.')
                                    .setThumbnail(fetchChampionIcon(champion))
                                    .addFields({
                                            name: "Player",
                                            value: championDataToEmbed(embedData, 'nickname'),
                                            inline: true
                                        },
                                        {
                                            name: "Total MMR gain/loss",
                                            value: championDataToEmbed(embedData, 'mmr'),
                                            inline: true
                                        },
                                        {
                                            name: "Win/Loss",
                                            value: championDataToEmbed(embedData, 'winLoss'),
                                            inline: true
                                        })

                                message.channel.send(embed);

                            } else {
                                message.channel.send(`No players have played ${champion} yet.`)
                            }
                        } else {
                            user_id = args[1].slice(3, args[1].length - 1);
                            nickname = message.guild.member(user_id).displayName;
                            embedData = await getUserChampionStats(user_id, champion);

                            if (embedData) {
                                embed = new MessageEmbed()
                                    .setTitle(`${champion} stats for ${nickname}`)
                                    .setColor('ab12ef')
                                    .setDescription('Type **!champion [champion] all** to view stats of all players for that champion or **!champion [champion]** to view your own stats for the champion. for the champion.')
                                    .setThumbnail(fetchChampionIcon(champion))
                                    .addFields({
                                            name: "Total MMR gain/loss",
                                            value: `${checkPositive((embedData).mmrDiff)}`,
                                            inline: true
                                        },
                                        {
                                            name: "Win/Loss",
                                            value: `${(embedData).wins}/${(embedData).losses}`,
                                            inline: true
                                        })

                                message.channel.send(embed);

                            } else {
                                message.channel.send(`This player hasn't played ${champion} yet.`)
                            }
                        }
                        break
                    default:
                        message.channel.send('You messed up the command, sunshine. !champion [champion]');
                }
                break
            case 'champs':
            case 'champions':
                message.react('🧙‍♂️');

                if (args.length < 1) {
                    user_id = message.author.id;
                } else {
                    user_id = args[0].slice(3, args[0].length - 1);
                }
                nickname = message.guild.member(user_id).displayName;
                embedData = await getUserChampionStats(user_id);

                if (embedData === []) {
                    embed = new MessageEmbed()
                        .setTitle(`All champion stats for ${nickname}`)
                        .setColor('6678B8')
                        .setDescription("Type **!champions [@player]** to view another player's champion stats")
                        .addFields({
                                name: "Champion",
                                value: championDataToEmbed(embedData, 'champion'),
                                inline: true
                            }, {
                                name: "Total MMR gain/loss",
                                value: championDataToEmbed(embedData, 'mmr'),
                                inline: true
                            },
                            {
                                name: "Win/Loss",
                                value: championDataToEmbed(embedData, 'winLoss'),
                                inline: true
                            })

                    message.channel.send(embed);
                } else {
                    message.channel.send('You have/This player has not played any champions yet')
                }
                break
            case 'help':
            case 'commands':
                message.react('❓');

                embed = new EasyEmbedPages(message.channel, {
                    color: 'ffffff',
                    footer: "Note: Some commands could be restricted by your server permissions.",
                    allowStop: true,
                    time: 300000,
                    ratelimit: 1500,
                    pages: [
                        {
                            title: ':question: Pre-game commands :question;',
                            description: convertHelpToEmbed(1)
                        },
                        {
                            title: ':question: Post-game commands :question;',
                            description: convertHelpToEmbed(2)
                        },
                        {
                            title: ':question: Statistical commands :question;',
                            description: convertHelpToEmbed(3)
                        },
                        {
                            title: ':question: Match history related commands :question;',
                            description: convertHelpToEmbed(4)
                        },
                        {
                            title: ':question: Misc. :question;',
                            description: convertHelpToEmbed(5)
                        },
                    ]
                })


                embed.start({
                    channel: message.channel,
                    author: message.author
                })
                break
            case 'changeimg':
                message.react('🐶');

                if (message.member.hasPermission('ADMINISTRATOR')) {
                    let image = message.attachments.first().url;
                    if (image) {
                        client.user.setAvatar(image);
                        message.channel.send('Accepted: Please wait a moment')
                    } else {
                        message.channel.send('Please attach an image.')
                    }
                } else {
                    message.channel.send('You are not authorized to use this command.')
                }

                break
            case 'graph':
            case 'mmr_history':
            case 'chart': {
                message.react('💹');

                let user_id;
                let nickname;
                let user;

                if (args.length == 0) {
                    user_id = message.author.id
                    nickname = message.member.displayName

                    user = await getUser(user_id);
                    if (user !== null){
                        if (user.matchHistory.length === 0){
                            message.channel.send("You haven't played any matches.");
                            break
                        }
                    } else{
                        message.channel.send('Error: User not found.');
                        break
                    }
                } else {
                    let role = formatRoles([args[0]])

                    if (role[0]) {
                        let img = await generateRoleGraph(role[0], client)

                        if (img != "error") {
                            await message.channel.send({files: [`${img}`]})
                            fs.unlink(`${img}`, (e) => {
                            })
                        } else {
                            message.channel.send("Error: something went wrong! There probably hasn't been any games played at all.")
                        }
                        break
                    }

                    user_id = args[0].slice(3, args[0].length - 1)

                    try {
                        nickname = message.guild.member(user_id).displayName
                    } catch (e) {
                        nickname = 'error';
                    }
                }

                let img = await generateGraph(user_id, nickname)

                if (img != "error") {
                    await message.channel.send({files: [`${img}`]});
                    fs.unlink(`${img}`, (e) => {
                    })
                } else {
                    message.channel.send(`Something went wrong! Does ${args.join(" ")} exist?`)
                }

                break
            }
            case 'teammates':
                message.react('🤤');
                if (args.length < 1) {
                    user_id = message.author.id;
                } else {
                    user_id = args[0].slice(3, args[0].length - 1);
                }
                nickname = message.guild.member(user_id).displayName;
                embedData = await getTeammateStats(user_id);
                pages = await convertTeammateDataToEmbed(embedData);
                let teammateEmbed = new EasyEmbedPages(message.channel,
                    {
                        title: `:clown: Teammate stats for ${nickname} :exploding_head:`,
                        description: 'See your best and worst teammates!',
                        color: 'AFFDD7',
                        pages: pages,
                        allowStop: true,
                        time: 300000,
                        ratelimit: 1500
                    })

                teammateEmbed.start({
                    channel: message.channel,
                    person: message.author
                })

                break
            default:
                message.channel.send('Ok, and what is that supposed to mean? Perhaps consider getting some !help.')
                message.channel.send({files: ['https://cdn.discordapp.com/attachments/863014796915638296/869315149738172506/kiwihelp.jpg']});
        }
    }
})

client.on("clickButton", async (button) => {
    switch (button.id) {
        case "accept_game": {
            if (button.clicker.id in player_states) {
                player_states[button.clicker.id].state = "accept"
                let msg = getMatchMessageEmbed(current_match, player_states)

                match_message.edit(`||${msg.msg}||`, msg.embed)

                if (countReadyPlayers(player_states) >= 10 && match_playing === false) {
                    let msg = getMatchMessageEmbed(current_match, player_states, true)
                    await button.channel.send(`||${msg.msg}||`, msg.embed);
                    await button.channel.send("Please insert your lineups using !lineup [top] [jgl] [mid]...");
                    match_playing = true

                    await match_message.delete()

                    await clearQueue()

                }
            }

        }

            break
        case "decline_game": {
            if (button.clicker.id in player_states) {
                player_states[button.clicker.id].state = "decline"
                if (countDeclinedPlayers(player_states) >= 3 && match_playing === false) {
                    await match_message.delete();
                    button.channel.send('Match declined. :cry:');
                    break
                }
                let msg = getMatchMessageEmbed(current_match, player_states)

                match_message.edit(`||${msg.msg}||`, msg.embed)
            }

        }
            break
        case "confirm_win": {
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

                if (count >= 6) {
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
        case "deny_win": {
            if (button.clicker.id in player_states) {
                player_states[button.clicker.id].state = "decline"

                let msg = getMatchEndMessageEmbed(initiator, winner, player_states)

                match_message.edit(`||${msg.msg}||`, msg.embed);

                let count = 0

                Object.keys(player_states).forEach(player => {
                    if (player_states[player].state === "decline") {
                        count++
                    }
                })

                if (count >= 6) {
                    try {await match_message.delete()}
                    catch (e) {
                        
                    }

                    button.channel.send('Confirm win deleted.');

                }
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
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
}).then(() => {
    client.login(process.env.BOT_TOKEN)
})

