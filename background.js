chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'fetch-prefix-options') {
    const PREFIX_OPTIONS = 'PREFIX_OPTIONS';
    const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
    const FALLBACK_DATA = [
      { key: 'feat', emoji: '✨', label: 'Feat' },
      { key: 'chore', emoji: '🍻', label: 'Chore' },
      { key: 'fix', emoji: '🐛', label: 'Fix' },
    ];

    const fetchPrefixOptions = async () => {
      try {
        console.log(await chrome.storage.sync.get([PREFIX_OPTIONS, 'PREFERENCE_PREFIX']));
        const dataFromStorage = await chrome.storage.sync.get([PREFIX_OPTIONS]);
        const now = new Date().getTime();

        if (
          typeof dataFromStorage?.[PREFIX_OPTIONS]?.createdAt === 'number' &&
          dataFromStorage[PREFIX_OPTIONS].createdAt + ONE_HOUR_IN_MILLISECONDS > now
        ) {
          console.info('Using prefix options from storage');
          sendResponse(dataFromStorage[PREFIX_OPTIONS].data);
          return;
        }

        console.info('Fetched prefix options');
        const response = await fetch(
          'https://raw.githubusercontent.com/Jeconias/jira-extension/refs/heads/main/public/options.json'
        );
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
          console.warn('No prefix options found, using fallback data.');
          sendResponse(dataFromStorage?.[PREFIX_OPTIONS]?.data ?? FALLBACK_DATA);
          return;
        }

        await chrome.storage.sync.set({
          [PREFIX_OPTIONS]: { data, createdAt: now },
        });

        sendResponse(data);
      } catch (err) {
        console.error('Error fetching prefix options:', err);
        sendResponse(FALLBACK_DATA);
      }
    };

    fetchPrefixOptions();

    return true;
  }
});
