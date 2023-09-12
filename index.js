const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*"
  }
});
//const socketStream = require('socket.io-stream');
const bodyParser = require('body-parser');
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(http, {
  debug: true
});
const crypto = require('crypto');
const Database = require('@replit/database');
const db = new Database();
const fs = require('fs');
const stream = { Stream } = require('stream');
const nodemailer = require('nodemailer');
const emailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});
const languages = require('./languages.json');
const emojis = require('./emojis.json');

app.set("views", __dirname);
app.set("view engine", "ejs");
app.use("/peer", peerServer);
app.use("/public", express.static("public"));
app.use("/pages", express.static("pages"));
app.use("/apps", express.static("apps"));
app.use("/meetingCode", express.static("meetingCode"));
app.use(bodyParser.json({
  limit: "50mb"
}));
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
});

db.set("meetings", JSON.stringify({})).then(() => {
  console.log("Successfully cleared all meetings");
});

io.on('connection', (socket, name) => {
  socket.on("joinMeeting", ({ meetingId, userId, username, password }) => {
    if (
      (
        (
          typeof meetingId !== "string"
        ) || (
          meetingId.length < 1
        )
      ) || (
        (
          typeof userId !== "string"
        ) || (
          userId.length < 1
        )
      ) || (
        (
          typeof username !== "string"
        ) || (
          username.length < 1
        )
      )
    ) return;
    db.get("meetings").then((meetings) => {
      if (
        Object.keys(
          JSON.parse(meetings) || {}
        ).includes(meetingId) && (
          (
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).password && (
              (
                (
                  JSON.parse(meetings) || {}
                )[meetingId] || {}
              ).password !== crypto.createHash("sha256").update(password || "").digest("hex")
            )
          ) || (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).locked
        )
      ) return;
      db.set("meetings", JSON.stringify({
        ...JSON.parse(meetings) || {},
        ...{
          [meetingId]: {
            ...(
              JSON.parse(meetings) || {}
            )[meetingId] || {},
            ...{
              ...(
                !Object.keys(
                  JSON.parse(meetings) || {}
                ).includes(meetingId)
              ) ? {
                creator: socket.id,
                locked: false
              } : {},
              ...{
                users: {
                  ...(
                    (
                      JSON.parse(meetings) || {}
                    )[meetingId] || {}
                  ).users || {},
                  ...{
                    [userId]: [
                      socket.id,
                      username
                    ]
                  }
                }
              }
            }
          }
        }
      }));
      socket.join(meetingId);
      socket.emit("users", {
        users: {
          ...(
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).users || {},
          ...{
            [userId]: [
              socket.id,
              username
            ]
          }
        }
      });
    });
    socket.on("userJoinConfirm", () => {
      socket.to(meetingId).emit("userJoin", {
        socketId: socket.id,
        userId,
        username
      });
    });
    socket.on("sendMessage", ({ receiver, message }) => {
      if (receiver) {
        db.get("meetings").then((meetings) => {
          if (
            (
              (
                (
                  (
                    JSON.parse(meetings) || {}
                  )[meetingId] || {}
                ).users || {}
              )[receiver] || []
            )[0] !== socket.id
          ) io.of("/").sockets.get(
            (
              (
                (
                  (
                    JSON.parse(meetings) || {}
                  )[meetingId] || {}
                ).users || {}
              )[receiver] || []
            )[0]
          ).emit("createMessage", {
            username,
            message,
            senderId: userId,
            receiver: "specific"
          });
        });
      } else {
        socket.to(meetingId).emit("createMessage", {
          username,
          message,
          senderId: userId,
          receiver: "all"
        });
      }
    });
    socket.on("createSurvey", ({ question, options }) => {
      if (!question || options.some((option) => !option)) return;
      crypto.randomBytes(4, (err, surveyId) => {
        if (err) return;
        db.get("meetings").then((meetings) => {
          db.set("meetings", JSON.stringify({
            ...JSON.parse(meetings) || {},
            ...{
              [meetingId]: {
                ...(
                  JSON.parse(meetings) || {}
                ) || {},
                ...{
                  surveys: {
                    ...(
                      (
                        JSON.parse(meetings) || {}
                      ) || {}
                    ).surveys || {},
                    ...{
                      [surveyId.toString("hex")]: {
                        creator: socket.id,
                        voters: []
                      }
                    }
                  }
                }
              }
            }
          }));
          io.to(meetingId).emit("createSurvey", {
            surveyId: surveyId.toString("hex"),
            creator: userId,
            question,
            options
          });
        });
      });
    });
    socket.on("answerSurvey", ({ surveyId, option }) => {
      db.get("meetings").then((meetings) => {
        if (
          !Object.keys(
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).surveys || {}
          ).includes(surveyId)
        ) return;
        if (
          (
            (
              (
                (
                  (
                    JSON.parse(meetings) || {}
                  )[meetingId] || {}
                ).surveys || {}
              )[surveyId] || {}
            ).creator === userId
          ) || (
            (
              (
                (
                  (
                    JSON.parse(meetings) || {}
                  )[meetingId] || {}
                ).surveys || {}
              )[surveyId] || {}
            ).voters || []
          ).includes(userId)
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                surveys: {
                  ...(
                    (
                      JSON.parse(meetings) || {}
                    )[meetingId] || {}
                  ).surveys,
                  ...{
                    [surveyId]: {
                      creator: (
                        (
                          (
                            (
                              JSON.parse(meetings) || {}
                            )[meetingId] || {}
                          ).surveys || {}
                        )[surveyId] || {}
                      ).creator,
                      voters: [
                        ...(
                          (
                            (
                              (
                                JSON.parse(meetings) || {}
                              )[meetingId] || {}
                            ).surveys || {}
                          )[surveyId] || {}
                        ).voters || [],
                        ...[
                          userId
                        ]
                      ]
                    }
                  }
                }
              }
            }
          }
        })).then(() => {
          io.of("/").sockets.get(
            (
              (
                (
                  (
                    JSON.parse(meetings) || {}
                  )[meetingId] || {}
                ).surveys || {}
              )[surveyId] || {}
            ).creator
          ).emit("answerSurvey", {
            surveyId,
            option
          });
        });
      });
    });
    socket.on("saveRecordingInCloud", ({ recordedChunks }) => {
      if (
        !Array.isArray(recordedChunks)
      ) return;
      crypto.randomBytes(8, (err, recordingId) => {
        if (err) return;
        let stream = fs.createWriteStream("./recordings/" + recordingId.toString("hex") + ".webm");
        (
          recordedChunks || []
        ).forEach((chunk) => {
          stream.write(
            Buffer.from(
              new Uint8Array(chunk)
            )
          );
        });
        stream.end(null);
        socket.emit("saveRecordingInCloud", {
          recordingId: recordingId.toString("hex")
        });
        /*db.get("recordings").then((recordings) => {
          db.set("recordings", JSON.stringify({
            ...JSON.parse(recordings) || {},
            ...{
              [recordingId.toString("hex")]: recordedChunks
            }
          })).then(() => {
            socket.emit("saveRecordingInCloud", {
              recordingId: recordingId.toString("hex")
            });
          });
        });*/
      });
    });
    socket.on("addTranscript", ({ language, text }) => {
      db.get("meetings").then((meetings) => {
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                transcript: [
                  ...(
                    (
                      JSON.parse(meetings) || {}
                    )[meetingId] || {}
                  ).transcript || [],
                  ...[
                    [
                      userId,
                      text
                    ]
                  ]
                ]
              }
            }
          }
        }));
      });
      io.to(meetingId).emit("addTranscript", {
        userId,
        language,
        text
      });
    });
    socket.on("saveTranscriptInCloud", () => {
      crypto.randomBytes(8, (err, transcriptId) => {
        if (err) return;
        db.get("meetings").then((meetings) => {
          db.get("transcripts").then((transcripts) => {
            db.set("transcripts", JSON.stringify({
              ...JSON.parse(transcripts) || {},
              ...{
                [transcriptId.toString("hex")]: [
                  (
                    (
                      JSON.parse(meetings) || {}
                    )[meetingId] || {}
                  ).users || {},
                  (
                    (
                      JSON.parse(meetings) || {}
                    )[meetingId] || {}
                  ).transcript || []
                ]
              }
            })).then(() => {
              socket.emit("saveTranscriptInCloud", {
                transcriptId: transcriptId.toString("hex")
              });
            });
          });
        });
      });
    });
    socket.on("changeIcon", ({ icon }) => {
      try {
        new URL(icon)
      } catch {
        return;
      }
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...(
            JSON.parse(meetings) || {}
          )[meetingId] || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                icon
              }
            }
          }
        })).then(() => {
          io.to(meetingId).emit("changeIcon", {
            icon
          });
        });
      });
    });
    socket.on("changeTitle", ({ title }) => {
      if (
        (
          typeof title !== "string"
        ) || (
          title.length < 1
        )
      ) return;
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                title
              }
            }
          }
        })).then(() => {
          io.to(meetingId).emit("changeTitle", {
            title
          });
        });
      });
    });
    socket.on("changeText", ({ text }) => {
      if (
        (
          typeof text !== "string"
        ) || (
          text.length < 1
        )
      ) return;
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                text
              }
            }
          }
        }));
      });
    });
    socket.on("changePassword", ({ password: changedPassword }) => {
      if (
        (
          typeof changedPassword !== "string"
        ) || (
          changedPassword.length < 1
        )
      ) return;
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                password: crypto.createHash("sha256").update(changedPassword || "").digest("hex")
              }
            }
          }
        }));
      });
    });
    socket.on("removeIcon", () => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: Object.entries(
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).filter(([key]) => key !== "icon").reduce((data, item) => ({
              ...data,
              ...{
                [item[0]]: item[1]
              }
            }), {})
          }
        })).then(() => {
          io.to(meetingId).emit("removeIcon");
        });
      });
    });
    socket.on("removeTitle", () => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: Object.entries(
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).filter(([key]) => key !== "title").reduce((data, item) => ({
              ...data,
              ...{
                [item[0]]: item[1]
              }
            }), {})
          }
        })).then(() => {
          io.to(meetingId).emit("removeTitle");
        });
      });
    });
    socket.on("removeText", () => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: Object.entries(
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).filter(([key]) => key !== "text").reduce((data, item) => ({
              ...data,
              ...{
                [item[0]]: item[1]
              }
            }), {})
          }
        }));
      });
    });
    socket.on("removePassword", () => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: Object.entries(
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).filter(([key]) => key !== "password").reduce((data, item) => ({
              ...data,
              ...{
                [item[0]]: item[1]
              }
            }), {})
          }
        }));
      });
    });
    socket.on("createReaction", ({ emoji }) => {
      if (
        (
          !emojis.includes(emoji)
        ) && (
          typeof emoji !== "string"
        ) && (
          Array.from(
            emoji.split(/[\ufe00-\ufe0f]/).join("")
          ).length > 1
        ) && (
          !/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi.test(emoji)
        )
      ) return;
      io.to(meetingId).emit("createReaction", {
        userId,
        emoji
      });
    });
    socket.on("installApp", ({ appId }) => {
      db.get("apps").then((apps) => {
        if (
          !Object.keys(
            JSON.parse(apps) || {}
          ).includes(appId)
        ) return;
        socket.emit("installApp", {
          appId,
          appName: (
            (
              JSON.parse(apps) || {}
            )[appId] || {}
          ).name,
          appDescription: (
            (
              JSON.parse(apps) || {}
            )[appId] || {}
          ).description,
          iconType: (
            (
              JSON.parse(apps) || {}
            )[appId] || {}
          ).iconType,
          popupExists: (
            (
              JSON.parse(apps) || {}
            )[appId] || {}
          ).popupExists
        });
      });
    });
    /*socket.on("changeDegrace", ({ rotate }) => {
      if (typeof rotate !== "boolean") return;
      socket.to("changeDegrace", {
        userId,
        rotate
      });
    });*/
    socket.on("videoTrackUpdate", ({ enabled }) => {
      socket.to(meetingId).emit("videoTrackUpdate", {
        userId,
        enabled
      });
    });
    socket.on("audioTrackUpdate", ({ enabled }) => {
      socket.to(meetingId).emit("audioTrackUpdate", {
        userId,
        enabled
      });
    });
    socket.on("stopVideo", ({ userId: stopVideoUserId }) => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).creator !== socket.id
          ) || (
          !Object.keys(
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          ).includes(stopVideoUserId)
        )) return;
        io.of("/").sockets.get(
          (
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          )[stopVideoUserId][0]
        ).emit("stopVideo");
        Object.entries(
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).users || {}
        ).filter((user) => user[0] !== stopVideoUserId).forEach((user) => {
          io.of("/").sockets.get(
            user[1][0]
          ).emit("videoTrackUpdate", {
            userId: stopVideoUserId,
            enabled: false
          });
        });
      });
    });
    socket.on("muteAudio", ({ userId: mutedAudioUserId }) => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        if (
          !Object.keys(
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          ).includes(mutedAudioUserId)
        ) return;
        io.of("/").sockets.get(
          (
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          )[mutedAudioUserId][0]
        ).emit("muteAudio");
        Object.entries(
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).users || {}
        ).filter((user) => user[0] !== mutedAudioUserId).forEach((user) => {
          io.of("/").sockets.get(
            user[1][0]
          ).emit("audioTrackUpdate", {
            userId: mutedAudioUserId,
            enabled: false
          });
        });
      });
    });
    socket.on("renameUser", ({ userId: renamedUserId, username: renamedUsername }) => {
      if (
        (
          typeof renamedUsername !== "string"
        ) || (
          renamedUsername.length < 1
        )
      ) return;
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        if (
          !Object.keys(
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          ).includes(renamedUserId)
        ) return;
        io.to(meetingId).emit("renameUser", {
          userId: renamedUserId,
          username: renamedUsername
        });
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                users: {
                  ...(
                    (
                      JSON.parse(meetings) || {}
                    )[meetingId] || {}
                  ).users || {},
                  ...{
                    [renamedUserId]: [
                      (
                        (
                          (
                            (
                              JSON.parse(meetings) || {}
                            )[meetingId] || {}
                          ).users || {}
                        )[renamedUserId] || []
                      )[0],
                      renamedUsername
                    ]
                  }
                }
              }
            }
          }
        }));
      });
    });
    socket.on("kickUser", ({ userId: kickedUserId }) => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        io.of("/").sockets.get(
          (
            (
              (
                (
                  JSON.parse(meetings) || {}
                )[meetingId] || {}
              ).users || {}
            )[kickedUserId] || []
          )[0]
        ).disconnect();
      });
    });
    socket.on("lockMeeting", () => {
      db.get("meetings").then((meetings) => {
        if (
          (
            (
              JSON.parse(meetings) || {}
            )[meetingId] || {}
          ).creator !== socket.id
        ) return;
        db.set("meetings", JSON.stringify({
          ...JSON.parse(meetings) || {},
          ...{
            [meetingId]: {
              ...(
                JSON.parse(meetings) || {}
              )[meetingId] || {},
              ...{
                locked: !(
                  (
                    JSON.parse(meetings) || {}
                  )[meetingId] || {}
                ).locked
              }
            }
          }
        }));
      });
    });
    /*socketStream(socket).on("livestream", (livestream) => {
      if (
        !livestream instanceof Stream
      ) return;
      socketStream(socket).emit("livestream", socketStream.createStream(livestream));
    });*/
  });
  socket.on("disconnecting", () => {
    let socketMeetings = Array.from(
      socket.rooms
    );
    db.get("meetings").then((meetings) => {
      socketMeetings.forEach((meetingId) => {
        if (
          (
            !Object.keys(
              JSON.parse(meetings) || {}
            ).includes(meetingId)
          ) || (
            !Object.values(
              (
                (
                  JSON.parse(meetings) || {}
                )[meetingId] || {}
              ).users || {}
            ).some(([socketId]) => socketId === socket.id)
          )
        ) return;
        socket.to(meetingId).emit("userLeave", {
          userId: Object.entries(
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          ).find(([_, [socketId]]) => socketId === socket.id)[0]
        });
        if (
          Object.keys(
            (
              (
                JSON.parse(meetings) || {}
              )[meetingId] || {}
            ).users || {}
          ).length > 1
        ) {
          meetings = JSON.stringify({
            ...JSON.parse(meetings) || {},
            ...{
              [meetingId]: {
                ...(
                  JSON.parse(meetings) || {}
                )[meetingId] || {},
                ...{
                  users: Object.entries(
                    (
                      (
                        (
                          JSON.parse(meetings) || {}
                        )[meetingId] || {}
                      ).users
                    ) || {}
                  ).filter((user) => user[1][0] !== socket.id).reduce((data, user) => ({
                    ...data,
                    ...{
                      [user[0]]: user[1]
                    }
                  }), {})
                }
              }
            }
          });
        } else {
          meetings = JSON.stringify(
            Object.entries(
              JSON.parse(meetings) || {}
            ).filter(([deletedMeetingId]) => deletedMeetingId !== meetingId).reduce((data, meeting) => ({
              ...data,
              ...{
                [meeting[0]]: meeting[1]
              }
            }), {})
          );
        }
      });
      db.set("meetings", meetings);
    });
  });
});

