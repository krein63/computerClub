'use strict';

// Published tariff lower bounds are preserved from the frozen midterm.
window.TopGameData = {
    tariffs: [
        { id: 'hour', name: '1 час', price: 1200, duration: 1 },
        { id: 'three-hours', name: '3 часа', price: 3600, duration: 3 },
        { id: 'night', name: 'Ночь', price: 4700, duration: null },
        { id: 'private', name: 'PRIVATE', price: 2500, duration: null }
    ],
    // Sample food and prices for the assignment, not the club's verified menu.
    menu: [
        { id: 'burger', name: 'Куриный бургер', category: 'food', price: 2700, portion: '570 г', description: 'Куриный бургер с овощами и соусом', allergens: 'Глютен, молоко, яйцо', available: true },
        { id: 'sandwich', name: 'Куриный хот-дог', category: 'food', price: 1800, portion: '350 г', description: 'Хот-дог с куриной сосиской и соусом', allergens: 'Глютен, молоко', available: true },
        { id: 'fries', name: 'Мясной бургер', category: 'food', price: 1350, portion: '670 г', description: 'Бургер с мясной котлетой и овощами', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'chips', name: 'Картофельные чипсы', category: 'snacks', price: 1050, portion: '70 г', description: 'Солёные чипсы в упаковке', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'cola', name: 'Кола Evervess', category: 'drinks', price: 900, portion: '500 мл', description: 'Газированный напиток', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'water', name: 'Питьевая вода', category: 'drinks', price: 525, portion: '500 мл', description: 'Вода без газа', allergens: 'Нет заявленных аллергенов', available: true },
        { id: 'tea', name: 'Холодный чай Lipton', category: 'drinks', price: 600, portion: '500 мл', description: 'Холодный чай в бутылке', allergens: 'Нет заявленных аллергенов', available: true },
        { id: 'cookie', name: 'Сок J7', category: 'drinks', price: 750, portion: '330 мл', description: 'Сок в упаковке', allergens: 'Состав уточняется у персонала', available: false }
    ].map(item => ({ ...item, image: `images/food/${item.id}.jpg`, imageAlt: `${item.name} — фото меню CyberX` })),
    // The user specified 20 PCs; actual positions and availability require club data.
    seats: Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        zone: index < 10 ? 'main' : index < 15 ? 'duo' : 'private',
        floor: index < 10 ? 1 : 2,
        type: 'PC'
    }))
};
