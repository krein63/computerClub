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

    function tariffSchedule(tariff) {
        if (tariff.timeWindow) return `${tariff.timeWindow.start}–${tariff.timeWindow.end}`;
        if (!tariff.startTime) return '';
        const endHour = (Number(tariff.startTime.slice(0, 2)) + tariff.duration) % 24;
        return `${tariff.startTime}–${String(endHour).padStart(2, '0')}:00`;
    }

    function tariffTimeError(tariff, time) {
        if (tariff.startTime && time !== tariff.startTime) {
            return `Пакет «${tariff.name}» начинается в ${tariff.startTime} по Астане.`;
        }
        if (!tariff.timeWindow) return '';

        function minutes(time) {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        }
        const dayMinutes = 24 * 60;
        const start = minutes(tariff.timeWindow.start);
        const windowLength = (minutes(tariff.timeWindow.end) - start + dayMinutes) % dayMinutes;
        const offset = (minutes(time) - start + dayMinutes) % dayMinutes;
        return offset + tariff.duration * 60 <= windowLength
            ? ''
            : `Сеанс должен полностью укладываться в ${tariffSchedule(tariff)} по Астане.`;
    }

    function reservationAmount(tariffs, booking) {
        const tariff = findProduct(tariffs, booking.tariff);
        const estimate = estimateVisit(tariffs, booking.tariff, booking.duration, booking.seats.length);
        if (!estimate) return null;
        if (Number.isSafeInteger(booking.amount) && booking.amount > 0) return booking.amount;
        // Older requests did not store the price paid for a fixed package.
        return tariff.previousPrice ? tariff.previousPrice * booking.seats.length : estimate.amount;
    }

    function reference(prefix) {
        return `TG-${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    function localDateTime(date, time) {
        return Date.parse(`${date}T${time}:00+05:00`);
    }

    function validDate(date) {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        const parsed = Date.parse(date + 'T00:00:00Z');
        return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === date;
    }

    function visitInterval(date, time, hours) {
        if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !validQuantity(hours, 12)) return null;
        const start = localDateTime(date, time);
        return { start, end: start + hours * 3600000 };
    }

    function validReservations(saved, tariffs, seats) {
        if (!Array.isArray(saved)) return [];
        return saved.filter(item => {
            if (!item || typeof item.id !== 'string' || item.id.length > 80 || !findProduct(tariffs, item.tariff)) return false;
            const interval = visitInterval(item.date, item.time, item.duration);
            if (!interval || interval.start !== item.start || interval.end !== item.end || !Array.isArray(item.seats)) return false;
            return validQuantity(item.seats.length, seats.length) &&
                new Set(item.seats).size === item.seats.length &&
                item.seats.every(id => findProduct(seats, id));
        });
    }

    function activeReservation(reservations, selectedId) {
        const active = reservations.filter(item => item.end > Date.now());
        return selectedId === undefined ? active.at(-1) : active.find(item => item.id === selectedId);
    }

    window.TopGameLogic = {
        findProduct, validQuantity, cartTotals, filterMenu, estimateVisit,
        tariffSchedule, tariffTimeError, reservationAmount, reference,
        localDateTime, validDate, visitInterval, validReservations, activeReservation
    };
})();
