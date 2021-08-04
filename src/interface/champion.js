import { getUserMatchHistory } from "./user.js"

import { ordinal } from "openskill"

import Game from "../models/game.js"

import { getMemberNickname } from "../helpers/discord.js"

import { formatChampions, getChampionName } from "../helpers/format.js"

import { emojiNumberSelector } from "../helpers/emoji.js"

const fetchChampionIcon = (champion) => {
    return `https://ddragon.leagueoflegends.com/cdn/11.15.1/img/champion/${champion}.png`
}

export const getPlayerChampionDatav2 = async (id) => {
    let history = await getUserMatchHistory(id)

    if (!history || history.length === 0) {
        return null
    }

    let games = await Game.find({$or: history.map(match => match = {_id: match})})

    let champions = {}

    let statList = ['kills', 'deaths', 'assists', 'cs', 'gold', 'spree', 'champ_dmg_total', 'objective_dmg', 'turret_dmg', 'healed_dmg', 'taken_dmg_total'];

    games.forEach(game => {
        let player = game.players.find(element => element.id === id);
        let win = game.winner === player.team;

        let statsEntered = false;
        if (game.bans){
            statsEntered = true;
        }

        let totalkills = 0;
        if (statsEntered) {
            for (let user of game.players) {
                if (user.team === player.team) {
                    totalkills += parseInt(user.stats.kills);
                }
            }
        }

        if (player.champion in champions) {
            champions[player.champion].wins += win ? 1 : 0;
            champions[player.champion].losses += win ? 0 : 1;
            champions[player.champion].gained += ordinal(player.afterGameElo) - ordinal(player.previousElo);
            if (statsEntered) {
                for (let stat of statList) {
                    champions[player.champion][`avg_${stat}`] += parseInt(player.stats[`${stat}`]);
                    if (champions[player.champion][`best_${stat}`] < parseInt(player.stats[`${stat}`])) {
                        champions[player.champion][`best_${stat}`] = parseInt(player.stats[`${stat}`]);
                    }
                }
                if (champions[player.champion][`best_multi`] < parseInt(player.stats.multi)) {
                    champions[player.champion][`best_multi`] = parseInt(player.stats.multi);
                }
                champions[player.champion].divideBy += 1;
                if (champions[player.champion].best_kp < Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10) {
                    champions[player.champion].best_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
                }
                champions[player.champion].avg_kp += Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
            }
        } else {
            champions[player.champion] = {wins: win ? 1 : 0, losses: win ? 0 : 1, gained: ordinal(player.afterGameElo) - ordinal(player.previousElo)};
            if (statsEntered) {
                for (let stat of statList) {
                    champions[player.champion][`best_${stat}`] = parseInt(player.stats[`${stat}`]);
                    champions[player.champion][`avg_${stat}`] = parseInt(player.stats[`${stat}`]);
                }
                champions[player.champion][`best_multi`] = player.stats.multi;
                champions[player.champion].divideBy = 1;
                champions[player.champion].avg_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
                champions[player.champion].best_kp = Math.round((parseInt(player.stats.kills) + parseInt(player.stats.assists)) / totalkills * 1000) / 10;
            }
        }
    })

    Object.values(champions).forEach(champ => {
        for (let stat of statList){
            if (stat === 'kills' || stat === 'deaths' || stat === 'assists' || stat === 'cs' || stat === 'spree') {
                champ[`avg_${stat}`] = Math.round(champ[`avg_${stat}`] * 10 / champ.divideBy) / 10; //provides one decimal, useful for lower number stats
            } else {
                champ[`avg_${stat}`] = Math.round(champ[`avg_${stat}`] / champ.divideBy);
            }
        }
        champ.avg_kp = Math.round(champ.avg_kp / champ.divideBy * 10) / 10;
    })

    return champions
}

