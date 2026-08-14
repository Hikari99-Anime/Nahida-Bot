const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const User = require("../database/models/User");
const Farm = require("../services/farmService");
const Plant = require("../services/plantService");
const Gene = require("../services/geneService");
const Breeding = require("../services/breedingService");

const {
    addExp
} = require("../services/expService");

const {
    createEmptyPlotUI,
    createSeedSelectUI
} = require("../utils/farmUI");


/*
==================================================
NAHIDAFARM EMBED THEME
==================================================
*/

const COLORS = {
    primary: 0x8bcf7a,
    green: 0x7fcf82,
    purple: 0x9b8cff,
    gold: 0xf6d365,
    danger: 0xe74c3c,
    muted: 0x6f8f72
};

const FOOTERS = {
    farm: "NahidaFarm • Nhật ký khu vườn",
    plant: "NahidaFarm • Nhật ký khu vườn",
    gene: "NahidaFarm • Phòng thí nghiệm Gene",
    breeding: "NahidaFarm • Khu lai giống",
    collection: "NahidaFarm • Bộ sưu tập cá thể"
};


/*
==================================================
COMMON EMBED HELPERS
==================================================
*/

function createBaseEmbed(color = COLORS.primary) {

    return new EmbedBuilder()
        .setColor(color)
        .setFooter({
            text: FOOTERS.farm
        })
        .setTimestamp();
}


function addUserHeader(
    embed,
    interaction
) {

    return embed.setAuthor({
        name: `${interaction.user.username} • NahidaFarm`,
        iconURL: interaction.user.displayAvatarURL({
            extension: "png",
            size: 64
        })
    });
}


function createSuccessEmbed(
    title,
    description,
    interaction,
    color = COLORS.primary
) {

    const embed =
        createBaseEmbed(color)
            .setTitle(title)
            .setDescription(description);

    if (interaction) {
        addUserHeader(
            embed,
            interaction
        );
    }

    return embed;
}


function createErrorEmbed(
    title,
    description
) {

    return new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle(title)
        .setDescription(description)
        .setFooter({
            text: FOOTERS.farm
        })
        .setTimestamp();
}


/*
==================================================
PLANT UI
==================================================
*/

function createPlantRarity(rarity) {

    const value = Math.max(
        1,
        Math.min(
            5,
            Number(rarity) || 1
        )
    );

    return (
        "★".repeat(value) +
        "☆".repeat(5 - value)
    );
}


function formatPlantId(id) {
    return `#${String(id).padStart(4, "0")}`;
}


function getUserPlant(userId, plantId) {

    const numericId = Number(plantId);

    if (
        !Number.isInteger(numericId) ||
        numericId <= 0
    ) {
        return null;
    }

    const plant =
        Plant.getPlant(numericId);

    if (!plant) {
        return null;
    }

    if (
        String(plant.user_id) !==
        String(userId)
    ) {
        return null;
    }

    return plant;
}


/*
==================================================
PLANT DETAIL EMBED
==================================================
*/

function createPlantDetailEmbed(
    plant,
    slot
) {

    if (!plant) {
        return null;
    }

    const info =
        Plant.getPlantDisplayInfo(
            plant.id
        );

    if (!info) {
        return null;
    }

    const rarity =
        createPlantRarity(
            info.rarity
        );

    const progressBar =
        Plant.createProgressBar(
            info.progress,
            16
        );

    let growthText;

    if (info.ready) {

        growthText =
            "✨ **Cây đã trưởng thành!**\n" +
            "Sẵn sàng để thu hoạch.";

    } else {

        const totalSeconds =
            Math.max(
                0,
                Math.ceil(
                    info.remaining / 1000
                )
            );

        const minutes =
            Math.floor(
                totalSeconds / 60
            );

        const seconds =
            totalSeconds % 60;

        growthText =
            `⏳ **Đang phát triển**\n` +
            `${progressBar} **${info.progress}%**\n` +
            `Còn khoảng **${minutes}m ${seconds}s**`;
    }

    const embed =
        new EmbedBuilder()
            .setColor(
                info.ready
                    ? COLORS.gold
                    : COLORS.primary
            )
            .setAuthor({
                name: "NahidaFarm • Nhật ký khu vườn"
            })
            .setTitle(
                `${info.emoji} ${info.name} ${info.displayId}`
            )
            .setDescription(
                [
                    `🪴 **Ô đất** · \`${slot}\``,
                    `🆔 **Cá thể** · \`${info.displayId}\``,
                    `🌱 **Thế hệ** · ${info.generation}`,
                    `⭐ **Độ hiếm** · ${rarity}`,
                    "",
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    `❤️ **Sức sống** · ${info.vitality}`,
                    `⚡ **Sinh trưởng** · ${info.growth}`,
                    `⭐ **Chất lượng** · ${info.quality}`,
                    `🍀 **May mắn** · +${info.luck}`,
                    "",
                    `💧 **Đã tưới** · ${
                        info.watered
                            ? "Đã tưới"
                            : "Chưa tưới"
                    }`,
                    "",
                    growthText
                ].join("\n")
            )
            .setFooter({
                text: FOOTERS.plant
            })
            .setTimestamp();

    return embed;
}


/*
==================================================
PLANT BUTTONS
==================================================
*/

function createPlantButtons(
    plant,
    slot
) {

    if (!plant) {
        return new ActionRowBuilder();
    }

    const info =
        Plant.getPlantDisplayInfo(
            plant.id
        );

    if (!info) {
        return new ActionRowBuilder();
    }

    const row =
        new ActionRowBuilder();

    if (info.ready) {

        row.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `farm_harvest_${slot}`
                )
                .setLabel("Thu hoạch")
                .setEmoji("🌾")
                .setStyle(
                    ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    `plant_info_${info.id}`
                )
                .setLabel("Chi tiết")
                .setEmoji("🌱")
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    `plant_genes_${info.id}`
                )
                .setLabel("Khám phá Gen")
                .setEmoji("🧬")
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    `breed_select_${info.id}`
                )
                .setLabel("Lai giống")
                .setEmoji("💕")
                .setStyle(
                    ButtonStyle.Success
                )
        );

    } else {

        if (!info.watered) {

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `farm_water_${slot}`
                    )
                    .setLabel("Tưới cây")
                    .setEmoji("💧")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );
        }

        row.addComponents(

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
                    `plant_info_${info.id}`
                )
                .setLabel("Chi tiết")
                .setEmoji("🌱")
                .setStyle(
                    ButtonStyle.Primary
                )
        );
    }

    row.addComponents(

        new ButtonBuilder()
            .setCustomId(
                "farm_back"
            )
            .setLabel("Khu vườn")
            .setEmoji("↩️")
            .setStyle(
                ButtonStyle.Secondary
            )
    );

    return row;
}


/*
==================================================
SHOW PLANT DETAIL
==================================================
*/

async function showPlantDetail(
    interaction,
    plant,
    slot
) {

    const embed =
        createPlantDetailEmbed(
            plant,
            slot
        );

    if (!embed) {

        await interaction.reply({
            embeds: [
                createErrorEmbed(
                    "❌ KHÔNG THỂ HIỂN THỊ CÂY",
                    "Không thể lấy thông tin cá thể cây."
                )
            ],
            ephemeral: true
        });

        return;
    }

    const buttons =
        createPlantButtons(
            plant,
            slot
        );

    await interaction.update({
        content: null,
        embeds: [embed],
        components: [buttons]
    });
}


/*
==================================================
SHOW FARM
==================================================
*/

