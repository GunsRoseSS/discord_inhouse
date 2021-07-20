import {getUsers} from "./user.js";
import {quickSortPlayers} from "../helpers/sort.js";
import Ranking from "../models/ranking.js";
import {emojiNumberSelector} from "../helpers/emoji.js";


export const getPlayerRanking = async (playerID) => {
    let playerRanking = {
        top: {
            place: undefined,
            mmr: undefined,
            wins: undefined,
            losses: undefined
        },
        jgl: {
            place: undefined,
            mmr: undefined,
            wins: undefined,
            losses: undefined
        },
        mid: {
            place: undefined,
            mmr: undefined,
            wins: undefined,
            losses: undefined
        },
        adc: {
            place: undefined,
            mmr: undefined,
            wins: undefined,
            losses: undefined
        },
        sup: {
            place: undefined,
            mmr: undefined,
            wins: undefined,
            losses: undefined
        }
    }
    let ranking = await Ranking.find();
    ranking = ranking[0];

    for (let player in ranking.roles.top) {
        if (ranking.roles.top[player].playerID === playerID) {
            playerRanking.top = {
                place: parseInt(player) + 1,
                mmr: ranking.roles.top[player].mmr,
                wins: ranking.roles.top[player].wins,
                losses: ranking.roles.top[player].losses
            }
        }
    }
    for (let player in ranking.roles.jgl) {
        if (ranking.roles.jgl[player].playerID === playerID) {
            playerRanking.jgl = {
                place: parseInt(player) + 1,
                mmr: ranking.roles.jgl[player].mmr,
                wins: ranking.roles.jgl[player].wins,
                losses: ranking.roles.jgl[player].losses
            }
        }
    }
    for (let player in ranking.roles.mid) {
        if (ranking.roles.mid[player].playerID === playerID) {
            playerRanking.mid = {
                place: parseInt(player) + 1,
                mmr: ranking.roles.mid[player].mmr,
                wins: ranking.roles.mid[player].wins,
                losses: ranking.roles.mid[player].losses
            }
        }
    }
    for (let player in ranking.roles.adc) {
        if (ranking.roles.adc[player].playerID === playerID) {
            playerRanking.adc = {
                place: parseInt(player) + 1,
                mmr: ranking.roles.adc[player].mmr,
                wins: ranking.roles.adc[player].wins,
                losses: ranking.roles.adc[player].losses
            }
        }
    }
    for (let player in ranking.roles.sup) {
        if (ranking.roles.sup[player].playerID === playerID) {
            playerRanking.sup = {
                place: parseInt(player) + 1,
                mmr: ranking.roles.sup[player].mmr,
                wins: ranking.roles.sup[player].wins,
                losses: ranking.roles.sup[player].losses
            }
        }
    }

    return playerRanking
}

export const getRoleRanking = async (role) => {
    let ranking = await Ranking.find();
    ranking = ranking[0];

    switch (role) {
        case 'top':
            return ranking.roles.top
        case 'jgl':
            return ranking.roles.jgl
        case 'mid':
            return ranking.roles.mid
        case 'adc':
            return ranking.roles.adc
        case 'sup':
            return ranking.roles.sup
    }
}

export const allRoleRanking = async () => { //this is done by directly arranging a new list instead of fetching the ranking list
    let players = await getUsers();
    let allRoleList = [];
    for (let player of players) {
        if (player.roles.top.mmr) {
            allRoleList.push([player._id, 'top', player.roles.top.mmr, player.roles.top.wins, player.roles.top.losses])
        }
        if (player.roles.jgl.mmr) {
            allRoleList.push([player._id, 'jgl', player.roles.jgl.mmr, player.roles.jgl.wins, player.roles.jgl.losses])
        }
        if (player.roles.mid.mmr) {
            allRoleList.push([player._id, 'mid', player.roles.mid.mmr, player.roles.mid.wins, player.roles.mid.losses])
        }
        if (player.roles.adc.mmr) {
            allRoleList.push([player._id, 'adc', player.roles.adc.mmr, player.roles.adc.wins, player.roles.adc.losses])
        }
        if (player.roles.sup.mmr) {
            allRoleList.push([player._id, 'sup', player.roles.sup.mmr, player.roles.sup.wins, player.roles.sup.losses])
        }
    }
    return quickSortPlayers(allRoleList, 'all')
}

export const getNewRoleRanking = async (role) => {
    let players = await getUsers();

    return quickSortPlayers(players, role)
}

