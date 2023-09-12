function addVideoStream(video, videoContainer, stream, videoContainerHolder) {
  if (videoContainerHolder === document.getElementById("videoGridUpperHolder")) video.style.height = "calc(100vh - 650px)";
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoContainer.prepend(video);
    (videoContainerHolder || video.parentElement).appendChild(videoContainer);
  });
}

function splitWords(string, characterCount) {
  return string.split(" ").reduce(([index, words], word) => [
    index + word.length + 1,
    (
      (
        index + word.length
      ) <= characterCount
    ) ? [
      ...words,
      ...[
        word
      ]
    ] : words
  ],
    [
      0,
      []
    ])[1].join(" ");
}

function getElementOffset(offsetElement, horizontal) {
  return (offsetElement) ? getElementOffset(offsetElement.offsetParent, horizontal) + ((horizontal) ? offsetElement.offsetLeft : offsetElement.offsetTop) : 0;
}

function leaveMeeting() {
  socket.disconnect();
}

function stopVideo() {
  if (!localVideoStream) return;
  localVideoStream.getVideoTracks()[0].enabled = !localVideoStream.getVideoTracks()[0].enabled;
  document.getElementById("stopVideoButton").children[0].className = (localVideoStream.getVideoTracks()[0].enabled) ? "fa fa-video-camera" : "fa fa-video-slash";
  document.getElementById("attendeeContent").children[0].children[1].children[0].className = (localVideoStream.getVideoTracks()[0].enabled) ? "fa fa-video-camera" : "fa fa-video-slash";
  socket.emit("videoTrackUpdate", {
    enabled: localVideoStream.getVideoTracks()[0].enabled
  });
  if (("mediaSession" in navigator) && navigator.mediaSession.setCameraActive) {
    navigator.mediaSession.setCameraActive(localVideoStream.getVideoTracks()[0].enabled);
  }
}

function muteAudio() {
  if (!localVideoStream) return;
  if (localVideoStream.getAudioTracks().length < 1) return;
  localVideoStream.getAudioTracks()[0].enabled = !localVideoStream.getAudioTracks()[0].enabled;
  document.getElementById("muteAudioButton").children[0].className = (localVideoStream.getAudioTracks()[0].enabled) ? "fa fa-microphone" : "fa fa-microphone-slash";
  document.getElementById("attendeeContent").children[0].children[2].children[0].className = (localVideoStream.getAudioTracks()[0].enabled) ? "fa fa-microphone" : "fa fa-microphone-slash";
  socket.emit("audioTrackUpdate", {
    enabled: localVideoStream.getAudioTracks()[0].enabled
  });
  if (("mediaSession" in navigator) && navigator.mediaSession.setMicrophoneActive) {
    navigator.mediaSession.setMicrophoneActive(localVideoStream.getAudioTracks()[0].enabled);
  }
}

function openVideo() {
  navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: document.getElementById("videoSource").value
    },
    audio: {
      deviceId: document.getElementById("audioSource").value
    }
  }).then((stream) => {
    document.getElementById("chalkboard").style.display = "none";
    sharingScreen = false;
    stream.getVideoTracks()[0].enabled = (document.getElementById("stopVideoButton").children[0].className === "fa fa-video-camera");
    if (stream.getAudioTracks().length > 0) stream.getAudioTracks()[0].enabled = (document.getElementById("muteAudioButton").children[0].className === "fa fa-microphone");
    if (!backgroundScreen) {
      localVideoStream = stream;
    } else {
      displayBackgroundScreen(stream);
    }
    /*localVideo.style.setProperty("--degrace", "180deg");
    socket.emit("changeDegrace", {
      rotate: true
    });*/
    addVideoStream(localVideo, localVideoContainer, localVideoStream);
    calls.forEach((call) => {
      if (localVideoStream.getAudioTracks().length > 0) call.peerConnection.getSenders()[0].replaceTrack(localVideoStream.getAudioTracks()[0]);
      call.peerConnection.getSenders()[1].replaceTrack(localVideoStream.getVideoTracks()[0]);
    });
  }).catch(() => {});
}

function shareScreen() {
  if (!sharingScreen) {
    if (isElectron) {
      require("electron").ipcRenderer.send("shareScreen");
    } else {
      navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          deviceId: document.getElementById("audioSource").value
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
    }
  } else {
    localVideoStream.getVideoTracks()[0].stop();
    openVideo();
  }
}

function recordMeeting() {
  if (!recordingMeeting) {
    if (isElectron) {
      require("electron").ipcRenderer.send("recordMeeting");
    } else {
      navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          deviceId: document.getElementById("audioSource").value
        },
        preferCurrentTab: true
      }).then((stream) => {
        recordingMeeting = true;
        document.getElementById("recordMeetingButton").children[0].className = "fa fa-stop-circle";
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
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          if (recorder.state === "inactive") return;
          recorder.stop();
          openRecording();
          recordingMeeting = false;
          document.getElementById("recordMeetingButton").children[0].className = "fa fa-record-vinyl";
        });
        recorder.start();
      }).catch(() => {});
    }
  } else {
    recorder.stop();
  }
}