async function showFarm(
    interaction
) {

    const userId =
        interaction.user.id;

    const farm =
        Farm.getFarm(userId);

    const plots =
        Farm.getPlots(userId);

    if (!farm) {

        await interaction.reply({
            embeds: [
                createErrorEmbed(
                    "❌ KHÔNG TÌM THẤY KHU VƯỜN",
                    "Dữ liệu khu vườn của bạn không tồn tại."
                )
            ],
            ephemeral: true
        });

        return;
    }

    const safePlots =
        Array.isArray(plots)
            ? plots
            : [];

    const need =
        Farm.getRequiredFarmExp(
            farm.level
        );

    const lines =
        safePlots.map(plot => {

            if (!plot.plant_id) {
                return `🟫 **Ô ${plot.slot}** · Trống`;
            }

            const plant =
                getUserPlant(
                    userId,
                    plot.plant_id
                );

            if (!plant) {
                return `🟫 **Ô ${plot.slot}** · Trống`;
            }

            return (
                `${plant.emoji} **Ô ${plot.slot}** · ` +
                `${plant.name} ` +
                `\`${formatPlantId(plant.id)}\``
            );
        });

    const plotDescription =
        lines.length > 0
            ? lines.join("\n")
            : "🟫 Khu vườn chưa có ô đất.";

    const embed =
        new EmbedBuilder()
            .setColor(COLORS.primary)
            .setAuthor({
                name:
                    `${interaction.user.username} • NahidaFarm`,
                iconURL:
                    interaction.user.displayAvatarURL({
                        extension: "png",
                        size: 64
                    })
            })
            .setTitle("🌱 KHU VƯỜN")
            .setDescription(
                [
                    "Nơi những hạt giống nhỏ lớn lên cùng bạn 🌿",
                    "",
                    `🌾 **Farm Lv.** ${farm.level}`,
                    `✦ **EXP** \`${farm.exp} / ${need}\``,
                    `🪴 **Ô đất** \`${farm.plot_count}\``,
                    "",
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    plotDescription
                ].join("\n")
            )
            .setFooter({
                text: FOOTERS.farm
            })
            .setTimestamp();

    const rows = [];

    let row =
        new ActionRowBuilder();

    for (const plot of safePlots) {

        row.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `farm_plot_${plot.slot}`
                )
                .setLabel(
                    `Ô ${plot.slot}`
                )
                .setEmoji(
                    plot.plant_id
                        ? "🌱"
                        : "🟫"
                )
                .setStyle(
                    plot.plant_id
                        ? ButtonStyle.Success
                        : ButtonStyle.Secondary
                )
        );

        if (
            row.components.length >= 5
        ) {

            rows.push(row);

            row =
                new ActionRowBuilder();
        }
    }

    if (
        row.components.length > 0
    ) {
        rows.push(row);
    }

    await interaction.update({
        content: null,
        embeds: [embed],
        components: rows.slice(0, 5)
    });
}


/*
==================================================
GENE DISCOVERY
==================================================
*/

async function showGeneDiscoveryConfirm(
    interaction,
    plant
) {

    const info =
        Plant.getPlantDisplayInfo(
            plant.id
        );

    if (!info) {

        await interaction.reply({
            embeds: [
                createErrorEmbed(
                    "❌ KHÔNG THỂ LẤY THÔNG TIN",
                    "Không thể lấy thông tin cây."
                )
            ],
            ephemeral: true
        });

        return;
    }

    const genes =
        Gene.getPlantGenes(
            plant.id
        );

    if (
        !Array.isArray(genes) ||
        genes.length === 0
    ) {

        await interaction.reply({
            embeds: [
                createErrorEmbed(
                    "⚠️ CHƯA CÓ DỮ LIỆU GENE",
                    "Cá thể này chưa có dữ liệu Gene."
                )
            ],
            ephemeral: true
        });

        return;
    }

    const discovered =
        Gene.areGenesDiscovered(
            plant.id
        );

    if (discovered) {

        await showPlantGenes(
            interaction,
            plant
        );

        return;
    }

    const embed =
        new EmbedBuilder()
            .setColor(COLORS.purple)
            .setAuthor({
                name: "NahidaFarm • Phòng thí nghiệm Gene"
            })
            .setTitle("🧬 KHÁM PHÁ GEN")
            .setDescription(
                [
                    `${info.emoji} **${info.name} ${info.displayId}**`,
                    "",
                    `Cá thể này sở hữu **${genes.length} Gene**`,
                    "nhưng thông tin Gene vẫn chưa được khám phá.",
                    "",
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    "🔬 **Sau khi khám phá**",
                    "",
                    "• 🧬 Loại Gene",
                    "• 📊 Giá trị Gene",
                    "• 👑 Gen trội / 🌑 Gen lặn",
                    "• 🧪 Mutation",
                    "",
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    "⚠️ **Bạn có muốn khám phá Gene không?**"
                ].join("\n")
            )
            .setFooter({
                text:
                    "Gene được tạo ngay khi cá thể được sinh ra."
            })
            .setTimestamp();

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `plant_genes_discover_${info.id}`
                    )
                    .setLabel("Khám phá")
                    .setEmoji("🧬")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `plant_info_${info.id}`
                    )
                    .setLabel("Quay lại")
                    .setEmoji("↩️")
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

    await interaction.update({
        content: null,
        embeds: [embed],
        components: [row]
    });
}


async function showPlantGenes(
    interaction,
    plant,
    discoveryResult = null
) {

    const info =
        Plant.getPlantDisplayInfo(
            plant.id
        );

    if (!info) {

        await interaction.reply({
            embeds: [
                createErrorEmbed(
                    "❌ KHÔNG THỂ LẤY THÔNG TIN",
                    "Không thể lấy thông tin cây."
                )
            ],
            ephemeral: true
        });

        return;
    }

    const genes =
        Gene.getPlantGenes(
            plant.id
        );

    if (
        !Array.isArray(genes) ||
        genes.length === 0
    ) {

        await interaction.reply({
            embeds: [
                createErrorEmbed(
                    "⚠️ CHƯA CÓ DỮ LIỆU GENE",
                    "Cá thể này chưa có dữ liệu Gene."
                )
            ],
            ephemeral: true
        });

        return;
    }

    const summary =
        Gene.getGeneSummary(
            plant.id
        );

    const geneLines =
        genes.map(
            (gene, index) => {

                const number =
                    index + 1;

                const effectiveValue =
                    Gene.getEffectiveGeneValue(
                        gene
                    );

                return (
                    `**${number}. ${Gene.formatGeneType(
                        gene.gene_type
                    )}**\n` +

                    `🧬 **${gene.gene_name}** · ` +
                    `\`${gene.gene_code}\`\n` +

                    `📊 Giá trị · **+${gene.gene_value}**\n` +

                    `⚡ Hiệu lực · **+${effectiveValue}**\n` +

                    `${Gene.formatDominance(
                        gene.dominance
                    )}` +

                    (
                        gene.mutation
                            ? `\n🧪 **MUTATION**`
                            : ""
                    )
                );
            }
        );

    const mutationText =
        summary.mutations > 0
            ? `🧪 **Mutation** · ${summary.mutations}`
            : "🧪 **Mutation** · Không có";

    let discoveryText = "";

    if (
        discoveryResult &&
        !discoveryResult.alreadyDiscovered
    ) {

        discoveryText =
            `\n✨ **Đã khám phá ${discoveryResult.count} Gene!**\n`;
    }

    const embed =
        new EmbedBuilder()
            .setColor(COLORS.purple)
            .setAuthor({
                name: "NahidaFarm • Phòng thí nghiệm Gene"
            })
            .setTitle(
                `🧬 GEN · ${info.emoji} ${info.name} ${info.displayId}`
            )
            .setDescription(
                [
                    `🆔 **Cá thể** · ${info.displayId}`,
                    `🌱 **Thế hệ** · ${info.generation}`,
                    `🔬 **Trạng thái** · Đã khám phá`,
                    discoveryText,
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    geneLines.join("\n\n"),
                    "",
                    "━━━━━━━━━━━━━━━━━━",
                    "",
                    `📊 **Tổng Gene** · ${summary.total}`,
                    `👑 **Gen trội** · ${summary.dominant}`,
                    `🌑 **Gen lặn** · ${summary.recessive}`,
                    mutationText
                ].join("\n")
            )
            .setFooter({
                text:
                    "Gene của cá thể được xác định khi cây được tạo."
            })
            .setTimestamp();

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `plant_info_${info.id}`
                    )
                    .setLabel("Chi tiết cây")
                    .setEmoji("🌱")
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `plant_genes_back_${info.id}`
                    )
                    .setLabel("Quay lại cây")
                    .setEmoji("↩️")
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

    await interaction.update({
        content: null,
        embeds: [embed],
        components: [row]
    });
}


