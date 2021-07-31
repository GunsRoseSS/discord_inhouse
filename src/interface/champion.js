import {quickSortPlayers} from "../helpers/sort.js";
import {checkPositive} from "../helpers/format.js";
import {emojiNumberSelector} from "../helpers/emoji.js";
import EasyEmbedPages from 'easy-embed-pages';


export const fetchChampionIcon = (champion) => {
    return `https://ddragon.leagueoflegends.com/cdn/11.15.1/img/champion/${champion}.png`
}

export const getAllPlayerChampionStats = (players, champion) => {
    let dataArray = [];
    for (let player of players) {
        for (let champ of player.championStats){
            if (champ.name === champion){
                let embedObject = {
                    player: player._id,
                    mmrDiff: champ.mmrDiff,
                    wins: champ.wins,
                    losses: champ.losses
                }
                dataArray.push(embedObject);
            }
        }
    }
    return quickSortPlayers(dataArray, 'champStats')
}

export const championDataToEmbed = (playersData, type) => { //consistency? fuck consistency!
    let embedString = '';
    let counter = 0;
    for (let player of playersData){
        counter += 1
        switch (type) {
            case 'nickname':
                embedString = embedString + emojiNumberSelector(counter) + '<@' + player.player + '>' + '\n';
                break
            case 'champion':
                embedString = embedString + player.name + '\n';
                break
            case 'mmr':
                embedString = embedString + checkPositive(player.mmrDiff).toString() + '\n';
                break
            case 'winLoss':
                embedString = embedString + player.wins.toString() + '/' + player.losses.toString() + '\n';
                break
            case 'mmrWinLoss':
                embedString = embedString + checkPositive(player.mmrDiff).toString() + ', ' + player.wins.toString() + '/' + player.losses.toString() + '\n';
                break
        }
    }
    return embedString

}

export const getPaginatedChampionEmbed = (message, embedData) => {
    let pages = [];

    const PAGE_SIZE = 10;
    let rank_msg = "";
    let champ_msg = "";
    let mmr_msg = "";

    embedData.forEach((data, index) => {
        rank_msg += `${emojiNumberSelector(index+1)}: <@${data.id}>\n`
        champ_msg += `${data.name} \n`
        mmr_msg += `${checkPositive(data.mmrDiff)}, ${data.wins}/${data.losses} \n`

        if ((index+1) % PAGE_SIZE == 0 || index == embedData.length - 1) {
            pages.push({fields: [
                    {
                        name: "Player",
                        value: rank_msg,
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

            rank_msg = ""
            champ_msg = ""
            mmr_msg = ""
        }
    })

    return new EasyEmbedPages(message.channel, {
        title: `All champion stats.`,
        description: "Type **!champions [@player]** to view another player's champion stats",
        color: '6678B8',
        allowStop: true,
        time: 300000,
        ratelimit: 1500,
        pages: pages
    })
}
