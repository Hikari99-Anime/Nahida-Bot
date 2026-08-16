// ============================================================
// 🌱 NAHIDA FARM
// index.js
//
// SHOP
// - 5 seeds / user
// - tự refresh 30 phút
// - 3 lần đổi shop miễn phí / ngày
// - lần tiếp theo: 50 Mora
//
// FARM
// - live Discord timer
// - gieo / tưới / thu hoạch / bắt sâu
//
// GENETICS
// - lai cây bố + cây mẹ
// - gene inheritance
// - mutation
// - hybrid plant lưu vào DB
// ============================================================

require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const Database = require("better-sqlite3");
const path = require("path");

const plantDatabase =
    require("./database/plants");

// ============================================================
// DATABASE
// ============================================================

const dbPath =
    path.join(
        __dirname,
        "nahidafarm.sqlite"
    );

const db =
    new Database(dbPath);

db.pragma(
    "journal_mode = WAL"
);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    mora INTEGER DEFAULT 1000,
    luck INTEGER DEFAULT 0,
    water INTEGER DEFAULT 100,
    farm_level INTEGER DEFAULT 1,
    farm_xp INTEGER DEFAULT 25,
    harvest_count INTEGER DEFAULT 0,
    bug_count INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS plots (
    user_id TEXT NOT NULL,
    plot_id INTEGER NOT NULL,
    plant_id TEXT,
    planted_at INTEGER,
    finish_at INTEGER,
    watered INTEGER DEFAULT 0,
    mutation TEXT,
    PRIMARY KEY(user_id, plot_id)
);

CREATE TABLE IF NOT EXISTS shop_state (
    user_id TEXT PRIMARY KEY,
    seed_ids TEXT NOT NULL,
    refreshed_at INTEGER NOT NULL,
    free_refreshes INTEGER DEFAULT 3,
    refresh_day TEXT
);

CREATE TABLE IF NOT EXISTS bred_plants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    parent_a TEXT NOT NULL,
    parent_b TEXT NOT NULL,
    name TEXT NOT NULL,
    name_vi TEXT,
    emoji TEXT DEFAULT '🌱',
    growth_time INTEGER DEFAULT 60,
    yield_min INTEGER DEFAULT 1,
    yield_max INTEGER DEFAULT 1,
    water_cost INTEGER DEFAULT 10,
    sell_price INTEGER DEFAULT 5,
    rarity REAL DEFAULT 1,
    growth_gene REAL DEFAULT 1,
    yield_gene REAL DEFAULT 1,
    water_gene REAL DEFAULT 1,
    rarity_gene REAL DEFAULT 1,
    mutation_gene REAL DEFAULT 1,
    mutation_id TEXT,
    mutation_name TEXT,
    mutation_emoji TEXT,
    created_at INTEGER
);
`);

// ============================================================
// CONSTANTS
// ============================================================

const PREFIX = "n";
// ============================================================
// ADMIN
// ============================================================

const ADMIN_ID =
    process.env.ADMIN_ID || "";

function isAdmin(user) {

    if (!ADMIN_ID) {
        return false;
    }

    return String(user.id) ===
        String(ADMIN_ID);
}

function adminOnly(interactionOrMessage) {

    const user =
        interactionOrMessage.user ||
        interactionOrMessage.author;

    return isAdmin(user);
}
const COLORS = {
    green: 0x78C850,
    dendro: 0x6FBF4A,
    darkGreen: 0x31572C,
    water: 0x4EA5D9,
    gold: 0xE7B84B,
    purple: 0x9B72CF,
    pink: 0xE58AB5,
    red: 0xD9534F,
    gray: 0x687078,
    white: 0xF5F5F5
};

const MAX_WATER =
    100;

const DEFAULT_PLOTS =
    5;

// ============================================================
// SHOP CONFIG
// ============================================================

const SHOP_SIZE =
    5;

const SHOP_REFRESH_MS =
    30 * 60 * 1000;

const SHOP_REFRESH_COST =
    50;

const FREE_SHOP_REFRESHES =
    3;

const MAX_BUY_QUANTITY =
    999;

// ============================================================
// BREEDING CONFIG
// ============================================================

const BREED_COST =
    100;

const BREED_COOLDOWN_MS =
    5 * 60 * 1000;

const BREED_MAX_PARENT_LEVEL =
    1;

// ============================================================
// CLIENT
// ============================================================

const client =
    new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ],
        partials: [
            Partials.Channel
        ]
    });

// ============================================================
// TIME
// ============================================================

function now() {
    return Date.now();
}

function unixSeconds(
    timestamp
) {
    return Math.floor(
        Number(timestamp) / 1000
    );
}

function getDayKey() {

    const date =
        new Date();

    return [
        date.getFullYear(),
        String(
            date.getMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getDate()
        ).padStart(2, "0")
    ].join("-");
}

// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(seconds) {

    seconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );

    const h =
        Math.floor(
            seconds / 3600
        );

    const m =
        Math.floor(
            (seconds % 3600) / 60
        );

    const s =
        seconds % 60;

    if (h > 0) {

        return `${h} giờ ${m} phút`;

    }

    if (m > 0) {

        return `${m} phút ${s} giây`;

    }

    return `${s} giây`;
}

// ============================================================
// USER
// ============================================================

function getUser(user) {

    const id =
        typeof user === "string"
            ? user
            : user.id;

    let row =
        db.prepare(`
            SELECT *
            FROM users
            WHERE id = ?
        `).get(id);

    if (!row) {

        db.prepare(`
            INSERT INTO users
            (
                id,
                username,
                level,
                xp,
                mora,
                luck,
                water,
                farm_level,
                farm_xp,
                harvest_count,
                bug_count,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                1,
                0,
                1000,
                0,
                100,
                1,
                25,
                0,
                0,
                ?,
                ?
            )
        `).run(
            id,
            typeof user === "string"
                ? "Unknown"
                : user.username,
            now(),
            now()
        );

        row =
            db.prepare(`
                SELECT *
                FROM users
                WHERE id = ?
            `).get(id);
    }

    return row;
}

function updateUser(
    id,
    fields
) {

    const keys =
        Object.keys(fields);

    if (!keys.length) {
        return;
    }

    const set =
        keys
            .map(
                key =>
                    `${key} = @${key}`
            )
            .join(", ");

    db.prepare(`
        UPDATE users
        SET
            ${set},
            updated_at = @updated_at
        WHERE id = @id
    `).run({
        ...fields,
        updated_at: now(),
        id
    });
}

// ============================================================
// XP
// ============================================================

function xpRequired(
    level
) {

    return Math.floor(
        100 +
        ((level - 1) * 50)
    );
}

function addXP(
    userId,
    amount
) {

    const user =
        getUser(userId);

    let xp =
        user.xp +
        Math.max(
            0,
            amount
        );

    let level =
        user.level;

    let levelUps =
        0;

    while (
        xp >=
        xpRequired(level)
    ) {

        xp -=
            xpRequired(level);

        level++;
        levelUps++;
    }

    updateUser(
        userId,
        {
            xp,
            level
        }
    );

    return {
        level,
        xp,
        levelUps
    };
}

function addFarmXP(
    userId,
    amount
) {

    const user =
        getUser(userId);

    let farmXP =
        user.farm_xp +
        Math.max(
            0,
            amount
        );

    let farmLevel =
        user.farm_level;

    while (
        farmXP >=
        farmLevel * 100
    ) {

        farmXP -=
            farmLevel * 100;

        farmLevel++;
    }

    updateUser(
        userId,
        {
            farm_xp: farmXP,
            farm_level: farmLevel
        }
    );

    return {
        farmLevel,
        farmXP
    };
}

// ============================================================
// INVENTORY
// ============================================================

function getItem(
    userId,
    itemId
) {

    return db.prepare(`
        SELECT *
        FROM inventory
        WHERE user_id = ?
        AND item_id = ?
    `).get(
        userId,
        itemId
    );
}

function getItemCount(
    userId,
    itemId
) {

    const item =
        getItem(
            userId,
            itemId
        );

    return item
        ? item.quantity
        : 0;
}

function addItem(
    userId,
    itemId,
    amount
) {

    if (
        amount === 0
    ) {
        return;
    }

    const current =
        getItemCount(
            userId,
            itemId
        );

    const quantity =
        Math.max(
            0,
            current + amount
        );

    if (
        quantity <= 0
    ) {

        db.prepare(`
            DELETE FROM inventory
            WHERE user_id = ?
            AND item_id = ?
        `).run(
            userId,
            itemId
        );

        return;
    }

    db.prepare(`
        INSERT INTO inventory
        (
            user_id,
            item_id,
            quantity
        )
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, item_id)
        DO UPDATE SET
            quantity =
                excluded.quantity
    `).run(
        userId,
        itemId,
        quantity
    );
}

function getInventory(
    userId
) {

    return db.prepare(`
        SELECT *
        FROM inventory
        WHERE user_id = ?
        AND quantity > 0
        ORDER BY item_id
    `).all(
        userId
    );
}

// ============================================================
// PLOTS
// ============================================================

function ensurePlots(
    userId
) {

    for (
        let i = 1;
        i <= DEFAULT_PLOTS;
        i++
    ) {

        const exists =
            db.prepare(`
                SELECT 1
                FROM plots
                WHERE user_id = ?
                AND plot_id = ?
            `).get(
                userId,
                i
            );

        if (!exists) {

            db.prepare(`
                INSERT INTO plots
                (
                    user_id,
                    plot_id,
                    plant_id,
                    planted_at,
                    finish_at,
                    watered,
                    mutation
                )
                VALUES (
                    ?,
                    ?,
                    NULL,
                    NULL,
                    NULL,
                    0,
                    NULL
                )
            `).run(
                userId,
                i
            );
        }
    }
}

function getPlots(
    userId
) {

    ensurePlots(
        userId
    );

    return db.prepare(`
        SELECT *
        FROM plots
        WHERE user_id = ?
        ORDER BY plot_id
    `).all(
        userId
    );
}

function getPlot(
    userId,
    plotId
) {

    ensurePlots(
        userId
    );

    return db.prepare(`
        SELECT *
        FROM plots
        WHERE user_id = ?
        AND plot_id = ?
    `).get(
        userId,
        plotId
    );
}

function isReady(
    plot
) {

    return (
        plot &&
        plot.plant_id &&
        Number(
            plot.finish_at
        ) <= now()
    );
}

// ============================================================
// PLANT HELPERS
// ============================================================

function getHybridPlant(
    plantId
) {

    return db.prepare(`
        SELECT *
        FROM bred_plants
        WHERE id = ?
    `).get(
        plantId
    );
}

function isHybridPlant(
    plantId
) {

    return !!getHybridPlant(
        plantId
    );
}

function getPlant(
    plantId
) {

    if (
        isHybridPlant(
            plantId
        )
    ) {

        return getHybridPlant(
            plantId
        );
    }

    return plantDatabase.getPlant(
        plantId
    );
}

function plantName(
    plant
) {

    if (!plant) {
        return "Cây không xác định";
    }

    return (
        plant.name_vi ||
        plant.nameVi ||
        plant.viName ||
        plant.name ||
        plant.id
    );
}

function plantEmoji(
    plant
) {

    return (
        plant?.emoji ||
        "🌱"
    );
}

function plantGrowth(
    plant
) {

    if (
        plant.growth_time
    ) {

        return Math.max(
            1,
            Number(
                plant.growth_time
            )
        );
    }

    return Math.max(
        1,
        Number(
            plant.growthTime
        ) ||
        Number(
            plantDatabase.getGrowthTime(
                plant.id
            )
        ) ||
        1
    );
}

function plantYield(
    plant
) {

    if (
        plant.yield_min
    ) {

        const min =
            Number(
                plant.yield_min
            );

        const max =
            Number(
                plant.yield_max
            ) || min;

        return (
            min +
            Math.floor(
                Math.random() *
                (
                    max -
                    min +
                    1
                )
            )
        );
    }

    if (
        typeof plantDatabase.getYield ===
        "function"
    ) {

        return plantDatabase.getYield(
            plant.id
        );
    }

    if (
        typeof plant.yield ===
        "number"
    ) {

        return plant.yield;
    }

    if (
        plant.yield &&
        typeof plant.yield ===
        "object"
    ) {

        const min =
            Number(
                plant.yield.min
            ) || 1;

        const max =
            Number(
                plant.yield.max
            ) || min;

        return (
            min +
            Math.floor(
                Math.random() *
                (
                    max -
                    min +
                    1
                )
            )
        );
    }

    return 1;
}

function plantSellPrice(
    plant
) {

    if (
        plant.sell_price
    ) {

        return Math.max(
            0,
            Number(
                plant.sell_price
            )
        );
    }

    return Math.max(
        0,
        Number(
            plantDatabase.getSellPrice(
                plant.id
            )
        ) || 0
    );
}

function plantWaterCost(
    plant
) {

    if (
        plant.water_cost
    ) {

        return Math.max(
            1,
            Number(
                plant.water_cost
            )
        );
    }

    return Math.max(
        1,
        Number(
            plantDatabase.getWaterCost(
                plant.id
            )
        ) || 1
    );
}

// ============================================================
// SEED PRICE
// ============================================================

function getSeedPrice(
    plant
) {

    if (!plant) {
        return 0;
    }

    const direct =
        Number(
            plant.seedPrice
        );

    if (
        Number.isFinite(
            direct
        ) &&
        direct > 0
    ) {

        return Math.floor(
            direct
        );
    }

    const sell =
        plantSellPrice(
            plant
        );

    const growth =
        plantGrowth(
            plant
        );

    const rarity =
        Number(
            plant.rarity
        ) || 1;

    return Math.max(
        10,
        Math.floor(
            (
                sell * 3
            ) +
            (
                growth * 0.25
            ) +
            (
                rarity * 10
            )
        )
    );
}

// ============================================================
// FARM EMBED
// ============================================================

function farmEmbed({
    user,
    title,
    description,
    color
}) {

    const data =
        getUser(user);

    return new EmbedBuilder()
        .setColor(
            color ||
            COLORS.green
        )
        .setTitle(
            `🌱 ${title}`
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                `${user.username} • Lv.${data.level} • 💰 ${data.mora.toLocaleString()} Mora`
        })
        .setTimestamp();
}

// ============================================================
// HOME
// ============================================================

function homeEmbed(
    user
) {

    const data =
        getUser(user);

    const text = [
        `\`${user.username}\` — **Lv.${data.level}**`,
        "",
        "> “Mỗi hạt giống đều mang trong mình",
        "> một giấc mơ nhỏ.”",
        "> — Nahida",
        "",
        `💰 ${data.mora.toLocaleString()} Mora`,
        `💧 ${data.water}/100 Nước`,
        "",
        "🌱 Chăm sóc khu vườn của bạn,",
        "lai tạo giống cây mới và khám phá",
        "những đột biến hiếm."
    ].join("\n");

    return farmEmbed({
        user,
        title: "Khu Vườn",
        description: text,
        color: COLORS.green
    });
}

