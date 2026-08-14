const db = require("../database");

function getUser(id) {
    return db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(id);
}

function createUser(id, username) {
    const now = Date.now();

    db.prepare(`
        INSERT INTO users (
            id,
            username,
            level,
            exp,
            mora,
            luck,
            created_at,
            updated_at
        )
        VALUES (?, ?, 1, 0, 0, 0, ?, ?)
    `).run(id, username, now, now);

    return getUser(id);
}

function getOrCreateUser(id, username) {
    let user = getUser(id);

    if (!user) {
        user = createUser(id, username);
    }

    return user;
}

function updateUser(id, data) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    db.prepare(`
        UPDATE users
        SET ${fields.join(", ")}
        WHERE id = ?
    `).run(...values);

    return getUser(id);
}

module.exports = {
    getUser,
    createUser,
    getOrCreateUser,
    updateUser
};