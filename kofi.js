// Ko-fi floating donate button (page: ko-fi.com/furballsmp)
(function () {
  const s = document.createElement("script");
  s.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
  s.onload = function () {
    kofiWidgetOverlay.draw("furballsmp", {
      "type": "floating-chat",
      "floating-chat.donateButton.text": "Donate",
      "floating-chat.donateButton.background-color": "#5cb85c",
      "floating-chat.donateButton.text-color": "#fff"
    });
  };
  document.head.appendChild(s);
})();
