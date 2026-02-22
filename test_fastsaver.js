const url = "https://fastsaverapi.com/get?url=https://www.youtube.com/watch?v=fQF5ZU3yQ4M";
fetch(url, { headers: { Authorization: "Bearer frRjU9OLrgVNPtFVdHY9Hm2A" } })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
