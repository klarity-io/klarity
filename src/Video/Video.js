// import "./Video.css";
import AgoraRTC from "agora-rtc-sdk";
import AgoraSignal from "../AgoraSig-1.4.0";
import Controls from '../Controls/Controls'
import hark from 'hark';

let remoteContainer = document.getElementById("remote");
let remoteMinimized = document.getElementById("minimized-remote");
let remotes = [];
let chatChannel = null;
let recognition = null;
let streams = [];
let positions = {
  "big": null,
  "small1": null,
  "small2": null,
  "small3": null,
  "small4": null,
};
let streamPositions = {}
let localStream = null;
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
let handleFail = function(err) {
  console.log("Error : ", err);
};

function signalInit(name) {
  const signalClient = AgoraSignal("3e30ad81f5ab46f685143d81f0666c6f");
  // const queryString = location.search.split("=");
  // const name = queryString[1] ? queryString[1] : null;
  const session = signalClient.login(name, "_no_need_token");
  session.onLoginSuccess = function(uid) {
    /* Join a channel. */
    var channel = session.channelJoin("abcd1");
    channel.onChannelJoined = function() {
      chatChannel = channel;
      channel.onMessageChannelReceive = function(account, uid, msg) {
        console.log(account, uid, msg);
        const payload = JSON.parse(msg);
        addTranscribe(payload.resultIndex, account, payload.interim_transcript || payload.final_transcript, account === name);
      };
      /* Send a channel message. */
      // channel.messageChannelSend("hello");
      /* Logout of the system. */
      // session.logout();
    };
  };
  session.onLogout = function(ecode) {
    /* Set the onLogout callback. */
  };
}

/**
 * @name handleFail
 * @param client - RTC Client
 * @description Function takes in a client and returns a promise which will resolve {localStream and client}
 */
export default function video(client) {
  const queryString = location.search.split("=");
  const name = queryString[1] ? queryString[1] : null;
  signalInit(name);
  let resolve;
  client.init(
    "3e30ad81f5ab46f685143d81f0666c6f",
    function() {
      console.log("AgoraRTC client initialized");
    },
    function(err) {
      console.log("AgoraRTC client init failed", err);
    }
  );
  // Start coding here
  client.join(
    "3e30ad81f5ab46f685143d81f0666c6f",
    "abcd1",
    name,
    function(uid) {
      
      localStream = AgoraRTC.createStream({
        streamID: uid,
        audio: true,
        video: true,
        screen: false
      });
      window.localStream = localStream;
      localStream.setVideoProfile("480p")
      localStream.init(
        function() {
          console.log("getUserMedia successfully");
          streams.push(localStream);
          if (positions.big) {
            localStream.play('small' + (streams.length - 1));
            positions['small' + (streams.length - 1)] = localStream;
            streamPositions[localStream.getId()] = 'small' + (streams.length - 1);
          } else {
            localStream.play("big");
            positions.big = localStream;
            streamPositions[localStream.getId()] = 'big';
          }
          recognition = new webkitSpeechRecognition();
          recognition.continuous = true;
          recognition.lang = "en-IN";
          recognition.interimResults = true;
          startTranscribe();
          // Controls({localStream: localStream, recognition: recognition, client: client});
          client.publish(localStream, function(err) {
            console.log("Publish local stream error: " + err);
          });
        },
        function(err) {
          console.log("getUserMedia failed", err);
        }
      );
      console.log("User " + uid + " join channel successfully");
      client.on("stream-published", function(evt) {
        console.log("Publish local stream successfully");
      });

      client.on("stream-added", function(evt) {
        var stream = evt.stream;
        console.log("New stream added: " + stream.getId());

        client.subscribe(stream, function(err) {
          console.log("Subscribe stream failed", err);
        });
      });
      client.on("peer-leave", function(evt) {
        var remoteStream = positions[streamPositions[evt.uid]];
        console.log("Stream removed: " + remoteStream.getId());
        try {
          remoteStream.stop();
        } catch(err) {
            console.log("peer-leave remote stream stop error");
        }
        if (streams.length == 1) {
            const bigSteam = positions.big;
            bigSteam.stop();
            localStream.play('big');
            bigSteam.play(streamPositions[localStream.getId()]);
            for (i=0;i<streams.length;i++){
                sstream = positions['small' + (streams.length - 1)];
                sstream.stop();
            }
        }
        
        const lastStream = positions['small' + (streams.length - 1)];
        if (lastStream === remoteStream) {
          positions['small' + (streams.length - 1)] = null;
          return;
        }
        var index = streams.indexOf(remoteStream);
        if (index > -1) {
          streams.splice(index, 1);
        }
        positions[streamPositions[remoteStream.getId()]] = null;
        lastStream.stop();
        lastStream.play(streamPositions[remoteStream.getId()]);
      });
      client.on("active-speaker", function(evt) {
        var remoteStream = positions[streamPositions[evt.uid]];
        if (!remoteStream) return;
        console.log("active-speaker: " + remoteStream.getId());
        if (positions.big === remoteStream) return;
        const bigSteam = positions.big;
        remoteStream.stop();
        bigSteam.stop();
        remoteStream.play('big');
        bigSteam.play(streamPositions[remoteStream.getId()]);
        positions.big = remoteStream;
        positions[streamPositions[remoteStream.getId()]] = localStream;
      });
      client.on("stream-subscribed", function(evt) {
        var remoteStream = evt.stream;
        console.log(
          "Subscribe remote stream successfully: " + remoteStream.getId()
        );
        // remoteStream.play('remote' + remoteStream.getId());
        streams.push(remoteStream);
        if (positions.big === localStream) {
          localStream.stop();
          localStream.play('small' + (streams.length - 1));
          positions['small' + (streams.length - 1)] = localStream;
          streamPositions[localStream.getId()] = 'small' + (streams.length - 1);
          remoteStream.play("big");
          positions.big = remoteStream;
          streamPositions[remoteStream.getId()] = 'big';
        } else {
          remoteStream.play('small' + (streams.length - 1));
          positions['small' + (streams.length - 1)] = remoteStream;
          streamPositions[remoteStream.getId()] = 'small' + (streams.length - 1);
        }
      });
    },
    function(err) {
      console.log("Join channel failed", err);
    }
  );
  return new Promise((res, rej) => {
    resolve = res;
  });
}


