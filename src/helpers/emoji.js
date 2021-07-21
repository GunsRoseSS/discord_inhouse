export const getRoleEmoji = (role) => {
    switch (role) {
        case "top":
            return ":island:"
        case "jgl":
            return ":dog:"
        case "mid":
            return ":airplane:"
        case "adc":
            return ":cry:"
        case "sup":
            return ":ambulance:"
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