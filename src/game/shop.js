// src/game/shop.js
// ========================================
// 🛒 NAHIDA FARM - SHOP
// ========================================

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const { db } = require("../db");

const {
    SHOP_SIZE,
    SHOP_REFRESH_MS,
    SHOP_REFRESH_COST,
    FREE_SHOP_REFRESHES,
    MAX_BUY_QUANTITY,
    COLORS
} = require("../config");

const {
    now,
    getDayKey,
    unixSeconds,
    formatTime
} = require("../utils/time");

const {
    getUser,
    updateUser
} = require("./user");

const {
    getItemCount,
    addItem
} = require("./inventory");

const {
    getPlant,
    getAllPlants,
    getAvailablePlants,
    plantEmoji,
    plantName,
    plantGrowth,
    plantSeedPrice
} = require("./plants");

const {
    farmEmbed
} = require("../ui/embeds");

const {
    shopRefreshButton
} = require("../ui/components");


// ============================================================
// SHOP STATE
// ============================================================

function getShopState(userId) {

    let state =
        db.prepare(`
            SELECT *
            FROM shop_state
            WHERE user_id = ?
        `).get(userId);

    const today =
        getDayKey();


    // --------------------------------------------------------
    // Create state
    // --------------------------------------------------------

    if (!state) {

        state = {

            user_id:
                userId,

            seed_ids:
                "[]",

            refreshed_at:
                0,

            free_refreshes:
                FREE_SHOP_REFRESHES,

            refresh_day:
                today
        };

        db.prepare(`
            INSERT INTO shop_state
            (
                user_id,
                seed_ids,
                refreshed_at,
                free_refreshes,
                refresh_day
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(

            userId,

            "[]",

            0,

            FREE_SHOP_REFRESHES,

            today
        );

        return state;
    }


    // --------------------------------------------------------
    // Daily reset
    // --------------------------------------------------------

    if (
        state.refresh_day !==
        today
    ) {

        db.prepare(`
            UPDATE shop_state
            SET
                free_refreshes = ?,
                refresh_day = ?
            WHERE user_id = ?
        `).run(

            FREE_SHOP_REFRESHES,

            today,

            userId
        );

        state.free_refreshes =
            FREE_SHOP_REFRESHES;

        state.refresh_day =
            today;
    }


    return state;
}


// ============================================================
// SHOP POOL
// ============================================================

function getShopPool(userId) {

    const user =
        getUser(userId);

    const level =
        Number(
            user?.level || 1
        );

    const allPlants =
        getAllPlants();

    const availablePlants =
        getAvailablePlants(
            level
        );

    console.log(
        `[SHOP] User ${userId} Lv.${level}: ${availablePlants.length}/${allPlants.length} plants available`
    );

    console.log(
        "[SHOP] Available IDs:",
        availablePlants.map(
            plant =>
                plant?.id
        )
    );


    const pool =
        availablePlants.filter(
            plant =>
                plant &&
                plant.id
        );


    console.log(
        `[SHOP] Pool: ${pool.length}`
    );

    console.log(
        "[SHOP] Pool IDs:",
        pool.map(
            plant =>
                plant.id
        )
    );


    return pool;
}


// ============================================================
// RANDOM SHOP
// ============================================================

function randomShopPlants(userId) {

    const pool =
        getShopPool(userId);

    if (!pool.length) {
        return [];
    }


    const shuffled =
        [...pool];


    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            shuffled[i],
            shuffled[j]
        ] = [
            shuffled[j],
            shuffled[i]
        ];
    }


    const shopSize =
        Math.max(
            1,
            Number(
                SHOP_SIZE
            ) || 6
        );


    return shuffled.slice(
        0,
        Math.min(
            shopSize,
            shuffled.length
        )
    );
}


// ============================================================
// SAVE SHOP
// ============================================================

function saveShop(
    userId,
    plants,
    freeRefreshes
) {

    db.prepare(`
        INSERT INTO shop_state
        (
            user_id,
            seed_ids,
            refreshed_at,
            free_refreshes,
            refresh_day
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(user_id)
        DO UPDATE SET
            seed_ids =
                excluded.seed_ids,

            refreshed_at =
                excluded.refreshed_at,

            free_refreshes =
                excluded.free_refreshes,

            refresh_day =
                excluded.refresh_day
    `).run(

        userId,

        JSON.stringify(
            plants.map(
                plant =>
                    plant.id
            )
        ),

        now(),

        freeRefreshes,

        getDayKey()
    );
}


// ============================================================
// REFRESH SHOP
// ============================================================

function refreshShop(userId) {

    const plants =
        randomShopPlants(
            userId
        );

    const state =
        getShopState(
            userId
        );

    saveShop(
        userId,
        plants,
        Number(
            state.free_refreshes || 0
        )
    );

    console.log(
        `[SHOP] Refresh ${userId}:`,
        plants.map(
            plant =>
                plant.id
        )
    );

    return plants;
}


// ============================================================
// GET SHOP PLANTS
// ============================================================

function getShopPlants(userId) {

    const state =
        getShopState(
            userId
        );

    let ids = [];


    try {

        ids =
            JSON.parse(
                state.seed_ids ||
                "[]"
            );

    } catch {

        ids = [];
    }


    if (!Array.isArray(ids)) {
        ids = [];
    }


    const expired =
        !state.refreshed_at ||
        (
            now() -
            Number(
                state.refreshed_at
            )
        ) >=
        Number(
            SHOP_REFRESH_MS
        );


    if (
        expired ||
        !ids.length
    ) {

        return refreshShop(
            userId
        );
    }


    const plants =
        ids
            .map(
                id =>
                    getPlant(id)
            )
            .filter(Boolean);


    /*
     * QUAN TRỌNG:
     *
     * Không ép plants.length phải bằng
     * SHOP_SIZE nếu pool hiện tại nhỏ hơn.
     *
     * Ví dụ Lv.1 chỉ có:
     *
     * sweet_flower
     * mint
     *
     * => shop 2/16 là ĐÚNG.
     */

    const poolSize =
        getShopPool(
            userId
        ).length;

    const expectedSize =
        Math.min(
            Number(
                SHOP_SIZE
            ) || 6,
            poolSize
        );


    if (
        plants.length !==
        expectedSize
    ) {

        console.log(
            `[SHOP] Invalid shop ${plants.length}/${expectedSize}, refreshing`
        );

        return refreshShop(
            userId
        );
    }


    /*
     * Kiểm tra toàn bộ plant còn được unlock.
     */

    const valid =
        plants.every(
            plant =>
                plant &&
                Number(
                    plant.unlockLevel || 1
                ) <=
                Number(
                    getUser(userId)?.level || 1
                )
        );


    if (!valid) {

        return refreshShop(
            userId
        );
    }


    return plants;
}


// ============================================================
// REMAINING
// ============================================================

function getShopRemainingMs(userId) {

    const state =
        getShopState(
            userId
        );

    if (!state.refreshed_at) {
        return 0;
    }

    return Math.max(
        0,
        Number(
            SHOP_REFRESH_MS
        ) -
        (
            now() -
            Number(
                state.refreshed_at
            )
        )
    );
}


// ============================================================
// SHOP EMBED
// ============================================================

function shopEmbed(user) {

    const data =
        getUser(user);

    const plants =
        getShopPlants(
            user.id
        );

    const remaining =
        getShopRemainingMs(
            user.id
        );

    const state =
        getShopState(
            user.id
        );


    const lines = [];


    lines.push(
        `\`${user.username}\` — **Lv.${Number(data.level || 1)}**`
    );

    lines.push("");

    lines.push(
        `💰 **Mora:** ${Number(data.mora || 0).toLocaleString()}`
    );

    lines.push(
        `🔄 **Đổi miễn phí hôm nay:** ${Number(state.free_refreshes || 0)}/${FREE_SHOP_REFRESHES}`
    );

    lines.push("");

    lines.push(
        "🛒 **HẠT GIỐNG HÔM NAY**"
    );

    lines.push(
        `> Shop cá nhân • **${plants.length}/${Number(SHOP_SIZE) || 6}** loại`
    );


    if (remaining > 0) {

        const refreshAt =
            unixSeconds(
                now() +
                remaining
            );

        lines.push(
            `> ⏱️ Shop tự đổi <t:${refreshAt}:R>`
        );
    }


    lines.push("");


    if (!plants.length) {

        lines.push(
            "> 🌱 Hiện chưa có hạt giống nào được mở khóa."
        );

    } else {

        for (
            let i = 0;
            i < plants.length;
            i++
        ) {

            const plant =
                plants[i];

            const price =
                plantSeedPrice(
                    plant
                );

            const growth =
                plantGrowth(
                    plant
                );

            const owned =
                getItemCount(
                    user.id,
                    plant.id
                );


            lines.push(
                `${i + 1}. ${plantEmoji(plant)} **${plantName(plant)}**`
            );

            lines.push(
                `> 💰 **${Number(price).toLocaleString()} Mora** • ⏱️ ${formatTime(growth)}`
            );

            lines.push(
                `> 🎒 Đang có: **${owned}**`
            );

            lines.push("");
        }
    }


    lines.push(
        `💡 Đổi shop: **${FREE_SHOP_REFRESHES} lần miễn phí/ngày**, sau đó **${Number(SHOP_REFRESH_COST).toLocaleString()} Mora/lần**.`
    );


    return farmEmbed({

        user,

        title:
            "Cửa Hàng",

        description:
            lines.join("\n"),

        color:
            COLORS.gold
    });
}


// ============================================================
// SHOP SELECT MENU
// ============================================================

function shopSelectMenu(user) {

    const plants =
        getShopPlants(
            user.id
        );


    if (!plants.length) {

        return [

            new ActionRowBuilder()
                .addComponents(

                    shopRefreshButton(),

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
// FORCE REFRESH
// ============================================================

async function forceRefreshShop(
    interaction
) {

    const user =
        getUser(
            interaction.user
        );

    const state =
        getShopState(
            interaction.user.id
        );

    const today =
        getDayKey();


    let free =
        Number(
            state.free_refreshes || 0
        );


    if (
        state.refresh_day !==
        today
    ) {

        free =
            Number(
                FREE_SHOP_REFRESHES
            );
    }


    let cost = 0;


    if (free > 0) {

        free--;

    } else {

        cost =
            Number(
                SHOP_REFRESH_COST
            );

        if (
            Number(
                user.mora || 0
            ) <
            cost
        ) {

            return interaction.reply({

                content:
                    `❌ Bạn cần **${cost.toLocaleString()} Mora** để đổi shop.`,

                ephemeral:
                    true
            });
        }
    }


    const transaction =
        db.transaction(() => {

            const freshUser =
                getUser(
                    interaction.user.id
                );


            if (
                cost > 0 &&
                Number(
                    freshUser.mora || 0
                ) <
                cost
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }


            if (cost > 0) {

                updateUser(

                    interaction.user.id,

                    {
                        mora:
                            Number(
                                freshUser.mora || 0
                            ) -
                            cost
                    }
                );
            }


            const plants =
                randomShopPlants(
                    interaction.user.id
                );


            saveShop(
                interaction.user.id,
                plants,
                free
            );
        });


    try {

        transaction();

    } catch (error) {

        console.error(
            "forceRefreshShop error:",
            error
        );

        if (
            error.message ===
            "NOT_ENOUGH_MORA"
        ) {

            return interaction.reply({

                content:
                    "❌ Bạn không đủ Mora.",

                ephemeral:
                    true
            });
        }


        return interaction.reply({

            content:
                "❌ Không thể đổi shop.",

            ephemeral:
                true
        });
    }


    const newUser =
        getUser(
            interaction.user
        );

    const newState =
        getShopState(
            interaction.user.id
        );


    const message =
        cost === 0

            ? [
                "🎁 **Đổi shop miễn phí thành công!**",
                "",
                `> 🔄 Còn **${newState.free_refreshes}/${FREE_SHOP_REFRESHES}** lượt miễn phí hôm nay.`
            ].join("\n")

            : [
                "🔄 **Đổi shop thành công!**",
                "",
                `> 💰 Đã trả: **${cost.toLocaleString()} Mora**`,
                `> 💰 Còn lại: **${Number(newUser.mora || 0).toLocaleString()} Mora**`
            ].join("\n");


    return interaction.update({

        content:
            message,

        embeds: [
            shopEmbed(
                interaction.user
            )
        ],

        components:
            shopSelectMenu(
                interaction.user
            )
    });
}


// ============================================================
// BUY SEEDS
// ============================================================

async function buySeeds(
    interaction,
    plantId,
    quantity
) {

    const user =
        getUser(
            interaction.user
        );


    const plant =
        getPlant(
            plantId
        );


    if (!plant) {

        return interaction.reply({

            content:
                "❌ Không tìm thấy hạt giống.",

            ephemeral:
                true
        });
    }


    const shopPlants =
        getShopPlants(
            interaction.user.id
        );


    const inShop =
        shopPlants.some(
            p =>
                String(p.id) ===
                String(plant.id)
        );


    if (!inShop) {

        return interaction.reply({

            content:
                "❌ Hạt giống này không còn nằm trong shop hiện tại.",

            ephemeral:
                true
        });
    }


    const unlockLevel =
        Number(
            plant.unlockLevel || 1
        );


    if (
        Number(
            user.level || 1
        ) <
        unlockLevel
    ) {

        return interaction.reply({

            content:
                `🔒 Bạn cần **Lv.${unlockLevel}** để mua hạt giống này.`,

            ephemeral:
                true
        });
    }


    quantity =
        Number(
            quantity
        );


    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {

        return interaction.reply({

            content:
                "❌ Số lượng không hợp lệ.",

            ephemeral:
                true
        });
    }


    if (
        quantity >
        Number(
            MAX_BUY_QUANTITY
        )
    ) {

        return interaction.reply({

            content:
                `❌ Tối đa **${MAX_BUY_QUANTITY} hạt/lần**.`,

            ephemeral:
                true
        });
    }


    const price =
        Number(
            plantSeedPrice(
                plant
            )
        );


    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {

        return interaction.reply({

            content:
                "❌ Hạt giống này chưa có giá mua hợp lệ.",

            ephemeral:
                true
        });
    }


    const total =
        price *
        quantity;


    if (
        Number(
            user.mora || 0
        ) <
        total
    ) {

        return interaction.reply({

            content: [

                "❌ Không đủ Mora.",
                "",
                `${plantEmoji(plant)} ${plantName(plant)}`,
                `🔢 ×${quantity}`,
                `💰 Đơn giá: ${price.toLocaleString()} Mora`,
                `💰 Tổng: ${total.toLocaleString()} Mora`,
                `💰 Bạn có: ${Number(user.mora || 0).toLocaleString()} Mora`

            ].join("\n"),

            ephemeral:
                true
        });
    }


    const transaction =
        db.transaction(() => {

            const freshUser =
                getUser(
                    interaction.user.id
                );


            if (
                Number(
                    freshUser.mora || 0
                ) <
                total
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }


            updateUser(

                interaction.user.id,

                {
                    mora:
                        Number(
                            freshUser.mora || 0
                        ) -
                        total
                }
            );


            /*
             * Lưu hạt giống vào inventory.
             *
             * Đây là điểm quan trọng:
             *
             * Mua hạt:
             * shop -> inventory
             *
             * Gieo:
             * inventory -> plot
             */

            addItem(
                interaction.user.id,
                plant.id,
                quantity
            );
        });


    try {

        transaction();

    } catch (error) {

        console.error(
            "buySeeds error:",
            error
        );

        if (
            error.message ===
            "NOT_ENOUGH_MORA"
        ) {

            return interaction.reply({

                content:
                    "❌ Bạn không đủ Mora.",

                ephemeral:
                    true
            });
        }


        return interaction.reply({

            content:
                "❌ Không thể mua hạt giống.",

            ephemeral:
                true
        });
    }


    const newUser =
        getUser(
            interaction.user
        );


    const owned =
        getItemCount(
            interaction.user.id,
            plant.id
        );


    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Mua Hạt Giống",

                description: [

                    `${plantEmoji(plant)} **${plantName(plant)}**`,
                    "",
                    `> 🌱 Đã mua: **×${quantity}**`,
                    `> 💰 Đơn giá: **${price.toLocaleString()} Mora**`,
                    `> 💰 Tổng: **-${total.toLocaleString()} Mora**`,
                    `> 🎒 Trong túi: **×${owned}**`,
                    `> 💰 Còn lại: **${Number(newUser.mora || 0).toLocaleString()} Mora**`

                ].join("\n"),

                color:
                    COLORS.gold
            })
        ],

        components:
            shopSelectMenu(
                interaction.user
            )
    });
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    getShopState,
    getShopPool,
    randomShopPlants,
    refreshShop,
    getShopPlants,
    getShopRemainingMs,
    shopEmbed,
    shopSelectMenu,
    forceRefreshShop,
    buySeeds
};