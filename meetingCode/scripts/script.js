const socket = io("/");
const peer = new Peer(undefined, {
  path: "/peer",
  host: "/",
  port: "443"
});

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
  let videoNameTag = document.createElement("div");
  videoNameTag.style.display = "flex";
  videoNameTag.style.alignItems = "flex-end";
  videoNameTag.style.transform = "translate(5px, -9px)";
  let videoNameTagText = document.createElement("span");
  videoNameTagText.style.position = "fixed";
  videoNameTagText.style.display = "flex";
  videoNameTagText.style.alignItems = "flex-end";
  videoNameTagText.style.fontSize = "large";
  videoNameTagText.style.padding = "3.5px 5.5px";
  videoNameTagText.style.backgroundColor = "#0000007d";
  videoNameTagText.style.borderBottomLeftRadius = "4px";
  videoNameTagText.innerText = username + " (me)";
  videoNameTag.appendChild(videoNameTagText);
  localVideoContainer.appendChild(videoNameTag);
  localVideoStream = stream;
  addVideoStream(localVideo, localVideoContainer, stream, document.getElementById("videoGrid"));
  peer.on("call", (call) => {
    calls.push(call);
    call.answer(localVideoStream);
    let videoContainer = document.createElement("div");
    videoContainer.dataset.userId = call.peer;
    videoContainer.addEventListener("click", () => {
      if (videoContainer.parentElement === document.getElementById("videoGrid")) return;
      document.getElementById("videoGrid").children[1].getElementsByTagName("video")[0].style.height = "25vh";
      document.getElementById("videoGridUpperHolder").appendChild(document.getElementById("videoGrid").children[1]);
      video.style.height = "48.5vh";
      document.getElementById("videoGrid").appendChild(videoContainer);
    });
    videoContainer.addEventListener("dblclick", () => {
      video.requestFullscreen();
    });
    let video = document.createElement("video");
    video.className = "userVideo";
    video.controls = false;
    //video.style.setProperty("--degrace", "180deg");
    let chat = document.createElement("div");
    chat.style.display = "none";
    chat.dataset.type = "specific";
    chat.dataset.userId = call.peer;
    chat.innerHTML = "<h3>No messages sent</h3>";
    document.getElementById("chatMessages").appendChild(chat);
    let chatOption = new Option();
    chatOption.value = "specific-" + call.peer;
    chatOption.innerText = users[call.peer][1];
    document.getElementById("chatUserSelect").appendChild(chatOption);
    let attendeeContainer = document.createElement("li");
    attendeeContainer.dataset.userId = call.peer;
    let attendeeUsername = document.createElement((host) ? "input" : "h3");
    if (host) attendeeUsername.className = "attendeeUsername";
    attendeeUsername[(host) ? "value" : "innerText"] = users[call.peer][1];
    if (host) {
      attendeeUsername.addEventListener("change", () => {
        socket.emit("renameUser", {
          userId: call.peer,
          username: attendeeUsername.value
        });
      });
    };
    attendeeContainer.appendChild(attendeeUsername);
    let attendeeStopVideoButton = document.createElement("div");
    attendeeStopVideoButton.className = "optionButton";
    attendeeStopVideoButton.style.backgroundColor = "#2d8cff";
    attendeeStopVideoButton.style.margin = "15px";
    attendeeStopVideoButton.innerHTML = "<i class='fa fa-video-camera' aria-hidden='true'></i>";
    attendeeStopVideoButton.title = "Stop Video";
    if (host) {
      attendeeStopVideoButton.addEventListener("click", () => {
        socket.emit("stopVideo", {
          userId: call.peer
        });
      });
    }
    let attendeeMuteAudioButton = document.createElement("div");
    attendeeMuteAudioButton.className = "optionButton";
    attendeeMuteAudioButton.style.backgroundColor = "#2d8cff";
    attendeeMuteAudioButton.style.margin = "15px -7.5px";
    attendeeMuteAudioButton.innerHTML = "<i class='fa fa-microphone' aria-hidden='true'></i>";
    attendeeMuteAudioButton.title = "Mute Audio";
    if (host) {
      attendeeMuteAudioButton.addEventListener("click", () => {
        socket.emit("muteAudio", {
          userId: call.peer
        });
      });
    };
    attendeeContainer.appendChild(attendeeStopVideoButton);
    attendeeContainer.appendChild(attendeeMuteAudioButton);
    if (host) {
      let attendeeLeaveButton = document.createElement("div");
      attendeeLeaveButton.className = "optionButton";
      attendeeLeaveButton.style.backgroundColor = "#2d8cff";
      attendeeLeaveButton.style.margin = "-7.5px 15px";
      attendeeLeaveButton.innerHTML = "<i class='fa fa-arrow-right-from-bracket' aria-hidden='true'></i>";
      attendeeLeaveButton.title = "Leave Meeting";
      attendeeLeaveButton.addEventListener("click", () => {
        socket.emit("kickUser", {
          userId: call.peer
        });
      });
      attendeeContainer.appendChild(attendeeLeaveButton);
    };
    document.getElementById("attendeeContent").appendChild(attendeeContainer);
    let videoNameTag = document.createElement("div");
    videoNameTag.style.display = "flex";
    videoNameTag.style.alignItems = "flex-end";
    videoNameTag.style.transform = "translate(5px, -9px)";
    let videoNameTagText = document.createElement("span");
    videoNameTagText.style.position = "fixed";
    videoNameTagText.style.display = "flex";
    videoNameTagText.style.alignItems = "flex-end";
    videoNameTagText.style.fontSize = "large";
    videoNameTagText.style.padding = "3.5px 5.5px";
    videoNameTagText.style.backgroundColor = "#0000007d";
    videoNameTagText.style.borderBottomLeftRadius = "4px";
    videoNameTagText.innerText = users[call.peer][1];
    videoNameTag.appendChild(videoNameTagText);
    videoContainer.appendChild(videoNameTag);
    document.getElementById("videoGrid").children[1].getElementsByTagName("video")[0].style.height = "48.5vh";
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, videoContainer, userVideoStream, document.getElementById("videoGridUpperHolder"));
    });
    call.on("close", () => {
      let leftUser = users[call.peer];
      calls = calls.filter(({ peer: peerId }) => peerId !== call.peer);
      attendeeContainer.remove();
      videoContainer.remove();
      users = Object.entries(users).filter(([leftUserId]) => leftUserId !== call.peer).reduce((data, user) => ({ ...data, ...{ [user[0]]: user[1] } }), {});
      notifications.filter((notification) => notification[0] === "userLeave").forEach((notification) => {
        if (notification[1].type === "beep") {
          require("electron").shell.beep();
        } else if (notification[1].type === "notification") {
          Notification.requestPermission().then((permission) => {
            if (permission === "denied") return;
            new Notification("User left", {
              icon: "/public/favicon.png",
              body: Object.entries({
                socketId: leftUser[0],
                userId: call.peer,
                username: leftUser[1]
              }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
            });
          });
        } else if (notification[1].type === "custom") {
          try {
            eval(notification[1].code);
          } catch {}
        }
      });
      if (!document.getElementById("videoGridUpperHolder").children.length) document.getElementById("videoGrid").children[1].style.height = "75vh";
    });
  });
  socket.on("userJoin", ({ socketId, userId, username: joinedUsername }) => {
    setTimeout(() => {
      users[userId] = [socketId, joinedUsername];
      let call = peer.call(userId, localVideoStream);
      calls.push(call);
      let connectedUserVideoContainer = document.createElement("div");
      connectedUserVideoContainer.addEventListener("click", () => {
        if (connectedUserVideoContainer.parentElement === document.getElementById("videoGrid")) return;
        document.getElementById("videoGrid").children[1].getElementsByTagName("video")[0].style.height = "25vh";
        document.getElementById("videoGridUpperHolder").appendChild(document.getElementById("videoGrid").children[1]);
        connectedUserVideo.style.height = "48.5vh";
        document.getElementById("videoGrid").appendChild(connectedUserVideoContainer);
      });
      connectedUserVideoContainer.addEventListener("dblclick", () => {
        connectedUserVideo.requestFullscreen();
      });
      connectedUserVideoContainer.dataset.userId = call.peer;
      let connectedUserVideo = document.createElement("video");
      connectedUserVideo.className = "userVideo";
      connectedUserVideo.controls = false;
      //connectedUserVideo.style.setProperty("--degrace", "180deg");
      let chat = document.createElement("div");
      chat.style.display = "none";
      chat.dataset.type = "specific";
      chat.dataset.userId = call.peer;
      chat.innerHTML = "<h3>No messages sent</h3>";
      document.getElementById("chatMessages").appendChild(chat);
      let chatOption = new Option();
      chatOption.value = "specific-" + call.peer;
      chatOption.innerText = joinedUsername;
      document.getElementById("chatUserSelect").appendChild(chatOption);
      let attendeeContainer = document.createElement("li");
      attendeeContainer.dataset.userId = call.peer;
      let attendeeUsername = document.createElement((host) ? "input" : "h3");
      attendeeUsername[(host) ? "value" : "innerText"] = users[call.peer][1];
      if (host) {
        attendeeUsername.addEventListener("change", () => {
          socket.emit("renameUser", {
            userId: call.peer,
            username: attendeeUsername.value
          });
        });
      };
      attendeeContainer.appendChild(attendeeUsername);
      let attendeeStopVideoButton = document.createElement("div");
      attendeeStopVideoButton.className = "optionButton";
      attendeeStopVideoButton.style.backgroundColor = "#007BFF";
      attendeeStopVideoButton.style.margin = "15px";
      attendeeStopVideoButton.innerHTML = "<i class='fa fa-video-camera' aria-hidden='true'></i>";
      attendeeStopVideoButton.title = "Stop Video";
      if (host) {
        attendeeStopVideoButton.addEventListener("click", () => {
          socket.emit("stopVideo", {
            userId: call.peer
          });
        });
      };
      let attendeeMuteAudioButton = document.createElement("div");
      attendeeMuteAudioButton.className = "optionButton";
      attendeeMuteAudioButton.style.backgroundColor = "#007BFF";
      attendeeMuteAudioButton.style.margin = "15px 15px 15px -12px";
      attendeeMuteAudioButton.innerHTML = "<i class='fa fa-microphone' aria-hidden='true'></i>";
      attendeeMuteAudioButton.title = "Mute Audio";
      if (host) {
        attendeeMuteAudioButton.addEventListener("click", () => {
          socket.emit("muteAudio", {
            userId: call.peer
          });
        });
      };
      attendeeContainer.appendChild(attendeeStopVideoButton);
      attendeeContainer.appendChild(attendeeMuteAudioButton);
      if (host) {
        let attendeeLeaveButton = document.createElement("div");
        attendeeLeaveButton.className = "optionButton";
        attendeeLeaveButton.style.backgroundColor = "#007BFF";
        attendeeLeaveButton.style.margin = "15px 15px 15px -12px";
        attendeeLeaveButton.innerHTML = "<i class='fa fa-arrow-right-from-bracket' aria-hidden='true'></i>";
        attendeeLeaveButton.title = "Leave Meeting";
        attendeeLeaveButton.addEventListener("click", () => {
          socket.emit("kickUser", {
            userId: call.peer
          });
        });
        attendeeContainer.appendChild(attendeeLeaveButton);
      };
      document.getElementById("attendeeContent").appendChild(attendeeContainer);
      let videoNameTag = document.createElement("div");
      videoNameTag.style.display = "flex";
      videoNameTag.style.alignItems = "flex-end";
      videoNameTag.style.transform = "translate(5px, -9px)";
      let videoNameTagText = document.createElement("span");
      videoNameTagText.style.position = "fixed";
      videoNameTagText.style.display = "flex";
      videoNameTagText.style.alignItems = "flex-end";
      videoNameTagText.style.fontSize = "large";
      videoNameTagText.style.padding = "3.5px 5.5px";
      videoNameTagText.style.backgroundColor = "#0000007d";
      videoNameTagText.style.borderBottomLeftRadius = "4px";
      videoNameTagText.innerText = joinedUsername;
      videoNameTag.appendChild(videoNameTagText);
      connectedUserVideoContainer.appendChild(videoNameTag);
      document.getElementById("videoGrid").children[1].getElementsByTagName("video")[0].style.height = "48.5vh";
      call.on("stream", (connectUserStream) => {
        addVideoStream(connectedUserVideo, connectedUserVideoContainer, connectUserStream, document.getElementById("videoGridUpperHolder"));
        if (!localVideoStream.getVideoTracks()[0].enabled) {
          socket.emit("videoTrackUpdate", {
            enabled: false
          });
        }
        if ((localVideoStream.getAudioTracks().length > 0) && (!localVideoStream.getAudioTracks()[0].enabled)) {
          socket.emit("audioTrackUpdate", {
            enabled: false
          });
        }
      });
      call.on("close", () => {
        let leftUser = users[call.peer][1];
        calls = calls.filter(({ peer: peerId }) => peerId !== call.peer);
        attendeeContainer.remove();
        connectedUserVideoContainer.remove();
        users = Object.entries(users).filter(([leftUserId]) => leftUserId !== call.peer).reduce((data, user) => ({ ...data, ...{ [user[0]]: user[1] } }), {});
        notifications.filter((notification) => notification[0] === "userLeave").forEach((notification) => {
          if (notification[1].type === "beep") {
            require("electron").shell.beep();
          } else if (notification[1].type === "notification") {
            Notification.requestPermission().then((permission) => {
              if (permission === "denied") return;
              new Notification("User left", {
                icon: "/public/favicon.png",
                body: Object.entries({
                  socketId: leftUser[0],
                  userId: call.peer,
                  username: leftUser[1]
                }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
              });
            });
          } else if (notification[1].type === "custom") {
            let _ = {
              socketId: leftUser[0],
              userId: call.peer,
              username: leftUser[1]
            }
            try {
              eval(notification[1].code);
            } catch {}
          }
        });
        if (!document.getElementById("videoGridUpperHolder").children.length) document.getElementById("videoGrid").children[1].style.height = "75vh";
      });
      notifications.filter((notification) => notification[0] === "userJoin").forEach((notification) => {
        if (notification[1].type === "beep") {
          require("electron").shell.beep();
        } else if (notification[1].type === "notification") {
          Notification.requestPermission().then((permission) => {
            if (permission === "denied") return;
            new Notification("User joined", {
              icon: "/public/favicon.png",
              body: Object.entries({
                socketId,
                userId,
                username: joinedUsername
              }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
            });
          });
        } else if (notification[1].type === "custom") {
          let _ = {
            socketId,
            userId,
            username: joinedUsername
          }
          try {
            eval(notification[1].code);
          } catch {}
        }
      });
    }, 200);
  });
}).catch(() => {});