app.all("/", (req, res) => {
  res.sendFile("pages/home/index.html", {
    root: __dirname
  });
});

app.all("/meeting/:meetingId", (req, res) => {
  if (!req.params?.meetingId) return res.render("pages/error/index.ejs", {
    errorMessage: "No meeting id was given"
  });
  if (!req.query?.username) return res.render("pages/error/index.ejs", {
    errorMessage: "No username was given"
  });
  db.get("meetings").then((meetings) => {
    if (
      (
        (
          JSON.parse(meetings) || {}
        )[req.params?.meetingId] || {}
      ).password && (
        (
          (
            JSON.parse(meetings) || {}
          )[req.params?.meetingId] || {}
        ).password !== crypto.createHash("sha256").update(req.query?.password || "").digest("hex")
      )
    ) return res.render("pages/error/index.ejs", {
      errorMessage: "Invalid password"
    });
    if (
      (
        (
          JSON.parse(meetings) || {}
        )[req.params?.meetingId] || {}
      ).locked || false
    ) return res.render("pages/error/index.ejs", {
      errorMessage: "Meeting is locked"
    });
    db.get("apps").then((apps) => {
      res.render("meetingCode/index.ejs", {
        meetingId: req.params?.meetingId,
        username: req.query?.username,
        isElectron: req.headers?.["user-agent"].match(/Electron/i),
        icon: (
          (
            JSON.parse(meetings) || {}
          )[req.params?.meetingId] || {}
        ).icon,
        title: (
          (
            JSON.parse(meetings) || {}
          )[req.params?.meetingId] || {}
        ).title,
        password: req.query?.password,
        host: (
          !Object.keys(
            JSON.parse(meetings) || {}
          ).includes(req.params?.meetingId)
        ),
        apps: Object.entries(
          JSON.parse(apps) || {}
        ).map(([appId, { iconType, name, description, verified }]) => [
          appId,
          {
            ...(iconType) ? {
              iconType
            } : {},
            ...(name) ? {
              name
            } : {},
            ...(description) ? {
              description
            } : {},
            ...{
              verified
            }
          }
        ]).reduce((data, app) => ({
          ...data,
          ...{
            [app[0]]: app[1]
          }
        }), {}),
        protocol: "https",
        url: req.get("host"),
        languages: JSON.stringify(languages)
      });
    });
  });
});

