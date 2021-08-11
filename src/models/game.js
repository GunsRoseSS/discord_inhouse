import mongoose from "mongoose"

const gameSchema = mongoose.Schema({
    _id: String,
    matchID: Number, //note: this is the riot Match ID, not the DB ID.
    players: [{
        id: String, //discord id fetch from player models
        team: String, //'RED' 'BLUE'
        role: String,
        champion: String,
        previousElo: {mu: Number, sigma: Number},
        afterGameElo: {mu: Number, sigma: Number},
        stats: {
            kills: String,
            deaths: String,
            assists: String,
            cs: String,
            gold: Number,
            spree: String,
            multi: String,
            first: Boolean,
            champ_dmg_total: Number,
            champ_dmg_physical: Number,
            champ_dmg_magic: Number,
            champ_dmg_true: Number,
            objective_dmg: Number,
            turret_dmg: Number,
            healed_dmg: Number,
            taken_dmg_total: Number,
            taken_dmg_physical: Number,
            taken_dmg_magic: Number,
            taken_dmg_true: Number,
            wards_placed: String,
            control_wards: String,
            spent: Number,
        }
    }],
    winner: String,
    date: Date,
    bans: [String],
    statsFetched: Boolean
})

const Game = mongoose.model("Game", gameSchema)

export default Game