peer.on("open", (id) => {
  socket.emit("joinMeeting", { meetingId, userId: id, username, password });
  document.getElementById("chatMessages").children[1].dataset.userId = id;
  document.getElementById("chatUserSelect").children[1].value = "specific-" + id;
  document.getElementById("attendeeContent").children[0].dataset.userId = id;
  localVideoContainer.dataset.userId = id;
});

socket.on("users", ({ users: meetingUsers }) => {
  users = meetingUsers;
  socket.emit("userJoinConfirm");
});

socket.on("userLeave", ({ userId }) => {
  if (!calls.some(({ peer: peerId }) => peerId === userId)) return;
  calls.find(({ peer: peerId }) => peerId === userId).close();
});

socket.on("createMessage", ({ receiver, username, message, senderId }) => {
  if (((receiver === "all") ? document.getElementById("chatMessages").children[0] : Array.from(document.getElementById("chatMessages").children).find((chat) => chat.dataset.userId === senderId)).children[0].tagName === "H3") ((receiver === "all") ? document.getElementById("chatMessages").children[0] : Array.from(document.getElementById("chatMessages").children).find((chat) => chat.dataset.userId === senderId)).innerHTML = "";
  let messageContainer = document.createElement("p");
  let usernameText = document.createElement("span");
  usernameText.dataset.userId = senderId;
  usernameText.style.margin = "5px";
  usernameText.style.fontWeight = "bold";
  usernameText.innerText = username + ": ";
  let messageText = document.createElement("span");
  messageText.style.margin = "-2.5px";
  messageText.innerText = message;
  messageContainer.appendChild(usernameText);
  messageContainer.appendChild(messageText);
  ((receiver === "all") ? document.getElementById("chatMessages").children[0] : Array.from(document.getElementById("chatMessages").children).find((chat) => chat.dataset.userId === senderId)).appendChild(messageContainer);
  notifications.filter((notification) => notification[0] === "incomingMessage").forEach((notification) => {
    if (notification[1].type === "beep") {
      require("electron").shell.beep();
    } else if (notification[1].type === "notification") {
      Notification.requestPermission().then((permission) => {
        if (permission === "denied") return;
        new Notification("Incoming Message", {
          icon: "/public/favicon.png",
          body: Object.entries({
            receiver,
            username,
            message,
            senderId
          }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
        });
      });
    } else if (notification[1].type === "custom") {
      let _ = {
        receiver,
        username,
        message,
        senderId
      }
      try {
        eval(notification[1].code);
      } catch {}
    }
  });
});

if (navigator.mediaDevices?.enumerateDevices) {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.forEach(({ deviceId, kind, label }, index) => {
      let option = new Option();
      option.value = deviceId;
      option.innerText = label || ((kind === "videoinput") ? "Camera " : "Microphone ") + (index + 1).toString();
      document.getElementById((kind === "videoinput") ? "videoSource" : "audioSource").appendChild(option);
    });
  });
}

