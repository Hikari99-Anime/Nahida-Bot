const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Farm = require("../services/farmService");
const Plant = require("../services/plantService");

/*
==================================================
CONFIG
==================================================
*/

const COLORS = {
    farm: 0x8fd694,
    success: 0x7bc47f,
    warning: 0xf2c76e,
    error: 0xe57373,
    locked: 0x6b7280
};

/*
==================================================
HELPERS
==================================================
*/

function createProgressBar(current, max, size = 10) {
    current = Number(current) || 0;
    max = Math.max(1, Number(max) || 1);

    const ratio = Math.max(
        0,
        Math.min(1, current / max)
    );

    const filled = Math.round(
        ratio * size
    );

    return (
        "█".repeat(filled) +
        "░".repeat(size - filled)
    );
}

/*
==================================================
FARM EMBED
==================================================
*/

function createFarmEmbed(
    interaction,
    farm,
    plots
) {
    const occupied =
        plots.filter(
            plot =>
                plot.unlocked &&
                plot.plant_id
        ).length;

    const unlocked =
        plots.filter(
            plot =>
                plot.unlocked
        ).length;

    const ready =
        plots.filter(plot => {

            if (
                !plot.unlocked ||
                !plot.plant_id
            ) {
                return false;
            }

            const plant =
                Plant.getPlant(
                    plot.plant_id
                );

            return (
                plant &&
                Plant.isReady(plant)
            );
        }).length;

    const locked =
        plots.length - unlocked;

    const need =
        Farm.getRequiredFarmExp(
            farm.level
        );

    let description =
        `*“Một khu vườn nhỏ cũng có thể nuôi dưỡng ` +
        `một giấc mơ lớn.”*\n` +
        `— Nahida\n\n`;

    description +=
        `👤 **${interaction.user.username}**\n` +
        `🌱 **Farm Level ${farm.level}**\n\n`;

    description +=
        `✨ **FARM EXP**\n` +
        `\`${createProgressBar(
            farm.exp,
            need
        )}\` ` +
        `**${farm.exp} / ${need}**\n\n`;

    description +=
        `🪴 **KHU ĐẤT**\n` +
        `> 🌿 ${occupied}/${unlocked} ô đang sử dụng\n` +
        `> ✨ ${ready} cây đã trưởng thành\n`;

    if (locked > 0) {
        description +=
            `> 🔒 ${locked} ô chưa mở khóa\n`;
    }

    description +=
        `\n━━━━━━━━━━━━━━━━━━\n\n`;

    if (!plots.length) {

        description +=
            `🍃 **Khu vườn vẫn chưa có ô đất.**`;

    } else {

        for (const plot of plots) {

            if (!plot.unlocked) {

                description +=
                    `🔒 **Ô ${plot.slot}** — ` +
                    `Chưa mở khóa\n`;

                continue;
            }

            if (!plot.plant_id) {

                description +=
                    `🟫 **Ô ${plot.slot}** — ` +
                    `Trống\n`;

                continue;
            }

            const plant =
                Plant.getPlant(
                    plot.plant_id
                );

            if (!plant) {

                description +=
                    `🟫 **Ô ${plot.slot}** — ` +
                    `Trống\n`;

                continue;
            }

            const isReady =
                Plant.isReady(
                    plant
                );

            description +=
                `${plant.emoji || "🌱"} ` +
                `**Ô ${plot.slot}** — ` +
                `**${plant.name}**\n`;

            description +=
                `> ${
                    isReady
                        ? "✨ **Đã trưởng thành — Có thể thu hoạch**"
                        : "🌱 Đang phát triển"
                }\n`;
        }
    }

    return new EmbedBuilder()
        .setColor(COLORS.farm)
        .setTitle("🌿 `KHU VƯỜN`")
        .setDescription(
            description
        )
        .addFields({
            name: "🌾 TỔNG QUAN",
            value:
                `**${unlocked}** ô mở khóa • ` +
                `**${occupied}** cây đang trồng • ` +
                `**${ready}** cây sẵn sàng`,
            inline: false
        })
        .setFooter({
            text:
                "NahidaFarm • Chọn một ô đất để quản lý"
        });
}

/*
==================================================
PLOT BUTTONS
==================================================
*/

function createPlotButtons(
    plots
) {
    const rows = [];

    let currentRow =
        new ActionRowBuilder();

    for (const plot of plots) {

        const button =
            new ButtonBuilder()
                .setCustomId(
                    `farm_plot_${plot.slot}`
                )
                .setLabel(
                    `Ô ${plot.slot}`
                )
                .setEmoji(
                    !plot.unlocked
                        ? "🔒"
                        : plot.plant_id
                            ? "🌱"
                            : "🟫"
                )
                .setStyle(
                    !plot.unlocked
                        ? ButtonStyle.Secondary
                        : plot.plant_id
                            ? ButtonStyle.Success
                            : ButtonStyle.Secondary
                )
                .setDisabled(
                    !plot.unlocked
                );

        currentRow.addComponents(
            button
        );

        if (
            currentRow.components.length === 5
        ) {
            rows.push(
                currentRow
            );

            currentRow =
                new ActionRowBuilder();
        }
    }

    if (
        currentRow.components.length > 0
    ) {
        rows.push(
            currentRow
        );
    }

    return rows;
}

/*
==================================================
COMMAND
==================================================
*/

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("farm")
            .setDescription(
                "Xem và quản lý khu vườn"
            ),

    async execute(
        interaction
    ) {

        try {

            const farm =
                Farm.ensureFarm(
                    interaction.user.id,
                    interaction.user.username
                );

            const plots =
                Farm.getPlots(
                    interaction.user.id
                );

            const embed =
                createFarmEmbed(
                    interaction,
                    farm,
                    plots
                );

            const buttons =
                createPlotButtons(
                    plots
                );

            await interaction.reply({
                embeds: [
                    embed
                ],
                components:
                    buttons
            });

        } catch (error) {

            console.error(
                "FARM COMMAND ERROR:",
                error
            );

            const embed =
                new EmbedBuilder()
                    .setColor(
                        COLORS.error
                    )
                    .setTitle(
                        "❌ `KHU VƯỜN GẶP LỖI`"
                    )
                    .setDescription(
                        `> ${error.message}`
                    )
                    .setFooter({
                        text:
                            "NahidaFarm • Vui lòng thử lại"
                    });

            await interaction.reply({
                embeds: [
                    embed
                ],
                ephemeral: true
            });
        }
    },

    createFarmEmbed,
    createPlotButtons
};