import {playersInRole} from "./queue.js"
import {getMatchups} from "./matchup.js"

//If a game is found within these thresholds => return that game
const OUTCOME_DEVIATION_THRESHOLD = 0.005 //Deviation of game winrate from 50% => 0.005 = 49.5% - 50.5%
const MATCHUP_DEVIATION_THRESHOLD = 0.10 //Average deviation of matchup winrates from 50% => 0.15 = 35.0% - 65.0%

//0.0, 0.0 => really slow >5000ms, best match
//0.005, 0.10 => really fast <1000ms, pretty good matching
//>0.02, >0.15 => fastest <500ms, uneven matching, diminishing speed returns

//Generating role permutations ~250-300ms
//Bottlenecked by mongo atlas?

//Find the best match using the current queue
export const findMatch = async () => {
    let start = new Date()

    let role_permutations = await generateRolePermutations()

    console.log((new Date() - start) + "ms")

    start = new Date()
    
    let best = null

    let complete = false

    //Check every posible game
    //if a player is in more than 1 role, the game is dropped
    role_permutations["top"].forEach((t) => {
        if (complete) return
        role_permutations["jgl"].forEach((j) => {
            if (complete) return
            if (!hasPlayerConflict([t,j])) {
                role_permutations["mid"].forEach((m) => {
                    if (complete) return
                    if (!hasPlayerConflict([t,j,m])) {
                        role_permutations["adc"].forEach((a) => {
                            if (complete) return
                            if (!hasPlayerConflict([t,j,m,a])) {
                                role_permutations["sup"].forEach((s) => {
                                    if (complete) return
                                    if (!hasPlayerConflict([t,j,m,a,s])) {							
                                        let vt = Math.abs(0.5 - t.probability)
                                        let vj = Math.abs(0.5 - j.probability)
                                        let vm = Math.abs(0.5 - m.probability)
                                        let va = Math.abs(0.5 - a.probability)
                                        let vs = Math.abs(0.5 - s.probability)
                                        let average_deviation = (vt + vj + vm + va + vs) / 5.0
                                        let expected = (t.probability + j.probability + m.probability + a.probability + s.probability) / 5.0
                                        let outcome_deviation = Math.abs(0.5 - expected)

                                        if (best === null) {
                                            best = {expected_outcome: expected, outcome_deviation: outcome_deviation, avg_matchup_deviation: average_deviation, game: [t,j,m,a,s]}
                                        } else {
                                            if (outcome_deviation  <= best.outcome_deviation && average_deviation <= best.avg_matchup_deviation)  {
                                                best = {expected_outcome: expected, outcome_deviation: outcome_deviation, avg_matchup_deviation: average_deviation, game: [t,j,m,a,s]}
                                                if (outcome_deviation <= OUTCOME_DEVIATION_THRESHOLD && average_deviation <= MATCHUP_DEVIATION_THRESHOLD) {
                                                    complete = true
                                                }
                                            }
                                        }
                                    }					
                                })
                            }
                        })
                    }
                })		
            }							
        })
    })

    return best
}

//Get every posible permutation of players in each role
const generateRolePermutations = async () => {
    let role_permutations = {}

	const roles = ["top","jgl","mid", "adc","sup"]

    for (const role of roles) {
        const players = await playersInRole(role)
        role_permutations[role] = await getMatchups(role, players)
    }

    return role_permutations
}

//Takes a list of matchups
//Returns true if 1 or more players appear in multiple matchups
//e.g. matchups = [{role: top, player1: Kiwi, player2: Richard}, {role: jgl, player1: Kiwi, player2: Richard}] would return true
const hasPlayerConflict = (matchups) => {
	for (let i=0;i<matchups.length-1;i++) {
		for (let j=i+1;j<matchups.length;j++) {
			const matchup = matchups[i]
			const matchup2 = matchups[j]
			if (matchup.player1 === matchup2.player1 || matchup.player2 === matchup2.player2 || matchup.player1 === matchup2.player2 || matchup.player2 === matchup2.player1) {
				return true
			}
		}
	}

	return false
}