socket.on("saveRecordingInCloud", ({ recordingId }) => {
  window.open("/recordings/" + recordingId, "_blank", (isElectron) ? "title=Meetings,icon=assets/favicon.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
});


document.getElementById("chalkboard").style.display = "block";
document.getElementById("chalkboardCanvas").width = document.getElementById("chalkboardCanvas").offsetWidth;
document.getElementById("chalkboardCanvas").height = document.getElementById("chalkboardCanvas").offsetHeight;
document.getElementById("chalkboard").style.display = "none";

window.addEventListener("resize", () => {
  let bufferCanvas = document.createElement("canvas");
  bufferCanvas.getContext("2d").drawImage(document.getElementById("chalkboardCanvas"), 0, 0);
  document.getElementById("chalkboardCanvas").getContext("2d").drawImage(bufferCanvas, 0, 0);
  let chalkboardDisplayState = document.getElementById("chalkboard").style.display;
  document.getElementById("chalkboard").style.display = "block";
  document.getElementById("chalkboardCanvas").width = document.getElementById("chalkboardCanvas").offsetWidth;
  document.getElementById("chalkboardCanvas").height = document.getElementById("chalkboardCanvas").offsetHeight;
  document.getElementById("chalkboard").style.display = chalkboardDisplayState;
});

document.getElementById("chalkboardCanvas").addEventListener("mousedown", ({ clientX, clientY }) => {
  isPainting = true;
  document.getElementById("chalkboardCanvas").getContext("2d").beginPath();
  document.getElementById("chalkboardCanvas").getContext("2d").moveTo(clientX, clientY - getElementOffset(document.getElementById("chalkboardCanvas"), false));
});

document.getElementById("chalkboardCanvas").addEventListener("touchstart", ({ touches: [{ clientX, clientY }] }) => {
  isPainting = true;
  document.getElementById("chalkboardCanvas").getContext("2d").beginPath();
  document.getElementById("chalkboardCanvas").getContext("2d").moveTo(clientX, clientY - getElementOffset(document.getElementById("chalkboardCanvas"), false));
});

window.addEventListener("mouseup", () => {
  isPainting = false;
});

window.addEventListener("touchend", () => {
  isPainting = false;
});

document.getElementById("chalkboardCanvas").addEventListener("mousemove", ({ clientX, clientY }) => {
  if (!isPainting) return;
  let ctx = document.getElementById("chalkboardCanvas").getContext("2d");
  ctx.lineCap = "round";
  ctx.lineTo(clientX, clientY - getElementOffset(document.getElementById("chalkboardCanvas"), false));
  ctx.moveTo(clientX, clientY - getElementOffset(document.getElementById("chalkboardCanvas"), false));
  ctx.stroke();
});

document.getElementById("chalkboardCanvas").addEventListener("touchmove", ({ touches: [{ clientX, clientY }] }) => {
  if (!isPainting) return;
  let ctx = document.getElementById("chalkboardCanvas").getContext("2d");
  ctx.lineCap = "round";
  ctx.lineTo(clientX, clientY - getElementOffset(document.getElementById("chalkboardCanvas"), false));
  ctx.moveTo(clientX, clientY - getElementOffset(document.getElementById("chalkboardCanvas"), false));
  ctx.stroke();
});

document.getElementById("chalkboardCanvasColorInput").addEventListener("change", () => {
  document.getElementById("chalkboardCanvas").getContext("2d").strokeStyle = document.getElementById("chalkboardCanvasColorInput").value;
  document.getElementById("chalkboardCanvas").getContext("2d").fillStyle = document.getElementById("chalkboardCanvasColorInput").value;
});

document.getElementById("chalkboardCanvasLineWidth").addEventListener("change", () => {
  document.getElementById("chalkboardCanvas").getContext("2d").lineWidth = document.getElementById("chalkboardCanvasLineWidth").value;
});

document.getElementById("chatUserSelect").addEventListener("change", () => {
  Array.from(document.getElementById("chatMessages").children).forEach((chat) => {
    if (((document.getElementById("chatUserSelect").value.startsWith("all")) && (chat.dataset.type === "all")) || (chat.dataset.userId === (document.getElementById("chatUserSelect").value.split("-").filter((_, index) => index !== 0).join("-")))) {
      chat.style.display = "block";
    } else {
      chat.style.display = "none";
    }
  });
});

window.addEventListener("click", ({ target }) => {
  if (["popups", "appPopups"].includes(target?.parentElement?.id)) {
    target.style.display = "none";
  };
  if ([
    ...[
      document.getElementById("viewMoreButton"),
      document.getElementById("viewMoreButton").children[0],
      document.getElementById("viewMoreButtonContainer"),
      document.getElementById("viewMoreButtonContainer").children[0], 
      document.getElementById("viewMoreButtonContainer").children[1]
    ],
    ...Array.from(document.getElementById("viewMoreButtonContainer").getElementsByClassName("select"))
  ].includes(target)) return;
  document.getElementById("viewMoreButtonContainer").style.display = "none";
});

window.addEventListener("touchstart", ({ target }) => {
  if (["popups", "appPopups"].includes(target?.parentElement?.id)) {
    target.style.display = "none";
  };
  if ([
    ...[
      document.getElementById("viewMoreButton"),
      document.getElementById("viewMoreButton").children[0],
      document.getElementById("viewMoreButtonContainer"),
      document.getElementById("viewMoreButtonContainer").children[0], 
      document.getElementById("viewMoreButtonContainer").children[1]
    ],
    ...Array.from(document.getElementById("viewMoreButtonContainer").getElementsByClassName("select"))
  ].includes(target)) return;
  setTimeout(() => {
    document.getElementById("viewMoreButtonContainer").style.display = "none";
  }, 200);
});

socket.on("createSurvey", ({ surveyId, creator, question, options }) => {
  if (document.getElementById("surveyDisplay").children[0].tagName === "H3") document.getElementById("surveyDisplay").innerHTML = "";
  let surveyBox = document.createElement("div");
  surveyBox.style.display = "flex";
  surveyBox.style.flexDirection = "column";
  surveyBox.style.textAlign = "center";
  surveyBox.style.margin = (!document.getElementById("surveyDisplay").getElementsByTagName("div").length) ? "20px 0 10px" : "12.5px 0 10px";
  surveyBox.style.borderRadius = "5px";
  surveyBox.className = "surveySectionContainer";
  surveyBox.dataset.surveyId = surveyId;
  let usernameText = document.createElement("p");
  usernameText.dataset.userId = creator;
  usernameText.innerText = users[creator][1];
  let questionText = document.createElement("h2");
  questionText.innerText = question;
  questionText.style.margin = "-5px 15px 15px";
  surveyBox.appendChild(usernameText);
  surveyBox.appendChild(questionText);
  if (users[creator][0] === socket.id) {
    let table = document.createElement("table");
    table.style.margin = "0 15px 15px";
    table.innerHTML = `
    <tr>
      <th>Option</th>
      <th>Votes</th>
    </tr>
    `;
    (
      (
        Array.isArray(options)
      ) ? options : []
    ).forEach((answerOption) => {
      let row = document.createElement("tr");
      let option = document.createElement("td");
      option.innerText = answerOption;
      let votes = document.createElement("td");
      votes.innerText = "0";
      row.appendChild(option);
      row.appendChild(votes);
      table.appendChild(row);
      surveyBox.appendChild(table);
    });
  } else {
    let optionSelect = document.createElement("select");
    optionSelect.className = "surveySelect";
    optionSelect.innerHTML = "<option value='' selected disabled hidden>Choose here</option>";
    (
      (
        Array.isArray(options)
      ) ? options : []
    ).forEach((answerOption, index) => {
      let option = new Option();
      option.value = (index + 1).toString();
      option.innerText = answerOption;
      optionSelect.appendChild(option);
    });
    optionSelect.title = "Option";
    let submitButton = document.createElement("div");
    submitButton.style.width = "auto";
    submitButton.style.marginTop = "5px";
    submitButton.className = "surveyButton";
    submitButton.innerHTML = "<i class='fa fa-paper-plane'></i>";
    submitButton.title = "Submit";
    submitButton.addEventListener("click", () => {
      if (!optionSelect.value) return;
      socket.emit("answerSurvey", { surveyId, option: optionSelect.value });
      optionSelect.setAttribute("disabled", "");
      submitButton.remove();
    });
    surveyBox.appendChild(optionSelect);
    surveyBox.appendChild(submitButton);
    notifications.filter((notification) => notification[0] === "createSurvey").forEach((notification) => {
      if (notification[1].type === "beep") {
        require("electron").shell.beep();
      } else if (notification[1].type === "notification") {
        Notification.requestPermission().then((permission) => {
          if (permission === "denied") return;
          new Notification("Created survey", {
            icon: "/public/favicon.png",
            body: Object.entries({
              surveyId,
              creator,
              username: users[creator][1],
              question,
              options: options,
              optionString: options.join(", ")
            }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
          });
        });
      } else if (notification[1].type === "custom") {
        let _ = {
          surveyId,
          creator,
          username: users[creator][1],
          question,
          options: options,
          optionString: options.join(", ")
        }
        try {
          eval(notification[1].code);
        } catch {}
      }
    });
  }
  document.getElementById("surveyDisplay").appendChild(surveyBox);
});

socket.on("answerSurvey", ({ surveyId, option }) => {
  if ((Number(option) < 1) || (Number(option) >= Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[2].children.length)) return;
  Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[2].children[Number(option)].children[1].innerText = (Number(Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[2].children[Number(option)].children[1].innerText) + 1).toString();
  notifications.filter((notification) => notification[0] === "answerSurvey").forEach((notification) => {
    if (notification[1].type === "beep") {
      require("electron").shell.beep();
    } else if (notification[1].type === "notification") {
      Notification.requestPermission().then((permission) => {
        if (permission === "denied") return;
        new Notification("Answered survey", {
          icon: "/public/favicon.png",
          body: Object.entries({
            surveyId,
            question: Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[1].innerText,
            optionId: option,
            option: Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[2].children[Number(option)].children[0].innerText
          }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
        });
      });
    } else if (notification[1].type === "custom") {
      let _ = {
        surveyId,
        question: Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[1].innerText,
        optionId: option,
        option: Array.from(document.getElementById("surveyDisplay").children).find(({ dataset }) => dataset.surveyId === surveyId).children[2].children[Number(option)].children[0].innerText
      }
      try {
        eval(notification[1].code);
      } catch {}
    }
  });
});

socket.on("addTranscript", ({ userId, language: textLanguage, text }) => {
  if (document.getElementById("transcriptContentContainer").children[0].tagName === "H3") document.getElementById("transcriptContentContainer").innerHTML = "";
  let transcriptContainer = document.createElement("div");
  transcriptContainer.dataset.userId = userId;
  transcriptContainer.style.margin = (!document.getElementById("transcriptContentContainer").children.length) ? "15px 0 5px" : "0 0 5px";
  let transcriptTextContainer = document.createElement("p");
  let transcriptUsername = document.createElement("span");
  transcriptUsername.innerText = users[userId][1] + ": ";
  transcriptUsername.style.fontWeight = "bold";
  let transcriptText = document.createElement("span");
  transcriptText.innerText = text;
  let transcriptTranslateContainer = document.createElement("div");
  transcriptTranslateContainer.className = "transcriptContentTranslateContainer";
  transcriptTranslateContainer.style.display = "none";
  let transcriptTranslateSelect = document.createElement("select");
  transcriptTranslateSelect.className = "transcriptContentTranslateSelect";
  languages.forEach(([language, languageCode]) => {
    let transcriptTranslateSelectOption = document.createElement("option");
    transcriptTranslateSelectOption.value = languageCode;
    transcriptTranslateSelectOption.innerText = language;
    transcriptTranslateSelect.appendChild(transcriptTranslateSelectOption);
  });
  transcriptTranslateSelect.value = textLanguage;
  let transcriptTranslateButton = document.createElement("button");
  transcriptTranslateButton.className = "transcriptContentTranslateButton";
  transcriptTranslateButton.innerText = "Translate";
  transcriptTranslateButton.addEventListener("click", () => {
    if (transcriptTranslateButton.innerText === "Translate") {
      fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + textLanguage + "&tl=" + transcriptTranslateSelect.value + "&dt=t&q=" + text)
      .then((res) => res.json())
      .then(([[[translatedText]]]) => {
        transcriptText.innerText = translatedText;
        transcriptTranslateSelect.style.display = "none";
        transcriptTranslateButton.style.marginLeft = "7.5px";
        transcriptTranslateButton.innerText = "Untranslate";
      });
    } else {
      transcriptText.innerText = text;
      transcriptTranslateSelect.value = textLanguage;
      transcriptTranslateSelect.style.display = "flex";
      transcriptTranslateButton.style.marginLeft = "-5px 15px 15px";
      transcriptTranslateButton.innerText = "Translate";
    }
  });
  transcriptTextContainer.addEventListener("dblclick", () => {
    transcriptTranslateContainer.style.display = (transcriptTranslateContainer.style.display === "flex") ? "none" : "flex";
  });
  transcriptTextContainer.appendChild(transcriptUsername);
  transcriptTextContainer.appendChild(transcriptText);
  transcriptTranslateContainer.appendChild(transcriptTranslateSelect);
  transcriptTranslateContainer.appendChild(transcriptTranslateButton);
  transcriptContainer.appendChild(transcriptTextContainer);
  transcriptContainer.appendChild(transcriptTranslateContainer);
  document.getElementById("transcriptContentContainer").appendChild(transcriptContainer);
});

socket.on("saveTranscriptInCloud", ({ transcriptId }) => {
  window.open("/transcripts/" + transcriptId, "_blank", (isElectron) ? "title=Meetings,icon=assets/favicon.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
});

window.addEventListener("keydown", ({ repeat, key }) => {
  if (repeat) return;
  if (!key) return;
  pressedKeys = Array.from(new Set([
    ...pressedKeys,
    ...[
      key[0].toUpperCase() + key.slice(1)
    ]
  ]));
  keyboardShortcuts.forEach(([keyboardShortcutKeys, keyboardShortcutFunction]) => {
    if (keyboardShortcutKeys.reduce((lastKeyPressed, keyboardShortcutKey) => lastKeyPressed && pressedKeys.includes(keyboardShortcutKey), true)) {
      try {
        eval(keyboardShortcutFunction);
      } catch {}
    }
  });
});

window.addEventListener("keyup", ({ key }) => {
  if (!key) return;
  pressedKeys = pressedKeys.filter((pressedKey) => pressedKey !== (key[0].toUpperCase() + key.slice(1)));
});

if (host) {
  Array.from(document.getElementById("settingsContent").children[0].children).forEach((child, index) => {
    child.children[1].children[0].children[0].addEventListener("click", () => {
      if (index === 4) {
        socket.emit("lockMeeting");
      } else {
        if (index === 1) child.children[1].children[0].style.margin = (child.children[1].children[0].children[0].checked) ? "10px 15px 0" : "2.5px 15px 5px";
        child.children[1].children[1].style.display = (child.children[1].children[0].children[0].checked) ? "flex" : "none";
        child.children[1].children[1].addEventListener("change", () => {
          if (index === 1) {
            let fileReader = new FileReader();
            fileReader.addEventListener("load", () => {
              socket.emit("changeIcon", { icon: { type: child.children[1].children[1].files[0].type, url: fileReader.result } });
            });
            fileReader.readAsDataURL(child.children[1].children[1].files[0]);
          } else {
            socket.emit("change" + ["Password", null, "Title", "Text"][index], { [["password", null, "title", "text"][index]]: child.children[1].children[1].value });
          }
        });
        if (child.children[1].children[1].style.display === "flex") {
          child.children[1].children[1].value = "";
        } else {
          socket.emit("remove" + ["Password", "Icon", "Title", "Text"][index]);
        }
      }
    });
  });
};

socket.on("changeIcon", ({ type, url }) => {
  document.getElementById("favicon").type = type;
  document.getElementById("favicon").href = url;
  document.getElementById("logo").href = url;
});

socket.on("changeTitle", ({ title }) => {
  document.title = title;
});

socket.on("removeIcon", () => {
  document.getElementById("favicon").type = "image/png";
  document.getElementById("favicon").href = "/public/favicon.png";
  document.getElementById("logo").href = "/public/logo.png";
});

socket.on("removeTitle", () => {
  document.title = "Zoom Clone";
});

socket.on("createReaction", ({ userId, emoji }) => {
  if (Array.from(document.getElementById("videoGrid").children).some(({ dataset }) => dataset.userId === userId)) {
    let reaction = document.createElement("span");
    reaction.style.fontSize = "50px";
    reaction.style.position = "fixed";
    reaction.innerText = emoji;
    if (Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).children[0].tagName !== "VIDEO") {
      clearTimeout(reactionTimeout);
      Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).replaceChild(reaction, Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).children[0]);
    } else {
      Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).insertBefore(reaction, Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).getElementsByTagName("video")[0]);
    }
    reactionTimeout = setTimeout(() => {
      if (Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).children[0].tagName !== "VIDEO") {
        Array.from(document.getElementById("videoGrid").children).find(({ dataset }) => dataset.userId === userId).children[0].remove();
      }
    }, 5000);
  }
});

