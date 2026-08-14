const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Plant = require("../services/plantService");
const Farm = require("../services/farmService");

/*
==================================================
CONFIG
==================================================
*/

const SPECIES_PER_PAGE = 25;
const INDIVIDUALS_PER_PAGE = 10;

const COLORS = {
    inventory: 0x9b8cff,
    individual: 0x8fd694
};

/*
==================================================
FORMAT
==================================================
*/

function formatId(id) {
    return `#${String(id).padStart(4, "0")}`;
}

function formatRarity(rarity) {
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
GET PLANTED SLOT
==================================================
*/

function getPlantSlot(
    userId,
    plantId
) {
    try {

        const plots =
            Farm.getPlots(
                userId
            );

        if (
            !Array.isArray(plots)
        ) {
            return null;
        }

        const plot =
            plots.find(
                p =>
                    Number(p.plant_id) ===
                    Number(plantId)
            );

        return plot
            ? plot.slot
            : null;

    } catch {
        return null;
    }
}

/*
==================================================
GET INVENTORY
==================================================
*/

function getInventory(
    userId
) {
    const plants =
        Plant.getUserPlants(
            userId
        );

    if (
        !Array.isArray(plants)
    ) {
        return [];
    }

    return plants;
}

/*
==================================================
GROUP BY SPECIES
==================================================
*/

function groupBySpecies(
    plants
) {
    const groups =
        new Map();

    for (
        const plant of plants
    ) {

        const speciesId =
            Number(
                plant.species_id
            );

        if (
            !groups.has(
                speciesId
            )
        ) {

            groups.set(
                speciesId,
                {
                    speciesId,
                    name:
                        plant.name ||
                        "Không rõ",

                    emoji:
                        plant.emoji ||
                        "🌱",

                    rarity:
                        plant.rarity ||
                        1,

                    plants: []
                }
            );
        }

        groups
            .get(speciesId)
            .plants
            .push(plant);
    }

    return Array
        .from(groups.values())
        .sort(
            (a, b) => {

                if (
                    Number(b.rarity) !==
                    Number(a.rarity)
                ) {
                    return (
                        Number(b.rarity) -
                        Number(a.rarity)
                    );
                }

                return a.name.localeCompare(
                    b.name,
                    "vi"
                );
            }
        );
}

/*
==================================================
PLANT POWER
==================================================
*/

function getPlantPower(
    plant
) {
    const vitality =
        Number(plant.vitality) || 0;

    const growth =
        Number(plant.growth) || 0;

    const quality =
        Number(plant.quality) || 0;

    const luck =
        Number(plant.luck) || 0;

    return (
        vitality +
        growth +
        quality +
        luck
    );
}

/*
==================================================
SORT INDIVIDUALS
==================================================
*/

function sortIndividuals(
    plants
) {
    return [...plants].sort(
        (a, b) => {

            const powerA =
                getPlantPower(a);

            const powerB =
                getPlantPower(b);

            if (
                powerA !== powerB
            ) {
                return (
                    powerB -
                    powerA
                );
            }

            return (
                Number(b.id) -
                Number(a.id)
            );
        }
    );
}

/*
==================================================
MAIN INVENTORY EMBED
==================================================
*/

function createInventoryEmbed(
    interaction,
    groups,
    page = 1
) {
    const totalPages =
        Math.max(
            1,
            Math.ceil(
                groups.length /
                SPECIES_PER_PAGE
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
        SPECIES_PER_PAGE;

    const pageGroups =
        groups.slice(
            start,
            start +
            SPECIES_PER_PAGE
        );

    const totalIndividuals =
        groups.reduce(
            (sum, group) =>
                sum +
                group.plants.length,
            0
        );

    let description =
        `*“Mỗi hạt giống đều mang trong mình ` +
        `một giấc mơ nhỏ.”*\n` +
        `— Nahida\n\n`;

    description +=
        `👤 **${interaction.user.username}**\n\n`;

    description +=
        `📚 **BỘ SƯU TẬP**\n` +
        `> 🌱 **${totalIndividuals}** cá thể\n` +
        `> 🌿 **${groups.length}** giống cây\n\n`;

    description +=
        `━━━━━━━━━━━━━━━━━━\n\n`;

    if (
        pageGroups.length === 0
    ) {

        description +=
            `🍃 **Khu vườn vẫn còn trống.**\n\n` +
            `*Hãy bắt đầu gieo một hạt giống nhé.*`;

    } else {

        for (
            const group of pageGroups
        ) {

            const highestGen =
                Math.max(
                    ...group.plants.map(
                        p =>
                            Number(
                                p.generation
                            ) || 1
                    )
                );

            description +=
                `${group.emoji} **${group.name}** ` +
                `\`×${group.plants.length}\`\n`;

            description +=
                `> ${formatRarity(
                    group.rarity
                )}\n`;

            description +=
                `> 🧬 Gen cao nhất: **${highestGen}**\n\n`;
        }
    }

    return new EmbedBuilder()
        .setColor(
            COLORS.inventory
        )
        .setTitle(
            "📖 `NHẬT KÝ KHU VƯỜN`"
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                `NahidaFarm • Trang ${page}/${totalPages} • Chọn giống để xem cá thể`
        });
}

/*
==================================================
SPECIES SELECT
==================================================
*/

function createSpeciesSelect(
    groups,
    page
) {
    const start =
        (page - 1) *
        SPECIES_PER_PAGE;

    const pageGroups =
        groups.slice(
            start,
            start +
            SPECIES_PER_PAGE
        );

    if (
        !pageGroups.length
    ) {
        return null;
    }

    const options =
        pageGroups.map(
            group => {

                const highestGen =
                    Math.max(
                        ...group.plants.map(
                            p =>
                                Number(
                                    p.generation
                                ) || 1
                        )
                    );

                return {
                    label:
                        `${group.name} ×${group.plants.length}`
                            .slice(0, 100),

                    value:
                        `inventory_species_${group.speciesId}`,

                    description:
                        (
                            `${group.plants.length} cá thể • ` +
                            `Gen cao nhất: ${highestGen}`
                        ).slice(0, 100),

                    emoji:
                        group.emoji
                };
            }
        );

    return new StringSelectMenuBuilder()
        .setCustomId(
            `inventory_species_select_${page}`
        )
        .setPlaceholder(
            "🌱 Chọn một giống cây..."
        )
        .addOptions(
            options
        );
}

/*
==================================================
SPECIES NAVIGATION
==================================================
*/

function createSpeciesNavigation(
    groups,
    page
) {
    const totalPages =
        Math.max(
            1,
            Math.ceil(
                groups.length /
                SPECIES_PER_PAGE
            )
        );

    const row =
        new ActionRowBuilder();

    row.addComponents(

        new ButtonBuilder()
            .setCustomId(
                `inventory_species_prev_${page}`
            )
            .setLabel("Trước")
            .setEmoji("◀️")
            .setStyle(
                ButtonStyle.Secondary
            )
            .setDisabled(
                page <= 1
            ),

        new ButtonBuilder()
            .setCustomId(
                `inventory_species_next_${page}`
            )
            .setLabel("Sau")
            .setEmoji("▶️")
            .setStyle(
                ButtonStyle.Secondary
            )
            .setDisabled(
                page >= totalPages
            )
    );

    return row;
}

/*
==================================================
INDIVIDUAL EMBED
==================================================
*/

function createIndividualEmbed(
    interaction,
    group,
    plants,
    page
) {
    const sorted =
        sortIndividuals(
            plants
        );

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                sorted.length /
                INDIVIDUALS_PER_PAGE
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
        INDIVIDUALS_PER_PAGE;

    const pagePlants =
        sorted.slice(
            start,
            start +
            INDIVIDUALS_PER_PAGE
        );

    let description =
        `👤 **${interaction.user.username}**\n\n`;

    description +=
        `${group.emoji} **${group.name}** ` +
        `\`×${plants.length}\`\n`;

    description +=
        `${formatRarity(
            group.rarity
        )}\n\n`;

    description +=
        `━━━━━━━━━━━━━━━━━━\n\n`;

    if (
        !pagePlants.length
    ) {

        description +=
            `🍃 **Không tìm thấy cá thể.**`;

    } else {

        description +=
            pagePlants
                .map(
                    plant => {

                        const slot =
                            getPlantSlot(
                                interaction.user.id,
                                plant.id
                            );

                        const status =
                            slot !== null
                                ? `🪴 Ô ${slot}`
                                : "📦 Kho";

                        return (
                            `**${formatId(
                                plant.id
                            )}** ` +
                            `• 🧬 Gen ${plant.generation || 1} ` +
                            `• ${status}\n` +

                            `❤️ ${Number(
                                plant.vitality
                            ) || 0}  ` +

                            `⚡ ${Number(
                                plant.growth
                            ) || 0}  ` +

                            `⭐ ${Number(
                                plant.quality
                            ) || 0}  ` +

                            `🍀 ${Number(
                                plant.luck
                            ) || 0}`
                        );
                    }
                )
                .join("\n\n");
    }

    return new EmbedBuilder()
        .setColor(
            COLORS.individual
        )
        .setTitle(
            `${group.emoji} \`${group.name}\``
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                `NahidaFarm • Trang ${page}/${totalPages} • Cá thể mạnh được ưu tiên`
        });
}

/*
==================================================
INDIVIDUAL NAVIGATION
==================================================
*/

function createIndividualNavigation(
    speciesId,
    plants,
    page
) {
    const totalPages =
        Math.max(
            1,
            Math.ceil(
                plants.length /
                INDIVIDUALS_PER_PAGE
            )
        );

    const row =
        new ActionRowBuilder();

    row.addComponents(

        new ButtonBuilder()
            .setCustomId(
                `inventory_ind_prev_${speciesId}_${page}`
            )
            .setLabel("Trước")
            .setEmoji("◀️")
            .setStyle(
                ButtonStyle.Secondary
            )
            .setDisabled(
                page <= 1
            ),

        new ButtonBuilder()
            .setCustomId(
                `inventory_back_${page}`
            )
            .setLabel("Giống cây")
            .setEmoji("🌱")
            .setStyle(
                ButtonStyle.Primary
            ),

        new ButtonBuilder()
            .setCustomId(
                `inventory_ind_next_${speciesId}_${page}`
            )
            .setLabel("Sau")
            .setEmoji("▶️")
            .setStyle(
                ButtonStyle.Secondary
            )
            .setDisabled(
                page >= totalPages
            )
    );

    return row;
}

/*
==================================================
COMMAND
==================================================
*/

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("inventory")
            .setDescription(
                "Xem bộ sưu tập cá thể cây của bạn"
            ),

    async execute(
        interaction
    ) {

        try {

            const plants =
                getInventory(
                    interaction.user.id
                );

            const groups =
                groupBySpecies(
                    plants
                );

            const page = 1;

            const embed =
                createInventoryEmbed(
                    interaction,
                    groups,
                    page
                );

            const components = [];

            const select =
                createSpeciesSelect(
                    groups,
                    page
                );

            if (select) {

                components.push(
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                );
            }

            if (
                groups.length >
                SPECIES_PER_PAGE
            ) {

                components.push(
                    createSpeciesNavigation(
                        groups,
                        page
                    )
                );
            }

            await interaction.reply({
                embeds: [
                    embed
                ],
                components
            });

        } catch (error) {

            console.error(
                "INVENTORY COMMAND ERROR:",
                error
            );

            const embed =
                new EmbedBuilder()
                    .setColor(
                        0xe57373
                    )
                    .setTitle(
                        "❌ `KHÔNG THỂ MỞ NHẬT KÝ`"
                    )
                    .setDescription(
                        `> ${error.message}`
                    )
                    .setFooter({
                        text:
                            "NahidaFarm • Vui lòng thử lại"
                    });

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.editReply({
                    content: null,
                    embeds: [
                        embed
                    ],
                    components: []
                });

            } else {

                await interaction.reply({
                    embeds: [
                        embed
                    ],
                    ephemeral: true
                });
            }
        }
    },

    getInventory,
    groupBySpecies,
    createInventoryEmbed,
    createSpeciesSelect,
    createSpeciesNavigation,
    createIndividualEmbed,
    createIndividualNavigation
};