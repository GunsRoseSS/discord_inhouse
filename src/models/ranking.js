import mongoose from "mongoose"

const rankingSchema = mongoose.Schema({
    roles: {
        top: [
            {
                playerID: String,
                mmr: Number,
                wins: Number,
                losses: Number,
            }
        ],
        jgl: [
            {
                playerID: String,
                mmr: Number,
                wins: Number,
                losses: Number,
            }
        ],
        mid: [
            {
                playerID: String,
                mmr: Number,
                wins: Number,
                losses: Number,
            }
        ],
        adc: [
            {
                playerID: String,
                mmr: Number,
                wins: Number,
                losses: Number,
            }
        ],
        sup: [
            {
                playerID: String,
                mmr: Number,
                wins: Number,
                losses: Number,
            }
        ],
    }
})

const Ranking = mongoose.model("Ranking", rankingSchema)

export default Ranking