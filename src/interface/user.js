import User from "../models/user.js"

export const createUser = async (id) => {
	//Warning: create users only through the queue command, or it will fuck up your id and therefore everything else.
	//Update: we still haven't found a way to fix this! MongoDB too stronk!

	let start = {mu: parseInt(process.env.STARTING_MU), sigma: parseInt(process.env.STARTING_SIGMA)}

	const user = await getUser(id)

	if (!user) {
		const newUser = new User({
			_id: id.toString(),
			roles: {
				top: {
					mmr: start,
					wins: 0,
					losses: 0
				},
				jgl: {
					mmr: start,
					wins: 0,
					losses: 0
				},
				mid: {
					mmr: start,
					wins: 0,
					losses: 0
				},
				adc: {
					mmr: start,
					wins: 0,
					losses: 0
				},
				sup: {
					mmr: start,
					wins: 0,
					losses: 0
				},
			},
			matchHistory: []
		})

		await newUser.save()

		return newUser
	}


	return user
}

export const getUser = async (id) => {
	const user = await User.findById(id)

	if (user) {
		return user
	}
	return null
}

export const getUserElo = async (id, role) => {
	const user = await getUser(id)

	if (user) {
		return user.roles[role].mmr
	}
}

export const getUsers = async() => {
	return User.find();
}

export const getUserMatchHistory = async(id) => {
	const user = await getUser(id);

	if (user) {
		return user.matchHistory
	} else {
		return []
	}

	
}
