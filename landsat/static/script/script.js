require([
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/rest/locator",
  "esri/geometry/Polygon",
  "esri/geometry/SpatialReference",
], (Map, MapView, Graphic, locator, Polygon, SpatialReference) => {
  // Set up a locator url using the world geocoding service
  const locatorUrl =
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

  // Create the Map
  const map = new Map({
    basemap: "satellite",
  });

  // Create the MapView
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-71.6899, 43.7598],
    zoom: 17,
  });

  view.popupEnabled = false;
  const pixelSize = 0.00027;

  const surroundingColor = [169, 209, 142, 0.5]; // Light green for surrounding pixels (50% opacity)
  const targetColor = [0, 255, 255, 0.8];

  function createPixelGrid(lat, lon) {
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

  view.on("click", (event) => {
    // Get the coordinates of the click on the view
    const lat = Math.round(event.mapPoint.latitude * 1000) / 1000;
    const lon = Math.round(event.mapPoint.longitude * 1000) / 1000;
    view.graphics.removeAll();

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

    fetch(url)
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
              `;
          })
          .catch(() => {
            // If the promise fails and no result is found, show a generic message
            view.popup.content = "No address was found for this location";
          });
      });
  });
});
