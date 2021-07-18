// import * as https from "node/https";
//
// //gets match data from riot api, probably deprecated soon
// export const getMatchData = async (matchID) => {
//     const options = {
//         hostname: 'europe.api.riotgames.com',
//         path: `/lol/match/v4/matches/${matchID}`,
//         method: 'GET',
//         headers: {
//             'X-Riot-Token': process.env.RIOT_KEY
//         }
//     }
//
//     https.request(options, (res) => {
//         let body = '';
//
//         res.on('data', function (chunk) {
//             body += chunk
//         })
//
//         res.on('end', function (chunk) {
//             return JSON.parse(body)
//         })
//     }).on('error', (err) => {
//         console.log(err);
//         return 'error'
//     })
// }

export const setMatchLink = async (matchID) => {
    return `https://matchhistory.euw.leagueoflegends.com/en/#match-details/EUW1/${matchID}/`
}

export const convertMatchHistoryToEmbed = async (matchHistory) => {
    let embedString = '';
    for (let match of matchHistory){
        embedString = embedString + match + '\n';
    }
    return embedString
}