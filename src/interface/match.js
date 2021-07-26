import {MessageEmbed} from "discord.js"
import {MessageButton} from "discord-buttons"

import {getRoleEmoji, getStateEmoji} from "../helpers/emoji.js"

export const getMatchMessageEmbed = (match, player_states, started = false) => {
    let match_embed = new MessageEmbed()
        .setTitle(!started ? "Match found" : "Match accepted")
        .setDescription(`Expected outcome: ${(match.expected_outcome >= 0.5000) ? (match.expected_outcome * 100.0000).toFixed(2) + "% BLUE" : ((1.0000 - match.expected_outcome) * 100.0000).toFixed(2) + "% RED"} \n
		Average matchup deviation: ${(match.avg_matchup_deviation * 100.0000).toFixed(2)}% \n\n`)
        .setFooter("\u2800".repeat(50))
        .setColor('#a87732')

    let msg_blue_side = ""
    let msg_red_side = ""
    let msg_outcome = ""
    let msg_ping = ""

    //Yes
    let count = 0

    let roles = ["top", "jgl", "mid", "adc", "sup"]

    for (const matchup of match.game) {
        let p1_name = player_states[matchup.player1].user
        let p2_name = player_states[matchup.player2].user

        msg_ping += `${p1_name} ${p2_name}`

        msg_blue_side += `${getRoleEmoji(roles[count])} \u2800 ${!started ? getStateEmoji(player_states[matchup.player1].state) : ""} ${p1_name} \u2800 \n`
        msg_red_side += `${getRoleEmoji(roles[count])} \u2800 ${!started ? getStateEmoji(player_states[matchup.player2].state) : ""} ${p2_name} \u2800 \n`
        msg_outcome += `${(matchup.probability * 100.0000).toFixed(2)}% \n`
        count++
    }

    match_embed.addField("BLUE", msg_blue_side, true)
    match_embed.addField("RED", msg_red_side, true)
    match_embed.addField("OUTCOME", msg_outcome, true)

    if (started) {
        return {msg: msg_ping, embed: match_embed}
    }


    let btn_accept = new MessageButton()
        .setLabel("Accept")
        .setID("accept_game")
        .setStyle("green")

    let btn_decline = new MessageButton()
        .setLabel("Decline")
        .setID("decline_game")
        .setStyle("red")

    return {msg: msg_ping, embed: {buttons: [btn_accept, btn_decline], embed: match_embed}}
}

export const getMatchEndMessageEmbed = (initiator, winner, player_states) => {
    let msg = `${initiator} wants to score the game as a win for ${winner} \n Result will be accepted after 6 players confirm \n`
    let msg_ping = ""

    let acceptCount = 0;
    let declineCount = 0;

    Object.keys(player_states).forEach(player => {
        const p = player_states[player]
        if (p.state === "accept") {
            acceptCount++
        }
        if (p.state === "decline") {
            declineCount++
        }
        //msg += getStateEmoji(p.state)
        msg_ping += `${p.user}`
    })

    msg += getStateEmoji("accept").repeat(acceptCount);
    msg += getStateEmoji("decline").repeat(declineCount);
    msg += getStateEmoji("none").repeat(10 - acceptCount - declineCount);

    msg += `\u2800 \u2800 ${acceptCount}/6`;

    let match_embed = new MessageEmbed()
        .setTitle("Confirm match end")
        .setDescription(msg)
        .setColor('#32a83e')

    let btn_confirm = new MessageButton()
        .setLabel("Confirm")
        .setID("confirm_win")
        .setStyle("green")

    let btn_deny = new MessageButton()
        .setLabel("Deny")
        .setID("deny_win")
        .setStyle("red")

    return {msg: msg_ping, embed: {buttons: [btn_confirm, btn_deny], embed: match_embed}}
}

export const getPlayerSide = (match, id, invert = false) => {
    for (const matchup of match.game) {
        if (matchup["player1"] === id) {
            return !invert ? "BLUE" : "RED"
        } else if (matchup["player2"] === id) {
            return !invert ? "RED" : "BLUE"
        }
    }
}

export const countReadyPlayers = (player_states) => {
    return Object.keys(player_states).reduce((count, id) => {
        if (player_states[id].state === "accept") {
            return count + 1
        }
        return count
    }, 0)
}

export const countDeclinedPlayers = (player_states) => {
    return Object.keys(player_states).reduce((count, id) => {
        if (player_states[id].state === "decline") {
            return count + 1
        }
        return count
    }, 0)
}
