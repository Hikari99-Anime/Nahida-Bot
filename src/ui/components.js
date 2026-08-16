const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require("discord.js");

const {
    COLORS
} = require("../config");

const {
    getAllPlants,
    getPlant,
    formatPlant,
    getRarityStars
} = require("../database/plants");

const {
    getUser
} = require("../game/user");


// ============================================================
// SAFE EMOJI
// ============================================================

const EMOJI = {
    home: "🏠",
    farm: "🌱",
    inventory: "🎒",
    shop: "🛒",
    genetics: "🧬",
    help: "❓",

    plant: "🌱",
    water: "💧",
    harvest: "🌾",
    bug: "🐛",

    back: "◀️",
    refresh: "🔄",
    confirm: "✅",
    cancel: "❌",

    seed: "🌰",
    money: "💰",
    level: "⭐",
    info: "ℹ️",

    common: "⚪",
    uncommon: "🟢",
    rare: "🔵",
    epic: "🟣",
    legendary: "🟠",
    mythic: "🔴"
};


// ============================================================
// HELPER
// ============================================================

function safePlantEmoji(plant) {

    if (
        !plant ||
        typeof plant.emoji !== "string"
    ) {
        return EMOJI.plant;
    }

    const emoji =
        plant.emoji.trim();

    if (!emoji) {
        return EMOJI.plant;
    }

    return emoji;
}


function plantName(plant) {

    if (!plant) {
        return "Cây không xác định";
    }

    return (
        plant.nameVi ||
        plant.viName ||
        plant.name ||
        plant.id ||
        "Cây"
    );
}


function plantDescription(plant) {

    if (!plant) {
        return "";
    }

    return (
        plant.description ||
        "Một giống cây trong Nahida Farm."
    );
}


// ============================================================
// MAIN BUTTONS
// ============================================================

function mainButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home_farm")
                    .setLabel("Nông trại")
                    .setEmoji(EMOJI.farm)
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("home_inventory")
                    .setLabel("Túi đồ")
                    .setEmoji(EMOJI.inventory)
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId("home_shop")
                    .setLabel("Cửa hàng")
                    .setEmoji(EMOJI.shop)
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId("home_genetics")
                    .setLabel("Di truyền")
                    .setEmoji(EMOJI.genetics)
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId("home_help")
                    .setLabel("Trợ giúp")
                    .setEmoji(EMOJI.help)
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}


// ============================================================
// FARM BUTTONS
// ============================================================

function farmButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("farm_plant")
                    .setLabel("Gieo hạt")
                    .setEmoji(EMOJI.plant)
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("farm_water")
                    .setLabel("Tưới nước")
                    .setEmoji(EMOJI.water)
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId("farm_harvest")
                    .setLabel("Thu hoạch")
                    .setEmoji(EMOJI.harvest)
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("farm_bug")
                    .setLabel("Bắt sâu")
                    .setEmoji(EMOJI.bug)
                    .setStyle(
                        ButtonStyle.Danger
                    )
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji(EMOJI.home)
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}


// ============================================================
// BACK BUTTON
// ============================================================

function backButton() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji(EMOJI.home)
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}


// ============================================================
// GENETICS BUTTONS
// ============================================================

function geneticsButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("breed_start")
                    .setLabel("Lai cây")
                    .setEmoji(EMOJI.genetics)
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId("genetics_info")
                    .setLabel("Thông tin")
                    .setEmoji(EMOJI.info)
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji(EMOJI.home)
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}


// ============================================================
// SHOP SELECT
// ============================================================