app.all("/landingPage/:meetingId", (req, res) => {
  if (!req.params?.meetingId) return res.render("pages/error/index.ejs", {
    errorMessage: "No meeting id was given"
  });
  db.get("meetings").then((meetings) => {
    res.render("pages/landingPage/index.ejs", {
      meetingId: req.params?.meetingId,
      title: (
        (
          JSON.parse(meetings) || {}
        )[req.params?.meetingId] || {}
      ).title,
      icon: (
        (
          JSON.parse(meetings) || {}
        )[req.params?.meetingId] || {}
      ).icon,
      text: (
        (
          JSON.parse(meetings) || {}
        )[req.params?.meetingId] || {}
      ).text,
      passwordExists: Object.keys(
        (
          JSON.parse(meetings) || {}
        )[req.params?.meetingId] || {}
      ).includes("password")
    });
  });
});

app.all("/features", (req, res) => {
  res.sendFile("pages/features/index.html", {
    root: __dirname
  });
});

app.all("/appPortal", (req, res) => {
  res.sendFile("pages/appPortal/index.html", {
    root: __dirname
  });
});

app.all("/desktopApp", (req, res) => {
  res.sendFile("pages/desktopApp/index.html", {
    root: __dirname
  });
});

app.all("/newsletter", (req, res) => {
  res.sendFile("pages/newsletter/index.html", {
    root: __dirname
  });
});