// ============================================================
// PROFILE
// ============================================================

function profileEmbed(
    user
) {

    const data =
        getUser(user);

    const text = [
        `\`${user.username}\``,
        "",
        `⭐ Level: **${data.level}**`,
        `✨ EXP: **${data.xp}/${xpRequired(data.level)}**`,
        `🌱 Farm Level: **${data.farm_level}**`,
        `🌾 Farm EXP: **${data.farm_xp}/${data.farm_level * 100}**`,
        "",
        `💰 Mora: **${data.mora.toLocaleString()}**`,
        `💧 Nước: **${data.water}/100**`,
        "",
        `🌾 Đã thu hoạch: **${data.harvest_count}**`,
        `🐛 Đã bắt sâu: **${data.bug_count}**`
    ].join("\n");

    return farmEmbed({
        user,
        title: "Hồ Sơ",
        description: text,
        color: COLORS.purple
    });
}

// ============================================================
// INVENTORY
// ============================================================

function inventoryEmbed(
    user
) {

    const items =
        getInventory(
            user.id
        );

    const lines = [
        `\`${user.username}\` — **Lv.${getUser(user).level}**`,
        "",
        "🎒 **TÚI ĐỒ**",
        ""
    ];

    if (!items.length) {

        lines.push(
            "> 🎒 Túi đồ đang trống."
        );

    } else {

        for (
            const item of items
        ) {

            const plant =
                getPlant(
                    item.item_id
                );

            if (!plant) {
                continue;
            }

            lines.push(
                `${plantEmoji(plant)} **${plantName(plant)}** ×${item.quantity}`
            );
        }
    }

    return farmEmbed({
        user,
        title: "Túi Đồ",
        description:
            lines.join("\n"),
        color:
            COLORS.gray
    });
}

// ============================================================
// SHOP STATE
// ============================================================