function openChalkboard() {
  if (document.getElementById("chalkboard").style.display === "none") {
    document.getElementById("chalkboard").style.display = "block";
    document.getElementById("chalkboardCanvasColorInput").value = "#000000";
    document.getElementById("chalkboardCanvasLineWidth").value = "5";
    document.getElementById("chalkboardCanvas").getContext("2d").lineWidth = 5;
    document.getElementById("chalkboardCanvas").getContext("2d").fillStyle = "#ffffff";
    document.getElementById("chalkboardCanvas").getContext("2d").fillRect(0, 0, document.getElementById("chalkboardCanvas").width, document.getElementById("chalkboardCanvas").height);
    document.getElementById("chalkboardCanvas").getContext("2d").strokeStyle = "#000000";
    document.getElementById("chalkboardCanvas").getContext("2d").fillStyle = "#000000";
    let stream = document.getElementById("chalkboardCanvas").captureStream();
    sharingScreen = false;
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
  } else {
    document.getElementById("chalkboard").style.display = "none";
    openVideo();
  }
}

function useBackgroundImage() {
  if (document.getElementById("backgroundImageSlider").checked) {
    if (document.getElementById("backgroundImageTypeSelect").value !== "virtual") {
      backgroundScreen = {
        ...{
          effect: document.getElementById("backgroundImageTypeSelect").value
        },
        ...(document.getElementById("backgroundImageTypeSelect").value !== "blur") ? {
          method: (document.getElementById("backgroundImageMethodSelect").value === "firstMethod") ? 1 : 2
        } : {}
      }
    } else {
      let fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
        backgroundScreen = {
          effect: document.getElementById("backgroundImageTypeSelect").value,
          method: (document.getElementById("backgroundImageMethodSelect").value === "firstMethod") ? 1 : 2,
          image: fileReader.result
        }
      });
      fileReader.readAsDataURL(document.getElementById("backgroundImageInput").files[0]);
    }
  } else {
    backgroundScreen = false;
    clearInterval(backgroundScreenInterval);
  }
  document.getElementById("backgroundImage").style.display = "none";
  openVideo();
}

function sendMessage() {
  if (document.getElementById("chatMessageInput").value.length > 0) {
    socket.emit("sendMessage", { receiver: (document.getElementById("chatUserSelect").value.startsWith("specific")) ? document.getElementById("chatUserSelect").value.split("-").filter((_, index) => index !== 0).join("-") : false, message: document.getElementById("chatMessageInput").value });
    if (((document.getElementById("chatUserSelect").value.startsWith("specific")) ? Array.from(document.getElementById("chatMessages").children).find((chat) => chat.dataset.userId === document.getElementById("chatUserSelect").value.split("-").filter((_, index) => index !== 0).join("-")) : document.getElementById("chatMessages").children[0]).children[0].tagName === "H3") ((document.getElementById("chatUserSelect").value.startsWith("specific")) ? Array.from(document.getElementById("chatMessages").children).find((chat) => chat.dataset.userId === document.getElementById("chatUserSelect").value.split("-").filter((_, index) => index !== 0).join("-")) : document.getElementById("chatMessages").children[0]).innerHTML = "";
    let messageContainer = document.createElement("p");
    let usernameText = document.createElement("span");
    usernameText.dataset.userId = peer.id;
    usernameText.style.margin = "5px";
    usernameText.style.fontWeight = "bold";
    usernameText.innerText = username + " (me): ";
    let messageText = document.createElement("span");
    messageText.style.margin = "-2.5px";
    messageText.innerText = document.getElementById("chatMessageInput").value;
    messageContainer.appendChild(usernameText);
    messageContainer.appendChild(messageText);
    ((document.getElementById("chatUserSelect").value.startsWith("specific")) ? Array.from(document.getElementById("chatMessages").children).find((chat) => chat.dataset.userId === document.getElementById("chatUserSelect").value.split("-").filter((_, index) => index !== 0).join("-")) : document.getElementById("chatMessages").children[0]).appendChild(messageContainer);
    document.getElementById("chatMessageInput").value = "";
  }
}

