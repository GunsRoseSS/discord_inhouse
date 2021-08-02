import mongoose from "mongoose";
import dotenv from "dotenv";
import {Client} from "discord.js";
import EasyEmbedPages from 'easy-embed-pages';
import disbut from "discord-buttons";
import fs from "fs";

import {createUser, getUser} from "./interface/user.js"
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
    getGameByMatchID, getAllGames, getMetaEmbed
} from "./interface/games.js"

import {convertHelpToEmbed} from "./interface/help.js"
import {generateGraph, generateRoleGraph} from "./interface/graph.js"
import {findMatch} from "./interface/matchmaking.js"
import {formatChampions, formatRoles} from "./helpers/format.js";
import {convertTeammateDataToEmbed, getTeammateStats} from "./interface/teammates.js";

import {getAllRankingEmbed, getUserRankEmbed, getRoleRankEmbed, getAverageRankingData} from "./interface/ranking.js"
import {fetchGuildMemberNicknames, getMemberNickname} from "./helpers/discord.js";

import {createEmbed, deleteEmbed, handleButtonInteration, handleMenuInteration, updateEmbeds} from "./interface/embed.js"
import { getPlayerChampionsEmbedv2, getPlayerChampionEmbedv2, getAllChampionsEmbedv2, getAllPlayerChampionEmbedv2 } from "./interface/champion.js";

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
let userList = undefined;

client.on("ready", async() => {
    console.log("Bot started, fetching guild members")
    userList = await fetchGuildMemberNicknames(client);
    console.log('Loaded!');
    setInterval(updateEmbeds, 60000)
})

client.on("guildMemberAdd", async() => {
    userList = await fetchGuildMemberNicknames(client);
})

