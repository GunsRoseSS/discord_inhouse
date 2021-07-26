import mongoose from "mongoose"

const userSchema = mongoose.Schema({
	_id: String,
	roles: {
		top: {
			mmr: {mu: Number, sigma: Number},
			wins: Number,
			losses: Number
		},
		jgl: {
			mmr: {mu: Number, sigma: Number},
			wins: Number,
			losses: Number
		},
		mid: {
			mmr: {mu: Number, sigma: Number},
			wins: Number,
			losses: Number
		},
		adc: {
			mmr: {mu: Number, sigma: Number},
			wins: Number,
			losses: Number
		},
		sup: {
			mmr: {mu: Number, sigma: Number},
			wins: Number,
			losses: Number
		},
	},
	matchHistory: [{type: String}],
	championStats: [
		{
			name: String,
			mmrDiff: Number, // +/- mmr gains
			wins: Number,
			losses: Number
		}
	]

})

const User = mongoose.model("User", userSchema)

export default User