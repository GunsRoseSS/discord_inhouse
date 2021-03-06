import {getAllGames, getUserGames} from "./games.js";
import {quickSortPlayers} from "../helpers/sort.js";
import {emojiNumberSelector, emojiGainedSelector, emojiOpponentGainedSelector} from "../helpers/emoji.js";
import {checkPositive} from "../helpers/format.js";

import { ordinal } from "openskill";

export const getTeammateStats = async (id, flip = false) => {
    let userGames = await getUserGames(id)

    let data = userGames.reduce((out, game) => {
        let index = game.players.findIndex(element => element.id === id)
        let user = game.players[index]
        let mmrDiff = Math.floor(ordinal(user.afterGameElo) - ordinal(user.previousElo))
        let win = (index < 5 && game.winner === "BLUE") || (index >= 5 && game.winner === "RED")

        let start = index < 5 ? (flip ? 5 : 0) : (flip ? 0 : 5)
        let end = index < 5 ? (flip ? 10 : 5) : (flip ? 5 : 10)
        for (let i=start;i<end;i++) {
            let player = game.players[i]
            if (player.id !== id) {
                if (player.id in out) {
                    out[player.id].gained += mmrDiff
                    out[player.id].wins += win ? 1 : 0
                    out[player.id].losses += win ? 0 : 1
                } else {
                    out[player.id] = {gained: mmrDiff, wins: win ? 1 : 0, losses: win ? 0 : 1}
                }
            }
        }
        return out  
    }, {})

    return Object.keys(data).sort((player1, player2) => {
        if (data[player1].gained > data[player2].gained) {
            return flip ? 1 : -1
        } else if (data[player1].gained < data[player2].gained) {
            return flip ? -1 : 1
        }
        return 0
    }).reduce((out, player) => {
        return [...out,({id: player, mmr: data[player].gained, wins: data[player].wins, losses: data[player].losses})]
    }, [])
}

export const convertTeammateDataToEmbed = async (teammateData) => {
    for (let teammate of teammateData){
        teammate.id = "<@" + teammate.id + ">";
    }

    let pages = [];

    let done = false;
    let loopCounter = 0;

    while (!done) {
        let subList = {
            loop: loopCounter,
            names: [],
            winLoss: [],
            mmrGainLoss: []
        }
        let counter = 0;
        while (teammateData.length !== 0 && counter < parseInt(process.env.EMBED_PAGE_LENGTH)) {
            let embedNumber = loopCounter * 10 + counter + 1
            subList.names.push(emojiNumberSelector(embedNumber) + ': ' + teammateData[0].id + ': ' + emojiGainedSelector(teammateData[0].mmr));
            subList.winLoss.push(teammateData[0].wins + "/" + teammateData[0].losses);
            subList.mmrGainLoss.push(checkPositive(teammateData[0].mmr));

            teammateData.shift();

            counter += 1;
        }

        pages.push({
            fields: [
                {
                    name: 'Teammate Name',
                    value: subList.names.join("\n"),
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
                }
            ]
        })

        loopCounter += 1;
        if (teammateData.length === 0) {
            done = true;
        }
    }
    return pages
}

export const convertOpponentDataToEmbed = async (opponentData) => {
    for (let opponent of opponentData){
        opponent.id = "<@" + opponent.id + ">";
    }

    let pages = [];

    let done = false;
    let loopCounter = 0;

    while (!done) {
        let subList = {
            loop: loopCounter,
            names: [],
            winLoss: [],
            mmrGainLoss: []
        }
        let counter = 0;
        while (opponentData.length !== 0 && counter < parseInt(process.env.EMBED_PAGE_LENGTH)) {
            let embedNumber = loopCounter * parseInt(process.env.EMBED_PAGE_LENGTH) + counter + 1
            subList.names.push(emojiNumberSelector(embedNumber) + ': ' + opponentData[0].id + ': ' + emojiOpponentGainedSelector(opponentData[0].mmr));
            subList.winLoss.push(opponentData[0].wins + "/" + opponentData[0].losses);
            subList.mmrGainLoss.push(checkPositive(opponentData[0].mmr));

            opponentData.shift();

            counter += 1;
        }

        pages.push({
            fields: [
                {
                    name: 'Opponent Name',
                    value: subList.names.join("\n"),
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
                }
            ]
        })

        loopCounter += 1;
        if (opponentData.length === 0) {
            done = true;
        }
    }
    return pages
}
