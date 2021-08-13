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
import {fetchChampionIcon} from "./champion.js";
import {getChampion, getUserList} from "../app.js";

/**
 * @description Creates and stores the game within the database
 * @param {Number} id The id of the game. MUST BE UNIQUE (Used as key for document in db)
 * @param game The game data
 * @param champs An object containing the champions
 * @param {String} winner Either BLUE or RED
 * @returns The game on success or null on failure
 */
export const createGame = async (id, game, champs, winner) => {
    try {
        let newGame = new Game({
            _id: id,
            matchID: 0,
            players: await convertToPlayerList(game, champs, winner),
            winner: winner,
            date: new Date().setUTCHours(0, 0, 0, 0),
            statsFetched: false
        })

        await newGame.save()

        for (let player of newGame.players) {
            let user = await getUser(player.id)

            user.matchHistory.push(newGame._id)
            user.roles[player.role].mmr = player.afterGameElo

            if (player.team === winner) {
                user.roles[player.role].wins += 1

            } else {
                user.roles[player.role].losses += 1
            }

            await user.save()
        }

        return newGame
    } catch (err) {
        console.log(`Error while adding match ${id} to database. Possible duplicate entry`)
        console.log(err)
        return null
    }


}

/**
 * @description Converts the game data into an array of players, ready to update in db
 * @param game The game data
 * @param champs An object containing the champions
 * @param {String} winner Either BLUE or RED
 * @returns Array of players, each containing {id, team, role, champion, previousElo, afterGameElo}
 */