function shopSelectMenu(user) {

    const plants =
        getAllPlants();

    if (!plants.length) {
        return backButton();
    }

    const options =
        plants
            .slice(0, 25)
            .map(plant => {

                const option =
                    new StringSelectMenuOptionBuilder()
                        .setLabel(
                            plantName(plant)
                                .slice(0, 100)
                        )
                        .setValue(
                            String(plant.id)
                                .slice(0, 100)
                        )
                        .setDescription(
                            `${getRarityStars(plant.rarity)} • Hạt giống: ${Number(plant.seedPrice || 0)} Mora`
                                .slice(0, 100)
                        );

                const emoji =
                    safePlantEmoji(plant);

                if (emoji) {
                    option.setEmoji(emoji);
                }

                return option;
            });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("shop_buy")
            .setPlaceholder("🌱 Chọn hạt giống muốn mua")
            .addOptions(options);

    return [

        new ActionRowBuilder()
            .addComponents(menu),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("shop_refresh")
                    .setLabel("Làm mới")
                    .setEmoji(EMOJI.refresh)
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji(EMOJI.home)
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}


// ============================================================
// PLANT SELECT MENU
// ============================================================

function plantSelectMenu(user) {

    const plants =
        getAllPlants();

    if (!plants.length) {
        return backButton();
    }

    let available =
        plants;

    try {

        const userData =
            getUser(user);

        const level =
            Number(
                userData?.level ||
                userData?.profile?.level ||
                1
            );

        available =
            plants.filter(
                plant =>
                    Number(
                        plant.unlockLevel || 1
                    ) <= level
            );

    } catch {

        available =
            plants;
    }

    if (!available.length) {
        return backButton();
    }

    /*
     * Discord giới hạn select menu 25 option.
     */
    const options =
        available
            .slice(0, 25)
            .map(plant => {

                const option =
                    new StringSelectMenuOptionBuilder()
                        .setLabel(
                            plantName(plant)
                                .slice(0, 100)
                        )
                        .setValue(
                            String(plant.id)
                                .slice(0, 100)
                        )
                        .setDescription(
                            `Hạt giống: ${Number(plant.seedPrice || 0)} Mora • ${getRarityStars(plant.rarity)}`
                                .slice(0, 100)
                        );

                const emoji =
                    safePlantEmoji(plant);

                if (emoji) {
                    option.setEmoji(emoji);
                }

                return option;
            });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("farm_plant_select")
            .setPlaceholder("🌱 Chọn giống cây")
            .addOptions(options);

    return [

        new ActionRowBuilder()
            .addComponents(menu),

        ...backButton()
    ];
}


// ============================================================
// PLOT SELECT
// ============================================================

function plotSelect(
    plots = []
) {

    if (!Array.isArray(plots)) {
        plots = [];
    }

    const options =
        plots
            .slice(0, 25)
            .map(plot => {

                const id =
                    Number(
                        plot.plot_id ??
                        plot.id ??
                        0
                    );

                return new StringSelectMenuOptionBuilder()
                    .setLabel(
                        `Ô đất ${id}`
                    )
                    .setValue(
                        String(id)
                    )
                    .setDescription(
                        plot.plant_id
                            ? `Đang trồng: ${plot.plant_id}`
                            : "Ô đất trống"
                    );
            });

    if (!options.length) {
        return backButton();
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("plot_select")
            .setPlaceholder("Chọn ô đất")
            .addOptions(options);

    return [

        new ActionRowBuilder()
            .addComponents(menu),

        ...backButton()
    ];
}


// ============================================================
// PLANT DETAIL BUTTONS
// ============================================================

function plantDetailButtons(
    plantId
) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return backButton();
    }

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `plant_info_${plant.id}`
                    )
                    .setLabel("Thông tin")
                    .setEmoji(EMOJI.info)
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `buy_${plant.id}`
                    )
                    .setLabel("Mua hạt")
                    .setEmoji(EMOJI.seed)
                    .setStyle(
                        ButtonStyle.Success
                    )
            ),

        ...backButton()
    ];
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    EMOJI,

    mainButtons,
    farmButtons,
    backButton,
    geneticsButtons,

    shopSelectMenu,
    plantSelectMenu,
    plotSelect,

    plantDetailButtons,

    safePlantEmoji,
    plantName,
    plantDescription
};