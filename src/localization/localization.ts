export const localization = {
    en: {
        extra: {
            somethingWentWrong: "Something went wrong",
            walletConnected: "Wallet connected",
            walletNotConnected: "Wallet not connected",
            successGetWithdraw: "Success get withdraw",
            errorGetWithdraw: "Error get withdraw",
            linkCopied: "Link copied to clipboard",
            selfTransferBlocked: "Self-transfer blocked",
            minBet: "Minimum bet is {{min}} TON",
            notEnoughTon: "Not enough TON",
            placeBitAlert: "Place Bit is available only in prepare state",
            waitingForPayment: "Waiting for payment",
            connectWallet: "Connect wallet",
            successGetCashout: "Success get cashout {{price}} TON!",
            taskSuccessClaimed: "Task successfully claimed",
            successPurchase: "Successful purchase of the “{{name}}”",
            successGiftWithdrawn: "Gift successfully withdrawn",
            storyMessage: "🦄 Win Plush Pepe or TON in a free daily case from the Lootly gaming platform",
            lootly: "Lootly",
        },
        menu: {
            cases: "Games",
            market: "Market",
            earn: "Earn",
            profile: "Profile",
        },
        cases: {
            tasks: {
                inviteFriends_one: "Invite {{count}} friend",
                inviteFriends_few: "Invite {{count}} friends",
                inviteFriends_many: "Invite {{count}} friends",
                inviteFriends_other: "Invite {{count}} friends",
                subscribeChannel: "Subscribe to channel",
                subscribeChannelName: `Subscribe to "{{name}}"`,
            },
            tabs: {
                NFTs: "Cases",
            },
            modals: {
                open: "Open",
                num_completed: "{{num}} completed",
                whatsInside: "What's inside",
                case: {
                    congrats: "Congratulations!",
                    congratsDesc: "You got:",
                    buttons: {
                        skip: "Skip",
                        sellFor: "Sell for {{price}}",
                        collect: "Collect",
                        ok: "Ok",
                        demoOpen: "Demo open",
                        open: "Open {{price}}",
                    }
                },
                notEnoght: {
                    title: "You don't have enough TON",
                    descr: "Deposit balance and try again",
                    buttons: {
                        deposit: "Deposit",
                    }
                }
            }
        },
        market: {
            modals: {
                gift: {
                    actions: {
                        share: "Share",
                    },
                    table: {
                        floorPrice: "Current price",
                        gift: "Gift",
                    },
                    buttons: {
                        buyFor: "Buy for {{price}}",
                        close: "Close",
                    }
                }
            }
        },
        earn: {
            tabs: {
                tasks: "Tasks",
                invites: "Earn",
            },
            tasks: {
                swipers: {
                    invite: "Invite",
                    friends: "friends",

                    achieveAVolume: "Achieve a volume of",
                    inGame: "in Rocket Game",

                    open: "Open",
                    cases: "cases",

                    postStory: "Post a story",

                    claim: "Claim",
                    invited: "Invite",
                    go: "Go",
                    repost: "Repost",
                },
                others: {
                    taskTitle: "Subscribe on Lootly",
                }
            },
            invites: {
                balance: {
                    descr: "Earn with referrals",
                    buttons: {
                        withdraw: "Withdraw",
                    }
                },
                stats: {
                    referrals: "Referrals",
                    totalEarned: "Total earned",
                    yourPercent: "Your percent",
                },
                filters: {
                    referrals: "{{count}} referrals",
                }
            },
            button: {
                inviteFriends: "Invite friends",
                inviteFriendsMsg: "🦄 Get an invite to Lootly — a premium gaming platform with Telegram gifts.",
            },
            modals: {
                balanceAbout: {
                    descr: "Additional balance of tokens used for airdrop",
                    buttons: {
                        ok: "Ok",
                    }
                },
                chooseDestination: {
                    title: "Where to send?",
                    descr: "Send to Lootly game balance or external TON address",
                    needConnect: "Connect wallet",
                    wallet: "Wallet",
                    lootlyBalance: "Lootly balance",
                    buttons: {
                        ok: "Ok",
                    }
                }
            }
        },
        profile: {
            user: {
                leaderboard: "Leaderboard"
            },
            actions: {
                title: "Gifts"
            },
            gifts: {
                statusSold: "Sold",
                statusUsed: "Withdrawn",
                statusReserve: "Waiting",

                noGifts: "You have no gifts(",
                noGiftsGoTo: "Go to",
                cases: "Games",
                andWinSome: "and win some",
            },
            modals: {
                gift: {
                    actions: {
                        share: "Share",
                        withdraw: "Withdraw",
                    },
                    table: {
                        floorPrice: "Current price",
                        gift: "Gift",
                    },
                    buttons: {
                        sellFor: "Sell for {{price}}",
                        close: "Close",
                    }
                },
                withdrawGift: {
                    title: "Withdraw gift",
                    descr: "Confirm withdraw gift <span>{{name}}</span> from your Telegram profile",
                    buttons: {
                        confirm: "Confirm",
                        cancel: "Cancel",
                    }
                }
            }
        },
        leaderboard: {
            info: {
                title: "Leaderboard",
                descr: "Top users with common TON amount",
            },
        },
        balance: {
            wallet: {
                notConnected: "Wallet is not connected",
                connect: "Connect",
                deposit: "Deposit",
                withdraw: "Withdraw",
                balance: "balance",
            },
            button: {
                back: "Back",
            },
            modals: {
                deposit: {
                    title: "Deposit balance",
                    descr: "*IMPORTANT! You can't withdraw TON from balance, withdraw only gifts, won or bought in market",
                    max: "MAX",
                    link: "Go to payment",
                    scan: "Scan with “Camera”",
                    buttons: {
                        deposit: "Deposit",
                        paid: "Paid",
                    }
                }
            },
            onboard: {
                game: "Lets go!",
                next: "Next",
                balance: "Balance",
                slide1: {
                    title1: "Top up your gaming balance in TON ",
                    title2: "or through the SBP",
                },
                slide2: {
                    title1: "You can withdraw a prize you have won or purchased in ",
                    title2: "Withdrawal to TON is not possible",
                    market: "Market",
                },
                slide3: {
                    title1: "Gifts can be transferred to your account and sold on any of the marketplaces",
                },
            }
        },
        crash: {
            game: {
                now: "Waiting",
                players: "players",
            },
            bet: {
                placeBit: "Make bet",
                waiting: "Waiting",
                pickUp: "Collect {{price}}",

                successGetCashout: "You got {{price}} TON!",
            },
            modals: {
                bet: {
                    autobet: "Auto-bet",
                    autocashout: "Auto-withdraw",

                    successGetCashout: "You got {{price}} TON!",
                    toastPlaceBitErrorPrepare: "Make bet is not available in this state",

                    placeBit: "Make bet",
                    waiting: "Waiting",
                    pickUp: "Collect {{price}}",

                    yourPrice: "Your Price",

                    max: "MAX",
                }
            }
        },
        onboard: {
            game: "Lets go!",
            next: "Next",
            slide1: {
                title: "Hello! We are a game platform where you can win Telegram NFT",
            },
            slide2: {
                title: "Open cases and enjoy the loot",
            },
            slide3: {
                title: "Take the prize, sell it, or buy any one in",
                market: "Market",
            },
            slide4: {
                launch: "Launch",
                andCatchYourLuck: "and catch your luck",
            },
            slide5: {
                inviteFriends: "Invite friends",
                doTasks: "Do tasks",
                earn: "Earn",
            },
            slide6: {
                title: "Hurry up and open the free cases!",
            },
        }
    },

    ru: {
        extra: {
            somethingWentWrong: "Что-то пошло не так",
            walletConnected: "Кошелёк подключен",
            walletNotConnected: "Кошелёк не подключен",
            successGetWithdraw: "Успешно выведено",
            errorGetWithdraw: "Ошибка вывода",
            linkCopied: "Ссылка скопирована в буфер обмена",
            selfTransferBlocked: "Нельзя отправлять депозит на свой же адрес",
            minBet: "Минимальная ставка {{min}} TON",
            notEnoughTon: "Недостаточно TON",
            placeBitAlert: "Сделать ставку невозможно на этом этапе",
            waitingForPayment: "Ожидание оплаты",
            connectWallet: "Подключи кошелёк!",
            successGetCashout: "Успешно получено {{price}} TON!",
            taskSuccessClaimed: "Задание выполнено!",
            successPurchase: "Успешно покупка «{{name}}»",
            successGiftWithdrawn: "Подарок успешно выведен",
            storyMessage: "🦄 Выигрывай Plush Pepe или TON в бесплатном ежедневном кейсе от игровой платформы Lootly",
            lootly: "Lootly",
        },

        menu: {
            cases: "Игры",
            market: "Маркет",
            earn: "Задания",
            profile: "Профиль",
        },
        cases: {
            tasks: {
                inviteFriends_one: "Пригласить {{count}} друга",
                inviteFriends_few: "Пригласить {{count}} друга",
                inviteFriends_many: "Пригласить {{count}} друзей",
                inviteFriends_other: "Пригласить {{count}} друзей",
                subscribeChannel: "Подписаться на канал",
                subscribeChannelName: `Подписаться на "{{name}}"`,
            },
            tabs: {
                NFTs: "Кейсы",
            },
            modals: {
                open: "Открыть",
                num_completed: "{{num}} выполнено",
                whatsInside: "Что внутри",
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
                swipers: {
                    invite: "Пригласить",
                    friends: "друзей",

                    achieveAVolume: "Достигнуть объема",
                    inGame: "в Rocket Game",

                    open: "Открыть",
                    cases: "кейсы",

                    postStory: "Опубликовать историю",

                    claim: "Забрать",
                    invited: "Пригласить",
                    go: "Перейти",
                    repost: "Репост",
                },
                others: {
                    taskTitle: "Подписаться на Lootly"
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
                inviteFriendsMsg: "🦄 Лови инвайт в Lootly — премиальная игровая платформа с телеграм-подарками.",
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
                statusReserve: "Ожидание",

                noGifts: "У вас нет подарков(",
                noGiftsGoTo: "Перейти в",
                cases: "Игры",
                andWinSome: "и получить подарки",
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
                withdraw: "Вывести",
                balance: "баланс",
            },
            button: {
                back: "Назад",
            },
            modals: {
                deposit: {
                    title: "Пополнение баланса",
                    descr: "*ВАЖНО! Вы не можете выводить TON с баланса, вывести можно только подарки, выигранные или купленные в маркете",
                    max: "МАКС",
                    link: "Перейти",
                    scan: "Сканируй через “Камера”",
                    buttons: {
                        deposit: "Пополнить",
                        paid: "Оплатил",
                    }
                }
            },
            onboard: {
                game: "Играть!",
                next: "Дальше",
                balance: "Баланс",
                slide1: {
                    title1: "Пополняйте игровой баланс в TON ",
                    title2: "либо через СБП",
                },
                slide2: {
                    title1: "Можно вывести выигранный подарок, либо купленный в ",
                    title2: "Вывод в TON невозможен",
                    market: "Маркет",
                },
                slide3: {
                    title1: "Подарки можно вывести на свой аккаунт и продать в любом из маркетплейсов",
                },
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

                    yourPrice: "Ваша ставка",

                    max: "МАКС",
                }
            }
        },
        onboard: {
            game: "Играть!",
            next: "Дальше",
            slide1: {
                title: "Привет! Мы игровая платформа, где ты можешь выиграть Telegram NFT",
            },
            slide2: {
                title: "Открывай кейсы и наслаждайся лутом",
            },
            slide3: {
                title: "Забирай приз, продай его или купи любой в",
                market: "Маркет",
            },
            slide4: {
                launch: "Запускай",
                andCatchYourLuck: "и лови удачу",
            },
            slide5: {
                inviteFriends: "Зови друзей",
                doTasks: "Делай таски",
                earn: "Зарабатывай",
            },
            slide6: {
                title: "Успей открыть бесплатные кейсы!",
            },
        }
    },
};