const getAllChampionsDatav2 = async () => {
    let games = await Game.find()

    let players = {}

    games.forEach(game => {
        game.players.forEach((player, index) => {
            let win = ((game.winner == "BLUE" && index < 5) || (game.winner == "RED" && index >= 5)) ? true : false

            if (!(player.id in players)) {
                players[player.id] = {}
            }

            if (player.champion in players[player.id]) {
                players[player.id][player.champion].gained += ordinal(player.afterGameElo) - ordinal(player.previousElo)
                players[player.id][player.champion].wins += win ? 1 : 0
                players[player.id][player.champion].losses += win ? 0 : 1
            } else {
                players[player.id][player.champion] = {wins: win ? 1 : 0, losses: win ? 0 : 1, gained: ordinal(player.afterGameElo) - ordinal(player.previousElo)}
            }
        })
    })

    return players
}

export const getAllPlayerChampionEmbedv2 = async (champion) => {
    let data = await getAllChampionsDatav2()

    champion = formatChampions([champion])

    if (champion.length > 0) {
        champion = champion[0]
    } else {
        return null
    }

    data = Object.keys(data).reduce((out, player) => {
        for (let champ of Object.keys(data[player])) {
            if (champ == champion) {
                out.push({id: player, name: champ, ...data[player][champ]})
            }       
        }
        return out
    }, []).sort((champ1, champ2) => {
        if (champ1.gained > champ2.gained) {
            return -1
        } else if (champ1.gained < champ2.gained) {
            return 1
        }
        return 0
    })

    let pages = []

    const PAGE_SIZE = 10
    
    let player_msg = ""
    let mmr_msg = ""
    let win_msg = ""

    data.forEach((player, index) => {
        player_msg += `${emojiNumberSelector(index+1)} : <@${player.id}> \n`
        mmr_msg += `${player.gained > 0 ? "+" : ""}${Math.floor(player.gained)} \n`
        win_msg += `${player.wins}/${player.losses} \n`
    
        if ((index+1) % PAGE_SIZE == 0 || index == data.length - 1) {
            pages.push({fields: [
                {
                    name: "Player",
                    value: player_msg,
                    inline: true
                },
                {
                    name: "Total MMR gain/loss",
                    value: mmr_msg,
                    inline: true
                },
                {
                    name: "Win/Loss",
                    value: win_msg,
                    inline: true
                }
            ]})

            player_msg = ""
            mmr_msg = ""
            win_msg = ""
        }
    })

    return {
        title: `${champion} stats for all players`,
        description: "Type **!champion [champion]** to view your own stats for that champion or **!champion [champion] [@player]** to view stats of the champion for another player.",
        thumbnail: fetchChampionIcon(champion),
        pages: pages
    }
}

export const getAllChampionsEmbedv2 = async () => {
    let data = await getAllChampionsDatav2()

    data = Object.keys(data).reduce((out, player) => {
        for (let champ of Object.keys(data[player])) {
            out.push({id: player, name: champ, ...data[player][champ]})
        }
        return out
    }, []).sort((champ1, champ2) => {
        if (champ1.gained > champ2.gained) {
            return -1
        } else if (champ1.gained < champ2.gained) {
            return 1
        }
        return 0
    })

    let pages = []

    const PAGE_SIZE = 10
    
    let player_msg = ""
    let champ_msg = ""
    let mmr_msg = ""

    data.forEach((champ, index) => {
        player_msg += `${emojiNumberSelector(index+1)} : <@${champ.id}> \n`
        champ_msg += `${getChampionName(champ.name)} \n`
        mmr_msg += `${champ.gained > 0 ? "+" : ""}${Math.floor(champ.gained)}, ${champ.wins}/${champ.losses}\n`
    
        if ((index+1) % PAGE_SIZE === 0 || index === data.length - 1) {
            pages.push({fields: [
                {
                    name: "Player",
                    value: player_msg,
                    inline: true
                },
                {
                    name: "Champion",
                    value: champ_msg,
                    inline: true
                },
                {
                    name: "MMR & Win/Loss",
                    value: mmr_msg,
                    inline: true
                }
            ]})

            player_msg = ""
            champ_msg = ""
            mmr_msg = ""
        }
    })

    return {
        title: "All champion stats",
        description: "Type **!champions [@player]** to view another player's champion stats",
        pages: pages
    }
}

