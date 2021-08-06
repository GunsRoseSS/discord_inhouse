import {MessageEmbed} from "discord.js"

import {MessageButton, MessageMenu, MessageMenuOption} from "discord-buttons"

class EmbedManager {
    static embeds = []
}


/**
 * @description Creates the main discord embed body
 * @param data Contains the data for the page to display
 * @returns Discord message embed object
 */
const generateMessageEmbed = (data) => {
    let embed = new MessageEmbed()
    embed.setTitle(data.title)
    embed.setColor(data.colour)
    embed.setDescription(data.description)

    if ("fields" in data) {
        embed.addFields(data.fields)
    }

    if ("footer" in data) {
        embed.setFooter(data.footer)
    }

    if ("thumbnail" in data) {
        embed.setThumbnail(data.thumbnail)
    }

    return embed
}

const generateId = () => {
    return Math.floor(Math.random() * 1000000000)
}

/**
 * @description Embed class for handling embeds
 */
class Embed {
    constructor(data) {
        this.id = generateId()
        this.init(data)
    }

    //Sets up the embed using the provided data
    //Uses very simular input to creation of MessageEmbed's in discord.js
    //If you need help creating one, try looking at some of the other usages within the code or contact one of the developers
    init(data) {
        this.pages = []
        this.disabled = false
        this.end = new Date()
        this.end.setSeconds(this.end.getSeconds() + 1800)

        if ("message" in data) {
            this.text = data.message
        }

        let default_title = "title" in data ? data.title : "Message Embed"
        let default_colour = "colour" in data ? data.colour : "#FF0000"
        let default_description = "description" in data ? data.description : "Description"
        let default_footer = "footer" in data ? data.footer : "\u2800".repeat(50)

        if ("menu" in data) {
            data.menu.id = generateId()
            this.menu = data.menu
        }

        if ("pages" in data && data.pages.length > 0) {
            data.pages.forEach(element => {
                let page = {}
                page.title = "title" in element ? element.title : default_title
                page.colour = "colour" in element ? element.colour : default_colour
                page.description = "description" in element ? element.description : default_description
    
                if ("fields" in element) {
                    page.fields = element.fields
                }

                if ("thumbnail" in data) {
                    page.thumbnail = data.thumbnail
                }

                if ("thumbnail" in element) {
                    page.thumbnail = element.thumbnail
                }


                this.pages.push(page)
            });
        } else {
            this.pages.push({title: default_title, colour: default_colour, description: default_description, footer: default_footer})
            if ("fields" in data) {
                this.pages[0].fields = data.fields
            }
            
            if ("thumbnail" in data) {
                this.pages[0].thumbnail = data.thumbnail
            }
        }

        if (this.pages.length > 1) {
            this.buttons = [
                {id: `BackStart${generateId()}`, label: "<<", style: "red"},
                {id:`Back${generateId()}`, label: "<", style: "red"},
                {id:`Next${generateId()}`, label: ">", style: "green"},
                {id:`NextEnd${generateId()}`, label: ">>", style: "green"}]

            this.pages = this.pages.map((page, index) => {
                page.footer = `Page ${index+1} of ${this.pages.length}`
                return page
            })
        }

        if ("buttons" in data) {
            this.buttons = []
            for (let button of data.buttons) {
                let btn = {id: `${button.id}${generateId()}`, label: "label" in button ? button.label : "Button", style: "style" in button ? button.style : "green"}
                if ("callback" in button) {
                    btn.callback = button.callback
                }
                this.buttons.push(btn)
            }
        }

    }


    //Creates the whole discord Embed, including buttons/menus
    #createEmbedMessage() {
        let message = {}
        message.embed = generateMessageEmbed(this.pages[this.current_page])
        if ("buttons" in this) {
            message.buttons = []
            this.buttons.forEach(button => {
                let embed_btn = new MessageButton()
                .setLabel(button.label)
                .setID(button.id)
                .setStyle(button.style)

                message.buttons.push(embed_btn)
            })
        }

        if (this.disabled) {
            if ("buttons" in message) {
                message.buttons.forEach(btn => {
                    btn.setDisabled()
                })
            }
        }
            

        if ("menu" in this) {
            let select = new MessageMenu()
            .setID(this.menu.id)
            .setPlaceholder(this.menu.hint)
            .setMaxValues(1)
            .setMinValues(1)

            this.menu.options.forEach(option => {
                select.addOption(new MessageMenuOption()
                    .setLabel(option.label)
                    .setValue(option.value)
                    .setDescription(option.description)
                )
            })

            message.menus = [select]
        }

        return message
    }

    async delete() {
        if ("message" in this) {
            try {
                await this.message.delete()
            } catch (err) {
                console.log(`Error deleting embed id:${this.id}`)
            }
            
        }
    }

    async update() {
        let message = this.#createEmbedMessage()
        try {
            if ("text" in this) {
                await this.message.edit(this.text, message)
            } else {
                await this.message.edit(message)
            }
        } catch (err) {
            console.log(`Failed to update embed id: ${this.id}`)
        }
        
    }

    /**
     * 
     * @param channel The discord channel object
     * @param {Number} [user] The id of the user which can interact with buttons/menus on this embed. Leave blank to give all users access
     */
    async send(channel, user = 0) {
        this.current_page = 0
        this.user = user     

        let message = this.#createEmbedMessage()

        if ("text" in this) {
            this.message = await channel.send(this.text, message)
        } else {
            this.message = await channel.send(message)
        }

        
    }
}

export const updateEmbeds = () => {
    let now = new Date()
    EmbedManager.embeds.forEach((embed, index) => {
        if (embed.end <= now) {
            embed.disabled = true
            embed.update()
            EmbedManager.embeds.splice(index, 1)
            console.log(`Removed unused embed id: ${embed.id}`)
        }
    })
}

export const createEmbed = (data) => {
    let embed = new Embed(data)
    EmbedManager.embeds.push(embed)
    return embed
}

export const deleteEmbed = async (embed) => {
    let index = 0
    for (let savedEmbed of EmbedManager.embeds) {
        if (embed.id == savedEmbed.id) {
            EmbedManager.embeds.splice(index, 1)
            await embed.delete()
        }
        index++
    }
}

export const handleMenuInteration = (menu) => {
    EmbedManager.embeds.forEach(embed => {
        if ("menu" in embed) {
            if (embed.menu.id == menu.id) {
                if ((embed.user == 0 || embed.user == menu.clicker.id) && "callback" in embed.menu) {
                    embed.menu.callback(embed, menu.values[0])
                }
                
            }
        }
    })
}

export const handleButtonInteration = (button) => {
    EmbedManager.embeds.forEach(embed => {
        if ("buttons" in embed) {
            let search = embed.buttons.find(element => element.id == button.id)
            if (search) {
                if (embed.user == 0 || embed.user == button.clicker.id) {
                    if (button.id.substring(0,9) == "BackStart") {
                        embed.current_page = 0
                    } else if (button.id.substring(0, 4) == "Back") {
                        embed.current_page = Math.max(0, embed.current_page-1)
                    } else if (button.id.substring(0,7) == "NextEnd") {
                        embed.current_page = embed.pages.length - 1
                    } else if (button.id.substring(0,4) == "Next") {
                        embed.current_page = Math.min(embed.pages.length - 1, embed.current_page+1)
                    }

                    if ("callback" in search) {
                        search.callback(embed, button)
                    }

                    embed.end = new Date()
                    embed.end.setSeconds(embed.end.getSeconds() + 1800)
                    
                    embed.update()
                }
                
            }
        }
    })
}