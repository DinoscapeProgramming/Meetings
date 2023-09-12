document.getElementById("landingPageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  let link = document.createElement("a");
  if (passwordExists) {
      document.getElementById("passwordPopup").dataset.username = document.getElementById("landingPageForm").children[1].value;
      document.getElementById("passwordPopup").style.display = "block";
      document.getElementById("landingPageForm").children[1].value = "";
  } else {
    link.href = "/meeting/" + meetingId + "?username=" + document.getElementById("landingPageFormInput").value;
    link.click();
  };
});

document.getElementById("passwordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  fetch("/api/v1/passwords/check", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      meetingId,
      password: document.getElementById("passwordForm").children[1].value
    })
  })
  .then((res) => res.json())
  .then(({ correctPassword }) => {
    if (!correctPassword) return document.getElementById("passwordForm").children[1].value = "";
    let link = document.createElement("a");
    link.href = "/meeting/" + meetingId + "?username=" + document.getElementById("passwordPopup").dataset.username + "&password=" + document.getElementById("passwordForm").children[1].value;
    link.click();
  });
});

window.addEventListener("click", ({ target }) => {
  if (target?.id === "passwordPopup") {
    target.style.display = "none";
  };
});

window.addEventListener("touchstart", ({ target }) => {
  if (target?.id === "passwordPopup") {
    target.style.display = "none";
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