app.all("/newsletterAdmin", (req, res) => {
  res.sendFile("pages/newsletterAdmin/index.html", {
    root: __dirname
  });
});

app.all("/contact", (req, res) => {
  res.sendFile("pages/contact/index.html", {
    root: __dirname
  });
})

app.all("/internet", (req, res) => {
  res.render("pages/error/index.ejs", {
    errorMessage: "No internet connection"
  });
});

app.post("/api/v1/passwords/exists", (req, res) => {
  db.get("meetings").then((meetings) => {
    res.json({
      passwordExists: Object.keys(
        (
          JSON.parse(meetings) || {}
        )[req.body?.meetingId] || {}
      ).includes("password")
    });
  });
});

app.post("/api/v1/passwords/check", (req, res) => {
  db.get("meetings").then((meetings) => {
    res.json({
      correctPassword: crypto.createHash("sha256").update(req.body?.password || "").digest("hex") === (
        (
          JSON.parse(meetings) || {}
        )[req.body?.meetingId] || {}
      ).password
    });
  });
});

app.post("/api/v1/apps/get", (req, res) => {
  db.get("apps").then((apps) => {
    if (
      !Object.keys(
        JSON.parse(apps) || {}
      ).includes(req.body?.appId)
    ) res.json({
      err: "Invalid app id"
    });
    res.json({
      ...{
        appId
      },
      ...(
        (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).icon
      ) ? {
        icon: (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).icon
      } : {},
      ...{
        name: (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).name
      },
      ...(
        (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).description
      ) ? {
        description: (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).description
      } : {}
    });
  });
});

