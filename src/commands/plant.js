const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Farm = require("../services/farmService");
const Plant = require("../services/plantService");
const { addExp } = require("../services/expService");

/*
==================================================
COLORS
==================================================
*/

const COLORS = {
    success: 0x8fd694,
    error: 0xe57373
};

/*
==================================================
PLANT SUCCESS EMBED
==================================================
*/

function createPlantSuccessEmbed(
    interaction,
    plant,
    slot,
    exp
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
        `*“Mọi hạt giống đều cần một nơi để bắt đầu.”*\n` +
        `— Nahida\n\n`;

    description +=
        `👤 **${interaction.user.username}**\n\n`;

    description +=
        `🪴 **Ô ĐẤT**\n` +
        `> Ô **${slot}**\n\n`;

    description +=
        `🌱 **CÂY ĐÃ GIEO**\n` +
        `> ${plant.emoji || "🌱"} ` +
        `**${plant.name}**\n`;

    if (plant.id !== undefined) {
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
        `✦ **+5 EXP**`;

    if (
        exp &&
        exp.levelsGained
    ) {
        description +=
            `\n\n✨ **LEVEL UP!**\n` +
            `> Bạn đã đạt **Lv.${exp.user.level}**`;
    }

    return new EmbedBuilder()
        .setColor(
            COLORS.success
        )
        .setTitle(
            "🌱 `GIEO HẠT THÀNH CÔNG`"
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                "NahidaFarm • Chăm sóc cây thật tốt nhé!"
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
            .setName("plant")
            .setDescription(
                "Trồng một hạt giống"
            )

            .addIntegerOption(
                option =>
                    option
                        .setName("slot")
                        .setDescription(
                            "Ô đất muốn trồng"
                        )
                        .setRequired(true)
                        .setMinValue(1)
            )

            .addStringOption(
                option =>
                    option
                        .setName("seed")
                        .setDescription(
                            "Loại hạt giống"
                        )
                        .setRequired(true)
                        .setAutocomplete(true)
            ),

    async execute(
        interaction
    ) {

        const userId =
            interaction.user.id;

        Farm.ensureFarm(
            userId,
            interaction.user.username
        );

        const slot =
            interaction.options.getInteger(
                "slot"
            );

        const seed =
            interaction.options.getString(
                "seed"
            );

        try {

            const plant =
                Plant.plantOnPlot(
                    userId,
                    slot,
                    seed
                );

            const exp =
                addExp(
                    userId,
                    5
                );

            const embed =
                createPlantSuccessEmbed(
                    interaction,
                    plant,
                    slot,
                    exp
                );

            await interaction.reply({
                embeds: [
                    embed
                ]
            });

        } catch (error) {

            console.error(
                "PLANT COMMAND ERROR:",
                error
            );

            const embed =
                new EmbedBuilder()
                    .setColor(
                        COLORS.error
                    )
                    .setTitle(
                        "❌ `KHÔNG THỂ GIEO HẠT`"
                    )
                    .setDescription(
                        `> ${error.message}`
                    )
                    .setFooter({
                        text:
                            "NahidaFarm • Kiểm tra ô đất và thử lại"
                    });

            await interaction.reply({
                embeds: [
                    embed
                ],
                ephemeral: true
            });
        }
    },

    /*
    ==============================================
    AUTOCOMPLETE
    ==============================================
    */

    async autocomplete(
        interaction
    ) {

        const focused =
            interaction.options.getFocused();

        const species =
            Plant.getSpeciesList();

        const search =
            focused.toLowerCase();

        const results =
            species
                .filter(plant =>
                    plant.id
                        .toLowerCase()
                        .includes(search) ||

                    plant.name
                        .toLowerCase()
                        .includes(search)
                )
                .slice(0, 25)
                .map(plant => ({
                    name:
                        `${plant.emoji || "🌱"} ${plant.name}`,

                    value:
                        plant.id
                }));

        await interaction.respond(
            results
        );
    },

    createPlantSuccessEmbed
};