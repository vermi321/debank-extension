// Run the script in the same sandbox as a host site
(() => {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('debank.js');
    s.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(s);
})();

// content script that doesn't require to be run in the same sandbox as the host
(() => {
    document.addEventListener('click', e => {
        const closestHistoryActionRow = e.target.closest('[class*=AccountHistory_mainTable__] .db-table-row');
        if (closestHistoryActionRow) {
            const streamLink = closestHistoryActionRow.outerText.match(/.*(https:\/\/debank.com\/stream\/\d+).*/);
            if (streamLink) {
                window.open(streamLink[1]);
            }
        }
    })
})();