function getShopState(
    userId
) {

    let state =
        db.prepare(`
            SELECT *
            FROM shop_state
            WHERE user_id = ?
        `).get(
            userId
        );

    const today =
        getDayKey();

    if (!state) {

        state = {
            user_id: userId,
            seed_ids: "[]",
            refreshed_at: 0,
            free_refreshes:
                FREE_SHOP_REFRESHES,
            refresh_day: today
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
// SHOP PLANT POOL
// ============================================================

function getShopPool(
    userId
) {

    const user =
        getUser(userId);

    let plants =
        [];

    if (
        typeof plantDatabase.getAvailablePlants ===
        "function"
    ) {

        plants =
            plantDatabase
                .getAvailablePlants(
                    user.level
                )
                .filter(
                    p =>
                        p &&
                        p.id
                );
    } else if (
        typeof plantDatabase.getAllPlants ===
        "function"
    ) {

        plants =
            plantDatabase
                .getAllPlants()
                .filter(
                    p =>
                        p &&
                        p.id &&
                        (
                            p.unlockLevel === undefined ||
                            user.level >=
                            Number(
                                p.unlockLevel
                            )
                        )
                );
    }

    return plants;
}

// ============================================================
// RANDOM SHOP
// ============================================================

function randomShopPlants(
    userId
) {

    const pool =
        getShopPool(
            userId
        );

    if (!pool.length) {
        return [];
    }

    const shuffled =
        [...pool];

    for (
        let i =
            shuffled.length - 1;
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
        ] =
        [
            shuffled[j],
            shuffled[i]
        ];
    }

    return shuffled
        .slice(
            0,
            Math.min(
                SHOP_SIZE,
                shuffled.length
            )
        );
}

// ============================================================
// REFRESH SHOP
// ============================================================

function refreshShop(
    userId
) {

    const plants =
        randomShopPlants(
            userId
        );

    const ids =
        plants.map(
            p => p.id
        );

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
                excluded.refreshed_at
    `).run(
        userId,
        JSON.stringify(ids),
        now(),
        getShopState(userId)
            .free_refreshes,
        getDayKey()
    );

    return plants;
}

// ============================================================
// GET SHOP PLANTS
// ============================================================

function getShopPlants(
    userId
) {

    let state =
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

    const expired =
        !state.refreshed_at ||
        (
            now() -
            Number(
                state.refreshed_at
            )
        >=
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

    if (
        plants.length <
        Math.min(
            SHOP_SIZE,
            getShopPool(userId).length
        )
    ) {

        return refreshShop(
            userId
        );
    }

    return plants;
}

// ============================================================
// SHOP REMAINING
// ============================================================

function getShopRemainingMs(
    userId
) {

    const state =
        getShopState(
            userId
        );

    if (
        !state.refreshed_at
    ) {

        return 0;
    }

    return Math.max(
        0,
        SHOP_REFRESH_MS -
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

function shopEmbed(
    user
) {

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
        `\`${user.username}\` — **Lv.${data.level}**`
    );

    lines.push("");

    lines.push(
        `💰 **Mora:** ${data.mora.toLocaleString()}`
    );

    lines.push(
        `🔄 **Đổi miễn phí hôm nay:** ${state.free_refreshes}/${FREE_SHOP_REFRESHES}`
    );

    lines.push("");

    lines.push(
        "🛒 **HẠT GIỐNG HÔM NAY**"
    );

    lines.push(
        `> Shop cá nhân • **${plants.length}/${SHOP_SIZE}** loại`
    );

    if (
        remaining > 0
    ) {

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
                getSeedPrice(
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
                `> 💰 **${price.toLocaleString()} Mora** • ⏱️ ${formatTime(growth)}`
            );

            lines.push(
                `> 🎒 Đang có: **${owned}**`
            );

            lines.push("");
        }
    }

    lines.push(
        `💡 Đổi shop: **3 lần miễn phí/ngày**, sau đó **${SHOP_REFRESH_COST} Mora/lần**.`
    );

    return farmEmbed({
        user,
        title: "Cửa Hàng",
        description:
            lines.join("\n"),
        color:
            COLORS.gold
    });
}

// ============================================================
// SHOP SELECT
// ============================================================

function shopSelectMenu(
    user
) {

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
                    getSeedPrice(
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
                        `${price.toLocaleString()} Mora • Đang có: ${owned}`
                            .slice(
                                0,
                                100
                            ),

                    value:
                        plant.id
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
// FORCE REFRESH SHOP
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
            state.free_refreshes
        );

    if (
        state.refresh_day !==
        today
    ) {

        free =
            FREE_SHOP_REFRESHES;
    }

    let cost =
        0;

    if (
        free > 0
    ) {

        free--;

    } else {

        cost =
            SHOP_REFRESH_COST;

        if (
            user.mora <
            cost
        ) {

            return interaction.reply({
                content:
                    `❌ Bạn cần **${cost.toLocaleString()} Mora** để đổi shop.`,
                ephemeral: true
            });
        }
    }

    const transaction =
        db.transaction(() => {

            const fresh =
                getUser(
                    interaction.user.id
                );

            if (
                cost > 0 &&
                fresh.mora <
                cost
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }

            if (
                cost > 0
            ) {

                updateUser(
                    interaction.user.id,
                    {
                        mora:
                            fresh.mora -
                            cost
                    }
                );
            }

            const plants =
                randomShopPlants(
                    interaction.user.id
                );

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
                interaction.user.id,
                JSON.stringify(
                    plants.map(
                        p => p.id
                    )
                ),
                now(),
                free,
                today
            );
        });

    try {

        transaction();

    } catch (error) {

        if (
            error.message ===
            "NOT_ENOUGH_MORA"
        ) {

            return interaction.reply({
                content:
                    "❌ Bạn không đủ Mora.",
                ephemeral: true
            });
        }

        throw error;
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
            ? `🎁 **Đổi shop miễn phí thành công!**\n\n> 🔄 Còn **${newState.free_refreshes}/${FREE_SHOP_REFRESHES}** lượt miễn phí hôm nay.`
            : `🔄 **Đổi shop thành công!**\n\n> 💰 Đã trả: **${cost.toLocaleString()} Mora**\n> 💰 Còn lại: **${newUser.mora.toLocaleString()} Mora**`;

    return interaction.update({

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
            ephemeral: true
        });
    }

    const shopPlants =
        getShopPlants(
            interaction.user.id
        );

    const inShop =
        shopPlants.some(
            p =>
                p.id ===
                plant.id
        );

    if (!inShop) {

        return interaction.reply({
            content:
                "❌ Hạt giống này không còn nằm trong shop hiện tại.",
            ephemeral: true
        });
    }

    if (
        !isHybridPlant(
            plant.id
        ) &&
        plant.unlockLevel !==
        undefined &&
        user.level <
        Number(
            plant.unlockLevel
        )
    ) {

        return interaction.reply({
            content:
                `🔒 Bạn cần **Lv.${plant.unlockLevel}** để mua hạt giống này.`,
            ephemeral: true
        });
    }

    quantity =
        Number(
            quantity
        );

    if (
        !Number.isInteger(
            quantity
        ) ||
        quantity <= 0
    ) {

        return interaction.reply({
            content:
                "❌ Số lượng không hợp lệ.",
            ephemeral: true
        });
    }

    if (
        quantity >
        MAX_BUY_QUANTITY
    ) {

        return interaction.reply({
            content:
                `❌ Tối đa **${MAX_BUY_QUANTITY} hạt/lần**.`,
            ephemeral: true
        });
    }

    const price =
        getSeedPrice(
            plant
        );

    const total =
        price *
        quantity;

    if (
        user.mora <
        total
    ) {

        return interaction.reply({
            content:
                `❌ Không đủ Mora.\n\n` +
                `🌱 ${plantName(plant)}\n` +
                `🔢 ×${quantity}\n` +
                `💰 Đơn giá: ${price.toLocaleString()} Mora\n` +
                `💰 Tổng: ${total.toLocaleString()} Mora\n` +
                `💰 Bạn có: ${user.mora.toLocaleString()} Mora`,
            ephemeral: true
        });
    }

    const transaction =
        db.transaction(() => {

            const freshUser =
                getUser(
                    interaction.user.id
                );

            if (
                freshUser.mora <
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
                        freshUser.mora -
                        total
                }
            );

            addItem(
                interaction.user.id,
                plant.id,
                quantity
            );
        });

    try {

        transaction();

    } catch (error) {

        if (
            error.message ===
            "NOT_ENOUGH_MORA"
        ) {

            return interaction.reply({
                content:
                    "❌ Bạn không đủ Mora.",
                ephemeral: true
            });
        }

        throw error;
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

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> 🌱 Đã mua: **×${quantity}**\n` +
                    `> 💰 Đơn giá: **${price.toLocaleString()} Mora**\n` +
                    `> 💰 Tổng: **-${total.toLocaleString()} Mora**\n` +
                    `> 🎒 Trong túi: **×${owned}**\n` +
                    `> 💰 Còn lại: **${newUser.mora.toLocaleString()} Mora**`,

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
// PLANT DETAIL
// ============================================================

function plantDetailEmbed(
    user,
    plant
) {

    const genes =
        isHybridPlant(plant.id)
            ? {
                growth:
                    plant.growth_gene,
                yield:
                    plant.yield_gene,
                water:
                    plant.water_gene,
                rarity:
                    plant.rarity_gene,
                mutation:
                    plant.mutation_gene
            }
            : (
                typeof plantDatabase.getGenes ===
                "function"
                    ? plantDatabase.getGenes(
                        plant.id
                    )
                    : null
            );

    const lines = [];

    lines.push(
        `\`${plant.name || plant.id}\``
    );

    if (
        plant.nameVi ||
        plant.name_vi
    ) {

        lines.push(
            `**${plantName(plant)}**`
        );
    }

    lines.push("");

    lines.push(
        `${plantEmoji(plant)} **${plant.region || "Hybrid"}**`
    );

    lines.push(
        `⭐ Rarity: **${plant.rarity ?? plant.rarity_gene ?? "?"}**`
    );

    lines.push("");

    lines.push(
        "🌱 **CANH TÁC**"
    );

    lines.push(
        `> ⏱️ Sinh trưởng: ${formatTime(plantGrowth(plant))}`
    );

    lines.push(
        `> 🌾 Sản lượng: ${plant.yield_min ?? plant.yield?.min ?? plant.yield ?? 1}–${plant.yield_max ?? plant.yield?.max ?? plant.yield ?? 1}`
    );

    lines.push(
        `> 💧 Nước: ${plantWaterCost(plant)}`
    );

    lines.push(
        `> 💰 Bán: ${plantSellPrice(plant)} Mora`
    );

    lines.push(
        `> 🌱 Giá hạt: ${getSeedPrice(plant).toLocaleString()} Mora`
    );

    if (
        plant.mutation_name
    ) {

        lines.push("");

        lines.push(
            `✨ Mutation: **${plant.mutation_emoji || "✨"} ${plant.mutation_name}**`
        );
    }

    if (genes) {

        lines.push("");

        lines.push(
            "🧬 **GENETICS**"
        );

        lines.push(
            `> Growth ${Number(genes.growth).toFixed(2)}`
        );

        lines.push(
            `> Yield ${Number(genes.yield).toFixed(2)}`
        );

        lines.push(
            `> Water ${Number(genes.water).toFixed(2)}`
        );

        lines.push(
            `> Rarity ${Number(genes.rarity).toFixed(2)}`
        );

        lines.push(
            `> Mutation ${Number(genes.mutation).toFixed(2)}`
        );
    }

    return farmEmbed({
        user,
        title:
            `${plantEmoji(plant)} ${plantName(plant)}`,
        description:
            lines.join("\n"),
        color:
            COLORS.purple
    });
}

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
// FARM EMBED VIEW
// ============================================================