/*
==================================================
BREEDING
==================================================
*/

function createBreedingPlantOption(
    plant
) {

    const displayId =
        formatPlantId(
            plant.id
        );

    return {

        label:
            `${plant.name || "Cây"} ${displayId}`
                .slice(0, 100),

        value:
            String(plant.id),

        description:
            (
                `Gen ${plant.generation || 1} • ` +
                `Quality ${plant.quality || 0}`
            ).slice(0, 100),

        emoji:
            plant.emoji || "🌱"
    };
}


/*
==================================================
SHOW BREEDING SELECT
==================================================
*/

async function showBreedingSelect(
    interaction,
    parent1
) {

    try {

        const userId =
            interaction.user.id;

        const plants =
            Plant.getUserPlants(
                userId
            );

        console.log(
            "[BREED] User plants:",
            plants
        );

        if (!Array.isArray(plants)) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ KHÔNG THỂ LẤY DANH SÁCH",
                        "Không thể lấy danh sách cây."
                    )
                ],
                ephemeral: true
            });

            return;
        }

        if (plants.length < 2) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ CHƯA ĐỦ CÂY",
                        "Bạn cần ít nhất **2 cây** để lai giống."
                    )
                ],
                ephemeral: true
            });

            return;
        }

        const candidates =
            plants.filter(
                plant =>
                    Number(plant.id) !==
                    Number(parent1.id)
            );

        if (candidates.length === 0) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ KHÔNG CÓ CÂY THỨ HAI",
                        "Không có cây khác để lai với cây này."
                    )
                ],
                ephemeral: true
            });

            return;
        }

        const options =
            candidates
                .slice(0, 25)
                .map(
                    createBreedingPlantOption
                );

        console.log(
            "[BREED] Options:",
            options
        );

        if (options.length === 0) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ KHÔNG TẠO ĐƯỢC DANH SÁCH",
                        "Không thể tạo danh sách cây để lai."
                    )
                ],
                ephemeral: true
            });

            return;
        }

        const menu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    `breed_parent2_${parent1.id}`
                )
                .setPlaceholder(
                    "🌱 Chọn cây thứ hai..."
                )
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options);

        const selectRow =
            new ActionRowBuilder()
                .addComponents(menu);

        const embed =
            new EmbedBuilder()
                .setColor(COLORS.purple)
                .setAuthor({
                    name: "NahidaFarm • Khu lai giống"
                })
                .setTitle("💕 LAI GIỐNG")
                .setDescription(
                    [
                        "Chọn hai cá thể để tạo ra một thế hệ mới.",
                        "",
                        "### 🌱 Cây thứ nhất",
                        "",
                        `${parent1.emoji || "🌱"} **${parent1.name || "Cây"} ${formatPlantId(parent1.id)}**`,
                        "",
                        `🌱 Thế hệ · **${parent1.generation || 1}**`,
                        `❤️ Sức sống · **${parent1.vitality || 0}**`,
                        `⚡ Sinh trưởng · **${parent1.growth || 0}**`,
                        `⭐ Chất lượng · **${parent1.quality || 0}**`,
                        `🍀 May mắn · **+${parent1.luck || 0}**`,
                        "",
                        "━━━━━━━━━━━━━━━━━━",
                        "",
                        "### 🌿 Cây thứ hai",
                        "",
                        "Chọn cá thể muốn lai với cây trên.",
                        "",
                        `📋 Có **${candidates.length}** cây có thể lựa chọn.`
                    ].join("\n")
                )
                .setFooter({
                    text:
                        "Hai cây bố mẹ vẫn được giữ lại sau khi lai."
                })
                .setTimestamp();

        const backRow =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `plant_info_${parent1.id}`
                        )
                        .setLabel("Quay lại cây")
                        .setEmoji("↩️")
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

        await interaction.update({
            content: null,
            embeds: [embed],
            components: [
                selectRow,
                backRow
            ]
        });

    } catch (error) {

        console.error(
            "[BREED SELECT UI ERROR]",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ LAI GIỐNG",
                        error.message
                    )
                ],
                ephemeral: true
            });
        }
    }
}


/*
==================================================
BREEDING CONFIRM
==================================================
*/

async function showBreedingConfirm(
    interaction,
    parent1,
    parent2
) {

    try {

        const check =
            Breeding.canBreed(
                interaction.user.id,
                parent1.id,
                parent2.id
            );

        if (!check.canBreed) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ KHÔNG THỂ LAI GIỐNG",
                        check.reason
                    )
                ],
                ephemeral: true
            });

            return;
        }

        const parent1Id =
            formatPlantId(
                parent1.id
            );

        const parent2Id =
            formatPlantId(
                parent2.id
            );

        const nextGeneration =
            Breeding.getChildGeneration(
                parent1,
                parent2
            );

        const embed =
            new EmbedBuilder()
                .setColor(COLORS.purple)
                .setAuthor({
                    name: "NahidaFarm • Khu lai giống"
                })
                .setTitle(
                    "🧬 XÁC NHẬN LAI GIỐNG"
                )
                .setDescription(
                    [
                        "Kiểm tra thông tin trước khi tạo cây con.",
                        "",
                        "### 🌱 Cây thứ nhất",
                        "",
                        `${parent1.emoji || "🌱"} **${parent1.name} ${parent1Id}**`,
                        `🌱 Thế hệ · **${parent1.generation || 1}**`,
                        `❤️ Sức sống · **${parent1.vitality}**`,
                        `⚡ Sinh trưởng · **${parent1.growth}**`,
                        `⭐ Chất lượng · **${parent1.quality}**`,
                        `🍀 May mắn · **+${parent1.luck}**`,
                        "",
                        "### 🌿 Cây thứ hai",
                        "",
                        `${parent2.emoji || "🌱"} **${parent2.name} ${parent2Id}**`,
                        `🌱 Thế hệ · **${parent2.generation || 1}**`,
                        `❤️ Sức sống · **${parent2.vitality}**`,
                        `⚡ Sinh trưởng · **${parent2.growth}**`,
                        `⭐ Chất lượng · **${parent2.quality}**`,
                        `🍀 May mắn · **+${parent2.luck}**`,
                        "",
                        "━━━━━━━━━━━━━━━━━━",
                        "",
                        "### 🌱 Cây con dự kiến",
                        "",
                        `🌱 Thế hệ · **${nextGeneration}**`,
                        "🧬 Gene được kế thừa từ cả hai cây",
                        "🧪 Có thể xuất hiện Mutation",
                        "",
                        "⚠️ Hai cây bố mẹ **không bị xóa** sau khi lai."
                    ].join("\n")
                )
                .setFooter({
                    text:
                        "Hãy kiểm tra kỹ hai cá thể trước khi xác nhận."
                })
                .setTimestamp();

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `breed_confirm_${parent1.id}_${parent2.id}`
                        )
                        .setLabel("Xác nhận lai")
                        .setEmoji("💕")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `breed_select_${parent1.id}`
                        )
                        .setLabel("Chọn lại")
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

        await interaction.update({
            content: null,
            embeds: [embed],
            components: [row]
        });

    } catch (error) {

        console.error(
            "Breeding confirm error:",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "❌ LAI GIỐNG",
                        error.message
                    )
                ],
                ephemeral: true
            });
        }
    }
}


