import fetch from "node-fetch";

const url = "https://fastsaverapi.com/get?url=https://www.youtube.com/watch?v=fQF5ZU3yQ4M";
const apiKey = "frRjU9OLrgVNPtFVdHY9Hm2A";

const response = await fetch(url, {
  method: "GET",
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});

const text = await response.text();
console.log(response.status, text);
