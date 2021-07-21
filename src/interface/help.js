

const helpData = [//this way it's easier to edit help in case we need to update it.
    {
        name: '!help',
        aliases: '!commands',
        description: 'Displays all of the current accepted commands and their functionality.'
    },
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
    },
    {
        name: '!epic',
        aliases: '-',
        description: 'epic'
    },
    {
        name: '!history',
        aliases: '!past',
        description: 'Displays the history of your previous games.'
    },
    {
        name: '!lineup [Top] [Jungle] [Mid] [ADC] [Support]',
        aliases: '!team',
        description: 'Inserts the lineup for your team into the match. Lineup can be changed by using the command again. A game cannot start before both lineups are inserted.'
    },
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
        name: '!queue [Role #1] ?[Role #2] ...?[Role #5]',
        aliases: '-',
        description: 'Inserts you into the queue for the next game. You can select multiple roles in one command.'
    },
    {
        name: '!start',
        aliases: '-',
        description: 'Starts the matchmaking process. A minimum of 10 people in the queue are required to start a game.'
    },
]

export const convertHelpToEmbed = (page) => {
    let helpArray = [];
    switch (page){
        case 1:
            helpArray.push(helpData[0], helpData[1], helpData[2]);
            break
        case 2:
            helpArray.push(helpData[3], helpData[4], helpData[5]);
            break
        case 3:
            helpArray.push(helpData[6], helpData[7], helpData[8]);
            break
        case 4:
            helpArray.push(helpData[9], helpData[10]);
            break
    }

    let embedString = '';
    for (let command of helpArray) {
        embedString = embedString + '```COMMAND:\t' + command.name + '\nALIASES:\t' + command.aliases + '\n\n' + command.description + '```';

    }
    return embedString
}