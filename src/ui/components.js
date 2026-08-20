// ============================================================
// src/ui/components.js
// ============================================================
// 🌱 NAHIDA FARM - DISCORD COMPONENTS
// ============================================================

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
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
            .setCustomId(
                String(customId)
            )
            .setLabel(
                String(label)
            )
            .setStyle(
                style
            );

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
// SHOP REFRESH BUTTON
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
// SHOP QUANTITY MODAL
// ============================================================
// Interaction handler của bạn đang gọi:
//
// shopQuantityModal(plantId)
//
// Vì vậy function này bắt buộc phải export.
// ============================================================

function shopQuantityModal(
    plantId
) {

    const id =
        String(
            plantId || ""
        );

    const modal =
        new ModalBuilder()
            .setCustomId(
                `shop_quantity_${id}`
            )
            .setTitle(
                "🛒 Mua hạt giống"
            );

    const quantityInput =
        new TextInputBuilder()
            .setCustomId(
                "quantity"
            )
            .setLabel(
                "Số lượng muốn mua"
            )
            .setPlaceholder(
                "Nhập số lượng, ví dụ: 10"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(
                true
            )
            .setMinLength(
                1
            )
            .setMaxLength(
                3
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                quantityInput
            );

    modal.addComponents(
        row
    );

    return modal;
}


// ============================================================
// PLANT SELECT MENU
// ============================================================

function plantSelectMenu(
    user
) {

    const data =
        getUser(
            user
        );

    if (!data) {
        return backButton(
            "home_farm"
        );
    }

    // ========================================================
    // QUAN TRỌNG
    // ========================================================
    //
    // Không dùng:
    //
    // require("../database/plants")
    //
    // nữa.
    //
    // Shop và farm đều phải dùng cùng một plants.js:
    //
    // src/game/plants.js
    //
    // ========================================================

    const plants =
        require("../game/plants");

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
                Number(
                    data.level || 1
                )
            );

    }

    // --------------------------------------------------------
    // Fallback
    // --------------------------------------------------------

    else if (
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
                            Number(
                                data.level || 1
                            ) >=
                            Number(
                                plant.unlockLevel
                            )
                        );
                    }
                );
    }


    if (
        !Array.isArray(
            available
        )
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

    if (
        !available.length
    ) {

        return backButton(
            "home_farm"
        );

    }


    // --------------------------------------------------------
    // Options
    // --------------------------------------------------------

    const options =
        available.map(
            plant => {

                const name =
                    String(
                        plant.nameVi ||
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
                            .slice(
                                0,
                                100
                            ),

                    value:
                        String(
                            plant.id
                        ),

                    description:
                        `Chọn ${name}`
                            .slice(
                                0,
                                100
                            )

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
// SHOP SELECT MENU
// ============================================================
// Có thể dùng function này nếu handler cần lấy shop menu
// trực tiếp từ components.js.
// ============================================================

function shopSelectMenu(
    user
) {

    const {
        getShopPlants
    } = require("../game/shop");

    const {
        plantEmoji,
        plantName,
        plantSeedPrice
    } = require("../game/plants");

    const {
        getItemCount
    } = require("../game/inventory");

    const plants =
        getShopPlants(
            user.id
        );

    // --------------------------------------------------------
    // Shop rỗng
    // --------------------------------------------------------

    if (
        !plants ||
        !plants.length
    ) {

        return [

            new ActionRowBuilder()
                .addComponents(

                    shopRefreshButton(),

                    button(
                        "home",
                        "Trang chủ",
                        "🏠",
                        ButtonStyle.Secondary
                    )

                )

        ];
    }


    // --------------------------------------------------------
    // Options
    // --------------------------------------------------------

    const options =
        plants.map(
            plant => {

                const price =
                    plantSeedPrice(
                        plant
                    );

                const owned =
                    getItemCount(
                        user.id,
                        plant.id
                    );

                return {

                    label:
                        `${plantEmoji(plant)} ${plantName(plant)}`
                            .slice(
                                0,
                                100
                            ),

                    description:
                        `${Number(price).toLocaleString()} Mora • Đang có: ${owned}`
                            .slice(
                                0,
                                100
                            ),

                    value:
                        String(
                            plant.id
                        )

                };

            }
        );


    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "shop_buy"
            )
            .setPlaceholder(
                "🛒 Chọn hạt giống muốn mua..."
            )
            .addOptions(
                options
            );


    return [

        new ActionRowBuilder()
            .addComponents(
                menu
            ),

        new ActionRowBuilder()
            .addComponents(

                shopRefreshButton(),

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

        }

        else {

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

    // Buttons
    mainButtons,
    farmButtons,
    backButton,
    geneticsButtons,

    // Shop
    shopRefreshButton,
    shopQuantityModal,
    shopSelectMenu,

    // Farm
    plantSelectMenu,
    plotSelect

};