function startTranscribe() {

  recognition.onstart = function() {
    console.info('started recognition');
  };

  recognition.onerror = function(event) {
    console.error(event.error);
  };

  recognition.onresult = function(event) {
    console.log(event);
    var interim_transcript = '';
    var final_transcript = '';
    if (typeof(event.results) == 'undefined') {
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
    chatChannel.messageChannelSend(JSON.stringify({
      resultIndex: event.resultIndex,
      final_transcript: final_transcript,
      interim_transcript: interim_transcript,
    }));

  };
  recognition.start();
}

function Translator() {
    this.translateLanguage = function(text, config) {

        config = config || { };
        var api_key = config.api_key || Google_Translate_API_KEY;

        var newScript = document.createElement('script');
        newScript.type = 'text/javascript';

        var sourceText = encodeURIComponent(text);

        var randomNumber = 'method' + (Math.random() * new Date().getTime()).toString(36).replace( /\./g , '');
        window[randomNumber] = function(response) {
            if (response.data && response.data.translations[0] && config.callback) {
                config.callback(response.data.translations[0].translatedText);
                return;
            }

            if(response.error && response.error.message == 'Daily Limit Exceeded') {
                config.callback('Google says, "Daily Limit Exceeded". Please try this experiment a few hours later.');
                return;
            }

            if (response.error) {
                console.error(response.error.message);
                return;
            }

            console.error(response);
        };

        var source = 'https://www.googleapis.com/language/translate/v2?key=' + api_key + '&target=' + (config.to || 'en-US') + '&source=' + (config.from || 'en-US') + '&callback=window.' + randomNumber + '&q=' + sourceText;
        newScript.src = source;
        document.getElementsByTagName('head')[0].appendChild(newScript);
    };

    var Google_Translate_API_KEY = 'YOUR_API_KEY';
}

const template = '<div class="message" id={{messageid}}><div class="text inline"><div class="name"></div><div class="msg"></div></div></div>';
const templateOwn = '<div class="message own" id={{messageid}}><div class="text inline"><div class="name"></div><div class="msg"></div></div></div>';
function addTranscribe(index, name, message, isOwn) {
  let messageElement = document.getElementById(name + index);
  if (!messageElement) {
    const constainer = document.getElementById('history');
    const newTemp = isOwn ? templateOwn.replace('{{messageid}}', name + index) : template.replace('{{messageid}}', name + index);
    constainer.innerHTML += newTemp;
    messageElement = document.getElementById(name + index);
  }
  messageElement.querySelector('.name').innerHTML = name;
  messageElement.querySelector('.msg').innerHTML = message;
}