import User from "../models/user.js"

//Takes a role and an array of player id's
//Creates a matchup for each posible permutation
//Probability = expected probability that player1 wins
export const getMatchups = async (role,players) => {
	let out = []

	const users = await User.find({$or: players})
	//Currently does 1 query per matchup
	//TODO: Optimise by reducing number of queries
	for (let i=0;i<players.length;i++) {
		//j=0 = normal + inversed, j=i+1 = normal
		for (let j=0;j<players.length;j++) {
			if (i != j) {
				const player1Elo = users[i].elo.get(role)
				const player2Elo = users[j].elo.get(role)
	
				out.push({player1: users[i]._id, player2: users[j]._id, probability: calculateExpectedOutcome(player1Elo, player2Elo)})
			}		
		}
	}

	return out
}

const calculateExpectedOutcome = (elo1, elo2) => {
	return 1 / (1 + Math.pow(10, (elo2 - elo1)/400))
}