function openLandingPage() {
  window.open(protocol + "://" + url + "/landingPage/" + meetingId, "_blank", (isElectron) ? "width:800,height:600,title=Meetings,icon=assets/favicon.png,nodeIntegration=yes,contextIsolation=no" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
}

function openStandardEmail() {
  if (isElectron) {
    require('electron').shell.openExternal("mailto:?to=&subject=Zoom%20Meeting&body=Join%20this%20zoom%20meeting:%0D%0A" + protocol + "://" + url + "/landingPage/" + meetingId + "%0D%0A%0D%0AMeeting%20id:%0D%0A" + meetingId + ((host && document.getElementById("settingsContent").children[0].children[1].children[0].checked && document.getElementById("settingsContent").children[0].children[2].value) ? ("%0D%0A%0D%0APassword:%0D%0A" + document.getElementById("settingsContent").children[0].children[2].value) : ""));
  } else {
    window.open("mailto:?to=&subject=Zoom%20Meeting&body=Join%20this%20zoom%20meeting:%0D%0A" + protocol + "://" + url + "/landingPage/" + meetingId + "%0D%0A%0D%0AMeeting%20id:%0D%0A" + meetingId + ((host && document.getElementById("settingsContent").children[0].children[1].children[0].checked && document.getElementById("settingsContent").children[0].children[2].value) ? ("%0D%0A%0D%0APassword:%0D%0A" + document.getElementById("settingsContent").children[0].children[2].value) : ""), "_blank");
  }
}

function openGmail() {
  window.open("https://mail.google.com/mail/u/0/?tf=cm&to&su=Zoom%20Meeting&body=Join%20this%20zoom%20meeting:%0D%0A" + protocol + "://" + url + "/landingPage/" + meetingId + "%0D%0A%0D%0AMeeting%20id:%0D%0A" + meetingId + ((host && document.getElementById("settingsContent").children[0].children[1].children[0].checked && document.getElementById("settingsContent").children[0].children[2].value) ? ("%0D%0A%0D%0APassword:%0D%0A" + document.getElementById("settingsContent").children[0].children[2].value) : ""), "_blank", (isElectron) ? "width:800,height:600,title=Meetings,icon=assets/gmail.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
}

function openYahooMail() {
  window.open("https://compose.mail.yahoo.com/?to&subject=Zoom%20Meeting&body=Join%20this%20zoom%20meeting:%0D%0A" + protocol + "://" + url + "/landingPage/" + meetingId + "%0D%0A%0D%0AMeeting%20id:%0D%0A" + meetingId + ((host && document.getElementById("settingsContent").children[0].children[1].children[0].checked && document.getElementById("settingsContent").children[0].children[2].value) ? ("%0D%0A%0D%0APassword:%0D%0A" + document.getElementById("settingsContent").children[0].children[2].value) : ""), "_blank", (isElectron) ? "width:800,height:600,title=Meetings,icon=assets/yahoo.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
}

function viewRecording() {
  let blob = new Blob(recordedChunks, {
    type: "video/webm"
  });
  window.open(URL.createObjectURL(blob), "_blank", (isElectron) ? "width:800,height:600,title=Meetings,icon=assets/favicon.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
  URL.revokeObjectURL(blob);
}

function downloadRecording() {
  let blob = new Blob(recordedChunks, {
    type: "video/webm"
  });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "recording.webm";
  link.click();
  URL.revokeObjectURL(blob);
}

function saveRecordingInCloud() {
  socket.emit("saveRecordingInCloud", { recordedChunks });
}

function clearChalkboard() {
  document.getElementById("chalkboardCanvas").getContext("2d").fillStyle = "#ffffff";
  document.getElementById("chalkboardCanvas").getContext("2d").fillRect(0, 0, document.getElementById("chalkboardCanvas").width, document.getElementById("chalkboardCanvas").height);
  document.getElementById("chalkboardCanvas").getContext("2d").fillStyle = "#000000";
}

function viewChalkboard() {
  window.open(document.getElementById("chalkboardCanvas").toDataURL(), "_blank", (isElectron) ? "width:800,height:600,title=Meetings,icon=assets/favicon.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
}

function downloadChalkboard() {
  let link = document.createElement("a");
  link.href = document.getElementById("chalkboardCanvas").toDataURL();
  link.download = "chalkboard.jpeg";
  link.click();
}

function openChat() {
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("chat").style.display = "block";
}

function openSurveys() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("surveys").style.display = "block";
}

function openAttendees() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("attendees").style.display = "block";
}

function openRecording() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("recording").style.display = "block";
}

function openBackgroundImage() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("backgroundImage").style.display = "block";
}

function openTranscript() {
  if (document.getElementById("transcriptContentContainer").children[0].tagName !== "H3") Array.from(document.getElementById("transcriptContentContainer").children).forEach(({ children: [_, transcriptTranslateContainer] }) => {
    transcriptTranslateContainer.style.display = "none";
  });
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("transcript").style.display = "block";
}

function openKeyboardShortcuts() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("keyboardShortcuts").style.display = "block";
}

function openNotifications() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("notifications").style.display = "block";
}

function openReactions() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("reactions").style.display = "block";
}

function openAppStore() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("apps").style.display = "block";
}

function openSettings() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  if (host) document.getElementById("settings").style.display = "block";
}

function openInvite() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  hideApps();
  document.getElementById("invite").style.display = "block";
}

function openMemory() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
  document.getElementById("memory").style.display = "block";
}