Array.from(document.getElementById("appContent").children[0].children).forEach((appContainer) => {
  appContainer.children[1].addEventListener("click", () => {
    if (!window.confirm('Are you sure about installing this app? This could cause some unexpected errors.')) return;
    socket.emit('installApp', {
      appId: appContainer.dataset.appId
    });
  });
});

socket.on("installApp", ({ appId, appName, appDescription, iconType, popupExists }) => {
  let appPopup = document.createElement("div");
  appPopup.style.display = "none";
  appPopup.className = "popupBackgroundScreen";
  appPopup.dataset.appId = appId;
  let appPopupContent = document.createElement("div");
  appPopupContent.style.padding = "0";
  appPopupContent.className = "popupContainer";
  let appPopupContentHolder = document.createElement("div");
  appPopupContentHolder.style.display = "flex";
  appPopupContentHolder.style.flexDirection = "column";
  let appPopupContentEmbed = document.createElement("iframe");
  appPopupContentEmbed.src = (popupExists) ? "/apps/" + appId + "/popup.html" : "about:blank";
  appPopupContentEmbed.style.maxHeight = "80vh";
  appPopupContentEmbed.style.height = "80vh";
  appPopupContentEmbed.style.resize = "vertical";
  appPopupContentEmbed.style.border = "none";
  let appButton = document.createElement("div");
  appButton.className = "optionButton";
  appButton.style.margin = "0px 2.5px 5px";
  appButton.title = appName;
  appButton.addEventListener("click", () => {
    appPopup.style.display = "block";
  });
  let appButtonIcon = new Image();
  appButtonIcon.style.width = "22.5px";
  appButtonIcon.src = "/apps/" + appId + "/icon." + iconType;
  appButtonIcon.addEventListener("error", () => {
    appButtonIcon.remove();
  });
  appPopupContentHolder.appendChild(appPopupContentEmbed);
  appPopupContent.appendChild(appPopupContentHolder);
  appPopup.appendChild(appPopupContent);
  appButton.appendChild(appButtonIcon);
  document.getElementById("appPopups").appendChild(appPopup);
  document.getElementById("appButtons").appendChild(appButton);
  try {
    import("/apps/" + appId + "/script.js").then(({ default: appScript }) => {
      if (typeof appScript !== "function") return;
      appScript({
        appId,
        appName,
        appDescription,
        appButton,
        appButtonIcon,
        appPopup,
        appWindow: appPopupContentEmbed.contentWindow,
        iconType
      });
    }).catch(() => {});
  } catch {}
});

