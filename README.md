# Discord Inhouse Bot
A discord bot for managing in-house League of Legends matches. Inspired by mrtoklein's [inhouse bot](https://github.com/mrtolkien/inhouse_bot)
## Features
* Ability to queue for roles
* Matchmaking system
* Integrated rating system
* Player rankings
* Statistics for champions played & rating graphs
## Setup
* Requires **Node.js** & **MongoDB**
* Download source code
* Run `npm install` to install dependencies
* Get token for your Discord bot
    * To get the token, go to your [Discord developer portal](https://discord.com/developers/applications)
    * Select your application
    * Go the the bot tab
    * Copy token
* Create .env file in root directory
    * Add entries for BOT_TOKEN, DB_HOST, DB_NAME, DB_USER, DB_PASS
* Finally, run `npm start` to start the application
## Usage
```javascript
/*
    Below is some example commands that a user may use
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
