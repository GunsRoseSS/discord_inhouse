import User from "../models/user.js"

export const createUser = async (id, elo) => {
	var startingElo

	if (elo) {
		startingElo = {"top":elo[0], "jgl":elo[1],"mid":elo[2], "adc":elo[3],"sup":elo[4]}
	} else {
		const initial = 400
		startingElo = {"top":initial, "jgl":initial,"mid":initial, "adc":initial,"sup":initial}
	}

	const user = await getUser(id)

	if (!user) {
		const newUser = new User({_id:id, elo: startingElo})

		await newUser.save()

		return newUser
	}

	user.elo = startingElo

	await user.save()

	return user
}

export const getUser = async (id) => {
	const user = await User.findById(id)

	if (user) {
		return user
	}
	return null
}

export const addElo = async (id, role, amount) => {
	const user = await getUser(id)
	
	if (user) {
		user.elo.set(role, user.elo.get(role) + amount)
		await user.save()
	}
}

export const getUsers = async(id) => {
	const users = await User.find()

	return users
}

export const deleteUsers = async() => {
	await User.deleteMany()
}
