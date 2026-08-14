const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const Plant = require("../services/plantService");

function createEmptyPlotUI(slot) {
    const embed = new EmbedBuilder()
        .setColor(0x8bcf7a)
        .setTitle(`🟫 Ô ĐẤT ${slot}`)
        .setDescription(
            "Ô đất này đang trống.\n\n" +
            "Hãy chọn một hạt giống để bắt đầu gieo trồng."
        )
        .setFooter({
            text: "NahidaFarm • Chăm sóc khu vườn"
        });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`farm_plant_${slot}`)
                .setLabel("Trồng cây")
                .setEmoji("🌱")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("farm_back")
                .setLabel("Quay lại")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [row]
    };
}
function createGrowingPlantUI(
    slot,
    plant
) {
    const {
        getGrowthInfo,
        createProgressBar
    } = require("../services/plantService");

    const growth =
        getGrowthInfo(plant);

    const minutes =
        Math.floor(
            growth.remaining / 60000
        );

    const seconds =
        Math.floor(
            (growth.remaining % 60000) / 1000
        );

    const timeText =
        minutes > 0
            ? `${minutes} phút ${seconds} giây`
            : `${seconds} giây`;

    const embed =
        new EmbedBuilder()
            .setColor(0x8bcf7a)
            .setTitle(
                `${plant.emoji} ${plant.name}`
            )
            .setDescription(
                `🪴 **Ô đất:** ${slot}\n\n` +
                `🌱 **Đang phát triển...**\n\n` +
                `\`${createProgressBar(growth.progress)}\` ` +
                `**${growth.progress}%**\n\n` +
                `⏳ Còn **${timeText}**`
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `farm_water_${slot}`
                    )
                    .setLabel("Tưới cây")
                    .setEmoji("💧")
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `farm_refresh_${slot}`
                    )
                    .setLabel("Làm mới")
                    .setEmoji("🔄")
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "farm_back"
                    )
                    .setLabel("Khu vườn")
                    .setEmoji("🌱")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    return {
        embeds: [embed],
        components: [row]
    };
}
function createSeedSelectUI(slot) {
    const species = Plant.getSpeciesList();

    const options = species
        .slice(0, 25)
        .map(plant => ({
            label: plant.name,
            description:
                `${"★".repeat(plant.rarity)} • ` +
                `${plant.growth_seconds}s`,
            value: plant.id,
            emoji: plant.emoji
        }));

    const embed = new EmbedBuilder()
        .setColor(0x8bcf7a)
        .setTitle(`🌱 TRỒNG CÂY — Ô ${slot}`)
        .setDescription(
            "Chọn hạt giống bạn muốn gieo."
        );

    const select = new StringSelectMenuBuilder()
        .setCustomId(`farm_seed_select_${slot}`)
        .setPlaceholder("🌱 Chọn hạt giống...")
        .addOptions(options);

    const row = new ActionRowBuilder()
        .addComponents(select);

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`farm_plot_${slot}`)
                .setLabel("Quay lại")
                .setEmoji("↩️")
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [row, backRow]
    };
}

module.exports = {
    createEmptyPlotUI,
    createSeedSelectUI,
    createGrowingPlantUI
};