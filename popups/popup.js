(async () => {

    const HOT_SORT__DEFAULT = 'default';
    const HOT_SORT__CREATED = 'created';
    const HOT_SORT__REWARD = 'reward';

    const HOT_SORT_OPTIONS = [
        HOT_SORT__DEFAULT,
        HOT_SORT__CREATED,
        HOT_SORT__REWARD,
    ];

    const vermi321ProfileUrl = 'https://debank.com/profile/0x4c81c1d6fb83f063ccc7eb50400569bf830b5492?t=1692901643019&r=77271';

    const getConfig = async () => {
        let hotSortBy = HOT_SORT__DEFAULT;
        let excludeOfficialAccounts = false;
        let excludeNonFollowing = false;
        let excludeReposts = false;

        try {
            const {config} = await chrome.storage.local.get();

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

    let config = await getConfig();

    const communicateConfigChange = async (config) => {
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            await chrome.scripting
                .executeScript({
                    target: {tabId: tabs[0].id},
                    func: applyExtensionSettings,
                    args: [config],
                });
        });
    };

    const applyExtensionSettings = (config) => {
        document.body.dispatchEvent(new CustomEvent('__debank_extension', {
            detail: {config}
        }));
    };

    window['root'].innerHTML = `
        <form id="hot-stream-settings">
            <div class="column">
                <h3>Following stream</h3>
                <div>
                    <h4>Exclude posts</h4>
                    <label><input type="checkbox" name="reposts" ${config.excludeReposts === true ? 'checked' : ''}/>Reposts</label>
                </div>
                <a class="say-thank-you" target="_blank" href="${vermi321ProfileUrl}">
                    Want to say thank you?<br/>
                    Just give me a follow
                </a>
            </div>
            <div class="column">
                <h3>Hot stream</h3>
                <div>
                    <h4>Sort by</h4>
                    <label><input type="radio" name="sort-by" value="default" ${config.hotSortBy === HOT_SORT__DEFAULT ? 'checked' : ''}/> Default</label>
                    <label><input type="radio" name="sort-by" value="created" ${config.hotSortBy === HOT_SORT__CREATED ? 'checked' : ''}/> Created</label>
                    <label><input type="radio" name="sort-by" value="reward" ${config.hotSortBy === HOT_SORT__REWARD ? 'checked' : ''}/> Reward pool</label>
                </div>
                <div>
                    <h4>Exclude posts from</h4>
                    <label><input type="checkbox" name="non-followers" ${config.excludeNonFollowing === true ? 'checked' : ''}/>Users you don't follow</label>
                    <label><input type="checkbox" name="official-accounts" ${config.excludeOfficialAccounts === true ? 'checked' : ''}/>Official accounts you don't follow</label>
                </div>
                <div class="submit-container">
                    <button type="submit">Apply</button>
                </div>
            </div>
        </form>
    `;

    window['hot-stream-settings'].addEventListener('submit', e => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(e.target));
        const config = {
            hotSortBy: formData['sort-by'],
            excludeOfficialAccounts: !!formData['official-accounts'],
            excludeNonFollowing: !!formData['non-followers'],
            excludeReposts: !!formData['reposts'],
        }

        chrome.storage.local.set({config});
        communicateConfigChange(config);
    });

})();
