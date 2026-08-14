const {
    SlashCommandBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Kiểm tra NahidaFarm Bot"),

    async execute(interaction) {
        await interaction.reply("🌱 NahidaFarm đang hoạt động!");
    }
};