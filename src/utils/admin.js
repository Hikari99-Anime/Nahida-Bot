const { ADMIN_ID } = require("../config");

// ============================================================
// ADMIN
// ============================================================

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

module.exports = {
    isAdmin,
    adminOnly,
    getMentionedUser,
    adminError,
    adminTargetError
};
