import Game from "../models/game.js";
import {emojiNumberSelector} from "../helpers/emoji.js";

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

export const createGame = async (gameData) => {
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
    return Game.find({matchID: matchID})
}

export const getMatchHistoryData = async (matches, userID) => {
    let dates = [],
        roles = [],
        champions = [],
        winLoss = [],
        mmrGainLoss = [];

    for (let match of matches) {
        let matchData = await getGameByMatchID(match);
        matchData = matchData[0]; //for some reason Mongoose passes it back in a list, weird af
        dates.push(matchData.date);
        for (let player of matchData.players) {
            if (player.id == userID){
                roles.push(player.role);
                champions.push(player.champion);
                mmrGainLoss.push(player.afterGameElo - player.previousElo)
                if (player.team === match.winner){
                    winLoss.push('win');
                } else {winLoss.push('loss')}
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
                if (isNaN(values[index])){
                    embedString = embedString + values[index].toUpperCase() + '\n';
                } else {
                    let numberEmoji = emojiNumberSelector(parseInt(index) + 1);
                    embedString = embedString + numberEmoji + values[index] + '\n';
                }
                break
            case 'number':
                if (0 < values[index]){
                    embedString = embedString + '+' + values[index].toString() + '\n';
                }
                break
            default:
                embedString = embedString + values[index].toDateString() + '\n';
        }

        if (typeof index === "string") {

        } else {
            embedString = embedString + index.toDateString() + '\n'; //horribly coded, but works because embed doesnt pick up empty lines xd
        }
    }

    if (embedString === ''){
        embedString = "No games found"
    }
    return embedString
}
