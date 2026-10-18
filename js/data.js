'use strict';

// Данные сайта: тарифы, меню и 20 компьютеров.
window.TopGameData = {
    tariffs: [
        { id: 'hour', name: '1 час', price: 1200, duration: 1 },
        { id: 'three-hours', name: '3 часа', price: 3600, duration: 3 },
        { id: 'night', name: 'Ночь', price: 4700, duration: null },
        { id: 'private', name: 'PRIVATE', price: 2500, duration: null }
    ],
    // Учебное меню. Реальный ассортимент нужно уточнить у клуба.
    menu: [
        { id: 'burger', name: 'Куриный бургер', category: 'food', price: 2700, portion: '570 г', description: 'Куриный бургер с овощами и соусом', allergens: 'Глютен, молоко, яйцо', available: true },
        { id: 'sandwich', name: 'Куриный хот-дог', category: 'food', price: 1800, portion: '350 г', description: 'Хот-дог с куриной сосиской и соусом', allergens: 'Глютен, молоко', available: true },
        { id: 'fries', name: 'Мясной бургер', category: 'food', price: 3500, portion: '670 г', description: 'Бургер с мясной котлетой и овощами', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'chips', name: 'Картофельные чипсы', category: 'snacks', price: 1050, portion: '70 г', description: 'Солёные чипсы в упаковке', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'cola', name: 'Кола Evervess', category: 'drinks', price: 900, portion: '500 мл', description: 'Газированный напиток', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'water', name: 'Питьевая вода', category: 'drinks', price: 525, portion: '500 мл', description: 'Вода без газа', allergens: 'Нет заявленных аллергенов', available: true },
        { id: 'tea', name: 'Холодный чай Lipton', category: 'drinks', price: 600, portion: '500 мл', description: 'Холодный чай в бутылке', allergens: 'Нет заявленных аллергенов', available: true },
        { id: 'cookie', name: 'Сок J7', category: 'drinks', price: 750, portion: '330 мл', description: 'Сок в упаковке', allergens: 'Состав уточняется у персонала', available: false }
    ],
    seats: []
};

// У каждого блюда есть фотография с таким же именем файла, как его id.
for (const item of window.TopGameData.menu) {
    item.image = 'images/food/' + item.id + '.jpg';
    item.imageAlt = item.name + ' — фото меню CyberX';
}

// Первые 10 ПК — MAIN, следующие 5 — DUO, последние 5 — PRIVATE.
for (let number = 1; number <= 20; number++) {
    let zone = 'main';
    let floor = 1;
    if (number > 10) {
        zone = 'duo';
        floor = 2;
    }
    if (number > 15) zone = 'private';
    window.TopGameData.seats.push({ id: number, zone: zone, floor: floor, type: 'PC' });
}
