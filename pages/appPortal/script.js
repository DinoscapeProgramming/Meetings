let HTMLMode = ace.require('ace/mode/html').Mode;
let JavaScriptMode = ace.require('ace/mode/javascript').Mode;

let createAppPopupEditor = ace.edit("createAppPopupEditor");
createAppPopupEditor.setTheme("ace/theme/monokai");
createAppPopupEditor.session.setMode(new HTMLMode());
createAppPopupEditor.setOption("tabSize", 2);
createAppPopupEditor.setValue("HTML - Popup");

let createAppScriptEditor = ace.edit("createAppScriptEditor");
createAppScriptEditor.setTheme("ace/theme/monokai");
createAppScriptEditor.session.setMode(new JavaScriptMode());
createAppScriptEditor.setOption("tabSize", 2);
createAppScriptEditor.setValue("JavaScript - Script");

let editAppPopupEditor = ace.edit("editAppPopupEditor");
editAppPopupEditor.setTheme("ace/theme/monokai");
editAppPopupEditor.session.setMode(new HTMLMode());
editAppPopupEditor.setOption("tabSize", 2);
editAppPopupEditor.setValue("HTML - Popup");

let editAppScriptEditor = ace.edit("editAppScriptEditor");
editAppScriptEditor.setTheme("ace/theme/monokai");
editAppScriptEditor.session.setMode(new JavaScriptMode());
editAppScriptEditor.setOption("tabSize", 2);
editAppPopupEditor.setValue("JavaScript - Script");

document.getElementById("createAppMenuButton").addEventListener("click", () => {
  document.getElementById("editAppMenuButton").style.opacity = "0.8";
  document.getElementById("deleteAppMenuButton").style.opacity = "0.8";
  document.getElementById("createAppMenuButton").style.opacity = "1";
  document.getElementById("appEditor").style.display = "none";
  document.getElementById("appDeleter").style.display = "none";
  document.getElementById("appCreator").style.display = "block";
});

document.getElementById("editAppMenuButton").addEventListener("click", () => {
  document.getElementById("createAppMenuButton").style.opacity = "0.8";
  document.getElementById("deleteAppMenuButton").style.opacity = "0.8";
  document.getElementById("editAppMenuButton").style.opacity = "1";
  document.getElementById("appCreator").style.display = "none";
  document.getElementById("appDeleter").style.display = "none";
  document.getElementById("appEditor").style.display = "block";
});

document.getElementById("deleteAppMenuButton").addEventListener("click", () => {
  document.getElementById("createAppMenuButton").style.opacity = "0.8";
  document.getElementById("editAppMenuButton").style.opacity = "0.8";
  document.getElementById("deleteAppMenuButton").style.opacity = "1";
  document.getElementById("appCreator").style.display = "none";
  document.getElementById("appEditor").style.display = "none";
  document.getElementById("appDeleter").style.display = "block";
});

document.getElementById("createAppButton").addEventListener("click", () => {
  document.getElementById("createAppName").reportValidity();
  if (document.getElementById("createAppName").checkValidity()) {
    if (document.getElementById("createAppIcon").files.length !== 0) {
      let fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
        fetch("/api/v1/apps/create", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...{
              icon: {
                type: document.getElementById("createAppIcon").files[0].type.split("/")[1],
                content: fileReader.result
              },
              name: document.getElementById("createAppName").value,
              popup: createAppPopupEditor.getValue(),
              script: createAppScriptEditor.getValue()
            },
            ...{
              ...(document.getElementById("createAppDescription").value) ? {
                description: document.getElementById("createAppDescription").value
              } : {},
              ...(document.getElementById("createAppPassword").value) ? {
                password: document.getElementById("createAppDescription").value
              } : {}
            }
          })
        })
        .then((res) => res.json())
        .then(({ appId, err }) => {
          if (!err) {
            createAppPopupEditor.setValue("");
            createAppScriptEditor.setValue("");
            document.getElementById("createAppIcon").value = "";
            document.getElementById("createAppName").value = "";
            document.getElementById("createAppDescription").value = "";
            document.getElementById("createAppPassword").value = "";
            document.getElementById("createAppIdContainer").style.display = "flex";
            document.getElementById("createAppId").innerText = appId;
          }
        });
      });
      fileReader.readAsText(document.getElementById("createAppIcon").files[0]);
    } else {
      fetch("/api/v1/apps/create", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...{
            name: document.getElementById("createAppName").value,
            popup: createAppPopupEditor.getValue(),
            script: createAppScriptEditor.getValue()
          },
          ...{
            ...(document.getElementById("createAppDescription").value) ? {
              description: document.getElementById("createAppDescription").value
            } : {},
            ...(document.getElementById("createAppPassword").value) ? {
              password: document.getElementById("createAppDescription").value
            } : {}
          }
        })
      })
      .then((res) => res.json())
      .then(({ err, appId }) => {
        if (err) return;
        document.getElementById("appCreator").dataset.password = document.getElementById("createAppPassword").value;
        document.getElementById("createAppAccessId").value = appId;
        document.getElementById("createAppAccessPasswordButton").onclick = () => {
          navigator.clipboard.writeText(document.getElementById("appCreator").dataset.password);
        };
        document.getElementById("appCreatorParameterContainer").style.display = "none";
        document.getElementById("appCreatorResponseContainer").style.display = "block";
        createAppPopupEditor.setValue("");
        createAppScriptEditor.setValue("");
        document.getElementById("createAppIcon").value = "";
        document.getElementById("createAppName").value = "";
        document.getElementById("createAppDescription").value = "";
        document.getElementById("createAppPassword").value = "";
      });
    };
  };
});

