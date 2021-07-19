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
