import { MessageEmbed } from "discord.js"
import {MessageButton} from "discord-buttons"

import { getRoleEmoji } from "../helpers/emoji.js"
import { formatUsers } from "../helpers/format.js"

import Queue from "../models/queue.js"

export const addToQueue = async (id, roles) => {

	var user = await Queue.findById(id)

	if (!user) {
		user = new Queue({_id:id, roles:[]})
	}

	roles.forEach((role) => {
		if (!user.roles.includes(role)) {
			user.roles.push(role)
		}
	})

	await user.save()
}

export const getQueue = async () => {
	return Queue.find();
}

export const clearQueue = async () => {
	const status = await Queue.deleteMany()

	return status.deletedCount
}

export const playersInQueue = async () => {
	return Queue.find()
}

export const playersInRole = async (role) => {
	return Queue.find({roles: role}, "_id")
}

export const getQueueEmbed = async () => {
	const roles = ["top", "jgl", "mid", "adc", "sup"]
	
	let queue_embed = new MessageEmbed()
	.setTitle(`Current queue ${(await playersInQueue()).length}/10`)
	.setColor("#FF0F00")

	let msg = ""

	for (const role of roles) {
		let players = formatUsers(await playersInRole(role)).reduce((out, player) => {return [...out, `<@${player}>`]}, [])

		msg += `${getRoleEmoji(role)} \u2800 ${players.join(", ")} \n`
	}


	queue_embed.setDescription(msg)

	return queue_embed
}

export const leaveQueue = async (id) => {
	return Queue.deleteOne({_id: id})
}
