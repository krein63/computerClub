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
        { id: 'burger', name: 'Куриный бургер', category: 'food', price: 1800, portion: '230 г', description: 'Курица, бекон, сыр, салат, томат и соус', allergens: 'Глютен, молоко, яйцо', available: true },
        { id: 'sandwich', name: 'Сэндвич с сыром', category: 'food', price: 1200, portion: '180 г', description: 'Ржаной хлеб и сыр', allergens: 'Глютен, молоко', available: true },
        { id: 'fries', name: 'Картофель фри', category: 'snacks', price: 900, portion: '150 г', description: 'Порция картофеля с кетчупом', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'chips', name: 'Картофельные чипсы', category: 'snacks', price: 700, portion: '90 г', description: 'Солёные чипсы в упаковке', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'cola', name: 'Кола', category: 'drinks', price: 600, portion: '200 мл', description: 'Газированный напиток', allergens: 'Состав уточняется у персонала', available: true },
        { id: 'water', name: 'Питьевая вода', category: 'drinks', price: 350, portion: '500 мл', description: 'Вода без газа', allergens: 'Нет заявленных аллергенов', available: true },
        { id: 'tea', name: 'Чёрный чай', category: 'drinks', price: 400, portion: '300 мл', description: 'Горячий чай без сахара', allergens: 'Нет заявленных аллергенов', available: true },
        { id: 'cookie', name: 'Шоколадное печенье', category: 'snacks', price: 500, portion: '80 г', description: 'Печенье с кусочками шоколада', allergens: 'Глютен, молоко, яйцо', available: false }
    ].map(item => ({ ...item, image: `images/food/${item.id}.jpg`, imageAlt: `${item.name} — фотоиллюстрация` })),
    // The user specified 20 PCs; actual positions and availability require club data.
    seats: Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        zone: index < 10 ? 'main' : index < 15 ? 'duo' : 'private',
        floor: index < 10 ? 1 : 2,
        type: 'PC'
    }))
};
