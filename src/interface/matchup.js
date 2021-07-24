import User from "../models/user.js"

//Takes a role and an array of player id's
//Creates a matchup for each posible permutation
//Probability = expected probability that player1 wins
export const getMatchups = async (role,players) => {
	let out = []

	const users = await User.find({$or: players})

	for (let i=0;i<players.length;i++) {
		//j=0 = normal + inversed, j=i+1 = normal TODO: CHANGE THIS TO ONLY NORMAL
		for (let j=0;j<players.length;j++) {
			if (i != j) {
				let player1Elo = users[i].roles[role].mmr
				let player2Elo = users[j].roles[role].mmr
	
				out.push({player1: users[i]._id, player2: users[j]._id, probability: calculateExpectedOutcome(player1Elo, player2Elo)})
			}		
		}
	}

	return out
}

export const calculateExpectedOutcome = (elo1, elo2) => {
	return 1 / (1 + Math.pow(10, (elo2 - elo1)/500))
}

export const calculateNewElo = (elo1, elo2, win) => {
	let outcome = calculateExpectedOutcome(elo1, elo2)
	win = win ? 1 : 0;

	return elo1 + Math.floor((40 * (win - outcome)))
}

