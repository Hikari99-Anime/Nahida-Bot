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

const { client } = require("./src/discord/client");

const { BREED_COST } = require("./src/config");

const plantDatabase =
    require("./database/plants");

require("./src/handlers/messageHandler")(client);
require("./src/handlers/interactionHandler")(client);

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
