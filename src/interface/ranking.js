import { ordinal } from "openskill"
import { MessageEmbed } from "discord.js"

import User from "../models/user.js"
import { getRoleEmoji, emojiNumberSelector } from "../helpers/emoji.js"

export const getRanking = async () => {
    //Get all users from the db
    let users = await User.find({} , "", {lean: true})

    //Filters users and outputs a list of objects
    //Each object contains a user id, role, wins, losses and mmr
    //A user will have 1 entry in the list for each role they have played
    let data = users.reduce((out, user) => {
        //For each of a users roles, check to see if they have played any games in that role
        //Discard any roles where the user hasnt played
        let roles = Object.keys(user.roles).reduce((playedRoles, role) => {
            if (user.roles[role].wins > 0 || user.roles[role].losses > 0) {
                return [...playedRoles, {id: user._id, role: role, wins: user.roles[role].wins, losses: user.roles[role].losses, mmr: ordinal(user.roles[role].mmr)}]
            }
            return playedRoles
        }, [])
        out = out.concat(roles)
        return out
    }, [])

    return data
}

export const getUserRanking = async (id) => {
    let ranking = await getRanking()

    let userRanking = ranking.reduce((out, user) => {
        if (user.id == id) {
            return [...out, user]
        }
        return out
    },[]).map(item => {
        let roleRanking = filterRatingByRole(item.role, ranking)
        roleRanking = sortRating(roleRanking)

        let rank = roleRanking.findIndex(element => element.id == id)

        item["rank"] = rank + 1

        return item
    })

    return userRanking
}

export const getRoleRanking = async (role) => {
    let ranking = await getRanking()

    let roleRanking = filterRatingByRole(role, ranking)

    roleRanking = sortRating(roleRanking)

    return roleRanking
}

const filterRatingByRole = (role, users) => {
    return users.filter(user => {
        if (user.role == role) {
            return user
        }
    })
}

const sortRating = (users) => {
    return users.sort((user1, user2) => {
        if (user1.mmr > user2.mmr) {
            return -1
        } else if (user1.mmr < user2.mmr) {
            return 1
        }
        return 0
    })
}

export const getUserRankEmbed = async (id, nickname) => {
    let userRanking = await getUserRanking(id)

    let embed = new MessageEmbed()
    .setTitle(`Ranks for ${nickname}`)
    .setDescription("Type !ranking or !ranking [role] for role rankings")
    .setColor("#ff00ff")

    let role_msg = ""
    let mmr_msg = ""
    let ratio_msg = ""

    userRanking.forEach(role => {
        role_msg += `${getRoleEmoji(role.role)} ${emojiNumberSelector(role.rank)} \n`
        mmr_msg += `${Math.floor(role.mmr)} \n`
        ratio_msg += `${role.wins}/${role.losses} \n`
    })

    embed.addField("Role & Rank", role_msg, true)
    embed.addField("MMR", mmr_msg, true)
    embed.addField("Win/Loss", ratio_msg, true)

    return embed
}

export const getRoleRankEmbed = async (role) => {
    const PAGE_SIZE = 10

    let roleRanking = await getRoleRanking(role)

    let pages = []

    let rank_msg = ""
    let player_msg = ""
    let mmr_msg = ""

    roleRanking.forEach((user, index) => {
        rank_msg += `${emojiNumberSelector(index+1)} \n`
        player_msg += `<@${user.id}> \n`
        mmr_msg += `${Math.floor(user.mmr)}, ${user.wins}/${user.losses} \n`

        if ((index+1) % PAGE_SIZE == 0 || index == roleRanking.length - 1) {
            pages.push({fields: [
                {
                    name: "Rank",
                    value: rank_msg,
                    inline: true
                },
                {
                    name: "Player",
                    value: player_msg,
                    inline: true
                },
                {
                    name: "MMR & Win/Loss",
                    value: mmr_msg,
                    inline: true
                }
            ]})

            rank_msg = ""
            player_msg = ""
            mmr_msg = ""
        }
    })

    return pages
}

export const getAllRankingEmbed = async () => {
    const PAGE_SIZE = 10

    let users = await getRanking()

    let ranking = sortRating(users)

    let pages = []

    let rank_msg = ""
    let player_msg = ""
    let mmr_msg = ""

    ranking.forEach((user, index) => {
        rank_msg += `${emojiNumberSelector(index+1)} ${getRoleEmoji(user.role)} \n`
        player_msg += `<@${user.id}> \n`
        mmr_msg += `${Math.floor(user.mmr)}, ${user.wins}/${user.losses} \n`

        if ((index+1) % PAGE_SIZE == 0 || index == ranking.length - 1) {
            pages.push({fields: [
                {
                    name: "Rank & Role",
                    value: rank_msg,
                    inline: true
                },
                {
                    name: "Player",
                    value: player_msg,
                    inline: true
                },
                {
                    name: "MMR & Win/Loss",
                    value: mmr_msg,
                    inline: true
                }
            ]})

            rank_msg = ""
            player_msg = ""
            mmr_msg = ""
        }
    })

    return pages
}