function farmEmbedView(
    user
) {

    const plots =
        getPlots(
            user.id
        );

    const lines = [
        `\`${user.username}\` — **Lv.${getUser(user).level}**`,
        "",
        "🌱 **NÔNG TRẠI**",
        ""
    ];

    for (
        const plot of plots
    ) {

        if (
            !plot.plant_id
        ) {

            lines.push(
                `🟫 **Ô ${plot.plot_id}** — Trống`
            );

            continue;
        }

        const plant =
            getPlant(
                plot.plant_id
            );

        if (!plant) {

            lines.push(
                `🟫 **Ô ${plot.plot_id}** — Dữ liệu cây lỗi`
            );

            continue;
        }

        if (
            isReady(plot)
        ) {

            lines.push(
                `🌾 **Ô ${plot.plot_id}** — ${plantEmoji(plant)} **${plantName(plant)}** — **SẴN SÀNG THU HOẠCH!**`
            );

        } else {

            const finish =
                unixSeconds(
                    plot.finish_at
                );

            lines.push(
                `🌱 **Ô ${plot.plot_id}** — ${plantEmoji(plant)} **${plantName(plant)}** — <t:${finish}:R>`
            );
        }

        lines.push(
            `> 💧 ${plot.watered ? "Đã tưới" : "Chưa tưới"}`
        );
    }

    return farmEmbed({
        user,
        title: "Nông Trại",
        description:
            lines.join("\n"),
        color:
            COLORS.green
    });
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
// PLANT SEED
// ============================================================

async function plantSeed(
    interaction,
    plantId,
    plotId
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
                "❌ Cây không tồn tại.",
            ephemeral: true
        });
    }

    const plot =
        getPlot(
            interaction.user.id,
            plotId
        );

    if (!plot) {

        return interaction.reply({
            content:
                "❌ Ô đất không tồn tại.",
            ephemeral: true
        });
    }

    if (
        plot.plant_id
    ) {

        return interaction.reply({
            content:
                "❌ Ô đất này đang có cây.",
            ephemeral: true
        });
    }

    const seedCount =
        getItemCount(
            interaction.user.id,
            plant.id
        );

    if (
        seedCount <= 0
    ) {

        return interaction.reply({
            content:
                `❌ Bạn không có hạt giống **${plantName(plant)}**.`,
            ephemeral: true
        });
    }

    const water =
        plantWaterCost(
            plant
        );

    if (
        user.water <
        water
    ) {

        return interaction.reply({
            content:
                `❌ Không đủ nước. Cần **${water}** nước.`,
            ephemeral: true
        });
    }

    const growth =
        plantGrowth(
            plant
        );

    const plantedAt =
        now();

    const finishAt =
        plantedAt +
        growth * 1000;

    const transaction =
        db.transaction(() => {

            addItem(
                interaction.user.id,
                plant.id,
                -1
            );

            updateUser(
                interaction.user.id,
                {
                    water:
                        user.water -
                        water
                }
            );

            db.prepare(`
                UPDATE plots
                SET
                    plant_id = ?,
                    planted_at = ?,
                    finish_at = ?,
                    watered = 0,
                    mutation = NULL
                WHERE user_id = ?
                AND plot_id = ?
            `).run(
                plant.id,
                plantedAt,
                finishAt,
                interaction.user.id,
                plotId
            );
        });

    transaction();

    const finish =
        unixSeconds(
            finishAt
        );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Gieo Hạt Thành Công",

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> 🟫 Ô đất: **${plotId}**\n` +
                    `> ⏱️ Thời gian: **${formatTime(growth)}**\n` +
                    `> 💧 Đã dùng: **${water} nước**\n` +
                    `> 🌱 Hoàn thành <t:${finish}:R>`,

                color:
                    COLORS.green
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_farm"
                        )
                        .setLabel(
                            "Xem nông trại"
                        )
                        .setEmoji(
                            "🌱"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                )
        ]
    });
}

// ============================================================
// HARVEST
// ============================================================

async function harvest(
    interaction,
    plotId
) {

    const plot =
        getPlot(
            interaction.user.id,
            plotId
        );

    if (
        !plot ||
        !plot.plant_id
    ) {

        return interaction.reply({
            content:
                "❌ Ô đất này không có cây.",
            ephemeral: true
        });
    }

    if (
        !isReady(plot)
    ) {

        const remaining =
            Math.ceil(
                (
                    Number(
                        plot.finish_at
                    ) -
                    now()
                ) / 1000
            );

        return interaction.reply({
            content:
                `⏳ Cây chưa trưởng thành. Còn **${formatTime(remaining)}**.`,
            ephemeral: true
        });
    }

    const plant =
        getPlant(
            plot.plant_id
        );

    if (!plant) {

        return interaction.reply({
            content:
                "❌ Dữ liệu cây không còn tồn tại.",
            ephemeral: true
        });
    }

    let amount =
        plantYield(
            plant
        );

    let sell =
        plantSellPrice(
            plant
        );

    let mutation =
        null;

    if (
        typeof plantDatabase.rollMutation ===
        "function"
    ) {

        mutation =
            plantDatabase.rollMutation();
    }

    if (
        mutation
    ) {

        amount =
            Math.ceil(
                amount *
                Number(
                    mutation.yieldMultiplier ||
                    1
                )
            );

        sell =
            Math.ceil(
                sell *
                Number(
                    mutation.sellMultiplier ||
                    1
                )
            );
    }

    const total =
        amount *
        sell;

    const transaction =
        db.transaction(() => {

            addItem(
                interaction.user.id,
                plant.id,
                amount
            );

            const user =
                getUser(
                    interaction.user
                );

            updateUser(
                interaction.user.id,
                {
                    mora:
                        user.mora +
                        total,

                    harvest_count:
                        user.harvest_count +
                        1
                }
            );

            addXP(
                interaction.user.id,
                25
            );

            addFarmXP(
                interaction.user.id,
                10
            );

            db.prepare(`
                UPDATE plots
                SET
                    plant_id = NULL,
                    planted_at = NULL,
                    finish_at = NULL,
                    watered = 0,
                    mutation = NULL
                WHERE user_id = ?
                AND plot_id = ?
            `).run(
                interaction.user.id,
                plotId
            );
        });

    transaction();

    let result =
        `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
        `> 🌾 Thu hoạch: **×${amount}**\n` +
        `> 💰 Nhận: **${total.toLocaleString()} Mora**\n` +
        `> ✨ +25 EXP`;

    if (
        mutation
    ) {

        result +=
            `\n> ${mutation.emoji || "✨"} **${mutation.name || mutation.id} Mutation!**`;
    }

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Thu Hoạch",

                description:
                    result,

                color:
                    COLORS.gold
            })
        ],

        components: [

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
                        )
                )
        ]
    });
}

// ============================================================
// WATER
// ============================================================

async function waterPlot(
    interaction,
    plotId
) {

    const plot =
        getPlot(
            interaction.user.id,
            plotId
        );

    if (
        !plot ||
        !plot.plant_id
    ) {

        return interaction.reply({
            content:
                "❌ Ô này chưa có cây.",
            ephemeral: true
        });
    }

    if (
        plot.watered
    ) {

        return interaction.reply({
            content:
                "💧 Cây này đã được tưới.",
            ephemeral: true
        });
    }

    const user =
        getUser(
            interaction.user
        );

    const plant =
        getPlant(
            plot.plant_id
        );

    if (!plant) {

        return interaction.reply({
            content:
                "❌ Không tìm thấy cây.",
            ephemeral: true
        });
    }

    const cost =
        Math.max(
            5,
            Math.floor(
                plantWaterCost(
                    plant
                ) / 2
            )
        );

    if (
        user.water <
        cost
    ) {

        return interaction.reply({
            content:
                `❌ Không đủ nước. Cần **${cost}**.`,
            ephemeral: true
        });
    }

    updateUser(
        interaction.user.id,
        {
            water:
                user.water -
                cost
        }
    );

    db.prepare(`
        UPDATE plots
        SET watered = 1
        WHERE user_id = ?
        AND plot_id = ?
    `).run(
        interaction.user.id,
        plotId
    );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Tưới Nước",

                description:
                    `💧 Bạn đã tưới cho cây ở **ô ${plotId}**.\n\n` +
                    `> 💧 -${cost} nước\n` +
                    `> 🌱 Cây tiếp tục phát triển.`,

                color:
                    COLORS.water
            })
        ],

        components: [

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
                        )
                )
        ]
    });
}

// ============================================================
// BUG
// ============================================================

async function catchBug(
    interaction
) {

    const user =
        getUser(
            interaction.user
        );

    const chance =
        Math.random();

    let reward =
        5;

    if (
        chance <
        0.05
    ) {

        reward =
            50;

    } else if (
        chance <
        0.20
    ) {

        reward =
            20;
    }

    updateUser(
        interaction.user.id,
        {
            mora:
                user.mora +
                reward,

            bug_count:
                user.bug_count +
                1
        }
    );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Bắt Sâu",

                description:
                    `🐛 Bạn đã bắt được một con sâu trong vườn!\n\n` +
                    `> 💰 Nhận **${reward} Mora**\n` +
                    `> 🐛 Bắt sâu: **+1**`,

                color:
                    COLORS.green
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_farm"
                        )
                        .setLabel(
                            "Quay lại vườn"
                        )
                        .setEmoji(
                            "🌱"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                )
        ]
    });
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
// GENETICS
// ============================================================

