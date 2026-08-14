const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const Plant =
    require("../services/plantService");

const Breeding =
    require("../services/breedingService");


/*
==================================================
FORMAT PLANT ID
==================================================
*/

function formatPlantId(id) {

    return `#${String(id).padStart(4, "0")}`;
}


/*
==================================================
RARITY
==================================================
*/

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
GET USER PLANTS
==================================================
*/

function getBreedablePlants(
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

    return plants.filter(
        plant => {

            if (!plant) {
                return false;
            }

            /*
            Không cho chọn cây đang ở trạng thái
            không hợp lệ.

            Cây phải trưởng thành.
            */

            return Plant.isReady(
                plant
            );
        }
    );
}


/*
==================================================
CREATE PLANT OPTION
==================================================
*/

function createPlantOption(
    plant
) {

    const label =
        `${plant.emoji || "🌱"} ${plant.name || "Cây"} ${formatPlantId(plant.id)}`;

    const description =
        `Gen ${plant.generation || 1} • ` +
        `⭐ ${formatRarity(plant.rarity)}`;


    return {

        label:
            label.slice(
                0,
                100
            ),

        description:
            description.slice(
                0,
                100
            ),

        value:
            String(
                plant.id
            )
    };
}


/*
==================================================
SELECT PARENT
==================================================
*/

function createParentSelect(
    userId,
    parentId = null,
    excludedId = null
) {

    let plants =
        getBreedablePlants(
            userId
        );


    /*
    Không cho chọn chính cây đã chọn
    */

    if (excludedId) {

        plants =
            plants.filter(
                plant =>
                    Number(
                        plant.id
                    ) !==
                    Number(
                        excludedId
                    )
            );
    }


    /*
    Discord String Select tối đa 25 options.
    */

    plants =
        plants.slice(
            0,
            25
        );


    const options =
        plants.map(
            createPlantOption
        );


    if (
        options.length === 0
    ) {

        return null;
    }


    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                parentId
                    ? `breed_parent_b_${parentId}`
                    : "breed_parent_a"
            )
            .setPlaceholder(
                parentId
                    ? "🌱 Chọn cây mẹ"
                    : "🌱 Chọn cây bố"
            )
            .addOptions(
                options
            );


    return new ActionRowBuilder()
        .addComponents(
            menu
        );
}


/*
==================================================
BREED MAIN EMBED
==================================================
*/

function createBreedEmbed(
    userId,
    parentA = null,
    parentB = null
) {

    let description =
        "💕 **HỆ THỐNG LAI CÂY**\n\n";


    description +=
        "Kết hợp Gene của hai cá thể để tạo ra " +
        "một cây con mới.\n\n";


    /*
    ==============================================
    PARENT A
    ==============================================
    */

    if (parentA) {

        description +=
            `🌳 **Cây bố**\n` +

            `${parentA.emoji || "🌱"} ` +
            `**${parentA.name} ${formatPlantId(parentA.id)}**\n` +

            `🌱 Generation: **${parentA.generation}**\n` +

            `⭐ Rarity: ${formatRarity(parentA.rarity)}\n\n`;

    } else {

        description +=
            "🌳 **Cây bố:** Chưa chọn\n\n";
    }


    /*
    ==============================================
    PARENT B
    ==============================================
    */

    if (parentB) {

        description +=
            `🌿 **Cây mẹ**\n` +

            `${parentB.emoji || "🌱"} ` +
            `**${parentB.name} ${formatPlantId(parentB.id)}**\n` +

            `🌱 Generation: **${parentB.generation}**\n` +

            `⭐ Rarity: ${formatRarity(parentB.rarity)}\n\n`;

    } else {

        description +=
            "🌿 **Cây mẹ:** Chưa chọn\n\n";
    }


    description +=
        "━━━━━━━━━━━━━━━━━━\n\n";


    if (
        parentA &&
        parentB
    ) {

        description +=
            "✅ **Hai cá thể đã được chọn.**\n\n" +

            "💕 Có thể tiến hành lai.\n" +

            "🧬 Gene cây con sẽ được thừa hưởng " +
            "từ cả hai cây.\n\n" +

            "🔒 Gene cây con bắt đầu ở trạng thái " +
            "**chưa khám phá**.";

    } else {

        description +=
            "📌 Hãy chọn đủ **2 cá thể trưởng thành** " +
            "để tiếp tục.";
    }


    return new EmbedBuilder()
        .setColor(
            0xec8fbd
        )
        .setTitle(
            "💕 Lai cây"
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                "Chỉ cây trưởng thành mới có thể lai."
        });
}