app.post("/api/v1/apps/create", (req, res) => {
  if (
    req.body?.icon && (
      (
        typeof req.body?.icon?.type !== "string"
      ) || (
        req.body?.icon?.type.length < 1
      ) || (
        typeof req.body?.icon?.content !== "string"
      ) || (
        req.body?.icon?.content.length < 1
      )
    )
  ) return res.json({
    err: "Invalid icon"
  });
  if (
    (
      typeof req.body?.name !== "string"
    ) || (
      req.body?.name.length < 1
    )
  ) return res.json({
    err: "Invalid name"
  });
  if (
    req.body?.description && (
      (
        typeof req.body?.description !== "string"
      ) || (
        req.body?.description.length < 1
      )
    )
  ) return res.json({
    err: "Invalid description"
  });
  if (
    req.body?.popup && (
      (
        typeof req.body?.popup !== "string"
      ) || (
        req.body?.popup.length < 1
      )
    )
  ) return res.json({
    err: "Invalid popup"
  });
  if (
    req.body?.script && (
      (
        typeof req.body?.script !== "string"
      ) || (
        req.body?.script.length < 1
      )
    )
  ) return res.json({
    err: "Invalid script"
  });
  if (
    req.body?.password && (
      (
        typeof req.body?.password !== "string"
      ) || (
        req.body?.password.length < 1
      )
    )
  ) return res.json({
    err: "Invalid password"
  });
  crypto.randomBytes(4, (err, appId) => {
    if (err) return res.json({
      err: err.message
    });
    if (err) return res.json({ err: err.message });
    db.get("apps").then((apps) => {
      db.set("apps", JSON.stringify({
        ...JSON.parse(apps),
        ...{
          [appId.toString("hex")]: {
            ...(req.body?.icon) ? {
              iconType: req.body?.icon?.type
            } : {},
            ...{
              popupExists: Boolean(req.body?.popup),
              name: req.body?.name,
              verified: false
            },
            ...(req.body?.description) ? {
              description: req.body?.description
            } : {},
            ...(req.body?.password) ? {
              password: crypto.createHash("sha256").update(req.body?.password).digest("hex")
            } : {}
          }
        }
      })).then(() => {
        fs.mkdirSync("./apps/" + appId.toString("hex"));
        if (req.body?.icon) {
          fs.writeFileSync("./apps/" + appId.toString("hex") + "/icon." + req.body?.icon?.type, req.body?.icon?.content, "utf8");
        }
        if (req.body?.popup) {
          fs.writeFileSync("./apps/" + appId.toString("hex") + "/popup.html", req.body?.popup, "utf8");
        }
        if (req.body?.script) {
          fs.writeFileSync("./apps/" + appId.toString("hex") + "/script.js", req.body?.script, "utf8");
        }
        res.json({
          ...{
            appId: appId.toString("hex")
          },
          ...(req.body?.icon) ? {
            icon: req.body?.icon
          } : {},
          ...{
            name: req.body?.name
          },
          ...(req.body?.description) ? {
            description: req.body?.description
          } : {},
          ...(req.body?.password) ? {
            password: req.body?.password
          } : {},
          ...{
            script: req.body?.script
          }
        });
      });
    });
  });
});

