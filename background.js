function isPdfDownloadable(details) {
  if (details.url.includes('pdfjs.action=download')) {
    return true;
  }
}

function getHeaderByName(headers, headerName) {
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (header.name.toLowerCase() === headerName) {
      return header;
    }
  }
  return null;
}

function getHeadersWithContentDispositionAttachment(details) {
  let headers = details.responseHeaders;
  let cdHeader = getHeaderByName(headers, 'content-disposition');
  if (!cdHeader) {
    cdHeader = {
      name: 'Content-Disposition',
    };
    headers.push(cdHeader);
  }

  if (!/^attachment/i.test(cdHeader.value)) {
    cdHeader.value = 'attachment' + cdHeader.value.replace(/^[^;]+/i, '');
    return {
      responseHeaders: headers,
    };
  }
  return undefined;
}

function isPdfFile(details) {
  var header = getHeaderByName(details.responseHeaders, 'content-type');
  if (header) {
    var headerValue = header.value.toLowerCase().split(';', 1)[0].trim();
    if (headerValue === 'application/pdf') {
      return true;
    }
    if (headerValue === 'application/octet-stream') {
      if (details.url.toLowerCase().indexOf('.pdf') > 0) {
        return true;
      }
      var cdHeader = getHeaderByName(
          details.responseHeaders,
          'content-disposition'
      );
      if (cdHeader && /\.pdf(["']|$)/i.test(cdHeader.value)) {
        return true;
      }
    }
  }
  return false;
}

chrome.webRequest.onHeadersReceived.addListener(
    function (details) {
      chrome.storage.sync.get('ison', function (items) {
        let isOn = items.ison;
        if (typeof isOn === 'undefined') {
          isOn = true;
        }
        if (isOn && isPdfFile(details)) {
          if (isPdfDownloadable(details)) {
            return getHeadersWithContentDispositionAttachment(details);
          }
          let url = details.url;
          chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL(
                `/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`
            ),
          });
        }
      });
    },
    {
      urls: ['<all_urls>'],
      types: ['main_frame', 'sub_frame'],
    },
    ['blocking', 'responseHeaders']
);

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
      chrome.storage.sync.get(null, async function (items) {
        let isOn = items.ison;
        if (typeof isOn === 'undefined') {
          isOn = true;
        }
        if (isOn) {
          if (isPdfDownloadable(details)) {
            return;
          }
          let url = details.url;
          console.log(details.url);
          if (details.url.match(/file:\/\/.*.epub/) != null) {
            console.log('epub detected');
            const response = await fetch(details.url);
            const blob = await response.blob();
            console.log(blob);

            chrome.tabs.update({
              url: chrome.runtime.getURL(
                  `/epub.js/examples/input.html?file=${encodeURIComponent(url)}`
              ),
            });
            return;
          }

          chrome.tabs.update({
            url: chrome.runtime.getURL(
                `/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`
            ),
          });
        }
      });
    },
    {
      urls: [
        'file://*/*.epub',
        'file://*/*.pdf',
        'file://*/*.PDF',
        ...(MediaError.prototype.hasOwnProperty('message')
            ? []
            : ['ftp://*/*.pdf', 'ftp://*/*.PDF']),
      ],
      types: ['main_frame', 'sub_frame'],
    },
    ['blocking']
);


function updateIcon() {
  let isOn;
  chrome.storage.sync.get('ison', function (items) {
    if (!chrome.runtime.error) {
      isOn = items.ison;
      if (typeof isOn === 'undefined') {
        isOn = true;
      }
      console.log(isOn);
      if (isOn) {
        chrome.browserAction.setIcon({ path: 'img/translation_off_16.png' });
        chrome.storage.sync.set({
          ison: false,
        });
      } else {
        chrome.browserAction.setIcon({ path: 'img/translation_16.png' });
        chrome.storage.sync.set({
          ison: true,
        });
      }
    }
  });
}

chrome.browserAction.onClicked.addListener(updateIcon);