/*
==================================================
SHOW BREEDING RESULT
==================================================
*/

function createBreedingResultEmbed(
    interaction,
    result
) {

    const {
        parent1,
        parent2,
        child,
        genes,
        generation
    } = result;

    const geneLines =
        Array.isArray(genes)
            ? genes.map(
                (gene, index) => {

                    const effective =
                        Gene.getEffectiveGeneValue(
                            gene
                        );

                    return (
                        `**${index + 1}. ${Gene.formatGeneType(
                            gene.gene_type
                        )}**\n` +

                        `🧬 **${gene.gene_name}** ` +
                        `\`${gene.gene_code}\`\n` +

                        `📊 Giá trị · **+${gene.gene_value}**\n` +

                        `⚡ Hiệu lực · **+${effective}**\n` +

                        `${Gene.formatDominance(
                            gene.dominance
                        )}` +

                        (
                            gene.mutation
                                ? `\n🧪 **MUTATION**`
                                : ""
                        )
                    );
                }
            )
            : [];

    return new EmbedBuilder()
        .setColor(COLORS.purple)
        .setAuthor({
            name:
                `${interaction.user.username} • NahidaFarm`
        })
        .setTitle(
            "✨ LAI GIỐNG THÀNH CÔNG"
        )
        .setDescription(
            [
                "Một thế hệ mới vừa được tạo ra! 🌱",
                "",
                "### 🌿 Cây bố",
                `${parent1.emoji || "🌱"} **${parent1.name}** \`${formatPlantId(parent1.id)}\``,
                "",
                "### 🌿 Cây mẹ",
                `${parent2.emoji || "🌱"} **${parent2.name}** \`${formatPlantId(parent2.id)}\``,
                "",
                "━━━━━━━━━━━━━━━━━━",
                "",
                "### 🌱 CÂY CON",
                "",
                `${child.emoji || "🌱"} **${child.name}**`,
                `🆔 Cá thể · \`${formatPlantId(child.id)}\``,
                `🧬 Thế hệ · **${generation}**`,
                "",
                "━━━━━━━━━━━━━━━━━━",
                "",
                "### 🧬 GENE CÂY CON",
                "",
                geneLines.length > 0
                    ? geneLines.join("\n\n")
                    : "⚠️ Không có dữ liệu Gene."
            ].join("\n")
        )
        .setFooter({
            text:
                "Gene của cây con được kế thừa từ bố và mẹ."
        })
        .setTimestamp();
}


/*
==================================================
INVENTORY UI
==================================================
*/

function inventoryFormatId(id) {
    return `#${String(id).padStart(4, "0")}`;
}


function inventoryRarity(rarity) {

    const value =
        Math.max(
            1,
            Math.min(
                5,
                Number(rarity) || 1
            )
        );

    return (
        "★".repeat(value) +
        "☆".repeat(5 - value)
    );
}


/*
==================================================
INVENTORY - SPECIES LIST
==================================================
*/

function createInventorySpeciesEmbed(
    interaction,
    plants
) {

    const grouped =
        new Map();

    for (const plant of plants) {

        const key =
            plant.species_id ??
            plant.speciesId ??
            plant.name;

        if (!grouped.has(key)) {
            grouped.set(key, []);
        }

        grouped.get(key).push(plant);
    }

    const species =
        [...grouped.values()]
            .map(list => {

                list.sort(
                    (a, b) => {

                        const scoreA =
                            Number(a.quality || 0) +
                            Number(a.growth || 0) +
                            Number(a.vitality || 0) +
                            Number(a.luck || 0);

                        const scoreB =
                            Number(b.quality || 0) +
                            Number(b.growth || 0) +
                            Number(b.vitality || 0) +
                            Number(b.luck || 0);

                        return scoreB - scoreA;
                    }
                );

                return list;
            });

    let description =
        `🌿 **${species.length} giống cây** · ` +
        `🌱 **${plants.length} cá thể**\n\n`;

    if (species.length === 0) {

        description +=
            "╰・🌱 Khu vườn của bạn vẫn còn trống.\n" +
            "   Hãy trồng cây để bắt đầu bộ sưu tập.";

    } else {

        description +=
            species
                .map(list => {

                    const plant =
                        list[0];

                    return (
                        `${plant.emoji || "🌱"} ` +
                        `**${plant.name || "Cây chưa đặt tên"}** ` +
                        `\`×${list.length}\``
                    );
                })
                .join("\n");
    }

    return new EmbedBuilder()
        .setColor(COLORS.primary)
        .setAuthor({
            name:
                `${interaction.user.username} • NahidaFarm`,
            iconURL:
                interaction.user.displayAvatarURL({
                    extension: "png",
                    size: 64
                })
        })
        .setTitle("🌿 KHO CÂY")
        .setDescription(
            description
        )
        .setFooter({
            text:
                "Chọn một giống cây bên dưới để xem các cá thể."
        })
        .setTimestamp();
}


/*
==================================================
INVENTORY UI
==================================================
*/

function createInventorySpeciesUI(
    interaction,
    plants
) {

    const grouped =
        new Map();

    for (const plant of plants) {

        const key =
            plant.species_id ??
            plant.speciesId ??
            plant.name;

        if (!grouped.has(key)) {
            grouped.set(key, []);
        }

        grouped.get(key).push(plant);
    }

    const species =
        [...grouped.entries()];

    const embed =
        createInventorySpeciesEmbed(
            interaction,
            plants
        );

    if (species.length === 0) {
        return {
            embeds: [embed],
            components: []
        };
    }

    const options =
        species
            .slice(0, 25)
            .map(([speciesId, list]) => {

                const plant =
                    list[0];

                return {
                    label:
                        `${plant.name || "Cây"} ×${list.length}`
                            .slice(0, 100),

                    value:
                        String(speciesId),

                    description:
                        `${list.length} cá thể`
                            .slice(0, 100),

                    emoji:
                        plant.emoji || "🌱"
                };
            });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "inventory_species_select"
            )
            .setPlaceholder(
                "🌿 Chọn giống cây..."
            )
            .addOptions(options);

    const selectRow =
        new ActionRowBuilder()
            .addComponents(menu);

    return {
        embeds: [embed],
        components: [selectRow]
    };
}


function createInventoryIndividualUI(
    interaction,
    plants,
    speciesId,
    speciesName,
    page = 1
) {

    const embed =
        createInventoryIndividualsEmbed(
            interaction,
            plants,
            speciesName,
            page
        );

    const options =
        plants
            .slice(
                (page - 1) * 10,
                page * 10
            )
            .map(createInventoryPlantOption);

    const rows = [];

    if (options.length > 0) {

        const menu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    `inventory_plant_select_${speciesId}_${page}`
                )
                .setPlaceholder(
                    "🌱 Chọn cá thể..."
                )
                .addOptions(options);

        rows.push(
            new ActionRowBuilder()
                .addComponents(menu)
        );
    }

    const totalPages =
        Math.max(
            1,
            Math.ceil(plants.length / 10)
        );

    const navigation =
        new ActionRowBuilder();

    if (page > 1) {

        navigation.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `inventory_page_${speciesId}_${page - 1}`
                )
                .setLabel("Trang trước")
                .setEmoji("⬅️")
                .setStyle(
                    ButtonStyle.Secondary
                )
        );
    }

    navigation.addComponents(

        new ButtonBuilder()
            .setCustomId(
                "inventory_back"
            )
            .setLabel("Danh sách giống")
            .setEmoji("🌿")
            .setStyle(
                ButtonStyle.Secondary
            )
    );

    if (page < totalPages) {

        navigation.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `inventory_page_${speciesId}_${page + 1}`
                )
                .setLabel("Trang sau")
                .setEmoji("➡️")
                .setStyle(
                    ButtonStyle.Secondary
                )
        );
    }

    rows.push(navigation);

    return {
        embeds: [embed],
        components: rows
    };
}


