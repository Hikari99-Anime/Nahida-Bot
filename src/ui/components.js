const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../../database/plants");

const { BREED_COST } = require("../config");
const { getUser } = require("../game/user");
const { getPlots } = require("../game/plots");
const {
    plantName,
    plantEmoji,
    getSeedPrice
} = require("../game/plants");

// ============================================================
// MAIN BUTTONS
// ============================================================

function mainButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "home_farm"
                    )
                    .setLabel(
                        "Nông trại"
                    )
                    .setEmoji(
                        "🌱"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home_profile"
                    )
                    .setLabel(
                        "Hồ sơ"
                    )
                    .setEmoji(
                        "👤"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home_inventory"
                    )
                    .setLabel(
                        "Túi đồ"
                    )
                    .setEmoji(
                        "🎒"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "home_shop"
                    )
                    .setLabel(
                        "Cửa hàng"
                    )
                    .setEmoji(
                        "🛒"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home_genetics"
                    )
                    .setLabel(
                        "Lai tạo"
                    )
                    .setEmoji(
                        "🧬"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home_help"
                    )
                    .setLabel(
                        "Hướng dẫn"
                    )
                    .setEmoji(
                        "📖"
                    )
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
                    .setCustomId(
                        "farm_plant"
                    )
                    .setLabel(
                        "Gieo hạt"
                    )
                    .setEmoji(
                        "🌱"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "farm_water"
                    )
                    .setLabel(
                        "Tưới nước"
                    )
                    .setEmoji(
                        "💧"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "farm_harvest"
                    )
                    .setLabel(
                        "Thu hoạch"
                    )
                    .setEmoji(
                        "🌾"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "farm_bug"
                    )
                    .setLabel(
                        "Bắt sâu"
                    )
                    .setEmoji(
                        "🐛"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "home_profile"
                    )
                    .setLabel(
                        "Hồ sơ"
                    )
                    .setEmoji(
                        "👤"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home_inventory"
                    )
                    .setLabel(
                        "Túi đồ"
                    )
                    .setEmoji(
                        "🎒"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home"
                    )
                    .setLabel(
                        "Trang chủ"
                    )
                    .setEmoji(
                        "🏠"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}

// ============================================================
// BACK
// ============================================================

function backButton() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "home"
                    )
                    .setLabel(
                        "Trang chủ"
                    )
                    .setEmoji(
                        "🏠"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}

// ============================================================
// SHOP REFRESH BUTTON
// ============================================================

function shopRefreshButton() {

    return new ButtonBuilder()
        .setCustomId(
            "shop_refresh"
        )
        .setLabel(
            "Đổi shop"
        )
        .setEmoji(
            "🔄"
        )
        .setStyle(
            ButtonStyle.Primary
        );
}

// ============================================================
// SHOP MODAL
// ============================================================

function shopQuantityModal(
    plant
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                `shop_quantity_${plant.id}`
            )
            .setTitle(
                `Mua ${plantName(plant)}`.slice(
                    0,
                    45
                )
            );

    const input =
        new TextInputBuilder()
            .setCustomId(
                "quantity"
            )
            .setLabel(
                "Bạn muốn mua bao nhiêu hạt?"
            )
            .setPlaceholder(
                "Ví dụ: 1, 5, 10, 50..."
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
                4
            )
            .setValue(
                "1"
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                input
            )
    );

    return modal;
}

// ============================================================
// PLANT SELECT
// ============================================================

function plantSelectMenu(
    user
) {

    const data =
        getUser(user);

    let plants =
        [];

    if (
        typeof plantDatabase.getAvailablePlants ===
        "function"
    ) {

        plants =
            plantDatabase
                .getAvailablePlants(
                    data.level
                );
    }

    const hybridPlants =
        db.prepare(`
            SELECT *
            FROM bred_plants
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 25
        `).all(
            user.id
        );

    plants =
        [
            ...plants,
            ...hybridPlants
        ].slice(
            0,
            25
        );

    const options =
        plants.map(
            plant => ({

                label:
                    `${plantEmoji(plant)} ${plantName(plant)}`
                        .slice(
                            0,
                            100
                        ),

                description:
                    `${plant.region || "Hybrid"} • ${getSeedPrice(plant).toLocaleString()} Mora`
                        .slice(
                            0,
                            100
                        ),

                value:
                    plant.id
            })
        );

    if (!options.length) {
        return null;
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "select_plant"
            )
            .setPlaceholder(
                "🌱 Chọn hạt giống..."
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

                new ButtonBuilder()
                    .setCustomId(
                        "home_farm"
                    )
                    .setLabel(
                        "Quay lại"
                    )
                    .setEmoji(
                        "⬅️"
                    )
                    .setStyle(
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

    const available =
        plots.filter(
            p =>
                !p.plant_id
        );

    const rows =
        [];

    let row =
        new ActionRowBuilder();

    for (
        const plot of available
    ) {

        row.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `plant_${plantId}_${plot.plot_id}`
                )
                .setLabel(
                    `Ô ${plot.plot_id}`
                )
                .setEmoji(
                    "🟫"
                )
                .setStyle(
                    ButtonStyle.Success
                )
        );

        if (
            row.components.length >=
            5
        ) {

            rows.push(
                row
            );

            row =
                new ActionRowBuilder();
        }
    }

    if (
        row.components.length
    ) {

        rows.push(
            row
        );
    }

    return rows;
}

// ============================================================
// BREED START
// ============================================================

function geneticsButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "breed_start"
                    )
                    .setLabel(
                        "Lai cây"
                    )
                    .setEmoji(
                        "🧬"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "genetics_info"
                    )
                    .setLabel(
                        "Thông tin"
                    )
                    .setEmoji(
                        "📖"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home_farm"
                    )
                    .setLabel(
                        "Nông trại"
                    )
                    .setEmoji(
                        "🌱"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "home"
                    )
                    .setLabel(
                        "Trang chủ"
                    )
                    .setEmoji(
                        "🏠"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];
}

// ============================================================
// BREED CONFIRM BUTTON
// ============================================================

function breedConfirmButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "breed_confirm"
                    )
                    .setLabel(
                        `Xác nhận lai • ${BREED_COST} Mora`
                    )
                    .setEmoji(
                        "🧬"
                    )
                    .setStyle(
                        ButtonStyle.Success
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
            )
    ];
}

module.exports = {
    mainButtons,
    farmButtons,
    backButton,
    shopRefreshButton,
    geneticsButtons,
    breedConfirmButtons,
    shopQuantityModal,
    plantSelectMenu,
    plotSelect
};
