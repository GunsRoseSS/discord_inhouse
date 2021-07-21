import Game from "../models/game.js";
import {emojiNumberSelector, getRoleEmoji} from "../helpers/emoji.js";
import { getUserElo } from "./user.js";

import { MessageEmbed } from "discord.js"

import { calculateNewElo } from "./matchup.js";

import {checkPositive} from "../helpers/format.js";

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


/*
    let newGame = new Game({
        matchID: 5372475920,
        players: [
            {
                id: '139392064386367489',
                team: 'red',
                role: 'top',
                champion: 'poppy',
                previousElo: 550,
                afterGameElo: 570
            }
        ],
        winner: 'red',
        date: new Date().setHours(0, 0, 0, 0)
    })

    */

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
            team: "blue",
            role: roles[i],
            champion: champs["BLUE"][i],
            previousElo: elo1,
            afterGameElo: calculateNewElo(elo1, elo2, winner == "BLUE" ? true : false)
        })

        red.push({
            id: game[i].player2,
            team: "red",
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
        matchID: 0,
        players: await convertToPlayerList(game, champs, winner),
        winner: winner,
        date: new Date().setHours(0, 0, 0, 0)
    })
    
    await newGame.save()

    return newGame
}

export const patchGame = async (gameData) => {
    let filter = {} //not sure whats best to find the game
    let update = {
        //all the fields that have to be updated
    }
    return Game.findOneAndUpdate(filter, update, {new: true})
}

export const getGameByMatchID = async (matchID) => {
    return Game.findOne({matchID: matchID})
}

export const getAllGames = async () => {
    return Game.find()
}

export const getMatchHistoryData = async (matches, userID) => {
    let dates = [],
        roles = [],
        champions = [],
        winLoss = [],
        mmrGainLoss = [];

    for (let match of matches) {
        let matchData = await getGameByMatchID(match);
        dates.push(matchData.date);
        for (let player of matchData.players) {
            if (player.id == userID) {
                roles.push(player.role);
                champions.push(player.champion);
                mmrGainLoss.push(player.afterGameElo - player.previousElo)
                if (player.team === match.winner) {
                    winLoss.push('win');
                } else {
                    winLoss.push('loss')
                }
                break //for efficiency
            }
        }
    }

    return {
        matches: matches,
        dates: dates,
        roles: roles,
        champions: champions,
        winLoss: winLoss,
        mmrGainLoss: mmrGainLoss
    }
}

export const convertMatchHistoryToEmbed = async (values) => {
    let embedString = '';
    for (let index in values) { //horribly coded, but works because embed doesnt pick up empty lines xd
        switch (typeof values[index]) {
            // TODO: ADD EMOJIS TO ROLES AND WIN/LOSS
            case 'string':
                if (isNaN(values[index])) {
                    embedString = embedString + values[index].toUpperCase() + '\n';
                } else {
                    let numberEmoji = emojiNumberSelector(parseInt(index) + 1);
                    embedString = embedString + numberEmoji + values[index] + '\n';
                }
                break
            case 'number':
                embedString = embedString + '+' + checkPositive(values[index]).toString() + '\n';

                break
            default:
                embedString = embedString + values[index].toDateString() + '\n';
        }

        if (typeof index === "string") {

        } else {
            embedString = embedString + index.toDateString() + '\n'; //horribly coded, but works because embed doesnt pick up empty lines xd
        }
    }

    if (embedString === '') {
        embedString = "No games found"
    }
    return embedString
}
