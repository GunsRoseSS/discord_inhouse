export const getRoleEmoji = (role) => {
    switch (role) {
        case "top":
            return "<:TOP:853012268051857448>"
        case "jgl":
            return "<:JGL:853012268140199946>"
        case "mid":
            return "<:MID:853012267821694997>"
        case "adc":
            return "<:ADC:853012268005982228>"
        case "sup":
            return "<:SUP:853012248666963979>"
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

export const emojiGainedSelector = (mmr) => {
    if (mmr >= 150) {
        return ":crown:"
    } else if (mmr >= 75) {
        return ":thumbup:"
    } else if (mmr >= 0) {
        return ":neutral_face:"
    } else if (mmr >= -75) {
        return ":skull:"
    } else {
        return ":person_in_motorized_wheelchair:"
    }
}

export const emojiOpponentGainedSelector = (mmr) => {
    if (mmr >= 150) {
        return ":free:"
    } else if (mmr >= 75) {
        return ":thumbup:"
    } else if (mmr >= 0) {
        return ":neutral_face:"
    } else if (mmr >= -75) {
        return "<:arnoldcry:872902201356476426>"
    } else {
        return ":rage:"
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
