# Discord Inhouse Bot
A Discord bot for managing in-house League of Legends matches. Inspired by mrtolkien's [inhouse bot](https://github.com/mrtolkien/inhouse_bot).  
This Discord Inhouse bot contains all the functions of mrtolkien's bot and extends this with multiple statistics type functions.

## Features
* Ability to queue for roles
* Matchmaking system
* Integrated rating system
* Player rankings
* Statistics for champions played & rating graphs

## Dependencies
This bot uses the following npm packages:
* **discord.js:** Discord.js is the main npm package that allows the bot to communicate with Discord.
* **discord-buttons:** Discord-buttons allows us to make use of buttons in Discord messages.
* **chart.js-image:** This package is used for graph generation.
* **dotenv:** This packages allows for the creation of .env (environment) files, in which different users of the code can insert variables.
* **mongoose:** Mongoose is a package that handles MongoDB communication.
* **openskill:** Openskill is an Open Source elo/ranking package. It handles all the mmr calculation.
## Setup
* Requires **Node.js** & **MongoDB**
* Download source code
* Run `npm install` to install dependencies
* Get token for your Discord bot
    * To get the token, go to your [Discord developer portal](https://discord.com/developers/applications)
    * Select your application
    * Go to the bot tab
    * Copy token
* Create .env file in root directory
    * Add entry for BOT_TOKEN with your Discord token
    * Add your server's GUILD_ID (Can be found by enabling discord developer mode)
    * Create entries for DB_HOST, DB_NAME, DB_USER, DB_PASS with your MongoDB database info
    * Set the amount of games that graphs should show with GRAPH_GAMES_AMOUNT (recommended=30)
    * Set the amount of players an embed page should show with EMBED_PAGE_LENGTH (recommended=10)
    * Set the following mmr variables: 
      * STARTING_MU=1340
      * STARTING_SIGMA=280
      * MINIMUM_MU=840
      * MINIMUM_SIGMA=110.  
    WARNING: These values alter how mmr is calculated. If you want to change these variables, please test the openskill package before doing so.
* Finally, run `npm start` to start the application
## Usage
```javascript
/*
    Below are some example commands that a user may use
    A full list of commands can be found using the !help command
*/

!queue top mid adc //Queues a user in the selected roles

!start //Starts the matchmaking process, will send a message when a match is found

!lineup singed udyr vladimir jhin braum //Sets the lineup for the team that the user of this command is on

!win //Marks the end of a match, atleast 6 players from the match must accept this for the game to be accepted

!history //View history of matches that a player has been in

!rank //Shows the ranking of the player in each role

!champions //Shows all the champions the user has played

!graph //Shows a graph of the users rating in each role over time
```
##Limitations
This discord inhouse bot was made for small communities. This means that the bot knows few limitations:

* Only one game can be played at the same time.
* There are about 20 different colours for the graph, so any amount of players displayed that's larger than 20 will have overlapping colours.
* Role graphs (!graph [role]) tend to get extremely chaotic when more than 20 players have played in recent games.
* Statistics are currently retrieved by using a private scraper API. This is due to Riot API not retrieving custom game data. If you want statistics to work, you need to either request access to our scraper or create your own. If you choose the latter, please let your API post this data structure:

```javascript
{
  bans: [ // all the bans of the game
    'Pyke',     'Gwen',
    'Riven',    'Skarner',
    'Ivern',    'Irelia',
    'Orianna',  'XinZhao',
    'Volibear', 'Kindred'
  ],
  players: [ //an array of 10 objects representing the players
    {//include the following data:
      champion: 'JarvanIV',
      kills: '4',
      deaths: '8',
      assists: '9',
      cs: '134',
      gold: 10600,
      spree: '4', //largest killing spree
      multi: '1', //largest multikill (e.g. 2 = double kill)
      first: false, //whether the player had the first kill of the game
      champ_dmg_total: 10900, //these 4 stats are damage to champions
      champ_dmg_physical: 9200,
      champ_dmg_magic: 1100,
      champ_dmg_true: 700,
      objective_dmg: 25200,
      turret_dmg: 900,
      healed_dmg: 8500,
      taken_dmg_total: 29400, //damage taken
      taken_dmg_physical: 21900,
      taken_dmg_magic: 6000,
      taken_dmg_true: 1500,
      wards_placed: '5',
      control_wards: '4',
      spent: 10600
    },
    {
      champion: 'Kayle',
      kills: '1',
      deaths: '10',
      assists: '5',
      cs: '196',
      gold: 9600,
      spree: '1',
      multi: '1',
      first: false,
      champ_dmg_total: 8500,
      champ_dmg_physical: 2000,
      champ_dmg_magic: 6300,
      champ_dmg_true: 200,
      objective_dmg: 400,
      turret_dmg: 0,
      healed_dmg: 3100,
      taken_dmg_total: 22500,
      taken_dmg_physical: 15300,
      taken_dmg_magic: 5600,
      taken_dmg_true: 1600,
      wards_placed: '11',
      control_wards: '2',
      spent: 8600
    },
    {etc..}
  ]
}

```
