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
    fetch("localhost:8080/get/" + token)
      .then(utils.handleGetResponse)
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
</script>

<style>
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<svelte:window on:keydown={handleKeydown} />
<main>
  <p>{urlToken}</p>
  <p>{stringToken}</p>
  <p>{state}</p>
  <input bind:value={mnemonicBuffer} />
  <button on:click={processMnemonic}>Connect</button>

</main>
