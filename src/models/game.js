import mongoose from "mongoose"

const gameSchema = mongoose.Schema({
    _id: String,
    matchID: Number, //note: this is the riot Match ID, not the DB ID.
    players: [{
        id: String, //discord id fetch from player models
        team: String, //'red' 'blue'
        role: String,
        champion: String,
        previousElo: {mu: Number, sigma: Number},
        afterGameElo: {mu: Number, sigma: Number}
    }],
    winner: String,
    date: Date
})

const Game = mongoose.model("Game", gameSchema)

export default Game