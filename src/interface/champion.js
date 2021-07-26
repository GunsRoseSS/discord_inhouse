import {quickSortPlayers} from "../helpers/sort.js";
import {checkPositive} from "../helpers/format.js";
import {emojiNumberSelector} from "../helpers/emoji.js";


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
                embedString = embedString + player.wins.toString() + '/' + player.losses.toString() + '\n'
        }
    }
    return embedString

}
