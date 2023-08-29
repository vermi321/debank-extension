(async () => {

    const HOT_SORT__DEFAULT = 'default';
    const HOT_SORT__CREATED = 'created';
    const HOT_SORT__REWARD = 'reward';
    const HOT_SORT_OPTIONS = [
        HOT_SORT__DEFAULT,
        HOT_SORT__CREATED,
        HOT_SORT__REWARD,
    ]

    const getConfig = () => {
        let hotSortBy = HOT_SORT__DEFAULT;
        let excludeOfficialAccounts = false;
        let excludeNonFollowing = false;
        let excludeReposts = false;
        let excludeBlacklistedWordsFromFollowing = false;
        let excludeBlacklistedWordsFromHot = false;
        let blacklistedWords = [];

        try {
            const config = JSON.parse(localStorage.getItem('__debank_extension'));

            if (HOT_SORT_OPTIONS.includes(config.hotSortBy)) {
                hotSortBy = config.hotSortBy;
            }

            if ([true, false].includes(config.excludeOfficialAccounts)) {
                excludeOfficialAccounts = config.excludeOfficialAccounts;
            }

            if ([true, false].includes(config.excludeNonFollowing)) {
                excludeNonFollowing = config.excludeNonFollowing;
            }

            if ([true, false].includes(config.excludeReposts)) {
                excludeReposts = config.excludeReposts;
            }

            if ([true, false].includes(config.excludeBlacklistedWordsFromFollowing)) {
                excludeBlacklistedWordsFromFollowing = config.excludeBlacklistedWordsFromFollowing;
            }

            if ([true, false].includes(config.excludeBlacklistedWordsFromHot)) {
                excludeBlacklistedWordsFromHot = config.excludeBlacklistedWordsFromHot;
            }

            if (Array.isArray(config.blacklistedWords)) {
                blacklistedWords = config.blacklistedWords;
            }
        } catch {
            //
        }

        const lowerCasedBlacklistedWords = blacklistedWords.map(w => w.toLowerCase());

        return {
            hotSortBy,
            excludeOfficialAccounts,
            excludeNonFollowing,
            excludeReposts,
            excludeBlacklistedWordsFromFollowing,
            excludeBlacklistedWordsFromHot,
            blacklistedWords,
            lowerCasedBlacklistedWords,
        }
    }

    const setConfig = (partialConfig) => {
        const newConfig = getConfig();

        if (HOT_SORT_OPTIONS.includes(partialConfig.hotSortBy)) {
            newConfig.hotSortBy = partialConfig.hotSortBy;
        }

        if ([true, false].includes(partialConfig.excludeOfficialAccounts)) {
            newConfig.excludeOfficialAccounts = partialConfig.excludeOfficialAccounts;
        }

        if ([true, false].includes(partialConfig.excludeNonFollowing)) {
            newConfig.excludeNonFollowing = partialConfig.excludeNonFollowing;
        }

        if ([true, false].includes(partialConfig.excludeReposts)) {
            newConfig.excludeReposts = partialConfig.excludeReposts;
        }

        if ([true, false].includes(partialConfig.excludeBlacklistedWordsFromFollowing)) {
            newConfig.excludeBlacklistedWordsFromFollowing = partialConfig.excludeBlacklistedWordsFromFollowing;
        }

        if ([true, false].includes(partialConfig.excludeBlacklistedWordsFromHot)) {
            newConfig.excludeBlacklistedWordsFromHot = partialConfig.excludeBlacklistedWordsFromHot;
        }

        if (Array.isArray(partialConfig.blacklistedWords)) {
            newConfig.blacklistedWords = partialConfig.blacklistedWords;
        }

        localStorage.setItem('__debank_extension', JSON.stringify(newConfig))
    }

    const shouldBeBlacklisted = (article, lowerCasedBlacklistedWords) => {
        const content = article.content.toLowerCase();
        const isLuckyDrawBlacklisted =
            lowerCasedBlacklistedWords.includes('lucky draw') ||
            lowerCasedBlacklistedWords.includes('luckydraw');

        if (isLuckyDrawBlacklisted && article.type === 'draw') {
            return true;
        }

        if (lowerCasedBlacklistedWords.some(word => content.includes(word))) {
            return true;
        }

        return false;
    }

    const swapRequestResult = (response, transformResponseFn) => {
        response.json = () =>
            response
                .clone()
                .json()
                .then(response => {
                    try {
                        return transformResponseFn(response);
                    } catch {
                        return response;
                    }
                });

        return response;
    }

    const modifyHotResponse = (response) => {
        return swapRequestResult(response, result => {
            const {
                hotSortBy,
                excludeOfficialAccounts,
                excludeNonFollowing,
                excludeBlacklistedWordsFromHot,
                lowerCasedBlacklistedWords,
            } = getConfig();

            result.data.feeds.sort((a, b) => {
                switch (hotSortBy) {
                    case HOT_SORT__CREATED:
                        return b.article.create_at - a.article.create_at;
                    case HOT_SORT__REWARD:
                        return b.article.reward_usd_value - a.article.reward_usd_value;
                    default:
                        return 0;
                }
            });

            return {
                ...result,
                data: {
                    ...result.data,
                    feeds: result.data.feeds.filter(feed => {
                        if (excludeBlacklistedWordsFromHot) {
                            if (shouldBeBlacklisted(feed.article, lowerCasedBlacklistedWords)) {
                                return false;
                            }
                        }

                        if (excludeOfficialAccounts && typeof feed.article.creator.verify_status === 'number') {
                            return feed.article.creator.is_following;
                        }

                        if (excludeNonFollowing) {
                            return feed.article.creator.is_following;
                        }

                        return true;
                    })
                }
            }
        });
    }

    const modifyFollowingResponse = (response) => {
        return swapRequestResult(response, result => {
            const {
                excludeReposts,
                excludeBlacklistedWordsFromFollowing,
                lowerCasedBlacklistedWords,
            } = getConfig();

            return {
                ...result,
                data: {
                    ...result.data,
                    feeds: result.data.feeds.map(feed => {
                        if (excludeBlacklistedWordsFromFollowing) {
                            if (shouldBeBlacklisted(feed.article, lowerCasedBlacklistedWords)) {
                                return {article: {}};
                            }
                        }

                        if (excludeReposts) {
                            if (feed.repost_list.length > 0) {
                                return {article: {}};
                            }
                        }

                        return feed;
                    })
                }
            }
        });
    }

    const tweakResponses = () => {
        const rawFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url] = args;
            const response = await rawFetch(...args);

            if (url.startsWith('https://api.debank.com/feed/list')) {
                return modifyFollowingResponse(response);
            } else if (url.startsWith('https://api.debank.com/feed/hot_list')) {
                return modifyHotResponse(response);
            }

            return response;
        }
    }

    tweakResponses();

    document.body.addEventListener('__debank_extension', (e) => {
        setConfig(e.detail.config);
    });

})();
