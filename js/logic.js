'use strict';

// Здесь только расчёты: эти функции не меняют HTML.
function findProduct(products, id) {
    for (const product of products) {
        if (product.id === id) return product;
    }
    return null;
}

function validQuantity(value, maximum) {
    return Number.isInteger(value) && value >= 1 && value <= maximum;
}

function cartTotals(lines, products) {
    const totals = { quantity: 0, total: 0 };
    for (const line of lines) {
        const product = findProduct(products, line.id);
        if (product && validQuantity(line.quantity, 20)) {
            totals.quantity += line.quantity;
            totals.total += product.price * line.quantity;
        }
    }
    return totals;
}

function filterMenu(products, query, category, availableOnly) {
    const text = query.trim().toLowerCase();
    const result = [];
    for (const product of products) {
        const description = (product.name + ' ' + product.description).toLowerCase();
        if (category !== 'all' && product.category !== category) continue;
        if (availableOnly && !product.available) continue;
        if (!description.includes(text)) continue;
        result.push(product);
    }
    return result;
}

function estimateVisit(tariffs, tariffId, hours, players) {
    const tariff = findProduct(tariffs, tariffId);
    let maximum = 10;
    if (tariffId === 'private') maximum = 5;
    if (!tariff || !validQuantity(players, maximum) || !validQuantity(hours, 12)) return null;
    if (tariffId === 'private') return { amount: tariff.price, groupTotalKnown: false };
    if (tariffId === 'three-hours' && hours !== 3) return null;
    let amount = tariff.price * players;
    if (tariffId === 'hour') amount *= hours;
    return { amount: amount, groupTotalKnown: true };
}

function reference(prefix) {
    const time = Date.now().toString(36).toUpperCase();
    const number = Math.floor(1000 + Math.random() * 9000);
    return 'DEMO-' + prefix + '-' + time + '-' + number;
}

window.TopGameLogic = {
    findProduct: findProduct,
    validQuantity: validQuantity,
    cartTotals: cartTotals,
    filterMenu: filterMenu,
    estimateVisit: estimateVisit,
    reference: reference
};
