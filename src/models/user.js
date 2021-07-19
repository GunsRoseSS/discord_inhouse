import mongoose from "mongoose"

const userSchema = mongoose.Schema({
	_id: String,
	elo: {
		type: Map,
		of: Number
	},
	matchHistory: [{type: String}]
})

const User = mongoose.model("User", userSchema)

export default User