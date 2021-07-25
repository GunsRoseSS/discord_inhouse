//kiwi sucks pipi haha!

import {getAllGames} from "./games.js";
import {quickSortPlayers} from "../helpers/sort.js";
import {emojiNumberSelector} from "../helpers/emoji.js";
import {checkPositive} from "../helpers/format.js";

export const getTeammateStats = async (userID) => {
    let userGames = await getAllGames();

    let userList = [];

    for (let game of userGames) { //https://i.redd.it/ueszgegodtl21.png
        let foundUser = false;

        for (let potentialUser of game.players) {
            if (potentialUser.id === userID) {
                foundUser = true;
            } else {
                let found = false;
                for (let user of userList){
                    if (user.id === potentialUser.id) {
                        found = true;
                        user.mmr = user.mmr + potentialUser.afterGameElo - potentialUser.previousElo;
                        if (potentialUser.team === game.winner) {
                            user.wins += 1
                        } else {
                            user.losses += 1
                        }
                    }
                }
                if (!found){
                    userList.push({
                        id: potentialUser.id,
                        mmr: potentialUser.afterGameElo - potentialUser.previousElo,
                        wins: potentialUser.team === game.winner ? 1 : 0,
                        losses: potentialUser.team === game.winner ? 0 : 1,
                    })
                }
            }
        }
    }
    return quickSortPlayers(userList, 'teammates')
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
        while (teammateData.length !== 0 && counter < 5) {
            let embedNumber = loopCounter * 5 + counter + 1
            subList.names.push(emojiNumberSelector(embedNumber) + ': ' + teammateData[0].id);
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
