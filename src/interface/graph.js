import ChartJSImage from "chart.js-image"

import Game from "../models/game.js"

import { getUserMatchHistory } from "./user.js"

import { ordinal } from "openskill"

export const generateRoleGraph = async (role, userList, count = 30) => {
    let games = await Game.find();

    if (!games){
        return 'error';
    }

    const roles = ["top", "jgl", "mid", "adc", "sup"]
    const roles_full = ["Top", "Jungle", "Middle", "ADC", "Support"]

    games = games.slice(Math.max(games.length - count, 0));

    let start = new Date(games[0].date.getTime());
    let end = games[games.length - 1].date;
    start.setDate(start.getDate() - 1);

    let num_games = games.length

    //Retrieve the data for the players in the specified role
    games = games.reduce((out, game, index) => {
        let i = roles.indexOf(role)
        if (game.players[i].id in out) {
            out[game.players[i].id].push({id: index, date: game.date, before: ordinal(game.players[i].previousElo), after: ordinal(game.players[i].afterGameElo)})
        } else {
            out[game.players[i].id] = [{id: index, date: game.date, before: ordinal(game.players[i].previousElo), after: ordinal(game.players[i].afterGameElo)}]
        }

        if (game.players[i + 5].id in out) {
            out[game.players[i + 5].id].push({id: index, date: game.date, before: ordinal(game.players[i + 5].previousElo), after: ordinal(game.players[i + 5].afterGameElo)})
        } else {
            out[game.players[i + 5].id] = [{id: index, date: game.date, before: ordinal(game.players[i + 5].previousElo), after: ordinal(game.players[i + 5].afterGameElo)}]
        }
        return out
    }, {})

    let users = []


    for (let i=0;i<Object.keys(games).length;i++) {
        let user = Object.keys(games)[i]
        users.push(userList[user])
    }

    games = Object.keys(games).reduce((out, key, i) => {
        out.labels.push(users[i])
        let j = 0
        out.data.push(games[key].reduce((o, game, index) => {
            while (j < game.id) {
                o.push(game.before)
                j++
            }
            o.push(game.after)
            j++
            if (index == games[key].length-1) {
                while (j < num_games) {
                    o.push(game.after)
                    j++
                }
            }
            return o
        }, [games[key][0].before]))
        return out
    }, {"labels": [], "data": []})

    return createGraph(`MMR variation for ${roles_full[roles.indexOf(role)]} (Last ${count} games)`, Array.from(Array(num_games+1).keys()), games.labels, games.data)
}

export const generateGraph = async (id, nickname, count = 30) => {
    let data = await getUserGraphData(id)

    if (data === undefined) {
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

    return createGraph(`MMR variation for ${nickname} past ${count} games`, data.dates, graphData.labels, graphData.data)
}

export const getUserGraphData = async (id) => {
    let matches = await getUserMatchHistory(id)

    if (!matches || matches.length == 0) {
        return null
    }

    matches = matches.slice(Math.max(matches.length - count, 0)).reduce((out, match) => {
		return [...out,{_id: match}]
	}, [])

    let games = await Game.find({$or : matches})

    games = games.sort((game1, game2) => {
        let id1 = parseInt(game1._id)
        let id2 = parseInt(game2._id)
        if (id1 > id2) {
            return 1
        } else if (id1 < id2) {
            return -1
        }
        return 0
    })

    games = games.reduce((out, game, index) => {
		let player = game.players.find(element => element.id == id)
		return [...out, {id: index, role: player.role, previousElo: ordinal(player.previousElo), afterGameElo: ordinal(player.afterGameElo)}]
	}, [])

    let num_games = games.length

    let data = splitByRole(games)


    data = data.map(role => {
        if (role.length == 0) {
            return role
        }
        let i = 0
        return role.reduce((out, game, index) => {
            while (i < game.id) {
                out.push(game.before)
                i++
            }
            out.push(game.after)
            i++
            if (index == role.length-1) {
                while (i < num_games) {
                    out.push(game.after)
                    i++
                }
            }
            return out
        }, [role[0].before])
    })

    let dates = games.map(game => {
        return game.id
    })

    return {data: data, dates: [...dates, num_games]}

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

    //Randomly sort each colour array
    let yellows = ["#f6bd60", "#ffff56"].sort(() => (Math.random() > .5) ? 1 : -1)
    let reds = ["#ff6456", "#a02d23", "#d90429"].sort(() => (Math.random() > .5) ? 1 : -1)
    let blues = ["#00ffff", "#437c90", "#08498E"].sort(() => (Math.random() > .5) ? 1 : -1)
    let purples = ["#802392", "#966BA0"].sort(() => (Math.random() > .5) ? 1 : -1)
    let greens = ["#00ff00", "#6bd425", "#2b600e"].sort(() => (Math.random() > .5) ? 1 : -1)
    let greys = ["#c8c8c8", "#484848"].sort(() => (Math.random() > .5) ? 1 : -1)

    let count = yellows.length + reds.length + blues.length + purples.length + greens.length + greys.length

    let colours = []
    let available = []

    //Populate the colours array with colours
    //Cycles through each colour before returning to the same set
    for (let i=0;i<count;i++) {
        let selected_colour = null

        if (available.length == 0) {
            available = [yellows, reds, blues, purples, greens, greys]
        }

        do {
            let index = Math.floor(Math.random() * available.length)
            selected_colour = available[index]
            available.splice(index, 1)
        } while (selected_colour.length == 0)

        colours.push(selected_colour[0])

        selected_colour.shift()
    }

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

//Splits games by role
export const splitByRole = (games) => {
    const roles = ["top", "jgl", "mid", "adc", "sup"]

    return games.reduce((out, game) => {
        out[roles.indexOf(game.role)].push({id: game.id, date: game.date, before: game.previousElo, after: game.afterGameElo})
        return out    
    }, [[],[],[],[],[]])
}
