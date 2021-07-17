import mongoose from "mongoose"

const queueSchema = mongoose.Schema({
	_id: String,
	roles: [String]
})

const Queue = mongoose.model("Queue", queueSchema, "queue")

export default Queue
