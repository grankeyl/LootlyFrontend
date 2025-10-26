const checkButton = (giftType: string, language: string) => {
    if (language === 'en') {
        if (giftType === 'notfound') return 'Ok';
        if (giftType === 'received') return 'Ok';
        if (giftType === 'purchased') return 'Choose a recipient';
        if (giftType === 'sent') return 'Ok';
    }

    if (language === 'ru') {
        if (giftType === 'notfound') return 'Ок';
        if (giftType === 'received') return 'Ок';
        if (giftType === 'purchased') return 'Выбрать получателя';
        if (giftType === 'sent') return 'Ок';
    }
}

const checkTitle = (giftType: string, language: string) => {
    if (language === 'en') {
        if (giftType === 'notfound') return 'Gift not found';
        if (giftType === 'received') return 'Gift received';
        if (giftType === 'purchased') return 'Gift purchased';
        if (giftType === 'sent') return 'Gift sent';
    }

    if (language === 'ru') {
        if (giftType === 'notfound') return 'Подарок не найден';
        if (giftType === 'received') return 'Подарок получен';
        if (giftType === 'purchased') return 'Подарок куплен';
        if (giftType === 'sent') return 'Подарок отправлен';
    }
}

const checkDescription = (giftType: string, giftName: string, language: string) => {
    if (language === 'en') {
        if (giftType === 'notfound') return 'The gift has already been received';
        if (giftType === 'received') return `${giftName.replace('_', ' ')} has arrived to your profile`;
        if (giftType === 'purchased') return 'Hurry up and give it to your friend!';
        if (giftType === 'sent') return `You have successfully sent a gift of ${giftName.replace('_', ' ')}`;
    }

    if (language === 'ru') {
        if (giftType === 'notfound') return 'Подарок уже получен';
        if (giftType === 'received') return `${giftName.replace('_', ' ')} отправлен в ваш профиль`; // Пепе отправлен в ваш профиль
        if (giftType === 'purchased') return 'Скорее отправь его своему другу!';
        if (giftType === 'sent') return `Вы успешно отправили подарок ${giftName.replace('_', ' ')}`;
    }
}

export {
    checkButton, checkTitle, checkDescription
}