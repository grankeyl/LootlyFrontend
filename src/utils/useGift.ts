import Image_rare from '@/assets/images/rare.svg';
import Image_veryrare from '@/assets/images/veryrare.svg';
import Image_epic from '@/assets/images/epic.svg';
import Image_legend from '@/assets/images/legend.svg';
import Image_author from '@/assets/images/author.svg';
import Image_soldout from '@/assets/images/sold-out.svg';

import { t } from "i18next";
import { pluralize as pluralizeRu } from "numeralize-ru";

import * as inflection from "inflection";
import millify from "millify";

const checkRarityImage = (rarity: string) => {
    switch (rarity) {
        case 'rare':
            return Image_rare
        case 'veryrare':
            return Image_veryrare
        case 'epic':
            return Image_epic
        case 'legend':
            return Image_legend
        case 'author':
            return Image_author
        case 'soldout':
            return Image_soldout
    }
}

const checkRarity = (rarity: string) => {
        switch (rarity) {
            case 'rare':
                return t('app.rarity_1')
            case 'veryrare':
                return t('app.rarity_2')
            case 'epic':
                return t('app.rarity_3')
            case 'legend':
                return t('app.rarity_4')
            case 'author':
                return t('app.rarity_6')
            case 'soldout':
                return t('app.rarity_5')
            default:
                return t('app.rarity_5')
        }
}

const checkPriceNumber = (value: number) => {
    if (!value) return;
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const checkRariryNumber = (value: number) => {
    if (!value) return;
    return millify(value, { precision: 1 });
}

const checkQuantityNumber = (value: number) => {
    if (!value) return;
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const checkMedia = (media: string) => {
    switch (media) {
        case 'lottie':
            return 'lottie'
        case 'svg':
            return 'svg'
    }
}

const pluralizeGift = (word: string, count: number, lang: string = 'en') => {
    if (lang === "ru") return pluralizeRu(count, "подарок", "подарка", "подарков");
    return inflection.inflect(word, count);
}

const getUpgradedModel = (nftUniqueKey: string, model: string, media: string = 'svg') => {
    if (!nftUniqueKey || !model) return;
    const clearModel = model.replace(" ", "+");
    const bucketsLink = import.meta.env.VITE_APP_S3_LINK;

    if (media === 'svg') {
        return `${bucketsLink}/models/${nftUniqueKey}/${clearModel}.svg`;
    } else {
        return `${bucketsLink}/models/${nftUniqueKey}/${clearModel}.json`;
    }
}

const getUpgradedSymbol = (symbol: string) => {
    if (!symbol) return;
    const clearSymbol = symbol.replace(" ", "+");
    const bucketsLink = import.meta.env.VITE_APP_S3_LINK;
    return `${bucketsLink}/symbols/${clearSymbol}.png`;
}

const clearBackgroundName = (background: string) => {
    return background.replace(" ", "");
}

export { 
    checkRarityImage, checkRarity, checkPriceNumber, 
    checkRariryNumber, checkQuantityNumber, checkMedia,
    pluralizeGift, getUpgradedModel, getUpgradedSymbol,
    clearBackgroundName
}