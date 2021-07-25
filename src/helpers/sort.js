

export const quickSortPlayers = (players, role) => {
    switch (role) {
        case 'top':
        case "jgl":
        case "mid":
        case "adc":
        case "sup":
            players.sort((user1,user2) => {
                if (user1.roles[role].mmr > user2.roles[role].mmr) {
                    return 1
                } else if (user1.roles[role].mmr < user2.roles[role].mmr) {
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
        default:
            return null
    }

    return players.reverse()
}