const convertToPlayerList = async (game, champs, winner) => {
    let blue = []
    let red = []

    const roles = ["top", "jgl", "mid", "adc", "sup"]

    let originalElos = {"blue": [], "red": []}
    let updatedElos;

    for (let i = 0; i < game.length; i++) {
        originalElos.blue.push(await getUserElo(game[i].player1, roles[i]))
        originalElos.red.push(await getUserElo(game[i].player2, roles[i]))
    }

    updatedElos = calculateNewElo(originalElos.blue, originalElos.red, winner === "BLUE")

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

/**
 * @description Creates an embed for the game
 * @param game The game object (From database)
 * @returns Embed for the game
 */
export const getGameEmbed = (game) => {
    let msg_blue = ""
    let msg_red = ""
    let msg_ping = ""

    for (let i = 0; i < game.players.length; i++) {
        let player = game.players[i]
        let elo_diff = Math.floor(ordinal(player.afterGameElo) - ordinal(player.previousElo))
        if (Math.floor(i / 5) === 0) {
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

//these functions are all database queries.
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
    //make arrays
    let dates = [],
        roles = [],
        champions = [],
        winLoss = [],
        mmrGainLoss = [];

    //get data
    let matches = await getUserMatchHistory(id)

    let newMatches = []

    //put data into arrays
    for (let match of matches) {
        let matchData = await getGameByID(match)
        let player = matchData.players.find(element => element.id === id)

        dates.push(matchData.date)
        roles.push(player.role)
        champions.push(player.champion)
        mmrGainLoss.push(Math.floor(ordinal(player.afterGameElo) - ordinal(player.previousElo)))

        winLoss.push(player.team === matchData.winner ? "win" : "loss")

        if (matchData.matchID === 0) {
            newMatches.push(matchData._id)
        } else {
            newMatches.push(matchData.matchID)
        }
    }

    //return arrays (reverse is used because it sorts it the wrong way)
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
    //format these three data points for the embeds
    historyData.roles = historyData.roles.map(role => {
        return getRoleEmoji(role)
    })

    historyData.dates = historyData.dates.map(date => {
        return formatDate(date)
    })

    historyData.champions = historyData.champions.map(champ => {
        return getChampionName(champ)
    })

    let links = historyData.matches.map(match => {
        //check if the match is linked
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

    //this is the old way of paginating stuff but it works
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
        //check if the page is full or the match array is empty
        while (historyData.matches.length !== 0 && counter < 5) {
            let embedNumber = loopCounter * 5 + counter + 1
            //push stuff into subarray that will become a page
            subList.matches.push(emojiNumberSelector(embedNumber) + ': ' + historyData.matches[0]);
            subList.dates.push(historyData.dates[0]);
            subList.roles.push(historyData.roles[0]);
            subList.champions.push(emojiNumberSelector(embedNumber) + ': ' + historyData.champions[0]);
            subList.winLoss.push(historyData.winLoss[0]);
            subList.mmrGainLoss.push(`${historyData.mmrGainLoss[0] < 0 ? "-" : "+"}${Math.abs(historyData.mmrGainLoss[0])}`);
            subList.links.push(emojiNumberSelector(embedNumber) + ': ' + links[0])

            //delete pushed data from the main array
            historyData.matches.shift();
            historyData.dates.shift();
            historyData.roles.shift();
            historyData.champions.shift();
            historyData.winLoss.shift();
            historyData.mmrGainLoss.shift();
            links.shift();

            counter += 1;
        }

        //here the data gets formatted into the pages data type
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

    //add banrate to the dictionary
    Object.entries(bans).forEach(([ban, count]) => {
        if (Object.keys(dictChamps).includes(ban)) {
            dictChamps[ban].banRate = count
        } else {
            dictChamps[ban] = {mmrDiff: 0, wins: 0, losses: 0, pickRate: 0, banRate: count}
        }
    })

    dictChamps = sortMetaData(dictChamps, type); //sort

    let pages = [];
    const PAGE_SIZE = 10;
    let pickRate_msg = "";
    let champ_msg = "";
    let mmr_msg = "";

    //paginate all the champions
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

    //this is used for the sorting button
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

//this function is used for the sorting button that allows you to sort the embed in a specific way.
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

//this function gets called when linking a matchID to a match.
export const getGameStats = (matchID) => {
    let response = {};

    let options = {
        host: process.env.SCRAPER_API_HOST,
        path: `${process.env.SCRAPER_API_PATH}/${matchID}`,
        headers: {
            'x-api-key': process.env.SCRAPER_API_KEY
        }
    }

    return new Promise((resolve) => {
        https.get(options, callback => {
            let body = '';

            callback.on('data', function (chunk) {
                body += chunk;
            })

            callback.on('end', function () {
                response = JSON.parse(body);
                if (response !== {} && response?.status != "failed") {
                    resolve(response);
                } else {
                    resolve(null)
                }
            })

        })
    })
}

//this function takes the game stats and inserts them into the db for the specific game.
export async function insertGameStats(matchID) {
    let game = await getGameByMatchID(matchID);

    let stats = await getGameStats(matchID)

    if (stats) {
        game.bans = stats.bans
        game.duration = stats.duration;
        for (let player of game.players) {
            let champStats = stats.players.find(element => element.champion === player.champion);
            if (!champStats) {
                return `Failed to update stats. Player/Champion not found :shrug:`
            }
            delete champStats.champion;
            player.stats = champStats;
        }
        game.statsFetched = true
        game.save();
        return `Stats updated for game ${game._id} -> ${matchID}`
    } else {
        return `Failed to get stats for game ${game._id} -> ${matchID}`
    }
}

//this function is used for !stats
export const getPlayerStats = async (playerID, userList) => {
    let history = await getUserMatchHistory(playerID);

    if (!history || history.length === 0) {
        return null
    }

    //search for every game in the matchhistory of the user.
    let games = await Game.find({$or: history.map(match => match = {_id: match})});

    let stats = {};

    let statList = ['kills', 'deaths', 'assists', 'cs', 'gold', 'spree', 'champ_dmg_total', 'objective_dmg', 'turret_dmg', 'healed_dmg', 'taken_dmg_total', 'wards_placed', 'control_wards'];

    //for each game, calculate/add stats.
    games.forEach(game => {
        let player = game.players.find(element => element.id === playerID);
        let win = game.winner === player.team;

        let statsEntered = false;
        if (game.statsFetched) {
            statsEntered = true;
        }

        let totalKills = 0;
        let totalDmg = 0;
        if (statsEntered) {
            for (let user of game.players) {
                if (user.team === player.team) {
                    totalKills += parseInt(user.stats.kills);
                    totalDmg += user.stats.champ_dmg_total;
                }
            }
        }

        if (Object.keys(stats).length > 3) {
            stats.wins += win ? 1 : 0;
            stats.losses += win ? 0 : 1;
            stats.gained += ordinal(player.afterGameElo) - ordinal(player.previousElo);
            if (statsEntered) {
                for (let stat of statList) {
                    if (player.stats[`${stat}`] !== '-') {
                        if (stat === "cs") {
                            stats[`avg_${stat}`] += parseInt(player.stats[`${stat}`]) / game.duration
                        } else {
                            stats[`avg_${stat}`] += parseInt(player.stats[`${stat}`]);
                        }

                        if (stat !== 'kills' && stat !== 'deaths' && stat !== 'assists') {
                            if (stats[`best_${stat}`] < parseInt(player.stats[`${stat}`])) {
                                stats[`best_${stat}`] = parseInt(player.stats[`${stat}`]);
                            }
                        }
                    }
                }


                if (stats[`best_cpm`] < parseInt(player.stats[`cs`]) / game.duration) {
                    stats[`best_cpm`] = (parseInt(player.stats[`cs`]) / game.duration).toFixed(1);
                }

                stats.first += player.stats.first ? 1 : 0;
                if (stats[`best_multi`] < parseInt(player.stats.multi)) {
                    stats[`best_multi`] = parseInt(player.stats.multi);
                }
                stats.divideBy += 1;
                if (stats.best_kp < Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalKills * 1000) / 10) {
                    stats.best_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalKills * 1000) / 10;
                }
                stats.avg_kp += Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalKills * 1000) / 10;
                if (stats.best_dmgshare < Math.round(player.stats.champ_dmg_total / totalDmg * 1000) / 10) {
                    stats.best_dmgshare = Math.round(player.stats.champ_dmg_total / totalDmg * 1000) / 10;
                }
                stats.avg_dmgshare += Math.round(player.stats.champ_dmg_total / totalDmg * 1000) / 10;

                if (stats.best_kda.calc < Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / parseInt(player.stats.deaths) * 100) / 100) {
                    stats.best_kda = {
                        calc: Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / parseInt(player.stats.deaths) * 100) / 100,
                        kills: (parseInt(player.stats.kills)),
                        deaths: (parseInt(player.stats.deaths)),
                        assists: (parseInt(player.stats.assists))
                    }
                }
            }
        } else {
            stats = {
                wins: win ? 1 : 0,
                losses: win ? 0 : 1,
                gained: ordinal(player.afterGameElo) - ordinal(player.previousElo)
            };
            if (statsEntered) {
                for (let stat of statList) {
                    if (stat === "cs") {
                        stats[`avg_${stat}`] = parseInt(player.stats[`${stat}`]) / game.duration
                        stats[`best_${stat}`] = parseInt(player.stats[`${stat}`])
                        stats[`best_cpm`] = parseInt(player.stats[`${stat}`]) / game.duration
                    } else {
                        stats[`best_${stat}`] = parseInt(player.stats[`${stat}`]);
                        stats[`avg_${stat}`] = parseInt(player.stats[`${stat}`]);
                    }
                }
                stats.first = player.stats.first ? 1 : 0;
                stats[`best_multi`] = player.stats.multi;
                stats.divideBy = 1;
                stats.avg_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalKills * 1000) / 10;
                stats.best_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalKills * 1000) / 10;
                stats.avg_dmgshare = Math.round(player.stats.champ_dmg_total / totalDmg * 1000) / 10;
                stats.best_dmgshare = Math.round(player.stats.champ_dmg_total / totalDmg * 1000) / 10;
                stats.best_kda = {
                    calc: Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / parseInt(player.stats.deaths) * 100) / 100,
                    kills: (parseInt(player.stats.kills)),
                    deaths: (parseInt(player.stats.deaths)),
                    assists: (parseInt(player.stats.assists))
                }
            }
        }
    })

    //calculate averages and other percentages.
    for (let stat of statList) {
        if (stat === 'kills' || stat === 'deaths' || stat === 'assists' || stat === 'cs' || stat === 'spree' || stat === 'wards_placed' || stat === 'control_wards') {
            stats[`avg_${stat}`] = Math.round(stats[`avg_${stat}`] * 10 / stats.divideBy) / 10; //provides one decimal, useful for lower number stats
        } else {
            stats[`avg_${stat}`] = Math.round(stats[`avg_${stat}`] / stats.divideBy);
        }
    }
    stats.first = Math.round(stats.first / stats.divideBy * 1000) / 10;
    stats.avg_kp = Math.round(stats.avg_kp / stats.divideBy * 10) / 10;
    stats.avg_dmgshare = Math.round(stats.avg_dmgshare / stats.divideBy * 10) / 10;
    stats.avg_kda = Math.round((stats.avg_kills + stats.avg_assists) / stats.avg_deaths * 100) / 100;

    if (!userList) {//assuming that calls who don't specify a userList don't want to have an embed returned
        return stats
    } else {
        return getPlayerStatsEmbed(playerID, userList, stats)
    }
}

