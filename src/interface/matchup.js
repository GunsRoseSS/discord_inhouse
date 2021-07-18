import Matchup from "../models/matchup.js"

//Takes a role and an array of player id's
//Gets/Creates a matchup for each posible permutation
//Chance = expected % chance that player1 wins
export const getMatchups = async (role, players) => {
	let out = []

	for (let i=0;i<players.length;i++) {
		//j=0 = normal + inversed, j=i+1 = normal
		for (let j=0;j<players.length;j++) {
			if (i != j) {
				let matchup = await Matchup.findOne({role: role, player1: players[i], player2: players[j]}, "-_id -role -__v")
	
				if (!matchup) {
					//TODO: Add calculation for expected outcome
					matchup = new Matchup({player1: players[i], player2: players[j], role: role, chance: 50.0})
	
					await matchup.save()
	
					matchup = {player1: matchup.player1, player2: matchup.player2, chance: matchup.chance}
				}
	
				out.push(matchup)
			}		
		}
	}

	return out
}

