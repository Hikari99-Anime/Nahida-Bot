const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Plant = require("../services/plantService");
const { addExp } = require("../services/expService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("water")
        .setDescription("Tưới cây")
        .addIntegerOption(option =>
            option
                .setName("slot")
                .setDescription("Ô đất")
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {

        const userId =
            interaction.user.id;

        const slot =
            interaction.options.getInteger("slot");

        try {

            /*
            ==========================================
            TƯỚI CÂY
            ==========================================
            */

            const plant =
                Plant.waterPlant(
                    userId,
                    slot
                );


            /*
            ==========================================
            EXP
            ==========================================
            */

            const exp =
                addExp(
                    userId,
                    3
                );


            /*
            ==========================================
            EMBED
            ==========================================
            */

            const embed =
                new EmbedBuilder()

                    .setColor(0x74c69d)

                    .setTitle(
                        "💧 `TƯỚI CÂY THÀNH CÔNG`"
                    )

                    .setDescription(
                        [
                            `**${interaction.user.username}** đã chăm sóc khu vườn của mình.\n`,
                            `━━━━━━━━━━━━━━━━━━`,
                            "",
                            `💧 **Đã tưới cây**`,
                            `${plant.emoji || "🌱"} **${plant.name}**`,
                            `🪴 Ô đất **${slot}**`,
                            "",
                            `✦ **+3 EXP**`,
                            exp.levelsGained
                                ? `✨ **Level Up! Lv.${exp.user.level}**`
                                : "",
                            "",
                            `> “Một chút nước hôm nay,`,
                            `> một khu vườn xanh ngày mai.”`,
                            `> — Nahida`
                        ]
                        .filter(Boolean)
                        .join("\n")
                    )

                    .setThumbnail(
                        interaction.user.displayAvatarURL({
                            extension: "png",
                            size: 256
                        })
                    )

                    .setFooter({
                        text:
                            "NahidaFarm • Chăm sóc khu vườn"
                    })

                    .setTimestamp();


            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(
                "WATER COMMAND ERROR:",
                error
            );


            /*
            ==========================================
            ERROR EMBED
            ==========================================
            */

            const errorEmbed =
                new EmbedBuilder()

                    .setColor(0xe76f51)

                    .setTitle(
                        "💧 `KHÔNG THỂ TƯỚI CÂY`"
                    )

                    .setDescription(
                        [
                            `Không thể tưới cây ở **ô ${slot}**.`,
                            "",
                            `❌ ${error.message}`,
                            "",
                            `> Hãy kiểm tra lại ô đất và thử lại nhé.`
                        ].join("\n")
                    )

                    .setFooter({
                        text:
                            "NahidaFarm • Khu vườn"
                    })

                    .setTimestamp();


            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    }
};