import ChartJSImage from "chart.js-image";
import {getAllGames} from "./games.js";

export const interpolateValues = (array) => {
    let lastKnownValue = 0;
    let missingDataCounter = 0
    let first = true;

    for (let item in array) {
        if (array[item] === 0) {
            missingDataCounter += 1
        } else {
            if (missingDataCounter > 0) {
                for (let i = 0; i < missingDataCounter; i++) {
                    array[item - i - 1] = array[item];
                }
            }
            lastKnownValue = array[item];
            missingDataCounter = 0
        }
        if (item == array.length - 1 && missingDataCounter > 0) {
            for (let i = 0; i < missingDataCounter; i++) {
                array[item - i] = lastKnownValue;
            }
        }
        first = false;
    }
    return array.reverse();
}

export const getGraphData = async (playerID) => {
    let dateArray = [];
    let matchDataArray = [[],[],[],[],[]]; //nested list of 5 for all the roles to be saved in
    let matches = await getAllGames();

    //fill lists with last 31 days and the correspondent elo of the player on that day
    for (let i = 0; i < 31; i++) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        let dateElo = {
            top: 0,
            jgl: 0,
            mid: 0,
            adc: 0,
            sup: 0
        }

        for (let match of matches) {
            if (match.date.toDateString() === date.toDateString()) {
                for (let player of match.players) {
                    if (playerID === player.id) {
                        switch (player.role) {
                            case 'top':
                                if (player.afterGameElo > dateElo.top) {
                                    dateElo.top = player.afterGameElo;
                                }
                                break
                            case 'jgl':
                                if (player.afterGameElo > dateElo.jgl) {
                                    dateElo.jgl = player.afterGameElo;
                                }
                                break
                            case 'mid':
                                if (player.afterGameElo > dateElo.mid) {
                                    dateElo.mid = player.afterGameElo;
                                }
                                break
                            case 'adc':
                                if (player.afterGameElo > dateElo.adc) {
                                    dateElo.adc = player.afterGameElo;
                                }
                                break
                            case 'sup':
                                if (player.afterGameElo > dateElo.sup) {
                                    dateElo.sup = player.afterGameElo;
                                }
                                break
                        }
                    }
                }
            }

        }

        matchDataArray[0].push(dateElo.top);
        matchDataArray[1].push(dateElo.jgl);
        matchDataArray[2].push(dateElo.mid);
        matchDataArray[3].push(dateElo.adc);
        matchDataArray[4].push(dateElo.sup);

        dateArray.push(date.getUTCDate() + '/' + parseInt(parseInt(date.getUTCMonth()) + 1));
    }

    matchDataArray[0] = interpolateValues(matchDataArray[0]);
    matchDataArray[1] = interpolateValues(matchDataArray[1]);
    matchDataArray[2] = interpolateValues(matchDataArray[2]);
    matchDataArray[3] = interpolateValues(matchDataArray[3]);
    matchDataArray[4] = interpolateValues(matchDataArray[4]);

    let graphSettings = [["Top", "rgb(255,100,86)"], ["Jungle", "#00ffff"], ["Mid", "#ff00ff"], ["Adc", "rgb(255,205,86)"], ["Support", "#00ff00"]]

    let filteredData = []

    for (let i=0;i<matchDataArray.length;i++) {
        let sorted = [...matchDataArray[i]].sort()

        if (sorted[0] != sorted[sorted.length-1]) {
            filteredData.push({"label": graphSettings[i][0], "borderColor": graphSettings[i][1], "backgroundColor": "rgba(0,0,0,0)", "data": matchDataArray[i]})
        }
    }

    return {
        dates: dateArray.reverse(),
        roleData: filteredData
    }
}

export const generateGraph = async (roles, playerID, nickname) => {
    const graphData = await getGraphData(playerID, roles);

    const line_chart = ChartJSImage().chart({
        "type": "line",
        "data": {
            "labels": graphData.dates,
            "datasets": graphData.roleData
        },
        "options": {
            "title": {
                "display": true,
                "text": `MMR variation for ${nickname} this month`,
            },
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
                        }
                    }
                ]
            }
        }
    }) // Line chart
        .backgroundColor("#212946")
        .width(1000)
        .height(500)

    let random = Math.floor(Math.random() * 1000000);
    
    await line_chart.toFile(`${random}.png`);

    return random
}