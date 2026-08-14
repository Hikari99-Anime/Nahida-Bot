const {
    Client,
    Collection,
    GatewayIntentBits
} = require("discord.js");

const config = require("./config");

require("./database/database");

const {
    loadPlantSpecies
} = require("./database/seedData/loader");

const {
    loadCommands
} = require("./handlers/commandHandler");

const {
    loadEvents
} = require("./handlers/eventHandler");

loadPlantSpecies();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

client.login(config.token);