//fetches the embed for the player stats.
export const getPlayerStatsEmbed = (playerID, userList, stats) => {
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
                value: `${stats.avg_kills}/${stats.avg_deaths}/${stats.avg_assists} [${stats.avg_kda}] \n(${stats.best_kda.kills}/${stats.best_kda.deaths}/${stats.best_kda.assists} [${stats.best_kda.calc}])`,
                inline: true
            },
            {
                name: "Average(Best) Kill participation/Damage share %",
                value: `:raised_hands: ${stats.avg_kp}%(${stats.best_kp}%)/\n:boom:${stats.avg_dmgshare}%(${stats.best_dmgshare}%)`,
                inline: true
            },
            {
                name: "Average(Best) CS/m /Best total CS/Gold earned",
                value: `:crossed_swords: ${stats.avg_cs}/(${stats.best_cpm}) \n :farmer: ${stats.best_cs} \n:coin: ${stats.avg_gold}(${stats.best_gold})`,
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

//slightly different function for !hof
export const getHallOfFameStats = async (userList, best, champion) => {
    let statList = ['kills', 'deaths', 'assists', 'cs', 'gold', 'spree', 'champ_dmg_total', 'objective_dmg', 'turret_dmg', 'healed_dmg', 'taken_dmg_total', 'wards_placed', 'control_wards'];
    let games = await getAllGames();
    let fullStats = {};
    let stats = {};
    let title;

    if (champion) {
        title = `:hushed: Hall of ${best ? "Fame" : "Shame"}: The ${best ? "best" : "worst"} player of each statistic of ${getChampionName(champion)}! :hushed:`;
    } else {
        title = `:hushed: Hall of ${best ? "Fame" : "Shame"}: The ${best ? "best" : "worst"} player of each statistic! :hushed:`;
    }

    //instead of looking at user match history for each user, it takes all games in the db and dynamically calculates the statistics for each user per game.
    for (let game of games) {
        let statsEntered = false;
        if (game.statsFetched) {
            statsEntered = true;
        }

        let totalKills = {
            RED: 0,
            BLUE: 0
        };
        let totalDmg = {
            RED: 0,
            BLUE: 0
        };

        if (statsEntered) {
            for (let user of game.players) {
                totalKills[user.team] += parseInt(user.stats.kills);
                totalDmg[user.team] += user.stats.champ_dmg_total;
            }
        }

        for (let user of game.players) {
            if (champion) {
                if (user.champion !== champion) {
                    continue
                }
            }
            //in this function, stats is a dictionary with stats for each player.
            if (!stats[user.id]) {
                stats[user.id] = {};
            }

            let win = game.winner === user.team;

            if (Object.keys(stats[user.id]).length > 3) {
                stats[user.id].wins += win ? 1 : 0;
                stats[user.id].losses += win ? 0 : 1;
                stats[user.id].gained += ordinal(user.afterGameElo) - ordinal(user.previousElo);
                if (statsEntered) {
                    for (let stat of statList) {
                        if (user.stats[`${stat}`] !== '-') {
                            if (stat === "cs") {
                                stats[user.id][`avg_${stat}`] += parseInt(user.stats[`${stat}`]) / game.duration
                            } else {
                                stats[user.id][`avg_${stat}`] += parseInt(user.stats[`${stat}`]);
                            }

                            if (stat !== 'kills' && stat !== 'deaths' && stat !== 'assists') {
                                if (best ? stats[user.id][`best_${stat}`].int < parseInt(user.stats[`${stat}`]) : stats[user.id][`best_${stat}`].int > parseInt(user.stats[`${stat}`])) {
                                    stats[user.id][`best_${stat}`].int = parseInt(user.stats[`${stat}`]);
                                    stats[user.id][`best_${stat}`].champion = user.champion;
                                }
                            }
                        }
                    }

                    if (best ? stats[user.id][`best_cpm`].int < parseInt(user.stats[`cs`]) / game.duration : stats[user.id][`best_cpm`].int > parseInt(user.stats[`cs`]) / game.duration) {
                        stats[user.id][`best_cpm`].int = (parseInt(user.stats[`cs`]) / game.duration).toFixed(1);
                        stats[user.id][`best_cpm`].champion = user.champion
                    }

                    stats[user.id].first += user.stats.first ? 1 : 0;
                    if (best ? stats[user.id][`best_multi`].int < parseInt(user.stats.multi) : stats[user.id][`best_multi`].int > parseInt(user.stats.multi)) {
                        stats[user.id][`best_multi`].int = parseInt(user.stats.multi);
                        stats[user.id][`best_multi`].champion = user.champion;
                    }
                    stats[user.id].divideBy += 1;
                    if (best ? stats[user.id].best_kp.int < Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / totalKills[user.team] * 1000) / 10 : stats[user.id].best_kp.int > Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / totalKills[user.team] * 1000) / 10) {
                        stats[user.id].best_kp.int = Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / totalKills[user.team] * 1000) / 10;
                        stats[user.id].best_kp.champion = user.champion;
                    }
                    stats[user.id].avg_kp += Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / totalKills[user.team] * 1000) / 10;
                    if (best ? stats[user.id].best_dmgshare.int < Math.round(user.stats.champ_dmg_total / totalDmg[user.team] * 1000) / 10 : stats[user.id].best_dmgshare.int > Math.round(user.stats.champ_dmg_total / totalDmg[user.team] * 1000) / 10) {
                        stats[user.id].best_dmgshare.int = Math.round(user.stats.champ_dmg_total / totalDmg[user.team] * 1000) / 10;
                        stats[user.id].best_dmgshare.champion = user.champion;
                    }
                    stats[user.id].avg_dmgshare += Math.round(user.stats.champ_dmg_total / totalDmg[user.team] * 1000) / 10;

                    if (best ? stats[user.id].best_kda.calc < Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / parseInt(user.stats.deaths) * 100) / 100 : stats[user.id].best_kda.calc > Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / parseInt(user.stats.deaths) * 100) / 100) {
                        stats[user.id].best_kda = {
                            calc: Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / parseInt(user.stats.deaths) * 100) / 100,
                            kills: (parseInt(user.stats.kills)),
                            deaths: (parseInt(user.stats.deaths)),
                            assists: (parseInt(user.stats.assists)),
                            champion: user.champion
                        }
                    }
                }
            } else {
                stats[user.id] = {
                    wins: win ? 1 : 0,
                    losses: win ? 0 : 1,
                    gained: ordinal(user.afterGameElo) - ordinal(user.previousElo)
                };
                if (statsEntered) {
                    for (let stat of statList) {
                        if (stat === "cs") {
                            stats[user.id][`avg_${stat}`] = parseInt(user.stats[`${stat}`]) / game.duration
                            stats[user.id][`best_${stat}`] = {
                                int: parseInt(user.stats[`${stat}`]),
                                champion: user.champion
                            }
                            stats[user.id][`best_cpm`] = {
                                int: parseInt(user.stats[`${stat}`]) / game.duration,
                                champion: user.champion
                            }
                        } else {
                            stats[user.id][`best_${stat}`] = {
                                int: parseInt(user.stats[`${stat}`]),
                                champion: user.champion
                            };
                            stats[user.id][`avg_${stat}`] = parseInt(user.stats[`${stat}`]);
                        }

                    }
                    stats[user.id].first = user.stats.first ? 1 : 0;
                    stats[user.id][`best_multi`] = {
                        int: user.stats.multi,
                        champion: user.champion
                    };
                    stats[user.id].divideBy = 1;
                    stats[user.id].avg_kp = Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / totalKills[user.team] * 1000) / 10;
                    stats[user.id].best_kp = {
                        int: Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / totalKills[user.team] * 1000) / 10,
                        champion: user.champion
                    };
                    stats[user.id].avg_dmgshare = Math.round(user.stats.champ_dmg_total / totalDmg[user.team] * 1000) / 10;
                    stats[user.id].best_dmgshare = {
                        int: Math.round(user.stats.champ_dmg_total / totalDmg[user.team] * 1000) / 10,
                        champion: user.champion
                    };
                    stats[user.id].best_kda = {
                        calc: Math.round((parseInt(user.stats.kills) + parseInt(user.stats.assists)) / parseInt(user.stats.deaths) * 100) / 100,
                        kills: (parseInt(user.stats.kills)),
                        deaths: (parseInt(user.stats.deaths)),
                        assists: (parseInt(user.stats.assists)),
                        champion: user.champion
                    }
                }
            }
        }
    }

    //calculating averages again
    Object.keys(stats).forEach(player => {
        let enoughGames = true;
        if (stats[player].divideBy < 3){
            enoughGames = false;
        }
        for (let stat of statList) {
            if (stat === 'kills' || stat === 'deaths' || stat === 'assists' || stat === 'cs' || stat === 'spree' || stat === 'wards_placed' || stat === 'control_wards') {
                stats[player][`avg_${stat}`] = enoughGames ? Math.round(stats[player][`avg_${stat}`] * 10 / stats[player].divideBy) / 10: -1; //provides one decimal, useful for lower number stats
            } else {
                stats[player][`avg_${stat}`] = enoughGames ? Math.round(stats[player][`avg_${stat}`] / stats[player].divideBy): -1;
            }
        }
        stats[player].first = enoughGames ? Math.round(stats[player].first / stats[player].divideBy * 1000) / 10 : -1;
        stats[player].avg_kp = enoughGames ? Math.round(stats[player].avg_kp / stats[player].divideBy * 10) / 10 : -1;
        stats[player].avg_dmgshare = enoughGames ? Math.round(stats[player].avg_dmgshare / stats[player].divideBy * 10) / 10 : -1;
        stats[player].avg_kda = enoughGames ? Math.round((stats[player].avg_kills + stats[player].avg_assists) / stats[player].avg_deaths * 100) / 100 : -1;
    })

    //in this part the best of the best is selected.
    Object.keys(stats).forEach(player => {
        if (Object.entries(fullStats).length !== 0) {
            Object.entries(stats[player]).forEach(([key, value]) => { //initialize string if its empty
                if (key !== 'divideBy' && key !== 'avg_kills' && key !== 'avg_deaths' && key !== 'avg_assists' && key !== 'best_kda' && key !== 'avg_kda' && !key.startsWith('best')) {
                    if (best ? value > fullStats[key].stat : value < fullStats[key].stat && (key === 'gained' ? true : value >=0)) {
                        fullStats[key] = {
                            id: player,
                            stat: value
                        }
                    }
                }
                if (key.startsWith('best') && key !== 'best_kda') {
                    if (best ? value.int > fullStats[key].stat.int : value.int < fullStats[key].stat.int && value.int >= 0) {
                        fullStats[key] = {
                            id: player,
                            stat: value
                        }
                    }
                }
                if (key === 'avg_kda') {
                    if (best ? value > fullStats.avg_kda.stat.calc : value < fullStats.avg_kda.stat.calc && value >= 0) {
                        fullStats.avg_kda = {
                            id: player,
                            stat: {
                                calc: value,
                                kills: stats[player].avg_kills,
                                deaths: stats[player].avg_deaths,
                                assists: stats[player].avg_assists
                            }
                        }
                    }
                }
                if (key === 'best_kda') {
                    if (best ? value.calc > fullStats.best_kda.stat.calc : value.calc < fullStats.best_kda.stat.calc && value.calc >= 0) {
                        fullStats.best_kda = {
                            id: player,
                            stat: {
                                calc: value.calc,
                                kills: value.kills,
                                deaths: value.deaths,
                                assists: value.assists
                            }
                        }
                    }
                }
            })
        } else {
            Object.entries(stats[player]).forEach(([key, value]) => { //initialize string if its empty
                if (key !== 'divideBy' && key !== 'avg_kills' && key !== 'avg_deaths' && key !== 'avg_assists' && key !== 'avg_kda') {
                    fullStats[key] = {
                        id: player,
                        stat: value
                    }
                }
                if (key === 'avg_kda') {
                    fullStats.avg_kda = {
                        id: player,
                        stat: {
                            calc: value,
                            kills: stats[player].avg_kills,
                            deaths: stats[player].avg_deaths,
                            assists: stats[player].avg_assists
                        }
                    }
                }
            })
        }

    })

    if (fullStats.avg_kp.stat === -1){
        fullStats.avg_kda.stat.kills = 'No one has played 3 games yet!';
        fullStats.avg_kda.stat.deaths = fullStats.avg_kda.stat.assists = fullStats.avg_kda.stat.calc = ''
        fullStats.avg_kp.stat = fullStats.avg_dmgshare.stat = fullStats.avg_cs.stat = fullStats.avg_gold.stat = fullStats.avg_champ_dmg_total.stat = fullStats.avg_objective_dmg.stat = fullStats.avg_turret_dmg.stat = fullStats.avg_taken_dmg_total.stat = fullStats.avg_healed_dmg.stat = 'No one has played 3 games yet!'
    }

    //create embed structure.
    //possible improvement would be to remove the - champion tag when requesting !hof [champion]
    return {
        title: title,
        description: "Type **!stats** or **!hof [@player]** to see the personal stats of yourself or another [@player].\nNote: Average Hall of Fame stats require at least 3 games played",
        pages: [
            {
                fields: [
                    {
                        name: "Total MMR gain/loss",
                        value: `:money_with_wings: ${fullStats.gained.stat > 0 ? "+" : ""}${Math.floor(fullStats.gained.stat)} :crown: <@${fullStats.gained.id}>`,
                        inline: false
                    },
                    {
                        name: "Win/Loss",
                        value: `:green_heart: ${fullStats.wins.stat} :crown: <@${fullStats.wins.id}>\n :broken_heart: ${fullStats.losses.stat} :crown: <@${fullStats.losses.id}>`,
                        inline: true
                    },
                    {
                        name: `Average(${best ? "best" : "worst"}) K/D/A`,
                        value: `:bar_chart: ${fullStats.avg_kda.stat.kills}/${fullStats.avg_kda.stat.deaths}/${fullStats.avg_kda.stat.assists} [${fullStats.avg_kda.stat.calc}] :crown: <@${fullStats.avg_kda.id}> \n:first_place: (${fullStats.best_kda.stat.kills}/${fullStats.best_kda.stat.deaths}/${fullStats.best_kda.stat.assists} [${fullStats.best_kda.stat.calc}]) :crown: <@${fullStats.best_kda.id}>`,
                        inline: false
                    },
                    {
                        name: `Average(${best ? "best" : "worst"}) Kill participation/Damage share %`,
                        value: `:raised_hands: :bar_chart: ${fullStats.avg_kp.stat}% :crown: <@${fullStats.avg_kp.id}>\n :raised_hands: :first_place: (${fullStats.best_kp.stat.int}%) :crown: <@${fullStats.best_kp.id}> - ${getChampionName(fullStats.best_kp.stat.champion)}\n:boom: :bar_chart: ${fullStats.avg_dmgshare.stat}% :crown: <@${fullStats.avg_dmgshare.id}>\n:boom: :first_place: (${fullStats.best_dmgshare.stat.int}%) :crown: <@${fullStats.best_dmgshare.id}> - ${getChampionName(fullStats.best_dmgshare.stat.champion)}`,
                        inline: false
                    },
                    {
                        name: `Average(${best ? "best" : "worst"}) CS/m / Best CS / Gold earned`,
                        value: `:crossed_swords: :bar_chart: ${fullStats.avg_cs.stat} :crown: <@${fullStats.avg_cs.id}>\n :crossed_swords: :first_place: (${fullStats.best_cpm.stat.int}) :crown: <@${fullStats.best_cpm.id}> - ${fullStats.best_cpm.stat.champion} \n :farmer: :first_place: (${fullStats.best_cs.stat.int}) :crown: <@${fullStats.best_cs.id}> - ${getChampionName(fullStats.best_cs.stat.champion)}\n:coin: :bar_chart: ${fullStats.avg_gold.stat} :crown: <@${fullStats.avg_gold.id}>\n :coin: :first_place: (${fullStats.best_gold.stat.int}) :crown: <@${fullStats.best_gold.id}> - ${getChampionName(fullStats.best_gold.stat.champion)}`,
                        inline: false
                    }
                ]
            },
            {
                fields: [
                    {
                        name: `Average(${best ? "best" : "worst"}) Damage dealt to champions/ objectives/turrets`,
                        value: `:monkey_face: :bar_chart: ${fullStats.avg_champ_dmg_total.stat} :crown: <@${fullStats.avg_champ_dmg_total.id}>\n :monkey_face: :first_place:(${fullStats.best_champ_dmg_total.stat.int}) :crown: <@${fullStats.best_champ_dmg_total.id}> - ${getChampionName(fullStats.best_champ_dmg_total.stat.champion)}\n:dragon_face: :bar_chart: ${fullStats.avg_objective_dmg.stat} :crown: <@${fullStats.avg_objective_dmg.id}>\n :dragon_face: :first_place: (${fullStats.best_objective_dmg.stat.int}) :crown: <@${fullStats.best_objective_dmg.id}> - ${getChampionName(fullStats.best_objective_dmg.stat.champion)}\n:tokyo_tower: :bar_chart: ${fullStats.avg_turret_dmg.stat} :crown: <@${fullStats.avg_turret_dmg.id}>\n :tokyo_tower: :first_place: (${fullStats.best_turret_dmg.stat.int}) :crown: <@${fullStats.best_turret_dmg.id}> - ${getChampionName(fullStats.best_turret_dmg.stat.champion)}`,
                        inline: false
                    },
                    {
                        name: `Average(${best ? "best" : "worst"}) Damage taken/healed`,
                        value: `:shield: :bar_chart: ${fullStats.avg_taken_dmg_total.stat} :crown: <@${fullStats.avg_taken_dmg_total.id}>\n :shield: :first_place: (${fullStats.best_taken_dmg_total.stat.int}) :crown: <@${fullStats.best_taken_dmg_total.id}> - ${getChampionName(fullStats.best_taken_dmg_total.stat.champion)}\n:ambulance: :bar_chart: ${fullStats.avg_healed_dmg.stat} :crown: <@${fullStats.avg_healed_dmg.id}>\n :ambulance: :first_place: (${fullStats.best_healed_dmg.stat.int}) :crown: <@${fullStats.best_healed_dmg.id}> - ${getChampionName(fullStats.best_healed_dmg.stat.champion)}`,
                        inline: false
                    },
                    {
                        name: `Average(${best ? "best" : "worst"}) Wards/Control wards placed`,
                        value: champion ? `Unfortunately these stats are not available for specific champions.` : `:flashlight: :bar_chart: ${fullStats.avg_wards_placed.stat} :crown: <@${fullStats.avg_wards_placed.id}>\n :flashlight: :first_place: (${fullStats.best_wards_placed.stat.int}) :crown: <@${fullStats.best_wards_placed.id}> - ${getChampionName(fullStats.best_wards_placed.stat.champion)}\n:eye: :bar_chart: ${fullStats.avg_control_wards.stat} :crown: <@${fullStats.avg_control_wards.id}>\n :eye: :first_place: (${fullStats.best_control_wards.stat.int}) :crown: <@${fullStats.best_control_wards.id}> - ${getChampionName(fullStats.best_control_wards.stat.champion)}`,
                        inline: false
                    },
                    {
                        name: "First Blood %",
                        value: champion ? `Unfortunately these stats are not available for specific champions.` : `:drop_of_blood: ${fullStats.first.stat}% :crown: <@${fullStats.first.id}>`,
                        inline: false
                    }
                ]
            }
        ],
        thumbnail: champion ? fetchChampionIcon(champion) : "",
        footer: "",
        menu: {
            hint: "Select type...",
            callback: HOFMenuSort,
            options: [
                {label: "Hall of Fame", description: "The best of every stat", value: true},
                {label: "Hall of Shame", description: "The worst of every stat", value: false},
            ]
        }
    }
}
async function HOFMenuSort(embed, menuValue) {
    let data;
    data = await getHallOfFameStats(getUserList(), menuValue === 'true', getChampion()[0]); //this is the most horrible roundabout way but it only works this way for now. Maybe implement extra variables to insert in the menusort?
    embed.current_page = 0
    embed.init(data)
    embed.update()
}