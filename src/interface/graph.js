import ChartJSImage from "chart.js-image"

import Game from "../models/game.js"

import { getUserMatchHistory } from "./user.js"
import { formatDate } from "../helpers/format.js"

export const generateRoleGraph = async (role, guild, count = 30) => {
    let games = await Game.find()

    const roles = ["top", "jgl", "mid", "adc", "sup"]
    const roles_full = ["Top", "Jungle", "Middle", "ADC", "Support"]

    games = games.slice(Math.max(games.length - count, 0))

    let start = games[0].date
    let end = games[games.length - 1].date
    start.setDate(start.getDate() - 1)

    //Retrieve the data for the players in the specified role
    games = games.reduce((out, game) => {
        let i = roles.indexOf(role)
        if (game.players[i].id in out) {
            out[game.players[i].id].push({date: game.date, before: game.players[i].previousElo, after: game.players[i].afterGameElo})
        } else {
            out[game.players[i].id] = [{date: game.date, before: game.players[i].previousElo, after: game.players[i].afterGameElo}]
        }

        if (game.players[i + 5].id in out) {
            out[game.players[i + 5].id].push({date: game.date, before: game.players[i + 5].previousElo, after: game.players[i + 5].afterGameElo})
        } else {
            out[game.players[i + 5].id] = [{date: game.date, before: game.players[i + 5].previousElo, after: game.players[i + 5].afterGameElo}]
        }
        return out
    }, {})

    games = Object.keys(games).reduce((out, key) => {
        out.labels.push(key)
        out.data.push(fillRange(start, end, flattenDates(games[key])))
        return out
    }, {"labels": [], "data": []})

    let dates = getDateRange(start, end)

    return await createGraph(`MMR variation for ${roles_full[roles.indexOf(role)]} (Last ${count} games)`, dates, games.labels, games.data)
}

export const generateGraph = async (id, nickname, count = 30) => {
    let data = await getUserGraphData(id)

    if (data == null) {
        return "error"
    }

    const roles = ["Top", "Jungle", "Middle", "ADC", "Support"]

    let graphData = data.data.reduce((out, data, i) => {
        if (data.length > 0) {
            out.labels.push(roles[i])
            out.data.push(data)
        }
        return out
    }, {"labels": [], "data": []})

    return await createGraph(`MMR variation for ${nickname} past ${count} games`, data.dates, graphData.labels, graphData.data)
}

export const getUserGraphData = async (id, count = 30) => {
    let matches = await getUserMatchHistory(id)

    if (matches.length == 0) {
        return null
    }

    matches = matches.slice(Math.max(matches.length - count, 0)).reduce((out, match) => {
		return [...out,{_id: match}]
	}, [])

    let games = await Game.find({$or : matches})

    games = games.reduce((out, game) => {
		let player = game.players.find(element => element.id == id)
		return [...out, {date: game.date, role: player.role, previousElo: player.previousElo, afterGameElo: player.afterGameElo}]
	}, [])

    
    let start = games[0].date
    let end = games[games.length - 1].date
    start.setDate(start.getDate() - 1)

    games = splitByRole(games)

    games = games.map(role => {
        if (role.length == 0) {
            return role
        }
        return fillRange(start, end, flattenDates(role))
    })

    let dates = getDateRange(start, end)

    return {data: games, dates: dates}
}

const createGraph = async (title, labels, legend, data) => {
    const textColour = "#ffffff"

    const colours = ["#ff6456", "#00ffff", "#ff00ff", "#ffcc56", "#00ff00", "#ff9a00"].sort(() => (Math.random() > .5) ? 1 : -1)

    let minValue = Number.MAX_VALUE
    let maxValue = 0

    let formattedData = legend.map((name, i) => {
        minValue = Math.min(minValue, Math.min(...data[i]))
        maxValue = Math.max(maxValue, Math.max(...data[i]))
        return {"label": name, "borderColor": colours[i % colours.length], "backgroundColor": colours[i % colours.length], "fill": false, "data": data[i]}
    })

    const line_chart = ChartJSImage().chart({
        "type": "line",
        "data": {"labels": labels,"datasets": formattedData},
        "options": {
            "layout": {
                "padding": "10"
            },
            "legend": {
                "labels": {
                    "fontColor": textColour
                }  
            },
            "title": {"display": true,"text": title, "fontColor": textColour},
            "scales": {
                "xAxes": [
                    {
                        "scaleLabel": {
                            "display": true,
                            "labelString": "Day",
                            "fontColor": textColour

                        },
                        "ticks": {
                            "fontColor": textColour
                        }
                    }
                ],
                "yAxes": [
                    {
                        "stacked": false,
                        "scaleLabel": {
                            "display": true,
                            "labelString": "MMR",
                            "fontColor": textColour
                        },
                        "ticks": {
                            "min": Math.floor((minValue - ((maxValue - minValue) * 0.2)) / 10.0) * 10,
                            "max": Math.ceil((maxValue + ((maxValue - minValue) * 0.2))/ 10.0) * 10,
                            "fontColor": textColour
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

    return `${random}.png`
}

//Fills in missing data from user data
export const fillRange = (start, end, data) => {
    let current_date = new Date(start.getTime())
    current_date.setDate(current_date.getDate() + 1)

    let filled =  data.reduce((out, match) => {
        while (current_date < match.date) {

            out.push(match.before)
            current_date.setDate(current_date.getDate() + 1)
        }

        out.push(match.after)

        current_date.setDate(current_date.getDate() + 1)

        return out
    }, [data[0].before])

    let val = filled[filled.length-1]

    while (current_date <= end) {
        filled.push(val)
        current_date.setDate(current_date.getDate() + 1)
    }

    return filled
}

//Generates date labels for graph
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

//Takes a list of games for a player
//If multiple games take place on the same date, flatten them into 1 mmr value
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

//Takes a list of mmrs on the same date and flattens them into 1 value
const flatten = (data) => {
    let start = data[0].before
    let end = data[data.length-1].after

    return {date: data[0].date, before: start, after: end}
}