function hidePopup() {
  document.getElementById("chat").style.display = "none";
  document.getElementById("surveys").style.display = "none";
  document.getElementById("attendees").style.display = "none";
  document.getElementById("recording").style.display = "none";
  document.getElementById("backgroundImage").style.display = "none";
  document.getElementById("transcript").style.display = "none";
  document.getElementById("keyboardShortcuts").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("reactions").style.display = "none";
  document.getElementById("apps").style.display = "none";
  document.getElementById("memory").style.display = "none";
  if (host) document.getElementById("settings").style.display = "none";
  document.getElementById("invite").style.display = "none";
  hideApps();
}

function hideApps() {
  Array.from(document.getElementById("appPopups").children).forEach((appPopup) => {
    appPopup.style.display = "none";
  });
}

function viewTranscript() {
  let blob = new Blob([Array.from(document.getElementById("transcriptContentContainer").children).map(({ children: [{ innerText }] }) => innerText).join("\n")], {
    type: "text/plain"
  });
  window.open(URL.createObjectURL(blob), "_blank", (isElectron) ? "width:800,height:600,title=Meetings,icon=assets/favicon.png" : ((window.matchMedia('(display-mode: standalone)').matches) ? {} : ""));
  URL.revokeObjectURL(blob);
}

function downloadTranscript() {
  let blob = new Blob([Array.from(document.getElementById("transcriptContentContainer").children).map(({ children: [{ innerText }] }) => innerText).join("\n")], {
    type: "text/plain"
  });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "transcript.txt";
  link.click();
  URL.revokeObjectURL(blob);
}

function saveTranscriptInCloud() {
  socket.emit("saveTranscriptInCloud");
}

function displayBackgroundScreen(stream) {
  let backgroundScreenCanvas = document.createElement("canvas");
  let backgroundScreenVideo = document.createElement("video");
  backgroundScreenVideo.muted = true;
  backgroundScreenVideo.setAttribute("width", "400px");
  backgroundScreenVideo.setAttribute("height", "300px");
  localVideoStream = backgroundScreenCanvas.captureStream();
  localVideoStream.getVideoTracks()[0].enabled = (document.getElementById("stopVideoButton").children[0].className === "fa fa-video-camera");
  bodyPix.load().then((net) => {
    backgroundScreenVideo.srcObject = stream;
    backgroundScreenVideo.addEventListener("loadedmetadata", () => {
      backgroundScreenVideo.play();
      backgroundScreenInterval = setInterval(() => {
          net.segmentPerson(backgroundScreenVideo).then((segmentation) => {
            if (backgroundScreen.effect === "blur") {
              bodyPix.drawBokehEffect(backgroundScreenCanvas, backgroundScreenVideo, segmentation, backgroundScreenOptions.blur.backgroundBlurAmount, backgroundScreenOptions.blur.edgeBlurAmount, backgroundScreenOptions.blur.flipHorizontal);
            } else if (backgroundScreen.effect === "none") {
              let bufferCanvas = document.createElement("canvas");
              bufferCanvas.setAttribute("width", "400px");
              bufferCanvas.setAttribute("height", "300px");
              if (backgroundScreen.method === 1) {
                bufferCanvas.getContext("2d").putImageData(bodyPix.toMask(segmentation), 0, 0);
                backgroundScreenCanvas.getContext("2d").drawImage(backgroundScreenVideo, 0, 0, backgroundScreenCanvas.width, backgroundScreenCanvas.height);
                backgroundScreenCanvas.getContext("2d").save();
                backgroundScreenCanvas.getContext("2d").globalCompositeOperation = "destination-out";
                backgroundScreenCanvas.getContext("2d").drawImage(bufferCanvas, 0, 0, backgroundScreenCanvas.width, backgroundScreenCanvas.height);
                backgroundScreenCanvas.getContext("2d").restore();
              } else if (backgroundScreen.method === 2) {
                bufferCanvas.getContext("2d").drawImage(backgroundScreenVideo, 0, 0, bufferCanvas.width, bufferCanvas.height);
                let imageData = bufferCanvas.getContext("2d").getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
                for (let pixel = 0; pixel < imageData.data.length; pixel += 4) {
                  if (segmentation.data[pixel / 4] === 0) {
                    imageData.data[pixel + 3] = 0;
                  }
                }
                bufferCanvas.getContext("2d").imageSmoothingEnabled = true;
                bufferCanvas.getContext("2d").putImageData(imageData, 0, 0);
                let image = new Image();
                image.addEventListener("load", () => {
                  backgroundScreenCanvas.getContext("2d").clearRect(0, 0, backgroundScreenCanvas.width, backgroundScreenCanvas.height);
                  backgroundScreenCanvas.getContext("2d").imageSmoothingEnabled = true;
                  backgroundScreenCanvas.getContext("2d").drawImage(image, 0, 0, backgroundScreenCanvas.width, backgroundScreenCanvas.height);
                });
                image.src = bufferCanvas.toDataURL();
              }
            } else if (backgroundScreen.effect === "virtual") {
              let bufferCanvas = document.createElement("canvas");
              bufferCanvas.setAttribute("width", "400px");
              bufferCanvas.setAttribute("height", "300px");
              let secondBufferCanvas = document.createElement("canvas");
              secondBufferCanvas.setAttribute("width", "400px");
              secondBufferCanvas.setAttribute("height", "300px");
              if (backgroundScreen.method === 1) {
                secondBufferCanvas.getContext("2d").putImageData(bodyPix.toMask(segmentation), 0, 0);
                bufferCanvas.getContext("2d").drawImage(backgroundScreenVideo, 0, 0, bufferCanvas.width, bufferCanvas.height);
                bufferCanvas.getContext("2d").save();
                bufferCanvas.getContext("2d").globalCompositeOperation = "destination-out";
                bufferCanvas.getContext("2d").drawImage(secondBufferCanvas, 0, 0, bufferCanvas.width, bufferCanvas.height);
                bufferCanvas.getContext("2d").restore();
              } else if (backgroundScreen.method === 2) {
                secondBufferCanvas.getContext("2d").drawImage(backgroundScreenVideo, 0, 0, secondBufferCanvas.width, secondBufferCanvas.height);
                let imageData = secondBufferCanvas.getContext("2d").getImageData(0, 0, secondBufferCanvas.width, secondBufferCanvas.height);
                for (let pixel = 0; pixel < imageData.data.length; pixel += 4) {
                  if (segmentation.data[pixel / 4] === 0) {
                    imageData.data[pixel + 3] = 0;
                  }
                }
                secondBufferCanvas.getContext("2d").imageSmoothingEnabled = true;
                secondBufferCanvas.getContext("2d").putImageData(imageData, 0, 0);
                let image = new Image();
                image.addEventListener("load", () => {
                  bufferCanvas.getContext("2d").clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
                  bufferCanvas.getContext("2d").imageSmoothingEnabled = true;
                  bufferCanvas.getContext("2d").drawImage(image, 0, 0, bufferCanvas.width, bufferCanvas.height);
                });
                image.src = secondBufferCanvas.toDataURL();
              }
              let backgroundScreenImage = new Image();
              backgroundScreenImage.addEventListener("load", () => {
                backgroundScreenCanvas.getContext("2d").drawImage(backgroundScreenImage, 0, 0, backgroundScreenCanvas.width, backgroundScreenCanvas.height);
                backgroundScreenCanvas.getContext("2d").drawImage(bufferCanvas, 0, 0, backgroundScreenCanvas.width, backgroundScreenCanvas.height);
              });
              backgroundScreenImage.src = backgroundScreen.image;
            }
          });
      });
    });
  });
}

