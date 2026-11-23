// Ko-fi floating donate button (page: ko-fi.com/furballsmp)
(function () {
  const s = document.createElement("script");
  s.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
  s.onload = function () {
    kofiWidgetOverlay.draw("furballsmp", {
      "type": "floating-chat",
      "floating-chat.donateButton.text": "Tip Jar",
      "floating-chat.donateButton.background-color": "#11150f",
      "floating-chat.donateButton.text-color": "#37e36a"
    });
  };
  document.head.appendChild(s);
})();
