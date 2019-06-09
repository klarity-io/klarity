// import "./Video.css";
import AgoraRTC from "agora-rtc-sdk";
import AgoraSignal from "../AgoraSig-1.4.0";
import Controls from "../Controls/Controls";
const Google = require("./config.json");

// import localConfig from '../../localconfig.js';

let remoteContainer = document.getElementById("remote");
let remoteMinimized = document.getElementById("minimized-remote");
let remotes = [];
let chatChannel = null;
let recognition = null;
let streams = [];
const streamsMap = new Map();
let positions = {
  big: null,
  small1: null,
  small2: null,
  small3: null,
  small4: null
};
let streamPositions = {};
let localStream = null;
const differentLanguage = new Set();
/**
 * @name addVideoStream
 * @param streamId
 * @description Helper function to add the video stream to "remote-container"
 */
function addVideoStream(streamId) {
  remotes.push(streamId);
  let streamDiv = document.createElement("div"); // Create a new div for every stream
  streamDiv.id = String(streamId); // Assigning id to div
  streamDiv.style.transform = "rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
  if (remotes.length > 1) {
    streamDiv.className = "minimized-video video-margin";
    remoteMinimized.appendChild(streamDiv); // Add new div to container
  } else {
    streamDiv.style.height = "100%";
    remoteContainer.appendChild(streamDiv); // Add new div to container
  }
}

/**
 * @name removeVideoStream
 * @param evt - Remove event
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoStream(evt) {
  console.log("remove video-stream called");
  let stream = evt.stream;
  if (stream) {
    stream.close();
    remotes = remotes.filter(e => e !== stream.getId());
    // console.log('remove ',stream.getId(), remotes);
    let remDiv = document.getElementById(stream.getId());
    remDiv.parentNode.removeChild(remDiv);
    console.log("Remote stream is removed " + stream.getId());
  }
}

/**
 * @name handleFail
 * @param err - error thrown by any function
 * @description Helper function to handle errors
 */
let handleFail = function (err) {
  console.log("Error : ", err);
};

function signalInit(name, language) {
  const signalClient = AgoraSignal("3e30ad81f5ab46f685143d81f0666c6f");
  // const queryString = location.search.split("=");
  // const name = queryString[1] ? queryString[1] : null;
  const session = signalClient.login(name, "_no_need_token");
  session.onLoginSuccess = function (uid) {
    /* Join a channel. */
    var channel = session.channelJoin("abcd5");
    channel.onChannelJoined = function () {
      chatChannel = channel;
      chatChannel.messageChannelSend(
        JSON.stringify({
          init: true,
          language: language
        })
      );
      channel.onMessageChannelReceive = function (account, uid, msg) {
        console.log(account, uid, msg);
        const payload = JSON.parse(msg);
        if (payload.init) {
          if (payload.language !== language) {
            console.log(account + 'has different language');
            differentLanguage.add(account);
            if (positions[streamPositions[account]]) {
              console.log('muting this stream', positions[streamPositions[account]]);
              positions[streamPositions[account]].muteAudio();
            }
          } else {
            differentLanguage.delete(account);
          }
          return;
        }
        if (payload.language === language) {
          addTranscribe(
            payload.resultIndex,
            account,
            payload.interim_transcript || payload.final_transcript,
            account === name
          );
        } else {
          translateLanguage(payload.interim_transcript || payload.final_transcript, {
            from: payload.language,
            to: language,
            callback: function(translated) {
              addTranscribe(
                payload.resultIndex,
                account,
                translated,
                account === name
              );
              if (!payload.final_transcript) return;
              var msg = new SpeechSynthesisUtterance();
              // Set the text.
              msg.text = translated;
              
              // Set the attributes.
              msg.volume = 1;
              msg.rate = 1;
              msg.pitch = 1;
              msg.voice = speechSynthesis.getVoices().filter(function(voice) { return voice.name == 'Google हिन्दी'; })[0];
              speechSynthesis.speak(msg);
            }
          });
        }
      };
    };
  };
  session.onLogout = function (ecode) {
    /* Set the onLogout callback. */
  };
}