function addKeyboardShortcut() {
  if (document.getElementById("keyboardShortcutContentContainer").children[0].tagName === "H3") document.getElementById("keyboardShortcutContentContainer").innerHTML = "";
  let keyboardShortcutIndex = keyboardShortcuts.length;
  keyboardShortcuts.push([[], ""]);
  let keyboardShortcutContentContainerBox = document.createElement("div");
  keyboardShortcutContentContainerBox.style.marginTop = (!document.getElementById("keyboardShortcutContentContainer").children.length) ? "20px" : "5px";
  keyboardShortcutContentContainerBox.className = "keyboardShortcutSectionContainer";
  let functionSelect = document.createElement("select");
  functionSelect.className = "select";
  functionSelect.style.width = "100%";
  functionSelect.style.height = "42.5px";
  functionSelect.style.textAlign = "center";
  functionSelect.style.margin = "15px 0 7.5px";
  functionSelect.innerHTML = `
  <option value="" selected disabled hidden>Choose here</option>
  `;
  functionSelect.title = "Function";
  functions.forEach(([func, funcText]) => {
    let option = new Option();
    option.value = "specific-" + func;
    option.innerText = funcText;
    functionSelect.appendChild(option);
  });
  functionSelect.innerHTML += `
  <option value="custom">Custom Function</option>
  `;
  let customFunctionCodeContainer = document.createElement("div");
  customFunctionCodeContainer.className = "customKeyboardShortcutFunctionCodeEditor";
  customFunctionCodeContainer.style.display = "none";
  let customFunctionCodeEditor = ace.edit(customFunctionCodeContainer);
  customFunctionCodeEditor.setTheme("ace/theme/monokai");
  customFunctionCodeEditor.session.setMode(new JavaScriptMode());
  customFunctionCodeEditor.setOption("tabSize", 2);
  customFunctionCodeEditor.on("change", () => {
    keyboardShortcuts[keyboardShortcutIndex][1] = customFunctionCodeEditor.getValue();
  });
  let keyContainer = document.createElement("div");
  keyContainer.style.display = "none";
  keyContainer.className = "keyboardShortcutSectionContainer";
  keyContainer.innerHTML = "<h3>No keys given</h3>"
  let addKeyButton = document.createElement("button");
  addKeyButton.style.display = "none";
  addKeyButton.style.marginBottom = "5px";
  addKeyButton.className = "keyboardShortcutButton";
  addKeyButton.innerText = "Add key";
  addKeyButton.addEventListener("click", () => {
    if (keyContainer.children[0].tagName === "H3") keyContainer.innerHTML = "";
    let keyIndex = keyboardShortcuts[keyboardShortcutIndex][0].length;
    keyboardShortcuts[keyboardShortcutIndex][0] = Array.from(
      new Set(
        [
          ...keyboardShortcuts[keyboardShortcutIndex][0],
          ...[
            ""
          ]
        ]
      )
    );
    let keyBox = document.createElement("div");
    keyBox.style.display = "flex";
    keyBox.style.flexDirection = "row";
    let keySelect = document.createElement("select");
    keySelect.className = "keyboardShortcutSelect";
    keySelect.style.margin = (!keyContainer.children.length) ? "15px 0 5px" : "2.5px 0 5px";
    keySelect.title = "Key";
    let keyOption = new Option();
    keyOption.value = "";
    keyOption.selected = true;
    keyOption.disabled = true;
    keyOption.hidden = true;
    keyOption.innerText = "Choose here";
    keySelect.appendChild(keyOption);
    keys.forEach((key) => {
      keyOption = new Option();
      keyOption.value = key;
      keyOption.innerText = key;
      keySelect.appendChild(keyOption);
    });
    keySelect.addEventListener("change", () => {
      keyboardShortcuts[keyboardShortcutIndex][0][keyIndex] = keySelect.value;
    });
    let removeKeyButton = document.createElement("div");
    removeKeyButton.style.height = "18px";
    removeKeyButton.style.marginTop = (!keyContainer.children.length) ? "15px" : "2.5px";
    removeKeyButton.style.marginLeft = "5px";
    removeKeyButton.style.backgroundColor = "#007bff";
    removeKeyButton.className = "optionButton";
    removeKeyButton.addEventListener("click", () => {
      keyboardShortcuts[keyboardShortcutIndex][0] = keyboardShortcuts[keyboardShortcutIndex][0].filter((_, index) => index !== keyIndex);
      keyBox.remove();
      if (!keyContainer.children.length) {
        keyContainer.innerHTML = "<h3>No keys given</h3>";
      } else {
        keyContainer.children[0].children[0].style.margin = "15px 0 5px";
        keyContainer.children[0].children[1].style.marginTop = "15px";
      };
    });
    let removeKeyButtonIcon = document.createElement("i");
    removeKeyButtonIcon.className = "fa fa-trash";
    removeKeyButtonIcon.ariaHidden = true;
    removeKeyButton.appendChild(removeKeyButtonIcon);
    keyBox.appendChild(keySelect);
    keyBox.appendChild(removeKeyButton);
    keyContainer.appendChild(keyBox);
  });
  let removeKeyboardShortcutButton = document.createElement("button");
  removeKeyboardShortcutButton.style.marginBottom = "5px";
  removeKeyboardShortcutButton.className = "keyboardShortcutButton";
  removeKeyboardShortcutButton.innerText = "Remove";
  removeKeyboardShortcutButton.addEventListener("click", () => {
    keyboardShortcuts = keyboardShortcuts.filter((_, index) => index !== keyboardShortcutIndex);
    keyboardShortcutContentContainerBox.remove();
    if (!document.getElementById("keyboardShortcutContentContainer").children.length) {
      document.getElementById("keyboardShortcutContentContainer").innerHTML = "<h3>No keyboard shortcuts created</h3>";
    } else {
      document.getElementById("keyboardShortcutContentContainer").children[0].style.marginTop = "20px";
    };
  });
  functionSelect.addEventListener("change", () => {
    functionSelect.style.margin = "15px 0 12.5px";
    keyContainer.style.display = "block";
    addKeyButton.style.display = "block";
    if (functionSelect.value.startsWith("specific-")) {
      customFunctionCodeContainer.style.display = "none";
      keyboardShortcuts[keyboardShortcutIndex][1] = functionSelect.value.split("-").slice(1).join("-") + "();";
    } else {
      customFunctionCodeContainer.style.display = "block";
      keyboardShortcuts[keyboardShortcutIndex][1] = customFunctionCodeEditor.getValue();
    }
  });
  keyboardShortcutContentContainerBox.appendChild(functionSelect);
  keyboardShortcutContentContainerBox.appendChild(customFunctionCodeContainer);
  keyboardShortcutContentContainerBox.appendChild(keyContainer);
  keyboardShortcutContentContainerBox.appendChild(addKeyButton);
  keyboardShortcutContentContainerBox.appendChild(removeKeyboardShortcutButton);
  document.getElementById("keyboardShortcutContentContainer").appendChild(keyboardShortcutContentContainerBox);
}

