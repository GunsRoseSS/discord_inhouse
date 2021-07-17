import mongoose from "mongoose"
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
	const queue = await Queue.find()

	return queue
}

export const clearQueue = async () => {
	const status = await Queue.deleteMany()

	return status.deletedCount
}

export const playersInQueue = async () => {
	const players = await Queue.find()

	return players
}

export const playersInRole = async (role) => {
	const players = await Queue.find({roles: role}, "_id")

	return players
}