app.post("/api/v1/apps/edit", (req, res) => {
  if (
    req.body?.icon && (
      (
        typeof req.body?.icon?.type !== "string"
      ) || (
        req.body?.icon?.type.length < 1
      ) || (
        typeof req.body?.icon?.content !== "string"
      ) || (
        req.body?.icon?.content.length < 1
      )
    )
  ) return res.json({
    err: "Invalid icon"
  });
  if (
    req.body?.name && (
      (
        typeof req.body?.name !== "string"
      ) || (
        req.body?.name.length < 1
      )
    )
  ) return res.json({
    err: "Invalid name"
  });
  if (
    req.body?.description && (
      (
        typeof req.body?.description !== "string"
      ) || (
        req.body?.description.length < 1
      )
    )
  ) return res.json({
    err: "Invalid description"
  });
  if (
    req.body?.password && (
      (
        typeof req.body?.password !== "string"
      ) || (
        req.body?.password.length < 1
      )
    )
  ) return res.json({
    err: "Invalid password"
  });
  if (
    req.body?.popup && (
      (
        typeof req.body?.popup !== "string"
      ) || (
        req.body?.popup.length < 1
      )
    )
  ) return res.json({
    err: "Invalid popup"
  });
  if (
    req.body?.script && (
      (
        typeof req.body?.script !== "string"
      ) || (
        req.body?.script.length < 1
      )
    )
  ) return res.json({
    err: "Invalid script"
  });
  db.get("apps").then((apps) => {
    if (
      !Object.keys(
        JSON.parse(apps) || {}
      ).includes(req.body?.appId)
    ) return res.json({
      err: "Invalid app id"
    });
    if (
      (
        (
          JSON.parse(apps) || {}
        )[req.body?.appId] || {}
      ).password !== crypto.createHash("sha256").update(req.body?.appPassword).digest("hex")
    ) return res.json({
      err: "Invalid app password"
    });
    db.set("apps", JSON.stringify({
      ...JSON.parse(apps) || {},
      ...{
        [req.body?.appId]: {
          ...(
            JSON.parse(apps) || {}
          )[req.body?.appId],
          ...(req.body?.icon) ? {
            iconType: req.body?.icon?.type
          } : {},
          ...(req.body?.popup) ? {
            popupExists: req.body?.popup.length > 0
          } : {},
          ...(req.body?.name) ? {
            name: req.body?.name
          } : {},
          ...(req.body?.description) ? {
            description: req.body?.description
          } : {},
          ...(req.body?.password) ? {
            password: crypto.createHash("sha256").update(req.body?.password).digest("hex")
          } : {}
        }
      }
    })).then(() => {
      if (req.body?.icon) {
        fs.writeFileSync("./apps/" + req.body?.appId + "/icon." + req.body?.icon?.type, req.body?.icon?.content, "utf8");
      }
      if (req.body?.popup) {
        fs.writeFileSync("./apps/" + req.body?.appId + "/popup.html", req.body?.popup, "utf8");
      }
      if (req.body?.script) {
        fs.writeFileSync("./apps/" + req.body?.appId + "/script.js", req.body?.script, "utf8");
      }
      res.json({
        ...{
          appId: req.body?.appId,
          appPassword: req.body?.appPassword
        },
        ...{
          ...(
            JSON.parse(apps) || {}
          )[req.body?.appId],
          ...(req.body?.icon) ? {
            icon: req.body?.icon
          } : {},
          ...(req.body?.name) ? {
            name: req.body?.name
          } : {},
          ...(req.body?.description) ? {
            description: req.body?.description
          } : {},
          ...(req.body?.password) ? {
            password: crypto.createHash("sha256").update(req.body?.password).digest("hex")
          } : {},
          ...(req.body?.script) ? {
            script: req.body?.script
          } : {}
        }
      });
    });
  });
});

