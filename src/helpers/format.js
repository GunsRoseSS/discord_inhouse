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
			case "all":
			case 'fill':
				out.push("top", "jgl", "mid", "adc", "sup")
		}
		return out
	}, [])
}

export const formatUsers = (users) => {
	return users.reduce((out, user) => {
		return [...out, user._id]
	}, [])
}

export const getChampionName = (champion) => {
	champion = champion.split(/(?=[A-Z])/).join(" ")
	switch(champion) {
		case "Chogath":
			return "Cho'Gath"
		case "Dr Mundo":
			return "Dr.Mundo"
		case "Jarvan I V":
			return "Jarvan IV"
		case "Kaisa":
			return "Kai'Sa"
		case "Khazix":
			return "Kha'Zix"
		case "Kogmaw":
			return "Kog'Maw"
		case "Reksai":
			return "Rek'Sai"
		case "Velkoz":
			return "Vel'Koz"
	}
	return champion
}

export const formatChampions = (champions) => {
	const champs = ["AurelionSol", "Akshan", "DrMundo","JarvanIV", "LeeSin", "MasterYi", "MissFortune", "TahmKench", "TwistedFate", "XinZhao", "Aatrox","Ahri","Akali","Alistar","Amumu","Anivia","Annie","Aphelios","Ashe","Azir","Bard","Blitzcrank","Brand","Braum","Caitlyn","Camille","Cassiopeia","Chogath","Corki","Darius","Diana","Draven","Ekko","Elise","Evelynn","Ezreal","Fiddlesticks","Fiora","Fizz","Galio","Gangplank","Garen","Gnar","Gragas","Graves","Gwen", "Hecarim","Heimerdinger","Illaoi","Irelia","Ivern","Janna","Jax","Jayce","Jhin","Jinx","Kaisa","Kalista","Karma","Karthus","Kassadin","Katarina","Kayle","Kayn","Kennen","Khazix","Kindred","Kled","Kogmaw","Leblanc", "Leona","Lillia","Lissandra","Lucian","Lulu","Lux","Malphite","Malzahar","Maokai", "Mordekaiser","Morgana","Nami","Nasus","Nautilus","Neeko","Nidalee","Nocturne","Nunu","Olaf","Orianna","Ornn","Pantheon","Poppy","Pyke","Qiyana","Quinn","Rakan","Rammus","Reksai","Rell","Renekton","Rengar","Riven","Rumble","Ryze","Samira","Sejuani","Senna","Seraphine","Sett","Shaco","Shen","Shyvana","Singed","Sion","Sivir","Skarner","Sona","Soraka","Swain","Sylas","Syndra","Taliyah","Talon","Taric","Teemo","Thresh","Tristana","Trundle","Tryndamere","Twitch","Udyr","Urgot","Varus","Vayne","Veigar","Viego", "Velkoz","Vi","Viktor","Vladimir","Volibear","Warwick","Wukong","Xayah","Xerath","Yasuo","Yone","Yorick","Yuumi","Zac","Zed","Ziggs","Zilean","Zoe","Zyra"]

	return champions.reduce((out, champion) => {

		champion = champion[0].toUpperCase() + champion.substring(1)
		champion = champion.replace("'", "")

		if (champs.includes(champion) && !out.includes(champion)) {
			out.push(champion)
		} else {
			let temp = null

			switch(champion) {
				case "Aurelionsol":
				case "Aurelion":
				case "Asol":
					temp = ("AurelionSol")
					break
				case "Drmundo":
				case "Dr.mundo":
				case "Dr.Mundo":
				case "Mundo":
					temp = ("DrMundo")
					break
				case "Jarvan":
				case "J4":
					temp = ("JarvanIV")
					break
				case "Leesin":
				case "Lee":
				case "Blind":
				case "Blindman":
				case "BlindMan":
					temp = ("LeeSin")
					break
				case "Masteryi":
				case "Yi":
				case "YI":
					temp = ("MasterYi")
					break
				case "Missfortune":
				case "Mf":
				case "MF":
					temp = ("MissFortune")
					break
				case "Tahmkench":
				case "Tahm":
				case "Kench":
					temp = ("TahmKench")
					break
				case "Twistedfate":
				case "Tf":
				case "TF":
					temp = ("TwistedFate")
					break
				case "Xinzhao":
				case "Xin":
					temp = ("XinZhao")
					break
				case "Ali":
				case "Allahstar":
				case "Allastar":
					temp = ("Alistar")
					break
				case "Ammumu":
				case "Mumu":
					temp = ("Amumu")
					break
				case "Blitz":
				case "Crank":
					temp = ("Blitzcrank")
					break
				case "Cait":
				case "Caitlin":
					temp = ("Caitlyn")
					break
				case "Cass":
				case "Cas":
				case "Casio":
				case "Cassio":
					temp = ("Cassiopeia")
					break
				case "Cho":
					temp = ("Chogath")
					break
				case "Luc":
					temp = ("Lucian")
					break
				case "Eve":
				case "Evelyn":
					temp = ("Evelynn")
					break
				case "Ez":
					temp = ("Ezreal")
					break
				case "Fiddle":
				case "Cancersticks":
					temp = ("Fiddlesticks")
					break
				case "Gp":
				case "GP":
					temp = ("Gangplank")
					break
				case "Heca":
				case "Hec":
					temp = ("Hecarim")
					break
				case "Heimer":
					temp = ("Heimerdinger")
					break
				case "Kass":
				case "Kassa":
					temp = ("Kassadin")
					break
				case "Kat":
					temp = ("Katarina")
					break
				case "Kha":
					temp = ("Khazix")
					break
				case "Kog":
					temp = ("Kogmaw")
					break
				case "Lb":
				case "LB":
					temp = ("Leblanc")
					break
				case "Leo":
					temp = ("Leona")
					break
				case "Liss":
					temp = ("Lissandra")
					break
				case "Malph":
					temp = ("Malphite")
					break
				case "Malz":
					temp = ("Malzahar")
					break
				case "Mao":
					temp = ("Maokai")
					break
				case "Mord":
				case "Morde":
					temp = ("Mordekaiser")
					break
				case "Morg":
					temp = ("Morgana")
					break
				case "Dog":
					temp = ("Nasus")
					break
				case "Naut":
					temp = ("Nautilus")
					break
				case "Nid":
				case "Nida":
					temp = ("Nidalee")
					break
				case "Noc":
				case "Noct":
					temp = ("Nocturne")
					break
				case "Jacob":
					temp = ("Nunu")
					break
				case "Richard":
					temp = ("Corki")
					break
				case "Ori":
				case "Oriana":
					temp = ("Orianna")
					break
				case "Panth":
					temp = ("Pantheon")
					break
				case "Renek":
					temp = ("Renekton")
					break
				case "Sej":
					temp = ("Sejuani")
					break
				case "Sera":
					temp = ("Seraphine")
					break
				case "Shyv":
				case "Shyvana":
					temp = ("Shyvanna")
					break
				case "Raka":
					temp = ("Soraka")
					break
				case "Trist":
					temp = ("Tristana")
					break
				case "Trynd":
					temp = ("Tryndamere")
					break
				case "Vlad":
					temp = ("Vladimir")
					break
				case "Voli":
					temp = ("Volibear")
					break
				case "Ww":
				case "WW":
					temp = ("Warwick")
					break
				case "Xer":
					temp = ("Xerath")
					break
				case "Yas":
					temp = ("Yasuo")
					break
				case "Cat":
				case "Yummi":
				case "Yumi":
					temp = ("Yuumi")
					break
				case "Black1":
					temp = ("Ekko")
					break
				case "Ruinedboy":
				case "Isolde":
					temp = ("Viego")
			}
			if (temp && !out.includes(temp)) {
				out.push(temp)
			}
		}

		return out
	}, [])
}

export const checkPositive = (number) => {
	let convertedNumber = parseInt(number);
	if (convertedNumber > 0) {
		return '+' + convertedNumber
	} else {
		return convertedNumber
	}
}

const dateOrdinal = (d) => {
	return d+(31==d||21==d||1==d?"st":22==d||2==d?"nd":23==d||3==d?"rd":"th")
};

export const formatDate = (date, shorthand = false) => {
	if (shorthand) {
		return (date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear().toString().substring(2,4))
	} else {
		let d = date.toString()
    	let date_p1 = d.substring(0,8)
    	let date_p2 = d.substring(8,10)
		date_p2 = dateOrdinal(date_p2.startsWith("0") ? date_p2.substring(1) : date_p2)
    	let date_p3 = d.substring(10,15)

		return date_p1 + date_p2 + date_p3
	}
}
