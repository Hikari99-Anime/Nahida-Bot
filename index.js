require("dotenv").config();

const { client } = require("./src/discord/client");

// Khởi tạo database
require("./src/db");

// Handlers
require("./src/handlers/messageHandler")(client);
require("./src/handlers/interactionHandler")(client);

// ============================================================
// READY
// ============================================================

client.once("ready", () => {
    console.log("========================================");
    console.log(`🌱 Nahida Farm đã online: ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log(`🏠 Servers: ${client.guilds.cache.size}`);
    console.log("========================================");
});

// ============================================================
// LOGIN
// ============================================================

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("❌ Không tìm thấy DISCORD_TOKEN trong file .env");
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);