<script>
  import * as utils from "./utils.js";
  import { onMount } from "svelte";
  const api = "https://api.youtubeconnect.ameyathakur.com";
  let connected = false;
  let state;
  let mnemonicBuffer = "";
  let token = "";
  let timer;

  onMount(() => {
    updateHashToken();
  });

  $: if (state) {
    debounce(pushUpdate, 30);
  }

  $: if (token !== "") {
    console.log("running fetch");
    console.log(token);
    fetch(api + "/get/" + token)
      .then(response => {
        if (response.status !== 200) {
          connected = false;
          state = null;
          token = "";
          console.log(
            "Looks like there was a problem. Status Code: " + response.status
          );
          return;
        }

        // Examine the text in the response
        response.json().then(data => {
          state = data;
          connected = true;
        });
      })
      .catch(err => {
        connected = false;
        state = null;
        console.log("Fetch Error : ", err);
        return;
      });
  }

  const pushUpdate = () => {
    fetch(api + "/update/" + token, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(state)
    })
      .then(response => {
        if (response.status !== 200) {
          connected = false;
          state = null;
          token = "";
          console.log(
            "Looks like there was a problem. Status Code: " + response.status
          );
          return;
        }
      })
      .catch(err => {
        connected = false;
        state = null;
        token = "";
        console.log("Fetch Error : ", err);
        return;
      });

    if (state && state.action !== -1) {
      state.action = -1;
    }
  };

  const processMnemonic = () => {
    var b64 = utils.demnemonic(mnemonicBuffer);
    if (b64 != "") {
      token = b64;
    }
  };

  const handleKeydown = e => {
    if (e.keyCode === 13) {
      processMnemonic();
    }
  };

  const updateHashToken = () => {
    var temp = window.location.hash.substr(1);

    if (temp.length < 16) {
      temp += "=";
    }
    token = temp;
  };

  const playpause = () => {
    state.paused === true ? (state.paused = false) : (state.paused = true);
  };

  const mute = () => {
    state.mute === true ? (state.mute = false) : (state.mute = true);
  };

  const next = () => {
    state.action = 1;
  };

  const prev = () => {
    state.action = 0;
  };

  const skipbackward = () => {
    state.action = 2;
  };

  const skipforward = () => {
    state.action = 3;
  };

  const debounce = (func, delay) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func();
    }, delay);
  };
</script>

<style>
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<svelte:window on:keydown={handleKeydown} on:hashchange={updateHashToken} />

<main class="container">
  <div class="header">
    <a href="https://youtubeconnect.ameyathakur.com/">Youtube Connect</a>
    <a href="https://youtubeconnect.ameyathakur.com/">Extension</a>
  </div>
  <div style="height: 25vh" />
  <div class="content">
    {#if !connected}
      <input
        class="long-input"
        bind:value={mnemonicBuffer}
        type="text"
        placeholder="Eight word mnemonic" />
      <button on:click={processMnemonic}>Connect</button>
    {/if}

    {#if connected}
      <div class="panel">
        <div class="controls">
          <button on:click={skipbackward}>Skip -10</button>

          <button on:click={playpause}>Play/Pause</button>
          <button on:click={skipforward}>Skip +30</button>

        </div>
        <div class="controls">
          <button on:click={mute}>Mute</button>
          <input type="range" bind:value={state.volume} min="0" max="100" />
        </div>

        <div
          style="display: flex; flex-direction: row; justify-content:
          space-between;">
          <button on:click={prev}>Previous</button>
          <button on:click={next}>Next</button>
        </div>
      </div>
    {/if}
  </div>
</main>
