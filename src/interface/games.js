import Game from "../models/game.js";

import {getUser, getUserElo, getUserMatchHistory} from "./user.js"
import {calculateNewElo} from "./matchup.js";

import {checkPositive, formatDate, getChampionName} from "../helpers/format.js"
import {emojiNumberSelector, getRoleEmoji} from "../helpers/emoji.js"

import {ordinal} from "openskill";
import {sortMetaData} from "../helpers/sort.js";

import {createEmbed} from "./embed.js";
import https from "https";
import {getMemberNickname} from "../helpers/discord.js";

export const createGame = async (game, champs, winner) => {
    try {
        let newGame = new Game({
            _id: game.id,
            matchID: 0,
            players: await convertToPlayerList(game, champs, winner),
            winner: winner,
            date: new Date().setUTCHours(0, 0, 0, 0)
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
    } catch (err) {
        console.log(`Error while adding match ${game.id} to database. Posible duplicate entry`)
        return null
    }


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

    return createEmbed({
        title: `Match ${game._id} results`,
        description: "",
        colour: "#7da832",
        fields: [
            {name: "BLUE", value: msg_blue, inline: true},
            {name: "RED", value: msg_red, inline: true}
        ],
        footer: `Played on ${formatDate(game.date)}`
    })


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

    if (history.length === 0) {
        return []
    }

    history = history.map(match => {
        return {_id: match}
    })

    let games = await Game.find({$or: history})

    games = games.sort((game1, game2) => {
        if (parseInt(game1._id) > parseInt(game2._id)) {
            return 1
        } else {
            return -1
        }
    })

    return games
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
        matches: newMatches.reverse(),
        dates: dates.reverse(),
        roles: roles.reverse(),
        champions: champions.reverse(),
        winLoss: winLoss.reverse(),
        mmrGainLoss: mmrGainLoss.reverse()
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

    let links = historyData.matches.map(match => {
        if (match > 10000) {
            return `https://matchhistory.euw.leagueoflegends.com/en/#match-details/EUW1/${match}`
        } else {
            return `No matchID linked.`
        }
    })

    return paginateHistoryEmbed(historyData, links)
}

export const paginateHistoryEmbed = (historyData, links) => {
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
            mmrGainLoss: [],
            links: []
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
            subList.links.push(emojiNumberSelector(embedNumber) + ': ' + links[0])

            historyData.matches.shift();
            historyData.dates.shift();
            historyData.roles.shift();
            historyData.champions.shift();
            historyData.winLoss.shift();
            historyData.mmrGainLoss.shift();
            links.shift();

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
                    value: 'Click on the match link below. Make sure you are logged into the site. ' +
                        'People that did not participate in the game might not be able to see the game.',
                    inline: false
                },
                {
                    name: 'Link',
                    value: subList.links.join("\n"),
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

export const getMetaEmbed = (games, type) => {
    let dictChamps = {
        'pickRate': 0
    };

    if (games.length === 0) {
        return null
    }

    let bans = {}

    //generate champion dictionary
    for (let game of games) {
        for (let player of game.players) {
            if (dictChamps[player.champion] === undefined) {
                dictChamps[player.champion] = {
                    mmrDiff: Math.floor(ordinal({
                        mu: player.afterGameElo.mu,
                        sigma: player.afterGameElo.sigma
                    }) - ordinal({mu: player.previousElo.mu, sigma: player.previousElo.sigma})),
                    wins: player.team === game.winner ? 1 : 0,
                    losses: player.team !== game.winner ? 1 : 0,
                    pickRate: 1,
                    banRate: 0
                }
            } else {
                dictChamps[player.champion].mmrDiff += Math.floor(ordinal({
                    mu: player.afterGameElo.mu,
                    sigma: player.afterGameElo.sigma
                }) - ordinal({mu: player.previousElo.mu, sigma: player.previousElo.sigma}));
                dictChamps[player.champion].wins += player.team === game.winner ? 1 : 0;
                dictChamps[player.champion].losses += player.team !== game.winner ? 1 : 0;
                dictChamps[player.champion].pickRate += 1;
            }

            dictChamps["pickRate"] += 1
        }
        if ("bans" in game) {
            game.bans.forEach(ban => {
                if (Object.keys(bans).includes(ban)) {
                    bans[ban] += 1
                } else {
                    bans[ban] = 1
                }
            })
        }
    }

    Object.entries(bans).forEach(([ban, count]) => {
        if (Object.keys(dictChamps).includes(ban)) {
            dictChamps[ban].banRate = count
        } else {
            dictChamps[ban] = {mmrDiff: 0, wins: 0, losses: 0, pickRate: 0, banRate: count}
        }
    })

    dictChamps = sortMetaData(dictChamps, type);

    let pages = [];
    const PAGE_SIZE = 10;
    let pickRate_msg = "";
    let champ_msg = "";
    let mmr_msg = "";

    Object.entries(dictChamps).forEach(([champion, stats], index) => {
        if (champion !== 'pickRate') {
            pickRate_msg += `${Math.round(stats.pickRate / dictChamps["pickRate"] * 100 * 10 * 10) / 10}%, ${Math.round(stats.banRate / dictChamps["pickRate"] * 100 * 10 * 10) / 10}%\n`
            champ_msg += `${emojiNumberSelector(index)}: ${getChampionName(champion)} \n`
            mmr_msg += `${checkPositive(stats.mmrDiff)}, ${stats.wins}/${stats.losses} \n`
        }

        if (((index) % PAGE_SIZE === 0 && index !== 0) || index === Object.keys(dictChamps).length - 1) {
            pages.push({
                fields: [
                    {
                        name: "Champion",
                        value: champ_msg,
                        inline: true
                    },
                    {
                        name: "MMR & Win/Loss",
                        value: mmr_msg,
                        inline: true
                    },
                    {
                        name: "Pick/Ban Rate",
                        value: pickRate_msg,
                        inline: true
                    }
                ]
            })

            pickRate_msg = ""
            champ_msg = ""
            mmr_msg = ""
        }
    })

    let title_msg = "Meta data for all champions"

    switch (type) {
        case "mmr":
            title_msg += " sort: MMR High -> Low"
            break
        case "reverse_mmr":
            title_msg += " sort: MMR Low -> High"
            break
        case "pickrate":
            title_msg += "sort: Pickrate High -> Low"
            break
        case "reverse_pickrate":
            title_msg += "sort: Pickrate Low -> High"
            break
        case "banrate":
            title_msg += "sort: Banrate High -> Low"
            break
        case "reverse_banrate":
            title_msg += "sort: Banrate Low -> High"
            break
    }

    return {
        title: title_msg,
        description: "",
        colour: "#a83254",
        pages: pages,
        menu: {
            hint: "Sort by...",
            callback: menuSort,
            options: [
                {label: "MMR", description: "High -> Low", value: "mmr_high"},
                {label: "MMR", description: "Low -> High", value: "mmr_low"},
                {label: "Pick rate", description: "High -> Low", value: "pick_high"},
                {label: "Pick rate", description: "Low -> High", value: "pick_low"},
                {label: "Ban rate", description: "High -> Low", value: "ban_high"},
                {label: "Ban rate", description: "Low -> High", value: "ban_low"},
            ]
        }
    }
}

async function menuSort(embed, menuValue) {
    let data
    let games = await getAllGames();
    switch (menuValue) {
        case "mmr_high":
            data = getMetaEmbed(games, "mmr")
            break
        case "mmr_low":
            data = getMetaEmbed(games, "reverse_mmr")
            break
        case "pick_high":
            data = getMetaEmbed(games, "pickrate")
            break
        case "pick_low":
            data = getMetaEmbed(games, "reverse_pickrate")
            break
        case "ban_high":
            data = getMetaEmbed(games, "banrate")
            break
        case "ban_low":
            data = getMetaEmbed(games, "reverse_banrate")
    }
    embed.current_page = 0
    embed.init(data)
    embed.update()
}

export const getGameStats = (matchID) => {
    let response = {};

    return new Promise((resolve, reject) => {
        https.get(`https://api.kieranbaker.uk/league/history/${matchID}`, callback => {
            let body = '';

            callback.on('data', function (chunk) {
                body += chunk;
            })

            callback.on('end', function () {
                response = JSON.parse(body);
                if (response !== {}) {
                    resolve(response);
                } else {
                    reject('no data returned');
                }
            })

        }).on('error', (e) => {
            reject(e);
        })
    })
}

export async function insertGameStats(matchID) {
    let stats;
    let game = await getGameByMatchID(matchID);

    getGameStats(matchID).then(response => {
        stats = response

        return new Promise((resolve, reject) => {
            game.bans = stats.bans;
            for (let player of game.players) {
                let champStats = stats.players.find(element => element.champion === player.champion);
                if (!champStats) {
                    reject('Player/Champion not found');
                }
                delete champStats.champion;
                player.stats = champStats;
            }
            game.save();

            resolve();
        })
    }).catch(error => {
        console.log(error);
    })
}

export const getPlayerStats = async (playerID, userList) => {
    let history = await getUserMatchHistory(playerID);

    if (!history || history.length === 0) {
        return null
    }

    let games = await Game.find({$or: history.map(match => match = {_id: match})});

    let stats = {};

    let statList = ['kills', 'deaths', 'assists', 'cs', 'gold', 'spree', 'champ_dmg_total', 'objective_dmg', 'turret_dmg', 'healed_dmg', 'taken_dmg_total', 'wards_placed', 'control_wards'];

    games.forEach(game => {
        let player = game.players.find(element => element.id === playerID);
        let win = game.winner === player.team;

        let statsEntered = false;
        if (game.bans) {
            statsEntered = true;
        }

        if (statsEntered) {
            let totalkills = 0;
            for (let user of game.players) {
                if (user.team === player.team) {
                    totalkills += parseInt(user.stats.kills);
                }
            }
        }

        if (Object.keys(stats).length !== 0) {
            stats.wins += win ? 1 : 0;
            stats.losses += win ? 0 : 1;
            stats.gained += ordinal(player.afterGameElo) - ordinal(player.previousElo);
            if (statsEntered) {
                for (let stat of statList) {
                    if (player.stats[`${stat}`] !== '-'){
                        stats[`avg_${stat}`] += parseInt(player.stats[`${stat}`]);
                        if (stats[`best_${stat}`] < parseInt(player.stats[`${stat}`])) {
                            stats[`best_${stat}`] = parseInt(player.stats[`${stat}`]);
                        }
                    }
                }
                stats.first += player.stats.first ? 1 : 0;
                if (stats[`best_multi`] < parseInt(player.stats.multi)) {
                    stats[`best_multi`] = parseInt(player.stats.multi);
                }
                stats.divideBy += 1;
                if (stats.best_kp < Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10) {
                    stats.best_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
                }
                stats.avg_kp += Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
            }
        } else {
            stats = {
                wins: win ? 1 : 0,
                losses: win ? 0 : 1,
                gained: ordinal(player.afterGameElo) - ordinal(player.previousElo)
            };
            if (statsEntered) {
                for (let stat of statList) {
                    stats[`best_${stat}`] = parseInt(player.stats[`${stat}`]);
                    stats[`avg_${stat}`] = parseInt(player.stats[`${stat}`]);
                }
                stats.first = player.stats.first ? 1 : 0;
                stats[`best_multi`] = player.stats.multi;
                stats.divideBy = 1;
                stats.avg_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
                stats.best_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
            }
        }
    })

    for (let stat of statList) {
        if (stat === 'kills' || stat === 'deaths' || stat === 'assists' || stat === 'cs' || stat === 'spree' || stat === 'wards_placed' || stat === 'control_wards') {
            stats[`avg_${stat}`] = Math.round(stats[`avg_${stat}`] * 10 / stats.divideBy) / 10; //provides one decimal, useful for lower number stats
        } else {
            stats[`avg_${stat}`] = Math.round(stats[`avg_${stat}`] / stats.divideBy);
        }
    }
    stats.first = Math.round(stats.first / stats.divideBy * 1000) / 10;
    stats.avg_kp = Math.round(stats.avg_kp / stats.divideBy * 10) / 10;

    return {
        title: `:chart_with_upwards_trend: Statistics for ${getMemberNickname(playerID, userList)} :chart_with_upwards_trend:`,
        description: "Type **!hof** or **!hof [champion]** to see the top scores for all/a single champion.",
        fields: [
            {
                name: "Total MMR gain/loss",
                value: `${stats.gained > 0 ? "+" : ""}${Math.floor(stats.gained)}`,
                inline: true
            },
            {name: "Win/Loss", value: `${stats.wins}/${stats.losses}`, inline: true},
            {
                name: "Average(Best) K/D/A",
                value: `${stats.avg_kills}/${stats.avg_deaths}/${stats.avg_assists} (${stats.best_kills})/(${stats.best_deaths})/(${stats.best_assists})`,
                inline: true
            },
            {
                name: "Average(Best) Kill participation %",
                value: `:raised_hands: ${stats.avg_kp}%(${stats.best_kp}%)`,
                inline: true
            },
            {
                name: "Average(Best) CS/Gold earned",
                value: `:crossed_swords: ${stats.avg_cs}(${stats.best_cs})/\n:coin: ${stats.avg_gold}(${stats.best_gold})`,
                inline: true
            },
            {
                name: "Average(Best) Damage dealt to champions/ objectives/turrets",
                value: `:monkey_face: ${stats.avg_champ_dmg_total}(${stats.best_champ_dmg_total})/\n:dragon_face: ${stats.avg_objective_dmg}(${stats.best_objective_dmg})/\n:tokyo_tower: ${stats.avg_turret_dmg}(${stats.best_turret_dmg})`,
                inline: true
            },
            {
                name: "Average(Best) Damage taken/healed",
                value: `:shield: ${stats.avg_taken_dmg_total}(${stats.best_taken_dmg_total})/\n:ambulance: ${stats.avg_healed_dmg}(${stats.best_healed_dmg})`,
                inline: true
            },
            {
                name: "Average(Best) Wards/Control wards placed",
                value: `:flashlight: ${stats.avg_wards_placed}(${stats.best_wards_placed})/\n:eye: ${stats.avg_control_wards}(${stats.best_control_wards})`,
                inline: true
            },
            {
                name: "First Blood %",
                value: `:drop_of_blood: ${stats.first}%`,
                inline: true
            },
        ], footer: ""
    }


}