function getGeneValue(
    plant,
    type
) {

    if (
        isHybridPlant(
            plant.id
        )
    ) {

        const map = {
            growth:
                "growth_gene",
            yield:
                "yield_gene",
            water:
                "water_gene",
            rarity:
                "rarity_gene",
            mutation:
                "mutation_gene"
        };

        return Number(
            plant[
                map[type]
            ]
        ) || 1;
    }

    if (
        typeof plantDatabase.getGenes ===
        "function"
    ) {

        const genes =
            plantDatabase.getGenes(
                plant.id
            );

        if (
            genes &&
            genes[type] !== undefined
        ) {

            return Number(
                genes[type]
            ) || 1;
        }
    }

    return 1;
}

function geneticsEmbed(
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
                )
                .slice(
                    0,
                    10
                );
    }

    const hybrids =
        db.prepare(`
            SELECT *
            FROM bred_plants
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `).all(
            user.id
        );

    const lines = [

        `\`${user.username}\` — **Lv.${data.level}**`,

        "",

        "🧬 **GENETICS**",

        "> Gene quyết định khả năng của cây.",

        "> Lai cây sẽ trộn gene của bố và mẹ.",

        ""
    ];

    for (
        const plant of
        [
            ...plants,
            ...hybrids
        ].slice(0, 15)
    ) {

        lines.push(
            `${plantEmoji(plant)} **${plantName(plant)}**`
        );

        lines.push(
            `> G ${getGeneValue(plant, "growth").toFixed(2)} • Y ${getGeneValue(plant, "yield").toFixed(2)} • W ${getGeneValue(plant, "water").toFixed(2)} • R ${getGeneValue(plant, "rarity").toFixed(2)} • M ${getGeneValue(plant, "mutation").toFixed(2)}`
        );
    }

    return farmEmbed({
        user,
        title:
            "Genetics",
        description:
            lines.join("\n"),
        color:
            COLORS.purple
    });
}

// ============================================================
// BREED SELECT
// ============================================================

function getBreedablePlants(
    userId
) {

    const items =
        getInventory(
            userId
        );

    return items
        .map(
            item =>
                getPlant(
                    item.item_id
                )
        )
        .filter(Boolean);
}

function breedParentMenu(
    userId,
    parentType,
    selectedParent
) {

    const plants =
        getBreedablePlants(
            userId
        )
        .slice(
            0,
            25
        );

    if (!plants.length) {
        return null;
    }

    const options =
        plants.map(
            plant => {

                const count =
                    getItemCount(
                        userId,
                        plant.id
                    );

                return {

                    label:
                        `${plantEmoji(plant)} ${plantName(plant)}`
                            .slice(0, 100),

                    description:
                        `Có: ${count} • G ${getGeneValue(plant, "growth").toFixed(1)} • Y ${getGeneValue(plant, "yield").toFixed(1)}`
                            .slice(0, 100),

                    value:
                        plant.id
                };
            }
        );

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `breed_parent_${parentType}`
            )
            .setPlaceholder(
                parentType === "a"
                    ? "🌱 Chọn cây BỐ..."
                    : "🌱 Chọn cây MẸ..."
            )
            .addOptions(
                options
            );

    const rows = [
        new ActionRowBuilder()
            .addComponents(
                menu
            )
    ];

    if (
        selectedParent
    ) {

        rows.push(
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_genetics"
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
        );
    }

    return rows;
}

// ============================================================
// BREED STATE IN MEMORY
// ============================================================

const breedingSessions =
    new Map();

// ============================================================
// INHERIT GENE
// ============================================================

function inheritGene(
    a,
    b,
    variance = 0.10
) {

    const first =
        Number(a) || 1;

    const second =
        Number(b) || 1;

    const base =
        Math.random() < 0.5
            ? first
            : second;

    const modifier =
        1 +
        (
            (
                Math.random() * 2
            ) - 1
        ) *
        variance;

    return Math.max(
        0.1,
        Number(
            (
                base *
                modifier
            ).toFixed(2)
        )
    );
}

// ============================================================
// BREED MUTATION
// ============================================================

function rollBreedingMutation(
    mutationGene
) {

    const gene =
        Math.max(
            0,
            Number(
                mutationGene
            ) || 1
        );

    let chance =
        0.08;

    if (
        gene > 1
    ) {

        chance +=
            Math.min(
                0.20,
                (
                    gene - 1
                ) * 0.03
            );
    }

    const roll =
        Math.random();

    if (
        roll <
        chance * 0.05
    ) {

        return {
            id:
                "legendary",
            name:
                "Legendary Mutation",
            emoji:
                "🌟",
            multiplier:
                2.5
        };
    }

    if (
        roll <
        chance * 0.20
    ) {

        return {
            id:
                "golden",
            name:
                "Golden Mutation",
            emoji:
                "✨",
            multiplier:
                1.75
        };
    }

    if (
        roll <
        chance
    ) {

        return {
            id:
                "rare",
            name:
                "Rare Mutation",
            emoji:
                "💜",
            multiplier:
                1.35
        };
    }

    return null;
}

// ============================================================
// CREATE HYBRID
// ============================================================

