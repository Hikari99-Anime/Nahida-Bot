// ============================================================
// 🌱 NAHIDA FARM
// index.js
// REBUILD — PHẦN 1 → 5
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
    StringSelectMenuBuilder
} = require("discord.js");

const Database = require("better-sqlite3");
const path = require("path");

// ============================================================
// DATABASE
// ============================================================

const plantDatabase = require("./database/plants");

const dbPath = path.join(__dirname, "nahidafarm.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

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
`);

// ============================================================
// CONSTANTS
// ============================================================

const PREFIX = "n";

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

const MAX_WATER = 100;
const DEFAULT_PLOTS = 5;

const client = new Client({
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
// USER DATABASE
// ============================================================

function now() {
    return Date.now();
}

function getUser(user) {
    const id = typeof user === "string" ? user : user.id;

    let row = db.prepare(
        `SELECT * FROM users WHERE id = ?`
    ).get(id);

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
            VALUES (?, ?, 1, 0, 1000, 0, 100, 1, 25, 0, 0, ?, ?)
        `).run(
            id,
            typeof user === "string" ? "Unknown" : user.username,
            now(),
            now()
        );

        row = db.prepare(
            `SELECT * FROM users WHERE id = ?`
        ).get(id);
    }

    return row;
}

function updateUser(id, fields) {

    const keys = Object.keys(fields);

    if (!keys.length) return;

    const set = keys
        .map(key => `${key} = @${key}`)
        .join(", ");

    db.prepare(`
        UPDATE users
        SET ${set}, updated_at = @updated_at
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

function xpRequired(level) {
    return Math.floor(
        100 + ((level - 1) * 50)
    );
}

function addXP(userId, amount) {

    let user = getUser(userId);

    let xp = user.xp + Math.max(0, amount);
    let level = user.level;

    let levelUps = 0;

    while (xp >= xpRequired(level)) {

        xp -= xpRequired(level);

        level++;

        levelUps++;
    }

    updateUser(userId, {
        xp,
        level
    });

    return {
        level,
        xp,
        levelUps
    };
}

function addFarmXP(userId, amount) {

    const user = getUser(userId);

    let farmXP =
        user.farm_xp +
        Math.max(0, amount);

    let farmLevel =
        user.farm_level;

    const needed =
        farmLevel * 100;

    if (farmXP >= needed) {

        farmXP -= needed;

        farmLevel++;
    }

    updateUser(userId, {
        farm_xp: farmXP,
        farm_level: farmLevel
    });

    return {
        farmLevel,
        farmXP
    };
}

// ============================================================
// INVENTORY
// ============================================================

function getItem(userId, itemId) {

    return db.prepare(`
        SELECT * FROM inventory
        WHERE user_id = ?
        AND item_id = ?
    `).get(userId, itemId);
}

function getItemCount(userId, itemId) {

    const item = getItem(userId, itemId);

    return item
        ? item.quantity
        : 0;
}

function addItem(userId, itemId, amount) {

    if (amount === 0) return;

    const current =
        getItemCount(userId, itemId);

    const quantity =
        Math.max(0, current + amount);

    if (quantity <= 0) {

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
        DO UPDATE SET quantity = excluded.quantity
    `).run(
        userId,
        itemId,
        quantity
    );
}

function getInventory(userId) {

    return db.prepare(`
        SELECT *
        FROM inventory
        WHERE user_id = ?
        AND quantity > 0
        ORDER BY item_id
    `).all(userId);
}

// ============================================================
// PLOTS
// ============================================================

function ensurePlots(userId) {

    for (
        let i = 1;
        i <= DEFAULT_PLOTS;
        i++
    ) {

        const exists = db.prepare(`
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
                VALUES (?, ?, NULL, NULL, NULL, 0, NULL)
            `).run(
                userId,
                i
            );
        }
    }
}

function getPlots(userId) {

    ensurePlots(userId);

    return db.prepare(`
        SELECT *
        FROM plots
        WHERE user_id = ?
        ORDER BY plot_id
    `).all(userId);
}

