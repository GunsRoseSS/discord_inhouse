import ChartJSImage from "chart.js-image"
import https from "https"

import Game from "../models/game.js"

import { getUserMatchHistory } from "./user.js"
import { formatDate } from "../helpers/format.js"

import { ordinal } from "openskill"

export const generateRoleGraph = async (role, client, count = 30) => {
    let games = await Game.find()

    const roles = ["top", "jgl", "mid", "adc", "sup"]
    const roles_full = ["Top", "Jungle", "Middle", "ADC", "Support"]

    games = games.slice(Math.max(games.length - count, 0))

    let start = new Date(games[0].date.getTime())
    let end = games[games.length - 1].date
    start.setDate(start.getDate() - 1)

    //Retrieve the data for the players in the specified role
    games = games.reduce((out, game) => {
        let i = roles.indexOf(role)
        if (game.players[i].id in out) {
            out[game.players[i].id].push({date: game.date, before: ordinal(game.players[i].previousElo), after: ordinal(game.players[i].afterGameElo)})
        } else {
            out[game.players[i].id] = [{date: game.date, before: ordinal(game.players[i].previousElo), after: ordinal(game.players[i].afterGameElo)}]
        }

        if (game.players[i + 5].id in out) {
            out[game.players[i + 5].id].push({date: game.date, before: ordinal(game.players[i + 5].previousElo), after: ordinal(game.players[i + 5].afterGameElo)})
        } else {
            out[game.players[i + 5].id] = [{date: game.date, before: ordinal(game.players[i + 5].previousElo), after: ordinal(game.players[i + 5].afterGameElo)}]
        }
        return out
    }, {})

    let users = []


    for (let i=0;i<Object.keys(games).length;i++) {
        let user = Object.keys(games)[i]
        try {
            user = await client.users.fetch(Object.keys(games)[i])
            user = user.username
        } catch (e) {}
        
        users.push(user)
    }

    games = Object.keys(games).reduce((out, key, i) => {
        out.labels.push(users[i])
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

    if (!matches || matches.length == 0) {
        return null
    }

    matches = matches.slice(Math.max(matches.length - count, 0)).reduce((out, match) => {
		return [...out,{_id: match}]
	}, [])

    let games = await Game.find({$or : matches})

    console.log(games)

    games = games.reduce((out, game) => {
		let player = game.players.find(element => element.id == id)
		return [...out, {date: new Date(game.date.getTime()), role: player.role, previousElo: ordinal(player.previousElo), afterGameElo: ordinal(player.afterGameElo)}]
	}, [])

    
    let start = new Date(games[0].date.getTime())
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

    //F6BD60 = Maximum yellow red
    //ffff56 = yellow
    
    //ff6456 = orange/red
    //A02D23 = Cinnabar (orange-red)
    //d90429 = amaranth red

    //00ffff = cyan
    //437c90 = teal blue
    //08498E = royal blue

    //802392 = dark magenta
    //966BA0 = light purple

    //00ff00 = green
    //6bd425 = lime green
    //2B600E = apple green

    //c8c8c8 = light gray

    const colours = ["#f6bd60", "#ffff56", "#ff6456", "#a02d23", "#d90429", "#00ffff", "#437c90", "#08498E", "#802392", "#966BA0", "00ff00", "#6bd425", "#2b600e", "#c8c8c8"].sort(() => (Math.random() > .5) ? 1 : -1)

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