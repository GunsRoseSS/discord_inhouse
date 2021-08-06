import User from "../models/user.js"

import {ordinal, rating, rate} from "openskill"

//Takes a role and an array of player id's
//Creates a matchup for each posible permutation
//Probability = expected probability that player1 wins
export const getMatchups = async (role,players) => {
	let out = []

	let users = await User.find({$or: players.map(player => player = {_id: player._id})})

	users = users.sort((player1, player2) => {
		let index1 = players.findIndex(element => element._id == player1._id)
		let index2 = players.findIndex(element => element._id == player2._id)
	

		if (index1 < index2) {
			return -1
		} else if (index1 > index2) {
			return 1
		}
		return 0
	})

	for (let i=0;i<players.length;i++) {
		for (let j=0;j<players.length;j++) {
			if (i != j) {
				let player1Elo = ordinal(users[i].roles[role].mmr)
				let player2Elo = ordinal(users[j].roles[role].mmr)
	
				out.push({player1: users[i]._id, player2: users[j]._id, probability: calculateExpectedOutcome(player1Elo, player2Elo), weight: calculateQueueWeight(players[i].time) + calculateQueueWeight(players[j].time)})
			}		
		}
	}

	return out
}

const calculateQueueWeight = (time) => {
	let duration = (Date.now() - time) / 1000
	return Math.pow(duration / 500, 4)
}

export const calculateExpectedOutcome = (elo1, elo2) => {
	return 1 / (1 + Math.pow(5, (elo2 - elo1)/500))
}

export const calculateNewElo = (team1, team2, win) => {
	let team1Rating = team1.map(player => {
		return rating(player)
	})
	let team2Rating = team2.map(player => {
		return rating(player)
	})

	if (win) {
		[team1Rating, team2Rating] = rate([team1Rating, team2Rating])
	} else {
		[team2Rating, team1Rating] = rate([team2Rating, team1Rating])
	}

	team1Rating = team1Rating.map(player => {
		return {mu: Math.max(parseInt(process.env.MINIMUM_MU), player.mu), sigma: Math.max(parseInt(process.env.MINIMUM_SIGMA), player.sigma)}
	})

	team2Rating = team2Rating.map(player => {
		return {mu: Math.max(parseInt(process.env.MINIMUM_MU), player.mu), sigma: Math.max(parseInt(process.env.MINIMUM_SIGMA), player.sigma)}
	})

	
	return {"blue": team1Rating, "red": team2Rating}
}

