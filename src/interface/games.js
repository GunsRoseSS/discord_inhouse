import {MessageEmbed} from "discord.js"

import Game from "../models/game.js";

import {getUser, getUserElo, getUserMatchHistory} from "./user.js"
import {calculateNewElo} from "./matchup.js";

import { formatDate } from "../helpers/format.js"
import {emojiNumberSelector, getRoleEmoji} from "../helpers/emoji.js"

import { ordinal } from "openskill";

export const createGame = async (game, champs, winner) => {

    let newGame = new Game({
        _id: (await Game.find()).length + 1,
        matchID: 0,
        players: await convertToPlayerList(game, champs, winner),
        winner: winner,
        date: new Date().setUTCHours(0,0,0,0)
    })

    await newGame.save()

    for (let player of newGame.players) {
        let user = await getUser(player.id)

        user.matchHistory.push(newGame._id)
        user.roles[player.role].mmr = player.afterGameElo

        let location = -1
        for (let i = 0; i < user.championStats.length; i++) {
            if (user.championStats[i].name === player.champion) {
                location = i
                break
            }
        }

        if (location == -1) {
            location = user.championStats.length
            user.championStats.push({name: player.champion, mmrDiff: 0, wins: 0, losses: 0})
        }

        if (player.team == winner) {
            user.roles[player.role].wins += 1
            user.championStats[location].wins += 1

        } else {
            user.roles[player.role].losses += 1
            user.championStats[location].losses += 1
        }

        user.championStats[location].mmrDiff += Math.floor(ordinal(player.afterGameElo) - ordinal(player.previousElo))


        await user.save()
    }

    return newGame
}

const convertToPlayerList = async (game, champs, winner) => {
    let blue = []
    let red = []

    const roles = ["top", "jgl", "mid", "adc", "sup"]

    let originalElos = {"blue": [], "red": []}
    let updatedElos = []

    for (let i = 0; i < game.length; i++) {
        originalElos.blue.push(await getUserElo(game[i].player1, roles[i]))
        originalElos.red.push(await getUserElo(game[i].player2, roles[i]))
    }

    updatedElos = calculateNewElo(originalElos.blue, originalElos.red, winner == "BLUE" ? true : false)

    for (let i = 0; i < game.length; i++) {

        blue.push({
            id: game[i].player1,
            team: "BLUE",
            role: roles[i],
            champion: champs["BLUE"][i],
            previousElo: originalElos.blue[i],
            afterGameElo: updatedElos.blue[i]
        })

        red.push({
            id: game[i].player2,
            team: "RED",
            role: roles[i],
            champion: champs["RED"][i],
            previousElo: originalElos.red[i],
            afterGameElo: updatedElos.red[i]
        })
    }

    return blue.concat(red)
}

export const getGameEmbed = (game) => {
    let msg_blue = ""
    let msg_red = ""
    let msg_ping = ""

    for (let i = 0; i < game.players.length; i++) {
        let player = game.players[i]
        let elo_diff = Math.floor(ordinal(player.afterGameElo) - ordinal(player.previousElo))
        if (Math.floor(i / 5) == 0) {
            msg_blue += `${getRoleEmoji(player.role)} \u2800 <@${player.id}> : ${player.champion.split(/(?=[A-Z])/).join(" ")} **${elo_diff < 0 ? "-" : "+"}${Math.abs(elo_diff)}** \n`
        } else {
            msg_red += `${getRoleEmoji(player.role)} \u2800 <@${player.id}> : ${player.champion.split(/(?=[A-Z])/).join(" ")} **${elo_diff < 0 ? "-" : "+"}${Math.abs(elo_diff)}** \n`
        }
        msg_ping += `<@${player.id}>`
    }

    let game_embed = new MessageEmbed()
        .setTitle(`Match ${game._id} results`)
        .setColor('#7da832')

    game_embed.addField("BLUE", msg_blue, true)
    game_embed.addField("RED", msg_red, true)

    game_embed.setFooter(`Played on ${formatDate(game.date)}`)

    return {msg: msg_ping, embed: game_embed}

}

export const getGameByMatchID = async (matchID) => {
    return Game.findOne({matchID: matchID})
}

export const getGameByID = async (id) => {
    return Game.findById(id)
}

