import mongoose from "mongoose"

const userSchema = mongoose.Schema({
	_id: String,
	roles: {
		top: {
			mmr: Number,
			wins: Number,
			losses: Number
		},
		jgl: {
			mmr: Number,
			wins: Number,
			losses: Number
		},
		mid: {
			mmr: Number,
			wins: Number,
			losses: Number
		},
		adc: {
			mmr: Number,
			wins: Number,
			losses: Number
		},
		sup: {
			mmr: Number,
			wins: Number,
			losses: Number
		},
	},
	matchHistory: [{type: String}]
})

const User = mongoose.model("User", userSchema)

export default User
