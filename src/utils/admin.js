const { ADMIN_ID } = require("../config");

// ============================================================
// ADMIN
// ============================================================

function isAdmin(user) {

    if (!user) {
        return false;
    }

    if (!ADMIN_ID) {
        return false;
    }

    return String(user.id) ===
        String(ADMIN_ID);
}


// ============================================================
// ADMIN ONLY
// ============================================================

function adminOnly(
    interactionOrMessage
) {

    if (!interactionOrMessage) {
        return false;
    }

    const user =
        interactionOrMessage.user ||
        interactionOrMessage.author;

    return isAdmin(user);
}


// ============================================================
// GET MENTIONED USER
// ============================================================

function getMentionedUser(
    message
) {

    if (!message) {
        return null;
    }

    return (
        message.mentions?.users?.first() ||
        null
    );
}


// ============================================================
// ADMIN ERROR
// ============================================================

async function adminError(
    message
) {

    if (!message) {
        return null;
    }

    return message.reply({

        content:
            "❌ Bạn không có quyền sử dụng lệnh Admin."

    });
}


// ============================================================
// ADMIN TARGET ERROR
// ============================================================

async function adminTargetError(
    message
) {

    if (!message) {
        return null;
    }

    return message.reply({

        content:
            "❌ Hãy mention người chơi cần chỉnh.\n\n" +
            "Ví dụ:\n" +
            "`nadmin mora @user 10000`"

    });
}


// ============================================================
// CHECK TARGET
// ============================================================

function hasAdminTarget(
    message
) {

    return Boolean(
        getMentionedUser(message)
    );
}


// ============================================================
// GET TARGET ID
// ============================================================

function getTargetId(
    message
) {

    const user =
        getMentionedUser(message);

    if (!user) {
        return null;
    }

    return String(user.id);
}


// ============================================================
// ADMIN VALUE
// ============================================================

function getAdminValue(
    args,
    index = 0
) {

    if (!Array.isArray(args)) {
        return null;
    }

    const value =
        args[index];

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    return String(value);
}


// ============================================================
// ADMIN NUMBER
// ============================================================

function getAdminNumber(
    args,
    index = 0
) {

    const value =
        getAdminValue(
            args,
            index
        );

    if (value === null) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return null;
    }

    return number;
}


// ============================================================
// POSITIVE NUMBER
// ============================================================

function getPositiveNumber(
    args,
    index = 0
) {

    const number =
        getAdminNumber(
            args,
            index
        );

    if (
        number === null ||
        number <= 0
    ) {
        return null;
    }

    return number;
}


// ============================================================
// INTEGER
// ============================================================

function getInteger(
    args,
    index = 0
) {

    const number =
        getAdminNumber(
            args,
            index
        );

    if (
        number === null ||
        !Number.isInteger(number)
    ) {
        return null;
    }

    return number;
}


// ============================================================
// POSITIVE INTEGER
// ============================================================

function getPositiveInteger(
    args,
    index = 0
) {

    const number =
        getInteger(
            args,
            index
        );

    if (
        number === null ||
        number <= 0
    ) {
        return null;
    }

    return number;
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    isAdmin,

    adminOnly,

    getMentionedUser,

    adminError,

    adminTargetError,

    hasAdminTarget,

    getTargetId,

    getAdminValue,

    getAdminNumber,

    getPositiveNumber,

    getInteger,

    getPositiveInteger

};