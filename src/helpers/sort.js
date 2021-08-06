import {ordinal} from "openskill"

//this is the main sorting algorithm. It's completely fucked but it works. Needs rework probably
export const quickSortPlayers = (players, role) => {
    switch (role) {
        case 'top':
        case "jgl":
        case "mid":
        case "adc":
        case "sup":
            players.sort((user1,user2) => {
                if (ordinal(user1.roles[role].mmr) > ordinal(user2.roles[role].mmr)) {
                    return 1
                } else if (ordinal(user1.roles[role].mmr) < ordinal(user2.roles[role].mmr)) {
                    return -1
                }
                return 0
            })
            break
        case 'all':
            players.sort((user1,user2) => {
                if (user1[2] > user2[2]) {
                    return 1
                } else if (user1[2] < user2[2]) {
                    return -1
                }
                return 0
            })
            break
        case 'champStats':
            players.sort((champ1,champ2) => {
                if (champ1.mmrDiff > champ2.mmrDiff) {
                    return 1
                } else if (champ1.mmrDiff < champ2.mmrDiff) {
                    return -1
                }
                return 0
            })
            break
        case 'teammates':
            players.sort((teammate1,teammate2) => {
                if (teammate1.mmr > teammate2.mmr) {
                    return 1
                } else if (teammate1.mmr < teammate2.mmr) {
                    return -1
                }
                return 0
            })
            break
        case 'average':
            players.sort((user1,user2) => {
                if (user1.average > user2.average) {
                    return 1
                } else if (user1.average < user2.average) {
                    return -1
                }
                return 0
            })
            break
        default:
            return null
    }

    return players.reverse()
}

//a different sorting algorithm used for !meta command.
export const sortMetaData = (data, type) => {
    let items = Object.keys(data).map(function(key) {
        return [key, data[key]];
    });

    switch (type) {
        case 'mmr':
            items.sort(function(first, second) {
                return second[1].mmrDiff - first[1].mmrDiff;
            });
            break
        case 'pickrate':
            items.sort(function(first, second) {
                return second[1].pickRate - first[1].pickRate;
            });
            break
        case 'reverse_mmr':
            items.sort(function(first, second) {
                return first[1].mmrDiff - second[1].mmrDiff;
            });
            break
        case 'reverse_pickrate':
            items.sort(function(first, second) {
                return first[1].pickRate - second[1].pickRate;
            });
            break
        case 'banrate':
            items.sort(function(first, second) {
                return second[1].banRate - first[1].banRate;
                
            })
            break
        case 'reverse_banrate':
            items.sort(function(first, second) {
                return first[1].banRate - second[1].banRate;
            })
            break
    }

    let sortedData={}
    items.forEach((arrayData) => {
        let key = arrayData[0];
        sortedData[key] = arrayData[1];
    })

    return(sortedData)
}
