const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const Breeding = require("../services/breedingService");
const Gene = require("../services/geneService");
const Plant = require("../services/plantService");

/*
==================================================
COLORS
==================================================
*/

const COLORS = {
    breed: 0x9b8cff,
    error: 0xe57373
};

/*
==================================================
FORMAT
==================================================
*/

function formatPlantId(id) {
    return `#${String(id).padStart(4, "0")}`;
}

function formatGeneType(type) {

    const map = {
        vitality: "❤️ Vitality",
        growth: "⚡ Growth",
        quality: "⭐ Quality",
        luck: "🍀 Luck"
    };

    return (
        map[type] ||
        `🧬 ${type || "Unknown"}`
    );
}

function formatMutation(
    mutation
) {
    return Number(mutation) === 1
        ? "🌟 Có"
        : "⚪ Không";
}

/*
==================================================
GENE FORMAT
==================================================
*/

function formatGene(
    gene
) {
    const type =
        formatGeneType(
            gene.gene_type
        );

    const alleleA =
        gene.allele_a ||
        gene.gene_code ||
        "?";

    const alleleB =
        gene.allele_b ||
        gene.gene_code ||
        "?";

    const dominant =
        gene.dominant_allele ||
        "—";

    const recessive =
        gene.recessive_allele ||
        "—";

    let effective = "?";

    try {

        effective =
            Gene.getEffectiveGeneValue(
                gene
            );

    } catch {

        effective =
            gene.gene_value ||
            0;
    }

    return [
        `**${type}**`,
        `> 🧬 **${
            gene.gene_name ||
            "Unknown"
        }** \`${
            gene.gene_code ||
            "?"
        }\``,

        `> 💠 Giá trị: **${
            gene.gene_value ||
            0
        }** → **${effective}**`,

        `> 🧬 Allele A: \`${alleleA}\``,
        `> 🧬 Allele B: \`${alleleB}\``,

        `> 👑 Trội: \`${dominant}\``,
        `> 🌑 Lặn: \`${recessive}\``,

        `> ${formatMutation(
            gene.mutation
        )} Mutation`
    ].join("\n");
}

/*
==================================================
BREED RESULT EMBED
==================================================
*/

function createBreedResultEmbed(
    interaction,
    result
) {
    const {
        parent1,
        parent2,
        child,
        genes = [],
        generation
    } = result;

    const geneLines =
        genes.length > 0
            ? genes
                .map(formatGene)
                .join("\n\n")
            : "⚠️ Không có dữ liệu Gene.";

    let description =
        `*Hai mầm sống hòa vào nhau để tạo nên ` +
        `một thế hệ mới.*\n\n`;

    description +=
        `👤 **${interaction.user.username}**\n\n`;

    description +=
        `🌿 **PARENT 01 — BỐ**\n` +
        `> ${parent1.emoji || "🌱"} ` +
        `**${parent1.name}**\n` +
        `> 🆔 \`${formatPlantId(
            parent1.id
        )}\`\n` +
        `> 🧬 Generation **${
            parent1.generation || 1
        }**\n\n`;

    description +=
        `💠 **×**\n\n`;

    description +=
        `🌿 **PARENT 02 — MẸ**\n` +
        `> ${parent2.emoji || "🌱"} ` +
        `**${parent2.name}**\n` +
        `> 🆔 \`${formatPlantId(
            parent2.id
        )}\`\n` +
        `> 🧬 Generation **${
            parent2.generation || 1
        }**\n\n`;

    description +=
        `━━━━━━━━━━━━━━━━━━\n\n`;

    description +=
        `🌱 **CÂY CON**\n` +
        `> ${child.emoji || "🌱"} ` +
        `**${child.name}**\n` +
        `> 🆔 \`${formatPlantId(
            child.id
        )}\`\n` +
        `> 🧬 Generation **${
            generation ||
            child.generation ||
            1
        }**\n\n`;

    description +=
        `━━━━━━━━━━━━━━━━━━\n\n`;

    description +=
        `🧬 **GENE CÂY CON**\n\n` +
        geneLines;

    return new EmbedBuilder()
        .setColor(
            COLORS.breed
        )
        .setTitle(
            "🧬 `LAI GIỐNG THÀNH CÔNG`"
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                "NahidaFarm • Gene được kế thừa từ hai cây bố mẹ"
        });
}

/*
==================================================
PLANT OPTION
==================================================
*/

function createPlantOption(
    plant
) {
    return {
        label:
            `${plant.name} ${
                formatPlantId(
                    plant.id
                )
            }`.slice(0, 100),

        value:
            String(plant.id),

        description:
            (
                `Gen ${
                    plant.generation || 1
                } • Quality ${
                    plant.quality || 0
                }`
            ).slice(0, 100),

        emoji:
            plant.emoji ||
            "🌱"
    };
}

/*
==================================================
PARENT 1 EMBED
==================================================
*/

