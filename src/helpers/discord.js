//fetches all nicknames from the server.
export const fetchGuildMemberNicknames = async (client) => {
    let guild = await client.guilds.fetch(process.env.GUILD_ID);
    let members = await guild.members.fetch();

    return members.reduce((out, member) => {
        out[member.id] = member.displayName
        return out
    }, {});
}

//gets a nickname from a user from the fetched list above.
export const getMemberNickname = (memberID, userList) => {
    return userList[memberID.toString()]
}