function addNotification() {
  if (document.getElementById("notificationContentContainer").children[0].tagName === "H3") document.getElementById("notificationContentContainer").innerHTML = "";
  let notificationIndex = notifications.length;
  notifications.push([
    "",
    {
      type: "notification"
    }
  ]);
  let notificationContentContainerBox = document.createElement("div");
  notificationContentContainerBox.style.marginTop = (!document.getElementById("notificationContentContainer").children.length) ? "20px" : "5px";
  notificationContentContainerBox.className = "notificationSectionContainer";
  let notificationTypeContainer = document.createElement("div");
  notificationTypeContainer.style.display = "flex";
  notificationTypeContainer.style.flexDirection = "row";
  notificationTypeContainer.style.marginTop = "12.5px";
  notificationTypeContainer.style.marginBottom = "10px";
  let notificationTypeLabel = document.createElement("label");
  notificationTypeLabel.className = "notificationTypeLabel";
  notificationTypeLabel.innerText = "Type:";
  let notificationTypeSelect = document.createElement("select");
  notificationTypeSelect.className = "notificationTypeSelect";
  notificationTypeSelect.innerHTML += `
  ${(isElectron) ? "<option value='beep'>Beep</option>" : ""}
  <option value="notification" selected>Notification</option>
  <option value="custom">Custom</option>
  `;
  notificationTypeSelect.title = "Notification Type";
  let eventSelect = document.createElement("select");
  eventSelect.className = "notificationSelect";
  eventSelect.innerHTML += `
  <option value="" selected disabled hidden>Choose event here</option>
  `;
  eventSelect.title = "Event";
  Object.entries(events).forEach(([event, [eventText]]) => {
    let option = new Option();
    option.value = event;
    option.innerText = eventText;
    eventSelect.appendChild(option);
  });
  let customNotificationCodeContainer = document.createElement("div");
  customNotificationCodeContainer.className = "customNotificationFunctionCodeEditor";
  customNotificationCodeContainer.style.display = "none";
  let notificationVariables = document.createElement("table");
  notificationVariables.style.display = "none";
  notificationVariables.style.width = "100%";
  notificationVariables.style.marginBottom = "7.5px";
  notificationVariables.innerHTML = `
  <tr>
    <th>Variable</th>
    <th>Description</th>
  </tr>
  `;
  let notificationInput = document.createElement("textarea");
  notificationInput.style.display = "none";
  notificationInput.className = "notificationInput";
  notificationInput.placeholder = "Notification";
  notificationInput.addEventListener("change", () => {
    notifications[notificationIndex][1].notification = notificationInput.value;
  });
  let customNotificationCodeEditor = ace.edit(customNotificationCodeContainer);
  customNotificationCodeEditor.setTheme("ace/theme/monokai");
  customNotificationCodeEditor.session.setMode(new JavaScriptMode());
  customNotificationCodeEditor.setOption("tabSize", 2);
  customNotificationCodeEditor.on("change", () => {
    notifications[notificationIndex][1] = {
      type: "custom",
      code: customNotificationCodeEditor.getValue()
    }
  });
  eventSelect.addEventListener("change", () => {
    notifications[notificationIndex][0] = eventSelect.value;
    notifications[notificationIndex][1] = {
      type: notifications[notificationIndex][1].type,
      notification: events[eventSelect.value][1] || ""
    };
    notificationInput.value = events[eventSelect.value][1] || "";
    notificationVariables.innerHTML = `
    <tr>
      <th>Variable</th>
      <th>Description</th>
    </tr>
    `;
    Object.entries(events[eventSelect.value][2]).forEach((variable) => {
      let row = document.createElement("tr");
      let variableName = document.createElement("td");
      variableName.innerText = variable[0];
      let variableDescription = document.createElement("td");
      variableDescription.innerText = variable[1]
      row.appendChild(variableName);
      row.appendChild(variableDescription);
      notificationVariables.appendChild(row);
    });
    if (notifications[notificationIndex][1].type === "notification") {
      notificationVariables.style.display = "table";
      notificationInput.style.display = "block";
      customNotificationCodeContainer.style.display = "none";
    } else if (notifications[notificationIndex][1].type === "custom") {
      notificationVariables.style.display = "table";
      notificationInput.style.display = "none";
      customNotificationCodeContainer.style.display = "block";
    };
  });
  notificationTypeSelect.addEventListener("change", () => {
    if (notificationTypeSelect.value === "beep") {
      notifications[notificationIndex][1] = {
        type: "beep"
      };
      if (!eventSelect.value) return;
      notificationVariables.style.display = "none";
      notificationInput.style.display = "none";
      customNotificationCodeContainer.style.display = "none";
    } else if (notificationTypeSelect.value === "notification") {
      if (eventSelect.value) {
        notifications[notificationIndex][1] = {
          type: "notification",
          notification: events[eventSelect.value][1] || ""
        };
        notificationInput.value = events[eventSelect.value][1] || "";
      };
      if (!eventSelect.value) return;
      notificationVariables.style.display = "table";
      notificationInput.style.display = "block";
      customNotificationCodeContainer.style.display = "none";
    } else if (notificationTypeSelect.value === "custom") {
      notifications[notificationIndex][1] = {
        type: "custom",
        code: ""
      };
      if (!eventSelect.value) return;
      notificationVariables.style.display = "table";
      notificationInput.style.display = "none";
      customNotificationCodeContainer.style.display = "block";
    }
  });
  let removeNotificationButton = document.createElement("button");
  removeNotificationButton.className = "removeNotificationButton";
  removeNotificationButton.innerText = "Remove";
  removeNotificationButton.addEventListener("click", () => {
    notifications = notifications.filter((_, index) => index !== notificationIndex);
    notificationContentContainerBox.remove();
    if (!document.getElementById("notificationContentContainer").children.length) {
      document.getElementById("notificationContentContainer").innerHTML = "<h3>No notifications created</h3>";
    } else {
      document.getElementById("notificationContentContainer").children[0].style.marginTop = "20px";
    };
  });
  notificationTypeContainer.appendChild(notificationTypeLabel);
  notificationTypeContainer.appendChild(notificationTypeSelect);
  notificationContentContainerBox.appendChild(notificationTypeContainer);
  notificationContentContainerBox.appendChild(eventSelect);
  notificationContentContainerBox.appendChild(notificationVariables);
  notificationContentContainerBox.appendChild(notificationInput);
  notificationContentContainerBox.appendChild(customNotificationCodeContainer);
  notificationContentContainerBox.appendChild(removeNotificationButton);
  document.getElementById("notificationContentContainer").appendChild(notificationContentContainerBox);
}

