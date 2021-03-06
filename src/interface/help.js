let legend = "Note: Some commands could be restricted by your server permissions.\nLegend:\n[] = argument\n? = optional argument\n\n"

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
        name: '!notepic',
        aliases: '!riot',
        description: 'not epic'
    },
    {
        name: '!changeimg {image attachment}',
        aliases: '-',
        description: 'Changes the image of the bot. It might take a while to process.'
    },
    {
        name: '!dab',
        aliases: '-',
        description: 'Forces the bot to dab.'
    },
]

const preGame = [
    {
        name: '!queue [Role #1] ?[Role #2] ...?[Role #5]',
        aliases: '-',
        description: 'Inserts you into the queue for the next game. You can select multiple roles in one command or use !queue all to queue for all roles. Admins can also use !queue clear.'
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
    },
    {
        name: '!cancel',
        aliases: '-',
        description: 'Cancels the matchmaking process.'
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
        name: '!link [gameID] [riotID]',
        aliases: '!matchid',
        description: 'Links a game to its riot match id.'
    }
]

const stats1 = [
    {
        name: '!champion [champion] ?[@player]/?[all]',
        aliases: '!champ',
        description: 'Displays champion stats for every played champion of yourself, another [@player], or [all] players (which is also kind of a ranking! :P)'
    },
    {
        name: '!champions ?[@player/all]',
        aliases: '!champs',
        description: 'Displays champion stats for the requested [champion] for yourself, another [@player], or [all] players'
    },
    {
        name: '!meta',
        aliases: '!champstats',
        description: "Displays the current meta for the played champions."
    },
    {
        name: '!halloffame ?[champion]',
        aliases: '!hof',
        description: "Displays the the best player for each statistic either in general or for a [champion]"
    }
]

const stats2 = [
    {
        name: '!rank ?[@player]/?[role]',
        aliases: '-',
        description: "Displays your current rank for all your roles. You can also view another [@player]'s rank."
    },
    {
        name: '!ranking ?[role/average]',
        aliases: '-',
        description: 'Displays the current ranking for all players for all roles (no arguments) or for a specific [role] or for your [average] mmr'
    },
    {
        name: '!teammates ?[@player]',
        aliases: '-',
        description: "Displays teammate stats for yourself or for a [@player]"
    },
    {
        name: '!opponents ?[@player]',
        aliases: "!nemesis",
        description: "Displays your or another players best/worst opponents (wins/lp gain)"
    },
    {
        name: '!stats ?[@player]',
        aliases: '!playerstats',
        description: "Displays general game statistics for yourself or another [@player]"
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
        description: "Displays a graph of your or another [@player]'s mmr progression over the past 30 games. You can also view a progression for all players in a [role]"
    }
]

//create a non-dynamic paginated embed.
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
            helpArray = stats1
            break
        case 4:
            helpArray = stats2
            break
        case 5:
            helpArray = history
            break
        case 6:
            helpArray = misc
            break
    }

    let embedString = '';
    for (let command of helpArray) {
        //using fields here would look really unstructured and ugly, so we are using code blocks for this.
        embedString = embedString + '```COMMAND:\t' + command.name + '\nALIASES:\t' + command.aliases + '\n\n' + command.description + '```';

    }
    return legend + embedString
}
