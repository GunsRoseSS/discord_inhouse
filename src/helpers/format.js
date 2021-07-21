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

export const formatChampions = (champions) => {
	const champs = ["AurelionSol", "DrMundo","JarvanIV", "LeeSin", "MasterYi", "MissFortune", "TahmKench", "TwistedFate", "XinZhao", "Aatrox","Ahri","Akali","Alistar","Amumu","Anivia","Annie","Aphelios","Ashe","Azir","Bard","Blitzcrank","Brand","Braum","Caitlyn","Camille","Cassiopeia","Chogath","Corki","Darius","Diana","Draven","Ekko","Elise","Evelynn","Ezreal","Fiddlesticks","Fiora","Fizz","Galio","Gangplank","Garen","Gnar","Gragas","Graves","Gwen", "Hecarim","Heimerdinger","Illaoi","Irelia","Ivern","Janna","Jax","Jayce","Jhin","Jinx","Kaisa","Kalista","Karma","Karthus","Kassadin","Katarina","Kayle","Kayn","Kennen","Khazix","Kindred","Kled","Kogmaw","Leblanc", "Leona","Lillia","Lissandra","Lucian","Lulu","Lux","Malphite","Malzahar","Maokai", "Mordekaiser","Morgana","Nami","Nasus","Nautilus","Neeko","Nidalee","Nocturne","Nunu","Olaf","Orianna","Ornn","Pantheon","Poppy","Pyke","Qiyana","Quinn","Rakan","Rammus","Reksai","Rell","Renekton","Rengar","Riven","Rumble","Ryze","Samira","Sejuani","Senna","Seraphine","Sett","Shaco","Shen","Shyvana","Singed","Sion","Sivir","Skarner","Sona","Soraka","Swain","Sylas","Syndra","Taliyah","Talon","Taric","Teemo","Thresh","Tristana","Trundle","Tryndamere","Twitch","Udyr","Urgot","Varus","Vayne","Veigar","Veigo", "Velkoz","Vi","Viktor","Vladimir","Volibear","Warwick","Wukong","Xayah","Xerath","Yasuo","Yone","Yorick","Yuumi","Zac","Zed","Ziggs","Zilean","Zoe","Zyra"]

	return champions.reduce((out, champion) => {

		champion = champion[0].toUpperCase() + champion.substring(1)
		champion = champion.replace("'", "")

		if (champs.includes(champion)) {
			out.push(champion)
		} else {
			switch(champion) {
				case "Aurelionsol":
				case "Aurelion":
				case "Asol":
					out.push("AurelionSol")
					break
				case "Drmundo":
				case "Dr.mundo":
				case "Dr.Mundo":
				case "Mundo":
					out.push("DrMundo")
					break
				case "Jarvan":
				case "J4":
					out.push("JarvanIV")
					break
				case "Leesin":
				case "Lee":
				case "Blind":
				case "Blindman":
				case "BlindMan":
					out.push("LeeSin")
					break
				case "Masteryi":
				case "Yi":
				case "YI":
					out.push("MasterYi")
					break
				case "Missfortune":
				case "Mf":
				case "MF":
					out.push("MissFortune")
					break
				case "Tahmkench":
				case "Tahm":
				case "Kench":
					out.push("TahmKench")
					break
				case "Twistedfate":
				case "Tf":
				case "TF":
					out.push("TwistedFate")
					break
				case "Xinzhao":
				case "Xin":
					out.push("XinZhao")
					break
				case "Ali":
				case "Allahstar":
				case "Allastar":
					out.push("Alistar")
					break
				case "Ammumu":
				case "Mumu":
					out.push("Amumu")
					break
				case "Blitz":
				case "Crank":
					out.push("Blitzcrank")
					break
				case "Cait":
					out.push("Caitlyn")
					break
				case "Cass":
				case "Cas":
				case "Casio":
				case "Cassio":
					out.push("Cassiopeia")
					break
				case "Cho":
					out.push("Chogath")
					break
				case "Luc":
					out.push("Lucian")
					break
				case "Eve":
				case "Evelyn":
					out.push("Evelynn")
					break
				case "Ez":
					out.push("Ezreal")
					break
				case "Fiddle":
				case "Cancersticks":
					out.push("Fiddlesticks")
					break
				case "Gp":
				case "GP":
					out.push("Gangplank")
					break
				case "Heca":
				case "Hec":
					out.push("Hecarim")
					break
				case "Heimer":
					out.push("Heimerdinger")
					break
				case "Kass":
				case "Kassa":
					out.push("Kassadin")
					break
				case "Kat":
					out.push("Katarina")
					break
				case "Kha":
					out.push("Khazix")
					break
				case "Kog":
					out.push("Kogmaw")
					break
				case "Lb":
				case "LB":
					out.push("Leblanc")
					break
				case "Leo":
					out.push("Leona")
					break
				case "Liss":
					out.push("Lissandra")
					break
				case "Malph":
					out.push("Malphite")
					break
				case "Malz":
					out.push("Malzahar")
					break
				case "Mao":
					out.push("Maokai")
					break
				case "Mord":
				case "Morde":
					out.push("Mordekaiser")
					break
				case "Morg":
					out.push("Morgana")
					break
				case "Dog":
					out.push("Nasus")
					break
				case "Naut":
					out.push("Nautilus")
					break
				case "Nid":
				case "Nida":
					out.push("Nidalee")
					break
				case "Noc":
				case "Noct":
					out.push("Nocturne")
					break
				case "Jacob":
					out.push("Nunu")
					break
				case "Richard":
					out.push("Corki")
					break
				case "Ori":
				case "Oriana":
					out.push("Orianna")
					break
				case "Panth":
					out.push("Pantheon")
					break
				case "Renek":
					out.push("Renekton")
					break
				case "Sej":
					out.push("Sejuani")
					break
				case "Sera":
					out.push("Seraphine")
					break
				case "Shyv":
				case "Shyvana":
					out.push("Shyvanna")
					break
				case "Raka":
					out.push("Soraka")
					break
				case "Trist":
					out.push("Tristana")
					break
				case "Trynd":
					out.push("Tryndamere")
					break
				case "Vlad":
					out.push("Vladimir")
					break
				case "Voli":
					out.push("Volibear")
					break
				case "Ww":
				case "WW":
					out.push("Warwick")
					break
				case "Xer":
					out.push("Xerath")
					break
				case "Yas":
					out.push("Yasuo")
					break
				case "Cat":
				case "Yummi":
				case "Yumi":
					out.push("Yuumi")
					break
				case "Black1":
					out.push("Ekko")
					break
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
