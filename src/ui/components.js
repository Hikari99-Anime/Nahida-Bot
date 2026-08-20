const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const {
    getUser
} = require("../game/user");

const {
    getPlots
} = require("../game/plots");


// ============================================================
// BUTTON HELPER
// ============================================================

function button(
    customId,
    label,
    emoji,
    style = ButtonStyle.Secondary
) {

    const builder =
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style);

    if (emoji) {
        builder.setEmoji(emoji);
    }

    return builder;
}


// ============================================================
// MAIN BUTTONS
// ============================================================

function mainButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                button(
                    "home_farm",
                    "Nông trại",
                    "🌱",
                    ButtonStyle.Success
                ),

                button(
                    "home_inventory",
                    "Túi đồ",
                    "🎒",
                    ButtonStyle.Secondary
                ),

                button(
                    "home_shop",
                    "Cửa hàng",
                    "🛒",
                    ButtonStyle.Primary
                ),

                button(
                    "home_profile",
                    "Hồ sơ",
                    "👤",
                    ButtonStyle.Secondary
                )

            ),

        new ActionRowBuilder()
            .addComponents(

                button(
                    "home_genetics",
                    "Di truyền",
                    "🧬",
                    ButtonStyle.Primary
                ),

                button(
                    "home_help",
                    "Hướng dẫn",
                    "📖",
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

                button(
                    "farm_plant",
                    "Gieo hạt",
                    "🌱",
                    ButtonStyle.Success
                ),

                button(
                    "farm_water",
                    "Tưới nước",
                    "💧",
                    ButtonStyle.Primary
                ),

                button(
                    "farm_harvest",
                    "Thu hoạch",
                    "🌾",
                    ButtonStyle.Success
                ),

                button(
                    "farm_bug",
                    "Bắt sâu",
                    "🐛",
                    ButtonStyle.Danger
                )

            ),

        new ActionRowBuilder()
            .addComponents(

                button(
                    "home_shop",
                    "Cửa hàng",
                    "🛒",
                    ButtonStyle.Primary
                ),

                button(
                    "home_inventory",
                    "Túi đồ",
                    "🎒",
                    ButtonStyle.Secondary
                ),

                button(
                    "home",
                    "Trang chủ",
                    "🏠",
                    ButtonStyle.Secondary
                )

            )
    ];
}


// ============================================================
// BACK BUTTON
// ============================================================