export const updateRoleRanking = async () => {
    let top = await getNewRoleRanking('top');
    let jgl = await getNewRoleRanking('jgl');
    let mid = await getNewRoleRanking('mid');
    let adc = await getNewRoleRanking('adc');
    let sup = await getNewRoleRanking('sup');

    let topList = [];
    let jglList = [];
    let midList = [];
    let adcList = [];
    let supList = [];

    for (let player of top) {
        topList.push({
            playerID: player._id,
            mmr: player.roles.top.mmr,
            wins: player.roles.top.wins,
            losses: player.roles.top.losses
        })
    }
    for (let player of jgl) {
        jglList.push({
            playerID: player._id,
            mmr: player.roles.jgl.mmr,
            wins: player.roles.jgl.wins,
            losses: player.roles.jgl.losses
        })
    }
    for (let player of mid) {
        midList.push({
            playerID: player._id,
            mmr: player.roles.mid.mmr,
            wins: player.roles.mid.wins,
            losses: player.roles.mid.losses
        })
    }
    for (let player of adc) {
        adcList.push({
            playerID: player._id,
            mmr: player.roles.adc.mmr,
            wins: player.roles.adc.wins,
            losses: player.roles.adc.losses
        })
    }
    for (let player of sup) {
        supList.push({
            playerID: player._id,
            mmr: player.roles.sup.mmr,
            wins: player.roles.sup.wins,
            losses: player.roles.sup.losses
        })
    }

    Ranking.deleteMany();

    let newRanking = new Ranking({
        roles: {
            top: topList,
            jgl: jglList,
            mid: midList,
            adc: adcList,
            sup: supList
        }
    })

    await newRanking.save();

    return newRanking

}

export const embedRankingPages = (ranking, all) => {
    let pages = [];

    let done = false;
    let loopCounter = 0;

    while (!done) {
        let subList = [loopCounter]
        let counter = 0;
        while (ranking.length !== 0 && counter < 10) {
            subList.push(ranking[0]);
            ranking.shift();
            counter += 1
        }

        if (all) {
            pages.push({
                fields: [
                    {
                        name: "Rank & Role",
                        value: embedAllRoleRanks(subList, 'rank'),
                        inline: true
                    },
                    {
                        name: "Player",
                        value: embedAllRoleRanks(subList, 'player'),
                        inline: true
                    },
                    {
                        name: "MMR & Win/Loss",
                        value: embedAllRoleRanks(subList, 'mmr'),
                        inline: true
                    }
                ]
            })
        } else {
            pages.push({
                fields: [
                    {
                        name: "Rank",
                        value: embedAllRoleRanks(subList, 'justRank'),
                        inline: true
                    },
                    {
                        name: "Player",
                        value: embedAllRoleRanks(subList, 'playerRole'),
                        inline: true
                    },
                    {
                        name: "MMR & Win/Loss",
                        value: embedAllRoleRanks(subList, 'mmrRole'),
                        inline: true
                    }
                ]
            })
        }
        loopCounter += 1
        if (ranking.length === 0) {
            done = true;
        }
    }
    return pages

}

export const embedPlayerRanks = (ranks, type) => {
    let embedString = '';

    switch (type) {
        case 'rank':
            embedString = "Top " + emojiNumberSelector(ranks.top.place) + '\n'
                + "Jungle " + emojiNumberSelector(ranks.jgl.place) + '\n'
                + "Mid " + emojiNumberSelector(ranks.mid.place) + '\n'
                + "ADC " + emojiNumberSelector(ranks.adc.place) + '\n'
                + "Support " + emojiNumberSelector(ranks.sup.place)

            return embedString
        case 'mmr':
            embedString = ranks.top.mmr + '\n'
                + ranks.jgl.mmr + '\n'
                + ranks.mid.mmr + '\n'
                + ranks.adc.mmr + '\n'
                + ranks.sup.mmr

            return embedString
        case 'winLoss':
            embedString = ranks.top.wins + '/' + ranks.top.losses + '\n'
                + ranks.jgl.wins + '/' + ranks.jgl.losses + '\n'
                + ranks.mid.wins + '/' + ranks.mid.losses + '\n'
                + ranks.adc.wins + '/' + ranks.adc.losses + '\n'
                + ranks.sup.wins + '/' + ranks.sup.losses

            return embedString
    }
}

export const embedAllRoleRanks = (ranks, type) => {
    let embedString = '';
    let first = true //if (rank !== 0) didnt work idk lol

    for (let rank in ranks) {
        if (!first) {
            switch (type) {
                case 'rank':
                    let rankNumber = parseInt(ranks[0]) * 10 + parseInt(rank);
                    embedString = embedString + emojiNumberSelector(rankNumber) + ranks[rank][1] + '\n';
                    break
                case 'justRank':
                    let rankNumber2 = parseInt(ranks[0]) * 10 + parseInt(rank);
                    embedString = embedString + emojiNumberSelector(rankNumber2) + '\n';
                    break
                case 'mmr':
                    embedString = embedString + ranks[rank][2] + ", " + ranks[rank][3] + "/" + ranks[rank][4] + '\n'
                    break
                case 'mmrRole':
                    embedString = embedString + ranks[rank].mmr + ", " + ranks[rank].wins + "/" + ranks[rank].losses + '\n'
                    break
                case 'player':
                    embedString = embedString + ranks[rank][0] + '\n'
                    break
                case 'playerRole':
                    embedString = embedString + ranks[rank].playerID + '\n'
                    break
            }
        }
        first = false
    }
    return embedString

}