function getPlot(userId, plotId) {

    ensurePlots(userId);

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

// ============================================================
// PLANT HELPERS
// ============================================================

function plantName(plant) {

    if (!plant) {
        return "Cây không xác định";
    }

    return plant.nameVi ||
        plant.viName ||
        plant.name ||
        plant.id;
}

function plantEmoji(plant) {

    return plant?.emoji || "🌱";
}

function plantGrowth(plant) {

    return Math.max(
        1,
        Number(
            plant.growthTime
        ) ||
        plantDatabase.getGrowthTime(plant.id)
    );
}

function plantYield(plant) {

    if (
        typeof plantDatabase.getYield ===
        "function"
    ) {
        return plantDatabase.getYield(
            plant.id
        );
    }

    return 1;
}

function plantSellPrice(plant) {

    return plantDatabase.getSellPrice(
        plant.id
    );
}

function plantWaterCost(plant) {

    return plantDatabase.getWaterCost(
        plant.id
    );
}

// ============================================================
// TIME
// ============================================================

function formatTime(seconds) {

    seconds = Math.max(
        0,
        Math.floor(seconds)
    );

    const hours =
        Math.floor(seconds / 3600);

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    if (hours > 0) {

        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {

        return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
}

function isReady(plot) {

    if (!plot.plant_id) {
        return false;
    }

    return now() >=
        Number(plot.finish_at);
}

function growthPercent(plot) {

    if (!plot.planted_at ||
        !plot.finish_at) {

        return 0;
    }

    const total =
        plot.finish_at -
        plot.planted_at;

    const passed =
        now() -
        plot.planted_at;

    return Math.max(
        0,
        Math.min(
            100,
            Math.floor(
                (passed / total) * 100
            )
        )
    );
}

// ============================================================
// PROGRESS BAR
// ============================================================

function progressBar(
    current,
    max,
    length = 20
) {

    max = Math.max(
        1,
        max
    );

    current = Math.max(
        0,
        Math.min(
            max,
            current
        )
    );

    const filled =
        Math.round(
            (current / max) *
            length
        );

    return (
        "█".repeat(filled) +
        "░".repeat(
            length - filled
        )
    );
}

// ============================================================
// COMMON EMBED
// ============================================================

function farmEmbed({
    user,
    title,
    description = "",
    color = COLORS.green,
    footer = true
}) {

    const data = getUser(user);

    const embed =
        new EmbedBuilder()
            .setColor(color)

            // Avatar tròn nhỏ + username + level ở góc trái
            .setAuthor({
                name: `${user.username} • Lv.${data.level}`,
                iconURL: user.displayAvatarURL({
                    extension: "png",
                    size: 64
                })
            })

            // Tên embed nằm bên dưới Author
            .setTitle(`\`${title}\``)

            .setDescription(description);

    if (footer) {
        embed.setFooter({
            text: "Nahida Farm • Mỗi hạt giống đều mang một giấc mơ nhỏ."
        });
    }

    return embed;
}

// ============================================================
// PROFILE EMBED
// ============================================================

function profileEmbed(user) {

    const data =
        getUser(user);

    const required =
        xpRequired(data.level);

    const percentage =
        Math.floor(
            (data.xp / required) * 100
        );

    const farmPlots =
        DEFAULT_PLOTS +
        Math.max(
            0,
            data.farm_level - 1
        );

    const description = [

        `\`${user.username}\` — **Lv.${data.level}**`,

        `✦ ${progressBar(
            data.xp,
            required,
            20
        )} **${percentage}%**`,
        `${data.xp} / ${required} EXP`,

        "",

        "💰 **TÀI SẢN**",
        `> ${data.mora.toLocaleString()} Mora`,
        `> 🍀 May mắn +${data.luck}`,

        "",

        "🌿 **NÔNG TRẠI**",
        `> Farm Lv.${data.farm_level}`,
        `> ${farmPlots} ô đất`,
        `> ✦ ${data.farm_xp} Farm EXP`,

        "",

        "💧 **NƯỚC**",
        `> ${progressBar(
            data.water,
            MAX_WATER,
            20
        )} **${data.water}%**`,
        `> ${data.water} / ${MAX_WATER} Nước`,

        "",

        "📖 **NHẬT KÝ**",
        "> Khu vườn của bạn đang từng ngày lớn lên.",
        "> Hãy chăm sóc cây và lai tạo những giống mới.",

        "",

        "📊 **THỐNG KÊ**",
        `> 🌱 Cây ${farmPlots} • 🌾 Thu hoạch ${data.harvest_count}`,
        `> 🐛 Bắt sâu ${data.bug_count} • 🟫 Đất ${farmPlots}/${farmPlots}`

    ].join("\n");

    return farmEmbed({
        user,
        title: "Hồ sơ Nhà Vườn",
        description,
        color: COLORS.green
    });
}

// ============================================================
// FARM EMBED
// ============================================================

function farmEmbedView(user) {

    const data =
        getUser(user);

    const plots =
        getPlots(user.id);

    const lines = [];

    lines.push(
        `\`${user.username}\` — **Lv.${data.level}**`
    );

    lines.push("");

    lines.push("💧 **NƯỚC**");

    lines.push(
        `> ${progressBar(
            data.water,
            100,
            20
        )} **${data.water}%**`
    );

    lines.push(
        `> ${data.water} / 100`
    );

    lines.push("");

    lines.push("🟫 **Ô ĐẤT**");

    for (const plot of plots) {

        lines.push("");

        if (!plot.plant_id) {

            lines.push(
                `🌱 **Ô ${plot.plot_id}**`
            );

            lines.push(
                "> Trống — Có thể gieo hạt"
            );

            continue;
        }

        const plant =
            plantDatabase.getPlant(
                plot.plant_id
            );

        if (!plant) {

            lines.push(
                `🌱 **Ô ${plot.plot_id}**`
            );

            lines.push(
                "> Cây không xác định"
            );

            continue;
        }

        lines.push(
            `${plantEmoji(plant)} **Ô ${plot.plot_id} — ${plantName(plant)}**`
        );

        if (isReady(plot)) {

            lines.push(
                "> 🌾 **Đã trưởng thành!**"
            );

        } else {

            const percent =
                growthPercent(plot);

            const remaining =
                Math.ceil(
                    (plot.finish_at - now()) /
                    1000
                );

            lines.push(
                `> ${progressBar(
                    percent,
                    100,
                    16
                )} **${percent}%**`
            );

            lines.push(
                `> ⏳ Còn ${formatTime(remaining)}`
            );
        }

        if (plot.watered) {

            lines.push(
                "> 💧 Đã tưới"
            );
        }
    }

    return farmEmbed({
        user,
        title: "Nông Trại",
        description: lines.join("\n"),
        color: COLORS.dendro
    });
}

// ============================================================
// INVENTORY EMBED
// ============================================================

function inventoryEmbed(user) {

    const items =
        getInventory(user.id);

    const lines = [];

    lines.push(
        `\`${user.username}\` — **Lv.${getUser(user).level}**`
    );

    lines.push("");

    if (!items.length) {

        lines.push(
            "> 🎒 Túi đồ đang trống."
        );

    } else {

        lines.push("🎒 **VẬT PHẨM**");

        for (const item of items) {

            const plant =
                plantDatabase.getPlant(
                    item.item_id
                );

            if (plant) {

                lines.push(
                    `> ${plantEmoji(plant)} ${plantName(plant)} ×${item.quantity}`
                );

                continue;
            }

            lines.push(
                `> 📦 ${item.item_id} ×${item.quantity}`
            );
        }
    }

    return farmEmbed({
        user,
        title: "Túi Đồ",
        description: lines.join("\n"),
        color: COLORS.gold
    });
}

// ============================================================
// SHOP EMBED
// ============================================================

function shopEmbed(user) {

    const data = getUser(user);

    const plants = plantDatabase
        .getAvailablePlants(data.level)
        .slice(0, 25);

    const lines = [];

    lines.push(
        `\`${user.username}\` — **Lv.${data.level}**`
    );

    lines.push("");

    lines.push(
        `💰 **Mora:** ${data.mora.toLocaleString()}`
    );

    lines.push("");

    if (!plants.length) {

        lines.push(
            "> 🌱 Hiện chưa có hạt giống nào được mở khóa."
        );

    } else {

        lines.push("🌱 **HẠT GIỐNG**");
        lines.push("");

        for (const plant of plants) {

            const price =
                Math.max(
                    0,
                    Number(plant.seedPrice) || 0
                );

            const growth =
                plantGrowth(plant);

            const owned =
                getItemCount(
                    user.id,
                    plant.id
                );

            lines.push(
                `${plantEmoji(plant)} **${plantName(plant)}**`
            );

            lines.push(
                `> 💰 ${price.toLocaleString()} Mora • ⏱️ ${formatTime(growth)}`
            );

            lines.push(
                `> 🎒 Đang có: **${owned}**`
            );

            lines.push("");
        }
    }

    return farmEmbed({
        user,
        title: "Cửa Hàng",
        description: lines.join("\n"),
        color: COLORS.gold
    });
}
// ============================================================
// SHOP SELECT MENU
// ============================================================

function shopSelectMenu(user) {

    const data =
        getUser(user);

    const plants =
        plantDatabase
            .getAvailablePlants(data.level)
            .slice(0, 25);

    if (!plants.length) {
        return null;
    }

    const options =
        plants.map(plant => {

            const price =
                Math.max(
                    0,
                    Number(plant.seedPrice) || 0
                );

            const owned =
                getItemCount(
                    user.id,
                    plant.id
                );

            return {

                label:
                    `${plantEmoji(plant)} ${plantName(plant)}`
                        .slice(0, 100),

                description:
                    `${price.toLocaleString()} Mora • Đang có: ${owned}`
                        .slice(0, 100),

                value:
                    plant.id
            };
        });

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("shop_buy")
            .setPlaceholder(
                "🛒 Chọn hạt giống muốn mua..."
            )
            .addOptions(options);

    return [
        new ActionRowBuilder()
            .addComponents(menu),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home_farm")
                    .setLabel("Nông trại")
                    .setEmoji("🌱")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("home_inventory")
                    .setLabel("Túi đồ")
                    .setEmoji("🎒")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji("🏠")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}
// ============================================================
// PLANT DETAIL
// ============================================================

function plantDetailEmbed(
    user,
    plant
) {

    const genes =
        plantDatabase.getGenes(
            plant.id
        );

    const lines = [];

    lines.push(
        `\`${plant.name || plant.id}\``
    );

    if (plant.nameVi) {

        lines.push(
            `**${plant.nameVi}**`
        );
    }

    lines.push("");

    lines.push(
        `${plantEmoji(plant)} **${plant.region || "Unknown"}**`
    );

    lines.push(
        `⭐ Rarity: **${plant.rarity ?? "?"}**`
    );

    if (plant.element) {

        lines.push(
            `✨ Element: **${plant.element}**`
        );
    }

    lines.push("");

    lines.push("🌱 **CANH TÁC**");

    lines.push(
        `> ⏱️ Sinh trưởng: ${formatTime(
            plantGrowth(plant)
        )}`
    );

    lines.push(
        `> 🌾 Sản lượng: ${plant.yield?.min ?? plant.yield ?? 1}–${plant.yield?.max ?? plant.yield ?? 1}`
    );

    lines.push(
        `> 💧 Nước: ${plantWaterCost(plant)}`
    );

    lines.push(
        `> 💰 Bán: ${plantSellPrice(plant)} Mora`
    );

    if (genes) {

        lines.push("");

        lines.push("🧬 **GENETICS**");

        lines.push(
            `> Growth ${genes.growth}`
        );

        lines.push(
            `> Yield ${genes.yield}`
        );

        lines.push(
            `> Water ${genes.water}`
        );

        lines.push(
            `> Rarity ${genes.rarity}`
        );

        lines.push(
            `> Mutation ${genes.mutation}`
        );
    }

    return farmEmbed({
        user,
        title: `${plantEmoji(plant)} ${plantName(plant)}`,
        description: lines.join("\n"),
        color: COLORS.purple
    });
}

// ============================================================
// BUTTONS
// ============================================================

function mainButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home_farm")
                    .setLabel("Nông trại")
                    .setEmoji("🌱")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("home_profile")
                    .setLabel("Hồ sơ")
                    .setEmoji("👤")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("home_inventory")
                    .setLabel("Túi đồ")
                    .setEmoji("🎒")
                    .setStyle(ButtonStyle.Secondary)
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home_shop")
                    .setLabel("Cửa hàng")
                    .setEmoji("🛒")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("home_genetics")
                    .setLabel("Lai tạo")
                    .setEmoji("🧬")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("home_help")
                    .setLabel("Hướng dẫn")
                    .setEmoji("📖")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

function farmButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("farm_plant")
                    .setLabel("Gieo hạt")
                    .setEmoji("🌱")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("farm_water")
                    .setLabel("Tưới nước")
                    .setEmoji("💧")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("farm_harvest")
                    .setLabel("Thu hoạch")
                    .setEmoji("🌾")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("farm_bug")
                    .setLabel("Bắt sâu")
                    .setEmoji("🐛")
                    .setStyle(ButtonStyle.Secondary)
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home_profile")
                    .setLabel("Hồ sơ")
                    .setEmoji("👤")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("home_inventory")
                    .setLabel("Túi đồ")
                    .setEmoji("🎒")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("farm_refresh")
                    .setLabel("Làm mới")
                    .setEmoji("🔄")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji("🏠")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

function backButton() {

    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji("🏠")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

// ============================================================
// HOME
// ============================================================

function homeEmbed(user) {

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
// HELP
// ============================================================

function helpEmbed(user) {

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

        "🛒 **KINH TẾ**",
        "> Xem cửa hàng bằng 🛒",
        "> Mua hạt giống trực tiếp",
        "> Thu hoạch để nhận Mora",

        "",

        "🧬 **GENETICS**",
        "> Mỗi cây có bộ gene riêng.",
        "> Một số cây có thể xuất hiện mutation.",

        "",

        "💡 Hầu hết thao tác đều có thể dùng",
        "button nên bạn không cần nhớ nhiều lệnh."

    ].join("\n");

    return farmEmbed({
        user,
        title: "Hướng Dẫn",
        description: text,
        color: COLORS.water
    });
}

// ============================================================
// PLANT SELECT
// ============================================================

function plantSelectMenu(user) {

    const data =
        getUser(user);

    const plants =
        plantDatabase
            .getAvailablePlants(
                data.level
            )
            .slice(0, 25);

    const options =
        plants.map(plant => ({

            label:
                plantName(plant)
                    .slice(0, 100),

            description:
                `${plant.region || "Unknown"} • ${plant.seedPrice || 0} Mora`
                    .slice(0, 100),

            value:
                plant.id

        }));

    if (!options.length) {

        return null;
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("select_plant")
            .setPlaceholder(
                "🌱 Chọn hạt giống..."
            )
            .addOptions(options);

    return [
        new ActionRowBuilder()
            .addComponents(menu),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Quay lại")
                    .setEmoji("⬅️")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

// ============================================================
// BUY PLANT
// ============================================================

async function buyPlant(
    interaction,
    plantId
) {

    const user =
        getUser(
            interaction.user
        );

    const plant =
        plantDatabase.getPlant(
            plantId
        );

    if (!plant) {

        return interaction.reply({
            content:
                "❌ Không tìm thấy hạt giống.",
            ephemeral: true
        });
    }

    // Kiểm tra level
    if (
        typeof plant.unlockLevel !== "undefined" &&
        user.level <
        Number(plant.unlockLevel)
    ) {

        return interaction.reply({
            content:
                `🔒 Bạn cần **Lv.${plant.unlockLevel}** để mua hạt giống này.`,
            ephemeral: true
        });
    }

    const price =
        Math.max(
            0,
            Number(plant.seedPrice) || 0
        );

    if (price <= 0) {

        return interaction.reply({
            content:
                `❌ Hạt giống **${plantName(plant)}** chưa được thiết lập giá trong \`plants.json\`.`,
            ephemeral: true
        });
    }

    if (user.mora < price) {

        return interaction.reply({
            content:
                `❌ Bạn không đủ Mora.\n\n` +
                `💰 Giá: **${price.toLocaleString()} Mora**\n` +
                `💰 Bạn có: **${user.mora.toLocaleString()} Mora**`,
            ephemeral: true
        });
    }

    // Trừ Mora
    updateUser(
        interaction.user.id,
        {
            mora:
                user.mora - price
        }
    );

    // Thêm hạt vào túi
    addItem(
        interaction.user.id,
        plant.id,
        1
    );

    const newUser =
        getUser(
            interaction.user
        );

    const owned =
        getItemCount(
            interaction.user.id,
            plant.id
        );

    await interaction.update({
        embeds: [
            farmEmbed({
                user:
                    interaction.user,

                title:
                    "Mua Hạt Giống",

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +

                    `> 🌱 Đã mua: **×1**\n` +

                    `> 🎒 Trong túi: **×${owned}**\n` +

                    `> 💰 -${price.toLocaleString()} Mora\n` +

                    `> 💰 Còn lại: **${newUser.mora.toLocaleString()} Mora**`,

                color:
                    COLORS.gold
            })
        ],

        components:
            shopSelectMenu(
                interaction.user
            ) || backButton()
    });
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
        plantDatabase.getPlant(
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

    if (plot.plant_id) {

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

    if (seedCount <= 0) {

        return interaction.reply({
            content:
                `❌ Bạn không có hạt giống **${plantName(plant)}**.`,
            ephemeral: true
        });
    }

    const water =
        plantWaterCost(plant);

    if (user.water < water) {

        return interaction.reply({
            content:
                `❌ Không đủ nước. Cần **${water}** nước.`,
            ephemeral: true
        });
    }

    const growth =
        plantGrowth(plant);

    const plantedAt =
        now();

    const finishAt =
        plantedAt +
        growth * 1000;

    addItem(
        interaction.user.id,
        plant.id,
        -1
    );

    updateUser(
        interaction.user.id,
        {
            water:
                user.water - water
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

    await interaction.reply({
        embeds: [
            farmEmbed({
                user: interaction.user,
                title: "Gieo Hạt Thành Công",
                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> 🟫 Ô đất: **${plotId}**\n` +
                    `> ⏱️ Thời gian: **${formatTime(growth)}**\n` +
                    `> 💧 Đã dùng: **${water} nước**`,
                color: COLORS.green
            })
        ],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("home_farm")
                        .setLabel("Xem nông trại")
                        .setEmoji("🌱")
                        .setStyle(ButtonStyle.Success)
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

    if (!plot ||
        !plot.plant_id) {

        return interaction.reply({
            content:
                "❌ Ô đất này không có cây.",
            ephemeral: true
        });
    }

    if (!isReady(plot)) {

        const remaining =
            Math.ceil(
                (plot.finish_at - now()) /
                1000
            );

        return interaction.reply({
            content:
                `⏳ Cây chưa trưởng thành. Còn **${formatTime(remaining)}**.`,
            ephemeral: true
        });
    }

    const plant =
        plantDatabase.getPlant(
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
        plantYield(plant);

    let sell =
        plantSellPrice(plant);

    let mutation = null;

    if (
        typeof plantDatabase.rollMutation ===
        "function"
    ) {

        mutation =
            plantDatabase.rollMutation();
    }

    if (mutation) {

        amount = Math.ceil(
            amount *
            Number(
                mutation.yieldMultiplier || 1
            )
        );

        sell = Math.ceil(
            sell *
            Number(
                mutation.sellMultiplier || 1
            )
        );
    }

    const total =
        amount * sell;

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
                user.mora + total,

            harvest_count:
                user.harvest_count + 1
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

    let result =
        `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
        `> 🌾 Thu hoạch: **×${amount}**\n` +
        `> 💰 Nhận: **${total.toLocaleString()} Mora**\n` +
        `> ✨ +25 EXP`;

    if (mutation) {

        result +=
            `\n> ${mutation.emoji || "✨"} **${mutation.name || mutation.id} Mutation!**`;
    }

    await interaction.reply({
        embeds: [
            farmEmbed({
                user: interaction.user,
                title: "Thu Hoạch",
                description: result,
                color: COLORS.gold
            })
        ],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("home_farm")
                        .setLabel("Nông trại")
                        .setEmoji("🌱")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId("home_profile")
                        .setLabel("Hồ sơ")
                        .setEmoji("👤")
                        .setStyle(ButtonStyle.Primary)
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

    if (!plot ||
        !plot.plant_id) {

        return interaction.reply({
            content:
                "❌ Ô này chưa có cây.",
            ephemeral: true
        });
    }

    if (plot.watered) {

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

    const cost =
        Math.max(
            5,
            Math.floor(
                plantWaterCost(
                    plantDatabase.getPlant(
                        plot.plant_id
                    )
                ) / 2
            )
        );

    if (user.water < cost) {

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
                user.water - cost
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

    await interaction.reply({
        embeds: [
            farmEmbed({
                user: interaction.user,
                title: "Tưới Nước",
                description:
                    `💧 Bạn đã tưới cho cây ở **ô ${plotId}**.\n\n` +
                    `> 💧 -${cost} nước\n` +
                    `> 🌱 Cây tiếp tục phát triển.`,
                color: COLORS.water
            })
        ],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("home_farm")
                        .setLabel("Nông trại")
                        .setEmoji("🌱")
                        .setStyle(ButtonStyle.Success)
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

    let reward = 5;

    if (chance < 0.05) {

        reward = 50;

    } else if (chance < 0.20) {

        reward = 20;
    }

    updateUser(
        interaction.user.id,
        {
            mora:
                user.mora + reward,

            bug_count:
                user.bug_count + 1
        }
    );

    await interaction.reply({
        embeds: [
            farmEmbed({
                user: interaction.user,
                title: "Bắt Sâu",
                description:
                    `🐛 Bạn đã bắt được một con sâu trong vườn!\n\n` +
                    `> 💰 Nhận **${reward} Mora**\n` +
                    `> 🐛 Bắt sâu: **+1**`,
                color: COLORS.green
            })
        ],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("home_farm")
                        .setLabel("Quay lại vườn")
                        .setEmoji("🌱")
                        .setStyle(ButtonStyle.Success)
                )
        ]
    });
}

// ============================================================
// SELECT PLOT
// ============================================================

function plotSelect(
    userId,
    plantId,
    action
) {

    const plots =
        getPlots(userId);

    const available =
        plots.filter(
            p => !p.plant_id
        );

    const rows = [];

    if (action === "plant") {

        const row =
            new ActionRowBuilder();

        for (const plot of available) {

            row.addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `plant_${plantId}_${plot.plot_id}`
                    )
                    .setLabel(
                        `Ô ${plot.plot_id}`
                    )
                    .setEmoji("🟫")
                    .setStyle(
                        ButtonStyle.Success
                    )
            );

            if (
                row.components.length >= 5
            ) break;
        }

        if (row.components.length) {

            rows.push(row);
        }
    }

    return rows;
}

// ============================================================
// GENETICS
// ============================================================

function geneticsEmbed(user) {

    const plants =
        plantDatabase
            .getAvailablePlants(
                getUser(user).level
            )
            .slice(0, 10);

    const lines = [

        `\`${user.username}\` — **Lv.${getUser(user).level}**`,

        "",

        "🧬 **GENETICS**",

        "> Mỗi giống cây sở hữu những đặc tính",
        "> khác nhau về sinh trưởng, sản lượng",
        "> nước, độ hiếm và mutation.",

        ""

    ];

    for (const plant of plants) {

        const genes =
            plantDatabase.getGenes(
                plant.id
            );

        if (!genes) continue;

        lines.push(
            `${plantEmoji(plant)} **${plantName(plant)}**`
        );

        lines.push(
            `> G ${genes.growth} • Y ${genes.yield} • W ${genes.water} • R ${genes.rarity} • M ${genes.mutation}`
        );
    }

    return farmEmbed({
        user,
        title: "Genetics",
        description: lines.join("\n"),
        color: COLORS.purple
    });
}

// ============================================================
// GENETICS BUTTONS
// ============================================================

function geneticsButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("genetics_info")
                    .setLabel("Thông tin")
                    .setEmoji("🧬")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("home_farm")
                    .setLabel("Nông trại")
                    .setEmoji("🌱")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("home")
                    .setLabel("Trang chủ")
                    .setEmoji("🏠")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

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
                plantDatabase.getAllPlants().length
            } plants.`
        );

        client.user.setPresence({
            activities: [
                {
                    name:
                        "chăm sóc khu vườn 🌱",
                    type: 0
                }
            ],
            status: "online"
        });
    }
);

// ============================================================
// MESSAGE COMMANDS
// ============================================================

client.on(
    "messageCreate",
    async message => {

        if (message.author.bot) return;

        if (
            !message.content
                .toLowerCase()
                .startsWith(PREFIX)
        ) return;

        const args =
            message.content
                .slice(PREFIX.length)
                .trim()
                .split(/\s+/);

        const command =
            (args.shift() || "")
                .toLowerCase();

        if (!command) return;

        getUser(message.author);

        ensurePlots(
            message.author.id
        );

        try {

            switch (command) {

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
                                        .setEmoji("🌱")
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
                                        .setEmoji("🎒")
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
                                        .setEmoji("🏠")
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
            ) || backButton()
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
                                menu || backButton()
                        });

                        break;
                    }

                    const plant =
                        plantDatabase.getPlant(
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
                            plant.id,
                            "plant"
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

                case "nplant": {

                    const plant =
                        plantDatabase.getPlant(
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
                                    `💡 Dùng **\`nhelp\`** hoặc bấm nút bên dưới.`,
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
                                        .setEmoji("📖")
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
                                        .setEmoji("🏠")
                                        .setStyle(
                                            ButtonStyle.Secondary
                                        )       )
                                ]
                        
                    });
            }

        } catch (error) {

            console.error(
                "Command error:",
                error
            );

            if (!message.replied) {

                await message.reply(
                    "❌ Có lỗi xảy ra. Hãy thử lại."
                );
            }
        }
    }
);

// ============================================================
// BUTTON INTERACTIONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            if (
                interaction.isStringSelectMenu()
            ) {

                if (
                    interaction.customId ===
                    "select_plant"
                ) {

                    const plantId =
                        interaction.values[0];

                    const plant =
                        plantDatabase.getPlant(
                            plantId
                        );

                    if (!plant) {

                        return interaction.reply({
                            content:
                                "❌ Không tìm thấy cây.",
                            ephemeral: true
                        });
                    }

                    const rows =
                        plotSelect(
                            interaction.user.id,
                            plant.id,
                            "plant"
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

                return;
            }

            if (
                !interaction.isButton()
            ) return;

            const id =
                interaction.customId;

            // ------------------------------------------------
            // HOME
            // ------------------------------------------------

            if (id === "home") {

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

            if (id === "home_profile") {

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
                                    .setEmoji("🌱")
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
                                    .setEmoji("🎒")
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
                                    .setEmoji("🏠")
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                            )
                    ]
                });
            }

            if (id === "home_farm") {

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

            if (id === "home_inventory") {

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
if (id === "home_shop") {

    return interaction.update({

        embeds: [
            shopEmbed(
                interaction.user
            )
        ],

        components:
            shopSelectMenu(
                interaction.user
            ) || backButton()
    });
}

            if (id === "home_genetics") {

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

            if (id === "home_help") {

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

            // ------------------------------------------------
            // REFRESH
            // ------------------------------------------------

            if (id === "farm_refresh") {

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

            // ------------------------------------------------
            // PLANT
            // ------------------------------------------------

            if (id === "farm_plant") {

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
                        menu || backButton()
                });
            }

            // ------------------------------------------------
            // WATER
            // ------------------------------------------------

            if (id === "farm_water") {

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

                if (!active.length) {

                    return interaction.reply({
                        content:
                            "💧 Hiện không có cây nào cần tưới.",
                        ephemeral: true
                    });
                }

                const row =
                    new ActionRowBuilder();

                for (const plot of active) {

                    row.addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                `water_${plot.plot_id}`
                            )
                            .setLabel(
                                `Ô ${plot.plot_id}`
                            )
                            .setEmoji("💧")
                            .setStyle(
                                ButtonStyle.Primary
                            )
                    );
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
                    ephemeral: true
                });
            }

            // ------------------------------------------------
            // HARVEST
            // ------------------------------------------------

            if (id === "farm_harvest") {

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

                if (!ready.length) {

                    return interaction.reply({
                        content:
                            "🌱 Chưa có cây nào trưởng thành.",
                        ephemeral: true
                    });
                }

                const row =
                    new ActionRowBuilder();

                for (const plot of ready) {

                    row.addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                `harvest_${plot.plot_id}`
                            )
                            .setLabel(
                                `Ô ${plot.plot_id}`
                            )
                            .setEmoji("🌾")
                            .setStyle(
                                ButtonStyle.Success
                            )
                    );
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
                    ephemeral: true
                });
            }

            // ------------------------------------------------
            // BUG
            // ------------------------------------------------

            if (id === "farm_bug") {

                return catchBug(
                    interaction
                );
            }

            // ------------------------------------------------
            // GENETICS
            // ------------------------------------------------

            if (id === "genetics_info") {

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

            // ------------------------------------------------
            // PLANT TO PLOT
            // ------------------------------------------------

            if (
                id.startsWith("plant_")
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

            // ------------------------------------------------
            // WATER PLOT
            // ------------------------------------------------

            if (
                id.startsWith("water_")
            ) {

                const plotId =
                    Number(
                        id.split("_")[1]
                    );

                return waterPlot(
                    interaction,
                    plotId
                );
            }

            // ------------------------------------------------
            // HARVEST PLOT
            // ------------------------------------------------

            if (
                id.startsWith("harvest_")
            ) {

                const plotId =
                    Number(
                        id.split("_")[1]
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
                        ephemeral: true
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ Có lỗi xảy ra.",
                        ephemeral: true
                    });
                }

            } catch {}
        }
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

client.login(token);