const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Plant = require("../services/plantService");
const User = require("../database/models/User");
const Farm = require("../services/farmService");
const { addExp } = require("../services/expService");

/*
==================================================
COLORS
==================================================
*/

const COLORS = {
    harvest: 0xf2c76e,
    error: 0xe57373
};

/*
==================================================
HARVEST EMBED
==================================================
*/

function createHarvestEmbed(
    interaction,
    plant,
    mora
) {
    const rarity =
        Math.max(
            1,
            Math.min(
                5,
                Number(plant.rarity) || 1
            )
        );

    let description =
        `*“Một vụ mùa tốt là phần thưởng ` +
        `cho sự kiên nhẫn.”*\n\n`;

    description +=
        `👤 **${interaction.user.username}**\n\n`;

    description +=
        `🌾 **CÂY ĐÃ THU HOẠCH**\n` +
        `> ${plant.emoji || "🌱"} ` +
        `**${plant.name}**\n`;

    if (
        plant.id !== undefined
    ) {
        description +=
            `> 🆔 \`${plant.id}\`\n`;
    }

    description +=
        `> ⭐ Rarity: **${
            "★".repeat(rarity)
        }${
            "☆".repeat(5 - rarity)
        }**\n\n`;

    description +=
        `━━━━━━━━━━━━━━━━━━\n\n`;

    description +=
        `💰 **+${mora} Mora**\n` +
        `✦ **+10 EXP**\n` +
        `🌿 **+5 Farm EXP**\n\n`;

    description +=
        `🍃 Thành quả đã được thêm vào tài sản của bạn.`;

    return new EmbedBuilder()
        .setColor(
            COLORS.harvest
        )
        .setTitle(
            "🌾 `THU HOẠCH THÀNH CÔNG`"
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                "NahidaFarm • Một vụ mùa tuyệt vời!"
        });
}

/*
==================================================
COMMAND
==================================================
*/

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("harvest")
            .setDescription(
                "Thu hoạch cây"
            )

            .addIntegerOption(
                option =>
                    option
                        .setName("slot")
                        .setDescription(
                            "Ô đất"
                        )
                        .setRequired(true)
                        .setMinValue(1)
            ),

    async execute(
        interaction
    ) {

        const userId =
            interaction.user.id;

        const slot =
            interaction.options.getInteger(
                "slot"
            );

        try {

            const plant =
                Plant.harvestPlant(
                    userId,
                    slot
                );

            const mora =
                plant.sell_price;

            const user =
                User.getUser(
                    userId
                );

            User.updateUser(
                userId,
                {
                    mora:
                        user.mora + mora
                }
            );

            addExp(
                userId,
                10
            );

            Farm.addFarmExp(
                userId,
                5
            );

            const embed =
                createHarvestEmbed(
                    interaction,
                    plant,
                    mora
                );

            await interaction.reply({
                embeds: [
                    embed
                ]
            });

        } catch (error) {

            console.error(
                "HARVEST COMMAND ERROR:",
                error
            );

            const embed =
                new EmbedBuilder()
                    .setColor(
                        COLORS.error
                    )
                    .setTitle(
                        "❌ `THU HOẠCH THẤT BẠI`"
                    )
                    .setDescription(
                        `> ${error.message}`
                    )
                    .setFooter({
                        text:
                            "NahidaFarm • Cây chưa thể thu hoạch"
                    });

            await interaction.reply({
                embeds: [
                    embed
                ],
                ephemeral: true
            });
        }
    },

    createHarvestEmbed
};