export const formatRoles = (roles) => {
	return roles.reduce((out, role) => {
		switch (role) {
			case "top":
				out.push("top")
				break
			case "jgl":
			case "jungle":
			case "jung":
			case "jug":
				out.push("jgl")
				break
			case "mid":
			case "middle":
				out.push("mid")
				break
			case "bot":
			case "bottom":
			case "adc":
				out.push("adc")
				break
			case "sup":
			case "supp":
			case "support":
				out.push("sup")
				break
		}
		return out
	}, [])
}

export const formatUsers = (users) => {
	return users.reduce((out, user) => {
		return [...out, user._id]
	}, [])
}