/*
==================================================
BREED BUTTONS
==================================================
*/

function createBreedButtons(
    parentA = null,
    parentB = null
) {

    const row =
        new ActionRowBuilder();


    /*
    ==============================================
    BREED BUTTON
    ==============================================
    */

    if (
        parentA &&
        parentB
    ) {

        row.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `breed_preview_${parentA.id}_${parentB.id}`
                )
                .setLabel(
                    "Xem kết quả"
                )
                .setEmoji(
                    "🔬"
                )
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    "breed_cancel"
                )
                .setLabel(
                    "Hủy"
                )
                .setEmoji(
                    "❌"
                )
                .setStyle(
                    ButtonStyle.Secondary
                )
        );

    } else {

        row.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    "breed_cancel"
                )
                .setLabel(
                    "Hủy"
                )
                .setEmoji(
                    "❌"
                )
                .setStyle(
                    ButtonStyle.Secondary
                )
        );
    }


    return row;
}


/*
==================================================
CREATE BREED UI
==================================================
*/

function createBreedUI(
    userId,
    parentA = null,
    parentB = null
) {

    const embed =
        createBreedEmbed(
            userId,
            parentA,
            parentB
        );


    const components = [];


    /*
    ==============================================
    PARENT A SELECT
    ==============================================
    */

    if (!parentA) {

        const selectA =
            createParentSelect(
                userId
            );

        if (selectA) {

            components.push(
                selectA
            );
        }

    }


    /*
    ==============================================
    PARENT B SELECT
    ==============================================
    */

    if (
        parentA &&
        !parentB
    ) {

        const selectB =
            createParentSelect(
                userId,
                parentA.id,
                parentA.id
            );

        if (selectB) {

            components.push(
                selectB
            );
        }
    }


    /*
    ==============================================
    BUTTONS
    ==============================================
    */

    components.push(
        createBreedButtons(
            parentA,
            parentB
        )
    );


    return {

        content:
            null,

        embeds: [
            embed
        ],

        components:
            components.slice(
                0,
                5
            )
    };
}


/*
==================================================
BREED PREVIEW EMBED
==================================================
*/

function createBreedPreviewEmbed(
    preview
) {

    const parentA =
        preview.parentA;

    const parentB =
        preview.parentB;


    return new EmbedBuilder()
        .setColor(
            0xffb86c
        )
        .setTitle(
            "🔬 Dự đoán lai cây"
        )
        .setDescription(

            `🌳 **Cây bố**\n` +

            `${parentA.emoji} ` +
            `**${parentA.name} ${formatPlantId(parentA.id)}**\n` +

            `🌱 Generation: **${parentA.generation}**\n\n` +

            `❤️ Vitality: **${parentA.vitality}**\n` +
            `⚡ Growth: **${parentA.growth}**\n` +
            `⭐ Quality: **${parentA.quality}**\n` +
            `🍀 Luck: **+${parentA.luck}**\n\n` +

            `━━━━━━━━━━━━━━━━━━\n\n` +

            `🌿 **Cây mẹ**\n` +

            `${parentB.emoji} ` +
            `**${parentB.name} ${formatPlantId(parentB.id)}**\n` +

            `🌱 Generation: **${parentB.generation}**\n\n` +

            `❤️ Vitality: **${parentB.vitality}**\n` +
            `⚡ Growth: **${parentB.growth}**\n` +
            `⭐ Quality: **${parentB.quality}**\n` +
            `🍀 Luck: **+${parentB.luck}**\n\n` +

            `━━━━━━━━━━━━━━━━━━\n\n` +

            `🌱 **Cây con dự kiến:**\n` +

            `Generation: **${preview.generation}**\n` +

            `🧬 Gene: **4 Gene mới**\n` +

            `🔒 Trạng thái Gene: **Chưa khám phá**\n\n` +

            `⚠️ Kết quả Gene chính xác chỉ được xác định ` +
            `khi tiến hành lai.`
        );
}


