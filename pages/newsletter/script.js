document.getElementById("newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  document.getElementById("newsletterInput").reportValidity();
  if (document.getElementById("newsletterInput").checkValidity()) {
    fetch("/api/v1/newsletter/register", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: document.getElementById("newsletterInput").value
      })
    })
    .then((res) => res.json())
    .then((result) => {
      if (result.err) return;
      document.getElementById("newsletterInput").value = "";
    });
  };
});

if (isElectron) {
  window.addEventListener("offline", () => {
    require("electron").ipcRenderer.send("noInternetConnection");
  });
}

if (!["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(navigator.platform) && !navigator.userAgent.includes("Mac") && !("ontouchend" in document)) {
  let serviceWorkerRegistration = document.createElement("script");
  serviceWorkerRegistration.setAttribute("defer", "");
  serviceWorkerRegistration.setAttribute("src", "/pages/serviceWorker.js");
  document.head.appendChild(serviceWorkerRegistration);
};