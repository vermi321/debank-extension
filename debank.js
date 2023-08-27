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
        } catch {
            //
        }

        return {
            hotSortBy,
            excludeOfficialAccounts,
            excludeNonFollowing,
            excludeReposts,
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

        localStorage.setItem('__debank_extension', JSON.stringify(newConfig))
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
            const {hotSortBy, excludeOfficialAccounts, excludeNonFollowing} = getConfig();

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
            const {excludeReposts} = getConfig();
            return !excludeReposts ? result : {
                ...result,
                data: {
                    ...result.data,
                    feeds: result.data.feeds.map(feed => {
                        return feed.repost_list.length === 0
                            ? feed
                            : {article: {}}
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

        if ([
            'https://debank.com/stream',
            'https://debank.com/stream?tab=hot',
            'https://debank.com/stream?tab=following'
        ].includes(window.location.href)) {
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    });

})();
