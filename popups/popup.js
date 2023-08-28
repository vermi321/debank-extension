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
        let excludeBlacklistedWordsFromFollowing = false;
        let excludeBlacklistedWordsFromHot = false;
        let blacklistedWords = [];

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

        return {
            hotSortBy,
            excludeOfficialAccounts,
            excludeNonFollowing,
            excludeReposts,
            excludeBlacklistedWordsFromFollowing,
            excludeBlacklistedWordsFromHot,
            blacklistedWords,
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

    const showSuccessMessage = () => {
        const el = window['success-save-container'];
        el.innerHTML = `Applied! Hard refresh the page for cache reset`;
    };

    window['root'].innerHTML = `
        <form id="hot-stream-settings">
            <div class="columns">
                <div class="column">
                    <h3>Following stream</h3>
                    <div>
                        <h4>Exclude posts</h4>
                        <label><input type="checkbox" name="reposts" ${config.excludeReposts === true ? 'checked' : ''}/>Reposts</label>
                        <label><input type="checkbox" name="blacklist-following" ${config.excludeBlacklistedWordsFromFollowing === true ? 'checked' : ''}/>Containing blacklisted words</label>
                    </div>
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
                        <h4>Exclude posts</h4>
                        <label><input type="checkbox" name="non-followers" ${config.excludeNonFollowing === true ? 'checked' : ''}/>From users you don't follow</label>
                        <label><input type="checkbox" name="official-accounts" ${config.excludeOfficialAccounts === true ? 'checked' : ''}/>From official accounts you don't follow</label>
                        <label><input type="checkbox" name="blacklist-hot" ${config.excludeBlacklistedWordsFromHot === true ? 'checked' : ''}/>Containing blacklisted words</label>
                    </div>
                </div>
            </div>
            <div>
                <div>
                    <h4>Blacklisted words</h4>
                    <textarea class="blacklisted-words" name="blacklisted-words" rows="3" placeholder="Provide comma-separated values e.g. friend.tech, friend tech">${config.blacklistedWords.join(', ')}</textarea>
                </div>
            </div>
            <div>
                <div class="submit-container">
                    <a class="say-thank-you" target="_blank" href="${vermi321ProfileUrl}">
                        Want to say thank you?<br/>
                        Just give me a follow
                    </a>
                    <span id="success-save-container" class="success-save-container"></span>
                    <button class="submit-button" type="submit">Apply</button>
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
            excludeBlacklistedWordsFromFollowing: !!formData['blacklist-following'],
            excludeBlacklistedWordsFromHot: !!formData['blacklist-hot'],
            blacklistedWords: formData['blacklisted-words']
                .split(/,|\r\n|\r|\n/)
                .map(w => w.trim())
                .filter(Boolean),
        }

        chrome.storage.local.set({config});
        communicateConfigChange(config);
        showSuccessMessage();
    });

})();
