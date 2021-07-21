

export const quickSortPlayers = (players, role) => {
    switch (role) {
        case 'top':
            players.sort((user1,user2) => {
                if (user1.roles.top.mmr > user2.roles.top.mmr) {
                    return 1
                } else if (user1.roles.top.mmr < user2.roles.top.mmr) {
                    return -1
                }
                return 0
            })
            break
        case 'jgl':
            players.sort((user1,user2) => {
                if (user1.roles.jgl.mmr > user2.roles.jgl.mmr) {
                    return 1
                } else if (user1.roles.jgl.mmr < user2.roles.jgl.mmr) {
                    return -1
                }
                return 0
            })
            break
        case 'mid':
            players.sort((user1,user2) => {
                if (user1.roles.mid.mmr > user2.roles.mid.mmr) {
                    return 1
                } else if (user1.roles.mid.mmr < user2.roles.mid.mmr) {
                    return -1
                }
                return 0
            })
            break
        case 'adc':
            players.sort((user1,user2) => {
                if (user1.roles.adc.mmr > user2.roles.adc.mmr) {
                    return 1
                } else if (user1.roles.adc.mmr < user2.roles.adc.mmr) {
                    return -1
                }
                return 0
            })
            break
        case 'sup':
            players.sort((user1,user2) => {
                if (user1.roles.sup.mmr > user2.roles.sup.mmr) {
                    return 1
                } else if (user1.roles.sup.mmr < user2.roles.sup.mmr) {
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