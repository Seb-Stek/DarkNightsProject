// Shared-artifact copy only. The artifact frame blocks map imagery from outside servers,
// so when a background tile fails to load, say so under the map instead of leaving it unexplained.
(function () {
  if (!window.L) return;
  let noted = false;
  L.TileLayer.addInitHook(function () {
    this.on("tileerror", () => {
      if (noted) return;
      noted = true;
      const note = document.createElement("p");
      note.className = "map-note";
      note.textContent = "The map's land and water imagery can't load in this shared copy. The gold points still show every Dark Night, and you can click them for details.";
      document.getElementById("event-map").insertAdjacentElement("afterend", note);
    });
  });
})();
