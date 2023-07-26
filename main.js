
const chadsoftPlayerPageLinkRegex = /^https:\/\/(?:www\.)?chadsoft\.co\.uk\/time-trials\/players\/([0-9A-Fa-f]{2}\/[0-9A-Fa-f]{14})\.html(?:#.+)?/;

let apiCallSavedPromises = new Map();

function createGetErrorMessage(status, statusText)
{
  let errorMessage;

  if (status === 404) {
    errorMessage = `Chadsoft player page does not exist!`;
  } else {
    errorMessage = `Error occurred with status code ${status}: ${statusText}.`;
  }

  return new Error(errorMessage);
}

async function requestsGetPromise(urlStr)
{
    console.log(`Starting ${urlStr} at ${performance.now()}.`);

    let savedPromise = apiCallSavedPromises.get(urlStr);
    if (savedPromise !== undefined) {
        console.log(`${urlStr}: using saved result`);
        return savedPromise;
    }

    let timeStart = performance.now();
    let promise = new Promise(function (resolve, reject) {
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", urlStr, true);
        xmlHttp.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                let data = JSON.parse(xmlHttp.response);
                let timeEnd = performance.now();
                console.log(`${urlStr}: ${(timeEnd - timeStart)/1000.0}`);
                resolve(data);
            } else {
                reject(createGetErrorMessage(this.status, xmlHttp.statusText));
            }
        };
        xmlHttp.onerror = function () {
            reject(createGetErrorMessage(this.status, xmlHttp.statusText));
        };
        xmlHttp.send();
    });

    apiCallSavedPromises.set(urlStr, promise);
    return promise;
}

const listFormatter = new Intl.ListFormat("en", {style: "long", type: "conjunction"});

async function fetchPlayerPageAndCountNumPlatinumStars(chadsoftPlayerPageLink) {
  const matchContents = chadsoftPlayerPageLink.match(chadsoftPlayerPageLinkRegex);
  console.log("matchContents:", matchContents);
  if (matchContents === null || matchContents.length !== 2) {
    return "Invalid chadsoft player page link!";
  }

  let playerPageUrl = `https://tt.chadsoft.co.uk/players/${matchContents[1]}.json`

  let playerPageData;

  try {
    document.getElementById("platinum-star-message").innerText = "Waiting for Chadsoft...";
    playerPageData = await requestsGetPromise(playerPageUrl);
  } catch (e) {
    return e.message;
  }

  let ghosts = playerPageData["ghosts"]
  if (ghosts === undefined || ghosts === null) {
    return "Chadsoft player page has no ghosts!";
  }
  let platinumStarTrackNames = new Set();

  console.log(ghosts);

  try {
    for (ghost of ghosts) {
      let stars = ghost["stars"];
      if (stars) {
        let hasGoldStar = stars["gold"];
        if (hasGoldStar) {
          let trackId = ghost["trackId"];
          let esgDriverVehicleId = esgDriverVehicleIds[trackId];
          if (esgDriverVehicleId) {
            esgDriverId = esgDriverVehicleId["driverId"];
            esgVehicleId = esgDriverVehicleId["vehicleId"];
            ghostDriverId = ghost["driverId"];
            ghostVehicleId = ghost["vehicleId"];

            if (esgDriverId === ghostDriverId && esgVehicleId === ghostVehicleId) {
              platinumStarTrackNames.add(ghost["trackName"]);
            }
          } else {
            console.log(`No esgDriverVehicleId for ghost on ${ghost["trackName"]}: ${ghost["_links"]["item"]["href"]}, time: ${ghost["finishTimeSimple"]}, esgDriverVehicleId: ${esgDriverVehicleId}`);
          }
        }
      }
    }
  } catch (e) {
    return `Something went wrong, please contact the developer! Error message: ${e.message}.`;
  }

  let platinumStarTrackNamesSorted = Array.from(platinumStarTrackNames).sort();

  return `You (${playerPageData['miiName']}) have ${platinumStarTrackNamesSorted.length} Platinum Star${platinumStarTrackNamesSorted.length !== 1 ? "s" : ""}.` + ( platinumStarTrackNamesSorted.length !== 0 ? ` You have Platinum Stars on ${listFormatter.format(platinumStarTrackNamesSorted)}.` : "");
}

async function onSubmit(event) {
  event.preventDefault();
  event.stopPropagation();
  let chadsoftPlayerPageLink = event.target.elements["player-page"].value;
  let platinumStarMessage = await fetchPlayerPageAndCountNumPlatinumStars(chadsoftPlayerPageLink);
  document.getElementById("platinum-star-message").innerText = platinumStarMessage;
  return false;
}
