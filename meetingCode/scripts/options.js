let localVideoContainer = document.createElement("div");
localVideoContainer.addEventListener("click", () => {
  if (localVideoContainer.parentElement === document.getElementById("videoGrid")) return;
  document.getElementById("videoGrid").children[1].getElementsByTagName("video")[0].style.height = "25vh";
  document.getElementById("videoGridUpperHolder").appendChild(document.getElementById("videoGrid").children[1]);
  localVideo.style.height = "48.5vh";
  document.getElementById("videoGrid").appendChild(localVideoContainer);
});
localVideoContainer.addEventListener("dblclick", () => {
  localVideo.requestFullscreen();
});
let localVideo = document.createElement("video");
localVideo.className = "userVideo";
localVideo.muted = true;
localVideo.controls = false;
localVideo.style.height = "75vh";
//localVideo.style.setProperty("--degrace", "180deg");
let localVideoStream;
let calls = [];
let recorder;
let recordedChunks = [];
let chalkboardStartMousePosition = {
  x: 0,
  y: 0
}
let isPainting = false;
let users = {}
let backgroundScreen = false;
let backgroundScreenOptions = {
  blur: {
    backgroundBlurAmount: 6,
    edgeBlurAmount: 2,
    flipHorizontal: false
  }
}
let backgroundScreenInterval;
let pressedKeys = [];
let keyboardShortcuts = [];
let notifications = [];
let reactionTimeout;
let sharingScreen = false;
let sharingFile = false;
let recordingMeeting = false;
let speechRecognition;
let emojiPicker;
let resource;
let play = () => {
  resource.play();
}
let pause = () => {
  resource.pause();
}
let end = () => {
  localVideo.removeEventListener("play", play);
  localVideo.removeEventListener("pause", pause);
  localVideo.removeEventListener("ended", end);
  sharingFile = false;
  resource.pause();
  resource = null;
  openVideo();
}
let keys = [
  "Alt",
  "Control",
  "Enter",
  "Backspace",
  "Space",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "Ö",
  "Ü",
  "Ä",
  "ß",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "#",
  "+",
  "*",
  "'",
  '"',
  "|",
  "<",
  ">",
  "!",
  "§",
  "$",
  "%",
  "&",
  "/",
  "(",
  ")",
  "=",
  "?",
  "~",
  ",",
  ";",
  ".",
  ":",
  "-",
  "_"
];
let functions = [
  ...[
    [
      "leaveMeeting",
      "Leave Meeting"
    ]
  ],
  ...[
    [
      "stopVideo",
      "Stop Video"
    ]
  ],
  ...[
    [
      "muteAudio",
      "Mute Audio"
    ]
  ],
  ...[
    [
      "openVideo",
      "Open Video"
    ]
  ],
  ...[
    [
      "shareScreen",
      "Share Screen"
    ]
  ],
  ...[
    [
      "recordMeeting",
      "Record Meeting"
    ]
  ],
  ...[
    [
      "openChalkboard",
      "Open Chalkboard"
    ]
  ],
  ...[
    [
      "sendMessage",
      "Send Message"
    ]
  ],
  ...[
    [
      "openLandingPage",
      "Open Landing Page"
    ]
  ],
  ...[
    [
      "openStandardEmail",
      "Open Standard E-Mail"
    ]
  ],
  ...[
    [
      "openGmail",
      "Open Gmail"
    ]
  ],
  ...[
    [
      "openYahooMail",
      "Open Yahoo Mail"
    ]
  ],
  ...[
    [
      "viewRecording",
      "View Recording"
    ]
  ],
  ...[
    [
      "downloadRecording",
      "Download Recording"
    ]
  ],
  ...[
    [
      "saveRecordingInCloud",
      "Save Recording in Cloud"
    ]
  ],
  ...[
    [
      "clearChalkboard",
      "Clear Chalkboard"
    ]
  ],
  ...[
    [
      "downloadChalkboard",
      "Download Chalkboard"
    ]
  ],
  ...[
    [
      "openChat",
      "Open Chat"
    ]
  ],
  ...[
    [
      "openSurveys",
      "Open Surveys"
    ]
  ],
  ...[
    [
      "openAttendees",
      "Open Attendees"
    ]
  ],
  ...[
    [
      "openTranscript",
      "Open Transcript"
    ]
  ],
  ...[
    [
      "openRecording",
      "Open Recording"
    ]
  ],
  ...[
    [
      "openBackgroundImage",
      "Open Background Image"
    ]
  ],
  ...[
    [
      "openKeyboardShortcuts",
      "Open Keyboard Shortcuts"
    ]
  ],
  ...[
    [
      "openNotifications",
      "Open Notifications"
    ]
  ],
  ...[
    [
      "openReactions",
      "Open Reactions"
    ]
  ],
  ...[
    [
      "openAppStore",
      "Open App Store"
    ]
  ],
  ...[
    [
      "openSettings",
      "Open Settings"
    ]
  ],
  ...[
    [
      "openInvite",
      "Open Invite"
    ]
  ],
  ...(isElectron) ? [
    [
      "openMemory",
      "Open Memory"
    ]
  ] : [],
  ...[
    [
      "hidePopup",
      "Hide Popup"
    ]
  ],
  ...[
    [
      "hideApps",
      "Hide Apps"
    ]
  ],
  ...[
    [
      "viewTranscript",
      "View Transcript"
    ]
  ],
  ...[
    [
      "downloadTranscript",
      "Download Transcript"
    ]
  ],
  ...[
    [
      "saveTranscriptInCloud",
      "Save Transcript in Cloud"
    ]
  ],
  ...[
    [
      "displayBackgroundScreen",
      "Display Background Screen"
    ]
  ],
  ...[
    [
      "addKeyboardShortcut",
      "Add Keyboard Shortcut"
    ]
  ],
  ...[
    [
      "addNotification",
      "Add Notification"
    ]
  ],
  ...(isElectron) ? [
    [
      "beep",
      "Beep"
    ]
  ] : [],
  ...[
    [
      "sendNotification",
      "Send Notification"
    ]
  ],
  ...[
    [
      "shareFile",
      "Share File"
    ]
  ],
  ...[
    [
      "openFullscreen",
      "Open Fullscreen"
    ]
  ],
  ...[
    [
      "enableShortcutBackgroundImage",
      "Enable Background Image"
    ]
  ]
];
let singleLanguageCodes = {
  am: "am-ET",
  ar: "ar-SA",
  EU: "bn-IN",
  bg: "bg-BG",
  ca: "ca-ES",
  ko: "ko-KR",
  de: "de-DE"
}
let events = {
  userJoin: [
    "User join",
    "{username} joined",
    {
      socketId: "Socket id of the joined user",
      userId: "Id of the joined user",
      username: "Username of the joined user"
    }
  ],
  userLeave: [
    "User leave",
    "{username} left",
    {
      socketId: "Socket id of the left user",
      userId: "Id of the left user",
      username: "Username of the left user"
    }
  ],
  incomingMessage: [
    "Incoming Message",
    "Creator: {username}\nMessage: {message}",
    {
      receiver: "Receiver type of the message",
      username: "Username of the sender",
      message: "Message that got sent",
      senderId: "Id of the sender"
    }
  ],
  createSurvey: [
    "Create Survey",
    "Creator: {username}\nQuestion: {questionString}\nOptions: {options}",
    {
      surveyId: "Id of the survey",
      creator: "Id of the survey creator",
      username: "Username of the survey creator",
      question: "Question of the survey",
      options: "Options of the survey",
      optionString: "String of the options of the survey"
    }
  ],
  answerSurvey: [
    "Answer Survey",
    "Question: {question}\nOption: {option}",
    {
      surveyId: "Id of the survey",
      question: "Question of the survey",
      optionId: "Id of the option that got chosen",
      option: "Option that got chosen"
    }
  ],
  stopVideo: [
    "Stop Video",
    "{username} {enabledWord} his/her video",
    {
      userId: "Id of the user who started/stopped his/her video",
      username: "Username of the user who started/stopped his/her video",
      enabled: "Whether his/her video is enabled",
      enabledWord: "Correct word whether his/her video is enabled"
    }
  ],
  muteAudio: [
    "Mute Audio",
    "{username} {enabledWord} his/her video",
    {
      userId: "Id of the user who started/stopped his/her video",
      username: "Username of the user who started/stopped his/her video",
      enabled: "Whether his/her video is enabled",
      enabledWord: "Correct word whether his/her video is enabled"
    }
  ]
}
let JavaScriptMode = ace.require('ace/mode/javascript').Mode;