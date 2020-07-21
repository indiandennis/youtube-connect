const baseAPIdomain = 'https://api.youtubeconnect.ameyathakur.com';
const controlurl = 'https://youtubeconnect.ameyathakur.com/remote/#';

injected = false; //no storage
ytconnect_settings_open = false;
eventsource = null;

//write to storage
tokenState = {
  ytconnect_enabled: false,
  base64token: '',
  tokenString: '',
};

browser.storage.local.get(null).then((res) => {
  console.log(res);
  if (!res.ytconnect_enabled || !res.base64token || !res.tokenString) {
    browser.storage.local.set(tokenState);
  } else {
    tokenState.ytconnect_enabled = res.ytconnect_enabled;
    tokenState.base64token = res.base64token;
    tokenState.tokenString = res.tokenString;
    if (res.ytconnect_enabled) {
      fetch(baseAPIdomain + '/get/' + tokenState.base64token)
        .then((response) => {
          if (response.status !== 200) {
            disableYTconnect();
            console.log(
              'Looks like there was a problem. Status Code: ' + response.status
            );
            return;
          }
        })
        .catch((err) => {
          disableYTconnect();
          console.log('Fetch Error : ', err);
          return;
        });
    }

    eventsource = new EventSource(
      baseAPIdomain + '/subscribe/' + tokenState.base64token
    );
    eventsource.onmessage = stateUpdateHandler;
    if (ytconnectEnableSetting) {
      if (tokenState.ytconnect_enabled) {
        ytconnectEnableSetting.removeEventListener(
          'click',
          enableYTconnect,
          true
        );
        ytconnectEnableSetting.addEventListener(
          'click',
          disableYTconnect,
          true
        );
      } else {
        ytconnectEnableSetting.removeEventListener(
          'click',
          disableYTconnect,
          true
        );
        ytconnectEnableSetting.addEventListener('click', enableYTconnect, true);
      }
    }
    //tokenState.eventsource.onerror = eventsourceErrorHandler
    rerenderInfo();
  }
});

beginInjector();

function beginInjector() {
  pageManager = document.getElementById('page-manager');
  //console.log(pageManager)
  const config = { attributes: true, childList: true, subtree: true };
  // Callback function to execute when mutations are observed
  const callback = function (mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    for (let _ of mutationsList) {
      if (injected === true) {
        observer.disconnect();
      } else if (document.getElementById('movie_player') !== null) {
        observer.disconnect();
        injected = true;
        console.log('Player exists, injecting Youtube Connect');
        injectYTConnect();
      }

      /* else {
            console.log('No player detected');
        } */
    }
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(pageManager, config);
}

function newToken() {
  window
    .fetch(baseAPIdomain + '/generate')
    .then((response) => {
      if (response.status !== 200) {
        console.log(
          'Looks like there was a problem. Status Code: ' + response.status
        );
        return;
      }

      // Examine the text in the response
      response.json().then((data) => {
        tokenState.base64token = data;
        if (document.querySelector('.video-stream')) pushLocalStateUpdate();

        eventsource = new EventSource(
          baseAPIdomain + '/subscribe/' + tokenState.base64token
        );
        eventsource.onmessage = stateUpdateHandler;
        //tokenState.eventsource.onerror = eventsourceErrorHandler
        var bytestring = string2Bin(
          atob(tokenState.base64token.replace(/_/g, '/').replace(/-/g, '+'))
        );
        tokenState.tokenString = '';
        for (var i = 0; i < 8; i++) {
          tokenState.tokenString +=
            wordlist[parseInt(bytestring.slice(0, 11), 2)] + ' ';
          bytestring = bytestring.slice(11);
        }
        tokenState.ytconnect_enabled = true;
        storeTokenState();
        rerenderInfo();
      });
    })
    .catch((err) => {
      rerenderInfo();
      console.log('Fetch Error : ', err);
      return;
    });
}

function deleteToken() {
  eventsource.close();
  //remove base64 and string token from store

  window
    .fetch(baseAPIdomain + '/delete/' + tokenState.base64token, {
      method: 'DELETE',
    })
    .then((response) => {
      if (response.status !== 200) {
        console.log(
          'Looks like there was a problem. Status Code: ' + response.status
        );
        return;
      }
    })
    .catch((err) => {
      rerenderInfo();
      console.log('Fetch Error : ', err);
    });
  tokenState.base64token = '';
  tokenState.tokenString = '';
  tokenState.ytconnect_enabled = false;
  rerenderInfo();
  storeTokenState();
}

function storeTokenState() {
  browser.storage.local.set(tokenState); //.then(res => {console.log('Stored state')});

  browser.storage.local.get(null).then((res) => {
    console.log('Updated State: ', res);
    if (!res.ytconnect_enabled || !res.base64token || !res.tokenString) {
      browser.storage.local.set(tokenState);
    } else {
      tokenState.ytconnect_enabled = res.ytconnect_enabled;
      tokenState.base64token = res.base64token;
      tokenState.tokenString = res.tokenString;
      //tokenState.eventsource = res.eventsource
      rerenderInfo();
    }
  });
}

function rerenderInfo() {
  if (tokenState.base64token != '') {
    ytconnectQRcode.src =
      'https://chart.googleapis.com/chart?cht=qr&chs=128x128&chl=' +
      controlurl +
      tokenState.base64token;
    ytconnectQRcodeContainer.removeAttribute('style');
    ytconnectTokenString.removeAttribute('style');
    ytconnectRemoteLink.removeAttribute('style');
  } else {
    ytconnectQRcodeContainer.setAttribute('style', 'display: none;');
    ytconnectTokenString.setAttribute('style', 'display: none;');
    ytconnectRemoteLink.setAttribute('style', 'display: none');
  }
  ytconnectEnableSetting.setAttribute(
    'aria-checked',
    tokenState.ytconnect_enabled
  );
  ytconnectTokenString.innerHTML = tokenState.tokenString;
}

function string2Bin(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(2).padStart(8, '0');
  }

  return result;
}