function beep() {
  require("electron").shell.beep();
}

function sendNotification() {
  Notification.requestPermission().then((permission) => {
    if (permission === "denied") return;
    new Notification("Test Notification", {
      icon: "/public/favicon.png",
      body: "This is a test notification"
    });
  });
}

function shareFile() {
  if (!sharingFile) {
    document.getElementById("chalkboard").style.display = "none";
    sharingScreen = false;
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,audio/*,video/*";
    fileInput.click();
    fileInput.addEventListener("change", () => {
      let fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
        if (fileInput.files[0].type.startsWith("image")) {
          let resourceCanvas = document.createElement("canvas");
          let stream = resourceCanvas.captureStream();
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
          resource = new Image();
          resource.addEventListener("load", () => {
            resourceCanvas.getContext("2d").drawImage(resource, 0, 0, resourceCanvas.width, resourceCanvas.height);
          });
          resource.src = fileReader.result;
          sharingFile = "image";
        } else if (fileInput.files[0].type.startsWith("audio")) {
          resource = new Audio(fileReader.result);
          resource.addEventListener("loadedmetadata", () => {
            resource.play();
            let stream = resource.captureStream();
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
            localVideo.addEventListener("play", play);
            localVideo.addEventListener("pause", pause);
            resource.addEventListener("ended", end);
            localVideo.muted = true;
          });
          sharingFile = "audio";
        } else if (fileInput.files[0].type.startsWith("video")) {
          resource = document.createElement("video");
          resource.src = fileReader.result;
          resource.addEventListener("loadedmetadata", () => {
            resource.play();
            let stream = resource.captureStream();
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
            localVideo.addEventListener("play", play);
            localVideo.addEventListener("pause", pause);
            resource.addEventListener("ended", end);
          });
          sharingFile = "video";
        }
      });
      fileReader.readAsDataURL(fileInput.files[0]);
    });
  } else {
    if (sharingFile !== "image") {
      localVideo.removeEventListener("play", play);
      localVideo.removeEventListener("pause", pause);
      localVideo.removeEventListener("ended", end);
      resource.pause();
      resource = null;
    }
    sharingFile = false;
    localVideo.muted = true;
    openVideo();
  }
}

function openPictureInPicture() {
  if (!document.pictureInPictureElement) {
    localVideo.requestPictureInPicture();
  } else {
    document.exitPictureInPicture();
  }
}

function openFullscreen() {
  if (!document.fullscreen) {
    document.getElementById("openFullscreenButton").children[0].className = "fa-solid fa-compress";
    document.documentElement.requestFullscreen();
  } else {
    document.getElementById("openFullscreenButton").children[0].className = "fa-solid fa-expand";
    document.exitFullscreen();
  }
}

function enableBackgroundImage() {
  if (document.getElementById("backgroundImageSlider").checked) {
    document.getElementById("backgroundImageMethodSelect").style.display = "none";
    document.getElementById("backgroundImageInput").style.display = "none";
    document.getElementById("backgroundImageTypeContainer").style.display = "block";
    document.getElementById("backgroundImageTypeSelect").value = "blur";
  } else {
    document.getElementById("backgroundImageTypeContainer").style.display = "none";
    document.getElementById("backgroundImageMethodSelect").style.display = "none";
    document.getElementById("backgroundImageInput").style.display = "none";
  }
}

function enableShortcutBackgroundImage() {
  document.getElementById("backgroundImageSlider").click();
}