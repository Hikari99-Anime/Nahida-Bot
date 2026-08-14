const { Events } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,

    execute(client) {
        console.log(`🌱 NahidaFarm online: ${client.user.tag}`);
    }
};