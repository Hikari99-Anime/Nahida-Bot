const fs = require("fs");
const path = require("path");

const dbPath = path.join(
    __dirname,
    "nahida.sqlite"
);

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("✅ Database đã được reset.");
} else {
    console.log("⚠️ Không tìm thấy database.");
}