client.on("message", async (message) => {
    if (message.author.bot) return
    let user_id, user, embedData, nickname, embed, champion, pages;
    if (message.content.startsWith("!")) {
        var [cmd, ...args] = message.content.replace(/,/g, '').trim().substring(1).toLowerCase().split(/\s+/);

        switch (cmd) {
            case "test":
                {
                    let data = {buttons: [
                        {id: "btn1", label: "Button 1", callback: (embed) => deleteEmbed(embed)},
                        {id: "btn2", label: "Button 2", callback: (embed) => console.log("Button 2 clicked")},
                        {id: "btn3", label: "Button 3", callback: (embed) => console.log(embed.id)},
                    ]}

                    let embed = createEmbed(data)

                    embed.send(message.channel)
                }
                break
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
                }


                user = await getUser(user_id);

                if (!user) {
                    user = await createUser(user_id);
                }

                let roles = formatRoles(args);

                if (roles.length != 0) {
                    await addToQueue(user_id, roles);
                    (await getQueueEmbed()).send(message.channel)
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
                    (await getQueueEmbed()).send(message.channel)
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

                    console.log("Finding match")

                    current_match = await findMatch()


                    if (current_match != null) {
                        console.log("Match found")
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
            case "past":
            case 'history':
                message.react('📖')

                user_id = message.author.id
                nickname = getMemberNickname(user_id, userList)

                if (args.length > 0) {
                    message.channel.send('You can only look up history for yourself (dabs)');
                    break
                }

                embedData = await getMatchHistoryData(user_id)

                if (!embedData.matches[0]) {
                    message.channel.send('You have not played any matches yet.')
                    break
                }

                pages = convertMatchHistoryToEmbed(nickname, embedData)
                embed = new EasyEmbedPages(message.channel,
                    {
                        title: `:book: Match history for ${nickname} :book:`,
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
                    let success = await updateMatchID(args[0], args[1]);
                    if (success) {
                        message.channel.send(`Match id set for game ${args[0]} -> ${args[1]}`)
                    } else {
                        message.channel.send(`Game id ${args[0]} not found, do you need a pair of glasses?`)
                    }
                } else {
                    message.channel.send("No, that's not how that works. !link [matchID] [RiotID]")
                }
              break
            case 'rank':
                {
                    message.react('👑');

                    let username
                    let id

                    if (args.length == 0) {
                        id = message.author.id;
                        username = getMemberNickname(id, userList);
                    } else {
                        id = args[0].slice(3, args[0].length - 1)

                        try {
                            username = getMemberNickname(id, userList);
                        } catch (e) {
                            message.channel.send("You messed something up you donkey! Is this person even in this server?")
                            return
                        }                  
                    }
                    
                    if (await getUser(id)) {
                        message.channel.send(await getUserRankEmbed(id,username))
                    } else {
                        message.channel.send("Huh? You're trying to get a players rank before they've even used the bot? You might need some !help")
                    }
                }
                break
            case "notepic":
            case "riot":
                message.channel.send(":poop:")
                break
            case 'ranking':
                {
                    message.react('🏅');

                    if (args.length === 0) {
                        let embed = new EasyEmbedPages(message.channel,
                            {
                                color: 'ff77ff',
                                title: `Ranking for all roles`,
                                description: 'Type !ranking [role] for a specific role',
                                pages: await getAllRankingEmbed(),
                                allowStop: false,
                                time: 300000,
                                ratelimit: 500
                            })
                        embed.start({
                            channel: message.channel,
                            author: message.author
                        })
                    } else {
                        if (args[0].toLowerCase() === 'average') {
                            let e = await getAverageRankingData();

                            embed = createEmbed(e);

                            if (embed){
                                embed.send(message.channel, message.author)
                                /*
                                embed.start({
                                    channel: message.channel,
                                    author: message.author
                                })
                                */
                                break
                            } else {
                                message.channel.send('No games have been played so far.')
                                break
                            }
                        } else {
                            let role = formatRoles([args[0]])

                            if (role.length > 0) {
                                let embed = new EasyEmbedPages(message.channel,
                                    {
                                        color: 'aa77ff',
                                        title: `Ranking for ${role[0]}`,
                                        description: 'Type !ranking for a ranking of all roles',
                                        pages: await getRoleRankEmbed(role[0]),
                                        allowStop: false,
                                        time: 300000,
                                        ratelimit: 500
                                    })
                                embed.start({
                                    channel: message.channel,
                                    author: message.author
                                })
                            } else {
                                message.channel.send({files: ["https://cdn.discordapp.com/attachments/868935612709888042/868935649150005268/20181028_2027572.jpg"]})
                            }
                        }
                    }
                }
                break
            case 'champ':
            case 'champion':
                message.react('🧙‍♀️');
                {
                    if (args.length === 0) {
                        message.channel.send("You messed up the command, sunshine. !champion [champion]")
                    } else {
                        let user_id = message.author.id

                        if (args.length > 1) {
                            if (args[1] !== "all") {
                                user_id = args[1].substring(3,args[1].length - 1)
                            }
                        }

                        if (args[1] !== "all") {
                            let embed = await getPlayerChampionEmbedv2(user_id, args[0], userList)

                            if (embed) {
                                embed = createEmbed(embed)
                                embed.send(message.channel, message.author.id)
                            } else {
                                message.channel.send("This player has not played this champion before")
                            }
                        } else {
                            let embed = await getAllPlayerChampionEmbedv2(args[0])

                            if (embed) {
                                embed = createEmbed(embed)
                                embed.send(message.channel, message.author.id)
                            } else {
                                message.channel.send("Could not recognise champion")
                            }
                        }

                       
                    }

                    
                }
                break
            case 'champs':
            case 'champions':
                {
                    message.react('🧙‍♂️');

                    let user_id = message.author.id

                    if (args.length > 0) {
                        if (args[0] !== "all") {
                            user_id = args[0].substring(3, args[0].length - 1)
                        }
                        
                    }

                    if (args[0] !== "all") {
                        let data = await getPlayerChampionsEmbedv2(user_id, userList)

                        if (data != null) {
                            let embed = createEmbed(data)
        
                            embed.send(message.channel, message.author.id)
                        } else {
                            message.channel.send("This user hasn't played any games")
                        }                 
                    } else {
                        let data = await getAllChampionsEmbedv2()

                        let embed = createEmbed(data)
                        embed.send(message.channel, message.author.id)
                    }
                   
                }
                break
            case 'meta':
            case 'champstats':
                let type;
                switch (args.length){
                    case 0:
                        type = 'mmr'
                        break
                    case 1:
                        type = args[0].toLowerCase();
                        break
                    case 2:
                        if (args[1].toLowerCase() === 'low') {
                            type = 'reverse_' + args[0].toLowerCase();
                        } else {
                            type = args[0].toLowerCase();
                        }
                }
                if (type !== 'mmr' && type !== 'reverse_mmr' && type !== 'pickrate' && type !== 'reverse_pickrate'){
                    message.channel.send("I don't know what the fuck you just tried to do, but you did it wrong. Very wrong. Try again: !meta ?[mmr/pickrate] ?[low/high]")
                    break
                }
                let games = await getAllGames();

                let e = getMetaEmbed(games, type);

                embed = createEmbed(e)

                if (embed){
                    embed.send(message.channel, message.author)
                    /*
                    embed.start({
                        channel: message.channel,
                        author: message.author
                    })
                    */
                    break
                } else {
                    message.channel.send('No games have been played so far.')
                    break
                }
            case 'help':
            case 'commands':
                message.react('❓');

                embed = new EasyEmbedPages(message.channel, {
                    color: 'ffffff',
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
                            title: ':question: Statistical commands part 1 :question;',
                            description: convertHelpToEmbed(3)
                        },
                        {
                            title: ':question: Statistical commands part 2 :question;',
                            description: convertHelpToEmbed(4)
                        },
                        {
                            title: ':question: Match history related commands :question;',
                            description: convertHelpToEmbed(5)
                        },
                        {
                            title: ':question: Misc. :question;',
                            description: convertHelpToEmbed(6)
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
                    nickname = getMemberNickname(user_id, userList);

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
                        let img = await generateRoleGraph(role[0], userList)

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
                        nickname = getMemberNickname(user_id, userList);
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
                nickname = getMemberNickname(user_id, userList);
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
            case "uwu":
                {
                    message.channel.send("OwO", {files: ["https://cdn.discordapp.com/attachments/287347623139082240/871056038927941653/alex_owo.png"]})
                }
                break
            case "turboint":
            case "int":
            case "shame":
            case "l9":
                {
                    message.channel.send({files: ["https://cdn.discordapp.com/attachments/287347623139082240/871055953003425863/l9.png"]})
                }
                break
            case "dab":
            case "cancer":
                message.channel.send('I hate you for making me do this.', {files: ["https://cdn.discordapp.com/attachments/863014796915638296/871739279515213824/dabgif.gif"]})
                break
            default:
                message.channel.send('Ok, and what is that supposed to mean? Perhaps consider getting some !help.')
                message.channel.send({files: ['https://cdn.discordapp.com/attachments/863014796915638296/869315149738172506/kiwihelp.jpg']});
        }
    }
})

client.on("clickMenu", async (menu) => {
    handleMenuInteration(menu)
    menu.reply.defer()
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

    handleButtonInteration(button)

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

