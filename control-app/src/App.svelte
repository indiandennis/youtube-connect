<script>
  import * as utils from "./utils.js";
  const api = "https://api.youtubeconnect.ameyathakur.com";
  let connected = false;
  let state;
  let mnemonicBuffer = "";
  let token = window.location.hash.substr(1);
  let timer;

  $: if (state) {
    debounce(pushUpdate, 15);
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
    token = window.location.hash.substr(1);
  };

  const playpause = () => {
    state.paused === true ? (state.paused = false) : (state.paused = true);
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

<main>
  <p>{token}</p>
  <p>{connected}</p>
  <input bind:value={mnemonicBuffer} />
  <button on:click={processMnemonic}>Connect</button>
  <br />

  {#if state}
    <button on:click={playpause}>Play/Pause</button>
    <input type="range" bind:value={state.volume} min="0" max="100" />
  {/if}

</main>