/*
==================================================
BREED PREVIEW BUTTONS
==================================================
*/

function createBreedPreviewButtons(
    parentAId,
    parentBId
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `breed_confirm_${parentAId}_${parentBId}`
                )
                .setLabel(
                    "Tiến hành lai"
                )
                .setEmoji(
                    "💕"
                )
                .setStyle(
                    ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    `breed_parent_back_${parentAId}`
                )
                .setLabel(
                    "Đổi cây mẹ"
                )
                .setEmoji(
                    "🔄"
                )
                .setStyle(
                    ButtonStyle.Secondary
                ),

            new ButtonBuilder()
                .setCustomId(
                    "breed_cancel"
                )
                .setLabel(
                    "Hủy"
                )
                .setEmoji(
                    "❌"
                )
                .setStyle(
                    ButtonStyle.Danger
                )
        );
}


/*
==================================================
BREED RESULT EMBED
==================================================
*/

function createBreedResultEmbed(
    result
) {

    const child =
        result.child;


    const genes =
        Array.isArray(
            result.genes
        )
            ? result.genes
            : [];


    const geneLines =
        genes.map(
            (gene, index) => {

                return (
                    `${index + 1}. ` +
                    `${gene.gene_name || "Unknown Gene"} ` +
                    `\`+${gene.gene_value || 0}\``
                );
            }
        );


    return new EmbedBuilder()
        .setColor(
            0x9b8cff
        )
        .setTitle(
            "🌱 Lai thành công!"
        )
        .setDescription(

            `${child.emoji} ` +
            `**${child.name} ${formatPlantId(child.id)}**\n\n` +

            `🌱 **Generation:** ${child.generation}\n` +

            `⭐ **Rarity:** ${formatRarity(child.rarity)}\n\n` +

            `❤️ **Vitality:** ${child.vitality}\n` +
            `⚡ **Growth:** ${child.growth}\n` +
            `⭐ **Quality:** ${child.quality}\n` +
            `🍀 **Luck:** +${child.luck}\n\n` +

            `🧬 **Gene:** ${genes.length}/4\n` +
            `🔒 **Trạng thái:** Chưa khám phá\n\n` +

            `━━━━━━━━━━━━━━━━━━\n\n` +

            `🧬 Gene được tạo:\n` +

            (
                geneLines.length > 0
                    ? geneLines.join("\n")
                    : "Không có Gene"
            ) +

            `\n\n🔬 Hãy khám phá Gene của cây con ` +
            `để biết đặc tính di truyền.`
        );
}


/*
==================================================
RESULT BUTTONS
==================================================
*/

function createBreedResultButtons(
    childId
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `plant_info_${childId}`
                )
                .setLabel(
                    "Chi tiết cây"
                )
                .setEmoji(
                    "🌱"
                )
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    `plant_genes_${childId}`
                )
                .setLabel(
                    "Khám phá Gen"
                )
                .setEmoji(
                    "🧬"
                )
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
                .setEmoji(
                    "🌿"
                )
                .setStyle(
                    ButtonStyle.Secondary
                )
        );
}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    formatPlantId,

    formatRarity,

    getBreedablePlants,

    createParentSelect,

    createBreedEmbed,

    createBreedButtons,

    createBreedUI,

    createBreedPreviewEmbed,

    createBreedPreviewButtons,

    createBreedResultEmbed,

    createBreedResultButtons
};