export const getPlayerChampionsEmbedv2 = async (id, userList) => {
    let pages = []

    const PAGE_SIZE = 10
    
    let champ_msg = ""
    let mmr_msg = ""
    let wins_msg = ""

    let champData = await getPlayerChampionDatav2(id)

    if (champData == null) {
        return null
    }

    let embed = {
        title: `All champion stats for ${getMemberNickname(id, userList)}`,
        description: "Type **!champions [@player]** to view another player's champion stats"
    }

    champData = Object.keys(champData).sort((champ1, champ2) => {
        if (champData[champ1].gained > champData[champ2].gained) {
            return -1
        } else if (champData[champ1].gained < champData[champ2].gained) {
            return 1
        }
        return 0
    }).map(champ => {
        return {name: champ, gained: champData[champ].gained, wins: champData[champ].wins, losses: champData[champ].losses}
    })
    
    champData.forEach((champion, index) => {
        champ_msg += `${getChampionName(champion.name)} \n`
        mmr_msg += `${champion.gained > 0 ? "+" : ""}${Math.floor(champion.gained)} \n`
        wins_msg += `${champion.wins}/${champion.losses} \n`
    
        if ((index+1) % PAGE_SIZE == 0 || index == champData.length - 1) {
            pages.push({fields: [
                {
                    name: "Champion",
                    value: champ_msg,
                    inline: true
                },
                {
                    name: "Total MMR gain/loss",
                    value: mmr_msg,
                    inline: true
                },
                {
                    name: "Win/Loss",
                    value: wins_msg,
                    inline: true
                }
            ]})

            champ_msg = ""
            mmr_msg = ""
            wins_msg = ""

        }
    })

    embed.pages = pages

    return embed  
}

export const getPlayerChampionEmbedv2 = async (id, champion, userList) => {
    let champs = await getPlayerChampionDatav2(id);

    if (champs == null) {
        return null
    }

    champion = formatChampions([champion])

    if (champion.length > 0) {
        champion = champion[0];
        if (champion in champs) {
            return {
                title: `${getChampionName(champion)} stats for ${getMemberNickname(id, userList)}`,
                description: "Type **!champion [champion] all** to view stats of all players for that champion or **!champion [champion] [@player]** to view stats of that player for the champion.",
                thumbnail: fetchChampionIcon(champion),
                fields: [
                    {name: "Total MMR gain/loss", value: `${champs[champion].gained > 0 ? "+" : ""}${Math.floor(champs[champion].gained)}`, inline: true},
                    {name: "Win/Loss", value: `${champs[champion].wins}/${champs[champion].losses}`, inline: true},
                    {name: "Average(Best) K/D/A", value: `${champs[champion].avg_kills}/${champs[champion].avg_deaths}/${champs[champion].avg_assists} (${champs[champion].best_kills})/(${champs[champion].best_deaths})/(${champs[champion].best_assists})`, inline: true},
                    {name: "Average(Best) Kill participation %", value: `:raised_hands: ${champs[champion].avg_kp}%(${champs[champion].best_kp}%)`, inline: true},
                    {name: "Average(Best) CS/Gold earned", value: `:crossed_swords: ${champs[champion].avg_cs}(${champs[champion].best_cs})/\n:coin: ${champs[champion].avg_gold}(${champs[champion].best_gold})`, inline: true},
                    {name: "Average(Best) Damage dealt to champions/ objectives/turrets", value: `:monkey_face: ${champs[champion].avg_champ_dmg_total}(${champs[champion].best_champ_dmg_total})/\n:dragon_face: ${champs[champion].avg_objective_dmg}(${champs[champion].best_objective_dmg})/\n:tokyo_tower: ${champs[champion].avg_turret_dmg}(${champs[champion].best_turret_dmg})`, inline: true},
                    {name: "Average(Best) Damage taken/healed", value: `:shield: ${champs[champion].avg_taken_dmg_total}(${champs[champion].best_taken_dmg_total})/\n:ambulance: ${champs[champion].avg_healed_dmg}(${champs[champion].best_healed_dmg})`, inline: true},
                ], footer: ""
            }
        }
    }

    return null
}
