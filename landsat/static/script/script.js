require(["esri/rest/locator", "esri/Map", "esri/views/MapView"], (
  locator,
  Map,
  MapView
) => {
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
    zoom: 12,
  });

  /*******************************************************************
   * This click event sets generic content on the popup not tied to
   * a layer, graphic, or popupTemplate. The location of the point is
   * used as input to a reverse geocode method and the resulting
   * address is printed to the popup content.
   *******************************************************************/
  view.popupEnabled = false;
  view.on("click", (event) => {
    // Get the coordinates of the click on the view
    const lat = Math.round(event.mapPoint.latitude * 1000) / 1000;
    const lon = Math.round(event.mapPoint.longitude * 1000) / 1000;
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
        var date = `${data.overpasses[0].date}`;
        var overpassSatellite = `${data.overpasses[0].satellite}`;
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

        // Set the popup content to the table
        view.openPopup({
          // Set the popup's title to the coordinates of the location
          title: "Coordinates: [" + lat + ", " + lon + "]",
          content: tableContent,
          location: event.mapPoint, // Set the location of the popup to the clicked location
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
console.log("jai");