function createHybridPlant(
    userId,
    parentA,
    parentB
) {

    const growthGene =
        inheritGene(
            getGeneValue(
                parentA,
                "growth"
            ),
            getGeneValue(
                parentB,
                "growth"
            )
        );

    const yieldGene =
        inheritGene(
            getGeneValue(
                parentA,
                "yield"
            ),
            getGeneValue(
                parentB,
                "yield"
            )
        );

    const waterGene =
        inheritGene(
            getGeneValue(
                parentA,
                "water"
            ),
            getGeneValue(
                parentB,
                "water"
            )
        );

    const rarityGene =
        inheritGene(
            getGeneValue(
                parentA,
                "rarity"
            ),
            getGeneValue(
                parentB,
                "rarity"
            )
        );

    const mutationGene =
        inheritGene(
            getGeneValue(
                parentA,
                "mutation"
            ),
            getGeneValue(
                parentB,
                "mutation"
            )
        );

    const mutation =
        rollBreedingMutation(
            mutationGene
        );

    const baseGrowth =
        Math.round(
            (
                plantGrowth(parentA) +
                plantGrowth(parentB)
            ) / 2
        );

    const baseYield =
        Math.max(
            1,
            Math.round(
                (
                    plantYield(parentA) +
                    plantYield(parentB)
                ) / 2
            )
        );

    const baseWater =
        Math.max(
            1,
            Math.round(
                (
                    plantWaterCost(parentA) +
                    plantWaterCost(parentB)
                ) / 2
            )
        );

    const baseSell =
        Math.max(
            1,
            Math.round(
                (
                    plantSellPrice(parentA) +
                    plantSellPrice(parentB)
                ) / 2
            )
        );

    const multiplier =
        mutation
            ? mutation.multiplier
            : 1;

    const growthTime =
        Math.max(
            5,
            Math.round(
                baseGrowth /
                Math.max(
                    0.5,
                    growthGene
                )
            )
        );

    const yieldMin =
        Math.max(
            1,
            Math.round(
                baseYield *
                yieldGene *
                0.8 *
                multiplier
            )
        );

    const yieldMax =
        Math.max(
            yieldMin,
            Math.round(
                baseYield *
                yieldGene *
                1.2 *
                multiplier
            )
        );

    const waterCost =
        Math.max(
            1,
            Math.round(
                baseWater /
                Math.max(
                    0.5,
                    waterGene
                )
            )
        );

    const sellPrice =
        Math.max(
            1,
            Math.round(
                baseSell *
                rarityGene *
                multiplier
            )
        );

    const id =
        `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const name =
        `${plantName(parentA)} × ${plantName(parentB)}`;

    const nameVi =
        `Giống Lai ${plantName(parentA)} ${plantName(parentB)}`;

    const rarity =
        Math.max(
            1,
            Number(
                rarityGene.toFixed(2)
            )
        );

    db.prepare(`
        INSERT INTO bred_plants
        (
            id,
            user_id,
            parent_a,
            parent_b,
            name,
            name_vi,
            emoji,
            growth_time,
            yield_min,
            yield_max,
            water_cost,
            sell_price,
            rarity,
            growth_gene,
            yield_gene,
            water_gene,
            rarity_gene,
            mutation_gene,
            mutation_id,
            mutation_name,
            mutation_emoji,
            created_at
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `).run(
        id,
        userId,
        parentA.id,
        parentB.id,
        name,
        nameVi,
        mutation
            ? mutation.emoji
            : "🌱",
        growthTime,
        yieldMin,
        yieldMax,
        waterCost,
        sellPrice,
        rarity,
        growthGene,
        yieldGene,
        waterGene,
        rarityGene,
        mutationGene,
        mutation
            ? mutation.id
            : null,
        mutation
            ? mutation.name
            : null,
        mutation
            ? mutation.emoji
            : null,
        now()
    );

    addItem(
        userId,
        id,
        1
    );

    return {
        id,
        name,
        nameVi,
        emoji:
            mutation
                ? mutation.emoji
                : "🌱",
        growthTime,
        yieldMin,
        yieldMax,
        waterCost,
        sellPrice,
        rarity,
        growthGene,
        yieldGene,
        waterGene,
        rarityGene,
        mutationGene,
        mutation
    };
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

// ============================================================
// BREED PROCESS
// ============================================================

async function breedPlants(
    interaction,
    parentAId,
    parentBId
) {

    const user =
        getUser(
            interaction.user
        );

    if (
        parentAId ===
        parentBId
    ) {

        return interaction.reply({
            content:
                "❌ Cây bố và cây mẹ phải là hai cây khác nhau.",
            ephemeral: true
        });
    }

    const parentA =
        getPlant(
            parentAId
        );

    const parentB =
        getPlant(
            parentBId
        );

    if (
        !parentA ||
        !parentB
    ) {

        return interaction.reply({
            content:
                "❌ Không tìm thấy cây bố hoặc cây mẹ.",
            ephemeral: true
        });
    }

    if (
        getItemCount(
            interaction.user.id,
            parentA.id
        ) <= 0
    ) {

        return interaction.reply({
            content:
                `❌ Bạn không còn **${plantName(parentA)}**.`,
            ephemeral: true
        });
    }

    if (
        getItemCount(
            interaction.user.id,
            parentB.id
        ) <= 0
    ) {

        return interaction.reply({
            content:
                `❌ Bạn không còn **${plantName(parentB)}**.`,
            ephemeral: true
        });
    }

    const last =
        breedingSessions.get(
            interaction.user.id
        );

    if (
        last &&
        now() -
        last <
        BREED_COOLDOWN_MS
    ) {

        const remaining =
            Math.ceil(
                (
                    BREED_COOLDOWN_MS -
                    (
                        now() -
                        last
                    )
                ) / 1000
            );

        return interaction.reply({
            content:
                `⏳ Bạn cần chờ **${formatTime(remaining)}** trước khi lai tiếp.`,
            ephemeral: true
        });
    }

    if (
        user.mora <
        BREED_COST
    ) {

        return interaction.reply({
            content:
                `❌ Cần **${BREED_COST} Mora** để lai.`,
            ephemeral: true
        });
    }

    const transaction =
        db.transaction(() => {

            const freshUser =
                getUser(
                    interaction.user.id
                );

            if (
                freshUser.mora <
                BREED_COST
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }

            if (
                getItemCount(
                    interaction.user.id,
                    parentA.id
                ) <= 0 ||
                getItemCount(
                    interaction.user.id,
                    parentB.id
                ) <= 0
            ) {

                throw new Error(
                    "NO_PARENT"
                );
            }

            updateUser(
                interaction.user.id,
                {
                    mora:
                        freshUser.mora -
                        BREED_COST
                }
            );

            addItem(
                interaction.user.id,
                parentA.id,
                -1
            );

            addItem(
                interaction.user.id,
                parentB.id,
                -1
            );
        });

    try {

        transaction();

    } catch (error) {

        if (
            error.message ===
            "NOT_ENOUGH_MORA"
        ) {

            return interaction.reply({
                content:
                    "❌ Bạn không đủ Mora.",
                ephemeral: true
            });
        }

        if (
            error.message ===
            "NO_PARENT"
        ) {

            return interaction.reply({
                content:
                    "❌ Một trong hai cây không còn trong túi.",
                ephemeral: true
            });
        }

        throw error;
    }

    let child;

    try {

        child =
            createHybridPlant(
                interaction.user.id,
                parentA,
                parentB
            );

    } catch (error) {

        addItem(
            interaction.user.id,
            parentA.id,
            1
        );

        addItem(
            interaction.user.id,
            parentB.id,
            1
        );

        updateUser(
            interaction.user.id,
            {
                mora:
                    getUser(
                        interaction.user.id
                    ).mora +
                    BREED_COST
            }
        );

        throw error;
    }

    breedingSessions.set(
        interaction.user.id,
        now()
    );

    let result = [

        `${parentA.emoji || "🌱"} **${plantName(parentA)}**`,
        "        🧬 +",
        `${parentB.emoji || "🌱"} **${plantName(parentB)}**`,
        "",
        `        ↓`,
        "",
        `${child.emoji} **${child.nameVi}**`,
        "",
        `> ⏱️ Sinh trưởng: **${formatTime(child.growthTime)}**`,
        `> 🌾 Sản lượng: **${child.yieldMin}–${child.yieldMax}**`,
        `> 💧 Nước: **${child.waterCost}**`,
        `> 💰 Bán: **${child.sellPrice.toLocaleString()} Mora**`,
        "",
        `> 🎒 Cây con đã được thêm vào túi.`
    ];

    if (
        child.mutation
    ) {

        result.push(
            "",
            `> ${child.mutation.emoji} **${child.mutation.name}!**`,
            `> ✨ Multiplier ×${child.mutation.multiplier}`
        );
    }

    const fresh =
        getUser(
            interaction.user
        );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "🧬 Lai Tạo Thành Công",

                description:
                    result.join("\n"),

                color:
                    COLORS.purple
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

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
                            "home_genetics"
                        )
                        .setLabel(
                            "Lai tiếp"
                        )
                        .setEmoji(
                            "🧬"
                        )
                        .setStyle(
                            ButtonStyle.Primary
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
                        )
                )
        ]
    });
}

// ============================================================
// HELP
// ============================================================

function helpEmbed(
    user
) {

    const text = [

        `\`${user.username}\` — **Lv.${getUser(user).level}**`,

        "",

        "🌱 **CƠ BẢN**",

        "> `nstart` — mở trang chủ",
        "> `nprofile` — xem hồ sơ",
        "> `nfarm` — mở nông trại",
        "> `ninv` — xem túi đồ",

        "",

        "🌾 **NÔNG TRẠI**",

        "> Gieo hạt bằng nút 🌱",
        "> Tưới nước bằng nút 💧",
        "> Thu hoạch bằng nút 🌾",
        "> Bắt sâu bằng nút 🐛",

        "",

        "🛒 **CỬA HÀNG**",

        "> Shop có **5 loại hạt** riêng cho từng người.",
        "> Shop tự đổi sau **30 phút**.",
        "> Có **3 lần đổi shop miễn phí/ngày**.",
        `> Sau 3 lần: **${SHOP_REFRESH_COST} Mora/lần**.`,
        "> Chọn hạt → nhập số lượng muốn mua.",

        "",

        "🧬 **LAI TẠO**",

        `> Chi phí: **${BREED_COST} Mora/lần**.`,
        "> Chọn cây bố → chọn cây mẹ.",
        "> Mỗi cây bố/mẹ tiêu hao 1 cây.",
        "> Gene được kế thừa từ cả hai cây.",
        "> Có cơ hội tạo Mutation hiếm.",

        "",

        "💡 Thời gian cây dùng đồng hồ Discord."
    ].join("\n");

    return farmEmbed({
        user,
        title:
            "Hướng Dẫn",
        description:
            text,
        color:
            COLORS.water
    });
}

// ============================================================
// MESSAGE COMMANDS
// ============================================================
// ============================================================
// ADMIN HELPERS
// ============================================================

function getMentionedUser(message) {

    return (
        message.mentions.users.first() ||
        null
    );
}

function adminError(message) {

    return message.reply({
        content:
            "❌ Bạn không có quyền sử dụng lệnh Admin."
    });
}

