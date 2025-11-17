export const localization = {
    ru: {
        extra: {
            somethingWentWrong: "Что-то пошло не так",
        },

        menu: {
            cases: "Игры",
            market: "Маркет",
            earn: "Задания",
            profile: "Профиль",
        },
        cases: {
            tabs: {
                NFTs: "Кейсы",
            },
            modals: {
                case: {
                    congrats: "Поздравляем!",
                    congratsDesc: "Вы получили:",
                    buttons: {
                        skip: "Пропустить",
                        sellFor: "Продать за {{price}}",
                        collect: "Забрать",
                        ok: "Отлично",
                        demoOpen: "Демо-спин",
                        open: "Открыть {{price}}",
                    }
                },
                notEnoght: {
                    title: "У вас недостаточно TON",
                    descr: "Пополните баланс и повторите попытку",
                    buttons: {
                        deposit: "Пополнить",
                    }
                }
            }
        },
        market: {
            modals: {
                gift: {
                    actions: {
                        share: "Поделиться",
                    },
                    table: {
                        floorPrice: "Актуальная цена",
                        gift: "Подарок",
                    },
                    buttons: {
                        buyFor: "Купить за {{price}}",
                        close: "Закрыть",
                    }
                }
            }
        },
        earn: {
            tabs: {
                tasks: "Задания",
                invites: "Заработать",
            },
            tasks: {
                others: {
                    taskTitle: "Подписаться на Lootly",
                }
            },
            invites: {
                balance: {
                    descr: "Заработок с рефералов",
                    buttons: {
                        withdraw: "Вывести",
                    }
                },
                stats: {
                    referrals: "Рефералы",
                    totalEarned: "Всего заработано",
                    yourPercent: "Твой процент",
                },
                filters: {
                    referrals: "{{count}} рефералов",
                }
            },
            button: {
                inviteFriends: "Пригласить друзей",
                inviteFriendsMsg: "💅 Лучшая платформа для игр на NFT",
            },
            modals: {
                balanceAbout: {
                    descr: "Дополнительный баланс токенов используемых для аирдропа",
                    buttons: {
                        ok: "Отлично",
                    }
                },
                chooseDestination: {
                    title: "Куда отправляем?",
                    descr: "Выводим на игровой баланс Lootly или на внешний TON адрес",
                    needConnect: "Подключи кошелёк",
                    wallet: "Кошелёк",
                    lootlyBalance: "Lootly баланс",
                    buttons: {
                        ok: "Отлично",
                    }
                }
            }
        },
        profile: {
            user: {
                leaderboard: "Лидерборд"
            },
            actions: {
                title: "Подарки"
            },
            gifts: {
                statusSold: "Продано",
                statusUsed: "Выведено",
            },
            modals: {
                gift: {
                    actions: {
                        share: "Поделиться",
                        withdraw: "Вывести",
                    },
                    table: {
                        floorPrice: "Актуальная цена",
                        gift: "Подарок",
                    },
                    buttons: {
                        sellFor: "Продать за {{price}}",
                        close: "Закрыть",
                    }
                },
                withdrawGift: {
                    title: "Вывод подарка",
                    descr: "Подтвердите вывод подарка <span>{{name}}</span> в ваш профиль Telegram",
                    buttons: {
                        confirm: "Подтвердить",
                        cancel: "Отменить",
                    }
                }
            }
        },
        leaderboard: {
            info: {
                title: "Лидерборд",
                descr: "Топ пользователей с общим объемом TON",
            },
        },
        balance: {
            wallet: {
                notConnected: "Кошелёк не подключен",
                connect: "Подключить",
                deposit: "Пополнить",
            },
            button: {
                back: "Назад",
            },
            modals: {
                deposit: {
                    title: "Пополнение баланса",
                    descr: "*ВАЖНО! Вы не можете выводить TON с баланса, вывести можно только подарки, выигранные или купленные в маркете",
                    max: "МАКС",
                    buttons: {
                        deposit: "Пополнить",
                    }
                }
            }
        },
        crash: {
            game: {
                now: "Ожидание",
                players: "игроков",
            },
            bet: {
                placeBit: "Сделать ставку",
                waiting: "Ожидание",
                pickUp: "Забрать {{price}}",

                successGetCashout: "Вы получили {{price}} TON!",
            },
            modals: {
                bet: {
                    autobet: "Авто-ставка",
                    autocashout: "Авто-вывод",

                    successGetCashout: "Вы получили {{price}} TON!",
                    toastPlaceBitErrorPrepare: "Сделать ставку невозможно в этом состоянии",

                    placeBit: "Сделать ставку",
                    waiting: "Ожидание",
                    pickUp: "Забрать {{price}}",
                }
            }
        }
    }
};