function createInventoryPlantOption(
    plant
) {

    const score =
        Number(plant.quality || 0) +
        Number(plant.growth || 0) +
        Number(plant.vitality || 0) +
        Number(plant.luck || 0);

    return {

        label:
            `${plant.name || "Cây"} ${inventoryFormatId(plant.id)}`
                .slice(0, 100),

        value:
            String(plant.id),

        description:
            `Gen ${plant.generation || 1} • Điểm ${score}`
                .slice(0, 100),

        emoji:
            plant.emoji || "🌱"
    };
}


/*
==================================================
INVENTORY - INDIVIDUAL LIST
==================================================
*/

function createInventoryIndividualsEmbed(
    interaction,
    plants,
    speciesName,
    page = 1
) {

    const perPage = 10;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                plants.length /
                perPage
            )
        );

    page =
        Math.max(
            1,
            Math.min(
                page,
                totalPages
            )
        );

    const start =
        (page - 1) *
        perPage;

    const pagePlants =
        plants.slice(
            start,
            start + perPage
        );

    let description =
        `🌿 **${speciesName}**\n` +
        `\`${plants.length} cá thể\`\n\n`;

    description +=
        pagePlants
            .map(
                (plant, index) => {

                    const rarity =
                        inventoryRarity(
                            plant.rarity
                        );

                    const score =
                        Number(plant.quality || 0) +
                        Number(plant.growth || 0) +
                        Number(plant.vitality || 0) +
                        Number(plant.luck || 0);

                    return (

                        `**${index + 1}.** ` +
                        `${plant.emoji || "🌱"} ` +
                        `**${inventoryFormatId(plant.id)}** ` +
                        `· Gen.${plant.generation || 1} ` +
                        `· ✦${score}\n` +

                        `   ❤️ ${plant.vitality || 0}  ` +
                        `⚡ ${plant.growth || 0}  ` +
                        `⭐ ${plant.quality || 0}  ` +
                        `🍀 +${plant.luck || 0}  ` +
                        `${rarity}`
                    );
                }
            )
            .join("\n\n");

    return new EmbedBuilder()
        .setColor(COLORS.primary)
        .setAuthor({
            name:
                `${interaction.user.username} • NahidaFarm`
        })
        .setTitle(
            `🌱 ${speciesName}`
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                `Trang ${page}/${totalPages} • ` +
                `Cá thể được ưu tiên theo chỉ số.`
        })
        .setTimestamp();
}


/*
==================================================
INVENTORY - INDIVIDUAL DETAIL
==================================================
*/

function createInventoryIndividualEmbed(
    plant
) {

    const rarity =
        inventoryRarity(
            plant.rarity
        );

    const score =
        Number(plant.quality || 0) +
        Number(plant.growth || 0) +
        Number(plant.vitality || 0) +
        Number(plant.luck || 0);

    return new EmbedBuilder()
        .setColor(COLORS.primary)
        .setAuthor({
            name:
                "NahidaFarm • Bộ sưu tập cá thể"
        })
        .setTitle(
            `${plant.emoji || "🌱"} ` +
            `${plant.name || "Cây"} ` +
            `${inventoryFormatId(plant.id)}`
        )
        .setDescription(
            [
                "> *“Mỗi hạt giống đều mang trong mình một giấc mơ nhỏ.”*",
                "> — Nahida",
                "",
                "━━━━━━━━━━━━━━━━━━",
                "",
                `🌱 **Thế hệ** · ${plant.generation || 1}`,
                `⭐ **Độ hiếm** · ${rarity}`,
                `✦ **Điểm tổng** · ${score}`,
                "",
                "### 📊 Chỉ số cá thể",
                "",
                `❤️ **Sức sống** · ${plant.vitality || 0}`,
                `⚡ **Sinh trưởng** · ${plant.growth || 0}`,
                `⭐ **Chất lượng** · ${plant.quality || 0}`,
                `🍀 **May mắn** · +${plant.luck || 0}`,
                "",
                `📦 **Trạng thái** · Cá thể trong bộ sưu tập`
            ].join("\n")
        )
        .setFooter({
            text:
                FOOTERS.collection
        })
        .setTimestamp();
}


/*
==================================================
INTERACTION CREATE
==================================================
*/