/**
 * @name handleFail
 * @param client - RTC Client
 * @description Function takes in a client and returns a promise which will resolve {localStream and client}
 */
export default function video(client) {
  var queryString = document.location.search;
  var dict = parseQueryStringToDictionary(queryString);
  const name = dict.user;
  const language = dict.lang;
  signalInit(name, language);
  let resolve;
  client.init(
    "3e30ad81f5ab46f685143d81f0666c6f",
    function () {
      console.log("AgoraRTC client initialized");
    },
    function (err) {
      console.log("AgoraRTC client init failed", err);
    }
  );
  // Start coding here
  client.join(
    "3e30ad81f5ab46f685143d81f0666c6f",
    "abcd5",
    name,
    function (uid) {
      localStream = AgoraRTC.createStream({
        streamID: uid,
        audio: true,
        video: true,
        screen: false
      });
      window.localStream = localStream;
      localStream.setVideoProfile("480p")
      localStream.init(
        function () {
          console.log("getUserMedia successfully");
          localStream.play("me");
          recognition = new webkitSpeechRecognition();
          recognition.continuous = true;
          if (language === 'en') {
            recognition.lang = "en-IN";
          } else {
            recognition.lang = "hi-IN";
          }
          recognition.interimResults = true;
          startTranscribe(language);
          // Controls({localStream: localStream, recognition: recognition, client: client});
          client.publish(localStream, function (err) {
            console.log("Publish local stream error: " + err);
          });
        },
        function (err) {
          console.log("getUserMedia failed", err);
        }
      );
      console.log("User " + uid + " join channel successfully");
      client.on("stream-published", function (evt) {
        console.log("Publish local stream successfully");
      });

      client.on("stream-added", function (evt) {
        var stream = evt.stream;
        console.log("New stream added: " + stream.getId());

        client.subscribe(stream, function (err) {
          console.log("Subscribe stream failed", err);
        });
      });
      client.on("peer-leave", function (evt) {
        var remoteStream = streamsMap.get(evt.uid);
        console.log("Stream removed: " + remoteStream.getId());
        try {
        if(remoteStream!=localStream)
        {
          streamsMap.delete(evt.uid);
          remoteStream.stop();
          
         }
        } catch(err) {
            console.log("peer-leave remote stream stop error");
        }
        // if (streams.length == 1) {
        //     if (remoteStream != localStream){
        //         const bigSteam = positions.big;
        //         bigSteam.stop();
        //         localStream.play('big');
        //         bigSteam.play(streamPositions[localStream.getId()]);
        //     }else{
        //         localStream.play('big');
        //         bigSteam.play(streamPositions[localStream.getId()]);
        //     }
        //     for (i=0;i<streams.length;i++){
        //         sstream = positions['small' + i];
        //         sstream.stop();
        //     }
        // }
        
        const lastStream = positions['small' + streamsMap.size];
        if (lastStream === remoteStream) {
          positions["small" + streamsMap.size] = null;
          return;
        }
        lastStream.stop();
        lastStream.play(streamPositions[evt.uid]);
        positions[streamPositions[evt.uid]] = lastStream;
      });
      client.on("stream-subscribed", function (evt) {
        var remoteStream = evt.stream;
        console.log(
          "Subscribe remote stream successfully: " + remoteStream.getId()
        );
        // remoteStream.play('remote' + remoteStream.getId());
        streamsMap.set(remoteStream.getId(), remoteStream);
        if (!positions.big || !streamsMap.has(positions.big.getId())) {
          positions.big = remoteStream;
          streamPositions[remoteStream.getId()] = 'big';
          remoteStream.play("big");
          return;
        }
        remoteStream.play("small" + (streamsMap.size - 1));
        positions["small" + (streamsMap.size - 1)] = remoteStream;
        streamPositions[remoteStream.getId()] = "small" + (streamsMap.size - 1);
        if (differentLanguage.has(remoteStream.getId())) {
          console.log('muting ' + remoteStream.getId());
          remoteStream.muteAudio();
        }
        chatChannel.messageChannelSend(
          JSON.stringify({
            init: true,
            language: language
          })
        );
      });
    },
    function (err) {
      console.log("Join channel failed", err);
    }
  );
  document.getElementById('chattextarea').addEventListener("keyup", function (e) {
    if (e.keyCode === 13) {
        chatChannel.messageChannelSend(
          JSON.stringify({
            resultIndex: (Math.random() * new Date().getTime()).toString(36).replace(/\./g, ""),
            final_transcript: document.getElementById('chattextarea').value,
            interim_transcript: "",
            language: language
          })
        );
        document.getElementById('chattextarea').value = "";
    }
  }, false);
  return new Promise((res, rej) => {
    resolve = res;
  });
}

