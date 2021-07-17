import Matchup from "../models/matchup.js"

export const processMatchups = async (role, players) => {
	for (var i=0;i<players.length;i++) {
		for (var j=i+1;j<players.length;j++) {
			var matchup = await Matchup.findOne({role: role, $or : [{player1: players[i], player2: players[j]}, {player1: players[j], player2: players[i]}]})

			if (!matchup) {
				matchup = new Matchup({player1: players[i], player2: players[j], role: role, chance: 50})

				await matchup.save()
			}
		}
	}
}