module.exports = {

    name:
        Events.InteractionCreate,

    async execute(
        interaction,
        client
    ) {

        /*
        ==========================================
        DEBUG INTERACTION
        ==========================================
        */

        if (
            interaction.isButton() ||
            interaction.isStringSelectMenu()
        ) {

            console.log(
                "[INTERACTION]",
                {
                    type:
                        interaction.isButton()
                            ? "BUTTON"
                            : "SELECT_MENU",

                    customId:
                        interaction.customId,

                    values:
                        interaction.isStringSelectMenu()
                            ? interaction.values
                            : undefined,

                    user:
                        interaction.user.id
                }
            );
        }


        /*
        ==========================================
        AUTOCOMPLETE
        ==========================================
        */

        if (interaction.isAutocomplete()) {

            const command =
                client.commands.get(
                    interaction.commandName
                );

            if (
                command &&
                typeof command.autocomplete ===
                "function"
            ) {

                try {

                    await command.autocomplete(
                        interaction
                    );

                } catch (error) {

                    console.error(
                        "Autocomplete error:",
                        error
                    );
                }
            }

            return;
        }


        /*
        ==========================================
        BUTTON
        ==========================================
        */

        if (interaction.isButton()) {

            const customId =
                interaction.customId;


            /*
            ======================================
            BREED - SELECT FIRST PARENT
            ======================================
            */

            if (
                customId.startsWith(
                    "breed_select_"
                )
            ) {

                const parent1Id =
                    Number(
                        customId.replace(
                            "breed_select_",
                            ""
                        )
                    );

                const parent1 =
                    getUserPlant(
                        interaction.user.id,
                        parent1Id
                    );

                if (!parent1) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÂY",
                                "Không tìm thấy cây bố."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                await showBreedingSelect(
                    interaction,
                    parent1
                );

                return;
            }


            /*
            ======================================
            BREED - CONFIRM
            ======================================
            */

            if (
                customId.startsWith(
                    "breed_confirm_"
                )
            ) {

                const parts =
                    customId.split("_");

                const parent1Id =
                    Number(parts[2]);

                const parent2Id =
                    Number(parts[3]);

                const parent1 =
                    getUserPlant(
                        interaction.user.id,
                        parent1Id
                    );

                const parent2 =
                    getUserPlant(
                        interaction.user.id,
                        parent2Id
                    );

                if (
                    !parent1 ||
                    !parent2
                ) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÂY",
                                "Không tìm thấy một trong hai cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                try {

                    await interaction.deferUpdate();

                    const result =
                        Breeding.breed(
                            interaction.user.id,
                            parent1Id,
                            parent2Id
                        );

                    const embed =
                        createBreedingResultEmbed(
                            interaction,
                            result
                        );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        `plant_info_${result.child.id}`
                                    )
                                    .setLabel(
                                        "Xem cây con"
                                    )
                                    .setEmoji("🌱")
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "farm_back"
                                    )
                                    .setLabel(
                                        "Khu vườn"
                                    )
                                    .setEmoji("🌱")
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                            );

                    await interaction.editReply({
                        content: null,
                        embeds: [embed],
                        components: [row]
                    });

                } catch (error) {

                    console.error(
                        "BREED ERROR:",
                        error
                    );

                    const errorEmbed =
                        createErrorEmbed(
                            "❌ LAI GIỐNG THẤT BẠI",
                            error.message ||
                            "Đã xảy ra lỗi khi lai giống."
                        );

                    if (
                        interaction.deferred ||
                        interaction.replied
                    ) {

                        await interaction.editReply({
                            content: null,
                            embeds: [errorEmbed],
                            components: []
                        });

                    } else {

                        await interaction.reply({
                            content: null,
                            embeds: [errorEmbed],
                            ephemeral: true
                        });
                    }
                }

                return;
            }


            /*
            ======================================
            PLANT INFO BACK
            ======================================
            */

            if (
                customId.startsWith(
                    "plant_info_back_"
                )
            ) {

                const plantId =
                    Number(
                        customId.replace(
                            "plant_info_back_",
                            ""
                        )
                    );

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plantId
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÂY",
                                "Không tìm thấy cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const plots =
                    Farm.getPlots(
                        interaction.user.id
                    );

                const plot =
                    plots.find(
                        p =>
                            Number(p.plant_id) ===
                            Number(plant.id)
                    );

                if (!plot) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "⚠️ CÂY KHÔNG Ở TRÊN ĐẤT",
                                "Cá thể cây này hiện không nằm trên ô đất."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                await showPlantDetail(
                    interaction,
                    plant,
                    plot.slot
                );

                return;
            }


            /*
            ======================================
            PLANT GENES BACK
            ======================================
            */

            if (
                customId.startsWith(
                    "plant_genes_back_"
                )
            ) {

                const plantId =
                    Number(
                        customId.replace(
                            "plant_genes_back_",
                            ""
                        )
                    );

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plantId
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÂY",
                                "Không tìm thấy cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const plots =
                    Farm.getPlots(
                        interaction.user.id
                    );

                const plot =
                    plots.find(
                        p =>
                            Number(p.plant_id) ===
                            Number(plant.id)
                    );

                if (!plot) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "⚠️ CÂY KHÔNG Ở TRÊN ĐẤT",
                                "Cá thể cây này hiện không nằm trên ô đất."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                await showPlantDetail(
                    interaction,
                    plant,
                    plot.slot
                );

                return;
            }


            /*
            ======================================
            DISCOVER GEN
            ======================================
            */

            if (
                customId.startsWith(
                    "plant_genes_discover_"
                )
            ) {

                const plantId =
                    Number(
                        customId.replace(
                            "plant_genes_discover_",
                            ""
                        )
                    );

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plantId
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÁ THỂ",
                                "Không tìm thấy cá thể cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                try {

                    const result =
                        Gene.discoverPlantGenes(
                            plant.id
                        );

                    await showPlantGenes(
                        interaction,
                        plant,
                        result
                    );

                } catch (error) {

                    console.error(
                        "Discover genes error:",
                        error
                    );

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÁM PHÁ GENE THẤT BẠI",
                                error.message
                            )
                        ],
                        ephemeral: true
                    });
                }

                return;
            }


            /*
            ======================================
            PLANT GENES
            ======================================
            */

            if (
                customId.startsWith(
                    "plant_genes_"
                )
            ) {

                const plantId =
                    Number(
                        customId.replace(
                            "plant_genes_",
                            ""
                        )
                    );

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plantId
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÁ THỂ",
                                "Không tìm thấy cá thể cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                await showGeneDiscoveryConfirm(
                    interaction,
                    plant
                );

                return;
            }


            /*
            ======================================
            PLANT INFO
            ======================================
            */

            if (
                customId.startsWith(
                    "plant_info_"
                )
            ) {

                const plantId =
                    Number(
                        customId.replace(
                            "plant_info_",
                            ""
                        )
                    );

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plantId
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÁ THỂ",
                                "Không tìm thấy cá thể cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const info =
                    Plant.getPlantDisplayInfo(
                        plant.id
                    );

                if (!info) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG THỂ LẤY THÔNG TIN",
                                "Không thể lấy thông tin cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const rarity =
                    createPlantRarity(
                        info.rarity
                    );

                const discovered =
                    Gene.areGenesDiscovered(
                        info.id
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(COLORS.primary)
                        .setAuthor({
                            name:
                                "NahidaFarm • Nhật ký khu vườn"
                        })
                        .setTitle(
                            `${info.emoji} ${info.name} ${info.displayId}`
                        )
                        .setDescription(
                            [
                                "🌱 **THÔNG TIN CÁ THỂ**",
                                "",
                                `🆔 **ID** · ${info.displayId}`,
                                `🌱 **Thế hệ** · ${info.generation}`,
                                `⭐ **Độ hiếm** · ${rarity}`,
                                "",
                                "━━━━━━━━━━━━━━━━━━",
                                "",
                                `❤️ **Sức sống** · ${info.vitality}`,
                                `⚡ **Sinh trưởng** · ${info.growth}`,
                                `⭐ **Chất lượng** · ${info.quality}`,
                                `🍀 **May mắn** · +${info.luck}`,
                                "",
                                `💧 **Đã tưới** · ${
                                    info.watered
                                        ? "Đã tưới"
                                        : "Chưa tưới"
                                }`,
                                "",
                                `🧬 **Gene** · ${
                                    discovered
                                        ? "Đã khám phá"
                                        : "Chưa khám phá"
                                }`,
                                "",
                                "━━━━━━━━━━━━━━━━━━",
                                "",
                                `💰 **Giá bán** · ${info.sellPrice} Mora`
                            ].join("\n")
                        )
                        .setFooter({
                            text:
                                FOOTERS.plant
                        })
                        .setTimestamp();

                const row =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `plant_info_back_${info.id}`
                                )
                                .setLabel(
                                    "Quay lại cây"
                                )
                                .setEmoji("↩️")
                                .setStyle(
                                    ButtonStyle.Secondary
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `plant_genes_${info.id}`
                                )
                                .setLabel(
                                    discovered
                                        ? "Xem Gen"
                                        : "Khám phá Gen"
                                )
                                .setEmoji("🧬")
                                .setStyle(
                                    ButtonStyle.Primary
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `breed_select_${info.id}`
                                )
                                .setLabel(
                                    "Lai giống"
                                )
                                .setEmoji("💕")
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    "farm_back"
                                )
                                .setLabel(
                                    "Khu vườn"
                                )
                                .setEmoji("🌱")
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                await interaction.update({
                    content: null,
                    embeds: [embed],
                    components: [row]
                });

                return;
            }


            /*
            ======================================
            FARM PLOT
            ======================================
            */

            if (
                customId.startsWith(
                    "farm_plot_"
                )
            ) {

                const slot =
                    Number(
                        customId.replace(
                            "farm_plot_",
                            ""
                        )
                    );

                const plot =
                    Farm.getPlot(
                        interaction.user.id,
                        slot
                    );

                if (!plot) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY Ô ĐẤT",
                                "Ô đất này không tồn tại."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                if (
                    plot.unlocked === 0 ||
                    plot.unlocked === false
                ) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "🔒 Ô ĐẤT BỊ KHÓA",
                                "Ô đất này chưa được mở khóa."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                if (!plot.plant_id) {

                    const ui =
                        createEmptyPlotUI(
                            slot
                        );

                    await interaction.update(
                        ui
                    );

                    return;
                }

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plot.plant_id
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÂY",
                                "Không tìm thấy cá thể cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                await showPlantDetail(
                    interaction,
                    plant,
                    slot
                );

                return;
            }


            /*
            ======================================
            FARM PLANT
            ======================================
            */

            if (
                customId.startsWith(
                    "farm_plant_"
                )
            ) {

                const slot =
                    Number(
                        customId.replace(
                            "farm_plant_",
                            ""
                        )
                    );

                const plot =
                    Farm.getPlot(
                        interaction.user.id,
                        slot
                    );

                if (!plot) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY Ô ĐẤT",
                                "Ô đất này không tồn tại."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                if (
                    plot.unlocked === 0 ||
                    plot.unlocked === false
                ) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "🔒 Ô ĐẤT BỊ KHÓA",
                                "Ô đất này chưa được mở khóa."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                if (plot.plant_id) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "🌱 Ô ĐẤT ĐANG CÓ CÂY",
                                "Hãy chọn một ô đất trống để trồng cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const ui =
                    createSeedSelectUI(
                        slot
                    );

                await interaction.update(
                    ui
                );

                return;
            }


            /*
            ======================================
            FARM REFRESH
            ======================================
            */

            if (
                customId.startsWith(
                    "farm_refresh_"
                )
            ) {

                const slot =
                    Number(
                        customId.replace(
                            "farm_refresh_",
                            ""
                        )
                    );

                const plot =
                    Farm.getPlot(
                        interaction.user.id,
                        slot
                    );

                if (
                    !plot ||
                    !plot.plant_id
                ) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ Ô ĐẤT TRỐNG",
                                "Ô đất này không có cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const plant =
                    getUserPlant(
                        interaction.user.id,
                        plot.plant_id
                    );

                if (!plant) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ KHÔNG TÌM THẤY CÂY",
                                "Không tìm thấy cây."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                await showPlantDetail(
                    interaction,
                    plant,
                    slot
                );

                return;
            }


            /*
            ======================================
            WATER
            ======================================
            */

            if (
                customId.startsWith(
                    "farm_water_"
                )
            ) {

                const slot =
                    Number(
                        customId.replace(
                            "farm_water_",
                            ""
                        )
                    );

                try {

                    const plot =
                        Farm.getPlot(
                            interaction.user.id,
                            slot
                        );

                    if (
                        !plot ||
                        !plot.plant_id
                    ) {
                        throw new Error(
                            "Ô đất này không có cây."
                        );
                    }

                    const existingPlant =
                        getUserPlant(
                            interaction.user.id,
                            plot.plant_id
                        );

                    if (!existingPlant) {
                        throw new Error(
                            "Không tìm thấy cá thể cây."
                        );
                    }

                    const plant =
                        Plant.waterPlant(
                            interaction.user.id,
                            slot
                        );

                    addExp(
                        interaction.user.id,
                        3
                    );

                    const updatedPlant =
                        getUserPlant(
                            interaction.user.id,
                            plant.id
                        );

                    const detailEmbed =
                        createPlantDetailEmbed(
                            updatedPlant,
                            slot
                        );

                    const buttons =
                        createPlantButtons(
                            updatedPlant,
                            slot
                        );

                    const successEmbed =
                        new EmbedBuilder()
                            .setColor(COLORS.primary)
                            .setAuthor({
                                name:
                                    `${interaction.user.username} • NahidaFarm`,
                                iconURL:
                                    interaction.user.displayAvatarURL({
                                        extension: "png",
                                        size: 64
                                    })
                            })
                            .setTitle(
                                "💧 TƯỚI CÂY THÀNH CÔNG!"
                            )
                            .setDescription(
                                [
                                    `${plant.emoji} **${plant.name}**`,
                                    `🆔 Cá thể · \`${formatPlantId(plant.id)}\``,
                                    `🪴 Ô đất · **${slot}**`,
                                    "",
                                    "━━━━━━━━━━━━━━━━━━",
                                    "",
                                    "💧 Cây đã được tưới và tiếp tục sinh trưởng.",
                                    "",
                                    "✦ **+3 EXP**"
                                ].join("\n")
                            )
                            .setFooter({
                                text:
                                    "NahidaFarm • Nhật ký khu vườn"
                            })
                            .setTimestamp();

                    /*
                    Embed chính = thông báo tưới
                    Embed thứ hai = trạng thái cây
                    */

                    await interaction.update({

                        content: null,

                        embeds: [
                            successEmbed,
                            detailEmbed
                        ],

                        components: [
                            buttons
                        ]
                    });

                } catch (error) {

                    console.error(
                        "Water plant error:",
                        error
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ TƯỚI CÂY THẤT BẠI",
                                    error.message
                                )
                            ],
                            ephemeral: true
                        });
                    }
                }

                return;
            }


            /*
            ======================================
            HARVEST
            ======================================
            */

            if (
                customId.startsWith(
                    "farm_harvest_"
                )
            ) {

                const slot =
                    Number(
                        customId.replace(
                            "farm_harvest_",
                            ""
                        )
                    );

                try {

                    const plot =
                        Farm.getPlot(
                            interaction.user.id,
                            slot
                        );

                    if (
                        !plot ||
                        !plot.plant_id
                    ) {
                        throw new Error(
                            "Ô đất này không có cây."
                        );
                    }

                    const ownedPlant =
                        getUserPlant(
                            interaction.user.id,
                            plot.plant_id
                        );

                    if (!ownedPlant) {
                        throw new Error(
                            "Không tìm thấy cá thể cây."
                        );
                    }

                    const harvested =
                        Plant.harvestPlant(
                            interaction.user.id,
                            slot
                        );

                    const user =
                        User.getUser(
                            interaction.user.id
                        );

                    if (!user) {
                        throw new Error(
                            "Không tìm thấy người chơi."
                        );
                    }

                    User.updateUser(
                        interaction.user.id,
                        {
                            mora:
                                Number(
                                    user.mora || 0
                                ) +
                                Number(
                                    harvested.sell_price || 0
                                )
                        }
                    );

                    addExp(
                        interaction.user.id,
                        10
                    );

                    Farm.addFarmExp(
                        interaction.user.id,
                        5
                    );

                    const harvestEmbed =
                        new EmbedBuilder()
                            .setColor(COLORS.gold)
                            .setAuthor({
                                name:
                                    `${interaction.user.username} • NahidaFarm`,
                                iconURL:
                                    interaction.user.displayAvatarURL({
                                        extension: "png",
                                        size: 64
                                    })
                            })
                            .setTitle(
                                "🌾 THU HOẠCH THÀNH CÔNG!"
                            )
                            .setDescription(
                                [
                                    `${harvested.emoji} **${harvested.name}**`,
                                    `🆔 Cá thể · \`${formatPlantId(harvested.id)}\``,
                                    "",
                                    "━━━━━━━━━━━━━━━━━━",
                                    "",
                                    "### 📊 Chỉ số",
                                    "",
                                    `❤️ Sức sống · **${harvested.vitality}**`,
                                    `⚡ Sinh trưởng · **${harvested.growth}**`,
                                    `⭐ Chất lượng · **${harvested.quality}**`,
                                    `🍀 May mắn · **+${harvested.luck}**`,
                                    "",
                                    "━━━━━━━━━━━━━━━━━━",
                                    "",
                                    `💰 **+${harvested.sell_price} Mora**`,
                                    "✦ **+10 EXP**",
                                    "🌿 **+5 Farm EXP**",
                                    "",
                                    `📦 Cá thể **${formatPlantId(harvested.id)}**`,
                                    "đã được giữ lại trong Collection."
                                ].join("\n")
                            )
                            .setFooter({
                                text:
                                    FOOTERS.collection
                            })
                            .setTimestamp();

                    await interaction.update({

                        content: null,

                        embeds: [
                            harvestEmbed
                        ],

                        components: []
                    });

                } catch (error) {

                    console.error(
                        "Harvest plant error:",
                        error
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ THU HOẠCH THẤT BẠI",
                                    error.message
                                )
                            ],
                            ephemeral: true
                        });
                    }
                }

                return;
            }


            /*
            ======================================
            FARM BACK
            ======================================
            */

            if (
                customId === "farm_back"
            ) {

                await showFarm(
                    interaction
                );

                return;
            }
        }


        /*
        ==========================================
        SELECT MENU
        ==========================================
        */

        if (
            interaction.isStringSelectMenu()
        ) {

            const customId =
                interaction.customId;

            const values =
                interaction.values;

            console.log(
                "[SELECT MENU RECEIVED]",
                {
                    customId,
                    values
                }
            );


            /*
            ======================================
            FARM SEED SELECT
            ======================================
            */

            if (
                customId.startsWith(
                    "farm_seed_select_"
                )
            ) {

                const slot =
                    Number(
                        customId.replace(
                            "farm_seed_select_",
                            ""
                        )
                    );

                const speciesId =
                    values?.[0];

                console.log(
                    "[FARM SEED SELECT]",
                    {
                        slot,
                        speciesId,
                        values
                    }
                );

                if (!speciesId) {

                    await interaction.reply({
                        embeds: [
                            createErrorEmbed(
                                "❌ CHƯA CHỌN HẠT GIỐNG",
                                "Bạn chưa chọn hạt giống."
                            )
                        ],
                        ephemeral: true
                    });

                    return;
                }

                try {

                    const plot =
                        Farm.getPlot(
                            interaction.user.id,
                            slot
                        );

                    if (!plot) {
                        throw new Error(
                            "Không tìm thấy ô đất."
                        );
                    }

                    if (
                        plot.unlocked === 0 ||
                        plot.unlocked === false
                    ) {
                        throw new Error(
                            "Ô đất này chưa được mở khóa."
                        );
                    }

                    if (plot.plant_id) {
                        throw new Error(
                            "Ô đất này đang có cây."
                        );
                    }

                    const plant =
                        Plant.plantOnPlot(
                            interaction.user.id,
                            slot,
                            speciesId
                        );

                    addExp(
                        interaction.user.id,
                        5
                    );

                    const rarity =
                        createPlantRarity(
                            plant.rarity
                        );

                    const displayId =
                        formatPlantId(
                            plant.id
                        );

                    const embed =
                        new EmbedBuilder()
                            .setColor(COLORS.primary)
                            .setAuthor({
                                name:
                                    `${interaction.user.username} • NahidaFarm`,
                                iconURL:
                                    interaction.user.displayAvatarURL({
                                        extension: "png",
                                        size: 64
                                    })
                            })
                            .setTitle(
                                "🌱 ĐÃ TRỒNG THÀNH CÔNG!"
                            )
                            .setDescription(
                                [
                                    `${plant.emoji} **${plant.name} ${displayId}**`,
                                    "",
                                    `🪴 **Ô đất** · ${slot}`,
                                    `🆔 **Cá thể** · ${displayId}`,
                                    `🌱 **Thế hệ** · ${plant.generation}`,
                                    `⭐ **Độ hiếm** · ${rarity}`,
                                    "",
                                    "━━━━━━━━━━━━━━━━━━",
                                    "",
                                    `❤️ **Sức sống** · ${plant.vitality}`,
                                    `⚡ **Sinh trưởng** · ${plant.growth}`,
                                    `⭐ **Chất lượng** · ${plant.quality}`,
                                    `🍀 **May mắn** · +${plant.luck}`,
                                    "",
                                    `⏳ **Thời gian sinh trưởng** · ${plant.growth_seconds}s`,
                                    "",
                                    "🧬 **Gene** · Chưa khám phá",
                                    "",
                                    "✦ **+5 EXP**"
                                ].join("\n")
                            )
                            .setFooter({
                                text:
                                    FOOTERS.plant
                            })
                            .setTimestamp();

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        `farm_plot_${slot}`
                                    )
                                    .setLabel("Xem cây")
                                    .setEmoji("🔎")
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `plant_info_${plant.id}`
                                    )
                                    .setLabel("Chi tiết")
                                    .setEmoji("🌱")
                                    .setStyle(
                                        ButtonStyle.Primary
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

                    await interaction.update({
                        content: null,
                        embeds: [embed],
                        components: [row]
                    });

                } catch (error) {

                    console.error(
                        "Plant seed error:",
                        error
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ TRỒNG CÂY THẤT BẠI",
                                    error.message
                                )
                            ],
                            ephemeral: true
                        });
                    }
                }

                return;
            }


            /*
            ======================================
            BREED PARENT 2
            ======================================
            */

            if (
                customId.startsWith(
                    "breed_parent2_"
                )
            ) {

                try {

                    console.log(
                        "[BREED PARENT2 SELECT]",
                        {
                            customId,
                            values
                        }
                    );

                    const parent1Id =
                        Number(
                            customId.replace(
                                "breed_parent2_",
                                ""
                            )
                        );

                    if (
                        !Number.isInteger(
                            parent1Id
                        ) ||
                        parent1Id <= 0
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ ID KHÔNG HỢP LỆ",
                                    "ID cây thứ nhất không hợp lệ."
                                )
                            ],
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        !Array.isArray(values) ||
                        values.length === 0
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ CHƯA CHỌN CÂY",
                                    "Bạn chưa chọn cây thứ hai."
                                )
                            ],
                            ephemeral: true
                        });

                        return;
                    }

                    const parent2Id =
                        Number(
                            values[0]
                        );

                    if (
                        !Number.isInteger(
                            parent2Id
                        ) ||
                        parent2Id <= 0
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ ID KHÔNG HỢP LỆ",
                                    "ID cây thứ hai không hợp lệ."
                                )
                            ],
                            ephemeral: true
                        });

                        return;
                    }

                    console.log(
                        "[BREED IDS]",
                        {
                            parent1Id,
                            parent2Id
                        }
                    );

                    if (
                        parent1Id ===
                        parent2Id
                    ) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ KHÔNG THỂ LAI",
                                    "Không thể lai một cây với chính nó."
                                )
                            ],
                            ephemeral: true
                        });

                        return;
                    }

                    const parent1 =
                        getUserPlant(
                            interaction.user.id,
                            parent1Id
                        );

                    const parent2 =
                        getUserPlant(
                            interaction.user.id,
                            parent2Id
                        );

                    console.log(
                        "[BREED PLANTS]",
                        {
                            parent1,
                            parent2
                        }
                    );

                    if (!parent1) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ KHÔNG TÌM THẤY CÂY",
                                    "Không tìm thấy cây thứ nhất."
                                )
                            ],
                            ephemeral: true
                        });

                        return;
                    }

                    if (!parent2) {

                        await interaction.reply({
                            embeds: [
                                createErrorEmbed(
                                    "❌ KHÔNG TÌM THẤY CÂY",
                                    "Không tìm thấy cây thứ hai."
                                )
                            ],
                            ephemeral: true
                        });

                        return;
                    }

                    await showBreedingConfirm(
                        interaction,
                        parent1,
                        parent2
                    );

                } catch (error) {

                    console.error(
                        "[BREED PARENT2 ERROR]",
                        error
                    );

                    try {

                        const errorEmbed =
                            createErrorEmbed(
                                "❌ LAI GIỐNG",
                                error.message
                            );

                        if (
                            interaction.replied ||
                            interaction.deferred
                        ) {

                            await interaction.followUp({
                                embeds: [
                                    errorEmbed
                                ],
                                ephemeral: true
                            });

                        } else {

                            await interaction.reply({
                                embeds: [
                                    errorEmbed
                                ],
                                ephemeral: true
                            });
                        }

                    } catch (replyError) {

                        console.error(
                            "[BREED ERROR REPLY]",
                            replyError
                        );
                    }
                }

                return;
            }
        }


        /*
        ==========================================
        SLASH COMMAND
        ==========================================
        */

        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        const command =
            client.commands.get(
                interaction.commandName
            );

        if (!command) {
            return;
        }

        try {

            User.getOrCreateUser(
                interaction.user.id,
                interaction.user.username
            );

            await command.execute(
                interaction,
                client
            );

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            const errorEmbed =
                createErrorEmbed(
                    "❌ CÓ LỖI TRONG KHU VƯỜN",
                    "Đã xảy ra lỗi khi thực hiện thao tác."
                );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({
                        embeds: [
                            errorEmbed
                        ],
                        ephemeral: true
                    });

                } else {

                    await interaction.reply({
                        embeds: [
                            errorEmbed
                        ],
                        ephemeral: true
                    });
                }

            } catch (replyError) {

                console.error(
                    "Failed to send interaction error:",
                    replyError
                );
            }
        }
    }
};