function enableYTconnect() {
  ytconnectEnableSetting.removeEventListener('click', enableYTconnect, true);
  //change to modifying store
  newToken();
  ytconnectEnableSetting.addEventListener('click', disableYTconnect, true);
}

function disableYTconnect() {
  ytconnectEnableSetting.removeEventListener('click', disableYTconnect, true);
  //change to modifying store
  deleteToken();
  ytconnectEnableSetting.addEventListener('click', enableYTconnect, true);
}

function openSettingsPanel() {
  ytconnect_settings_open = true;
  ytconnectSettingsPanel.removeAttribute('style');
  button.removeEventListener('click', openSettingsPanel);

  document.addEventListener('click', detectOutsideClicks, true);
  button.addEventListener('click', closeSettingsPanel);
}

function closeSettingsPanel() {
  ytconnect_settings_open = false;
  ytconnectSettingsPanel.setAttribute('style', 'display: none;');
  button.removeEventListener('click', closeSettingsPanel);
  document.removeEventListener('click', detectOutsideClicks, true);
  button.addEventListener('click', openSettingsPanel);
}

function detectOutsideClicks(e) {
  if (e.target == button || !ytconnectSettingsPanel.contains(e.target)) {
    closeSettingsPanel();
    e.stopPropagation();
  }
}

function pushLocalStateUpdate() {
  var video = document.querySelector('.video-stream');
  var localstate = {
    url: video.baseURI,
    paused: video.paused,
    volume: video.volume * 100,
    time: -1,
    action: -1,
    mute: video.muted,
  };

  fetch(baseAPIdomain + '/update/' + tokenState.base64token, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(localstate),
  })
    .then((response) => {
      if (response.status !== 200) {
        console.log(
          'Looks like there was a problem. Status Code: ' + response.status
        );
        return;
      }
    })
    .catch((err) => {
      console.log('Fetch Error : ', err);
      return;
    });
}

function stateUpdateHandler(event) {
  //console.log(event.data);
  state = JSON.parse(event.data);

  if (state.paused) {
    //console.log("pause")
    injectPageScript(`document.getElementById('movie_player').pauseVideo()`);
    //window.eval("document.getElementById('movie_player').pauseVideo()")
  } else {
    //console.log("play")
    injectPageScript("document.getElementById('movie_player').playVideo()");
  }
  if (state.volume > -1) {
    injectPageScript(
      "document.getElementById('movie_player').setVolume(" +
        clamp(state.volume, 0, 100) +
        ')'
    );
    if (state.volume < 5) {
      state.mute = true;
    }
  }
  if (state.mute) {
    injectPageScript("document.getElementById('movie_player').mute()");
  } else {
    injectPageScript("document.getElementById('movie_player').unMute()");
  }

  switch (state.action) {
    case 0:
      injectPageScript(
        "document.getElementById('movie_player').previousVideo()"
      );
      break;
    case 1:
      injectPageScript("document.getElementById('movie_player').nextVideo()");
      break;
    case 2:
      injectPageScript("document.getElementById('movie_player').seekBy(-10)");
      break;
    case 3:
      injectPageScript("document.getElementById('movie_player').seekBy(+30)");
      break;
    default:
  }
}

