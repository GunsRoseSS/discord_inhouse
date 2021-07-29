export const fetchGuildMemberNicknames = async (client) => {
    let guild = await client.guilds.fetch(process.env.GUILD_ID);
    let members = await guild.members.fetch();

    return members.reduce((out, member) => {
        out[member.id] = member.displayName
        return out
    }, {});
}

export const getMemberNickname = (memberID, userList) => {
    return userList[memberID.toString()]
}
