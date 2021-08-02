import {MessageEmbed} from "discord.js"
import {MessageButton} from "discord-buttons"

import {getRoleEmoji, getStateEmoji} from "../helpers/emoji.js"
import { createEmbed } from "./embed.js"

import { btnAcceptClick, btnAcceptWinClick, btnDeclineClick, btnDeclineWinClick } from "../app.js"

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
    let msg_ping = "||"

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

    let out = {
        message: msg_ping + "||",
        title: !started ? "Match found" : "Match accepted",
        description: `Expected outcome: ${(match.expected_outcome >= 0.5000) ? (match.expected_outcome * 100.0000).toFixed(2) + "% BLUE" : ((1.0000 - match.expected_outcome) * 100.0000).toFixed(2) + "% RED"} \n
		Average matchup deviation: ${(match.avg_matchup_deviation * 100.0000).toFixed(2)}% \n\n`,
        colour: "#a87732",
        fields: [
            {name: "BLUE", value: msg_blue_side, inline: true},
            {name: "RED", value: msg_red_side, inline: true},
            {name: "OUTCOME", value: msg_outcome, inline: true},
        ]
    }

    if (!started) {
        out.buttons = [
            {id: "accept_game", label: "Accept", style: "green", callback: btnAcceptClick},
            {id: "decline_game", label: "Decline", style: "red", callback: btnDeclineClick}
        ]
    }

    return out
}

export const getMatchEndMessageEmbed = (initiator, winner, player_states) => {
    let msg = `${initiator} wants to score the game as a win for ${winner} \n Result will be accepted after 6 players confirm \n\n`
    let msg_ping = "||"

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
        msg_ping += `${p.user}`
    })

    msg += getStateEmoji("accept").repeat(acceptCount);
    msg += getStateEmoji("decline").repeat(declineCount);
    msg += getStateEmoji("none").repeat(10 - acceptCount - declineCount);

    msg += `\u2800 \u2800 ${acceptCount}/6`;

    return {
        message: msg_ping + "||",
        title: "Confirm match end",
        description: msg,
        colour: "32a83e",
        buttons: [
            {id: "confirm_win", label: "Confirm", style: "green", callback: btnAcceptWinClick},
            {id: "decline_win", label: "Deny", style: "red", callback: btnDeclineWinClick}
        ]
    }

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
