function getPlantDisplayId(id) {
    return `#${String(id).padStart(4, "0")}`;
}

function getGenerationName(generation) {

    return `Thế hệ ${generation}`;
}

module.exports = {
    getPlantDisplayId,
    getGenerationName
};