document.getElementById("surveyDisplayButton").addEventListener("click", () => {
  document.getElementById("surveyEditor").style.display = "none";
  document.getElementById("surveyDisplay").style.display = "block";
});

document.getElementById("surveyEditorButton").addEventListener("click", () => {
  document.getElementById("surveyDisplay").style.display = "none";
  document.getElementById("surveyEditor").style.display = "block";
  document.getElementById("surveyEditorOptions").innerHTML = "<h3>No options given</h3>";
});

document.getElementById("addSurveyOptionButton").addEventListener("click", () => {
  if (!document.getElementById("surveyEditorOptions").getElementsByTagName("div").length) document.getElementById("surveyEditorOptions").innerHTML = "";
  let optionContainer = document.createElement("div");
  optionContainer.style.display = "flex";
  optionContainer.style.flexDirection = "row";
  let optionInput = document.createElement("input");
  optionInput.style.margin = (!document.getElementById("surveyEditorOptions").getElementsByTagName("div").length) ? "15px 0 5px" : "2.5px 0 5px";
  optionInput.className = "surveyInput";
  optionInput.placeholder = "Option";
  let removeOptionButton = document.createElement("div");
  removeOptionButton.style.height = "18.5px";
  removeOptionButton.style.marginTop = (!document.getElementById("surveyEditorOptions").getElementsByTagName("div").length) ? "15px" : "2.5px";
  removeOptionButton.style.marginLeft = "5px";
  removeOptionButton.style.backgroundColor = "#007BFF";
  removeOptionButton.className = "optionButton";
  removeOptionButton.addEventListener("click", () => {
    optionContainer.remove();
    if (!document.getElementById("surveyEditorOptions").children.length) {
      document.getElementById("surveyEditorOptions").innerHTML = "<h3>No options given</h3>";
    } else {
      document.getElementById("surveyEditorOptions").children[0].children[0].style.margin = "15px 0 5px";
      document.getElementById("surveyEditorOptions").children[0].children[1].style.marginTop = "15px";
    };
  });
  let removeOptionButtonIcon = document.createElement("i");
  removeOptionButtonIcon.className = "fa fa-trash";
  removeOptionButtonIcon.ariaHidden = true;
  removeOptionButton.appendChild(removeOptionButtonIcon);
  optionContainer.appendChild(optionInput);
  optionContainer.appendChild(removeOptionButton);
  document.getElementById("surveyEditorOptions").appendChild(optionContainer);
});

