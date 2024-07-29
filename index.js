const axios = require('axios')
const { Client } = require('@notionhq/client')
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_KEY })

const pokeArray = []

async function getPokemon() {
    const start = 1
    const end = 10
    for (let i = start; i <= end; i++) {
        await axios.get(`https://pokeapi.co/api/v2/pokemon/${i}`).then((response) => {
            // console.log(poke.data.species.name)
            const poke = response.data
            const typesRaw = poke.types
            const typesArray = []
            for (let type of typesRaw) {
                const typeObj = {
                    "name": type.type.name
                }
                typesArray.push(typeObj)
            }

            const processedName = poke.species.name.split(/-/).map((name) => {
                return name[0].toUpperCase() + name.substring(1);
            }).join(" ")
                .replace(/^Mr M/, "Mr. M")
                .replace(/^Mime Jr/, "Mime Jr.")
                .replace(/^Mr R/, "Mr. R")
                .replace(/mo O/, "mo-o")
                .replace(/Porygon Z/, "Porygon-Z")
                .replace(/Type Null/, "Type: Null")
                .replace(/Ho Oh/, "Ho-Oh")
                .replace(/Nidoran F/, "Nidoran♀")
                .replace(/Nidoran M/, "Nidoran♂")
                .replace(/Flabebe/, "Flabébé")

            const bulbURL = `https://bulbapedia.bulbagarden.net/wiki/${processedName.replace(' ', '_')}_(Pokémon)`

            const sprite = (!poke.sprites.front_default) ? poke.sprites.other['official-artwork'].front_default : poke.sprites.front_default

            const pokeData = {
                "name": processedName,
                "number": poke.id,
                "types": typesArray,
                "height": poke.height,
                "weight": poke.weight,
                "hp": poke.stats[0].base_stat,
                "attack": poke.stats[1].base_stat,
                "defense": poke.stats[2].base_stat,
                "special-attack": poke.stats[3].base_stat,
                "special-defense": poke.stats[4].base_stat,
                "speed": poke.stats[5].base_stat,
                "sprite": sprite,
                "artwork": poke.sprites.other['official-artwork'].front_default,
                "bulbURL": bulbURL
            }
            console.log(`Fetched ${pokeData.name}.`)
            console.table(pokeData)

            pokeArray.push(pokeData)
        })
            .catch((error) => {
                console.log(error)
            })
    }
    for (let pokemon of pokeArray) {
        const flavor = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.number}`)
            .then((flavor) => {

                const flavorText = flavor.data.flavor_text_entries.find(({ language: { name } }) => name === "en").flavor_text.replace(/\n|\f|\r/g, " ")
                const category = flavor.data.genera.find(({ language: { name } }) => name === "en").genus
                const generation = flavor.data.generation.name.split(/-/).pop().toUpperCase()

                pokemon['flavor-text'] = flavorText
                pokemon.category = category
                pokemon.generation = generation

                console.log(`Fetched flavor info for ${pokemon.name}.`)
            })
            .catch((error) => {
                console.log(error)
            })
    }
    createNotionPage()
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};

getPokemon()


async function createNotionPage() {
    for (let poke of pokeArray) {
        const data = {
            "parent": {
                "type": "database_id",
                "database_id": process.env.NOTION_DATABASE_ID
            },
            "icon": {
                "type": "external",
                "external": {
                    "url": poke.sprite
                }
            },
            "cover": {
                "type": "external",
                "external": {
                    "url": poke.artwork
                }
            },
            "properties": {
                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": poke.name
                            }
                        }
                    ]
                },
                "Category": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": poke.category
                            }
                        }
                    ]
                },
                "No": {
                    "number": poke.number
                },
                "Type": {
                    "multi_select": poke.types
                },
                "Generation": {
                    "select": {
                        "name": poke.generation
                    }
                },
                "Sprite": {
                    "files": [
                        {
                            "type": "external",
                            "name": "Pokemon Sprite",
                            "external": {
                                "url": poke.sprite
                            }
                        }
                    ]
                },
                "Height": {
                    "number": poke.height
                },
                "Weight": {
                    "number": poke.weight
                },
                "HP": {
                    "number": poke.hp
                },
                "Attack": {
                    "number": poke.attack
                },
                "Defense": {
                    "number": poke.defense
                },
                "Sp. Attack": {
                    "number": poke['special-attack']
                },
                "Sp. Defense": {
                    "number": poke['special-defense']
                },
                "Speed": {
                    "number": poke.speed
                }
            },
                "children": [
                    {
                        "object": "block",
                        "type": "quote",
                        "quote": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": poke['flavor-text']
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": ""
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": "View This Pokémon's Entry on Bulbapedia:"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "object": "block",
                        "type": "bookmark",
                        "bookmark": {
                            "url": poke.bulbURL
                        }
                    }
                ]
            }
            await sleep(300)


            console.log(`Sending ${poke.name} to Notion`)
            const response = await notion.pages.create(data)
            console.log(response)
        }
        console.log(`Operation complete.`)
    }



