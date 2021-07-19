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