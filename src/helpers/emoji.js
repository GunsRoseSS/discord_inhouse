export const getRoleEmoji = (role) => { //TODO: HAS TO BE CHANGED ON RELEASE
    switch (role) {
        case "top":
            return "<:Top_icon:867737133183008768>"
        case "jgl":
            return "<:Jungle_icon:867737174342369310>"
        case "mid":
            return "<:Middle_icon:867737195544707108>"
        case "adc":
            return "<:Bottom_icon:867737217752760330>"
        case "sup":
            return "<:Support_icon:867737232245129227>"
    }
}


export const getStateEmoji = (state) => {
    switch (state) {
        case "accept":
            return ":white_check_mark:"
        case "decline":
            return ":x:"
        case "none":
            return ":arrows_counterclockwise:"
    }
}

export const emojiNumberSelector = (num) => {
    switch (num) {
        case 1 || '1':
            return ':one: '
        case 2 || '2':
            return ':two: '
        case 3 || '3':
            return ':three: '
        case 4 || '4':
            return ':four: '
        case 5 || '5':
            return ':five: '
        case 6 || '6':
            return ':six: '
        case 7 || '7':
            return ':seven: '
        case 8 || '8':
            return ':eight: '
        case 9 || '9':
            return ':nine: '
        case 10 || '10':
            return ':keycap_ten: '
        default:
            return num + ". "
    }
}