export const updateMatchID = async (gameID, matchID) => {
    return Game.findByIdAndUpdate(gameID, {matchID: matchID}, {useFindAndModify: false})
}

export const getAllGames = async () => {
    return Game.find()
}

export const getUserGames = async (id) => {
    let history = await getUserMatchHistory(id)

    if (history.length === 0){
        return []
    }

    history = history.map(match => {
        return {_id: match}   
    })

    return Game.find({$or: history})
}

export const getMatchHistoryData = async (id) => {
    let dates = [],
        roles = [],
        champions = [],
        winLoss = [],
        mmrGainLoss = [];

    let matches = await getUserMatchHistory(id)

    let newMatches = []

    for (let match of matches) {
        let matchData = await getGameByID(match)
        let player = matchData.players.find(element => element.id == id)

        dates.push(matchData.date)
        roles.push(player.role)
        champions.push(player.champion)
        mmrGainLoss.push(Math.floor(ordinal(player.afterGameElo) - ordinal(player.previousElo)))

        winLoss.push(player.team == matchData.winner ? "win" : "loss")

        if (matchData.matchID == 0) {
            newMatches.push(matchData._id)
        } else {
            newMatches.push(matchData.matchID)
        }
    }

    return {
        matches: newMatches,
        dates: dates,
        roles: roles,
        champions: champions,
        winLoss: winLoss,
        mmrGainLoss: mmrGainLoss
    }
}

export const convertMatchHistoryToEmbed = (name, historyData) => {

    historyData.roles = historyData.roles.map(role => {
        return getRoleEmoji(role)
    })

    historyData.dates = historyData.dates.map(date => {
        return formatDate(date)
    })

    historyData.champions = historyData.champions.map(champ => {
        return champ.split(/(?=[A-Z])/).join(" ")
    })

    return paginateHistoryEmbed(historyData)
}

export const paginateHistoryEmbed = (historyData) => {
    let pages = [];

    let done = false;
    let loopCounter = 0;

    while (!done) {
        let subList = {
            loop: loopCounter,
            matches: [],
            dates: [],
            roles: [],
            champions: [],
            winLoss: [],
            mmrGainLoss: []
        }
        let counter = 0;
        while (historyData.matches.length !== 0 && counter < 5) {
            let embedNumber = loopCounter * 5 + counter + 1
            subList.matches.push(emojiNumberSelector(embedNumber) + ': ' + historyData.matches[0]);
            subList.dates.push(historyData.dates[0]);
            subList.roles.push(historyData.roles[0]);
            subList.champions.push(emojiNumberSelector(embedNumber) + ': ' + historyData.champions[0]);
            subList.winLoss.push(historyData.winLoss[0]);
            subList.mmrGainLoss.push(`${historyData.mmrGainLoss[0] < 0 ? "-" : "+"}${Math.abs(historyData.mmrGainLoss[0])}`);

            historyData.matches.shift();
            historyData.dates.shift();
            historyData.roles.shift();
            historyData.champions.shift();
            historyData.winLoss.shift();
            historyData.mmrGainLoss.shift();

            counter += 1;
        }

        pages.push({
            fields: [
                {
                    name: 'Match ID',
                    value: subList.matches.join("\n"),
                    inline: true
                },
                {
                    name: 'Date',
                    value: subList.dates.join("\n"),
                    inline: true
                },
                {
                    name: 'Role',
                    value: subList.roles.join("\n"),
                    inline: true
                },
                {
                    name: 'Champion',
                    value: subList.champions.join("\n"),
                    inline: true
                },
                {
                    name: 'Win/Loss',
                    value: subList.winLoss.join("\n"),
                    inline: true
                },
                {
                    name: 'MMR gain/loss',
                    value: subList.mmrGainLoss.join("\n"),
                    inline: true
                },
                {
                    name: 'How to view Match History',
                    value: 'In order to view your match, click on the link below and log in. Then,' +
                        'click on any of your matches and replace the FIRST set of numbers with your match ID.',
                    inline: false
                },
                {
                    name: 'Link',
                    value: 'https://matchhistory.euw.leagueoflegends.com/en/',
                    inline: false
                }
            ]
        })

        loopCounter += 1
        if (historyData.matches.length === 0) {
            done = true;
        }
    }
    return pages
}