function backButton(
    customId = "home"
) {

    return [

        new ActionRowBuilder()
            .addComponents(

                button(
                    customId,
                    "Quay lại",
                    "↩️",
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

                button(
                    "genetics_hybrid",
                    "Lai cây",
                    "🧬",
                    ButtonStyle.Primary
                ),

                button(
                    "home_farm",
                    "Nông trại",
                    "🌱",
                    ButtonStyle.Success
                ),

                button(
                    "home",
                    "Trang chủ",
                    "🏠",
                    ButtonStyle.Secondary
                )

            )
    ];
}


// ============================================================
// SHOP REFRESH
// ============================================================

function shopRefreshButton() {

    return button(
        "shop_refresh",
        "Đổi shop",
        "🔄",
        ButtonStyle.Primary
    );
}


// ============================================================
// PLANT SELECT MENU
// ============================================================

function plantSelectMenu(
    user
) {

    const data =
        getUser(user);

    if (!data) {
        return backButton("home_farm");
    }

    /*
     * QUAN TRỌNG:
     *
     * Không require ../game/plants ở đây.
     *
     * Dùng database/plants trực tiếp để tránh:
     *
     * components.js
     *      ↓
     * game/plants.js
     *      ↓
     * components.js
     *
     * => circular dependency
     */

    const plants =
        require("../database/plants");

    let available = [];


    // --------------------------------------------------------
    // Lấy cây đã unlock
    // --------------------------------------------------------

    if (
        typeof plants.getAvailablePlants ===
        "function"
    ) {

        available =
            plants.getAvailablePlants(
                Number(data.level || 1)
            );

    } else if (
        typeof plants.getAllPlants ===
        "function"
    ) {

        available =
            plants
                .getAllPlants()
                .filter(
                    plant => {

                        if (!plant) {
                            return false;
                        }

                        if (!plant.id) {
                            return false;
                        }

                        if (
                            plant.unlockLevel ===
                            undefined
                        ) {
                            return true;
                        }

                        return (
                            Number(data.level || 1) >=
                            Number(plant.unlockLevel)
                        );
                    }
                );
    }


    // --------------------------------------------------------
    // Fallback nếu database export array
    // --------------------------------------------------------

    if (
        !Array.isArray(available)
    ) {

        available = [];
    }


    available =
        available
            .filter(
                plant =>
                    plant &&
                    plant.id
            )
            .slice(
                0,
                25
            );


    // --------------------------------------------------------
    // Không có cây
    // --------------------------------------------------------

    if (!available.length) {
        return backButton("home_farm");
    }


    // --------------------------------------------------------
    // Options
    // --------------------------------------------------------

    const options =
        available.map(
            plant => {

                const name =
                    String(
                        plant.name ||
                        plant.displayName ||
                        plant.id
                    );

                const emoji =
                    String(
                        plant.emoji ||
                        "🌱"
                    );

                return {

                    label:
                        `${emoji} ${name}`
                            .slice(0, 100),

                    value:
                        String(plant.id),

                    description:
                        `Chọn ${name}`
                            .slice(0, 100)

                };
            }
        );


    // --------------------------------------------------------
    // Select menu
    // --------------------------------------------------------

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "plant_select"
            )
            .setPlaceholder(
                "🌱 Chọn giống cây..."
            )
            .addOptions(
                options
            );


    // --------------------------------------------------------
    // Components
    // --------------------------------------------------------

    return [

        new ActionRowBuilder()
            .addComponents(
                menu
            ),

        new ActionRowBuilder()
            .addComponents(

                button(
                    "home_farm",
                    "Nông trại",
                    "🌱",
                    ButtonStyle.Success
                ),

                button(
                    "home",
                    "Trang chủ",
                    "🏠",
                    ButtonStyle.Secondary
                )

            )
    ];
}


// ============================================================
// PLOT SELECT
// ============================================================

function plotSelect(
    userId,
    plantId
) {

    const plots =
        getPlots(
            userId
        );


    if (
        !plots ||
        !plots.length
    ) {

        return backButton(
            "home_farm"
        );
    }


    const buttons = [];


    for (
        const plot of plots
    ) {

        if (!plot) {
            continue;
        }


        const occupied =
            Boolean(
                plot.plant_id
            );


        const label =
            `Ô ${plot.plot_id}`;


        const emoji =
            occupied
                ? "🌿"
                : "🟩";


        let customId;


        if (occupied) {

            customId =
                `plot_info_${plot.plot_id}`;

        } else {

            customId =
                `plant_${plantId}_${plot.plot_id}`;
        }


        buttons.push(

            button(
                customId,
                label,
                emoji,
                occupied
                    ? ButtonStyle.Secondary
                    : ButtonStyle.Success
            )

        );
    }


    const rows = [];


    // Discord tối đa 5 button / row

    for (
        let i = 0;
        i < buttons.length;
        i += 5
    ) {

        rows.push(

            new ActionRowBuilder()
                .addComponents(
                    buttons.slice(
                        i,
                        i + 5
                    )
                )

        );
    }


    // --------------------------------------------------------
    // Navigation
    // --------------------------------------------------------

    rows.push(

        new ActionRowBuilder()
            .addComponents(

                button(
                    "home_farm",
                    "Nông trại",
                    "🌱",
                    ButtonStyle.Success
                ),

                button(
                    "home",
                    "Trang chủ",
                    "🏠",
                    ButtonStyle.Secondary
                )

            )
    );


    return rows;
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    mainButtons,

    farmButtons,

    backButton,

    geneticsButtons,

    shopRefreshButton,

    plantSelectMenu,

    plotSelect

};