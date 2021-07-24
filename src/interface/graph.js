import ChartJSImage from "chart.js-image"

import Game from "../models/game.js"

import { getUserMatchHistory } from "./user.js"
import { formatDate } from "../helpers/format.js"

export const generateGraph = async (id, nickname) => {
    //Set time period for matches
    let start = new Date()
    start.setDate(start.getDate() - 30)
    start.setUTCHours(0,0,0,0)
    
    let end = new Date()
    end.setUTCHours(0,0,0,0)

    let dates = getDateRange(start, end)
    let userData = await getUserGraphData(id, start, end)

    if (userData == null) {
        return "error"
    }

    let graphSettings = [["Top", "#ff6456"], ["Jungle", "#00ffff"], ["Mid", "#ff00ff"], ["Adc", "#ffcc56"], ["Support", "#00ff00"]]
    let graphData = []

    let minValue = Number.MAX_VALUE
    let maxValue = 0

    for (let i=0;i<userData.length;i++) {
        if (userData[i].length > 0) {
            graphData.push({"label": graphSettings[i][0], "borderColor": graphSettings[i][1], "backgroundColor": "rgba(0,0,0,0)", "data": userData[i]})

            minValue = Math.min(minValue, Math.min(...userData[i]))
            maxValue = Math.max(maxValue, Math.max(...userData[i]))
        }
    }

    const line_chart = ChartJSImage().chart({
        "type": "line",
        "data": {"labels": dates,"datasets": graphData},
        "options": {
            "title": {"display": true,"text": `MMR variation for ${nickname} this month`},
            "scales": {
                "xAxes": [
                    {
                        "scaleLabel": {
                            "display": true,
                            "labelString": "Day",

                        }
                    }
                ],
                "yAxes": [
                    {
                        "stacked": false,
                        "scaleLabel": {
                            "display": true,
                            "labelString": "MMR"
                        },
                        "ticks": {
                            "min": Math.floor((minValue - ((maxValue - minValue) * 0.2)) / 10.0) * 10
                        }
                    }
                ]
            }
        }
    })
    .backgroundColor("#212946")
    .width(1000).height(500)

    let random = Math.floor(Math.random() * 1000000);
    
    await line_chart.toFile(`${random}.png`);

    return random
}

export const getUserGraphData = async (id, start, end) => {
	let matches = await getUserMatchHistory(id)

    if (!matches) {
        return null
    }

    //Convert list of match ids into a query string
	matches = matches.reduce((out, match) => {
		return [...out,{_id: match, date: {"$gte": start, "$lt": end}}]
	}, [])
					
    //Get all the games matching the ids
    let games = await Game.find({$or : matches})

    //Get the selected players data for each game
	games = games.reduce((out, game) => {
		let player = game.players.find(element => element.id == id)
		return [...out, {date: game.date, role: player.role, previousElo: player.previousElo, afterGameElo: player.afterGameElo}]
	}, [])

    //Split the games by the role
    games = splitByRole(games)

    //Fill in the missing data for each role
    games = games.map(role => {
        if (role.length == 0) {
            return role
        }
        return fillRange(start, end, flattenDates(role))
    })

    return games
}

export const flattenDates = (roleData) => {
    if (roleData.length > 1) {

        roleData = roleData.reduce((out, data) => {
            if (out.buf.length == 0 || out.buf[0].date.toString() == data.date.toString()) {
                out.buf.push(data)
                return out
            }

            out.flat.push(flatten(out.buf))

            out.buf = [data]

            return out

        }, {flat: [], buf: []})

        if (roleData.buf.length > 0) {
            roleData.flat.push(flatten(roleData.buf))
        }

        return roleData.flat

    } else {
        return roleData
    }
   
}

export const fillRange = (start, end, data) => {
    let current_date = new Date(start.getTime())

    let filled =  data.reduce((out, match) => {
        while (current_date < match.date) {

            out.push(match.before)
            current_date.setDate(current_date.getDate() + 1)
        }

        out.push(match.after)

        current_date.setDate(current_date.getDate() + 1)

        return out
    }, [])

    let val = filled[filled.length-1]

    while (current_date <= end) {
        filled.push(val)
        current_date.setDate(current_date.getDate() + 1)
    }

    return filled
}


const getDateRange = (start, end) => {
    let current = new Date(start.getTime())

    let out = []

    while (current <= end) {
        out = [...out, formatDate(new Date(current.getTime()), true)]
        current.setDate(current.getDate() + 1)
    }

    return out
}

//Splits games by role
export const splitByRole = (games) => {
    const roles = ["top", "jgl", "mid", "adc", "sup"]

    return games.reduce((out, game) => {
        out[roles.indexOf(game.role)].push({date: game.date, before: game.previousElo, after: game.afterGameElo})
        return out    
    }, [[],[],[],[],[]])
}

//Takes a list of mmrs on the same date and flattens them into 1 value
const flatten = (data) => {
    let start = data[0].before
    let end = data[data.length-1].after

    return {date: data[0].date, before: start, after: end}
}