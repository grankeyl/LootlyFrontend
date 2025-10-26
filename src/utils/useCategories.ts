interface Categories {
    id: number;
    key: string;
    name: string;
}

const getCategories = (lang: string) => {
    let categories;
    
    if (lang === "en") {
        categories = {
            "all": {
                "id": 0,
                "key": "all",
                "name": "All gifts"
            },
            "rare": {
                "id": 1,
                "key": "rare",
                "name": "Rare"
            },
            "very rare": {
                "id": 2,
                "key": "very rare",
                "name": "Very Rare"
            },
            "epic": {
                "id": 3,
                "key": "epic",
                "name": "Epic"
            },
            "legend": {
                "id": 4,
                "key": "legend",
                "name": "Legend"
            }
        };
    }
    
    if (lang === "ru") {
        categories = {
            "all": {
                "id": 0,
                "key": "all",
                "name": "Все подарки"
            },
            "rare": {
                "id": 1,
                "key": "rare",
                "name": "Редкие"
            },
            "very rare": {
                "id": 2,
                "key": "very rare",
                "name": "Очень редкие"
            },
            "epic": {
                "id": 3,
                "key": "epic",
                "name": "Эпические"
            },
            "legend": {
                "id": 4,
                "key": "legend",
                "name": "Легендарные"
            }
        };
    }

    return categories;
}

export type { Categories };
export { getCategories };