app.post("/api/v1/apps/delete", (req, res) => {
  if (err) return res.json({
    err: err.message
  });
  db.get("apps").then((apps) => {
    if (
      !Object.keys(
        JSON.parse(apps) || {}
      ).includes(req.body?.appId)
    ) return res.json({
      err: "Invalid app id"
    });
    if (
      (
        (
          JSON.parse(apps) || {}
        )[req.body?.appId] || {}
      ).password !== crypto.createHash("sha256").update(req.body?.password).digest("hex")
    ) return res.json({
      err: "Invalid password"
    });
    db.set("apps", JSON.stringify(
      Object.entries(
        JSON.parse(apps) || {}
      ).filter(([appId]) => appId !== req.body?.appId).reduce((data, app) => ({
        ...data,
        ...{
          [app[0]]: app[1]
        }
      }), {})
    )).then(() => {
      if (
        (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).iconType
      ) {
        fs.unlinkSync("./apps/" + req.body?.appId + "/icon." + (
          (
            JSON.parse(apps) || {}
          )[req.body?.appId] || {}
        ).iconType);
      }
      fs.rmSync("./apps/" + req.body?.appId, {
        recursive: true,
        force: true
      });
      res.json({
        appId: req.body?.appId,
        password: req.body?.password
      });
    });
  });
});

app.get("/api/v1/apps/all", (req, res) => {
  res.send({
    apps: Object.entries(
      JSON.parse(apps) || {}
    ).map(([appId, { icon, name, description }]) => [
      appId,
      {
        ...(icon) ? {
          icon
        } : {},
        ...(name) ? {
          name
        } : {},
        ...(description) ? {
          description
        } : {}
      }
    ]).reduce((data, app) => ({
      ...data,
      ...{
        [app[0]]: app[1]
      }
    }), {})
  });
});

app.post("/api/v1/apps/passwords/check", (req, res) => {
  db.get("apps").then((apps) => {
    res.json({
      correctPassword: crypto.createHash("sha256").update(req.body?.password || "").digest("hex") === (
        (
          JSON.parse(apps) || {}
        )[req.body?.appId] || {}
      ).password
    });
  });
});

app.post("/api/v1/newsletter/register", (req, res) => {
  if (
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi.test(req.body?.email)
  ) return res.json({
    err: "Invalid email"
  });
  db.get("newsletter").then((newsletter) => {
    db.set("newsletter", JSON.stringify(
      Array.from(
        new Set(
          [
            ...JSON.parse(newsletter) || [],
            ...[
              req.body?.email
            ]
          ]
        )
      )
    )).then(() => {
      res.json({
        email: req.body?.email
      })
    });
  });
});