function eventsourceErrorHandler(err) {
  console.log(err);
  tokenState.ytconnect_enabled = false;
  tokenState.base64token = '';
  tokenState.tokenString = '';
  eventsource = null;
  storeTokenState();
  rerenderInfo();
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function injectPageScript(code) {
  var script = document.createElement('script');
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function copyText(event) {
  console.log(event.target);
  event.target.select();
  document.execCommand('copy');
  //document.getSelection().removeAllRanges();
}

function injectYTConnect() {
  button = document.createElement('button');
  button.setAttribute('class', 'ytp-button ytp-connect-button');
  button.setAttribute('aria-label', 'Youtube Connect');
  button.setAttribute('aria-haspopup', 'true');

  button.innerHTML =
    '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 36 36" ><style type="text/css">.st0{fill:none;}</style><path class="st0" d="M0,0h36v36H0V0z"/><path d="M18,11.3c-3.9,0-7,3.1-7,7h2c0-2.8,2.2-5,5-5s5,2.2,5,5h2C25,14.4,21.9,11.3,18,11.3z M19,20.6c0.9-0.4,1.5-1.3,1.5-2.3c0-1.4-1.1-2.5-2.5-2.5s-2.5,1.1-2.5,2.5c0,1,0.6,1.9,1.5,2.3v3.3l-3.4,3.4l1.4,1.4l3-3l3,3l1.4-1.4L19,23.9V20.6z M18,7.3c-6.1,0-11,4.9-11,11h2c0-5,4-9,9-9s9,4,9,9h2C29,12.2,24.1,7.3,18,7.3z"/></svg>';
  parentNode = document.querySelector('.ytp-right-controls');
  button = parentNode.insertBefore(
    button,
    document.querySelector('.ytp-settings-button')
  );

  //button.addEventListener('mouseover', showTooltip)

  ytconnectSettingsPanel = document.createElement('div');
  ytconnectSettingsPanel.setAttribute(
    'class',
    'ytconnect-settings-panel ytp-popup ytp-settings-menu'
  );
  ytconnectSettingsPanel.setAttribute('style', 'display: none;');

  ytconnectEnableSetting = document.createElement('div');
  ytconnectEnableSetting.setAttribute('class', 'ytp-menuitem');
  ytconnectEnableSetting.setAttribute('role', 'menuitemcheckbox');
  ytconnectEnableSetting.setAttribute(
    'aria-checked',
    tokenState.ytconnect_enabled
  );
  ytconnectEnableSetting.setAttribute('style', 'width: 100%; display: table;');
  ytconnectEnableSetting.innerHTML =
    '<div class="ytp-menuitem-icon"></div><div class="ytp-menuitem-label">Youtube Connect</div><div class="ytp-menuitem-content"><div class="ytp-menuitem-toggle-checkbox"></div></div>';

  ytconnectQRcodeContainer = document.createElement('div');
  ytconnectQRcodeContainer.setAttribute('class', 'ytconnect-qrcode-container');
  if (!tokenState.ytconnect_enabled) {
    ytconnectQRcodeContainer.setAttribute('style', 'display: none;');
  }

  ytconnectQRcode = document.createElement('img');
  ytconnectQRcode.setAttribute(
    'style',
    'display: block; filter: invert(90%); margin-left: auto; margin-right: auto; border-radius: 4px;'
  );
  ytconnectQRcode.src =
    'https://chart.googleapis.com/chart?cht=qr&chs=128x128&chl=' +
    controlurl +
    tokenState.base64token;
  ytconnectQRcode = ytconnectQRcodeContainer.appendChild(ytconnectQRcode);

  ytconnectRemoteLink = document.createElement('a');
  ytconnectRemoteLink.setAttribute(
    'class',
    'ytconnect-remote-link ytp-menuitem'
  );
  ytconnectRemoteLink.setAttribute('role', 'menuitemlink');
  ytconnectRemoteLink.setAttribute('href', controlurl + tokenState.base64token);
  ytconnectRemoteLink.setAttribute('target', '_blank');
  if (!tokenState.ytconnect_enabled) {
    ytconnectRemoteLink.setAttribute('style', 'display: none;');
  }
  ytconnectRemoteLink.innerHTML =
    '<div class="ytp-menuitem-icon"></div><div class="ytp-menuitem-label">Remote Application</div><div class="ytp-menuitem-content"><div class="ytp-menuitem-link"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></div></div>';

  ytconnectTokenString = document.createElement('div');
  ytconnectTokenString.setAttribute('class', 'ytconnect-token-string');
  if (!tokenState.ytconnect_enabled) {
    ytconnectTokenString.setAttribute('style', 'display: none;');
  }
  ytconnectTokenString.innerHTML = tokenState.tokenString;

  parentNode = document.getElementById('movie_player');
  ytconnectSettingsPanel = parentNode.insertBefore(
    ytconnectSettingsPanel,
    document.querySelector('.ytp-settings-menu')
  );
  ytconnectEnableSetting = ytconnectSettingsPanel.appendChild(
    ytconnectEnableSetting
  );
  ytconnectQRcodeContainer = ytconnectSettingsPanel.appendChild(
    ytconnectQRcodeContainer
  );

  ytconnectTokenString = ytconnectSettingsPanel.appendChild(
    ytconnectTokenString
  );
  ytconnectRemoteLink = ytconnectSettingsPanel.appendChild(ytconnectRemoteLink);

  button.addEventListener('click', openSettingsPanel);
  if (tokenState.ytconnect_enabled) {
    ytconnectEnableSetting.addEventListener('click', disableYTconnect, true);
  } else {
    ytconnectEnableSetting.addEventListener('click', enableYTconnect, true);
  }

  if (document.querySelector('.video-stream')) {
    pushLocalStateUpdate();
  }

  /* document.querySelector('.video-stream').addEventListener('play', () => {
    pushLocalStateUpdate();
  });

  document.querySelector('.video-stream').addEventListener('pause', () => {
    pushLocalStateUpdate();
  });

  document
    .querySelector('.video-stream')
    .addEventListener('volumechange', () => {
      pushLocalStateUpdate();
    }); */
}
