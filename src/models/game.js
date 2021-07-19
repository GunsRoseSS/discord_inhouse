import mongoose from "mongoose"

const gameSchema = mongoose.Schema({
    matchID: Number, //note: this is the riot Match ID, not the DB ID.
    players: [{
        id: String, //discord id fetch from player models
        team: String, //'red' 'blue'
        role: String,
        champion: String,
        previousElo: Number,
        afterGameElo: Number
    }],
    winner: String,
    date: Date
})

const Game = mongoose.model("Game", gameSchema)

export default Game