document.getElementById("createSurveyButton").addEventListener("click", () => {
  if (!document.getElementById("surveyEditorQuestionInput").value || Array.from(document.getElementById("surveyEditorOptions").children).filter((option) => option.tagName === "DIV").some((option) => !option.children[0].value)) return;
  socket.emit("createSurvey", {
    question: document.getElementById("surveyEditorQuestionInput").value,
    options: Array.from(document.getElementById("surveyEditorOptions").children).filter((option) => option.tagName === "DIV").map((option) => option.children[0].value)
  });
  document.getElementById("surveyEditorQuestionInput").value = "";
  document.getElementById("surveyEditorOptions").innerHTML = "<h3>No options given</h3>";
});

socket.on("videoTrackUpdate", ({ userId, enabled }) => {
  Array.from(document.getElementById("attendeeContent").children).find(({ dataset }) => dataset.userId === userId).children[1].children[0].className = (enabled) ? "fa fa-video-camera" : "fa fa-video-slash";
  notifications.filter((notification) => notification[0] === "stopVideo").forEach((notification) => {
    if (notification[1].type === "beep") {
      require("electron").shell.beep();
    } else if (notification[1].type === "notification") {
      Notification.requestPermission().then((permission) => {
        if (permission === "denied") return;
        new Notification(((enabled) ? "Started" : "Stopped") + " Video", {
          icon: "/public/favicon.png",
          body: Object.entries({
            userId,
            username: users[userId][1],
            enabled,
            enabledWord: (enabled) ? "started" : "stopped"
          }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
        });
      });
    } else if (notification[1].type === "custom") {
      let _ = {
        userId,
        username: users[userId][1],
        enabled,
        enabledWord: (enabled) ? "started" : "stopped"
      }
      try {
        eval(notification[1].code);
      } catch {}
    }
  });
});

socket.on("audioTrackUpdate", ({ userId, enabled }) => {
  Array.from(document.getElementById("attendeeContent").children).find(({ dataset }) => dataset.userId === userId).children[2].children[0].className = (enabled) ? "fa fa-microphone" : "fa fa-microphone-slash";
  notifications.filter((notification) => notification[0] === "muteVideo").forEach((notification) => {
    if (notification[1].type === "beep") {
      require("electron").shell.beep();
    } else if (notification[1].type === "notification") {
      Notification.requestPermission().then((permission) => {
        if (permission === "denied") return;
        new Notification(((enabled) ? "Unmuted" : "Muted") + " Audio", {
          icon: "/public/favicon.png",
          body: Object.entries({
            userId,
            username: users[userId][1],
            enabled,
            enabledWord: (enabled) ? "Unmuted" : "Muted"
          }).reduce((data, [variable, variableValue]) => data.replace("{" + variable + "}", variableValue), notification[1].notification || "")
        });
      });
    } else if (notification[1].type === "custom") {
      let _ = {
        userId,
        username: users[userId][1],
        enabled,
        enabledWord: (enabled) ? "Unmuted" : "Muted"
      }
      try {
        eval(notification[1].code);
      } catch {}
    }
  });
});

socket.on("stopVideo", () => {
  if (!localVideoStream) return;
  localVideoStream.getVideoTracks()[0].enabled = false;
  document.getElementById("stopVideoButton").children[0].className = "fa fa-video-slash";
  document.getElementById("attendeeContent").children[0].children[1].children[0].className = "fa fa-video-slash";
});

socket.on("muteAudio", () => {
  if (!localVideoStream) return;
  localVideoStream.getAudioTracks()[0].enabled = false;
  document.getElementById("muteAudioButton").children[0].className = "fa fa-microphone-slash";
  document.getElementById("attendeeContent").children[0].children[2].children[0].className = "fa fa-microphone-slash";
});

document.getElementById("chatMessageInput").addEventListener("keydown", ({ repeat, key }) => {
  if (repeat) return;
  if (key !== "Enter") return;
  sendMessage();
});

document.getElementById("transcriptLanguageSelect").addEventListener("change", () => {
  if (!speechRecognition) return;
  speechRecognition.lang = document.getElementById("transcriptLanguageSelect").value;
});

if (Array.from(document.getElementById("transcriptLanguageSelect").children).some((option) => option.value === ((Object.keys(singleLanguageCodes).includes(navigator.language)) ? singleLanguageCodes[navigator.language] : navigator.language))) Array.from(document.getElementById("transcriptLanguageSelect").children).find((option) => option.value === ((Object.keys(singleLanguageCodes).includes(navigator.language)) ? singleLanguageCodes[navigator.language] : navigator.language)).selected = true;

document.getElementById("backgroundImageTypeSelect").addEventListener("change", () => {
  if (document.getElementById("backgroundImageTypeSelect").value === "blur") {
    document.getElementById("backgroundImageMethodSelect").style.display = "none";
    document.getElementById("backgroundImageInput").style.display = "none";
  } else if (document.getElementById("backgroundImageTypeSelect").value === "none") {
    document.getElementById("backgroundImageInput").style.display = "none";
    document.getElementById("backgroundImageMethodSelect").style.display = /*"flex"*/"none";
    document.getElementById("backgroundImageMethodSelect").value = "firstMethod";
  } else if (document.getElementById("backgroundImageTypeSelect").value === "virtual") {
    document.getElementById("backgroundImageMethodSelect").style.display = /*"flex"*/"none";
    document.getElementById("backgroundImageInput").style.display = "flex";
    document.getElementById("backgroundImageInput").value = "";
  }
});

socket.on("renameUser", ({ userId, username: renamedUsername }) => {
  if (userId === peer.id) {
    username = renamedUsername;
    window.history.pushState({}, null, "/meeting/" + meetingId + "?username=" + renamedUsername);
  }
  users[userId][1] = renamedUsername;
  Array.from(document.getElementById("chatUserSelect").children).find((option) => option.value === "specific-" + userId).innerText = renamedUsername + ((userId === peer.id) ? " (me)" : "");
  Array.from(document.getElementById("chatMessages").children).forEach((chatContainer) => {
    Array.from(chatContainer.children).filter((chatMessageUser) => (chatMessageUser.tagName === "H4") && (chatMessageUser.dataset.userId === userId)).forEach((chatMessageUser) => {
      chatMessageUser.innerText = renamedUsername + ((userId === peer.id) ? " (me)" : "");
    });
  });
  Array.from(document.getElementById("surveyDisplay").children).filter((surveyBox) => (surveyBox.tagName === "DIV") && (surveyBox.children[0].dataset.userId === userId)).forEach((surveyBox) => {
    surveyBox.children[0].innerText = renamedUsername;
  });
  Array.from(document.getElementById("attendeeContent").children).find((attendeeContainer) => attendeeContainer.dataset.userId === userId).children[0][(Array.from(document.getElementById("attendeeContent").children).find((attendeeContainer) => attendeeContainer.dataset.userId === userId).children[0].tagName === "INPUT") ? "value" : "innerText"] = renamedUsername;
  Array.from(document.getElementById("transcriptContentContainer").children).filter((transcriptText) => transcriptText.dataset.userId === userId).forEach((transcriptText) => {
    transcriptText.children[0].innerText = renamedUsername + ": ";
  });
});

document.getElementById("attendeeContent").children[0].children[0].addEventListener("change", () => {
  socket.emit("renameUser", {
    userId: peer.id,
    username: document.getElementById("attendeeContent").children[0].children[0].value
  });
});

document.getElementById("viewMoreButton").addEventListener("click", () => {
  document.getElementById("viewMoreButtonContainer").style.display = (document.getElementById("viewMoreButtonContainer").style.display === "flex") ? "none" : "flex";
});

emojiPicker = picmo.createPicker({
  rootElement: document.getElementById("reactionContent")
});

emojiPicker.addEventListener("emoji:select", ({ emoji }) => {
  socket.emit("createReaction", { emoji });
  document.getElementById("reactions").style.display = "none";
});

/*socket.on("changeDegrace", ({ userId, rotate }) => {
  Array.from(document.getElementById("videoGrid").children).find((videoContainer) => videoContainer.dataset.userId === userId).getElementsByTagName("video")[0].style.setProperty("--degrace", (rotate) ? "180deg" : "0deg");
});*/

if (window.SpeechRecognition || window.webkitSpeechRecognition) {
  speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  speechRecognition.addEventListener("result", ({ results }) => {
    socket.emit("addTranscript", {
      language: document.getElementById("transcriptLanguageSelect").value,
      text: Array.from(results).map((result) => result[0].transcript).join("")
    });
  });
  speechRecognition.addEventListener("end", () => {
    speechRecognition.start();
  });
  speechRecognition.start();
}

if (isElectron) {
  window.addEventListener("offline", () => {
    require("electron").ipcRenderer.send("noInternetConnection");
  });
  setInterval(() => {
    let startTotalCPUUsage = require("os").cpus().reduce(({ user, nice, sys, idle, irq }, cpu) => ({
      user: user + cpu.times.user,
      nice: nice + cpu.times.nice,
      sys: sys + cpu.times.sys,
      irq: irq + cpu.times.irq,
      idle: idle + cpu.times.idle
    }), {
      user: 0,
      nice: 0,
      sys: 0,
      irq: 0,
      idle: 0
    });
    setTimeout(() => {
      let endTotalCPUUsage = require("os").cpus().reduce(({ user, nice, sys, idle, irq }, cpu) => ({
        user: user + cpu.times.user,
        nice: nice + cpu.times.nice,
        sys: sys + cpu.times.sys,
        irq: irq + cpu.times.irq,
        idle: idle + cpu.times.idle
      }), {
        user: 0,
        nice: 0,
        sys: 0,
        irq: 0,
        idle: 0
      });
      document.getElementById("cpuUsage").children[1].innerText = (
        (
          1 - (
            (
              endTotalCPUUsage.idle - startTotalCPUUsage.idle
            ) / (
              Object.values(endTotalCPUUsage).reduce((total, usage) => total + usage, 0) - Object.values(startTotalCPUUsage).reduce((total, usage) => total + usage, 0)
            )
          )
        ) * 100
      ).toFixed(2) + "%";
      document.getElementById("memoryUsage").children[1].innerText = (
        (
          require("os").freemem() / require("os").totalmem()
        ) * 100
      ).toFixed(2) + "%";
      document.getElementById("totalMemoryUsage").children[1].innerText = (
        (
          require("os").totalmem() / (
            1024 * 1024
          )
        ) / 1024
      ).toFixed(2) + "GB";
    }, 1000);
  }, 500);
  require("electron").ipcRenderer.on("shareScreen", (event, mediaSourceId) => {
    navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: mediaSourceId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720
        }
      },
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      }
    }).then((stream) => {
      document.getElementById("chalkboard").style.display = "none";
      sharingScreen = true;
      stream.getVideoTracks()[0].enabled = (document.getElementById("stopVideoButton").children[0].className === "fa fa-video-camera");
      if (stream.getAudioTracks().length > 0) stream.getAudioTracks()[0].enabled = (document.getElementById("muteAudioButton").children[0].className === "fa fa-microphone");
      localVideoStream = stream;
      /*localVideo.style.setProperty("--degrace", "0deg");
      socket.emit("changeDegrace", {
        rotate: false
      });*/
      addVideoStream(localVideo, localVideoContainer, stream);
      calls.forEach((call) => {
        if (stream.getAudioTracks().length > 0) call.peerConnection.getSenders()[0].replaceTrack(stream.getAudioTracks()[0]);
        call.peerConnection.getSenders()[1].replaceTrack(stream.getVideoTracks()[0]);
      });
      stream.getVideoTracks()[0].addEventListener("ended", openVideo);
    }).catch(() => {});
  });
  require("electron").ipcRenderer.on("recordMeeting", (event, mediaSourceId) => {
    navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: mediaSourceId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720
        }
      },
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      }
    }).then((stream) => {
      recordingMeeting = true;
      document.getElementById("recordMeetingButton").children[0].className = "fa fa-stop-circle";
      let videoBuffer = document.createElement("video");
      videoBuffer.srcObject = stream;
      recordedChunks = [];
      recorder = new MediaRecorder(stream);
      recorder.addEventListener("dataavailable", ({ data }) => {
        if (data.size > 0) {
          recordedChunks.push(data);
        }
      });
      recorder.addEventListener("stop", () => {
        openRecording();
        recordingMeeting = false;
        document.getElementById("recordMeetingButton").children[0].className = "fa fa-record-vinyl";
      });
      recorder.start();
    }).catch(() => {});
  });
}

if (("mediaSession" in navigator) && navigator.mediaSession.setActionHandler) {
  if (navigator.mediaSession.setCameraActive) {
    navigator.mediaSession.setCameraActive(true);
    navigator.mediaSession.setActionHandler("togglecamera", stopVideo);
  }
  if (navigator.mediaSession.setMicrophoneActive) {
    navigator.mediaSession.setMicrophoneActive(true);
    navigator.mediaSession.setActionHandler("togglemicrophone", muteAudio);
  }
}

socket.on("disconnect", () => {
  let link = document.createElement("a");
  link.href = "/";
  link.click();
});

if (!["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(navigator.platform) && !navigator.userAgent.includes("Mac") && !("ontouchend" in document)) {
  let serviceWorkerRegistration = document.createElement("script");
  serviceWorkerRegistration.setAttribute("defer", "");
  serviceWorkerRegistration.setAttribute("src", "/pages/serviceWorker.js");
  document.head.appendChild(serviceWorkerRegistration);
};