function adminTargetError(message) {

    return message.reply({
        content:
            "❌ Hãy mention người chơi cần chỉnh.\n\n" +
            "Ví dụ:\n" +
            "`nadmin mora @user 10000`"
    });
}
client.on(
    "messageCreate",
    async message => {

        if (
            message.author.bot
        ) {
            return;
        }

        if (
            !message.content
                .toLowerCase()
                .startsWith(
                    PREFIX
                )
        ) {
            return;
        }

        const args =
            message.content
                .slice(
                    PREFIX.length
                )
                .trim()
                .split(
                    /\s+/
                );

        const command =
            (
                args.shift() ||
                ""
            ).toLowerCase();

        if (!command) {
            return;
        }

        getUser(
            message.author
        );

        ensurePlots(
            message.author.id
        );

        try {

            switch (
                command
            ) {

                case "ping": {

                    const sent = await message.reply({
                        content: "🏓 Pinging..."
                    });

                    const latency =
                        sent.createdTimestamp -
                        message.createdTimestamp;

                    await sent.edit({
                        content:
                            `🏓 Pong! Độ trễ tin nhắn: ${latency}ms | API: ${Math.round(client.ws.ping)}ms`
                    });

                    break;
                }

                case "start":
                case "home":

                    await message.reply({

                        embeds: [
                            homeEmbed(
                                message.author
                            )
                        ],

                        components:
                            mainButtons()
                    });

                    break;

                case "profile":
                case "p":

                    await message.reply({

                        embeds: [
                            profileEmbed(
                                message.author
                            )
                        ],

                        components: [
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
                        ]
                    });

                    break;

                case "farm":
                case "f":

                    await message.reply({

                        embeds: [
                            farmEmbedView(
                                message.author
                            )
                        ],

                        components:
                            farmButtons()
                    });

                    break;

                case "inv":
                case "inventory":

                    await message.reply({

                        embeds: [
                            inventoryEmbed(
                                message.author
                            )
                        ],

                        components:
                            mainButtons()
                    });

                    break;

                case "shop":

                    await message.reply({

                        embeds: [
                            shopEmbed(
                                message.author
                            )
                        ],

                        components:
                            shopSelectMenu(
                                message.author
                            )
                    });

                    break;

                case "genetics":
                case "genes":

                    await message.reply({

                        embeds: [
                            geneticsEmbed(
                                message.author
                            )
                        ],

                        components:
                            geneticsButtons()
                    });

                    break;

                case "help":

                    await message.reply({

                        embeds: [
                            helpEmbed(
                                message.author
                            )
                        ],

                        components:
                            mainButtons()
                    });

                    break;

                case "plant": {

                    const plantId =
                        args[0];

                    if (!plantId) {

                        const menu =
                            plantSelectMenu(
                                message.author
                            );

                        await message.reply({

                            embeds: [

                                farmEmbed({

                                    user:
                                        message.author,

                                    title:
                                        "Gieo Hạt",

                                    description:
                                        "🌱 Chọn giống cây bạn muốn gieo."
                                })
                            ],

                            components:
                                menu ||
                                backButton()
                        });

                        break;
                    }

                    const plant =
                        getPlant(
                            plantId
                        );

                    if (!plant) {

                        await message.reply(
                            "❌ Không tìm thấy cây."
                        );

                        break;
                    }

                    const rows =
                        plotSelect(
                            message.author.id,
                            plant.id
                        );

                    await message.reply({

                        embeds: [
                            plantDetailEmbed(
                                message.author,
                                plant
                            )
                        ],

                        components:
                            rows.length
                                ? rows
                                : backButton()
                    });

                    break;
                }
// ====================================================
// ADMIN
// ====================================================

case "admin": {

    if (!isAdmin(message.author)) {

        await message.reply({
            content:
                "❌ Bạn không có quyền sử dụng lệnh Admin."
        });

        break;
    }

    await message.reply({

        embeds: [

            farmEmbed({

                user:
                    message.author,

                title:
                    "⚙️ Admin Panel",

                description:
                    [
                        "🔐 **ADMIN MODE**",
                        "",
                        "> `nadmin shop` — đổi shop của người dùng",
                        "> `nadmin mora @user 10000` — thêm Mora",
                        "> `nadmin seed @user windwheel 10` — thêm hạt",
                        "> `nadmin xp @user 100` — thêm EXP",
                        "> `nadmin water @user 100` — thêm nước",
                        "> `nadmin resetshop @user` — reset shop",
                        "> `nadmin resetuser @user` — reset dữ liệu user"
                    ].join("\n"),

                color:
                    COLORS.red
            })
        ]
    });

    break;
}
                case "nplant": {

                    const plant =
                        getPlant(
                            args[0]
                        );

                    if (!plant) {

                        await message.reply(
                            "❌ Không tìm thấy cây."
                        );

                        break;
                    }

                    await message.reply({

                        embeds: [
                            plantDetailEmbed(
                                message.author,
                                plant
                            )
                        ],

                        components:
                            backButton()
                    });

                    break;
                }

                default:

                    await message.reply({

                        embeds: [

                            farmEmbed({

                                user:
                                    message.author,

                                title:
                                    "Không Tìm Thấy Lệnh",

                                description:
                                    `❌ Không tìm thấy \`${PREFIX}${command}\`.\n\n` +
                                    `💡 Dùng **\`nhelp\`**.`,

                                color:
                                    COLORS.red
                            })
                        ],

                        components: [

                            new ActionRowBuilder()
                                .addComponents(

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
                                            ButtonStyle.Primary
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
                        ]
                    });
            }

        } catch (error) {

            console.error(
                "Command error:",
                error
            );

            if (
                !message.replied
            ) {

                await message.reply(
                    "❌ Có lỗi xảy ra. Hãy thử lại."
                );
            }
        }
    }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ========================================================
            // MODAL
            // ========================================================

            if (
                interaction.isModalSubmit()
            ) {

                if (
                    !interaction.customId.startsWith(
                        "shop_quantity_"
                    )
                ) {
                    return;
                }

                const plantId =
                    interaction.customId
                        .slice(
                            "shop_quantity_".length
                        );

                const quantity =
                    interaction.fields
                        .getTextInputValue(
                            "quantity"
                        );

                return buySeeds(
                    interaction,
                    plantId,
                    quantity
                );
            }

            // ========================================================
            // SELECT MENU
            // ========================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                // SHOP
                if (
                    interaction.customId ===
                    "shop_buy"
                ) {

                    const plantId =
                        interaction.values[0];

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

                    if (
                        !shopPlants.some(
                            p =>
                                p.id ===
                                plant.id
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "❌ Hạt giống này không còn trong shop.",
                            ephemeral:
                                true
                        });
                    }

                    return interaction.showModal(
                        shopQuantityModal(
                            plant
                        )
                    );
                }

                // PLANT
                if (
                    interaction.customId ===
                    "select_plant"
                ) {

                    const plantId =
                        interaction.values[0];

                    const plant =
                        getPlant(
                            plantId
                        );

                    if (!plant) {

                        return interaction.reply({
                            content:
                                "❌ Không tìm thấy cây.",
                            ephemeral:
                                true
                        });
                    }

                    const rows =
                        plotSelect(
                            interaction.user.id,
                            plant.id
                        );

                    return interaction.update({

                        embeds: [
                            plantDetailEmbed(
                                interaction.user,
                                plant
                            )
                        ],

                        components:
                            rows.length
                                ? rows
                                : backButton()
                    });
                }

                // BREED PARENT
                if (
                    interaction.customId ===
                    "breed_parent_a"
                ) {

                    const parentA =
                        interaction.values[0];

                    const plant =
                        getPlant(
                            parentA
                        );

                    if (!plant) {

                        return interaction.reply({
                            content:
                                "❌ Không tìm thấy cây.",
                            ephemeral:
                                true
                        });
                    }

                    const session =
                        breedingSessions.get(
                            `select:${interaction.user.id}`
                        ) || {};

                    breedingSessions.set(
                        `select:${interaction.user.id}`,
                        {
                            parentA,
                            parentB:
                                null
                        }
                    );

                    const rows =
                        breedParentMenu(
                            interaction.user.id,
                            "b"
                        );

                    return interaction.update({

                        embeds: [

                            farmEmbed({

                                user:
                                    interaction.user,

                                title:
                                    "🧬 Chọn Cây Mẹ",

                                description:
                                    `👨 Cây bố: ${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                                    "🌱 Bây giờ hãy chọn cây mẹ.",

                                color:
                                    COLORS.purple
                            })
                        ],

                        components:
                            rows ||
                            backButton()
                    });
                }

                if (
                    interaction.customId ===
                    "breed_parent_b"
                ) {

                    const parentB =
                        interaction.values[0];

                    const session =
                        breedingSessions.get(
                            `select:${interaction.user.id}`
                        );

                    if (
                        !session ||
                        !session.parentA
                    ) {

                        return interaction.reply({
                            content:
                                "❌ Phiên lai đã hết. Hãy bắt đầu lại.",
                            ephemeral:
                                true
                        });
                    }

                    const parentA =
                        getPlant(
                            session.parentA
                        );

                    const parentBPlant =
                        getPlant(
                            parentB
                        );

                    if (
                        !parentA ||
                        !parentBPlant
                    ) {

                        return interaction.reply({
                            content:
                                "❌ Không tìm thấy cây.",
                            ephemeral:
                                true
                        });
                    }

                    if (
                        parentA.id ===
                        parentBPlant.id
                    ) {

                        return interaction.reply({
                            content:
                                "❌ Cây bố và cây mẹ phải khác nhau.",
                            ephemeral:
                                true
                        });
                    }

                    const countA =
                        getItemCount(
                            interaction.user.id,
                            parentA.id
                        );

                    const countB =
                        getItemCount(
                            interaction.user.id,
                            parentBPlant.id
                        );

                    if (
                        countA <= 0 ||
                        countB <= 0
                    ) {

                        return interaction.reply({
                            content:
                                "❌ Bạn không đủ cây để lai.",
                            ephemeral:
                                true
                        });
                    }

                    breedingSessions.set(
                        `select:${interaction.user.id}`,
                        {
                            parentA:
                                parentA.id,
                            parentB:
                                parentBPlant.id
                        }
                    );

                    return interaction.update({

                        embeds: [

                            farmEmbed({

                                user:
                                    interaction.user,

                                title:
                                    "🧬 Xác Nhận Lai",

                                description:
                                    `${plantEmoji(parentA)} **${plantName(parentA)}**\n` +
                                    "        🧬 +\n" +
                                    `${plantEmoji(parentBPlant)} **${plantName(parentBPlant)}**\n\n` +
                                    `> 💰 Chi phí: **${BREED_COST} Mora**\n` +
                                    "> 🌱 Tiêu hao 1 cây bố + 1 cây mẹ.\n" +
                                    "> ✨ Có cơ hội nhận Mutation.",

                                color:
                                    COLORS.purple
                            })
                        ],

                        components:
                            breedConfirmButtons()
                    });
                }

                return;
            }

            // ========================================================
            // BUTTON
            // ========================================================

            if (
                !interaction.isButton()
            ) {
                return;
            }

            const id =
                interaction.customId;

            // ========================================================
            // HOME
            // ========================================================

            if (
                id === "home"
            ) {

                return interaction.update({

                    embeds: [
                        homeEmbed(
                            interaction.user
                        )
                    ],

                    components:
                        mainButtons()
                });
            }

            // ========================================================
            // PROFILE
            // ========================================================

            if (
                id === "home_profile"
            ) {

                return interaction.update({

                    embeds: [
                        profileEmbed(
                            interaction.user
                        )
                    ],

                    components: [
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
                    ]
                });
            }

            // ========================================================
            // FARM
            // ========================================================

            if (
                id === "home_farm"
            ) {

                return interaction.update({

                    embeds: [
                        farmEmbedView(
                            interaction.user
                        )
                    ],

                    components:
                        farmButtons()
                });
            }

            // ========================================================
            // INVENTORY
            // ========================================================

            if (
                id === "home_inventory"
            ) {

                return interaction.update({

                    embeds: [
                        inventoryEmbed(
                            interaction.user
                        )
                    ],

                    components:
                        mainButtons()
                });
            }

            // ========================================================
            // SHOP
            // ========================================================

            if (
                id === "home_shop"
            ) {

                return interaction.update({

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

            // ========================================================
            // SHOP REFRESH
            // ========================================================

            if (
                id === "shop_refresh"
            ) {

                return forceRefreshShop(
                    interaction
                );
            }

            // ========================================================
            // GENETICS
            // ========================================================

            if (
                id === "home_genetics"
            ) {

                return interaction.update({

                    embeds: [
                        geneticsEmbed(
                            interaction.user
                        )
                    ],

                    components:
                        geneticsButtons()
                });
            }

            // ========================================================
            // HELP
            // ========================================================

            if (
                id === "home_help"
            ) {

                return interaction.update({

                    embeds: [
                        helpEmbed(
                            interaction.user
                        )
                    ],

                    components:
                        mainButtons()
                });
            }

            // ========================================================
            // FARM PLANT
            // ========================================================

            if (
                id === "farm_plant"
            ) {

                const menu =
                    plantSelectMenu(
                        interaction.user
                    );

                return interaction.update({

                    embeds: [

                        farmEmbed({

                            user:
                                interaction.user,

                            title:
                                "Gieo Hạt",

                            description:
                                "🌱 Chọn giống cây bạn muốn gieo."
                        })
                    ],

                    components:
                        menu ||
                        backButton()
                });
            }

            // ========================================================
            // WATER
            // ========================================================

            if (
                id === "farm_water"
            ) {

                const plots =
                    getPlots(
                        interaction.user.id
                    );

                const active =
                    plots.filter(
                        p =>
                            p.plant_id &&
                            !p.watered
                    );

                if (
                    !active.length
                ) {

                    return interaction.reply({

                        content:
                            "💧 Hiện không có cây nào cần tưới.",

                        ephemeral:
                            true
                    });
                }

                const row =
                    new ActionRowBuilder();

                for (
                    const plot of active
                ) {

                    row.addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                `water_${plot.plot_id}`
                            )
                            .setLabel(
                                `Ô ${plot.plot_id}`
                            )
                            .setEmoji(
                                "💧"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            )
                    );

                    if (
                        row.components.length >=
                        5
                    ) {
                        break;
                    }
                }

                return interaction.reply({

                    embeds: [

                        farmEmbed({

                            user:
                                interaction.user,

                            title:
                                "Tưới Nước",

                            description:
                                "💧 Chọn ô đất muốn tưới."
                        })
                    ],

                    components: [
                        row,
                        ...backButton()
                    ],

                    ephemeral:
                        true
                });
            }

            // ========================================================
            // HARVEST
            // ========================================================

            if (
                id === "farm_harvest"
            ) {

                const plots =
                    getPlots(
                        interaction.user.id
                    );

                const ready =
                    plots.filter(
                        p =>
                            p.plant_id &&
                            isReady(p)
                    );

                if (
                    !ready.length
                ) {

                    return interaction.reply({

                        content:
                            "🌱 Chưa có cây nào trưởng thành.",

                        ephemeral:
                            true
                    });
                }

                const row =
                    new ActionRowBuilder();

                for (
                    const plot of ready
                ) {

                    row.addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                `harvest_${plot.plot_id}`
                            )
                            .setLabel(
                                `Ô ${plot.plot_id}`
                            )
                            .setEmoji(
                                "🌾"
                            )
                            .setStyle(
                                ButtonStyle.Success
                            )
                    );

                    if (
                        row.components.length >=
                        5
                    ) {
                        break;
                    }
                }

                return interaction.reply({

                    embeds: [

                        farmEmbed({

                            user:
                                interaction.user,

                            title:
                                "Thu Hoạch",

                            description:
                                "🌾 Chọn cây bạn muốn thu hoạch."
                        })
                    ],

                    components: [
                        row,
                        ...backButton()
                    ],

                    ephemeral:
                        true
                });
            }

            // ========================================================
            // BUG
            // ========================================================

            if (
                id === "farm_bug"
            ) {

                return catchBug(
                    interaction
                );
            }

            // ========================================================
            // GENETICS INFO
            // ========================================================

            if (
                id === "genetics_info"
            ) {

                return interaction.update({

                    embeds: [
                        geneticsEmbed(
                            interaction.user
                        )
                    ],

                    components:
                        geneticsButtons()
                });
            }

            // ========================================================
            // BREED START
            // ========================================================

            if (
                id === "breed_start"
            ) {

                const plants =
                    getBreedablePlants(
                        interaction.user.id
                    );

                if (
                    plants.length <
                    2
                ) {

                    return interaction.reply({

                        content:
                            "❌ Bạn cần ít nhất **2 giống cây khác nhau** trong túi để lai.",

                        ephemeral:
                            true
                    });
                }

                const rows =
                    breedParentMenu(
                        interaction.user.id,
                        "a"
                    );

                return interaction.update({

                    embeds: [

                        farmEmbed({

                            user:
                                interaction.user,

                            title:
                                "🧬 Chọn Cây Bố",

                            description:
                                `💰 Chi phí lai: **${BREED_COST} Mora**\n\n` +
                                "🌱 Hãy chọn cây bố từ túi đồ.",

                            color:
                                COLORS.purple
                        })
                    ],

                    components:
                        rows ||
                        backButton()
                });
            }

            // ========================================================
            // BREED CONFIRM
            // ========================================================

            if (
                id === "breed_confirm"
            ) {

                const session =
                    breedingSessions.get(
                        `select:${interaction.user.id}`
                    );

                if (
                    !session ||
                    !session.parentA ||
                    !session.parentB
                ) {

                    return interaction.reply({

                        content:
                            "❌ Phiên lai đã hết. Hãy chọn lại cây.",

                        ephemeral:
                            true
                    });
                }

                breedingSessions.delete(
                    `select:${interaction.user.id}`
                );

                return breedPlants(
                    interaction,
                    session.parentA,
                    session.parentB
                );
            }

            // ========================================================
            // BREED CANCEL
            // ========================================================

            if (
                id === "breed_cancel"
            ) {

                breedingSessions.delete(
                    `select:${interaction.user.id}`
                );

                return interaction.update({

                    embeds: [
                        geneticsEmbed(
                            interaction.user
                        )
                    ],

                    components:
                        geneticsButtons()
                });
            }

            // ========================================================
            // PLANT TO PLOT
            // ========================================================

            if (
                id.startsWith(
                    "plant_"
                )
            ) {

                const parts =
                    id.split("_");

                const plotId =
                    Number(
                        parts.pop()
                    );

                const plantId =
                    parts
                        .slice(1)
                        .join("_");

                return plantSeed(
                    interaction,
                    plantId,
                    plotId
                );
            }

            // ========================================================
            // WATER PLOT
            // ========================================================

            if (
                id.startsWith(
                    "water_"
                )
            ) {

                const plotId =
                    Number(
                        id.split(
                            "_"
                        )[1]
                    );

                return waterPlot(
                    interaction,
                    plotId
                );
            }

            // ========================================================
            // HARVEST PLOT
            // ========================================================

            if (
                id.startsWith(
                    "harvest_"
                )
            ) {

                const plotId =
                    Number(
                        id.split(
                            "_"
                        )[1]
                    );

                return harvest(
                    interaction,
                    plotId
                );
            }

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({

                        content:
                            "❌ Có lỗi xảy ra.",

                        ephemeral:
                            true
                    });

                } else {

                    await interaction.reply({

                        content:
                            "❌ Có lỗi xảy ra.",

                        ephemeral:
                            true
                    });
                }

            } catch {}
        }
    }
);

// ============================================================
// READY
// ============================================================

client.once(
    "ready",
    () => {

        console.log(
            `🌱 ${client.user.tag} đã online.`
        );

        console.log(
            `🌱 Loaded ${
                typeof plantDatabase.getAllPlants ===
                "function"
                    ? plantDatabase
                        .getAllPlants()
                        .length
                    : 0
            } plants.`
        );

        console.log(
            "🛒 Shop: 5 seeds / 30 minutes"
        );

        console.log(
            "🔄 Shop refresh: 3 free/day + 50 Mora"
        );

        console.log(
            `🧬 Breeding cost: ${BREED_COST} Mora`
        );

        client.user.setPresence({

            activities: [

                {
                    name:
                        "chăm sóc khu vườn 🌱",
                    type: 0
                }
            ],

            status:
                "online"
        });
    }
);

// ============================================================
// UNHANDLED ERRORS
// ============================================================

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "Unhandled Promise Rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "Uncaught Exception:",
            error
        );
    }
);

// ============================================================
// LOGIN
// ============================================================

const token =
    process.env.DISCORD_TOKEN;

if (!token) {

    console.error(
        "❌ Thiếu DISCORD_TOKEN trong file .env"
    );

    process.exit(1);
}

client.login(
    token
);