function startTranscribe(language) {
  recognition.onstart = function () {
    console.info("started recognition");
  };

  recognition.onerror = function (event) {
    console.error(event.error);
  };

  recognition.onresult = function (event) {
    console.log(event);
    var interim_transcript = "";
    var final_transcript = "";
    if (typeof event.results == "undefined") {
      recognition.onend = null;
      recognition.stop();
      upgrade();
      return;
    }
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }
    if (!chatChannel) return;
    chatChannel.messageChannelSend(
      JSON.stringify({
        resultIndex: event.resultIndex,
        final_transcript: final_transcript,
        interim_transcript: interim_transcript,
        language: language
      })
    );
  };
  recognition.start();
}

function translateLanguage(text, config) {
  console.log('translate ' + text);
  config = config || {};
  var api_key = config.api_key || "AIzaSyC2ofxKSA9xOM7V9XEjQW5-Ps0eSRXgLgE";

  var newScript = document.createElement("script");
  newScript.type = "text/javascript";

  var sourceText = encodeURIComponent(text);

  var randomNumber =
    "method" +
    (Math.random() * new Date().getTime()).toString(36).replace(/\./g, "");
  window[randomNumber] = function (response) {
    if (response.data && response.data.translations[0] && config.callback) {
      config.callback(response.data.translations[0].translatedText);
      return;
    }

    if (response.error && response.error.message == "Daily Limit Exceeded") {
      // config.callback(
      //   'Google says, "Daily Limit Exceeded". Please try this experiment a few hours later.'
      // );
      return;
    }

    if (response.error) {
      console.error(response.error.message);
      return;
    }

    console.error(response);
  };

  var source = `https://www.googleapis.com/language/translate/v2?key=${api_key}&target=${config.to}&source=${config.from}&callback=window.${randomNumber}&q=${sourceText}`;
  newScript.src = source;
  document.getElementsByTagName("head")[0].appendChild(newScript);  
}

const template =
  '<div class="message" id={{messageid}}><div class="text inline"><div class="name"></div><div class="msg"></div></div></div>';
const templateOwn =
  '<div class="message own" id={{messageid}}><div class="text inline"><div class="name"></div><div class="msg"></div></div></div>';
function addTranscribe(index, name, message, isOwn) {
  let messageElement = document.getElementById(name + index);
  if (!messageElement) {
    const constainer = document.getElementById("history");
    const newTemp = isOwn
      ? templateOwn.replace("{{messageid}}", name + index)
      : template.replace("{{messageid}}", name + index);
    constainer.innerHTML += newTemp;
    messageElement = document.getElementById(name + index);
  }
  messageElement.querySelector(".name").innerHTML = name;
  messageElement.querySelector(".msg").innerHTML = message;
  var objDiv = document.getElementById("history");
  objDiv.scrollTop = objDiv.scrollHeight;
}

function parseQueryStringToDictionary(queryString) {
  var dictionary = {};

  // remove the '?' from the beginning of the
  // if it exists
  if (queryString.indexOf("?") === 0) {
    queryString = queryString.substr(1);
  }

  // Step 1: separate out each key/value pair
  var parts = queryString.split("&");

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    // Step 2: Split Key/Value pair
    var keyValuePair = p.split("=");

    // Step 3: Add Key/Value pair to Dictionary object
    var key = keyValuePair[0];
    var value = keyValuePair[1];

    // decode URI encoded string
    value = decodeURIComponent(value);
    value = value.replace(/\+/g, " ");

    dictionary[key] = value;
  }

  // Step 4: Return Dictionary Object
  return dictionary;
}