document.getElementById("editAppAccessButton").addEventListener("click", () => {
  if (!document.getElementById("editAppAccessId").value || !document.getElementById("editAppAccessPassword").value) return;
  fetch("/api/v1/apps/passwords/check", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appId: document.getElementById("editAppAccessId").value,
      appPassword: document.getElementById("editAppAccessPassword").value
    })
  }).then(({ correctPassword }) => {
    if (!correctPassword) {
      document.getElementById("editAppAccessId").value = "";
      document.getElementById("editAppAccessPassword").value = "";
    } else {
      document.getElementById("editAppAccessContainer").style.display = "none";
      document.getElementById("editAppParameterContainer").style.display = "block";
    };
  });
});

document.getElementById("editAppButton").addEventListener("click", () => {
  document.getElementById("editAppName").reportValidity();
  if (document.getElementById("editAppName").checkValidity()) {
    if (document.getElementById("editAppIcon").files.length !== 0) {
      let fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
        fetch("/api/v1/apps/edit", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...{
              appId: document.getElementById("editAppAccessId").value,
              appPassword: document.getElementById("editAppAccessPassword").value
            },
            ...{
              ...(editAppPopupEditor.getValue()) ? {
                popup: editAppPopupEditor.getValue()
              } : {},
              ...(editAppScriptEditor.getValue()) ? {
                script: editAppScriptEditor.getValue()
              } : {},
              ...(document.getElementById("editAppName").value) ? {
                name: document.getElementById("editAppName").value
              } : {},
              ...{
                icon: {
                  type: document.getElementById("editAppIcon").files[0].type.split("/")[1],
                  content: fileReader.result
                }
              },
              ...(document.getElementById("editAppDescription").value) ? {
                description: document.getElementById("editAppDescription").value
              } : {},
              ...(document.getElementById("editAppPassword").value) ? {
                password: document.getElementById("editAppPassword").value
              } : {}
            }
          })
        })
        .then((res) => res.json())
        .then(({ err }) => {
          if (err) return;
          editAppPopupEditor.setValue("");
          editAppScriptEditor.setValue("");
          document.getElementById("editAppId").value = "";
          document.getElementById("editAppPassword").value = "";
          document.getElementById("editAppIcon").value = "";
          document.getElementById("editAppName").value = "";
          document.getElementById("editAppDescription").value = "";
          document.getElementById("newEditAppPassword").value = "";
        });
      });
      fileReader.readAsText(document.getElementById("editAppIcon").files[0]);
    } else {
      fetch("/api/v1/apps/edit", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...{
            appId: document.getElementById("editAppId").value,
            appPassword: document.getElementById("editAppPassword").value
          },
          ...{
            ...(editAppPopupEditor.getValue()) ? {
              popup: editAppPopupEditor.getValue()
            } : {},
            ...(editAppScriptEditor.getValue()) ? {
              script: editAppScriptEditor.getValue()
            } : {},
            ...(document.getElementById("editAppName").value) ? {
              name: document.getElementById("editAppName").value
            } : {},
            ...(document.getElementById("editAppDescription").value) ? {
              description: document.getElementById("editAppDescription").value
            } : {},
            ...(document.getElementById("newEditAppPassword").value) ? {
              password: document.getElementById("newEditAppPassword").value
            } : {}
          }
        })
      })
      .then((res) => res.json())
      .then(({ err }) => {
        if (err) return;
        editAppPopupEditor.setValue("");
        editAppScriptEditor.setValue("");
        document.getElementById("editAppId").value = "";
        document.getElementById("editAppPassword").value = "";
        document.getElementById("editAppIcon").value = "";
        document.getElementById("editAppName").value = "";
        document.getElementById("editAppDescription").value = "";
        document.getElementById("newEditAppPassword").value = "";
      });
    };
  };
});

document.getElementById("deleteAppButton").addEventListener("click", () => {
  if (!document.getElementById("deleteAppAccessId").value || !document.getElementById("deleteAppAccessPassword").value || !window.confirm("Are you sure about deleting this app? This action cannot be undone.")) return;
  fetch("/api/v1/apps/delete", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appId: document.getElementById("deleteAppAccessId").value,
      password: document.getElementById("deleteAppAccessPassword").value
    })
  })
  .then((res) => res.json())
  .then(({ err }) => {
    if (err) return;
    document.getElementById("deleteAppAccessId").value = "";
    document.getElementById("deleteAppAccessPassword").value = "";
  });
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