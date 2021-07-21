import Game from "../models/game.js";
import {getRoleEmoji} from "../helpers/emoji.js";
import { getUser, getUserElo, getUserMatchHistory } from "./user.js";

import { MessageEmbed } from "discord.js"

import { calculateNewElo } from "./matchup.js";

import { updateRoleRanking } from "./ranking.js";

// import * as https from "node/https";
//
// //gets match data from riot api, probably deprecated soon
// export const getMatchData = async (matchID) => {
//     const options = {
//         hostname: 'europe.api.riotgames.com',
//         path: `/lol/match/v4/matches/${matchID}`,
//         method: 'GET',
//         headers: {
//             'X-Riot-Token': process.env.RIOT_KEY
//         }
//     }
//
//     https.request(options, (res) => {
//         let body = '';
//
//         res.on('data', function (chunk) {
//             body += chunk
//         })
//
//         res.on('end', function (chunk) {
//             return JSON.parse(body)
//         })
//     }).on('error', (err) => {
//         console.log(err);
//         return 'error'
//     })
// }

const dateOrdinal = (d) => {
        return d+(31==d||21==d||1==d?"st":22==d||2==d?"nd":23==d||3==d?"rd":"th")
};

const convertToPlayerList = async (game, champs, winner) => {
    let blue = []
    let red = []

    const roles = ["top", "jgl", "mid", "adc", "sup"]

    for (let i=0;i<game.length;i++) {
        const elo1 = await getUserElo(game[i].player1, roles[i])
        const elo2 = await getUserElo(game[i].player2, roles[i])

        blue.push({
            id: game[i].player1,
            team: "BLUE",
            role: roles[i],
            champion: champs["BLUE"][i],
            previousElo: elo1,
            afterGameElo: calculateNewElo(elo1, elo2, winner == "BLUE" ? true : false)
        })

        red.push({
            id: game[i].player2,
            team: "RED",
            role: roles[i],
            champion: champs["RED"][i],
            previousElo: elo2,
            afterGameElo: calculateNewElo(elo2, elo1, winner == "RED" ? true : false)
        })
    }

    return blue.concat(red)
}

export const getGameEmbed = (game) => {
    let msg_blue = ""
    let msg_red = ""
    let msg_ping = ""

    for (let i=0;i<game.players.length;i++) {
        let player = game.players[i]
        let elo_diff = player.afterGameElo - player.previousElo
        if (Math.floor(i / 5) == 0) {
            msg_blue += `${getRoleEmoji(player.role)} \u2800 <@${player.id}> : ${player.champion.split(/(?=[A-Z])/).join(" ")} **${elo_diff < 0 ? "-" : "+"}${Math.abs(elo_diff)}** \n`
        } else {
            msg_red += `${getRoleEmoji(player.role)} \u2800 <@${player.id}> : ${player.champion.split(/(?=[A-Z])/).join(" ")} **${elo_diff < 0 ? "-" : "+"}${Math.abs(elo_diff)}** \n`
        }
        msg_ping += `<@${player.id}>`
    }

    let game_embed = new MessageEmbed()
    .setTitle(`Match ${game._id} results`)

    game_embed.addField("BLUE", msg_blue, true)
	game_embed.addField("RED", msg_red, true)

    let date = game.date.toString()
    let date_p1 = date.substring(0,9)
    let date_p2 = dateOrdinal(date.substring(9,10))
    let date_p3 = date.substring(10,15)

    game_embed.setFooter(`Played on ${date_p1 + date_p2 + date_p3}`)

    return {msg: msg_ping, embed: game_embed}

}

export const createGame = async (game, champs, winner) => { 

    let newGame = new Game({
        _id: (await Game.find()).length + 1,
        matchID: 0,
        players: await convertToPlayerList(game, champs, winner),
        winner: winner,
        date: new Date()
    })
    
    await newGame.save()

    for (let player of newGame.players) {
        let user = await getUser(player.id)

        user.matchHistory.push(newGame._id)
        user.roles[player.role].mmr += (player.afterGameElo - player.previousElo)

        let location = -1
        for (let i=0;i<user.championStats.length;i++) {
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

        user.championStats[location].mmrDiff += (player.afterGameElo - player.previousElo)
        
        
        await user.save()
    }

    updateRoleRanking()

    return newGame
}

export const getGameByMatchID = async (matchID) => {
    return Game.findOne({matchID: matchID})
}

export const getGameByID = async (id) => {
    return Game.findById(id)
}

export const updateMatchID = async (gameID, matchID) => {
    await Game.findByIdAndUpdate(gameID, {matchID: matchID})
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
        mmrGainLoss.push(player.afterGameElo - player.previousElo)

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
    let history_embed = new MessageEmbed()
    .setTitle(`:book: Match history for ${name} :book:`)
	.setColor('0099ff')

    historyData.roles = historyData.roles.map(role => {
            switch (role) {
                case "top":
                    return "Top"
                case "jgl":
                    return "Jungle"
                case "mid":
                    return "Middle"
                case "adc":
                    return "Adc"
                case "sup":
                    return "Support"
            }
    })

    historyData.dates = historyData.dates.map(date => {
        let d = date.toString()
        let date_p1 = d.substring(0,9)
        let date_p2 = dateOrdinal(d.substring(9,10))
        let date_p3 = d.substring(10,15)

        return date_p1 + date_p2 + date_p3
    })

    historyData.champions = historyData.champions.map(champ => {
        return champ.split(/(?=[A-Z])/).join(" ")
    })


    history_embed.addField("Match ID", historyData.matches.join("\n"),true)
    history_embed.addField("Date", historyData.dates.join("\n"), true)
    history_embed.addField("Role", historyData.roles.join("\n"), true)
    history_embed.addField("Champion", historyData.champions.join("\n"), true)
    history_embed.addField("Win/Loss", historyData.winLoss.join("\n"), true)
    history_embed.addField("MMR gain/loss", historyData.mmrGainLoss.join("\n"), true)

    history_embed.addField('How to view Match History',
						'In order to view your match, click on the link below and log in. Then,' +
						'click on any of your matches and replace the FIRST set of numbers with your match ID.', false)
    history_embed.addField('Link', 'https://matchhistory.euw.leagueoflegends.com/en/', false)

    return history_embed
}
