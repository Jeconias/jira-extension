const GLOBAL_PREFIX = [];
const PREFERENCE_PREFIX = 'PREFERENCE_PREFIX';

async function handlePreferencePrefixIncrement(prefix) {
  if (!GLOBAL_PREFIX.includes(prefix)) return;

  const data = await chrome.storage.sync.get([PREFERENCE_PREFIX]);

  if (data[PREFERENCE_PREFIX]) {
    const currentCount = data[PREFERENCE_PREFIX][prefix];
    await chrome.storage.sync.set({
      [PREFERENCE_PREFIX]: {
        ...data[PREFERENCE_PREFIX],
        [prefix]: currentCount + 1,
      },
    });

    return;
  }

  await chrome.storage.sync.set({
    [PREFERENCE_PREFIX]: GLOBAL_PREFIX.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}),
  });
}

async function getPreferencePrefix() {
  const data = await chrome.storage.sync.get([PREFERENCE_PREFIX]);

  return Object.keys(data[PREFERENCE_PREFIX] ?? {}).reduce(
    (acc, curr) => {
      const currentCount = data[PREFERENCE_PREFIX]?.[curr] ?? 0;
      if (currentCount > acc.count) {
        return { commitType: curr, count: currentCount };
      }

      return acc;
    },
    { commitType: '', count: 0 }
  );
}

async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true };

  const [tab] = await chrome.tabs.query(queryOptions);

  return tab;
}

function getQueryString(url) {
  const urlArr = url?.split('?');
  if (!Array.isArray(urlArr) || urlArr.length < 1) return {};

  const qs = urlArr[1] ?? '';
  const result = {};

  qs.split('&').forEach((kv) => {
    const [key, value] = kv?.split('=');

    result[key] = value;
  });

  return result;
}

function getStoryNameFromPath(url) {
  const result = url?.matchAll(/browse\/([a-zA-Z]+)-([0-9]{1,6})/g);
  if (!result) return '';

  const asArray = [].concat(...result);
  if (asArray.length < 3) return '';

  return `${asArray[1]}-${asArray[2]}`;
}

function copyToClipboard(text) {
  if (typeof text !== 'string') return Promise.reject('Text not is a string');
  return navigator.clipboard.writeText(text);
}

function generateBranchName(qs, fromPath) {
  const issueName = qs?.selectedIssue ? qs.selectedIssue : fromPath;

  if (!issueName) return '';

  return issueName.toLowerCase();
}

function applyPrefix(ctx, value, prefix) {
  switch (ctx) {
    case 'name':
      return `${!!prefix ? `${prefix}/` : ''}${value}`;
    case 'checkout':
      return `git checkout -b ${!!prefix ? `${prefix}/` : ''}${value}`;
    default:
      return value;
  }
}

function handleCopy(item, semanticCommitRef, allButtons) {
  return () => {
    copyToClipboard(applyPrefix(item.ctx, item.value, semanticCommitRef.value))
      .then(() => {
        allButtons.forEach((btn) => (btn.innerHTML = 'Copy'));
        item.button.innerHTML = 'Copied!';
      })
      .catch(() => {
        alert('Failed to copy the value. Please, copy manually.');
      });
  };
}

function reloadInputValue(item) {
  return function () {
    handlePreferencePrefixIncrement(this.value);
    item.input.value = applyPrefix(item.ctx, item.value, this.value);
  };
}

async function fetchPrefixOptionsAsPromise(semanticCommitRef) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'fetch-prefix-options' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        if (Array.isArray(response) && response.length > 0) {
          const options = response.map(
            (item) => `<option value="${item.key}">${item.emoji} ${item.label}</option>`
          );

          semanticCommitRef.innerHTML = `<option value="">None</option>${options.join('')}`;
          GLOBAL_PREFIX.push(...response.map((item) => item.key));
        } else {
          semanticCommitRef.innerHTML = '<option value="" selected>Sem opções disponíveis</option>';
          semanticCommitRef.value = '';
        }

        resolve();
      }
    });
  });
}

function showBranchWarning(show) {
  const branchWarning = document.getElementById('branch-warning');
  const branchWarningDivider = document.getElementById('branch-warning-divider');

  if (branchWarning) branchWarning.style.display = show ? 'block' : 'none';
  if (branchWarningDivider) branchWarningDivider.style.display = show ? 'block' : 'none';
}

function resetCopyButtons(allButtons) {
  allButtons.forEach((btn) => (btn.innerHTML = 'Copy'));
}

document.addEventListener('DOMContentLoaded', async function () {
  const semanticBranch = document.getElementById('semantic_branch');
  const inputBranchRef = document.getElementById('branch_name');
  const buttonBranchRef = document.getElementById('copy_branch_name');
  const inputBranchCheckoutRef = document.getElementById('branch_name_checkout');
  const buttonBrancCheckouthRef = document.getElementById('copy_branch_name_checkout');

  await fetchPrefixOptionsAsPromise(semanticBranch);

  const tab = await getCurrentTab();
  const qsResult = getQueryString(tab.url);
  const pathResult = getStoryNameFromPath(tab.url);

  const branchName = generateBranchName(qsResult, pathResult);

  const mostUsedPrefix = await getPreferencePrefix();
  const commitType = mostUsedPrefix.commitType;
  semanticBranch.value = commitType ?? '';

  const allRefs = [
    semanticBranch,
    buttonBranchRef,
    buttonBrancCheckouthRef,
    inputBranchRef,
    inputBranchCheckoutRef,
  ];
  allRefs.forEach((item) => (!branchName ? (item.disabled = true) : (item.disabled = false)));

  const allButtons = [buttonBranchRef, buttonBrancCheckouthRef];

  [
    {
      ctx: 'name',
      input: inputBranchRef,
      button: buttonBranchRef,
      value: branchName,
    },
    {
      ctx: 'checkout',
      input: inputBranchCheckoutRef,
      button: buttonBrancCheckouthRef,
      value: branchName,
    },
  ].forEach((item) => {
    if (!item.value) {
      item.button.disabled = true;
      showBranchWarning(true);
      return;
    }

    item.button.addEventListener('click', handleCopy(item, semanticBranch, allButtons));
    semanticBranch.addEventListener('change', function (e) {
      resetCopyButtons(allButtons);
      reloadInputValue(item).call(semanticBranch, e);
    });

    item.input.value = applyPrefix(item.ctx, item.value, commitType);
  });

  const versionSpan = document.getElementById('extension-version');

  if (versionSpan && chrome?.runtime?.getManifest) {
    const manifest = chrome.runtime.getManifest();
    versionSpan.textContent = manifest.version ? `v${manifest.version}` : '';
  }
});
