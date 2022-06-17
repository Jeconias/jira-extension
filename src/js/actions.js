async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true };

  const [tab] = await chrome.tabs.query(queryOptions);

  return tab;
}

function getQueryString(url) {
  const urlArr = url.split('?');
  if (Array.isArray(urlArr) && urlArr.length < 1) return {};

  const qs = urlArr[1];
  const result = {};

  qs.split('&').forEach((kv) => {
    const [key, value] = kv?.split('=');

    result[key] = value;
  });

  return result;
}

function copyToClipboard(text) {
  if (typeof text !== 'string') return Promise.reject('Text not is a string');
  return navigator.clipboard.writeText(text);
}

function generateBranchName(qs) {
  const issueName =
    qs.modal === 'detail' && qs.selectedIssue ? qs.selectedIssue : undefined;

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

function handleCopy(item, semanticCommitRef) {
  return () => {
    copyToClipboard(applyPrefix(item.ctx, item.value, semanticCommitRef.value))
      .then(() => {
        item.button.innerHTML = 'Copied!';
      })
      .catch(() => {
        alert('Failed to copy the value. Please, copy manually.');
      });
  };
}

function reloadInputValue(item) {
  return function () {
    item.input.value = applyPrefix(item.ctx, item.value, this.value);
  };
}

document.addEventListener('DOMContentLoaded', async function () {
  const semanticCommit = document.getElementById('semantic_commit');
  const inputBranchRef = document.getElementById('branch_name');
  const buttonBranchRef = document.getElementById('copy_branch_name');
  const inputBranchCheckoutRef = document.getElementById(
    'branch_name_checkout'
  );
  const buttonBrancCheckouthRef = document.getElementById(
    'copy_branch_name_checkout'
  );

  const tab = await getCurrentTab();
  const result = getQueryString(tab.url);

  const branchName = generateBranchName(result);

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
    item.button.addEventListener('click', handleCopy(item, semanticCommit));
    semanticCommit.addEventListener('change', reloadInputValue(item));

    item.input.value = applyPrefix(item.ctx, item.value);
  });
});
