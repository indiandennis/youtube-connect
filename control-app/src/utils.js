import wordlist from './wordlist.js';
export function demnemonic(tokenString) {
  let wordArray = tokenString.split(' ');
  let byteString = '';
  let result = '';
  if (wordArray.length < 8) return '';
  wordArray.forEach((word) => {
    wordlist.find((val, index) => {
      if (val === word) {
        byteString += index.toString(2).padStart(11, '0');
        return true;
      }
      return false;
    });
  });

  for (var i = 0; i < 11; i++) {
    result += String.fromCharCode(parseInt(byteString.slice(0, 8), 2));
    byteString = byteString.slice(8);
  }

  return btoa(result).replace(/\//g, '_').replace(/\+/g, '-');
}

export function handleGetResponse(response) {
  if (response.status !== 200) {
    connected = false;
    state = {};
    console.log(
      'Looks like there was a problem. Status Code: ' + response.status
    );
    return;
  }

  // Examine the text in the response
  response.json().then((data) => {
    state = data;
    connected = true;
  });
}
