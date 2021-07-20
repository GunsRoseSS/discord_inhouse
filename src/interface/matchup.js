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
		//j=0 = normal + inversed, j=i+1 = normal TODO: CHANGE THIS TO ONLY NORMAL
		for (let j=0;j<players.length;j++) {
			if (i != j) {
				let player1Elo = undefined
				let player2Elo = undefined
				switch (role.toLowerCase()) {
					case 'top':
						player1Elo = users[i].roles.top.mmr
						player2Elo = users[j].roles.top.mmr
						break
					case 'jgl':
						player1Elo = users[i].roles.jgl.mmr
						player2Elo = users[j].roles.jgl.mmr
						break
					case 'mid':
						player1Elo = users[i].roles.mid.mmr
						player2Elo = users[j].roles.mid.mmr
						break
					case 'adc':
						player1Elo = users[i].roles.adc.mmr
						player2Elo = users[j].roles.adc.mmr
						break
					case 'sup':
						player1Elo = users[i].roles.sup.mmr
						player2Elo = users[j].roles.sup.mmr
						break
				}
	
				out.push({player1: users[i]._id, player2: users[j]._id, probability: calculateExpectedOutcome(player1Elo, player2Elo)})
			}		
		}
	}

	return out
}

const calculateExpectedOutcome = (elo1, elo2) => {
	return 1 / (1 + Math.pow(10, (elo2 - elo1)/400))
}

