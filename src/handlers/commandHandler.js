const fs = require("fs");
const path = require("path");

function loadCommands(client) {
    const commandsPath = path.join(__dirname, "../commands");
    const files = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of files) {
        const command = require(path.join(commandsPath, file));

        if (!command.data || !command.execute) {
            console.warn(`Invalid command: ${file}`);
            continue;
        }

        client.commands.set(
            command.data.name,
            command
        );
    }

    console.log(`🌱 Loaded ${client.commands.size} commands`);
}

module.exports = {
    loadCommands
};