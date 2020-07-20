<script>
  import * as utils from "./utils.js";
  let connected = false;
  let state = {};
  let mnemonicBuffer = "";
  let urlToken = window.location.hash.substr(1);
  let stringToken = "";

  $: if (urlToken != "" || stringToken != "") {
    console.log("running fetch");
    var token = urlToken != "" ? urlToken : stringToken;
    console.log(token);
    fetch("http://35.235.116.233/get/" + token)
      .then(response => {
        if (response.status !== 200) {
          connected = false;
          state = {};
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
        state = {};
        console.log("Fetch Error : ", err);
        return;
      });
  }

  const processMnemonic = () => {
    var b64 = utils.demnemonic(mnemonicBuffer);
    if (b64 != "") {
      stringToken = b64;
    }
  };

  const handleKeydown = e => {
    if (e.keyCode === 13) {
      processMnemonic();
    }
  };

  const updateHashToken = () => {
    urlToken = window.location.hash.substr(1);
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
  <p>{urlToken}</p>
  <p>{stringToken}</p>
  <p>{state}</p>
  <input bind:value={mnemonicBuffer} />
  <button on:click={processMnemonic}>Connect</button>

</main>
