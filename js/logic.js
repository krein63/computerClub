'use strict';

// Assignment 4: pure functions can be checked without a DOM or a server.
(() => {
    function findProduct(products, id) {
        return products.find(product => product.id === id);
    }

    function validQuantity(value, maximum) {
        return Number.isInteger(value) && value >= 1 && value <= maximum;
    }

    function cartTotals(lines, products) {
        return lines.reduce((totals, line) => {
            const product = findProduct(products, line.id);
            if (!product || !validQuantity(line.quantity, 20)) return totals;
            return { quantity: totals.quantity + line.quantity, total: totals.total + product.price * line.quantity };
        }, { quantity: 0, total: 0 });
    }

    function filterMenu(products, query, category, availableOnly) {
        const text = query.trim().toLocaleLowerCase('ru');
        return products.filter(product => (category === 'all' || product.category === category) && (!availableOnly || product.available) && `${product.name} ${product.description}`.toLocaleLowerCase('ru').includes(text));
    }

    function estimateVisit(tariffs, tariffId, hours, players) {
        const tariff = findProduct(tariffs, tariffId);
        if (!tariff || !validQuantity(players, 45) || !validQuantity(hours, 12)) return null;
        if (tariffId === 'private') return { amount: tariff.price, groupTotalKnown: false };
        if (tariffId === 'three-hours' && hours !== 3) return null;
        const units = tariffId === 'hour' ? hours : 1;
        return { amount: tariff.price * units * players, groupTotalKnown: true };
    }

    function reference(prefix) {
        return `DEMO-${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    window.TopGameLogic = { findProduct, validQuantity, cartTotals, filterMenu, estimateVisit, reference };
})();
