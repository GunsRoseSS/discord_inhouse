import User from "../models/user.js"

export const createUser = async (id, elo) => {
	//Warning: create users only through the queue command, or it will fuck up your id and therefore everything else.
	var startingElo;

	if (elo) {
		startingElo = [elo[0], elo[1], elo[2], elo[3], elo[4]];
	} else {
		startingElo = [500, 500, 500, 500, 500];
	}

	const user = await getUser(id)

	if (!user) {
		const newUser = new User({
			_id: id.toString(),
			roles: {
				top: {
					mmr: startingElo[0],
					wins: 0,
					losses: 0
				},
				jgl: {
					mmr: startingElo[1],
					wins: 0,
					losses: 0
				},
				mid: {
					mmr: startingElo[2],
					wins: 0,
					losses: 0
				},
				adc: {
					mmr: startingElo[3],
					wins: 0,
					losses: 0
				},
				sup: {
					mmr: startingElo[4],
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

export const addElo = async (id, role, amount) => {
	const user = await getUser(id)
	
	if (user) {
		user.elo.set(role, user.elo.get(role) + amount)
		await user.save()
	}
}

export const getUsers = async() => {
	return User.find();
}

export const deleteUsers = async() => {
	await User.deleteMany()
}

export const getUserMatchHistory = async(id) => {
	const user = await getUser(id);

	return user.matchHistory
}
