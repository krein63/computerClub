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
        // Проходим по корзине и складываем количество и стоимость.
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
        const text = query.trim().toLocaleLowerCase('ru');
        return products.filter(product => {
            const matchesCategory = category === 'all' || product.category === category;
            const matchesAvailability = !availableOnly || product.available;
            const matchesSearch = (product.name + ' ' + product.description).toLocaleLowerCase('ru').includes(text);
            return matchesCategory && matchesAvailability && matchesSearch;
        });
    }

    function estimateVisit(tariffs, tariffId, hours, players) {
        const tariff = findProduct(tariffs, tariffId);
        if (!tariff || !validQuantity(players, 20) || !validQuantity(hours, 12)) return null;
        if (!tariff.hourly && hours !== tariff.duration) return null;
        const units = tariff.hourly ? hours : 1;
        return { amount: tariff.price * units * players, groupTotalKnown: true };
    }

    function reference(prefix) {
        return `TG-${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    window.TopGameLogic = { findProduct, validQuantity, cartTotals, filterMenu, estimateVisit, reference };
})();
