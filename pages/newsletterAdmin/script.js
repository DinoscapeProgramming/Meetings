document.getElementById((!localStorage.getItem("newsletterPassword")) ? "loginContainer" : "emailContainer").style.display = "flex";

document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("sendEmailButton").addEventListener("click", () => {
  if ((!document.getElementById("emailSubjectInput").value) || (!document.getElementById("emailTextInput").value)) return;
  fetch("/api/v1/newsletter/send", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      password: localStorage.getItem("newsletterPassword"),
      subject: document.getElementById("emailSubjectInput").value,
      type: document.getElementById("emailTypeSelect").value,
      text: document.getElementById("emailTextInput").value
    })
  })
  .then((res) => res.json())
  .then((result) => {
    if (result.err) return;
    document.getElementById("emailSubjectInput").value = "";
    document.getElementById("emailTypeSelect").value = "text";
    document.getElementById("emailTextInput").value = "";
    document.getElementById("emailTextInput").placeholder = "Text";
  });
});
document.getElementById("passwordInput").addEventListener("keydown", ({ repeat, key }) => {
  if (repeat) return;
  if (key !== "Enter") return;
  login();
});

document.getElementById("emailTypeSelect").addEventListener("change", () => {
  document.getElementById("emailTextInput").placeholder = (document.getElementById("emailTypeSelect").value === "text") ? "Text" : "HTML";
});

function login() {
  if (!document.getElementById("passwordInput").value) return;
  fetch("/api/v1/newsletter/password/check", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      password: document.getElementById("passwordInput").value
    })
  })
  .then((res) => res.json())
  .then(({ correctPassword }) => {
    if (!correctPassword) {
      document.getElementById("passwordInput").value = "";
    } else {
      localStorage.setItem("newsletterPassword", document.getElementById("passwordInput").value);
      document.getElementById("loginContainer").style.display = "none";
      document.getElementById("emailContainer").style.display = "flex";
    }
  });
}

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