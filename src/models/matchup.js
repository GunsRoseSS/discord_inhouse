import mongoose from "mongoose"

const matchupSchema = mongoose.Schema({
	player1: String,

	player2: String,

	role: String,
	chance: Number
})

const Matchup = mongoose.model("Matchup", matchupSchema)

export default Matchup