function createParent1Embed(
    interaction
) {
    return new EmbedBuilder()
        .setColor(
            COLORS.breed
        )
        .setTitle(
            "🧬 `LAI GIỐNG`"
        )
        .setDescription(
            `*Hai cá thể sẽ tạo nên một thế hệ mới.*\n\n` +

            `👤 **${interaction.user.username}**\n\n` +

            `🌱 **BƯỚC 01 — CHỌN CÂY BỐ**\n\n` +

            `Chọn một cá thể trong bộ sưu tập ` +
            `của bạn để bắt đầu quá trình lai giống.\n\n` +

            `━━━━━━━━━━━━━━━━━━\n\n` +

            `🧬 Sau khi chọn cây bố, ` +
            `bạn sẽ được chọn cây mẹ.`
        )
        .setFooter({
            text:
                "NahidaFarm • Cây bố mẹ không bị xóa sau khi lai"
        });
}

/*
==================================================
PARENT 1 MENU
==================================================
*/

function createParent1Menu(
    plants
) {
    const options =
        plants
            .slice(0, 25)
            .map(
                createPlantOption
            );

    return new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(
                    "breed_parent1"
                )
                .setPlaceholder(
                    "🌱 Chọn cây bố..."
                )
                .addOptions(
                    options
                )
        );
}

/*
==================================================
COMMAND
==================================================
*/

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("breed")
            .setDescription(
                "Lai hai cây để tạo cây con"
            )

            .addIntegerOption(
                option =>
                    option
                        .setName("parent1")
                        .setDescription(
                            "ID cây bố (tùy chọn)"
                        )
                        .setRequired(false)
            )

            .addIntegerOption(
                option =>
                    option
                        .setName("parent2")
                        .setDescription(
                            "ID cây mẹ (tùy chọn)"
                        )
                        .setRequired(false)
            ),

    /*
    ==============================================
    EXECUTE
    ==============================================
    */

    async execute(
        interaction
    ) {

        const parent1Id =
            interaction.options.getInteger(
                "parent1"
            );

        const parent2Id =
            interaction.options.getInteger(
                "parent2"
            );

        /*
        ==========================================
        /breed
        ==========================================
        */

        if (
            !parent1Id &&
            !parent2Id
        ) {

            const plants =
                Plant.getUserPlants(
                    interaction.user.id
                );

            if (
                !Array.isArray(plants) ||
                plants.length < 2
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            COLORS.error
                        )
                        .setTitle(
                            "❌ `KHÔNG ĐỦ CÂY`"
                        )
                        .setDescription(
                            `Bạn cần ít nhất **2 cá thể cây** ` +
                            `để bắt đầu lai giống.\n\n` +

                            `🌱 Hãy gieo thêm cây và quay lại nhé.`
                        )
                        .setFooter({
                            text:
                                "NahidaFarm • Cần 2 cây để lai giống"
                        });

                await interaction.reply({
                    embeds: [
                        embed
                    ],
                    ephemeral: true
                });

                return;
            }

            const embed =
                createParent1Embed(
                    interaction
                );

            const menu =
                createParent1Menu(
                    plants
                );

            await interaction.reply({
                embeds: [
                    embed
                ],
                components: [
                    menu
                ]
            });

            return;
        }

        /*
        ==========================================
        ID KHÔNG ĐẦY ĐỦ
        ==========================================
        */

        if (
            !parent1Id ||
            !parent2Id
        ) {

            const embed =
                new EmbedBuilder()
                    .setColor(
                        COLORS.error
                    )
                    .setTitle(
                        "❌ `THIẾU CÂY BỐ MẸ`"
                    )
                    .setDescription(
                        `Vui lòng chọn đủ:\n\n` +
                        `🌿 **Parent 1** — Cây bố\n` +
                        `🌿 **Parent 2** — Cây mẹ`
                    )
                    .setFooter({
                        text:
                            "NahidaFarm • Cần đủ hai cá thể"
                    });

            await interaction.reply({
                embeds: [
                    embed
                ],
                ephemeral: true
            });

            return;
        }

        /*
        ==========================================
        BREED DIRECTLY
        ==========================================
        */

        await interaction.deferReply();

        try {

            const result =
                Breeding.breed(
                    interaction.user.id,
                    parent1Id,
                    parent2Id
                );

            const embed =
                createBreedResultEmbed(
                    interaction,
                    result
                );

            await interaction.editReply({
                embeds: [
                    embed
                ],
                components: []
            });

        } catch (error) {

            console.error(
                "BREED COMMAND ERROR:",
                error
            );

            const errorEmbed =
                new EmbedBuilder()
                    .setColor(
                        COLORS.error
                    )
                    .setTitle(
                        "❌ `LAI GIỐNG THẤT BẠI`"
                    )
                    .setDescription(
                        `> ${
                            error.message ||
                            "Đã xảy ra lỗi khi lai giống."
                        }`
                    )
                    .setFooter({
                        text:
                            "NahidaFarm • Kiểm tra lại hai cá thể và thử lại"
                    });

            await interaction.editReply({
                embeds: [
                    errorEmbed
                ],
                components: []
            });
        }
    },

    createBreedResultEmbed,
    createParent1Embed,
    createParent1Menu,
    createPlantOption
};