app.post("/api/v1/newsletter/send", (req, res) => {
  if (req.body?.password !== process.env.NEWSLETTER_PASSWORD) return res.json({
    err: "Invalid password"
  });
  if (
    (
      typeof req.body?.subject !== "string"
    ) || (
      req.body?.subject.length < 1
    )
  ) return res.json({
    err: "Invalid subject"
  });
  if (
    !["text", "html"].includes(req.body?.type)
  ) return res.json({
    err: "Invalid type"
  });
  if (
    (
      typeof req.body?.text !== "string"
    ) || (
      req.body?.text.length < 1
    )
  ) return res.json({
    err: "Invalid text"
  });
  db.get("newsletter").then((newsletter) => {
    (
      JSON.parse(newsletter) || []
    ).forEach((email) => {
      emailTransport.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: req.body?.subject,
        [req.body?.type]: req.body?.text
      }).then((err, response) => {
        if (err) return res.json({
          err
        });
        res.json(response);
      }).catch(() => {});
    });
    res.json({
      subject: req.body?.subject,
      text: req.body?.text
    });
  });
});

app.post("/api/v1/newsletter/password/check", (req, res) => {
  res.json({
    correctPassword: req.body?.password === process.env.NEWSLETTER_PASSWORD
  });
});

app.all("/recordings/:recordingId", (req, res) => {
  if (!fs.readdirSync("./recordings").includes(req.params?.recordingId + ".webm")) return res.render("pages/error/index.ejs", {
    errorMessage: "Invalid recording id"
  });
  res.sendFile("recordings/" + req.params?.recordingId + ".webm", {
    root: __dirname
  });
  /*db.get("recordings").then((recordings) => {
    if (
      !Object.keys(
        JSON.parse(recordings) || {}
      ).includes(req.params?.recordingId)
    ) return res.render("pages/error/index.ejs", {
      errorMessage: "Invalid recording id"
    });
    let readStream = new stream.Readable();
    (
      JSON.parse(recordings) || {}
    )[req.params?.recordingId].map((chunk) => {
      readStream.push(
        Buffer.from(
          chunk
        )
      );
    });
    readStream.push(null);
    res.set("Content-Type", "video/webm");
    readStream.pipe(res);
  });*/
});

app.all("/transcripts/:transcriptId", (req, res) => {
  db.get("transcripts").then((transcripts) => {
    if (!Object.keys(
      JSON.parse(transcripts) || {}
    ).includes(req.params?.transcriptId)) return res.render("pages/error/index.ejs", {
      errorMessage: "Invalid transcript id"
    });
    res.end(
      (
        (
          (
            JSON.parse(transcripts) || {}
          )[req.params?.transcriptId] || []
        )[1] || []
      ).map(([transcriptUserId, transcriptText]) => (
        (
          (
            (
              JSON.parse(transcripts) || {}
            )[req.params?.transcriptId] || []
          )[0] || {}
        ) || {}
      )[transcriptUserId][1] + ": " + transcriptText).join("\n")
    );
  });
});

app.all("/apps/:appId", (req, res) => {
  if (!fs.readdirSync("./apps").includes(req.params?.appId + ".js")) return res.render("pages/error/index.ejs", {
    errorMessage: "Invalid app id"
  });
  res.sendFile("apps/" + req.params?.appId + ".js", {
    root: __dirname
  });
});

/*app.all("/livestreams/:livestreamId", (req, res) => {
  if (
    !Object.keys(
      livestreams || {}
    ).includes(req.params?.livestreamId)
  ) return res.render("pages/error/index.ejs", {
    errorMessage: "Invalid livestream id"
  });
  (
    livestreams || {}
  )[req.params?.livestreamId].pipe(res);
});*/

app.all("/manifest.json", (req, res) => {
  res.sendFile("manifest.json", {
    root: __dirname
  });
});

app.all("/serviceWorker.js", (req, res) => {
  res.sendFile("serviceWorker.js", {
    root: __dirname
  });
});

app.all("/robots.txt", (req, res) => {
  res.sendFile("robots.txt", {
    root: __dirname
  });
});

app.all("/sitemap.xml", (req, res) => {
  res.sendFile("sitemap.xml", {
    root: __dirname
  });
});

app.all("/*", (req, res) => {
  res.render("pages/error/index.ejs", {
    errorMessage: "404 - This page doesn't exist"
  });
});

const listen = http.listen(process.env.PORT || 3000, () => {
  console.log("Server is ready on port", listen.address().port);
});