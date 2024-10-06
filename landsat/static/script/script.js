require([
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/rest/locator",
  "esri/geometry/Polygon",
  "esri/geometry/SpatialReference",
  "esri/widgets/Search",
], (Map, MapView, Graphic, locator, Polygon, SpatialReference, Search) => {
  // Set up a locator url using the world geocoding service
  const locatorUrl =
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

  // Create the Map
  const map = new Map({
    basemap: "hybrid",
  });

  // Create the MapView
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-71.6899, 43.7598],
    zoom: 17,
  });
  //PopUP
  view.popupEnabled = false;
  //Creating Grid
  const pixelSize = 0.00027;

  const surroundingColor = [169, 209, 142, 0.5]; // Light green for surrounding pixels (50% opacity)
  const targetColor = [0, 255, 255, 0.8];

  function createPixelGrid(lat, lon) {
    //function is proposing 3x3 grid
    const gridBoxes = [];
    let color;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const centerLat = lat + i * pixelSize;
        const centerLon = lon + j * pixelSize;

        const polygon = new Polygon({
          rings: [
            [centerLon - pixelSize / 2, centerLat - pixelSize / 2], // Bottom left
            [centerLon + pixelSize / 2, centerLat - pixelSize / 2], // Bottom right
            [centerLon + pixelSize / 2, centerLat + pixelSize / 2], // Top right
            [centerLon - pixelSize / 2, centerLat + pixelSize / 2], // Top left
            [centerLon - pixelSize / 2, centerLat - pixelSize / 2], // Close the loop
          ],
          spatialReference: SpatialReference.WGS84,
        });

        if (i === 0 && j === 0) {
          // Target pixel (center of the 3x3 grid)
          color = targetColor;
        } else {
          // Surrounding pixels
          color = surroundingColor;
        }

        gridBoxes.push({
          polygon: polygon,
          color: color,
          isTarget: i === 0 && j === 0,
        });
      }
    }
    return gridBoxes;
  }

  function drawGrid(gridBoxes) {
    //Creating a grid
    gridBoxes.forEach((box) => {
      const boxGraphic = new Graphic({
        geometry: box.polygon,
        symbol: {
          type: "simple-fill",
          color: [...box.color, 0.75], // Green with 50% opacity
          outline: {
            color: "black",
            width: 1,
          },
        },
      });
      view.graphics.add(boxGraphic);
    });
  }

  function getid(lat, lon) {
    //Getting Landsat Scene id
    const url = `/displayid/?lat=${lat}&lon=${lon}`;
    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
        return data.Display_ID;
      })
      .catch((error) => {
        console.error("Error: ", error);
        return null;
      });
  }
  //Integrating Search Location Functionality
  const searchWidget = new Search({
    view: view, // Associate the search widget with the view
    sources: [
      {
        locator: locatorUrl, // Geocoding service
        singleLineFieldName: "SingleLine",
        outFields: ["*"],
        placeholder: "Search for a location",
      },
    ],
  });

  view.ui.add(searchWidget, {
    position: "top-right",
  });

  searchWidget.on("select-result", async (event) => {
    //Visits Searched Location
    const lat = event.result.feature.geometry.latitude;
    const lon = event.result.feature.geometry.longitude;

    view.graphics.removeAll();

    view.goTo({
      //Visiting Searchrd Location
      center: [lon, lat],
      zoom: 16, // Adjust zoom level here
    });
    view.popup.visible = false;
    getid(lat, lon).then((displayID) => {
      console.log(`Display ID: ${displayID}`);
    });
  });

  view.on("click", async (event) => {
    // Get the coordinates of the click on the view
    const lat = Math.round(event.mapPoint.latitude * 1000) / 1000;
    const lon = Math.round(event.mapPoint.longitude * 1000) / 1000;
    view.graphics.removeAll();

    const displayID = await getid(lat, lon);
    view.goTo({
      center: [lon, lat],
      zoom: 16, // Adjust zoom level here as needed
    });

    const gridPoints = createPixelGrid(lat, lon);
    drawGrid(gridPoints);
    const api_key = "YXR92DJwCTUmyWFDQvF8Lr";
    const bbox = `${lat},${lon},${lat},${lon}`;
    const satellites = "Landsat-8,Landsat-9";
    const url = `https://api.spectator.earth/overpass/?bbox=${bbox}&satellites=${satellites}&api_key=${api_key}`;
    fetch(url) //fetching LandSat Acqisition Data
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        console.log(data);

        const tableContent = `
                  <table border="1" style="width:100%; text-align: left; border-collapse: collapse;">
                      <tr>
                          <th>Satellite</th>
                          <th>Date</th>
                          <th>Time</th>
                      </tr>
                      <tr>
                          <td>${data.overpasses[0].satellite}</td>
                          <td>${data.overpasses[0].date}</td>
                          <td>${data.overpasses[0].date}</td>
                      </tr>
                      <tr>
                          <td>${data.overpasses[1].satellite}</td>
                          <td>${data.overpasses[1].date}</td>
                          <td>${data.overpasses[1].date}</td>
                      </tr>
                  </table>
                  <br>
                  <h3>Point found in Landsat scene</h3>
                  <h4>${displayID}</h4>
              `;

        const popupLocation = {
          latitude: lat + pixelSize * 1.5, // Slight offset from the clicked point
          longitude: lon,
        };
        // Set the popup content to the table

        view.openPopup({
          // Set the popup's title to the coordinates of the location
          title: "Coordinates: [" + lat + ", " + lon + "]",
          content: tableContent,
          location: popupLocation, // Set the location of the popup to the clicked location
        });

        const params = {
          location: event.mapPoint,
        };

        // Display the popup
        // Execute a reverse geocode using the clicked location
        locator
          .locationToAddress(locatorUrl, params)
          .then((response) => {
            // If an address is successfully found, show it in the popup's content
            view.popup.content = response.address;
            view.popup.content += `
                  <br><br>
                  <h3>Next Acquisition</h3>
                  <table border="1" style="width:100%; text-align: left; border-collapse: collapse;">
                      <tr>
                          <th>Satellite</th>
                          <th>Date</th>
                          <th>Time</th>
                      </tr>
                      </tr>
                ${data.overpasses
                  .map((overpass) => {
                    const dateTime = overpass.date.split("T"); // Split the date and time
                    const date = dateTime[0]; // Date part
                    const time = dateTime[1].replace("Z", ""); // Time part without 'Z'

                    return `
                        <tr>
                            <td>${overpass.satellite}</td>
                            <td>${date}</td>
                            <td>${time}</td>
                        </tr>
                    `;
                    //   <tr>
                    //       <td>${data.overpasses[1].satellite}</td>
                    //       <td>${data.overpasses[1].date}</td>
                    //       <td>${data.overpasses[1].date}</td>
                    //   </tr>
                  })
                  .join("")}
                  </table>
                  <h3>Point found in Landsat scene</h3>
                  <h4>${displayID}</h4>
              `;
          })
          .catch(() => {
            // If the promise fails and no result is found, show a generic message
            view.popup.content = "No address was found for this location";
          });
      });
  });
});
