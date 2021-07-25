let legend = "Legend:\n[] = argument\n? = optional argument\n\n"

const misc = [//this way it's easier to edit help in case we need to update it.
    {
        name: '!help',
        aliases: '!commands',
        description: 'Displays all of the current accepted commands and their functionality.'
    },
    {
        name: '!epic',
        aliases: '-',
        description: 'epic'
    },
    {
        name: '!changeimg {image attachment}',
        aliases: '-',
        description: 'Changes the image of the bot. It might take a while to process.'
    },
]

const preGame = [
    {
        name: '!queue [Role #1] ?[Role #2] ...?[Role #5]',
        aliases: '-',
        description: 'Inserts you into the queue for the next game. You can select multiple roles in one command.'
    },
    {
        name: '!leave',
        aliases: '-',
        description: 'Removes you from all roles in the queue.'
    },
    {
        name: '!lineup [Top] [Jungle] [Mid] [ADC] [Support]',
        aliases: '!team',
        description: 'Inserts the lineup for your team into the match. Lineup can be changed by using the command again. A game cannot start before both lineups are inserted.'
    },
    {
        name: '!start',
        aliases: '-',
        description: 'Starts the matchmaking process. A minimum of 10 people in the queue are required to start a game.'
    }
]

const postGame = [
    {
        name: '!loss',
        aliases: '!lose',
        description: 'Use this command after a match to indicate that your team has lost the match. 6 votes are necessary to confirm the loss.'
    },
    {
        name: '!win',
        aliases: '!won',
        description: 'Use this command after a match to indicate that your team has win the match. 6 votes are necessary to confirm the win.'
    },
    {
        name: '!link [gameID]',
        aliases: '!matchid',
        description: 'Links the matchID that is displayed in the LoL client to the last game that was played.'
    }
]

const stats = [
    {
        name: '!champion [champion] ?[@player]/?[all]',
        aliases: '!champ',
        description: 'Displays champion stats for the requested [champion] for yourself, another [@player], or [all] players'
    },
    {
        name: '!ranking ?[role]',
        aliases: '-',
        description: 'Displays the current ranking for all players for all roles (no arguments) or for a specific [role]'
    },
    {
        name: '!rank ?[@player]',
        aliases: '-',
        description: "Displays your current rank for all your roles. You can also view another [@player]'s rank."
    }
]

const history = [
    {
        name: '!history',
        aliases: '!past',
        description: 'Displays the history of your previous games.'
    },
    {
        name: '!view [gameID]',
        aliases: '-',
        description: 'Shows game stats for a previous game with the [gameID] that you specified after the game ended.'
    },
    {
        name: '!graph ?[@player]',
        aliases: '!chart, !mmr_history',
        description: "Displays a graph of your or another [@player]'s mmr progression over the past month."
    }
]


export const convertHelpToEmbed = (page) => {
    let helpArray = [];
    switch (page){
        case 1:
            helpArray = preGame
            break
        case 2:
            helpArray = postGame
            break
        case 3:
            helpArray = stats
            break
        case 4:
            helpArray = history
            break
        case 5:
            helpArray = misc
            break
    }

    let embedString = '';
    for (let command of helpArray) {
        embedString = embedString + '```COMMAND:\t' + command.name + '\nALIASES:\t' + command.aliases + '\n\n' + command.description + '```';

    }
    return legend + embedString
}