(function(FuseBox){FuseBox.$fuse$=FuseBox;
FuseBox.target = "browser";
// allowSyntheticDefaultImports
FuseBox.sdep = true;
FuseBox.pkg("default", {}, function(___scope___){
___scope___.file("index.js", function(exports, require, module, __filename, __dirname){

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agora_rtc_sdk_1 = require("agora-rtc-sdk");
require("./index.css");
const Video_1 = require("./Video/Video");
const Controls_1 = require("./Controls/Controls");
let client = agora_rtc_sdk_1.default.createClient({ mode: 'rtc', codec: "h264" });
Video_1.default(client).then(function (value) {
    Controls_1.default(value);
});

});
___scope___.file("index.css", function(exports, require, module, __filename, __dirname){


require("default/bundle.css")
});
___scope___.file("Video/Video.js", function(exports, require, module, __filename, __dirname){

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import "./Video.css";
const agora_rtc_sdk_1 = require("agora-rtc-sdk");
const AgoraSig_1_4_0_1 = require("../AgoraSig-1.4.0");
const Controls_1 = require("../Controls/Controls");
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
    }
    else {
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
    const signalClient = AgoraSig_1_4_0_1.default("3e30ad81f5ab46f685143d81f0666c6f");
    // const queryString = location.search.split("=");
    // const name = queryString[1] ? queryString[1] : null;
    const session = signalClient.login(name, "_no_need_token");
    session.onLoginSuccess = function (uid) {
        /* Join a channel. */
        var channel = session.channelJoin("abcd5");
        channel.onChannelJoined = function () {
            chatChannel = channel;
            chatChannel.messageChannelSend(JSON.stringify({
                init: true,
                language: language
            }));
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
                    }
                    else {
                        differentLanguage.delete(account);
                    }
                    return;
                }
                if (payload.language === language) {
                    addTranscribe(payload.resultIndex, account, payload.interim_transcript || payload.final_transcript, account === name);
                }
                else {
                    translateLanguage(payload.interim_transcript || payload.final_transcript, {
                        from: payload.language,
                        to: language,
                        callback: function (translated) {
                            addTranscribe(payload.resultIndex, account, translated, account === name);
                            if (!payload.final_transcript)
                                return;
                            var msg = new SpeechSynthesisUtterance();
                            // Set the text.
                            msg.text = translated;
                            // Set the attributes.
                            msg.volume = 1;
                            msg.rate = 1;
                            msg.pitch = 1;
                            msg.voice = speechSynthesis.getVoices().filter(function (voice) { return voice.name == 'Google हिन्दी'; })[0];
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
function video(client) {
    var queryString = document.location.search;
    var dict = parseQueryStringToDictionary(queryString);
    const name = dict.user || "User-" + (Math.random() * new Date().getTime()).toString(36).replace(/\./g, "").substring(0, 4);
    const language = dict.lang || 'en';
    signalInit(name, language);
    let resolve;
    client.init("3e30ad81f5ab46f685143d81f0666c6f", function () {
        console.log("AgoraRTC client initialized");
    }, function (err) {
        console.log("AgoraRTC client init failed", err);
    });
    // Start coding here
    client.join("3e30ad81f5ab46f685143d81f0666c6f", "abcd5", name, function (uid) {
        localStream = agora_rtc_sdk_1.default.createStream({
            streamID: uid,
            audio: true,
            video: true,
            screen: false
        });
        window.localStream = localStream;
        localStream.setVideoProfile("480p");
        localStream.init(function () {
            console.log("getUserMedia successfully");
            localStream.play("me");
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            if (language === 'en') {
                recognition.lang = "en-IN";
            }
            else {
                recognition.lang = "hi-IN";
            }
            recognition.interimResults = true;
            startTranscribe(language);
            Controls_1.default({ localStream: localStream, recognition: recognition, client: client });
            client.publish(localStream, function (err) {
                console.log("Publish local stream error: " + err);
            });
        }, function (err) {
            console.log("getUserMedia failed", err);
        });
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
            streamsMap.delete(evt.uid);
            try {
                if (remoteStream != localStream) {
                    streamsMap.delete(evt.uid);
                    remoteStream.stop();
                }
            }
            catch (err) {
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
            if (lastStream) {
                lastStream.stop();
                lastStream.play(streamPositions[evt.uid]);
                positions[streamPositions[evt.uid]] = lastStream;
            }
        });
        client.on("stream-subscribed", function (evt) {
            var remoteStream = evt.stream;
            console.log("Subscribe remote stream successfully: " + remoteStream.getId());
            if (chatChannel) {
                chatChannel.messageChannelSend(JSON.stringify({
                    init: true,
                    language: language
                }));
            }
            // remoteStream.play('remote' + remoteStream.getId());
            streamsMap.set(remoteStream.getId(), remoteStream);
            if (!positions.big || !streamsMap.has(positions.big.getId()) || positions.big.getId() === remoteStream.getId()) {
                positions.big = remoteStream;
                streamPositions[remoteStream.getId()] = 'big';
                remoteStream.play("big");
                if (differentLanguage.has(remoteStream.getId())) {
                    console.log('muting ' + remoteStream.getId());
                    remoteStream.muteAudio();
                }
                return;
            }
            remoteStream.play("small" + (streamsMap.size - 1));
            positions["small" + (streamsMap.size - 1)] = remoteStream;
            streamPositions[remoteStream.getId()] = "small" + (streamsMap.size - 1);
            if (differentLanguage.has(remoteStream.getId())) {
                console.log('muting ' + remoteStream.getId());
                remoteStream.muteAudio();
            }
        });
    }, function (err) {
        console.log("Join channel failed", err);
    });
    document.getElementById('chattextarea').addEventListener("keyup", function (e) {
        if (e.keyCode === 13) {
            chatChannel.messageChannelSend(JSON.stringify({
                resultIndex: (Math.random() * new Date().getTime()).toString(36).replace(/\./g, ""),
                final_transcript: document.getElementById('chattextarea').value,
                interim_transcript: "",
                language: language
            }));
            document.getElementById('chattextarea').value = "";
        }
    }, false);
    return new Promise((res, rej) => {
        resolve = res;
    });
}
exports.default = video;
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
            }
            else {
                interim_transcript += event.results[i][0].transcript;
            }
        }
        if (!chatChannel)
            return;
        chatChannel.messageChannelSend(JSON.stringify({
            resultIndex: event.resultIndex,
            final_transcript: final_transcript,
            interim_transcript: interim_transcript,
            language: language
        }));
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
    var randomNumber = "method" +
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
const template = '<div class="message" id={{messageid}}><div class="text inline"><div class="name"></div><div class="msg"></div></div></div>';
const templateOwn = '<div class="message own" id={{messageid}}><div class="text inline"><div class="name"></div><div class="msg"></div></div></div>';
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

});
___scope___.file("AgoraSig-1.4.0.js", function(exports, require, module, __filename, __dirname){
/* fuse:injection: */ var Buffer = require("buffer").Buffer;
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Signal=t():e.Signal=t()}(window,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=47)}([function(e,t){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(e){"object"==typeof window&&(n=window)}e.exports=n},function(e,t){var n,r,i=e.exports={};function a(){throw new Error("setTimeout has not been defined")}function o(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===a||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:a}catch(e){n=a}try{r="function"==typeof clearTimeout?clearTimeout:o}catch(e){r=o}}();var l,u=[],f=!1,h=-1;function c(){f&&l&&(f=!1,l.length?u=l.concat(u):h=-1,u.length&&d())}function d(){if(!f){var e=s(c);f=!0;for(var t=u.length;t;){for(l=u,u=[];++h<t;)l&&l[h].run();h=-1,t=u.length}l=null,f=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===o||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function _(e,t){this.fun=e,this.array=t}function p(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];u.push(new _(e,t)),1!==u.length||f||s(d)},_.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=p,i.addListener=p,i.once=p,i.off=p,i.removeListener=p,i.removeAllListeners=p,i.emit=p,i.prependListener=p,i.prependOnceListener=p,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},function(e,t){"function"==typeof Object.create?e.exports=function(e,t){e.super_=t,e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}})}:e.exports=function(e,t){e.super_=t;var n=function(){};n.prototype=t.prototype,e.prototype=new n,e.prototype.constructor=e}},function(e,t,n){"use strict";var r=n(6),i=Object.keys||function(e){var t=[];for(var n in e)t.push(n);return t};e.exports=h;var a=n(5);a.inherits=n(2);var o=n(13),s=n(11);a.inherits(h,o);for(var l=i(s.prototype),u=0;u<l.length;u++){var f=l[u];h.prototype[f]||(h.prototype[f]=s.prototype[f])}function h(e){if(!(this instanceof h))return new h(e);o.call(this,e),s.call(this,e),e&&!1===e.readable&&(this.readable=!1),e&&!1===e.writable&&(this.writable=!1),this.allowHalfOpen=!0,e&&!1===e.allowHalfOpen&&(this.allowHalfOpen=!1),this.once("end",c)}function c(){this.allowHalfOpen||this._writableState.ended||r.nextTick(d,this)}function d(e){e.end()}Object.defineProperty(h.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),Object.defineProperty(h.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed&&this._writableState.destroyed)},set:function(e){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=e,this._writableState.destroyed=e)}}),h.prototype._destroy=function(e,t){this.push(null),this.end(),r.nextTick(t,e)}},function(e,t,n){"use strict";(function(e){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
var r=n(23),i=n(24),a=n(12);function o(){return l.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function s(e,t){if(o()<t)throw new RangeError("Invalid typed array length");return l.TYPED_ARRAY_SUPPORT?(e=new Uint8Array(t)).__proto__=l.prototype:(null===e&&(e=new l(t)),e.length=t),e}function l(e,t,n){if(!(l.TYPED_ARRAY_SUPPORT||this instanceof l))return new l(e,t,n);if("number"==typeof e){if("string"==typeof t)throw new Error("If encoding is specified then the first argument must be a string");return h(this,e)}return u(this,e,t,n)}function u(e,t,n,r){if("number"==typeof t)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&t instanceof ArrayBuffer?function(e,t,n,r){if(t.byteLength,n<0||t.byteLength<n)throw new RangeError("'offset' is out of bounds");if(t.byteLength<n+(r||0))throw new RangeError("'length' is out of bounds");t=void 0===n&&void 0===r?new Uint8Array(t):void 0===r?new Uint8Array(t,n):new Uint8Array(t,n,r);l.TYPED_ARRAY_SUPPORT?(e=t).__proto__=l.prototype:e=c(e,t);return e}(e,t,n,r):"string"==typeof t?function(e,t,n){"string"==typeof n&&""!==n||(n="utf8");if(!l.isEncoding(n))throw new TypeError('"encoding" must be a valid string encoding');var r=0|_(t,n),i=(e=s(e,r)).write(t,n);i!==r&&(e=e.slice(0,i));return e}(e,t,n):function(e,t){if(l.isBuffer(t)){var n=0|d(t.length);return 0===(e=s(e,n)).length?e:(t.copy(e,0,0,n),e)}if(t){if("undefined"!=typeof ArrayBuffer&&t.buffer instanceof ArrayBuffer||"length"in t)return"number"!=typeof t.length||function(e){return e!=e}(t.length)?s(e,0):c(e,t);if("Buffer"===t.type&&a(t.data))return c(e,t.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(e,t)}function f(e){if("number"!=typeof e)throw new TypeError('"size" argument must be a number');if(e<0)throw new RangeError('"size" argument must not be negative')}function h(e,t){if(f(t),e=s(e,t<0?0:0|d(t)),!l.TYPED_ARRAY_SUPPORT)for(var n=0;n<t;++n)e[n]=0;return e}function c(e,t){var n=t.length<0?0:0|d(t.length);e=s(e,n);for(var r=0;r<n;r+=1)e[r]=255&t[r];return e}function d(e){if(e>=o())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+o().toString(16)+" bytes");return 0|e}function _(e,t){if(l.isBuffer(e))return e.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(e)||e instanceof ArrayBuffer))return e.byteLength;"string"!=typeof e&&(e=""+e);var n=e.length;if(0===n)return 0;for(var r=!1;;)switch(t){case"ascii":case"latin1":case"binary":return n;case"utf8":case"utf-8":case void 0:return F(e).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*n;case"hex":return n>>>1;case"base64":return Z(e).length;default:if(r)return F(e).length;t=(""+t).toLowerCase(),r=!0}}function p(e,t,n){var r=e[t];e[t]=e[n],e[n]=r}function g(e,t,n,r,i){if(0===e.length)return-1;if("string"==typeof n?(r=n,n=0):n>2147483647?n=2147483647:n<-2147483648&&(n=-2147483648),n=+n,isNaN(n)&&(n=i?0:e.length-1),n<0&&(n=e.length+n),n>=e.length){if(i)return-1;n=e.length-1}else if(n<0){if(!i)return-1;n=0}if("string"==typeof t&&(t=l.from(t,r)),l.isBuffer(t))return 0===t.length?-1:m(e,t,n,r,i);if("number"==typeof t)return t&=255,l.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(e,t,n):Uint8Array.prototype.lastIndexOf.call(e,t,n):m(e,[t],n,r,i);throw new TypeError("val must be string, number or Buffer")}function m(e,t,n,r,i){var a,o=1,s=e.length,l=t.length;if(void 0!==r&&("ucs2"===(r=String(r).toLowerCase())||"ucs-2"===r||"utf16le"===r||"utf-16le"===r)){if(e.length<2||t.length<2)return-1;o=2,s/=2,l/=2,n/=2}function u(e,t){return 1===o?e[t]:e.readUInt16BE(t*o)}if(i){var f=-1;for(a=n;a<s;a++)if(u(e,a)===u(t,-1===f?0:a-f)){if(-1===f&&(f=a),a-f+1===l)return f*o}else-1!==f&&(a-=a-f),f=-1}else for(n+l>s&&(n=s-l),a=n;a>=0;a--){for(var h=!0,c=0;c<l;c++)if(u(e,a+c)!==u(t,c)){h=!1;break}if(h)return a}return-1}function v(e,t,n,r){n=Number(n)||0;var i=e.length-n;r?(r=Number(r))>i&&(r=i):r=i;var a=t.length;if(a%2!=0)throw new TypeError("Invalid hex string");r>a/2&&(r=a/2);for(var o=0;o<r;++o){var s=parseInt(t.substr(2*o,2),16);if(isNaN(s))return o;e[n+o]=s}return o}function b(e,t,n,r){return j(F(t,e.length-n),e,n,r)}function y(e,t,n,r){return j(function(e){for(var t=[],n=0;n<e.length;++n)t.push(255&e.charCodeAt(n));return t}(t),e,n,r)}function w(e,t,n,r){return y(e,t,n,r)}function E(e,t,n,r){return j(Z(t),e,n,r)}function k(e,t,n,r){return j(function(e,t){for(var n,r,i,a=[],o=0;o<e.length&&!((t-=2)<0);++o)n=e.charCodeAt(o),r=n>>8,i=n%256,a.push(i),a.push(r);return a}(t,e.length-n),e,n,r)}function S(e,t,n){return 0===t&&n===e.length?r.fromByteArray(e):r.fromByteArray(e.slice(t,n))}function x(e,t,n){n=Math.min(e.length,n);for(var r=[],i=t;i<n;){var a,o,s,l,u=e[i],f=null,h=u>239?4:u>223?3:u>191?2:1;if(i+h<=n)switch(h){case 1:u<128&&(f=u);break;case 2:128==(192&(a=e[i+1]))&&(l=(31&u)<<6|63&a)>127&&(f=l);break;case 3:a=e[i+1],o=e[i+2],128==(192&a)&&128==(192&o)&&(l=(15&u)<<12|(63&a)<<6|63&o)>2047&&(l<55296||l>57343)&&(f=l);break;case 4:a=e[i+1],o=e[i+2],s=e[i+3],128==(192&a)&&128==(192&o)&&128==(192&s)&&(l=(15&u)<<18|(63&a)<<12|(63&o)<<6|63&s)>65535&&l<1114112&&(f=l)}null===f?(f=65533,h=1):f>65535&&(f-=65536,r.push(f>>>10&1023|55296),f=56320|1023&f),r.push(f),i+=h}return function(e){var t=e.length;if(t<=T)return String.fromCharCode.apply(String,e);var n="",r=0;for(;r<t;)n+=String.fromCharCode.apply(String,e.slice(r,r+=T));return n}(r)}t.Buffer=l,t.SlowBuffer=function(e){+e!=e&&(e=0);return l.alloc(+e)},t.INSPECT_MAX_BYTES=50,l.TYPED_ARRAY_SUPPORT=void 0!==e.TYPED_ARRAY_SUPPORT?e.TYPED_ARRAY_SUPPORT:function(){try{var e=new Uint8Array(1);return e.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===e.foo()&&"function"==typeof e.subarray&&0===e.subarray(1,1).byteLength}catch(e){return!1}}(),t.kMaxLength=o(),l.poolSize=8192,l._augment=function(e){return e.__proto__=l.prototype,e},l.from=function(e,t,n){return u(null,e,t,n)},l.TYPED_ARRAY_SUPPORT&&(l.prototype.__proto__=Uint8Array.prototype,l.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&l[Symbol.species]===l&&Object.defineProperty(l,Symbol.species,{value:null,configurable:!0})),l.alloc=function(e,t,n){return function(e,t,n,r){return f(t),t<=0?s(e,t):void 0!==n?"string"==typeof r?s(e,t).fill(n,r):s(e,t).fill(n):s(e,t)}(null,e,t,n)},l.allocUnsafe=function(e){return h(null,e)},l.allocUnsafeSlow=function(e){return h(null,e)},l.isBuffer=function(e){return!(null==e||!e._isBuffer)},l.compare=function(e,t){if(!l.isBuffer(e)||!l.isBuffer(t))throw new TypeError("Arguments must be Buffers");if(e===t)return 0;for(var n=e.length,r=t.length,i=0,a=Math.min(n,r);i<a;++i)if(e[i]!==t[i]){n=e[i],r=t[i];break}return n<r?-1:r<n?1:0},l.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},l.concat=function(e,t){if(!a(e))throw new TypeError('"list" argument must be an Array of Buffers');if(0===e.length)return l.alloc(0);var n;if(void 0===t)for(t=0,n=0;n<e.length;++n)t+=e[n].length;var r=l.allocUnsafe(t),i=0;for(n=0;n<e.length;++n){var o=e[n];if(!l.isBuffer(o))throw new TypeError('"list" argument must be an Array of Buffers');o.copy(r,i),i+=o.length}return r},l.byteLength=_,l.prototype._isBuffer=!0,l.prototype.swap16=function(){var e=this.length;if(e%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var t=0;t<e;t+=2)p(this,t,t+1);return this},l.prototype.swap32=function(){var e=this.length;if(e%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var t=0;t<e;t+=4)p(this,t,t+3),p(this,t+1,t+2);return this},l.prototype.swap64=function(){var e=this.length;if(e%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var t=0;t<e;t+=8)p(this,t,t+7),p(this,t+1,t+6),p(this,t+2,t+5),p(this,t+3,t+4);return this},l.prototype.toString=function(){var e=0|this.length;return 0===e?"":0===arguments.length?x(this,0,e):function(e,t,n){var r=!1;if((void 0===t||t<0)&&(t=0),t>this.length)return"";if((void 0===n||n>this.length)&&(n=this.length),n<=0)return"";if((n>>>=0)<=(t>>>=0))return"";for(e||(e="utf8");;)switch(e){case"hex":return L(this,t,n);case"utf8":case"utf-8":return x(this,t,n);case"ascii":return A(this,t,n);case"latin1":case"binary":return R(this,t,n);case"base64":return S(this,t,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return I(this,t,n);default:if(r)throw new TypeError("Unknown encoding: "+e);e=(e+"").toLowerCase(),r=!0}}.apply(this,arguments)},l.prototype.equals=function(e){if(!l.isBuffer(e))throw new TypeError("Argument must be a Buffer");return this===e||0===l.compare(this,e)},l.prototype.inspect=function(){var e="",n=t.INSPECT_MAX_BYTES;return this.length>0&&(e=this.toString("hex",0,n).match(/.{2}/g).join(" "),this.length>n&&(e+=" ... ")),"<Buffer "+e+">"},l.prototype.compare=function(e,t,n,r,i){if(!l.isBuffer(e))throw new TypeError("Argument must be a Buffer");if(void 0===t&&(t=0),void 0===n&&(n=e?e.length:0),void 0===r&&(r=0),void 0===i&&(i=this.length),t<0||n>e.length||r<0||i>this.length)throw new RangeError("out of range index");if(r>=i&&t>=n)return 0;if(r>=i)return-1;if(t>=n)return 1;if(t>>>=0,n>>>=0,r>>>=0,i>>>=0,this===e)return 0;for(var a=i-r,o=n-t,s=Math.min(a,o),u=this.slice(r,i),f=e.slice(t,n),h=0;h<s;++h)if(u[h]!==f[h]){a=u[h],o=f[h];break}return a<o?-1:o<a?1:0},l.prototype.includes=function(e,t,n){return-1!==this.indexOf(e,t,n)},l.prototype.indexOf=function(e,t,n){return g(this,e,t,n,!0)},l.prototype.lastIndexOf=function(e,t,n){return g(this,e,t,n,!1)},l.prototype.write=function(e,t,n,r){if(void 0===t)r="utf8",n=this.length,t=0;else if(void 0===n&&"string"==typeof t)r=t,n=this.length,t=0;else{if(!isFinite(t))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");t|=0,isFinite(n)?(n|=0,void 0===r&&(r="utf8")):(r=n,n=void 0)}var i=this.length-t;if((void 0===n||n>i)&&(n=i),e.length>0&&(n<0||t<0)||t>this.length)throw new RangeError("Attempt to write outside buffer bounds");r||(r="utf8");for(var a=!1;;)switch(r){case"hex":return v(this,e,t,n);case"utf8":case"utf-8":return b(this,e,t,n);case"ascii":return y(this,e,t,n);case"latin1":case"binary":return w(this,e,t,n);case"base64":return E(this,e,t,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return k(this,e,t,n);default:if(a)throw new TypeError("Unknown encoding: "+r);r=(""+r).toLowerCase(),a=!0}},l.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var T=4096;function A(e,t,n){var r="";n=Math.min(e.length,n);for(var i=t;i<n;++i)r+=String.fromCharCode(127&e[i]);return r}function R(e,t,n){var r="";n=Math.min(e.length,n);for(var i=t;i<n;++i)r+=String.fromCharCode(e[i]);return r}function L(e,t,n){var r=e.length;(!t||t<0)&&(t=0),(!n||n<0||n>r)&&(n=r);for(var i="",a=t;a<n;++a)i+=P(e[a]);return i}function I(e,t,n){for(var r=e.slice(t,n),i="",a=0;a<r.length;a+=2)i+=String.fromCharCode(r[a]+256*r[a+1]);return i}function N(e,t,n){if(e%1!=0||e<0)throw new RangeError("offset is not uint");if(e+t>n)throw new RangeError("Trying to access beyond buffer length")}function O(e,t,n,r,i,a){if(!l.isBuffer(e))throw new TypeError('"buffer" argument must be a Buffer instance');if(t>i||t<a)throw new RangeError('"value" argument is out of bounds');if(n+r>e.length)throw new RangeError("Index out of range")}function B(e,t,n,r){t<0&&(t=65535+t+1);for(var i=0,a=Math.min(e.length-n,2);i<a;++i)e[n+i]=(t&255<<8*(r?i:1-i))>>>8*(r?i:1-i)}function M(e,t,n,r){t<0&&(t=4294967295+t+1);for(var i=0,a=Math.min(e.length-n,4);i<a;++i)e[n+i]=t>>>8*(r?i:3-i)&255}function U(e,t,n,r,i,a){if(n+r>e.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("Index out of range")}function D(e,t,n,r,a){return a||U(e,0,n,4),i.write(e,t,n,r,23,4),n+4}function C(e,t,n,r,a){return a||U(e,0,n,8),i.write(e,t,n,r,52,8),n+8}l.prototype.slice=function(e,t){var n,r=this.length;if(e=~~e,t=void 0===t?r:~~t,e<0?(e+=r)<0&&(e=0):e>r&&(e=r),t<0?(t+=r)<0&&(t=0):t>r&&(t=r),t<e&&(t=e),l.TYPED_ARRAY_SUPPORT)(n=this.subarray(e,t)).__proto__=l.prototype;else{var i=t-e;n=new l(i,void 0);for(var a=0;a<i;++a)n[a]=this[a+e]}return n},l.prototype.readUIntLE=function(e,t,n){e|=0,t|=0,n||N(e,t,this.length);for(var r=this[e],i=1,a=0;++a<t&&(i*=256);)r+=this[e+a]*i;return r},l.prototype.readUIntBE=function(e,t,n){e|=0,t|=0,n||N(e,t,this.length);for(var r=this[e+--t],i=1;t>0&&(i*=256);)r+=this[e+--t]*i;return r},l.prototype.readUInt8=function(e,t){return t||N(e,1,this.length),this[e]},l.prototype.readUInt16LE=function(e,t){return t||N(e,2,this.length),this[e]|this[e+1]<<8},l.prototype.readUInt16BE=function(e,t){return t||N(e,2,this.length),this[e]<<8|this[e+1]},l.prototype.readUInt32LE=function(e,t){return t||N(e,4,this.length),(this[e]|this[e+1]<<8|this[e+2]<<16)+16777216*this[e+3]},l.prototype.readUInt32BE=function(e,t){return t||N(e,4,this.length),16777216*this[e]+(this[e+1]<<16|this[e+2]<<8|this[e+3])},l.prototype.readIntLE=function(e,t,n){e|=0,t|=0,n||N(e,t,this.length);for(var r=this[e],i=1,a=0;++a<t&&(i*=256);)r+=this[e+a]*i;return r>=(i*=128)&&(r-=Math.pow(2,8*t)),r},l.prototype.readIntBE=function(e,t,n){e|=0,t|=0,n||N(e,t,this.length);for(var r=t,i=1,a=this[e+--r];r>0&&(i*=256);)a+=this[e+--r]*i;return a>=(i*=128)&&(a-=Math.pow(2,8*t)),a},l.prototype.readInt8=function(e,t){return t||N(e,1,this.length),128&this[e]?-1*(255-this[e]+1):this[e]},l.prototype.readInt16LE=function(e,t){t||N(e,2,this.length);var n=this[e]|this[e+1]<<8;return 32768&n?4294901760|n:n},l.prototype.readInt16BE=function(e,t){t||N(e,2,this.length);var n=this[e+1]|this[e]<<8;return 32768&n?4294901760|n:n},l.prototype.readInt32LE=function(e,t){return t||N(e,4,this.length),this[e]|this[e+1]<<8|this[e+2]<<16|this[e+3]<<24},l.prototype.readInt32BE=function(e,t){return t||N(e,4,this.length),this[e]<<24|this[e+1]<<16|this[e+2]<<8|this[e+3]},l.prototype.readFloatLE=function(e,t){return t||N(e,4,this.length),i.read(this,e,!0,23,4)},l.prototype.readFloatBE=function(e,t){return t||N(e,4,this.length),i.read(this,e,!1,23,4)},l.prototype.readDoubleLE=function(e,t){return t||N(e,8,this.length),i.read(this,e,!0,52,8)},l.prototype.readDoubleBE=function(e,t){return t||N(e,8,this.length),i.read(this,e,!1,52,8)},l.prototype.writeUIntLE=function(e,t,n,r){(e=+e,t|=0,n|=0,r)||O(this,e,t,n,Math.pow(2,8*n)-1,0);var i=1,a=0;for(this[t]=255&e;++a<n&&(i*=256);)this[t+a]=e/i&255;return t+n},l.prototype.writeUIntBE=function(e,t,n,r){(e=+e,t|=0,n|=0,r)||O(this,e,t,n,Math.pow(2,8*n)-1,0);var i=n-1,a=1;for(this[t+i]=255&e;--i>=0&&(a*=256);)this[t+i]=e/a&255;return t+n},l.prototype.writeUInt8=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,1,255,0),l.TYPED_ARRAY_SUPPORT||(e=Math.floor(e)),this[t]=255&e,t+1},l.prototype.writeUInt16LE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,2,65535,0),l.TYPED_ARRAY_SUPPORT?(this[t]=255&e,this[t+1]=e>>>8):B(this,e,t,!0),t+2},l.prototype.writeUInt16BE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,2,65535,0),l.TYPED_ARRAY_SUPPORT?(this[t]=e>>>8,this[t+1]=255&e):B(this,e,t,!1),t+2},l.prototype.writeUInt32LE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,4,4294967295,0),l.TYPED_ARRAY_SUPPORT?(this[t+3]=e>>>24,this[t+2]=e>>>16,this[t+1]=e>>>8,this[t]=255&e):M(this,e,t,!0),t+4},l.prototype.writeUInt32BE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,4,4294967295,0),l.TYPED_ARRAY_SUPPORT?(this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e):M(this,e,t,!1),t+4},l.prototype.writeIntLE=function(e,t,n,r){if(e=+e,t|=0,!r){var i=Math.pow(2,8*n-1);O(this,e,t,n,i-1,-i)}var a=0,o=1,s=0;for(this[t]=255&e;++a<n&&(o*=256);)e<0&&0===s&&0!==this[t+a-1]&&(s=1),this[t+a]=(e/o>>0)-s&255;return t+n},l.prototype.writeIntBE=function(e,t,n,r){if(e=+e,t|=0,!r){var i=Math.pow(2,8*n-1);O(this,e,t,n,i-1,-i)}var a=n-1,o=1,s=0;for(this[t+a]=255&e;--a>=0&&(o*=256);)e<0&&0===s&&0!==this[t+a+1]&&(s=1),this[t+a]=(e/o>>0)-s&255;return t+n},l.prototype.writeInt8=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,1,127,-128),l.TYPED_ARRAY_SUPPORT||(e=Math.floor(e)),e<0&&(e=255+e+1),this[t]=255&e,t+1},l.prototype.writeInt16LE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,2,32767,-32768),l.TYPED_ARRAY_SUPPORT?(this[t]=255&e,this[t+1]=e>>>8):B(this,e,t,!0),t+2},l.prototype.writeInt16BE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,2,32767,-32768),l.TYPED_ARRAY_SUPPORT?(this[t]=e>>>8,this[t+1]=255&e):B(this,e,t,!1),t+2},l.prototype.writeInt32LE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,4,2147483647,-2147483648),l.TYPED_ARRAY_SUPPORT?(this[t]=255&e,this[t+1]=e>>>8,this[t+2]=e>>>16,this[t+3]=e>>>24):M(this,e,t,!0),t+4},l.prototype.writeInt32BE=function(e,t,n){return e=+e,t|=0,n||O(this,e,t,4,2147483647,-2147483648),e<0&&(e=4294967295+e+1),l.TYPED_ARRAY_SUPPORT?(this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e):M(this,e,t,!1),t+4},l.prototype.writeFloatLE=function(e,t,n){return D(this,e,t,!0,n)},l.prototype.writeFloatBE=function(e,t,n){return D(this,e,t,!1,n)},l.prototype.writeDoubleLE=function(e,t,n){return C(this,e,t,!0,n)},l.prototype.writeDoubleBE=function(e,t,n){return C(this,e,t,!1,n)},l.prototype.copy=function(e,t,n,r){if(n||(n=0),r||0===r||(r=this.length),t>=e.length&&(t=e.length),t||(t=0),r>0&&r<n&&(r=n),r===n)return 0;if(0===e.length||0===this.length)return 0;if(t<0)throw new RangeError("targetStart out of bounds");if(n<0||n>=this.length)throw new RangeError("sourceStart out of bounds");if(r<0)throw new RangeError("sourceEnd out of bounds");r>this.length&&(r=this.length),e.length-t<r-n&&(r=e.length-t+n);var i,a=r-n;if(this===e&&n<t&&t<r)for(i=a-1;i>=0;--i)e[i+t]=this[i+n];else if(a<1e3||!l.TYPED_ARRAY_SUPPORT)for(i=0;i<a;++i)e[i+t]=this[i+n];else Uint8Array.prototype.set.call(e,this.subarray(n,n+a),t);return a},l.prototype.fill=function(e,t,n,r){if("string"==typeof e){if("string"==typeof t?(r=t,t=0,n=this.length):"string"==typeof n&&(r=n,n=this.length),1===e.length){var i=e.charCodeAt(0);i<256&&(e=i)}if(void 0!==r&&"string"!=typeof r)throw new TypeError("encoding must be a string");if("string"==typeof r&&!l.isEncoding(r))throw new TypeError("Unknown encoding: "+r)}else"number"==typeof e&&(e&=255);if(t<0||this.length<t||this.length<n)throw new RangeError("Out of range index");if(n<=t)return this;var a;if(t>>>=0,n=void 0===n?this.length:n>>>0,e||(e=0),"number"==typeof e)for(a=t;a<n;++a)this[a]=e;else{var o=l.isBuffer(e)?e:F(new l(e,r).toString()),s=o.length;for(a=0;a<n-t;++a)this[a+t]=o[a%s]}return this};var z=/[^+\/0-9A-Za-z-_]/g;function P(e){return e<16?"0"+e.toString(16):e.toString(16)}function F(e,t){var n;t=t||1/0;for(var r=e.length,i=null,a=[],o=0;o<r;++o){if((n=e.charCodeAt(o))>55295&&n<57344){if(!i){if(n>56319){(t-=3)>-1&&a.push(239,191,189);continue}if(o+1===r){(t-=3)>-1&&a.push(239,191,189);continue}i=n;continue}if(n<56320){(t-=3)>-1&&a.push(239,191,189),i=n;continue}n=65536+(i-55296<<10|n-56320)}else i&&(t-=3)>-1&&a.push(239,191,189);if(i=null,n<128){if((t-=1)<0)break;a.push(n)}else if(n<2048){if((t-=2)<0)break;a.push(n>>6|192,63&n|128)}else if(n<65536){if((t-=3)<0)break;a.push(n>>12|224,n>>6&63|128,63&n|128)}else{if(!(n<1114112))throw new Error("Invalid code point");if((t-=4)<0)break;a.push(n>>18|240,n>>12&63|128,n>>6&63|128,63&n|128)}}return a}function Z(e){return r.toByteArray(function(e){if((e=function(e){return e.trim?e.trim():e.replace(/^\s+|\s+$/g,"")}(e).replace(z,"")).length<2)return"";for(;e.length%4!=0;)e+="=";return e}(e))}function j(e,t,n,r){for(var i=0;i<r&&!(i+n>=t.length||i>=e.length);++i)t[i+n]=e[i];return i}}).call(this,n(0))},function(e,t,n){(function(e){function n(e){return Object.prototype.toString.call(e)}t.isArray=function(e){return Array.isArray?Array.isArray(e):"[object Array]"===n(e)},t.isBoolean=function(e){return"boolean"==typeof e},t.isNull=function(e){return null===e},t.isNullOrUndefined=function(e){return null==e},t.isNumber=function(e){return"number"==typeof e},t.isString=function(e){return"string"==typeof e},t.isSymbol=function(e){return"symbol"==typeof e},t.isUndefined=function(e){return void 0===e},t.isRegExp=function(e){return"[object RegExp]"===n(e)},t.isObject=function(e){return"object"==typeof e&&null!==e},t.isDate=function(e){return"[object Date]"===n(e)},t.isError=function(e){return"[object Error]"===n(e)||e instanceof Error},t.isFunction=function(e){return"function"==typeof e},t.isPrimitive=function(e){return null===e||"boolean"==typeof e||"number"==typeof e||"string"==typeof e||"symbol"==typeof e||void 0===e},t.isBuffer=e.isBuffer}).call(this,n(4).Buffer)},function(e,t,n){"use strict";(function(t){!t.version||0===t.version.indexOf("v0.")||0===t.version.indexOf("v1.")&&0!==t.version.indexOf("v1.8.")?e.exports={nextTick:function(e,n,r,i){if("function"!=typeof e)throw new TypeError('"callback" argument must be a function');var a,o,s=arguments.length;switch(s){case 0:case 1:return t.nextTick(e);case 2:return t.nextTick(function(){e.call(null,n)});case 3:return t.nextTick(function(){e.call(null,n,r)});case 4:return t.nextTick(function(){e.call(null,n,r,i)});default:for(a=new Array(s-1),o=0;o<a.length;)a[o++]=arguments[o];return t.nextTick(function(){e.apply(null,a)})}}}:e.exports=t}).call(this,n(1))},function(e,t,n){var r=n(4),i=r.Buffer;function a(e,t){for(var n in e)t[n]=e[n]}function o(e,t,n){return i(e,t,n)}i.from&&i.alloc&&i.allocUnsafe&&i.allocUnsafeSlow?e.exports=r:(a(r,t),t.Buffer=o),a(i,o),o.from=function(e,t,n){if("number"==typeof e)throw new TypeError("Argument must not be a number");return i(e,t,n)},o.alloc=function(e,t,n){if("number"!=typeof e)throw new TypeError("Argument must be a number");var r=i(e);return void 0!==t?"string"==typeof n?r.fill(t,n):r.fill(t):r.fill(0),r},o.allocUnsafe=function(e){if("number"!=typeof e)throw new TypeError("Argument must be a number");return i(e)},o.allocUnsafeSlow=function(e){if("number"!=typeof e)throw new TypeError("Argument must be a number");return r.SlowBuffer(e)}},function(e,t,n){"use strict";var r="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;function i(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var n=t.shift();if(n){if("object"!=typeof n)throw new TypeError(n+"must be non-object");for(var r in n)i(n,r)&&(e[r]=n[r])}}return e},t.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var a={arraySet:function(e,t,n,r,i){if(t.subarray&&e.subarray)e.set(t.subarray(n,n+r),i);else for(var a=0;a<r;a++)e[i+a]=t[n+a]},flattenChunks:function(e){var t,n,r,i,a,o;for(r=0,t=0,n=e.length;t<n;t++)r+=e[t].length;for(o=new Uint8Array(r),i=0,t=0,n=e.length;t<n;t++)a=e[t],o.set(a,i),i+=a.length;return o}},o={arraySet:function(e,t,n,r,i){for(var a=0;a<r;a++)e[i+a]=t[n+a]},flattenChunks:function(e){return[].concat.apply([],e)}};t.setTyped=function(e){e?(t.Buf8=Uint8Array,t.Buf16=Uint16Array,t.Buf32=Int32Array,t.assign(t,a)):(t.Buf8=Array,t.Buf16=Array,t.Buf32=Array,t.assign(t,o))},t.setTyped(r)},function(e,t){function n(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function r(e){return"function"==typeof e}function i(e){return"object"==typeof e&&null!==e}function a(e){return void 0===e}e.exports=n,n.EventEmitter=n,n.prototype._events=void 0,n.prototype._maxListeners=void 0,n.defaultMaxListeners=10,n.prototype.setMaxListeners=function(e){if(!function(e){return"number"==typeof e}(e)||e<0||isNaN(e))throw TypeError("n must be a positive number");return this._maxListeners=e,this},n.prototype.emit=function(e){var t,n,o,s,l,u;if(this._events||(this._events={}),"error"===e&&(!this._events.error||i(this._events.error)&&!this._events.error.length)){if((t=arguments[1])instanceof Error)throw t;var f=new Error('Uncaught, unspecified "error" event. ('+t+")");throw f.context=t,f}if(a(n=this._events[e]))return!1;if(r(n))switch(arguments.length){case 1:n.call(this);break;case 2:n.call(this,arguments[1]);break;case 3:n.call(this,arguments[1],arguments[2]);break;default:s=Array.prototype.slice.call(arguments,1),n.apply(this,s)}else if(i(n))for(s=Array.prototype.slice.call(arguments,1),o=(u=n.slice()).length,l=0;l<o;l++)u[l].apply(this,s);return!0},n.prototype.addListener=function(e,t){var o;if(!r(t))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",e,r(t.listener)?t.listener:t),this._events[e]?i(this._events[e])?this._events[e].push(t):this._events[e]=[this._events[e],t]:this._events[e]=t,i(this._events[e])&&!this._events[e].warned&&(o=a(this._maxListeners)?n.defaultMaxListeners:this._maxListeners)&&o>0&&this._events[e].length>o&&(this._events[e].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[e].length),"function"==typeof console.trace&&console.trace()),this},n.prototype.on=n.prototype.addListener,n.prototype.once=function(e,t){if(!r(t))throw TypeError("listener must be a function");var n=!1;function i(){this.removeListener(e,i),n||(n=!0,t.apply(this,arguments))}return i.listener=t,this.on(e,i),this},n.prototype.removeListener=function(e,t){var n,a,o,s;if(!r(t))throw TypeError("listener must be a function");if(!this._events||!this._events[e])return this;if(o=(n=this._events[e]).length,a=-1,n===t||r(n.listener)&&n.listener===t)delete this._events[e],this._events.removeListener&&this.emit("removeListener",e,t);else if(i(n)){for(s=o;s-- >0;)if(n[s]===t||n[s].listener&&n[s].listener===t){a=s;break}if(a<0)return this;1===n.length?(n.length=0,delete this._events[e]):n.splice(a,1),this._events.removeListener&&this.emit("removeListener",e,t)}return this},n.prototype.removeAllListeners=function(e){var t,n;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[e]&&delete this._events[e],this;if(0===arguments.length){for(t in this._events)"removeListener"!==t&&this.removeAllListeners(t);return this.removeAllListeners("removeListener"),this._events={},this}if(r(n=this._events[e]))this.removeListener(e,n);else if(n)for(;n.length;)this.removeListener(e,n[n.length-1]);return delete this._events[e],this},n.prototype.listeners=function(e){return this._events&&this._events[e]?r(this._events[e])?[this._events[e]]:this._events[e].slice():[]},n.prototype.listenerCount=function(e){if(this._events){var t=this._events[e];if(r(t))return 1;if(t)return t.length}return 0},n.listenerCount=function(e,t){return e.listenerCount(t)}},function(e,t,n){(t=e.exports=n(13)).Stream=t,t.Readable=t,t.Writable=n(11),t.Duplex=n(3),t.Transform=n(17),t.PassThrough=n(32)},function(e,t,n){"use strict";(function(t,r,i){var a=n(6);function o(e){var t=this;this.next=null,this.entry=null,this.finish=function(){!function(e,t,n){var r=e.entry;e.entry=null;for(;r;){var i=r.callback;t.pendingcb--,i(n),r=r.next}t.corkedRequestsFree?t.corkedRequestsFree.next=e:t.corkedRequestsFree=e}(t,e)}}e.exports=v;var s,l=!t.browser&&["v0.10","v0.9."].indexOf(t.version.slice(0,5))>-1?r:a.nextTick;v.WritableState=m;var u=n(5);u.inherits=n(2);var f={deprecate:n(31)},h=n(14),c=n(7).Buffer,d=i.Uint8Array||function(){};var _,p=n(15);function g(){}function m(e,t){s=s||n(3),e=e||{};var r=t instanceof s;this.objectMode=!!e.objectMode,r&&(this.objectMode=this.objectMode||!!e.writableObjectMode);var i=e.highWaterMark,u=e.writableHighWaterMark,f=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:r&&(u||0===u)?u:f,this.highWaterMark=Math.floor(this.highWaterMark),this.finalCalled=!1,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1,this.destroyed=!1;var h=!1===e.decodeStrings;this.decodeStrings=!h,this.defaultEncoding=e.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(e){!function(e,t){var n=e._writableState,r=n.sync,i=n.writecb;if(function(e){e.writing=!1,e.writecb=null,e.length-=e.writelen,e.writelen=0}(n),t)!function(e,t,n,r,i){--t.pendingcb,n?(a.nextTick(i,r),a.nextTick(S,e,t),e._writableState.errorEmitted=!0,e.emit("error",r)):(i(r),e._writableState.errorEmitted=!0,e.emit("error",r),S(e,t))}(e,n,r,t,i);else{var o=E(n);o||n.corked||n.bufferProcessing||!n.bufferedRequest||w(e,n),r?l(y,e,n,o,i):y(e,n,o,i)}}(t,e)},this.writecb=null,this.writelen=0,this.bufferedRequest=null,this.lastBufferedRequest=null,this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1,this.bufferedRequestCount=0,this.corkedRequestsFree=new o(this)}function v(e){if(s=s||n(3),!(_.call(v,this)||this instanceof s))return new v(e);this._writableState=new m(e,this),this.writable=!0,e&&("function"==typeof e.write&&(this._write=e.write),"function"==typeof e.writev&&(this._writev=e.writev),"function"==typeof e.destroy&&(this._destroy=e.destroy),"function"==typeof e.final&&(this._final=e.final)),h.call(this)}function b(e,t,n,r,i,a,o){t.writelen=r,t.writecb=o,t.writing=!0,t.sync=!0,n?e._writev(i,t.onwrite):e._write(i,a,t.onwrite),t.sync=!1}function y(e,t,n,r){n||function(e,t){0===t.length&&t.needDrain&&(t.needDrain=!1,e.emit("drain"))}(e,t),t.pendingcb--,r(),S(e,t)}function w(e,t){t.bufferProcessing=!0;var n=t.bufferedRequest;if(e._writev&&n&&n.next){var r=t.bufferedRequestCount,i=new Array(r),a=t.corkedRequestsFree;a.entry=n;for(var s=0,l=!0;n;)i[s]=n,n.isBuf||(l=!1),n=n.next,s+=1;i.allBuffers=l,b(e,t,!0,t.length,i,"",a.finish),t.pendingcb++,t.lastBufferedRequest=null,a.next?(t.corkedRequestsFree=a.next,a.next=null):t.corkedRequestsFree=new o(t),t.bufferedRequestCount=0}else{for(;n;){var u=n.chunk,f=n.encoding,h=n.callback;if(b(e,t,!1,t.objectMode?1:u.length,u,f,h),n=n.next,t.bufferedRequestCount--,t.writing)break}null===n&&(t.lastBufferedRequest=null)}t.bufferedRequest=n,t.bufferProcessing=!1}function E(e){return e.ending&&0===e.length&&null===e.bufferedRequest&&!e.finished&&!e.writing}function k(e,t){e._final(function(n){t.pendingcb--,n&&e.emit("error",n),t.prefinished=!0,e.emit("prefinish"),S(e,t)})}function S(e,t){var n=E(t);return n&&(!function(e,t){t.prefinished||t.finalCalled||("function"==typeof e._final?(t.pendingcb++,t.finalCalled=!0,a.nextTick(k,e,t)):(t.prefinished=!0,e.emit("prefinish")))}(e,t),0===t.pendingcb&&(t.finished=!0,e.emit("finish"))),n}u.inherits(v,h),m.prototype.getBuffer=function(){for(var e=this.bufferedRequest,t=[];e;)t.push(e),e=e.next;return t},function(){try{Object.defineProperty(m.prototype,"buffer",{get:f.deprecate(function(){return this.getBuffer()},"_writableState.buffer is deprecated. Use _writableState.getBuffer instead.","DEP0003")})}catch(e){}}(),"function"==typeof Symbol&&Symbol.hasInstance&&"function"==typeof Function.prototype[Symbol.hasInstance]?(_=Function.prototype[Symbol.hasInstance],Object.defineProperty(v,Symbol.hasInstance,{value:function(e){return!!_.call(this,e)||this===v&&(e&&e._writableState instanceof m)}})):_=function(e){return e instanceof this},v.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe, not readable"))},v.prototype.write=function(e,t,n){var r=this._writableState,i=!1,o=!r.objectMode&&function(e){return c.isBuffer(e)||e instanceof d}(e);return o&&!c.isBuffer(e)&&(e=function(e){return c.from(e)}(e)),"function"==typeof t&&(n=t,t=null),o?t="buffer":t||(t=r.defaultEncoding),"function"!=typeof n&&(n=g),r.ended?function(e,t){var n=new Error("write after end");e.emit("error",n),a.nextTick(t,n)}(this,n):(o||function(e,t,n,r){var i=!0,o=!1;return null===n?o=new TypeError("May not write null values to stream"):"string"==typeof n||void 0===n||t.objectMode||(o=new TypeError("Invalid non-string/buffer chunk")),o&&(e.emit("error",o),a.nextTick(r,o),i=!1),i}(this,r,e,n))&&(r.pendingcb++,i=function(e,t,n,r,i,a){if(!n){var o=function(e,t,n){e.objectMode||!1===e.decodeStrings||"string"!=typeof t||(t=c.from(t,n));return t}(t,r,i);r!==o&&(n=!0,i="buffer",r=o)}var s=t.objectMode?1:r.length;t.length+=s;var l=t.length<t.highWaterMark;l||(t.needDrain=!0);if(t.writing||t.corked){var u=t.lastBufferedRequest;t.lastBufferedRequest={chunk:r,encoding:i,isBuf:n,callback:a,next:null},u?u.next=t.lastBufferedRequest:t.bufferedRequest=t.lastBufferedRequest,t.bufferedRequestCount+=1}else b(e,t,!1,s,r,i,a);return l}(this,r,o,e,t,n)),i},v.prototype.cork=function(){this._writableState.corked++},v.prototype.uncork=function(){var e=this._writableState;e.corked&&(e.corked--,e.writing||e.corked||e.finished||e.bufferProcessing||!e.bufferedRequest||w(this,e))},v.prototype.setDefaultEncoding=function(e){if("string"==typeof e&&(e=e.toLowerCase()),!(["hex","utf8","utf-8","ascii","binary","base64","ucs2","ucs-2","utf16le","utf-16le","raw"].indexOf((e+"").toLowerCase())>-1))throw new TypeError("Unknown encoding: "+e);return this._writableState.defaultEncoding=e,this},Object.defineProperty(v.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),v.prototype._write=function(e,t,n){n(new Error("_write() is not implemented"))},v.prototype._writev=null,v.prototype.end=function(e,t,n){var r=this._writableState;"function"==typeof e?(n=e,e=null,t=null):"function"==typeof t&&(n=t,t=null),null!==e&&void 0!==e&&this.write(e,t),r.corked&&(r.corked=1,this.uncork()),r.ending||r.finished||function(e,t,n){t.ending=!0,S(e,t),n&&(t.finished?a.nextTick(n):e.once("finish",n));t.ended=!0,e.writable=!1}(this,r,n)},Object.defineProperty(v.prototype,"destroyed",{get:function(){return void 0!==this._writableState&&this._writableState.destroyed},set:function(e){this._writableState&&(this._writableState.destroyed=e)}}),v.prototype.destroy=p.destroy,v.prototype._undestroy=p.undestroy,v.prototype._destroy=function(e,t){this.end(),t(e)}}).call(this,n(1),n(29).setImmediate,n(0))},function(e,t){var n={}.toString;e.exports=Array.isArray||function(e){return"[object Array]"==n.call(e)}},function(e,t,n){"use strict";(function(t,r){var i=n(6);e.exports=b;var a,o=n(12);b.ReadableState=v;n(9).EventEmitter;var s=function(e,t){return e.listeners(t).length},l=n(14),u=n(7).Buffer,f=t.Uint8Array||function(){};var h=n(5);h.inherits=n(2);var c=n(26),d=void 0;d=c&&c.debuglog?c.debuglog("stream"):function(){};var _,p=n(27),g=n(15);h.inherits(b,l);var m=["error","close","destroy","pause","resume"];function v(e,t){a=a||n(3),e=e||{};var r=t instanceof a;this.objectMode=!!e.objectMode,r&&(this.objectMode=this.objectMode||!!e.readableObjectMode);var i=e.highWaterMark,o=e.readableHighWaterMark,s=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:r&&(o||0===o)?o:s,this.highWaterMark=Math.floor(this.highWaterMark),this.buffer=new p,this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.resumeScheduled=!1,this.destroyed=!1,this.defaultEncoding=e.defaultEncoding||"utf8",this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,e.encoding&&(_||(_=n(16).StringDecoder),this.decoder=new _(e.encoding),this.encoding=e.encoding)}function b(e){if(a=a||n(3),!(this instanceof b))return new b(e);this._readableState=new v(e,this),this.readable=!0,e&&("function"==typeof e.read&&(this._read=e.read),"function"==typeof e.destroy&&(this._destroy=e.destroy)),l.call(this)}function y(e,t,n,r,i){var a,o=e._readableState;null===t?(o.reading=!1,function(e,t){if(t.ended)return;if(t.decoder){var n=t.decoder.end();n&&n.length&&(t.buffer.push(n),t.length+=t.objectMode?1:n.length)}t.ended=!0,S(e)}(e,o)):(i||(a=function(e,t){var n;(function(e){return u.isBuffer(e)||e instanceof f})(t)||"string"==typeof t||void 0===t||e.objectMode||(n=new TypeError("Invalid non-string/buffer chunk"));return n}(o,t)),a?e.emit("error",a):o.objectMode||t&&t.length>0?("string"==typeof t||o.objectMode||Object.getPrototypeOf(t)===u.prototype||(t=function(e){return u.from(e)}(t)),r?o.endEmitted?e.emit("error",new Error("stream.unshift() after end event")):w(e,o,t,!0):o.ended?e.emit("error",new Error("stream.push() after EOF")):(o.reading=!1,o.decoder&&!n?(t=o.decoder.write(t),o.objectMode||0!==t.length?w(e,o,t,!1):T(e,o)):w(e,o,t,!1))):r||(o.reading=!1));return function(e){return!e.ended&&(e.needReadable||e.length<e.highWaterMark||0===e.length)}(o)}function w(e,t,n,r){t.flowing&&0===t.length&&!t.sync?(e.emit("data",n),e.read(0)):(t.length+=t.objectMode?1:n.length,r?t.buffer.unshift(n):t.buffer.push(n),t.needReadable&&S(e)),T(e,t)}Object.defineProperty(b.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&this._readableState.destroyed},set:function(e){this._readableState&&(this._readableState.destroyed=e)}}),b.prototype.destroy=g.destroy,b.prototype._undestroy=g.undestroy,b.prototype._destroy=function(e,t){this.push(null),t(e)},b.prototype.push=function(e,t){var n,r=this._readableState;return r.objectMode?n=!0:"string"==typeof e&&((t=t||r.defaultEncoding)!==r.encoding&&(e=u.from(e,t),t=""),n=!0),y(this,e,t,!1,n)},b.prototype.unshift=function(e){return y(this,e,null,!0,!1)},b.prototype.isPaused=function(){return!1===this._readableState.flowing},b.prototype.setEncoding=function(e){return _||(_=n(16).StringDecoder),this._readableState.decoder=new _(e),this._readableState.encoding=e,this};var E=8388608;function k(e,t){return e<=0||0===t.length&&t.ended?0:t.objectMode?1:e!=e?t.flowing&&t.length?t.buffer.head.data.length:t.length:(e>t.highWaterMark&&(t.highWaterMark=function(e){return e>=E?e=E:(e--,e|=e>>>1,e|=e>>>2,e|=e>>>4,e|=e>>>8,e|=e>>>16,e++),e}(e)),e<=t.length?e:t.ended?t.length:(t.needReadable=!0,0))}function S(e){var t=e._readableState;t.needReadable=!1,t.emittedReadable||(d("emitReadable",t.flowing),t.emittedReadable=!0,t.sync?i.nextTick(x,e):x(e))}function x(e){d("emit readable"),e.emit("readable"),I(e)}function T(e,t){t.readingMore||(t.readingMore=!0,i.nextTick(A,e,t))}function A(e,t){for(var n=t.length;!t.reading&&!t.flowing&&!t.ended&&t.length<t.highWaterMark&&(d("maybeReadMore read 0"),e.read(0),n!==t.length);)n=t.length;t.readingMore=!1}function R(e){d("readable nexttick read 0"),e.read(0)}function L(e,t){t.reading||(d("resume read 0"),e.read(0)),t.resumeScheduled=!1,t.awaitDrain=0,e.emit("resume"),I(e),t.flowing&&!t.reading&&e.read(0)}function I(e){var t=e._readableState;for(d("flow",t.flowing);t.flowing&&null!==e.read(););}function N(e,t){return 0===t.length?null:(t.objectMode?n=t.buffer.shift():!e||e>=t.length?(n=t.decoder?t.buffer.join(""):1===t.buffer.length?t.buffer.head.data:t.buffer.concat(t.length),t.buffer.clear()):n=function(e,t,n){var r;e<t.head.data.length?(r=t.head.data.slice(0,e),t.head.data=t.head.data.slice(e)):r=e===t.head.data.length?t.shift():n?function(e,t){var n=t.head,r=1,i=n.data;e-=i.length;for(;n=n.next;){var a=n.data,o=e>a.length?a.length:e;if(o===a.length?i+=a:i+=a.slice(0,e),0===(e-=o)){o===a.length?(++r,n.next?t.head=n.next:t.head=t.tail=null):(t.head=n,n.data=a.slice(o));break}++r}return t.length-=r,i}(e,t):function(e,t){var n=u.allocUnsafe(e),r=t.head,i=1;r.data.copy(n),e-=r.data.length;for(;r=r.next;){var a=r.data,o=e>a.length?a.length:e;if(a.copy(n,n.length-e,0,o),0===(e-=o)){o===a.length?(++i,r.next?t.head=r.next:t.head=t.tail=null):(t.head=r,r.data=a.slice(o));break}++i}return t.length-=i,n}(e,t);return r}(e,t.buffer,t.decoder),n);var n}function O(e){var t=e._readableState;if(t.length>0)throw new Error('"endReadable()" called on non-empty stream');t.endEmitted||(t.ended=!0,i.nextTick(B,t,e))}function B(e,t){e.endEmitted||0!==e.length||(e.endEmitted=!0,t.readable=!1,t.emit("end"))}function M(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1}b.prototype.read=function(e){d("read",e),e=parseInt(e,10);var t=this._readableState,n=e;if(0!==e&&(t.emittedReadable=!1),0===e&&t.needReadable&&(t.length>=t.highWaterMark||t.ended))return d("read: emitReadable",t.length,t.ended),0===t.length&&t.ended?O(this):S(this),null;if(0===(e=k(e,t))&&t.ended)return 0===t.length&&O(this),null;var r,i=t.needReadable;return d("need readable",i),(0===t.length||t.length-e<t.highWaterMark)&&d("length less than watermark",i=!0),t.ended||t.reading?d("reading or ended",i=!1):i&&(d("do read"),t.reading=!0,t.sync=!0,0===t.length&&(t.needReadable=!0),this._read(t.highWaterMark),t.sync=!1,t.reading||(e=k(n,t))),null===(r=e>0?N(e,t):null)?(t.needReadable=!0,e=0):t.length-=e,0===t.length&&(t.ended||(t.needReadable=!0),n!==e&&t.ended&&O(this)),null!==r&&this.emit("data",r),r},b.prototype._read=function(e){this.emit("error",new Error("_read() is not implemented"))},b.prototype.pipe=function(e,t){var n=this,a=this._readableState;switch(a.pipesCount){case 0:a.pipes=e;break;case 1:a.pipes=[a.pipes,e];break;default:a.pipes.push(e)}a.pipesCount+=1,d("pipe count=%d opts=%j",a.pipesCount,t);var l=(!t||!1!==t.end)&&e!==r.stdout&&e!==r.stderr?f:b;function u(t,r){d("onunpipe"),t===n&&r&&!1===r.hasUnpiped&&(r.hasUnpiped=!0,d("cleanup"),e.removeListener("close",m),e.removeListener("finish",v),e.removeListener("drain",h),e.removeListener("error",g),e.removeListener("unpipe",u),n.removeListener("end",f),n.removeListener("end",b),n.removeListener("data",p),c=!0,!a.awaitDrain||e._writableState&&!e._writableState.needDrain||h())}function f(){d("onend"),e.end()}a.endEmitted?i.nextTick(l):n.once("end",l),e.on("unpipe",u);var h=function(e){return function(){var t=e._readableState;d("pipeOnDrain",t.awaitDrain),t.awaitDrain&&t.awaitDrain--,0===t.awaitDrain&&s(e,"data")&&(t.flowing=!0,I(e))}}(n);e.on("drain",h);var c=!1;var _=!1;function p(t){d("ondata"),_=!1,!1!==e.write(t)||_||((1===a.pipesCount&&a.pipes===e||a.pipesCount>1&&-1!==M(a.pipes,e))&&!c&&(d("false write response, pause",n._readableState.awaitDrain),n._readableState.awaitDrain++,_=!0),n.pause())}function g(t){d("onerror",t),b(),e.removeListener("error",g),0===s(e,"error")&&e.emit("error",t)}function m(){e.removeListener("finish",v),b()}function v(){d("onfinish"),e.removeListener("close",m),b()}function b(){d("unpipe"),n.unpipe(e)}return n.on("data",p),function(e,t,n){if("function"==typeof e.prependListener)return e.prependListener(t,n);e._events&&e._events[t]?o(e._events[t])?e._events[t].unshift(n):e._events[t]=[n,e._events[t]]:e.on(t,n)}(e,"error",g),e.once("close",m),e.once("finish",v),e.emit("pipe",n),a.flowing||(d("pipe resume"),n.resume()),e},b.prototype.unpipe=function(e){var t=this._readableState,n={hasUnpiped:!1};if(0===t.pipesCount)return this;if(1===t.pipesCount)return e&&e!==t.pipes?this:(e||(e=t.pipes),t.pipes=null,t.pipesCount=0,t.flowing=!1,e&&e.emit("unpipe",this,n),this);if(!e){var r=t.pipes,i=t.pipesCount;t.pipes=null,t.pipesCount=0,t.flowing=!1;for(var a=0;a<i;a++)r[a].emit("unpipe",this,n);return this}var o=M(t.pipes,e);return-1===o?this:(t.pipes.splice(o,1),t.pipesCount-=1,1===t.pipesCount&&(t.pipes=t.pipes[0]),e.emit("unpipe",this,n),this)},b.prototype.on=function(e,t){var n=l.prototype.on.call(this,e,t);if("data"===e)!1!==this._readableState.flowing&&this.resume();else if("readable"===e){var r=this._readableState;r.endEmitted||r.readableListening||(r.readableListening=r.needReadable=!0,r.emittedReadable=!1,r.reading?r.length&&S(this):i.nextTick(R,this))}return n},b.prototype.addListener=b.prototype.on,b.prototype.resume=function(){var e=this._readableState;return e.flowing||(d("resume"),e.flowing=!0,function(e,t){t.resumeScheduled||(t.resumeScheduled=!0,i.nextTick(L,e,t))}(this,e)),this},b.prototype.pause=function(){return d("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(d("pause"),this._readableState.flowing=!1,this.emit("pause")),this},b.prototype.wrap=function(e){var t=this,n=this._readableState,r=!1;for(var i in e.on("end",function(){if(d("wrapped end"),n.decoder&&!n.ended){var e=n.decoder.end();e&&e.length&&t.push(e)}t.push(null)}),e.on("data",function(i){(d("wrapped data"),n.decoder&&(i=n.decoder.write(i)),!n.objectMode||null!==i&&void 0!==i)&&((n.objectMode||i&&i.length)&&(t.push(i)||(r=!0,e.pause())))}),e)void 0===this[i]&&"function"==typeof e[i]&&(this[i]=function(t){return function(){return e[t].apply(e,arguments)}}(i));for(var a=0;a<m.length;a++)e.on(m[a],this.emit.bind(this,m[a]));return this._read=function(t){d("wrapped _read",t),r&&(r=!1,e.resume())},this},Object.defineProperty(b.prototype,"readableHighWaterMark",{enumerable:!1,get:function(){return this._readableState.highWaterMark}}),b._fromList=N}).call(this,n(0),n(1))},function(e,t,n){e.exports=n(9).EventEmitter},function(e,t,n){"use strict";var r=n(6);function i(e,t){e.emit("error",t)}e.exports={destroy:function(e,t){var n=this,a=this._readableState&&this._readableState.destroyed,o=this._writableState&&this._writableState.destroyed;return a||o?(t?t(e):!e||this._writableState&&this._writableState.errorEmitted||r.nextTick(i,this,e),this):(this._readableState&&(this._readableState.destroyed=!0),this._writableState&&(this._writableState.destroyed=!0),this._destroy(e||null,function(e){!t&&e?(r.nextTick(i,n,e),n._writableState&&(n._writableState.errorEmitted=!0)):t&&t(e)}),this)},undestroy:function(){this._readableState&&(this._readableState.destroyed=!1,this._readableState.reading=!1,this._readableState.ended=!1,this._readableState.endEmitted=!1),this._writableState&&(this._writableState.destroyed=!1,this._writableState.ended=!1,this._writableState.ending=!1,this._writableState.finished=!1,this._writableState.errorEmitted=!1)}}},function(e,t,n){"use strict";var r=n(7).Buffer,i=r.isEncoding||function(e){switch((e=""+e)&&e.toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return!0;default:return!1}};function a(e){var t;switch(this.encoding=function(e){var t=function(e){if(!e)return"utf8";for(var t;;)switch(e){case"utf8":case"utf-8":return"utf8";case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return"utf16le";case"latin1":case"binary":return"latin1";case"base64":case"ascii":case"hex":return e;default:if(t)return;e=(""+e).toLowerCase(),t=!0}}(e);if("string"!=typeof t&&(r.isEncoding===i||!i(e)))throw new Error("Unknown encoding: "+e);return t||e}(e),this.encoding){case"utf16le":this.text=l,this.end=u,t=4;break;case"utf8":this.fillLast=s,t=4;break;case"base64":this.text=f,this.end=h,t=3;break;default:return this.write=c,void(this.end=d)}this.lastNeed=0,this.lastTotal=0,this.lastChar=r.allocUnsafe(t)}function o(e){return e<=127?0:e>>5==6?2:e>>4==14?3:e>>3==30?4:e>>6==2?-1:-2}function s(e){var t=this.lastTotal-this.lastNeed,n=function(e,t,n){if(128!=(192&t[0]))return e.lastNeed=0,"�";if(e.lastNeed>1&&t.length>1){if(128!=(192&t[1]))return e.lastNeed=1,"�";if(e.lastNeed>2&&t.length>2&&128!=(192&t[2]))return e.lastNeed=2,"�"}}(this,e);return void 0!==n?n:this.lastNeed<=e.length?(e.copy(this.lastChar,t,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal)):(e.copy(this.lastChar,t,0,e.length),void(this.lastNeed-=e.length))}function l(e,t){if((e.length-t)%2==0){var n=e.toString("utf16le",t);if(n){var r=n.charCodeAt(n.length-1);if(r>=55296&&r<=56319)return this.lastNeed=2,this.lastTotal=4,this.lastChar[0]=e[e.length-2],this.lastChar[1]=e[e.length-1],n.slice(0,-1)}return n}return this.lastNeed=1,this.lastTotal=2,this.lastChar[0]=e[e.length-1],e.toString("utf16le",t,e.length-1)}function u(e){var t=e&&e.length?this.write(e):"";if(this.lastNeed){var n=this.lastTotal-this.lastNeed;return t+this.lastChar.toString("utf16le",0,n)}return t}function f(e,t){var n=(e.length-t)%3;return 0===n?e.toString("base64",t):(this.lastNeed=3-n,this.lastTotal=3,1===n?this.lastChar[0]=e[e.length-1]:(this.lastChar[0]=e[e.length-2],this.lastChar[1]=e[e.length-1]),e.toString("base64",t,e.length-n))}function h(e){var t=e&&e.length?this.write(e):"";return this.lastNeed?t+this.lastChar.toString("base64",0,3-this.lastNeed):t}function c(e){return e.toString(this.encoding)}function d(e){return e&&e.length?this.write(e):""}t.StringDecoder=a,a.prototype.write=function(e){if(0===e.length)return"";var t,n;if(this.lastNeed){if(void 0===(t=this.fillLast(e)))return"";n=this.lastNeed,this.lastNeed=0}else n=0;return n<e.length?t?t+this.text(e,n):this.text(e,n):t||""},a.prototype.end=function(e){var t=e&&e.length?this.write(e):"";return this.lastNeed?t+"�":t},a.prototype.text=function(e,t){var n=function(e,t,n){var r=t.length-1;if(r<n)return 0;var i=o(t[r]);if(i>=0)return i>0&&(e.lastNeed=i-1),i;if(--r<n||-2===i)return 0;if((i=o(t[r]))>=0)return i>0&&(e.lastNeed=i-2),i;if(--r<n||-2===i)return 0;if((i=o(t[r]))>=0)return i>0&&(2===i?i=0:e.lastNeed=i-3),i;return 0}(this,e,t);if(!this.lastNeed)return e.toString("utf8",t);this.lastTotal=n;var r=e.length-(n-this.lastNeed);return e.copy(this.lastChar,0,r),e.toString("utf8",t,r)},a.prototype.fillLast=function(e){if(this.lastNeed<=e.length)return e.copy(this.lastChar,this.lastTotal-this.lastNeed,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal);e.copy(this.lastChar,this.lastTotal-this.lastNeed,0,e.length),this.lastNeed-=e.length}},function(e,t,n){"use strict";e.exports=a;var r=n(3),i=n(5);function a(e){if(!(this instanceof a))return new a(e);r.call(this,e),this._transformState={afterTransform:function(e,t){var n=this._transformState;n.transforming=!1;var r=n.writecb;if(!r)return this.emit("error",new Error("write callback called multiple times"));n.writechunk=null,n.writecb=null,null!=t&&this.push(t),r(e);var i=this._readableState;i.reading=!1,(i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}.bind(this),needTransform:!1,transforming:!1,writecb:null,writechunk:null,writeencoding:null},this._readableState.needReadable=!0,this._readableState.sync=!1,e&&("function"==typeof e.transform&&(this._transform=e.transform),"function"==typeof e.flush&&(this._flush=e.flush)),this.on("prefinish",o)}function o(){var e=this;"function"==typeof this._flush?this._flush(function(t,n){s(e,t,n)}):s(this,null,null)}function s(e,t,n){if(t)return e.emit("error",t);if(null!=n&&e.push(n),e._writableState.length)throw new Error("Calling transform done when ws.length != 0");if(e._transformState.transforming)throw new Error("Calling transform done when still transforming");return e.push(null)}i.inherits=n(2),i.inherits(a,r),a.prototype.push=function(e,t){return this._transformState.needTransform=!1,r.prototype.push.call(this,e,t)},a.prototype._transform=function(e,t,n){throw new Error("_transform() is not implemented")},a.prototype._write=function(e,t,n){var r=this._transformState;if(r.writecb=n,r.writechunk=e,r.writeencoding=t,!r.transforming){var i=this._readableState;(r.needTransform||i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}},a.prototype._read=function(e){var t=this._transformState;null!==t.writechunk&&t.writecb&&!t.transforming?(t.transforming=!0,this._transform(t.writechunk,t.writeencoding,t.afterTransform)):t.needTransform=!0},a.prototype._destroy=function(e,t){var n=this;r.prototype._destroy.call(this,e,function(e){t(e),n.emit("close")})}},function(e,t,n){"use strict";(function(t){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function r(e,t){if(e===t)return 0;for(var n=e.length,r=t.length,i=0,a=Math.min(n,r);i<a;++i)if(e[i]!==t[i]){n=e[i],r=t[i];break}return n<r?-1:r<n?1:0}function i(e){return t.Buffer&&"function"==typeof t.Buffer.isBuffer?t.Buffer.isBuffer(e):!(null==e||!e._isBuffer)}var a=n(19),o=Object.prototype.hasOwnProperty,s=Array.prototype.slice,l="foo"===function(){}.name;function u(e){return Object.prototype.toString.call(e)}function f(e){return!i(e)&&("function"==typeof t.ArrayBuffer&&("function"==typeof ArrayBuffer.isView?ArrayBuffer.isView(e):!!e&&(e instanceof DataView||!!(e.buffer&&e.buffer instanceof ArrayBuffer))))}var h=e.exports=m,c=/\s*function\s+([^\(\s]*)\s*/;function d(e){if(a.isFunction(e)){if(l)return e.name;var t=e.toString().match(c);return t&&t[1]}}function _(e,t){return"string"==typeof e?e.length<t?e:e.slice(0,t):e}function p(e){if(l||!a.isFunction(e))return a.inspect(e);var t=d(e);return"[Function"+(t?": "+t:"")+"]"}function g(e,t,n,r,i){throw new h.AssertionError({message:n,actual:e,expected:t,operator:r,stackStartFunction:i})}function m(e,t){e||g(e,!0,t,"==",h.ok)}function v(e,t,n,o){if(e===t)return!0;if(i(e)&&i(t))return 0===r(e,t);if(a.isDate(e)&&a.isDate(t))return e.getTime()===t.getTime();if(a.isRegExp(e)&&a.isRegExp(t))return e.source===t.source&&e.global===t.global&&e.multiline===t.multiline&&e.lastIndex===t.lastIndex&&e.ignoreCase===t.ignoreCase;if(null!==e&&"object"==typeof e||null!==t&&"object"==typeof t){if(f(e)&&f(t)&&u(e)===u(t)&&!(e instanceof Float32Array||e instanceof Float64Array))return 0===r(new Uint8Array(e.buffer),new Uint8Array(t.buffer));if(i(e)!==i(t))return!1;var l=(o=o||{actual:[],expected:[]}).actual.indexOf(e);return-1!==l&&l===o.expected.indexOf(t)||(o.actual.push(e),o.expected.push(t),function(e,t,n,r){if(null===e||void 0===e||null===t||void 0===t)return!1;if(a.isPrimitive(e)||a.isPrimitive(t))return e===t;if(n&&Object.getPrototypeOf(e)!==Object.getPrototypeOf(t))return!1;var i=b(e),o=b(t);if(i&&!o||!i&&o)return!1;if(i)return e=s.call(e),t=s.call(t),v(e,t,n);var l,u,f=E(e),h=E(t);if(f.length!==h.length)return!1;for(f.sort(),h.sort(),u=f.length-1;u>=0;u--)if(f[u]!==h[u])return!1;for(u=f.length-1;u>=0;u--)if(l=f[u],!v(e[l],t[l],n,r))return!1;return!0}(e,t,n,o))}return n?e===t:e==t}function b(e){return"[object Arguments]"==Object.prototype.toString.call(e)}function y(e,t){if(!e||!t)return!1;if("[object RegExp]"==Object.prototype.toString.call(t))return t.test(e);try{if(e instanceof t)return!0}catch(e){}return!Error.isPrototypeOf(t)&&!0===t.call({},e)}function w(e,t,n,r){var i;if("function"!=typeof t)throw new TypeError('"block" argument must be a function');"string"==typeof n&&(r=n,n=null),i=function(e){var t;try{e()}catch(e){t=e}return t}(t),r=(n&&n.name?" ("+n.name+").":".")+(r?" "+r:"."),e&&!i&&g(i,n,"Missing expected exception"+r);var o="string"==typeof r,s=!e&&a.isError(i),l=!e&&i&&!n;if((s&&o&&y(i,n)||l)&&g(i,n,"Got unwanted exception"+r),e&&i&&n&&!y(i,n)||!e&&i)throw i}h.AssertionError=function(e){this.name="AssertionError",this.actual=e.actual,this.expected=e.expected,this.operator=e.operator,e.message?(this.message=e.message,this.generatedMessage=!1):(this.message=function(e){return _(p(e.actual),128)+" "+e.operator+" "+_(p(e.expected),128)}(this),this.generatedMessage=!0);var t=e.stackStartFunction||g;if(Error.captureStackTrace)Error.captureStackTrace(this,t);else{var n=new Error;if(n.stack){var r=n.stack,i=d(t),a=r.indexOf("\n"+i);if(a>=0){var o=r.indexOf("\n",a+1);r=r.substring(o+1)}this.stack=r}}},a.inherits(h.AssertionError,Error),h.fail=g,h.ok=m,h.equal=function(e,t,n){e!=t&&g(e,t,n,"==",h.equal)},h.notEqual=function(e,t,n){e==t&&g(e,t,n,"!=",h.notEqual)},h.deepEqual=function(e,t,n){v(e,t,!1)||g(e,t,n,"deepEqual",h.deepEqual)},h.deepStrictEqual=function(e,t,n){v(e,t,!0)||g(e,t,n,"deepStrictEqual",h.deepStrictEqual)},h.notDeepEqual=function(e,t,n){v(e,t,!1)&&g(e,t,n,"notDeepEqual",h.notDeepEqual)},h.notDeepStrictEqual=function e(t,n,r){v(t,n,!0)&&g(t,n,r,"notDeepStrictEqual",e)},h.strictEqual=function(e,t,n){e!==t&&g(e,t,n,"===",h.strictEqual)},h.notStrictEqual=function(e,t,n){e===t&&g(e,t,n,"!==",h.notStrictEqual)},h.throws=function(e,t,n){w(!0,e,t,n)},h.doesNotThrow=function(e,t,n){w(!1,e,t,n)},h.ifError=function(e){if(e)throw e};var E=Object.keys||function(e){var t=[];for(var n in e)o.call(e,n)&&t.push(n);return t}}).call(this,n(0))},function(e,t,n){(function(e,r){var i=/%[sdj%]/g;t.format=function(e){if(!m(e)){for(var t=[],n=0;n<arguments.length;n++)t.push(s(arguments[n]));return t.join(" ")}n=1;for(var r=arguments,a=r.length,o=String(e).replace(i,function(e){if("%%"===e)return"%";if(n>=a)return e;switch(e){case"%s":return String(r[n++]);case"%d":return Number(r[n++]);case"%j":try{return JSON.stringify(r[n++])}catch(e){return"[Circular]"}default:return e}}),l=r[n];n<a;l=r[++n])p(l)||!y(l)?o+=" "+l:o+=" "+s(l);return o},t.deprecate=function(n,i){if(v(e.process))return function(){return t.deprecate(n,i).apply(this,arguments)};if(!0===r.noDeprecation)return n;var a=!1;return function(){if(!a){if(r.throwDeprecation)throw new Error(i);r.traceDeprecation?console.trace(i):console.error(i),a=!0}return n.apply(this,arguments)}};var a,o={};function s(e,n){var r={seen:[],stylize:u};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),_(n)?r.showHidden=n:n&&t._extend(r,n),v(r.showHidden)&&(r.showHidden=!1),v(r.depth)&&(r.depth=2),v(r.colors)&&(r.colors=!1),v(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=l),f(r,e,r.depth)}function l(e,t){var n=s.styles[t];return n?"["+s.colors[n][0]+"m"+e+"["+s.colors[n][1]+"m":e}function u(e,t){return e}function f(e,n,r){if(e.customInspect&&n&&k(n.inspect)&&n.inspect!==t.inspect&&(!n.constructor||n.constructor.prototype!==n)){var i=n.inspect(r,e);return m(i)||(i=f(e,i,r)),i}var a=function(e,t){if(v(t))return e.stylize("undefined","undefined");if(m(t)){var n="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(n,"string")}if(g(t))return e.stylize(""+t,"number");if(_(t))return e.stylize(""+t,"boolean");if(p(t))return e.stylize("null","null")}(e,n);if(a)return a;var o=Object.keys(n),s=function(e){var t={};return e.forEach(function(e,n){t[e]=!0}),t}(o);if(e.showHidden&&(o=Object.getOwnPropertyNames(n)),E(n)&&(o.indexOf("message")>=0||o.indexOf("description")>=0))return h(n);if(0===o.length){if(k(n)){var l=n.name?": "+n.name:"";return e.stylize("[Function"+l+"]","special")}if(b(n))return e.stylize(RegExp.prototype.toString.call(n),"regexp");if(w(n))return e.stylize(Date.prototype.toString.call(n),"date");if(E(n))return h(n)}var u,y="",S=!1,x=["{","}"];(d(n)&&(S=!0,x=["[","]"]),k(n))&&(y=" [Function"+(n.name?": "+n.name:"")+"]");return b(n)&&(y=" "+RegExp.prototype.toString.call(n)),w(n)&&(y=" "+Date.prototype.toUTCString.call(n)),E(n)&&(y=" "+h(n)),0!==o.length||S&&0!=n.length?r<0?b(n)?e.stylize(RegExp.prototype.toString.call(n),"regexp"):e.stylize("[Object]","special"):(e.seen.push(n),u=S?function(e,t,n,r,i){for(var a=[],o=0,s=t.length;o<s;++o)A(t,String(o))?a.push(c(e,t,n,r,String(o),!0)):a.push("");return i.forEach(function(i){i.match(/^\d+$/)||a.push(c(e,t,n,r,i,!0))}),a}(e,n,r,s,o):o.map(function(t){return c(e,n,r,s,t,S)}),e.seen.pop(),function(e,t,n){if(e.reduce(function(e,t){return 0,t.indexOf("\n")>=0&&0,e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0)>60)return n[0]+(""===t?"":t+"\n ")+" "+e.join(",\n  ")+" "+n[1];return n[0]+t+" "+e.join(", ")+" "+n[1]}(u,y,x)):x[0]+y+x[1]}function h(e){return"["+Error.prototype.toString.call(e)+"]"}function c(e,t,n,r,i,a){var o,s,l;if((l=Object.getOwnPropertyDescriptor(t,i)||{value:t[i]}).get?s=l.set?e.stylize("[Getter/Setter]","special"):e.stylize("[Getter]","special"):l.set&&(s=e.stylize("[Setter]","special")),A(r,i)||(o="["+i+"]"),s||(e.seen.indexOf(l.value)<0?(s=p(n)?f(e,l.value,null):f(e,l.value,n-1)).indexOf("\n")>-1&&(s=a?s.split("\n").map(function(e){return"  "+e}).join("\n").substr(2):"\n"+s.split("\n").map(function(e){return"   "+e}).join("\n")):s=e.stylize("[Circular]","special")),v(o)){if(a&&i.match(/^\d+$/))return s;(o=JSON.stringify(""+i)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(o=o.substr(1,o.length-2),o=e.stylize(o,"name")):(o=o.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),o=e.stylize(o,"string"))}return o+": "+s}function d(e){return Array.isArray(e)}function _(e){return"boolean"==typeof e}function p(e){return null===e}function g(e){return"number"==typeof e}function m(e){return"string"==typeof e}function v(e){return void 0===e}function b(e){return y(e)&&"[object RegExp]"===S(e)}function y(e){return"object"==typeof e&&null!==e}function w(e){return y(e)&&"[object Date]"===S(e)}function E(e){return y(e)&&("[object Error]"===S(e)||e instanceof Error)}function k(e){return"function"==typeof e}function S(e){return Object.prototype.toString.call(e)}function x(e){return e<10?"0"+e.toString(10):e.toString(10)}t.debuglog=function(e){if(v(a)&&(a=r.env.NODE_DEBUG||""),e=e.toUpperCase(),!o[e])if(new RegExp("\\b"+e+"\\b","i").test(a)){var n=r.pid;o[e]=function(){var r=t.format.apply(t,arguments);console.error("%s %d: %s",e,n,r)}}else o[e]=function(){};return o[e]},t.inspect=s,s.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},s.styles={special:"cyan",number:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",date:"magenta",regexp:"red"},t.isArray=d,t.isBoolean=_,t.isNull=p,t.isNullOrUndefined=function(e){return null==e},t.isNumber=g,t.isString=m,t.isSymbol=function(e){return"symbol"==typeof e},t.isUndefined=v,t.isRegExp=b,t.isObject=y,t.isDate=w,t.isError=E,t.isFunction=k,t.isPrimitive=function(e){return null===e||"boolean"==typeof e||"number"==typeof e||"string"==typeof e||"symbol"==typeof e||void 0===e},t.isBuffer=n(38);var T=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function A(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.log=function(){console.log("%s - %s",function(){var e=new Date,t=[x(e.getHours()),x(e.getMinutes()),x(e.getSeconds())].join(":");return[e.getDate(),T[e.getMonth()],t].join(" ")}(),t.format.apply(t,arguments))},t.inherits=n(2),t._extend=function(e,t){if(!t||!y(t))return e;for(var n=Object.keys(t),r=n.length;r--;)e[n[r]]=t[n[r]];return e}}).call(this,n(0),n(1))},function(e,t,n){"use strict";e.exports=function(e,t,n,r){for(var i=65535&e|0,a=e>>>16&65535|0,o=0;0!==n;){n-=o=n>2e3?2e3:n;do{a=a+(i=i+t[r++]|0)|0}while(--o);i%=65521,a%=65521}return i|a<<16|0}},function(e,t,n){"use strict";var r=function(){for(var e,t=[],n=0;n<256;n++){e=n;for(var r=0;r<8;r++)e=1&e?3988292384^e>>>1:e>>>1;t[n]=e}return t}();e.exports=function(e,t,n,i){var a=r,o=i+n;e^=-1;for(var s=i;s<o;s++)e=e>>>8^a[255&(e^t[s])];return-1^e}},function(e,t,n){"use strict";(function(e){var r=n(4).Buffer,i=n(25).Transform,a=n(37),o=n(19),s=n(18).ok,l=n(4).kMaxLength,u="Cannot create final Buffer. It would be larger than 0x"+l.toString(16)+" bytes";a.Z_MIN_WINDOWBITS=8,a.Z_MAX_WINDOWBITS=15,a.Z_DEFAULT_WINDOWBITS=15,a.Z_MIN_CHUNK=64,a.Z_MAX_CHUNK=1/0,a.Z_DEFAULT_CHUNK=16384,a.Z_MIN_MEMLEVEL=1,a.Z_MAX_MEMLEVEL=9,a.Z_DEFAULT_MEMLEVEL=8,a.Z_MIN_LEVEL=-1,a.Z_MAX_LEVEL=9,a.Z_DEFAULT_LEVEL=a.Z_DEFAULT_COMPRESSION;for(var f=Object.keys(a),h=0;h<f.length;h++){var c=f[h];c.match(/^Z/)&&Object.defineProperty(t,c,{enumerable:!0,value:a[c],writable:!1})}for(var d={Z_OK:a.Z_OK,Z_STREAM_END:a.Z_STREAM_END,Z_NEED_DICT:a.Z_NEED_DICT,Z_ERRNO:a.Z_ERRNO,Z_STREAM_ERROR:a.Z_STREAM_ERROR,Z_DATA_ERROR:a.Z_DATA_ERROR,Z_MEM_ERROR:a.Z_MEM_ERROR,Z_BUF_ERROR:a.Z_BUF_ERROR,Z_VERSION_ERROR:a.Z_VERSION_ERROR},_=Object.keys(d),p=0;p<_.length;p++){var g=_[p];d[d[g]]=g}function m(e,t,n){var i=[],a=0;function o(){for(var t;null!==(t=e.read());)i.push(t),a+=t.length;e.once("readable",o)}function s(){var t,o=null;a>=l?o=new RangeError(u):t=r.concat(i,a),i=[],e.close(),n(o,t)}e.on("error",function(t){e.removeListener("end",s),e.removeListener("readable",o),n(t)}),e.on("end",s),e.end(t),o()}function v(e,t){if("string"==typeof t&&(t=r.from(t)),!r.isBuffer(t))throw new TypeError("Not a string or buffer");var n=e._finishFlushFlag;return e._processChunk(t,n)}function b(e){if(!(this instanceof b))return new b(e);A.call(this,e,a.DEFLATE)}function y(e){if(!(this instanceof y))return new y(e);A.call(this,e,a.INFLATE)}function w(e){if(!(this instanceof w))return new w(e);A.call(this,e,a.GZIP)}function E(e){if(!(this instanceof E))return new E(e);A.call(this,e,a.GUNZIP)}function k(e){if(!(this instanceof k))return new k(e);A.call(this,e,a.DEFLATERAW)}function S(e){if(!(this instanceof S))return new S(e);A.call(this,e,a.INFLATERAW)}function x(e){if(!(this instanceof x))return new x(e);A.call(this,e,a.UNZIP)}function T(e){return e===a.Z_NO_FLUSH||e===a.Z_PARTIAL_FLUSH||e===a.Z_SYNC_FLUSH||e===a.Z_FULL_FLUSH||e===a.Z_FINISH||e===a.Z_BLOCK}function A(e,n){var o=this;if(this._opts=e=e||{},this._chunkSize=e.chunkSize||t.Z_DEFAULT_CHUNK,i.call(this,e),e.flush&&!T(e.flush))throw new Error("Invalid flush flag: "+e.flush);if(e.finishFlush&&!T(e.finishFlush))throw new Error("Invalid flush flag: "+e.finishFlush);if(this._flushFlag=e.flush||a.Z_NO_FLUSH,this._finishFlushFlag=void 0!==e.finishFlush?e.finishFlush:a.Z_FINISH,e.chunkSize&&(e.chunkSize<t.Z_MIN_CHUNK||e.chunkSize>t.Z_MAX_CHUNK))throw new Error("Invalid chunk size: "+e.chunkSize);if(e.windowBits&&(e.windowBits<t.Z_MIN_WINDOWBITS||e.windowBits>t.Z_MAX_WINDOWBITS))throw new Error("Invalid windowBits: "+e.windowBits);if(e.level&&(e.level<t.Z_MIN_LEVEL||e.level>t.Z_MAX_LEVEL))throw new Error("Invalid compression level: "+e.level);if(e.memLevel&&(e.memLevel<t.Z_MIN_MEMLEVEL||e.memLevel>t.Z_MAX_MEMLEVEL))throw new Error("Invalid memLevel: "+e.memLevel);if(e.strategy&&e.strategy!=t.Z_FILTERED&&e.strategy!=t.Z_HUFFMAN_ONLY&&e.strategy!=t.Z_RLE&&e.strategy!=t.Z_FIXED&&e.strategy!=t.Z_DEFAULT_STRATEGY)throw new Error("Invalid strategy: "+e.strategy);if(e.dictionary&&!r.isBuffer(e.dictionary))throw new Error("Invalid dictionary: it should be a Buffer instance");this._handle=new a.Zlib(n);var s=this;this._hadError=!1,this._handle.onerror=function(e,n){R(s),s._hadError=!0;var r=new Error(e);r.errno=n,r.code=t.codes[n],s.emit("error",r)};var l=t.Z_DEFAULT_COMPRESSION;"number"==typeof e.level&&(l=e.level);var u=t.Z_DEFAULT_STRATEGY;"number"==typeof e.strategy&&(u=e.strategy),this._handle.init(e.windowBits||t.Z_DEFAULT_WINDOWBITS,l,e.memLevel||t.Z_DEFAULT_MEMLEVEL,u,e.dictionary),this._buffer=r.allocUnsafe(this._chunkSize),this._offset=0,this._level=l,this._strategy=u,this.once("end",this.close),Object.defineProperty(this,"_closed",{get:function(){return!o._handle},configurable:!0,enumerable:!0})}function R(t,n){n&&e.nextTick(n),t._handle&&(t._handle.close(),t._handle=null)}function L(e){e.emit("close")}Object.defineProperty(t,"codes",{enumerable:!0,value:Object.freeze(d),writable:!1}),t.Deflate=b,t.Inflate=y,t.Gzip=w,t.Gunzip=E,t.DeflateRaw=k,t.InflateRaw=S,t.Unzip=x,t.createDeflate=function(e){return new b(e)},t.createInflate=function(e){return new y(e)},t.createDeflateRaw=function(e){return new k(e)},t.createInflateRaw=function(e){return new S(e)},t.createGzip=function(e){return new w(e)},t.createGunzip=function(e){return new E(e)},t.createUnzip=function(e){return new x(e)},t.deflate=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new b(t),e,n)},t.deflateSync=function(e,t){return v(new b(t),e)},t.gzip=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new w(t),e,n)},t.gzipSync=function(e,t){return v(new w(t),e)},t.deflateRaw=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new k(t),e,n)},t.deflateRawSync=function(e,t){return v(new k(t),e)},t.unzip=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new x(t),e,n)},t.unzipSync=function(e,t){return v(new x(t),e)},t.inflate=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new y(t),e,n)},t.inflateSync=function(e,t){return v(new y(t),e)},t.gunzip=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new E(t),e,n)},t.gunzipSync=function(e,t){return v(new E(t),e)},t.inflateRaw=function(e,t,n){return"function"==typeof t&&(n=t,t={}),m(new S(t),e,n)},t.inflateRawSync=function(e,t){return v(new S(t),e)},o.inherits(A,i),A.prototype.params=function(n,r,i){if(n<t.Z_MIN_LEVEL||n>t.Z_MAX_LEVEL)throw new RangeError("Invalid compression level: "+n);if(r!=t.Z_FILTERED&&r!=t.Z_HUFFMAN_ONLY&&r!=t.Z_RLE&&r!=t.Z_FIXED&&r!=t.Z_DEFAULT_STRATEGY)throw new TypeError("Invalid strategy: "+r);if(this._level!==n||this._strategy!==r){var o=this;this.flush(a.Z_SYNC_FLUSH,function(){s(o._handle,"zlib binding closed"),o._handle.params(n,r),o._hadError||(o._level=n,o._strategy=r,i&&i())})}else e.nextTick(i)},A.prototype.reset=function(){return s(this._handle,"zlib binding closed"),this._handle.reset()},A.prototype._flush=function(e){this._transform(r.alloc(0),"",e)},A.prototype.flush=function(t,n){var i=this,o=this._writableState;("function"==typeof t||void 0===t&&!n)&&(n=t,t=a.Z_FULL_FLUSH),o.ended?n&&e.nextTick(n):o.ending?n&&this.once("end",n):o.needDrain?n&&this.once("drain",function(){return i.flush(t,n)}):(this._flushFlag=t,this.write(r.alloc(0),"",n))},A.prototype.close=function(t){R(this,t),e.nextTick(L,this)},A.prototype._transform=function(e,t,n){var i,o=this._writableState,s=(o.ending||o.ended)&&(!e||o.length===e.length);return null===e||r.isBuffer(e)?this._handle?(s?i=this._finishFlushFlag:(i=this._flushFlag,e.length>=o.length&&(this._flushFlag=this._opts.flush||a.Z_NO_FLUSH)),void this._processChunk(e,i,n)):n(new Error("zlib binding closed")):n(new Error("invalid input"))},A.prototype._processChunk=function(e,t,n){var i=e&&e.length,a=this._chunkSize-this._offset,o=0,f=this,h="function"==typeof n;if(!h){var c,d=[],_=0;this.on("error",function(e){c=e}),s(this._handle,"zlib binding closed");do{var p=this._handle.writeSync(t,e,o,i,this._buffer,this._offset,a)}while(!this._hadError&&v(p[0],p[1]));if(this._hadError)throw c;if(_>=l)throw R(this),new RangeError(u);var g=r.concat(d,_);return R(this),g}s(this._handle,"zlib binding closed");var m=this._handle.write(t,e,o,i,this._buffer,this._offset,a);function v(l,u){if(this&&(this.buffer=null,this.callback=null),!f._hadError){var c=a-u;if(s(c>=0,"have should not go down"),c>0){var p=f._buffer.slice(f._offset,f._offset+c);f._offset+=c,h?f.push(p):(d.push(p),_+=p.length)}if((0===u||f._offset>=f._chunkSize)&&(a=f._chunkSize,f._offset=0,f._buffer=r.allocUnsafe(f._chunkSize)),0===u){if(o+=i-l,i=l,!h)return!0;var g=f._handle.write(t,e,o,i,f._buffer,f._offset,f._chunkSize);return g.callback=v,void(g.buffer=e)}if(!h)return!1;n()}}m.buffer=e,m.callback=v},o.inherits(b,A),o.inherits(y,A),o.inherits(w,A),o.inherits(E,A),o.inherits(k,A),o.inherits(S,A),o.inherits(x,A)}).call(this,n(1))},function(e,t,n){"use strict";t.byteLength=function(e){var t=u(e),n=t[0],r=t[1];return 3*(n+r)/4-r},t.toByteArray=function(e){for(var t,n=u(e),r=n[0],o=n[1],s=new a(function(e,t,n){return 3*(t+n)/4-n}(0,r,o)),l=0,f=o>0?r-4:r,h=0;h<f;h+=4)t=i[e.charCodeAt(h)]<<18|i[e.charCodeAt(h+1)]<<12|i[e.charCodeAt(h+2)]<<6|i[e.charCodeAt(h+3)],s[l++]=t>>16&255,s[l++]=t>>8&255,s[l++]=255&t;2===o&&(t=i[e.charCodeAt(h)]<<2|i[e.charCodeAt(h+1)]>>4,s[l++]=255&t);1===o&&(t=i[e.charCodeAt(h)]<<10|i[e.charCodeAt(h+1)]<<4|i[e.charCodeAt(h+2)]>>2,s[l++]=t>>8&255,s[l++]=255&t);return s},t.fromByteArray=function(e){for(var t,n=e.length,i=n%3,a=[],o=0,s=n-i;o<s;o+=16383)a.push(h(e,o,o+16383>s?s:o+16383));1===i?(t=e[n-1],a.push(r[t>>2]+r[t<<4&63]+"==")):2===i&&(t=(e[n-2]<<8)+e[n-1],a.push(r[t>>10]+r[t>>4&63]+r[t<<2&63]+"="));return a.join("")};for(var r=[],i=[],a="undefined"!=typeof Uint8Array?Uint8Array:Array,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",s=0,l=o.length;s<l;++s)r[s]=o[s],i[o.charCodeAt(s)]=s;function u(e){var t=e.length;if(t%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var n=e.indexOf("=");return-1===n&&(n=t),[n,n===t?0:4-n%4]}function f(e){return r[e>>18&63]+r[e>>12&63]+r[e>>6&63]+r[63&e]}function h(e,t,n){for(var r,i=[],a=t;a<n;a+=3)r=(e[a]<<16&16711680)+(e[a+1]<<8&65280)+(255&e[a+2]),i.push(f(r));return i.join("")}i["-".charCodeAt(0)]=62,i["_".charCodeAt(0)]=63},function(e,t){t.read=function(e,t,n,r,i){var a,o,s=8*i-r-1,l=(1<<s)-1,u=l>>1,f=-7,h=n?i-1:0,c=n?-1:1,d=e[t+h];for(h+=c,a=d&(1<<-f)-1,d>>=-f,f+=s;f>0;a=256*a+e[t+h],h+=c,f-=8);for(o=a&(1<<-f)-1,a>>=-f,f+=r;f>0;o=256*o+e[t+h],h+=c,f-=8);if(0===a)a=1-u;else{if(a===l)return o?NaN:1/0*(d?-1:1);o+=Math.pow(2,r),a-=u}return(d?-1:1)*o*Math.pow(2,a-r)},t.write=function(e,t,n,r,i,a){var o,s,l,u=8*a-i-1,f=(1<<u)-1,h=f>>1,c=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,d=r?0:a-1,_=r?1:-1,p=t<0||0===t&&1/t<0?1:0;for(t=Math.abs(t),isNaN(t)||t===1/0?(s=isNaN(t)?1:0,o=f):(o=Math.floor(Math.log(t)/Math.LN2),t*(l=Math.pow(2,-o))<1&&(o--,l*=2),(t+=o+h>=1?c/l:c*Math.pow(2,1-h))*l>=2&&(o++,l/=2),o+h>=f?(s=0,o=f):o+h>=1?(s=(t*l-1)*Math.pow(2,i),o+=h):(s=t*Math.pow(2,h-1)*Math.pow(2,i),o=0));i>=8;e[n+d]=255&s,d+=_,s/=256,i-=8);for(o=o<<i|s,u+=i;u>0;e[n+d]=255&o,d+=_,o/=256,u-=8);e[n+d-_]|=128*p}},function(e,t,n){e.exports=i;var r=n(9).EventEmitter;function i(){r.call(this)}n(2)(i,r),i.Readable=n(10),i.Writable=n(33),i.Duplex=n(34),i.Transform=n(35),i.PassThrough=n(36),i.Stream=i,i.prototype.pipe=function(e,t){var n=this;function i(t){e.writable&&!1===e.write(t)&&n.pause&&n.pause()}function a(){n.readable&&n.resume&&n.resume()}n.on("data",i),e.on("drain",a),e._isStdio||t&&!1===t.end||(n.on("end",s),n.on("close",l));var o=!1;function s(){o||(o=!0,e.end())}function l(){o||(o=!0,"function"==typeof e.destroy&&e.destroy())}function u(e){if(f(),0===r.listenerCount(this,"error"))throw e}function f(){n.removeListener("data",i),e.removeListener("drain",a),n.removeListener("end",s),n.removeListener("close",l),n.removeListener("error",u),e.removeListener("error",u),n.removeListener("end",f),n.removeListener("close",f),e.removeListener("close",f)}return n.on("error",u),e.on("error",u),n.on("end",f),n.on("close",f),e.on("close",f),e.emit("pipe",n),e}},function(e,t){},function(e,t,n){"use strict";var r=n(7).Buffer,i=n(28);function a(e,t,n){e.copy(t,n)}e.exports=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.head=null,this.tail=null,this.length=0}return e.prototype.push=function(e){var t={data:e,next:null};this.length>0?this.tail.next=t:this.head=t,this.tail=t,++this.length},e.prototype.unshift=function(e){var t={data:e,next:this.head};0===this.length&&(this.tail=t),this.head=t,++this.length},e.prototype.shift=function(){if(0!==this.length){var e=this.head.data;return 1===this.length?this.head=this.tail=null:this.head=this.head.next,--this.length,e}},e.prototype.clear=function(){this.head=this.tail=null,this.length=0},e.prototype.join=function(e){if(0===this.length)return"";for(var t=this.head,n=""+t.data;t=t.next;)n+=e+t.data;return n},e.prototype.concat=function(e){if(0===this.length)return r.alloc(0);if(1===this.length)return this.head.data;for(var t=r.allocUnsafe(e>>>0),n=this.head,i=0;n;)a(n.data,t,i),i+=n.data.length,n=n.next;return t},e}(),i&&i.inspect&&i.inspect.custom&&(e.exports.prototype[i.inspect.custom]=function(){var e=i.inspect({length:this.length});return this.constructor.name+" "+e})},function(e,t){},function(e,t,n){(function(e){var r=void 0!==e&&e||"undefined"!=typeof self&&self||window,i=Function.prototype.apply;function a(e,t){this._id=e,this._clearFn=t}t.setTimeout=function(){return new a(i.call(setTimeout,r,arguments),clearTimeout)},t.setInterval=function(){return new a(i.call(setInterval,r,arguments),clearInterval)},t.clearTimeout=t.clearInterval=function(e){e&&e.close()},a.prototype.unref=a.prototype.ref=function(){},a.prototype.close=function(){this._clearFn.call(r,this._id)},t.enroll=function(e,t){clearTimeout(e._idleTimeoutId),e._idleTimeout=t},t.unenroll=function(e){clearTimeout(e._idleTimeoutId),e._idleTimeout=-1},t._unrefActive=t.active=function(e){clearTimeout(e._idleTimeoutId);var t=e._idleTimeout;t>=0&&(e._idleTimeoutId=setTimeout(function(){e._onTimeout&&e._onTimeout()},t))},n(30),t.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==e&&e.setImmediate||this&&this.setImmediate,t.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==e&&e.clearImmediate||this&&this.clearImmediate}).call(this,n(0))},function(e,t,n){(function(e,t){!function(e,n){"use strict";if(!e.setImmediate){var r,i=1,a={},o=!1,s=e.document,l=Object.getPrototypeOf&&Object.getPrototypeOf(e);l=l&&l.setTimeout?l:e,"[object process]"==={}.toString.call(e.process)?r=function(e){t.nextTick(function(){f(e)})}:function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=n,t}}()?function(){var t="setImmediate$"+Math.random()+"$",n=function(n){n.source===e&&"string"==typeof n.data&&0===n.data.indexOf(t)&&f(+n.data.slice(t.length))};e.addEventListener?e.addEventListener("message",n,!1):e.attachEvent("onmessage",n),r=function(n){e.postMessage(t+n,"*")}}():e.MessageChannel?function(){var e=new MessageChannel;e.port1.onmessage=function(e){f(e.data)},r=function(t){e.port2.postMessage(t)}}():s&&"onreadystatechange"in s.createElement("script")?function(){var e=s.documentElement;r=function(t){var n=s.createElement("script");n.onreadystatechange=function(){f(t),n.onreadystatechange=null,e.removeChild(n),n=null},e.appendChild(n)}}():r=function(e){setTimeout(f,0,e)},l.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var o={callback:e,args:t};return a[i]=o,r(i),i++},l.clearImmediate=u}function u(e){delete a[e]}function f(e){if(o)setTimeout(f,0,e);else{var t=a[e];if(t){o=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{u(e),o=!1}}}}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,n(0),n(1))},function(e,t,n){(function(t){function n(e){try{if(!t.localStorage)return!1}catch(e){return!1}var n=t.localStorage[e];return null!=n&&"true"===String(n).toLowerCase()}e.exports=function(e,t){if(n("noDeprecation"))return e;var r=!1;return function(){if(!r){if(n("throwDeprecation"))throw new Error(t);n("traceDeprecation")?console.trace(t):console.warn(t),r=!0}return e.apply(this,arguments)}}}).call(this,n(0))},function(e,t,n){"use strict";e.exports=a;var r=n(17),i=n(5);function a(e){if(!(this instanceof a))return new a(e);r.call(this,e)}i.inherits=n(2),i.inherits(a,r),a.prototype._transform=function(e,t,n){n(null,e)}},function(e,t,n){e.exports=n(11)},function(e,t,n){e.exports=n(3)},function(e,t,n){e.exports=n(10).Transform},function(e,t,n){e.exports=n(10).PassThrough},function(e,t,n){"use strict";(function(e,r){var i=n(18),a=n(39),o=n(40),s=n(43),l=n(46);for(var u in l)t[u]=l[u];t.NONE=0,t.DEFLATE=1,t.INFLATE=2,t.GZIP=3,t.GUNZIP=4,t.DEFLATERAW=5,t.INFLATERAW=6,t.UNZIP=7;function f(e){if("number"!=typeof e||e<t.DEFLATE||e>t.UNZIP)throw new TypeError("Bad argument");this.dictionary=null,this.err=0,this.flush=0,this.init_done=!1,this.level=0,this.memLevel=0,this.mode=e,this.strategy=0,this.windowBits=0,this.write_in_progress=!1,this.pending_close=!1,this.gzip_id_bytes_read=0}f.prototype.close=function(){this.write_in_progress?this.pending_close=!0:(this.pending_close=!1,i(this.init_done,"close before init"),i(this.mode<=t.UNZIP),this.mode===t.DEFLATE||this.mode===t.GZIP||this.mode===t.DEFLATERAW?o.deflateEnd(this.strm):this.mode!==t.INFLATE&&this.mode!==t.GUNZIP&&this.mode!==t.INFLATERAW&&this.mode!==t.UNZIP||s.inflateEnd(this.strm),this.mode=t.NONE,this.dictionary=null)},f.prototype.write=function(e,t,n,r,i,a,o){return this._write(!0,e,t,n,r,i,a,o)},f.prototype.writeSync=function(e,t,n,r,i,a,o){return this._write(!1,e,t,n,r,i,a,o)},f.prototype._write=function(n,a,o,s,l,u,f,h){if(i.equal(arguments.length,8),i(this.init_done,"write before init"),i(this.mode!==t.NONE,"already finalized"),i.equal(!1,this.write_in_progress,"write already in progress"),i.equal(!1,this.pending_close,"close is pending"),this.write_in_progress=!0,i.equal(!1,void 0===a,"must provide flush value"),this.write_in_progress=!0,a!==t.Z_NO_FLUSH&&a!==t.Z_PARTIAL_FLUSH&&a!==t.Z_SYNC_FLUSH&&a!==t.Z_FULL_FLUSH&&a!==t.Z_FINISH&&a!==t.Z_BLOCK)throw new Error("Invalid flush value");if(null==o&&(o=e.alloc(0),l=0,s=0),this.strm.avail_in=l,this.strm.input=o,this.strm.next_in=s,this.strm.avail_out=h,this.strm.output=u,this.strm.next_out=f,this.flush=a,!n)return this._process(),this._checkError()?this._afterSync():void 0;var c=this;return r.nextTick(function(){c._process(),c._after()}),this},f.prototype._afterSync=function(){var e=this.strm.avail_out,t=this.strm.avail_in;return this.write_in_progress=!1,[t,e]},f.prototype._process=function(){var e=null;switch(this.mode){case t.DEFLATE:case t.GZIP:case t.DEFLATERAW:this.err=o.deflate(this.strm,this.flush);break;case t.UNZIP:switch(this.strm.avail_in>0&&(e=this.strm.next_in),this.gzip_id_bytes_read){case 0:if(null===e)break;if(31!==this.strm.input[e]){this.mode=t.INFLATE;break}if(this.gzip_id_bytes_read=1,e++,1===this.strm.avail_in)break;case 1:if(null===e)break;139===this.strm.input[e]?(this.gzip_id_bytes_read=2,this.mode=t.GUNZIP):this.mode=t.INFLATE;break;default:throw new Error("invalid number of gzip magic number bytes read")}case t.INFLATE:case t.GUNZIP:case t.INFLATERAW:for(this.err=s.inflate(this.strm,this.flush),this.err===t.Z_NEED_DICT&&this.dictionary&&(this.err=s.inflateSetDictionary(this.strm,this.dictionary),this.err===t.Z_OK?this.err=s.inflate(this.strm,this.flush):this.err===t.Z_DATA_ERROR&&(this.err=t.Z_NEED_DICT));this.strm.avail_in>0&&this.mode===t.GUNZIP&&this.err===t.Z_STREAM_END&&0!==this.strm.next_in[0];)this.reset(),this.err=s.inflate(this.strm,this.flush);break;default:throw new Error("Unknown mode "+this.mode)}},f.prototype._checkError=function(){switch(this.err){case t.Z_OK:case t.Z_BUF_ERROR:if(0!==this.strm.avail_out&&this.flush===t.Z_FINISH)return this._error("unexpected end of file"),!1;break;case t.Z_STREAM_END:break;case t.Z_NEED_DICT:return null==this.dictionary?this._error("Missing dictionary"):this._error("Bad dictionary"),!1;default:return this._error("Zlib error"),!1}return!0},f.prototype._after=function(){if(this._checkError()){var e=this.strm.avail_out,t=this.strm.avail_in;this.write_in_progress=!1,this.callback(t,e),this.pending_close&&this.close()}},f.prototype._error=function(e){this.strm.msg&&(e=this.strm.msg),this.onerror(e,this.err),this.write_in_progress=!1,this.pending_close&&this.close()},f.prototype.init=function(e,n,r,a,o){i(4===arguments.length||5===arguments.length,"init(windowBits, level, memLevel, strategy, [dictionary])"),i(e>=8&&e<=15,"invalid windowBits"),i(n>=-1&&n<=9,"invalid compression level"),i(r>=1&&r<=9,"invalid memlevel"),i(a===t.Z_FILTERED||a===t.Z_HUFFMAN_ONLY||a===t.Z_RLE||a===t.Z_FIXED||a===t.Z_DEFAULT_STRATEGY,"invalid strategy"),this._init(n,e,r,a,o),this._setDictionary()},f.prototype.params=function(){throw new Error("deflateParams Not supported")},f.prototype.reset=function(){this._reset(),this._setDictionary()},f.prototype._init=function(e,n,r,i,l){switch(this.level=e,this.windowBits=n,this.memLevel=r,this.strategy=i,this.flush=t.Z_NO_FLUSH,this.err=t.Z_OK,this.mode!==t.GZIP&&this.mode!==t.GUNZIP||(this.windowBits+=16),this.mode===t.UNZIP&&(this.windowBits+=32),this.mode!==t.DEFLATERAW&&this.mode!==t.INFLATERAW||(this.windowBits=-1*this.windowBits),this.strm=new a,this.mode){case t.DEFLATE:case t.GZIP:case t.DEFLATERAW:this.err=o.deflateInit2(this.strm,this.level,t.Z_DEFLATED,this.windowBits,this.memLevel,this.strategy);break;case t.INFLATE:case t.GUNZIP:case t.INFLATERAW:case t.UNZIP:this.err=s.inflateInit2(this.strm,this.windowBits);break;default:throw new Error("Unknown mode "+this.mode)}this.err!==t.Z_OK&&this._error("Init error"),this.dictionary=l,this.write_in_progress=!1,this.init_done=!0},f.prototype._setDictionary=function(){if(null!=this.dictionary){switch(this.err=t.Z_OK,this.mode){case t.DEFLATE:case t.DEFLATERAW:this.err=o.deflateSetDictionary(this.strm,this.dictionary)}this.err!==t.Z_OK&&this._error("Failed to set dictionary")}},f.prototype._reset=function(){switch(this.err=t.Z_OK,this.mode){case t.DEFLATE:case t.DEFLATERAW:case t.GZIP:this.err=o.deflateReset(this.strm);break;case t.INFLATE:case t.INFLATERAW:case t.GUNZIP:this.err=s.inflateReset(this.strm)}this.err!==t.Z_OK&&this._error("Failed to reset stream")},t.Zlib=f}).call(this,n(4).Buffer,n(1))},function(e,t){e.exports=function(e){return e&&"object"==typeof e&&"function"==typeof e.copy&&"function"==typeof e.fill&&"function"==typeof e.readUInt8}},function(e,t,n){"use strict";e.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},function(e,t,n){"use strict";var r,i=n(8),a=n(41),o=n(20),s=n(21),l=n(42),u=0,f=1,h=3,c=4,d=5,_=0,p=1,g=-2,m=-3,v=-5,b=-1,y=1,w=2,E=3,k=4,S=0,x=2,T=8,A=9,R=15,L=8,I=286,N=30,O=19,B=2*I+1,M=15,U=3,D=258,C=D+U+1,z=32,P=42,F=69,Z=73,j=91,W=103,q=113,Y=666,H=1,G=2,J=3,K=4,V=3;function X(e,t){return e.msg=l[t],t}function $(e){return(e<<1)-(e>4?9:0)}function Q(e){for(var t=e.length;--t>=0;)e[t]=0}function ee(e){var t=e.state,n=t.pending;n>e.avail_out&&(n=e.avail_out),0!==n&&(i.arraySet(e.output,t.pending_buf,t.pending_out,n,e.next_out),e.next_out+=n,t.pending_out+=n,e.total_out+=n,e.avail_out-=n,t.pending-=n,0===t.pending&&(t.pending_out=0))}function te(e,t){a._tr_flush_block(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,ee(e.strm)}function ne(e,t){e.pending_buf[e.pending++]=t}function re(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function ie(e,t,n,r){var a=e.avail_in;return a>r&&(a=r),0===a?0:(e.avail_in-=a,i.arraySet(t,e.input,e.next_in,a,n),1===e.state.wrap?e.adler=o(e.adler,t,a,n):2===e.state.wrap&&(e.adler=s(e.adler,t,a,n)),e.next_in+=a,e.total_in+=a,a)}function ae(e,t){var n,r,i=e.max_chain_length,a=e.strstart,o=e.prev_length,s=e.nice_match,l=e.strstart>e.w_size-C?e.strstart-(e.w_size-C):0,u=e.window,f=e.w_mask,h=e.prev,c=e.strstart+D,d=u[a+o-1],_=u[a+o];e.prev_length>=e.good_match&&(i>>=2),s>e.lookahead&&(s=e.lookahead);do{if(u[(n=t)+o]===_&&u[n+o-1]===d&&u[n]===u[a]&&u[++n]===u[a+1]){a+=2,n++;do{}while(u[++a]===u[++n]&&u[++a]===u[++n]&&u[++a]===u[++n]&&u[++a]===u[++n]&&u[++a]===u[++n]&&u[++a]===u[++n]&&u[++a]===u[++n]&&u[++a]===u[++n]&&a<c);if(r=D-(c-a),a=c-D,r>o){if(e.match_start=t,o=r,r>=s)break;d=u[a+o-1],_=u[a+o]}}}while((t=h[t&f])>l&&0!=--i);return o<=e.lookahead?o:e.lookahead}function oe(e){var t,n,r,a,o,s=e.w_size;do{if(a=e.window_size-e.lookahead-e.strstart,e.strstart>=s+(s-C)){i.arraySet(e.window,e.window,s,s,0),e.match_start-=s,e.strstart-=s,e.block_start-=s,t=n=e.hash_size;do{r=e.head[--t],e.head[t]=r>=s?r-s:0}while(--n);t=n=s;do{r=e.prev[--t],e.prev[t]=r>=s?r-s:0}while(--n);a+=s}if(0===e.strm.avail_in)break;if(n=ie(e.strm,e.window,e.strstart+e.lookahead,a),e.lookahead+=n,e.lookahead+e.insert>=U)for(o=e.strstart-e.insert,e.ins_h=e.window[o],e.ins_h=(e.ins_h<<e.hash_shift^e.window[o+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[o+U-1])&e.hash_mask,e.prev[o&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=o,o++,e.insert--,!(e.lookahead+e.insert<U)););}while(e.lookahead<C&&0!==e.strm.avail_in)}function se(e,t){for(var n,r;;){if(e.lookahead<C){if(oe(e),e.lookahead<C&&t===u)return H;if(0===e.lookahead)break}if(n=0,e.lookahead>=U&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==n&&e.strstart-n<=e.w_size-C&&(e.match_length=ae(e,n)),e.match_length>=U)if(r=a._tr_tally(e,e.strstart-e.match_start,e.match_length-U),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=U){e.match_length--;do{e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!=--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else r=a._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(r&&(te(e,!1),0===e.strm.avail_out))return H}return e.insert=e.strstart<U-1?e.strstart:U-1,t===c?(te(e,!0),0===e.strm.avail_out?J:K):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?H:G}function le(e,t){for(var n,r,i;;){if(e.lookahead<C){if(oe(e),e.lookahead<C&&t===u)return H;if(0===e.lookahead)break}if(n=0,e.lookahead>=U&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=U-1,0!==n&&e.prev_length<e.max_lazy_match&&e.strstart-n<=e.w_size-C&&(e.match_length=ae(e,n),e.match_length<=5&&(e.strategy===y||e.match_length===U&&e.strstart-e.match_start>4096)&&(e.match_length=U-1)),e.prev_length>=U&&e.match_length<=e.prev_length){i=e.strstart+e.lookahead-U,r=a._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-U),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+U-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!=--e.prev_length);if(e.match_available=0,e.match_length=U-1,e.strstart++,r&&(te(e,!1),0===e.strm.avail_out))return H}else if(e.match_available){if((r=a._tr_tally(e,0,e.window[e.strstart-1]))&&te(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return H}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(r=a._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<U-1?e.strstart:U-1,t===c?(te(e,!0),0===e.strm.avail_out?J:K):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?H:G}function ue(e,t,n,r,i){this.good_length=e,this.max_lazy=t,this.nice_length=n,this.max_chain=r,this.func=i}function fe(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=x,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?P:q,e.adler=2===t.wrap?0:1,t.last_flush=u,a._tr_init(t),_):X(e,g)}function he(e){var t=fe(e);return t===_&&function(e){e.window_size=2*e.w_size,Q(e.head),e.max_lazy_match=r[e.level].max_lazy,e.good_match=r[e.level].good_length,e.nice_match=r[e.level].nice_length,e.max_chain_length=r[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=U-1,e.match_available=0,e.ins_h=0}(e.state),t}function ce(e,t,n,r,a,o){if(!e)return g;var s=1;if(t===b&&(t=6),r<0?(s=0,r=-r):r>15&&(s=2,r-=16),a<1||a>A||n!==T||r<8||r>15||t<0||t>9||o<0||o>k)return X(e,g);8===r&&(r=9);var l=new function(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=T,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new i.Buf16(2*B),this.dyn_dtree=new i.Buf16(2*(2*N+1)),this.bl_tree=new i.Buf16(2*(2*O+1)),Q(this.dyn_ltree),Q(this.dyn_dtree),Q(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new i.Buf16(M+1),this.heap=new i.Buf16(2*I+1),Q(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new i.Buf16(2*I+1),Q(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0};return e.state=l,l.strm=e,l.wrap=s,l.gzhead=null,l.w_bits=r,l.w_size=1<<l.w_bits,l.w_mask=l.w_size-1,l.hash_bits=a+7,l.hash_size=1<<l.hash_bits,l.hash_mask=l.hash_size-1,l.hash_shift=~~((l.hash_bits+U-1)/U),l.window=new i.Buf8(2*l.w_size),l.head=new i.Buf16(l.hash_size),l.prev=new i.Buf16(l.w_size),l.lit_bufsize=1<<a+6,l.pending_buf_size=4*l.lit_bufsize,l.pending_buf=new i.Buf8(l.pending_buf_size),l.d_buf=1*l.lit_bufsize,l.l_buf=3*l.lit_bufsize,l.level=t,l.strategy=o,l.method=n,he(e)}r=[new ue(0,0,0,0,function(e,t){var n=65535;for(n>e.pending_buf_size-5&&(n=e.pending_buf_size-5);;){if(e.lookahead<=1){if(oe(e),0===e.lookahead&&t===u)return H;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var r=e.block_start+n;if((0===e.strstart||e.strstart>=r)&&(e.lookahead=e.strstart-r,e.strstart=r,te(e,!1),0===e.strm.avail_out))return H;if(e.strstart-e.block_start>=e.w_size-C&&(te(e,!1),0===e.strm.avail_out))return H}return e.insert=0,t===c?(te(e,!0),0===e.strm.avail_out?J:K):(e.strstart>e.block_start&&(te(e,!1),e.strm.avail_out),H)}),new ue(4,4,8,4,se),new ue(4,5,16,8,se),new ue(4,6,32,32,se),new ue(4,4,16,16,le),new ue(8,16,32,32,le),new ue(8,16,128,128,le),new ue(8,32,128,256,le),new ue(32,128,258,1024,le),new ue(32,258,258,4096,le)],t.deflateInit=function(e,t){return ce(e,t,T,R,L,S)},t.deflateInit2=ce,t.deflateReset=he,t.deflateResetKeep=fe,t.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?g:(e.state.gzhead=t,_):g},t.deflate=function(e,t){var n,i,o,l;if(!e||!e.state||t>d||t<0)return e?X(e,g):g;if(i=e.state,!e.output||!e.input&&0!==e.avail_in||i.status===Y&&t!==c)return X(e,0===e.avail_out?v:g);if(i.strm=e,n=i.last_flush,i.last_flush=t,i.status===P)if(2===i.wrap)e.adler=0,ne(i,31),ne(i,139),ne(i,8),i.gzhead?(ne(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),ne(i,255&i.gzhead.time),ne(i,i.gzhead.time>>8&255),ne(i,i.gzhead.time>>16&255),ne(i,i.gzhead.time>>24&255),ne(i,9===i.level?2:i.strategy>=w||i.level<2?4:0),ne(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(ne(i,255&i.gzhead.extra.length),ne(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(e.adler=s(e.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=F):(ne(i,0),ne(i,0),ne(i,0),ne(i,0),ne(i,0),ne(i,9===i.level?2:i.strategy>=w||i.level<2?4:0),ne(i,V),i.status=q);else{var m=T+(i.w_bits-8<<4)<<8;m|=(i.strategy>=w||i.level<2?0:i.level<6?1:6===i.level?2:3)<<6,0!==i.strstart&&(m|=z),m+=31-m%31,i.status=q,re(i,m),0!==i.strstart&&(re(i,e.adler>>>16),re(i,65535&e.adler)),e.adler=1}if(i.status===F)if(i.gzhead.extra){for(o=i.pending;i.gzindex<(65535&i.gzhead.extra.length)&&(i.pending!==i.pending_buf_size||(i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),ee(e),o=i.pending,i.pending!==i.pending_buf_size));)ne(i,255&i.gzhead.extra[i.gzindex]),i.gzindex++;i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),i.gzindex===i.gzhead.extra.length&&(i.gzindex=0,i.status=Z)}else i.status=Z;if(i.status===Z)if(i.gzhead.name){o=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),ee(e),o=i.pending,i.pending===i.pending_buf_size)){l=1;break}l=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,ne(i,l)}while(0!==l);i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),0===l&&(i.gzindex=0,i.status=j)}else i.status=j;if(i.status===j)if(i.gzhead.comment){o=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),ee(e),o=i.pending,i.pending===i.pending_buf_size)){l=1;break}l=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,ne(i,l)}while(0!==l);i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),0===l&&(i.status=W)}else i.status=W;if(i.status===W&&(i.gzhead.hcrc?(i.pending+2>i.pending_buf_size&&ee(e),i.pending+2<=i.pending_buf_size&&(ne(i,255&e.adler),ne(i,e.adler>>8&255),e.adler=0,i.status=q)):i.status=q),0!==i.pending){if(ee(e),0===e.avail_out)return i.last_flush=-1,_}else if(0===e.avail_in&&$(t)<=$(n)&&t!==c)return X(e,v);if(i.status===Y&&0!==e.avail_in)return X(e,v);if(0!==e.avail_in||0!==i.lookahead||t!==u&&i.status!==Y){var b=i.strategy===w?function(e,t){for(var n;;){if(0===e.lookahead&&(oe(e),0===e.lookahead)){if(t===u)return H;break}if(e.match_length=0,n=a._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,n&&(te(e,!1),0===e.strm.avail_out))return H}return e.insert=0,t===c?(te(e,!0),0===e.strm.avail_out?J:K):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?H:G}(i,t):i.strategy===E?function(e,t){for(var n,r,i,o,s=e.window;;){if(e.lookahead<=D){if(oe(e),e.lookahead<=D&&t===u)return H;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=U&&e.strstart>0&&(r=s[i=e.strstart-1])===s[++i]&&r===s[++i]&&r===s[++i]){o=e.strstart+D;do{}while(r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&i<o);e.match_length=D-(o-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=U?(n=a._tr_tally(e,1,e.match_length-U),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(n=a._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),n&&(te(e,!1),0===e.strm.avail_out))return H}return e.insert=0,t===c?(te(e,!0),0===e.strm.avail_out?J:K):e.last_lit&&(te(e,!1),0===e.strm.avail_out)?H:G}(i,t):r[i.level].func(i,t);if(b!==J&&b!==K||(i.status=Y),b===H||b===J)return 0===e.avail_out&&(i.last_flush=-1),_;if(b===G&&(t===f?a._tr_align(i):t!==d&&(a._tr_stored_block(i,0,0,!1),t===h&&(Q(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),ee(e),0===e.avail_out))return i.last_flush=-1,_}return t!==c?_:i.wrap<=0?p:(2===i.wrap?(ne(i,255&e.adler),ne(i,e.adler>>8&255),ne(i,e.adler>>16&255),ne(i,e.adler>>24&255),ne(i,255&e.total_in),ne(i,e.total_in>>8&255),ne(i,e.total_in>>16&255),ne(i,e.total_in>>24&255)):(re(i,e.adler>>>16),re(i,65535&e.adler)),ee(e),i.wrap>0&&(i.wrap=-i.wrap),0!==i.pending?_:p)},t.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==P&&t!==F&&t!==Z&&t!==j&&t!==W&&t!==q&&t!==Y?X(e,g):(e.state=null,t===q?X(e,m):_):g},t.deflateSetDictionary=function(e,t){var n,r,a,s,l,u,f,h,c=t.length;if(!e||!e.state)return g;if(2===(s=(n=e.state).wrap)||1===s&&n.status!==P||n.lookahead)return g;for(1===s&&(e.adler=o(e.adler,t,c,0)),n.wrap=0,c>=n.w_size&&(0===s&&(Q(n.head),n.strstart=0,n.block_start=0,n.insert=0),h=new i.Buf8(n.w_size),i.arraySet(h,t,c-n.w_size,n.w_size,0),t=h,c=n.w_size),l=e.avail_in,u=e.next_in,f=e.input,e.avail_in=c,e.next_in=0,e.input=t,oe(n);n.lookahead>=U;){r=n.strstart,a=n.lookahead-(U-1);do{n.ins_h=(n.ins_h<<n.hash_shift^n.window[r+U-1])&n.hash_mask,n.prev[r&n.w_mask]=n.head[n.ins_h],n.head[n.ins_h]=r,r++}while(--a);n.strstart=r,n.lookahead=U-1,oe(n)}return n.strstart+=n.lookahead,n.block_start=n.strstart,n.insert=n.lookahead,n.lookahead=0,n.match_length=n.prev_length=U-1,n.match_available=0,e.next_in=u,e.input=f,e.avail_in=l,n.wrap=s,_},t.deflateInfo="pako deflate (from Nodeca project)"},function(e,t,n){"use strict";var r=n(8),i=4,a=0,o=1,s=2;function l(e){for(var t=e.length;--t>=0;)e[t]=0}var u=0,f=1,h=2,c=29,d=256,_=d+1+c,p=30,g=19,m=2*_+1,v=15,b=16,y=7,w=256,E=16,k=17,S=18,x=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],T=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],A=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],R=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],L=new Array(2*(_+2));l(L);var I=new Array(2*p);l(I);var N=new Array(512);l(N);var O=new Array(256);l(O);var B=new Array(c);l(B);var M,U,D,C=new Array(p);function z(e,t,n,r,i){this.static_tree=e,this.extra_bits=t,this.extra_base=n,this.elems=r,this.max_length=i,this.has_stree=e&&e.length}function P(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function F(e){return e<256?N[e]:N[256+(e>>>7)]}function Z(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function j(e,t,n){e.bi_valid>b-n?(e.bi_buf|=t<<e.bi_valid&65535,Z(e,e.bi_buf),e.bi_buf=t>>b-e.bi_valid,e.bi_valid+=n-b):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=n)}function W(e,t,n){j(e,n[2*t],n[2*t+1])}function q(e,t){var n=0;do{n|=1&e,e>>>=1,n<<=1}while(--t>0);return n>>>1}function Y(e,t,n){var r,i,a=new Array(v+1),o=0;for(r=1;r<=v;r++)a[r]=o=o+n[r-1]<<1;for(i=0;i<=t;i++){var s=e[2*i+1];0!==s&&(e[2*i]=q(a[s]++,s))}}function H(e){var t;for(t=0;t<_;t++)e.dyn_ltree[2*t]=0;for(t=0;t<p;t++)e.dyn_dtree[2*t]=0;for(t=0;t<g;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*w]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function G(e){e.bi_valid>8?Z(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function J(e,t,n,r){var i=2*t,a=2*n;return e[i]<e[a]||e[i]===e[a]&&r[t]<=r[n]}function K(e,t,n){for(var r=e.heap[n],i=n<<1;i<=e.heap_len&&(i<e.heap_len&&J(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!J(t,r,e.heap[i],e.depth));)e.heap[n]=e.heap[i],n=i,i<<=1;e.heap[n]=r}function V(e,t,n){var r,i,a,o,s=0;if(0!==e.last_lit)do{r=e.pending_buf[e.d_buf+2*s]<<8|e.pending_buf[e.d_buf+2*s+1],i=e.pending_buf[e.l_buf+s],s++,0===r?W(e,i,t):(W(e,(a=O[i])+d+1,t),0!==(o=x[a])&&j(e,i-=B[a],o),W(e,a=F(--r),n),0!==(o=T[a])&&j(e,r-=C[a],o))}while(s<e.last_lit);W(e,w,t)}function X(e,t){var n,r,i,a=t.dyn_tree,o=t.stat_desc.static_tree,s=t.stat_desc.has_stree,l=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=m,n=0;n<l;n++)0!==a[2*n]?(e.heap[++e.heap_len]=u=n,e.depth[n]=0):a[2*n+1]=0;for(;e.heap_len<2;)a[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,s&&(e.static_len-=o[2*i+1]);for(t.max_code=u,n=e.heap_len>>1;n>=1;n--)K(e,a,n);i=l;do{n=e.heap[1],e.heap[1]=e.heap[e.heap_len--],K(e,a,1),r=e.heap[1],e.heap[--e.heap_max]=n,e.heap[--e.heap_max]=r,a[2*i]=a[2*n]+a[2*r],e.depth[i]=(e.depth[n]>=e.depth[r]?e.depth[n]:e.depth[r])+1,a[2*n+1]=a[2*r+1]=i,e.heap[1]=i++,K(e,a,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],function(e,t){var n,r,i,a,o,s,l=t.dyn_tree,u=t.max_code,f=t.stat_desc.static_tree,h=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,_=t.stat_desc.max_length,p=0;for(a=0;a<=v;a++)e.bl_count[a]=0;for(l[2*e.heap[e.heap_max]+1]=0,n=e.heap_max+1;n<m;n++)(a=l[2*l[2*(r=e.heap[n])+1]+1]+1)>_&&(a=_,p++),l[2*r+1]=a,r>u||(e.bl_count[a]++,o=0,r>=d&&(o=c[r-d]),s=l[2*r],e.opt_len+=s*(a+o),h&&(e.static_len+=s*(f[2*r+1]+o)));if(0!==p){do{for(a=_-1;0===e.bl_count[a];)a--;e.bl_count[a]--,e.bl_count[a+1]+=2,e.bl_count[_]--,p-=2}while(p>0);for(a=_;0!==a;a--)for(r=e.bl_count[a];0!==r;)(i=e.heap[--n])>u||(l[2*i+1]!==a&&(e.opt_len+=(a-l[2*i+1])*l[2*i],l[2*i+1]=a),r--)}}(e,t),Y(a,u,e.bl_count)}function $(e,t,n){var r,i,a=-1,o=t[1],s=0,l=7,u=4;for(0===o&&(l=138,u=3),t[2*(n+1)+1]=65535,r=0;r<=n;r++)i=o,o=t[2*(r+1)+1],++s<l&&i===o||(s<u?e.bl_tree[2*i]+=s:0!==i?(i!==a&&e.bl_tree[2*i]++,e.bl_tree[2*E]++):s<=10?e.bl_tree[2*k]++:e.bl_tree[2*S]++,s=0,a=i,0===o?(l=138,u=3):i===o?(l=6,u=3):(l=7,u=4))}function Q(e,t,n){var r,i,a=-1,o=t[1],s=0,l=7,u=4;for(0===o&&(l=138,u=3),r=0;r<=n;r++)if(i=o,o=t[2*(r+1)+1],!(++s<l&&i===o)){if(s<u)do{W(e,i,e.bl_tree)}while(0!=--s);else 0!==i?(i!==a&&(W(e,i,e.bl_tree),s--),W(e,E,e.bl_tree),j(e,s-3,2)):s<=10?(W(e,k,e.bl_tree),j(e,s-3,3)):(W(e,S,e.bl_tree),j(e,s-11,7));s=0,a=i,0===o?(l=138,u=3):i===o?(l=6,u=3):(l=7,u=4)}}l(C);var ee=!1;function te(e,t,n,i){j(e,(u<<1)+(i?1:0),3),function(e,t,n,i){G(e),i&&(Z(e,n),Z(e,~n)),r.arraySet(e.pending_buf,e.window,t,n,e.pending),e.pending+=n}(e,t,n,!0)}t._tr_init=function(e){ee||(function(){var e,t,n,r,i,a=new Array(v+1);for(n=0,r=0;r<c-1;r++)for(B[r]=n,e=0;e<1<<x[r];e++)O[n++]=r;for(O[n-1]=r,i=0,r=0;r<16;r++)for(C[r]=i,e=0;e<1<<T[r];e++)N[i++]=r;for(i>>=7;r<p;r++)for(C[r]=i<<7,e=0;e<1<<T[r]-7;e++)N[256+i++]=r;for(t=0;t<=v;t++)a[t]=0;for(e=0;e<=143;)L[2*e+1]=8,e++,a[8]++;for(;e<=255;)L[2*e+1]=9,e++,a[9]++;for(;e<=279;)L[2*e+1]=7,e++,a[7]++;for(;e<=287;)L[2*e+1]=8,e++,a[8]++;for(Y(L,_+1,a),e=0;e<p;e++)I[2*e+1]=5,I[2*e]=q(e,5);M=new z(L,x,d+1,_,v),U=new z(I,T,0,p,v),D=new z(new Array(0),A,0,g,y)}(),ee=!0),e.l_desc=new P(e.dyn_ltree,M),e.d_desc=new P(e.dyn_dtree,U),e.bl_desc=new P(e.bl_tree,D),e.bi_buf=0,e.bi_valid=0,H(e)},t._tr_stored_block=te,t._tr_flush_block=function(e,t,n,r){var l,u,c=0;e.level>0?(e.strm.data_type===s&&(e.strm.data_type=function(e){var t,n=4093624447;for(t=0;t<=31;t++,n>>>=1)if(1&n&&0!==e.dyn_ltree[2*t])return a;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return o;for(t=32;t<d;t++)if(0!==e.dyn_ltree[2*t])return o;return a}(e)),X(e,e.l_desc),X(e,e.d_desc),c=function(e){var t;for($(e,e.dyn_ltree,e.l_desc.max_code),$(e,e.dyn_dtree,e.d_desc.max_code),X(e,e.bl_desc),t=g-1;t>=3&&0===e.bl_tree[2*R[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),l=e.opt_len+3+7>>>3,(u=e.static_len+3+7>>>3)<=l&&(l=u)):l=u=n+5,n+4<=l&&-1!==t?te(e,t,n,r):e.strategy===i||u===l?(j(e,(f<<1)+(r?1:0),3),V(e,L,I)):(j(e,(h<<1)+(r?1:0),3),function(e,t,n,r){var i;for(j(e,t-257,5),j(e,n-1,5),j(e,r-4,4),i=0;i<r;i++)j(e,e.bl_tree[2*R[i]+1],3);Q(e,e.dyn_ltree,t-1),Q(e,e.dyn_dtree,n-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,c+1),V(e,e.dyn_ltree,e.dyn_dtree)),H(e),r&&G(e)},t._tr_tally=function(e,t,n){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&n,e.last_lit++,0===t?e.dyn_ltree[2*n]++:(e.matches++,t--,e.dyn_ltree[2*(O[n]+d+1)]++,e.dyn_dtree[2*F(t)]++),e.last_lit===e.lit_bufsize-1},t._tr_align=function(e){j(e,f<<1,3),W(e,w,L),function(e){16===e.bi_valid?(Z(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},function(e,t,n){"use strict";e.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},function(e,t,n){"use strict";var r=n(8),i=n(20),a=n(21),o=n(44),s=n(45),l=0,u=1,f=2,h=4,c=5,d=6,_=0,p=1,g=2,m=-2,v=-3,b=-4,y=-5,w=8,E=1,k=2,S=3,x=4,T=5,A=6,R=7,L=8,I=9,N=10,O=11,B=12,M=13,U=14,D=15,C=16,z=17,P=18,F=19,Z=20,j=21,W=22,q=23,Y=24,H=25,G=26,J=27,K=28,V=29,X=30,$=31,Q=32,ee=852,te=592,ne=15;function re(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function ie(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=E,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new r.Buf32(ee),t.distcode=t.distdyn=new r.Buf32(te),t.sane=1,t.back=-1,_):m}function ae(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,ie(e)):m}function oe(e,t){var n,r;return e&&e.state?(r=e.state,t<0?(n=0,t=-t):(n=1+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?m:(null!==r.window&&r.wbits!==t&&(r.window=null),r.wrap=n,r.wbits=t,ae(e))):m}function se(e,t){var n,i;return e?(i=new function(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new r.Buf16(320),this.work=new r.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0},e.state=i,i.window=null,(n=oe(e,t))!==_&&(e.state=null),n):m}var le,ue,fe=!0;function he(e){if(fe){var t;for(le=new r.Buf32(512),ue=new r.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(s(u,e.lens,0,288,le,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;s(f,e.lens,0,32,ue,0,e.work,{bits:5}),fe=!1}e.lencode=le,e.lenbits=9,e.distcode=ue,e.distbits=5}function ce(e,t,n,i){var a,o=e.state;return null===o.window&&(o.wsize=1<<o.wbits,o.wnext=0,o.whave=0,o.window=new r.Buf8(o.wsize)),i>=o.wsize?(r.arraySet(o.window,t,n-o.wsize,o.wsize,0),o.wnext=0,o.whave=o.wsize):((a=o.wsize-o.wnext)>i&&(a=i),r.arraySet(o.window,t,n-i,a,o.wnext),(i-=a)?(r.arraySet(o.window,t,n-i,i,0),o.wnext=i,o.whave=o.wsize):(o.wnext+=a,o.wnext===o.wsize&&(o.wnext=0),o.whave<o.wsize&&(o.whave+=a))),0}t.inflateReset=ae,t.inflateReset2=oe,t.inflateResetKeep=ie,t.inflateInit=function(e){return se(e,ne)},t.inflateInit2=se,t.inflate=function(e,t){var n,ee,te,ne,ie,ae,oe,se,le,ue,fe,de,_e,pe,ge,me,ve,be,ye,we,Ee,ke,Se,xe,Te=0,Ae=new r.Buf8(4),Re=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return m;(n=e.state).mode===B&&(n.mode=M),ie=e.next_out,te=e.output,oe=e.avail_out,ne=e.next_in,ee=e.input,ae=e.avail_in,se=n.hold,le=n.bits,ue=ae,fe=oe,ke=_;e:for(;;)switch(n.mode){case E:if(0===n.wrap){n.mode=M;break}for(;le<16;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(2&n.wrap&&35615===se){n.check=0,Ae[0]=255&se,Ae[1]=se>>>8&255,n.check=a(n.check,Ae,2,0),se=0,le=0,n.mode=k;break}if(n.flags=0,n.head&&(n.head.done=!1),!(1&n.wrap)||(((255&se)<<8)+(se>>8))%31){e.msg="incorrect header check",n.mode=X;break}if((15&se)!==w){e.msg="unknown compression method",n.mode=X;break}if(le-=4,Ee=8+(15&(se>>>=4)),0===n.wbits)n.wbits=Ee;else if(Ee>n.wbits){e.msg="invalid window size",n.mode=X;break}n.dmax=1<<Ee,e.adler=n.check=1,n.mode=512&se?N:B,se=0,le=0;break;case k:for(;le<16;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(n.flags=se,(255&n.flags)!==w){e.msg="unknown compression method",n.mode=X;break}if(57344&n.flags){e.msg="unknown header flags set",n.mode=X;break}n.head&&(n.head.text=se>>8&1),512&n.flags&&(Ae[0]=255&se,Ae[1]=se>>>8&255,n.check=a(n.check,Ae,2,0)),se=0,le=0,n.mode=S;case S:for(;le<32;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}n.head&&(n.head.time=se),512&n.flags&&(Ae[0]=255&se,Ae[1]=se>>>8&255,Ae[2]=se>>>16&255,Ae[3]=se>>>24&255,n.check=a(n.check,Ae,4,0)),se=0,le=0,n.mode=x;case x:for(;le<16;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}n.head&&(n.head.xflags=255&se,n.head.os=se>>8),512&n.flags&&(Ae[0]=255&se,Ae[1]=se>>>8&255,n.check=a(n.check,Ae,2,0)),se=0,le=0,n.mode=T;case T:if(1024&n.flags){for(;le<16;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}n.length=se,n.head&&(n.head.extra_len=se),512&n.flags&&(Ae[0]=255&se,Ae[1]=se>>>8&255,n.check=a(n.check,Ae,2,0)),se=0,le=0}else n.head&&(n.head.extra=null);n.mode=A;case A:if(1024&n.flags&&((de=n.length)>ae&&(de=ae),de&&(n.head&&(Ee=n.head.extra_len-n.length,n.head.extra||(n.head.extra=new Array(n.head.extra_len)),r.arraySet(n.head.extra,ee,ne,de,Ee)),512&n.flags&&(n.check=a(n.check,ee,de,ne)),ae-=de,ne+=de,n.length-=de),n.length))break e;n.length=0,n.mode=R;case R:if(2048&n.flags){if(0===ae)break e;de=0;do{Ee=ee[ne+de++],n.head&&Ee&&n.length<65536&&(n.head.name+=String.fromCharCode(Ee))}while(Ee&&de<ae);if(512&n.flags&&(n.check=a(n.check,ee,de,ne)),ae-=de,ne+=de,Ee)break e}else n.head&&(n.head.name=null);n.length=0,n.mode=L;case L:if(4096&n.flags){if(0===ae)break e;de=0;do{Ee=ee[ne+de++],n.head&&Ee&&n.length<65536&&(n.head.comment+=String.fromCharCode(Ee))}while(Ee&&de<ae);if(512&n.flags&&(n.check=a(n.check,ee,de,ne)),ae-=de,ne+=de,Ee)break e}else n.head&&(n.head.comment=null);n.mode=I;case I:if(512&n.flags){for(;le<16;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(se!==(65535&n.check)){e.msg="header crc mismatch",n.mode=X;break}se=0,le=0}n.head&&(n.head.hcrc=n.flags>>9&1,n.head.done=!0),e.adler=n.check=0,n.mode=B;break;case N:for(;le<32;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}e.adler=n.check=re(se),se=0,le=0,n.mode=O;case O:if(0===n.havedict)return e.next_out=ie,e.avail_out=oe,e.next_in=ne,e.avail_in=ae,n.hold=se,n.bits=le,g;e.adler=n.check=1,n.mode=B;case B:if(t===c||t===d)break e;case M:if(n.last){se>>>=7&le,le-=7&le,n.mode=J;break}for(;le<3;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}switch(n.last=1&se,le-=1,3&(se>>>=1)){case 0:n.mode=U;break;case 1:if(he(n),n.mode=Z,t===d){se>>>=2,le-=2;break e}break;case 2:n.mode=z;break;case 3:e.msg="invalid block type",n.mode=X}se>>>=2,le-=2;break;case U:for(se>>>=7&le,le-=7&le;le<32;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if((65535&se)!=(se>>>16^65535)){e.msg="invalid stored block lengths",n.mode=X;break}if(n.length=65535&se,se=0,le=0,n.mode=D,t===d)break e;case D:n.mode=C;case C:if(de=n.length){if(de>ae&&(de=ae),de>oe&&(de=oe),0===de)break e;r.arraySet(te,ee,ne,de,ie),ae-=de,ne+=de,oe-=de,ie+=de,n.length-=de;break}n.mode=B;break;case z:for(;le<14;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(n.nlen=257+(31&se),se>>>=5,le-=5,n.ndist=1+(31&se),se>>>=5,le-=5,n.ncode=4+(15&se),se>>>=4,le-=4,n.nlen>286||n.ndist>30){e.msg="too many length or distance symbols",n.mode=X;break}n.have=0,n.mode=P;case P:for(;n.have<n.ncode;){for(;le<3;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}n.lens[Re[n.have++]]=7&se,se>>>=3,le-=3}for(;n.have<19;)n.lens[Re[n.have++]]=0;if(n.lencode=n.lendyn,n.lenbits=7,Se={bits:n.lenbits},ke=s(l,n.lens,0,19,n.lencode,0,n.work,Se),n.lenbits=Se.bits,ke){e.msg="invalid code lengths set",n.mode=X;break}n.have=0,n.mode=F;case F:for(;n.have<n.nlen+n.ndist;){for(;me=(Te=n.lencode[se&(1<<n.lenbits)-1])>>>16&255,ve=65535&Te,!((ge=Te>>>24)<=le);){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(ve<16)se>>>=ge,le-=ge,n.lens[n.have++]=ve;else{if(16===ve){for(xe=ge+2;le<xe;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(se>>>=ge,le-=ge,0===n.have){e.msg="invalid bit length repeat",n.mode=X;break}Ee=n.lens[n.have-1],de=3+(3&se),se>>>=2,le-=2}else if(17===ve){for(xe=ge+3;le<xe;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}le-=ge,Ee=0,de=3+(7&(se>>>=ge)),se>>>=3,le-=3}else{for(xe=ge+7;le<xe;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}le-=ge,Ee=0,de=11+(127&(se>>>=ge)),se>>>=7,le-=7}if(n.have+de>n.nlen+n.ndist){e.msg="invalid bit length repeat",n.mode=X;break}for(;de--;)n.lens[n.have++]=Ee}}if(n.mode===X)break;if(0===n.lens[256]){e.msg="invalid code -- missing end-of-block",n.mode=X;break}if(n.lenbits=9,Se={bits:n.lenbits},ke=s(u,n.lens,0,n.nlen,n.lencode,0,n.work,Se),n.lenbits=Se.bits,ke){e.msg="invalid literal/lengths set",n.mode=X;break}if(n.distbits=6,n.distcode=n.distdyn,Se={bits:n.distbits},ke=s(f,n.lens,n.nlen,n.ndist,n.distcode,0,n.work,Se),n.distbits=Se.bits,ke){e.msg="invalid distances set",n.mode=X;break}if(n.mode=Z,t===d)break e;case Z:n.mode=j;case j:if(ae>=6&&oe>=258){e.next_out=ie,e.avail_out=oe,e.next_in=ne,e.avail_in=ae,n.hold=se,n.bits=le,o(e,fe),ie=e.next_out,te=e.output,oe=e.avail_out,ne=e.next_in,ee=e.input,ae=e.avail_in,se=n.hold,le=n.bits,n.mode===B&&(n.back=-1);break}for(n.back=0;me=(Te=n.lencode[se&(1<<n.lenbits)-1])>>>16&255,ve=65535&Te,!((ge=Te>>>24)<=le);){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(me&&0==(240&me)){for(be=ge,ye=me,we=ve;me=(Te=n.lencode[we+((se&(1<<be+ye)-1)>>be)])>>>16&255,ve=65535&Te,!(be+(ge=Te>>>24)<=le);){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}se>>>=be,le-=be,n.back+=be}if(se>>>=ge,le-=ge,n.back+=ge,n.length=ve,0===me){n.mode=G;break}if(32&me){n.back=-1,n.mode=B;break}if(64&me){e.msg="invalid literal/length code",n.mode=X;break}n.extra=15&me,n.mode=W;case W:if(n.extra){for(xe=n.extra;le<xe;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}n.length+=se&(1<<n.extra)-1,se>>>=n.extra,le-=n.extra,n.back+=n.extra}n.was=n.length,n.mode=q;case q:for(;me=(Te=n.distcode[se&(1<<n.distbits)-1])>>>16&255,ve=65535&Te,!((ge=Te>>>24)<=le);){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(0==(240&me)){for(be=ge,ye=me,we=ve;me=(Te=n.distcode[we+((se&(1<<be+ye)-1)>>be)])>>>16&255,ve=65535&Te,!(be+(ge=Te>>>24)<=le);){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}se>>>=be,le-=be,n.back+=be}if(se>>>=ge,le-=ge,n.back+=ge,64&me){e.msg="invalid distance code",n.mode=X;break}n.offset=ve,n.extra=15&me,n.mode=Y;case Y:if(n.extra){for(xe=n.extra;le<xe;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}n.offset+=se&(1<<n.extra)-1,se>>>=n.extra,le-=n.extra,n.back+=n.extra}if(n.offset>n.dmax){e.msg="invalid distance too far back",n.mode=X;break}n.mode=H;case H:if(0===oe)break e;if(de=fe-oe,n.offset>de){if((de=n.offset-de)>n.whave&&n.sane){e.msg="invalid distance too far back",n.mode=X;break}de>n.wnext?(de-=n.wnext,_e=n.wsize-de):_e=n.wnext-de,de>n.length&&(de=n.length),pe=n.window}else pe=te,_e=ie-n.offset,de=n.length;de>oe&&(de=oe),oe-=de,n.length-=de;do{te[ie++]=pe[_e++]}while(--de);0===n.length&&(n.mode=j);break;case G:if(0===oe)break e;te[ie++]=n.length,oe--,n.mode=j;break;case J:if(n.wrap){for(;le<32;){if(0===ae)break e;ae--,se|=ee[ne++]<<le,le+=8}if(fe-=oe,e.total_out+=fe,n.total+=fe,fe&&(e.adler=n.check=n.flags?a(n.check,te,fe,ie-fe):i(n.check,te,fe,ie-fe)),fe=oe,(n.flags?se:re(se))!==n.check){e.msg="incorrect data check",n.mode=X;break}se=0,le=0}n.mode=K;case K:if(n.wrap&&n.flags){for(;le<32;){if(0===ae)break e;ae--,se+=ee[ne++]<<le,le+=8}if(se!==(4294967295&n.total)){e.msg="incorrect length check",n.mode=X;break}se=0,le=0}n.mode=V;case V:ke=p;break e;case X:ke=v;break e;case $:return b;case Q:default:return m}return e.next_out=ie,e.avail_out=oe,e.next_in=ne,e.avail_in=ae,n.hold=se,n.bits=le,(n.wsize||fe!==e.avail_out&&n.mode<X&&(n.mode<J||t!==h))&&ce(e,e.output,e.next_out,fe-e.avail_out)?(n.mode=$,b):(ue-=e.avail_in,fe-=e.avail_out,e.total_in+=ue,e.total_out+=fe,n.total+=fe,n.wrap&&fe&&(e.adler=n.check=n.flags?a(n.check,te,fe,e.next_out-fe):i(n.check,te,fe,e.next_out-fe)),e.data_type=n.bits+(n.last?64:0)+(n.mode===B?128:0)+(n.mode===Z||n.mode===D?256:0),(0===ue&&0===fe||t===h)&&ke===_&&(ke=y),ke)},t.inflateEnd=function(e){if(!e||!e.state)return m;var t=e.state;return t.window&&(t.window=null),e.state=null,_},t.inflateGetHeader=function(e,t){var n;return e&&e.state?0==(2&(n=e.state).wrap)?m:(n.head=t,t.done=!1,_):m},t.inflateSetDictionary=function(e,t){var n,r=t.length;return e&&e.state?0!==(n=e.state).wrap&&n.mode!==O?m:n.mode===O&&i(1,t,r,0)!==n.check?v:ce(e,t,r,r)?(n.mode=$,b):(n.havedict=1,_):m},t.inflateInfo="pako inflate (from Nodeca project)"},function(e,t,n){"use strict";e.exports=function(e,t){var n,r,i,a,o,s,l,u,f,h,c,d,_,p,g,m,v,b,y,w,E,k,S,x,T;n=e.state,r=e.next_in,x=e.input,i=r+(e.avail_in-5),a=e.next_out,T=e.output,o=a-(t-e.avail_out),s=a+(e.avail_out-257),l=n.dmax,u=n.wsize,f=n.whave,h=n.wnext,c=n.window,d=n.hold,_=n.bits,p=n.lencode,g=n.distcode,m=(1<<n.lenbits)-1,v=(1<<n.distbits)-1;e:do{_<15&&(d+=x[r++]<<_,_+=8,d+=x[r++]<<_,_+=8),b=p[d&m];t:for(;;){if(d>>>=y=b>>>24,_-=y,0===(y=b>>>16&255))T[a++]=65535&b;else{if(!(16&y)){if(0==(64&y)){b=p[(65535&b)+(d&(1<<y)-1)];continue t}if(32&y){n.mode=12;break e}e.msg="invalid literal/length code",n.mode=30;break e}w=65535&b,(y&=15)&&(_<y&&(d+=x[r++]<<_,_+=8),w+=d&(1<<y)-1,d>>>=y,_-=y),_<15&&(d+=x[r++]<<_,_+=8,d+=x[r++]<<_,_+=8),b=g[d&v];n:for(;;){if(d>>>=y=b>>>24,_-=y,!(16&(y=b>>>16&255))){if(0==(64&y)){b=g[(65535&b)+(d&(1<<y)-1)];continue n}e.msg="invalid distance code",n.mode=30;break e}if(E=65535&b,_<(y&=15)&&(d+=x[r++]<<_,(_+=8)<y&&(d+=x[r++]<<_,_+=8)),(E+=d&(1<<y)-1)>l){e.msg="invalid distance too far back",n.mode=30;break e}if(d>>>=y,_-=y,E>(y=a-o)){if((y=E-y)>f&&n.sane){e.msg="invalid distance too far back",n.mode=30;break e}if(k=0,S=c,0===h){if(k+=u-y,y<w){w-=y;do{T[a++]=c[k++]}while(--y);k=a-E,S=T}}else if(h<y){if(k+=u+h-y,(y-=h)<w){w-=y;do{T[a++]=c[k++]}while(--y);if(k=0,h<w){w-=y=h;do{T[a++]=c[k++]}while(--y);k=a-E,S=T}}}else if(k+=h-y,y<w){w-=y;do{T[a++]=c[k++]}while(--y);k=a-E,S=T}for(;w>2;)T[a++]=S[k++],T[a++]=S[k++],T[a++]=S[k++],w-=3;w&&(T[a++]=S[k++],w>1&&(T[a++]=S[k++]))}else{k=a-E;do{T[a++]=T[k++],T[a++]=T[k++],T[a++]=T[k++],w-=3}while(w>2);w&&(T[a++]=T[k++],w>1&&(T[a++]=T[k++]))}break}}break}}while(r<i&&a<s);r-=w=_>>3,d&=(1<<(_-=w<<3))-1,e.next_in=r,e.next_out=a,e.avail_in=r<i?i-r+5:5-(r-i),e.avail_out=a<s?s-a+257:257-(a-s),n.hold=d,n.bits=_}},function(e,t,n){"use strict";var r=n(8),i=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],a=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],o=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],s=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(e,t,n,l,u,f,h,c){var d,_,p,g,m,v,b,y,w,E=c.bits,k=0,S=0,x=0,T=0,A=0,R=0,L=0,I=0,N=0,O=0,B=null,M=0,U=new r.Buf16(16),D=new r.Buf16(16),C=null,z=0;for(k=0;k<=15;k++)U[k]=0;for(S=0;S<l;S++)U[t[n+S]]++;for(A=E,T=15;T>=1&&0===U[T];T--);if(A>T&&(A=T),0===T)return u[f++]=20971520,u[f++]=20971520,c.bits=1,0;for(x=1;x<T&&0===U[x];x++);for(A<x&&(A=x),I=1,k=1;k<=15;k++)if(I<<=1,(I-=U[k])<0)return-1;if(I>0&&(0===e||1!==T))return-1;for(D[1]=0,k=1;k<15;k++)D[k+1]=D[k]+U[k];for(S=0;S<l;S++)0!==t[n+S]&&(h[D[t[n+S]]++]=S);if(0===e?(B=C=h,v=19):1===e?(B=i,M-=257,C=a,z-=257,v=256):(B=o,C=s,v=-1),O=0,S=0,k=x,m=f,R=A,L=0,p=-1,g=(N=1<<A)-1,1===e&&N>852||2===e&&N>592)return 1;for(;;){b=k-L,h[S]<v?(y=0,w=h[S]):h[S]>v?(y=C[z+h[S]],w=B[M+h[S]]):(y=96,w=0),d=1<<k-L,x=_=1<<R;do{u[m+(O>>L)+(_-=d)]=b<<24|y<<16|w|0}while(0!==_);for(d=1<<k-1;O&d;)d>>=1;if(0!==d?(O&=d-1,O+=d):O=0,S++,0==--U[k]){if(k===T)break;k=t[n+h[S]]}if(k>A&&(O&g)!==p){for(0===L&&(L=A),m+=x,I=1<<(R=k-L);R+L<T&&!((I-=U[R+L])<=0);)R++,I<<=1;if(N+=1<<R,1===e&&N>852||2===e&&N>592)return 1;u[p=O&g]=A<<24|R<<16|m-f|0}}return 0!==O&&(u[m+O]=k-L<<24|64<<16|0),c.bits=A,0}},function(e,t,n){"use strict";e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},function(e,t,n){"use strict";n.r(t);var r=n(22),i=function(e){var t="browser";function n(e){var t,n,r;for(r=e.length;r;r--)t=Math.floor(Math.random()*r),n=e[r-1],e[r-1]=e[t],e[t]=n}function i(e,n){if("wechat"!==t){var r=new XMLHttpRequest;r.open("POST",e,!0),r.setRequestHeader("Content-type","application/json; charset=utf-8"),r.send(JSON.stringify(n))}}function a(e){return e._isBuffer=!0,function(e){var t=String.fromCharCode.apply(null,e);return decodeURIComponent(escape(t))}(Object(r.inflateSync)(e))}!function(){if("undefined"!=typeof navigator)try{"micromessenger"==navigator.userAgent.toLowerCase().match(/MicroMessenger/i)&&(console.log("Current env is wechat."),t="wechat")}catch(e){console.error(e)}else"undefined"!=typeof wx&&void 0!==wx.connectSocket&&(t="wechat")}(),this.getSDKVersion=function(){return"1.4.0"},this.getSDKVersion_int=function(){return 10104e5},this.lbs_url1=["https://lbs-1-sig.agora.io","https://lbs-2-sig.agora.io"],this.lbs_url2=["https://lbs-3-sig.agora.io","https://lbs-4-sig.agora.io"],this.lbs_wx=["https://lbs-wx.agora.io"],this.rp_url="https:///wsrp-sig.agora.io/",this.vid=e,this.appid=e;var o=this;function s(e,t,n){var r=e.split(t,n),i=0;for(var a in r)i+=t.length+r[a].length;return r.push(e.substr(i)),r}o.server_urls=[],o.setup_debugging=function(e,t){if("ap"===e)o.server_urls.push([t,8001]),o.debugging=!0;else if("ap_url"===e)o.server_urls.push(t),o.debugging=!0;else{if("env"!==e)return;"lbs100"===t&&(o.lbs_url1=["https://lbs100-1-sig.agora.io","https://lbs100-2-sig.agora.io"],o.lbs_url2=["https://lbs100-3-sig.agora.io","https://lbs100-4-sig.agora.io"])}},o.setUpDebugging=o.setup_debugging;var l=function(r,l,u,f){this.onLoginSuccess="",this.onLoginFailed="",this.onLogout="",this.onInviteReceived="",this.onMessageInstantReceive="";try{"string"!=typeof r&&(r=JSON.stringify(r))}catch(e){return console.error("Invalid account type, should be a string."),void console.error(e)}this.m_retry_max_time=f||3e5,this.m_retry_max_count=u||10,this.m_retry_count=0,this.m_retry_time_start=Date.now(),this.m_retry_delay=200,this.m_retry_delay_min=200,this.m_retry_delay_max=2e3,this.account=r,this.config_msg_set=0,this.config_inst_msg_with_msgid=0,this.debugging=o.debugging,this.m_msgid=0,this.state=1,this.line="",this.uid=0,this.dbg=!1,this.alive_conn=2;var h=this;h.lbs_state="requesting",h.lbs_state1="requesting",h.lbs_state2="requesting";var c=o.server_urls.slice();n(c),h.idx=0,this.login_start_time=null,this.login_end_time=null,this.lbs_start_time=null,this.lbs_end_time=null,this.ap_start_time=null,this.ap_end_time=null,h.browser="unknown";try{h.browser=navigator.userAgent}catch(e){o.isLogging&&(o.loggingLevel<2&&console.warn(e),console.log("This browser does not support navigator.userAgent"))}h.login_data={event:"login",now:"",time:"",duration:"",key:"",seq:"",result:"",account:"",browser:h.browser,sdk_version:o.getSDKVersion_int(),rmc:"",rmt:"",h1i1:"",h1t1:"",i2:"",i3:"",i3_0:"",i3_0_ip:"",i3_0_port:"",i3_1_ip:"",step:"",t2:"",t4:""},h.v3_msg_set=new Map,setTimeout(function(){var e=Date.now();for(var t of h.v3_msg_set.keys())if(h.v3_msg_set[t]){if(!(e-h.v3_msg_set[t]>3e5))break;h.v3_msg_set.delete(t)}},2e3),h.socket=null;var d=function(){if(o.isLogging&&0===o.loggingLevel){var e=[];for(var t in arguments)e.push(arguments[t]);console.log.apply(null,["Agora sig dbg :"].concat(e))}},_=function(e){d("Updating the session state to "+e),h.state=e},p=/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,g=function(e){return p.test(e[0])?"wss://"+(e[0].replace(/\./g,"-")+"-sig-web.agora.io")+":"+(e[1]+1)+"/":e};h.logout=function(){2===h.state&&h.onLogout?h.call2("user_logout",{line:h.line},function(e,t){h.fire_logout(101),h.socket.close()}):1===h.state&&(_(0),h.fire_logout(101))},h.fire_login_failed=function(e){try{1===h.state&&h.onLoginFailed&&h.onLoginFailed(e)}catch(e){console.error(e)}finally{_(0)}},h.fire_logout=function(e){e||(e=0);try{2!==h.state&&3!==h.state||h.onLogout&&h.onLogout(e)}catch(e){console.error(e)}finally{_(0)}},h.getStatus=function(){return h.state};var m=function(n,r,i){if("requesting"==h.lbs_state){var a=r[i];"wechat"===t?function(e,t,n){var r,i=!1;const a=wx.request({url:e,method:"GET",header:{"content-type":"application/json"},success:function(e){i||(clearTimeout(r),n("",e.data))},fail:function(){n("request failure")}});r=setTimeout(function(){i=!0,a.abort(),n("timeout","")},t)}(a+"/getaddr?vid="+e,5e3,function(e,t){if("request failure"!==e)if(!t.wx_web||t.wx_web&&0===t.wx_web.length)h.fire_login_failed(100);else if(e)n-1>0?m(n-1,r,(i+1)%r.length):h.fire_login_failed(201);else{if("requesting"!=h.lbs_state)return;h.lbs_state="completed",c.push("wss://"+t.wx_web[0]),b()}else h.fire_login_failed(201)}):function(e,t,n){var r=new XMLHttpRequest,i=!1,a=setTimeout(function(){i=!0,r.abort(),n("timeout","")},t);r.open("GET",e),r.onerror=function(e){n("GET request error",e)},r.onreadystatechange=function(){4===r.readyState&&(i||(clearTimeout(a),200===r.status&&n("",r.responseText)))},r.send(null)}(a+"/getaddr?vid="+e,5e3,function(e,t){if(e)n-1>0?m(n-1,r,(i+1)%r.length):(o.lbs_url1===r?h.lbs_state1="completed":o.lbs_url2===r&&(h.lbs_state2="completed"),"completed"===h.lbs_state1&&"completed"===h.lbs_state2&&h.fire_login_failed(201));else{if("requesting"!=h.lbs_state)return;h.lbs_state="completed",c=JSON.parse(t).web,b(),b()}})}},v=function(){if(d("reconnecting...."),Date.now()-h.m_retry_time_start<h.m_retry_max_time&&h.m_retry_count<h.m_retry_max_count)h.m_retry_count++,setTimeout(function(){h.m_retry_delay=Math.min(h.m_retry_delay_max,2*h.m_retry_delay),b()},h.m_retry_delay);else if(1===h.state)h.fire_login_failed(201);else{if(3!==h.state)return;h.fire_logout(102)}},b=function(){if("wechat"===t){if(1===h.state||3===h.state)var n=new function(){var e=g(c[h.idx]);h.idx=(h.idx+1)%c.length;var t=new wx.connectSocket({url:e});t.state="CONNECTING",setTimeout(function(){if("CONNECTING"===t.state)try{return void t.close()}catch(e){console.error(e)}finally{h.fire_login_failed(201)}},6e3),t.onOpen(function(e){if(0===h.state)t.close();else if(1===h.state&&null===h.socket||3===h.state)for(var r in h.socket=n,t.state="OPEN",d("on conn open"),h.go_login(),o)t.send({datd:JSON.stringify(o[r])});else t.close()}),t.onClose(function(e){"OPEN"===t.state&&2===h.state?(d("on conn close"),_(3),h.line&&(h.line=""),h.m_retry_count=0,h.m_retry_delay=h.m_retry_delay_min,h.m_retry_time_start=Date.now(),v()):1===h.state?h.fire_login_failed(201):"CONNECTING"===t.state&&b()}),t.onMessage(function(e){var t;if(e.data instanceof ArrayBuffer)try{t=a(new Uint8Array(e.data))}catch(e){console.error(e)}else t=e.data;d("Received message ",t);var n=JSON.parse(t),r=n[0];if("close"===r&&1===h.state)h.fire_login_failed(201);else if("multi"==r)for(var o=0;o<n[1].length;o++){var s=n[1][o];i(s[0],s[1])}else i(n[0],n[1])}),t.onError(function(e){d("on conn error"),t.state="CLOSED",2===h.state&&h.socket===n?h.fire_logout(102):1===h.state?h.fire_login_failed(201):3===h.state&&(h.line&&(h.line=""),console.log("On error, going to reconnect"),0===h.m_retry_count&&(h.m_retry_delay=h.m_retry_delay_min),h.m_retry_time_start=Date.now(),v())});var r={},i=function(e,t){e in r&&r[e](t)},o=[];this.on=function(e,t){r[e]=t},this.emit=function(e,n){"OPEN"===t.state?(d("Sending ",[e,n]),t.send({data:JSON.stringify([e,n])})):o.push([e,n])},this.close=function(){t.close()}}}else if(1===h.state||3===h.state)n=new function(){var e=g(c[h.idx]);console.log(e),h.idx=(h.idx+1)%c.length;try{var t=new WebSocket(e);t.binaryType="arraybuffer",t.state="CONNECTING",setTimeout(function(){t.readyState!==t.CONNECTING||t.close()},6e3),t.onopen=function(e){if(0===h.state)t.close();else if(1===h.state&&null===h.socket||3===h.state)for(var r in h.socket=n,t.state="OPEN",d("on conn open"),h.go_login(),o)t.send(JSON.stringify(o[r]));else t.close()},t.onclose=function(e){"OPEN"===t.state&&2===h.state?(d("on conn close"),_(3),h.line&&(h.line=""),h.m_retry_count=0,h.m_retry_delay=h.m_retry_delay_min,h.m_retry_time_start=Date.now(),v()):1===h.state?2===h.alive_conn?h.alive_conn-=1:1===h.alive_conn&&h.onLoginFailed&&h.fire_login_failed(201):"CONNECTING"===t.state&&b()},t.onmessage=function(e){var t;if(e.data instanceof ArrayBuffer)try{t=a(new Uint8Array(e.data))}catch(e){console.error(e)}else t=e.data;d("Received message ",t);var n=JSON.parse(t),r=n[0];if("close"===r&&1===h.state)h.onLoginFailed&&h.fire_login_failed(201);else if("multi"==r)for(var o=0;o<n[1].length;o++){var s=n[1][o];i(s[0],s[1])}else i(n[0],n[1])},t.onerror=function(e){t.state="CLOSED",d("on conn error"),navigator.userAgent.match(/(iPad|iPhone|iPod|Edge)/g)&&(2===h.state&&_(3),h.line&&(h.line="")),2===h.state&&h.socket===n?h.fire_logout(102):1===h.state?h.fire_login_failed(201):3===h.state&&(console.log("On error, going to reconnect"),0===h.m_retry_count&&(h.m_retry_delay=h.m_retry_delay_min),h.m_retry_time_start=Date.now(),v())};var r={},i=function(e,t){e in r&&r[e](t)},o=[];this.on=function(e,t){r[e]=t},this.emit=function(e,n){0!==t.readyState?(d("Sending ",[e,n]),t.send(JSON.stringify([e,n]))):o.push([e,n])},this.close=function(){t.close()}}catch(e){3===h.state&&(console.log("caught an error"),h.m_retry_count+=1,v())}};var u=0,f=function(){setTimeout(function(){2==h.state&&(d("send ping",++u),h.socket.emit("ping",u),f())},1e4)};h.go_login=function(){""===h.line?(h.socket.emit("login",{vid:e,account:r,uid:0,token:l,device:"websdk",ip:""}),h.login_data.account=r,h.login_data.vid=e,h.login_data.key=l,h.socket.on("login_ret",function(e){var n=e[0],r=JSON.parse(e[1]);if(h.login_data.duration=Date.now()-h.login_data.time,d("login ret",n,r),n||"ok"!==r.result){""===n&&(n=r.reason),h.login_data.now=Date.now(),h.login_data.result="failed";try{if(h.onLoginFailed){var a="kick"===n?207:"TokenErrorExpired"===n?204:n.startsWith("TokenError")?206:n.startsWith("wrong account")?209:201;h.fire_login_failed(a)}}catch(e){console.error(e)}finally{i(o.rp_url,h.login_data)}}else{h.config_msg_set=r.config_msg_set||0,h.config_inst_msg_with_msgid=r.config_inst_msg_with_msgid||0,h.uid=r.uid,h.line=r.line,_(2),"wechat"!==t&&h.socket.emit("set_flag",{binary:1}),d("send ping",++u),h.socket.emit("ping",u),f(),L();try{h.login_data.now=Date.now(),h.login_data.result="success",h.onLoginSuccess&&h.onLoginSuccess(h.uid)}catch(a){console.error(a)}finally{i(o.rp_url,h.login_data),A()}}})):h.socket.emit("line_login",{line:h.line});var n=0,a={},c={};h.call2=function(e,t,r){a[++n]=[e,t,r],d("call ",[e,n,t]),h.socket.emit("call2",[e,n,t])},h.socket.on("call2-ret",function(e){var t=e[0],n=e[1],r=e[2];if(t in a){var i=a[t][2];if(""===n)try{"ok"!=(r=JSON.parse(r)).result&&(n=r.data.result)}catch(e){n="wrong resp:"+r}i&&i(n,r)}});var p,g=function(e,t){return""===e},m=function(e){if(e.startsWith("msg-v2 ")){if(7===(t=s(e," ",6)).length)return[t[1],t[4],t[6]]}else if(e.startsWith("msg-v3 ")){var t;if(8===(t=s(e," ",7)).length)return h.v3_msg_set.get(t[1])?null:(h.v3_msg_set.set(t[1],Date.now()),[t[2],t[5],t[7]])}return null};h.socket.on("pong",function(e){d("recv pong")}),h.socket.on("close",function(e){h.fire_logout(102),h.socket.close()}),h.socket.on("_close",function(e){h.fire_logout(102)}),h.socket.on("kick",function(e){h.fire_logout(103)});var v=function(e){if(e){var t=e,n=t[0],r=t[1],i=t[2];if("instant"===r)try{h.onMessageInstantReceive&&h.onMessageInstantReceive(n,0,i)}catch(e){console.error(e)}if(r.startsWith("voip_")){var a,o=JSON.parse(i),s=o.channel,l=o.peer,u=o.extra;if("voip_invite"===r)a=new I(s,l,u),h.call2("voip_invite_ack",{line:h.line,channelName:s,peer:l,extra:""});else if(!(a=c[s+l]))return;if("voip_invite"===r)try{h.onInviteReceived&&h.onInviteReceived(a)}catch(e){console.error(e)}if("voip_invite_ack"===r)try{a.onInviteReceivedByPeer&&a.onInviteReceivedByPeer(u)}catch(e){console.error(e)}if("voip_invite_accept"===r)try{a.onInviteAcceptedByPeer&&a.onInviteAcceptedByPeer(u)}catch(e){console.error(e)}if("voip_invite_refuse"===r)try{a.onInviteRefusedByPeer&&a.onInviteRefusedByPeer(u)}catch(e){console.error(e)}if("voip_invite_failed"===r)try{a.onInviteFailed&&a.onInviteFailed(u)}catch(e){console.error(e)}if("voip_invite_bye"===r)try{a.onInviteEndByPeer&&a.onInviteEndByPeer(u)}catch(e){console.error(e)}if("voip_invite_msg"===r)try{a.onInviteMsg&&a.onInviteMsg(u)}catch(e){console.error(e)}}}},b=function(){return Date.now()},y=0,w=0,E=0,k=0,S=!1,x=[],T=0,A=function(){S||(S=!0,T=0,0===h.config_msg_set?h.call2("user_getmsg",{line:h.line,ver_clear:y,max:30},function(e,t){if(""===e){var n=t,r=y;for(var i in E=parseInt(n.ver_clear),y=Math.max(E,r),n.msgs){var a=n.msgs[i][0],o=n.msgs[i][1];a>=y+1&&(v(m(o)),y=a)}(30===n.msgs.length||y<w)&&A(),b()}S=!1,k=b()}):1===h.config_msg_set&&h.call2("user_getmsg2",{line:h.line,clear_msgs:x,max:30},function(e,t){if(""===e){for(var n in x=[],t.msgs){t.msgs[n][0];var r=t.msgs[n][1];v(m(r))}t.msgs.length>=30&&A(),b()}S=!1,k=b()}))},R=function(){0===h.config_msg_set?k=b():1===h.config_msg_set&&0===T&&(T=b()+500)},L=function(){setTimeout(function(){if(0!==h.state){if(2===h.state){var e=b();0===h.config_msg_set?E<y&&e-k>1e3?A():e-k>=6e4&&A():1===h.config_msg_set&&x.length>0&&e>T&&T>0&&A()}L()}},100)};h.socket.on("notify",function(e){d("recv notify ",e),"string"==typeof e&&(e=(e=s(e," ",2)).slice(1));var t=e[0];if("channel2"===t){var n=e[1],r=e[2];if(0===h.config_msg_set&&0!==p.m_channel_msgid&&p.m_channel_msgid+1>r)return void d("ignore channel msg",n,r,p.m_channel_msgid);p.m_channel_msgid=r;var i=m(e[3]);if(i){i[0];var a=i[1],o=i[2],l=JSON.parse(o);if("channel_msg"===a)try{p.onMessageChannelReceive&&p.onMessageChannelReceive(l.account,l.uid,l.msg)}catch(e){console.error(e)}if("channel_user_join"===a)try{p.onChannelUserJoined&&p.onChannelUserJoined(l.account,l.uid)}catch(e){console.error(e)}if("channel_user_leave"===a)try{p.onChannelUserLeaved&&p.onChannelUserLeaved(l.account,l.uid)}catch(e){console.error(e)}if("channel_attr_update"===a)try{p.onChannelAttrUpdated&&p.onChannelAttrUpdated(l.name,l.value,l.type)}catch(e){console.error(e)}}}if("msg"===t&&(w=e[1],A()),"recvmsg"===t){var u=JSON.parse(e[1]),f=u[0],c=u[1];f===y+1?(v(m(c)),y=f,R()):(w=f,A())}if("recvmsg_by_msgid"===t){r=s(e[1]," ",7)[1];x.push(r),v(m(e[1])),R()}}),h.messageInstantSend=function(e,t,n){var r={line:h.line,peer:e,flag:"v1:E:3600",t:"instant",content:t};if(1===h.config_inst_msg_with_msgid){var i=null;"string"==typeof t&&(i=JSON.parse(t).msgid),r.messageID=i||b()%1e6+h.m_msgid++%1e6}h.call2("user_sendmsg",r,function(e,t){n&&n(!g(e))})},h.invoke=function(e,t,n){if(e.startsWith("io.agora.signal.")){var r=e.split(".")[3];t.line=h.line,h.call2(r,t,function(e,t){n&&n(e,t)})}};var I=function(e,t,n){this.onInviteReceivedByPeer="",this.onInviteAcceptedByPeer="",this.onInviteRefusedByPeer="",this.onInviteFailed="",this.onInviteEndByPeer="",this.onInviteEndByMyself="",this.onInviteMsg="";var r=this;this.channelName=e,this.peer=t,this.extra=n,c[e+t]=r,this.channelInviteUser2=function(){n=n||"",h.call2("voip_invite",{line:h.line,channelName:e,peer:t,extra:n},function(e,t){if(g(e));else try{r.onInviteFailed(e)}catch(e){console.error(e)}})},this.channelInviteAccept=function(n){n=n||"",h.call2("voip_invite_accept",{line:h.line,channelName:e,peer:t,extra:n})},this.channelInviteRefuse=function(n){n=n||"",h.call2("voip_invite_refuse",{line:h.line,channelName:e,peer:t,extra:n})},this.channelInviteDTMF=function(n){h.call2("voip_invite_msg",{line:h.line,channelName:e,peer:t,extra:JSON.stringify({msgtype:"dtmf",msgdata:n})})},this.channelInviteEnd=function(n){n=n||"",h.call2("voip_invite_bye",{line:h.line,channelName:e,peer:t,extra:n});try{r.onInviteEndByMyself&&r.onInviteEndByMyself("")}catch(e){console.error(e)}}};h.channelInviteUser2=function(e,t,n){var r=new I(e,t,n);return r.channelInviteUser2(),r},h.channelJoin=function(e){try{"string"!=typeof e&&(e=JSON.stringify(e))}catch(e){return console.error("Invalid channel name type, should be a string."),void console.error(e)}if(2==h.state)return p=new function(){this.onChannelJoined="",this.onChannelJoinFailed="",this.onChannelLeaved="",this.onChannelUserList="",this.onChannelUserJoined="",this.onChannelUserLeaved="",this.onChannelUserList="",this.onChannelAttrUpdated="",this.onMessageChannelReceive="",this.name=e,this.state="joining",this.m_channel_msgid=0,this.messageChannelSend=function(t,n){var r={line:h.line,name:e,msg:t};if(1===h.config_inst_msg_with_msgid){var i=null;"string"==typeof t&&(i=JSON.parse(t).msgid),r.msgID=i||b()%1e6+h.m_msgid++%1e6}h.call2("channel_sendmsg",r,function(e,t){n&&n()})},this.channelLeave=function(t){h.call2("channel_leave",{line:h.line,name:e},function(e,n){if(p.state="leaved",t)t();else try{p.onChannelLeaved&&p.onChannelLeaved(0)}catch(e){console.error(e)}})},this.channelSetAttr=function(t,n,r){h.call2("channel_set_attr",{line:h.line,channel:e,name:t,value:n},function(e,t){r&&r()})},this.channelDelAttr=function(t,n){h.call2("channel_del_attr",{line:h.line,channel:e,name:t},function(e,t){n&&n()})},this.channelClearAttr=function(t){h.call2("channel_clear_attr",{line:h.line,channel:e},function(e,n){t&&t()})}},h.call2("channel_join",{line:h.line,name:e},function(e,t){if(""===e){p.state="joined";try{p.onChannelJoined&&p.onChannelJoined()}catch(e){console.error(e)}var n=t;try{p.onChannelUserList&&p.onChannelUserList(n.list)}catch(e){console.error(e)}try{if(p.onChannelAttrUpdated)for(var r in n.attrs)p.onChannelAttrUpdated(r,n.attrs[r],"update")}catch(e){console.error(e)}}else try{p.onChannelJoinFailed&&p.onChannelJoinFailed(e)}catch(e){console.error(e)}}),p;d("You should log in first.")}}};h.socket=null,h.debugging?(h.lbs_state="completed",h.login_data.time=Date.now(),b()):"wechat"===t?m(2,o.lbs_wx,0):(n(o.lbs_url1),n(o.lbs_url2),m(2,o.lbs_url1,0),m(2,o.lbs_url2,0))};this.login=function(e,t,n,r){return new l(e,t,n,r)};var u={DEBUG:0,WARNING:1,INFO:2};this.setDoLog=function(e=!1,t="DEBUG"){t&&"DEBUG"!==t&&"WARNING"!==t&&"INFO"!==t?console.log("Only accept DEBUG / WARNING / INFO as logging level values. The default level is INFO"):(o.isLogging=e,o.loggingLevel=u[t])}};function a(e){return new i(e)}n.d(t,"default",function(){return a})}]).default});
//# sourceMappingURL=AgoraSig.js.map
});
___scope___.file("Controls/Controls.js", function(exports, require, module, __filename, __dirname){

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./Controls.css");
/**
 * @name handleFail
 * @param err - error thrown by any function
 * @description Helper function to handle errors
 */
let handleFail = function (err) {
    console.log("Error : ", err);
};
function controlInit(arg) {
    // Declare buttons and js references
    let mic = false, cam = false;
    let micBtn = document.querySelector('#mute-audio'), camBtn = document.querySelector('#mute-video'), leaveBtn = document.querySelector('#leave-call');
    // Initialize buttons and js references
    micBtn.className = 'flex-item'; // removing greyed-out class (look at index.html for more clarity)
    camBtn.className = 'flex-item'; // removing greyed-out class (look at index.html for more clarity)
    leaveBtn.className = 'flex-item'; // removing greyed-out class (look at index.html for more clarity)
    mic = true;
    cam = true;
    arg.recognition.onend = function () {
        console.log("recognition ended");
        if (mic)
            arg.recognition.start();
    };
    micBtn.onclick = () => {
        console.log('mic toggled');
        mic = !mic;
        if (mic) {
            arg.localStream.unmuteAudio();
            arg.recognition.start();
        }
        else {
            arg.localStream.muteAudio();
            arg.recognition.stop();
        }
        micBtn.childNodes[0].innerHTML = `mic${(mic) ? '' : '_off'}`;
    };
    camBtn.onclick = () => {
        console.log('cam toggled');
        cam = !cam;
        (cam) ? arg.localStream.unmuteVideo() : arg.localStream.muteVideo(); // <--------------
        camBtn.childNodes[0].innerHTML = `videocam${(cam) ? '' : '_off'}`;
    };
    leaveBtn.onclick = () => {
        arg.client.unpublish(arg.localStream, handleFail); // <--------------
        arg.localStream.close(); // <--------------
        arg.client.leave(); // <--------------
        let main = document.querySelector('.klarify');
        main.innerHTML = `<h1 style="text-align: center;">Call ended successfully!</h1>`;
    };
    console.log(arg);
}
exports.default = controlInit;

});
___scope___.file("Controls/Controls.css", function(exports, require, module, __filename, __dirname){


require("default/bundle.css")
});
___scope___.file("Video/config.json", function(exports, require, module, __filename, __dirname){


});
___scope___.file("bundle.css", function(exports, require, module, __filename, __dirname){

require("fuse-box-css")("bundle.css");
});
return ___scope___.entry = "index.js";
});
FuseBox.pkg("agora-rtc-sdk", {}, function(___scope___){
___scope___.file("AgoraRTCSDK.min.js", function(exports, require, module, __filename, __dirname){

/*! AgoraRTC|BUILD v2.6.1-0-g01b3be9 */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("AgoraRTC",[],t):"object"==typeof exports?exports.AgoraRTC=t():e.AgoraRTC=t()}(window,function(){return function(e){var t={};function n(i){if(t[i])return t[i].exports;var o=t[i]={i:i,l:!1,exports:{}};return e[i].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,i){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(i,o,function(t){return e[t]}.bind(null,o));return i},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=17)}([function(e,t,n){"use strict";n.r(t);var i=n(6),o=n.n(i),a=n(5),r=n(3),s=n(1),d=0,c="free",u=[],l=[],p=0;setInterval(function(){Object(r.getParameter)("UPLOAD_LOG")&&f.info("console log upload")},9e5);var f=function(){var e,t,n,i,f,m,g="https://".concat(Object(r.getParameter)("LOG_UPLOAD_SERVER"),"/upload/v1"),v=["DEBUG","INFO","WARNING","ERROR","NONE"],S=0,I=function e(t){c="uploading",setTimeout(function(){!function(e,t,n){var i;Array.isArray(e)||(e=[e]),e=e.map(function(e){return{log_item_id:d++,log_level:e.log_level,payload_str:e.payload}}),i={sdk_version:r.VERSION,process_id:Object(s.a)(),payload:JSON.stringify(e)};try{Object(a.c)(g,i,function(e){"OK"===e?t&&t(e):n&&n(e)},function(e){n&&n(e)},{withCredentials:!0})}catch(e){n&&n(e)}}(t,function(){p=0,0!==u.length?(l=u.length<10?u.splice(0,u.length):u.splice(0,10),e(l)):c="free"},function(){setTimeout(function(){e(l)},p++<2?200:1e4)})},3e3)};t=function(){for(var t=[0],n=0;n<arguments.length;n++)t.push(arguments[n]);e.apply(this,t)},n=function(){for(var t=[1],n=0;n<arguments.length;n++)t.push(arguments[n]);e.apply(this,t)},i=function(){for(var t=[2],n=0;n<arguments.length;n++)t.push(arguments[n]);e.apply(this,t)},f=function(){for(var t=[3],n=0;n<arguments.length;n++)t.push(arguments[n]);e.apply(this,t)};var _={};return m=function(e){_[e]||(i.apply(void 0,arguments),_[e]=!0)},{DEBUG:0,INFO:1,WARNING:2,ERROR:3,NONE:4,enableLogUpload:function(){Object(r.setParameter)("UPLOAD_LOG",!0)},disableLogUpload:function(){Object(r.setParameter)("UPLOAD_LOG",!1)},setProxyServer:function(e){g=e?"https://".concat(e,"/ls/?h=").concat(Object(r.getParameter)("LOG_UPLOAD_SERVER"),"&p=443&d=upload/v1"):"https://".concat(Object(r.getParameter)("LOG_UPLOAD_SERVER"),"/upload/v1")},setLogLevel:function(e){e>4?e=4:e<0&&(e=0),S=e},log:e=function(){var e,t=arguments[0],n=arguments;if(n[0]=(e=new Date).toTimeString().split(" ")[0]+":"+e.getMilliseconds()+" Agora-SDK ["+(v[t]||"DEFAULT")+"]:",function(e,t){if(Object(r.getParameter)("UPLOAD_LOG"))try{t=Array.prototype.slice.call(t);var n="";t.forEach(function(e){"object"===o()(e)&&(e=JSON.stringify(e)),n=n+e+" "}),u.push({payload:n,log_level:e}),"free"===c&&(l=u.length<10?u.splice(0,u.length):u.splice(0,10),I(l))}catch(e){}}(t,n),!(t<S))switch(t){case 0:case 1:console.log.apply(console,n);break;case 2:console.warn.apply(console,n);break;case 3:console.error.apply(console,n);break;default:return void console.log.apply(console,n)}},debug:t,info:n,warning:i,deprecate:m,error:f}}();t.default=f},function(e,t,n){"use strict";var i=n(9),o=n.n(i),a=n(4),r=n.n(a),s=n(3),d=n(0),c=n(5),u=n(11),l=n.n(u);n.d(t,"b",function(){return g}),n.d(t,"a",function(){return m});var p={eventType:null,sid:null,lts:null,success:null,cname:null,uid:null,peer:null,cid:null,elapse:null,extend:null,vid:0},f=null,m=function(){return f||(f="process-"+l()(),d.default.info("processId: "+f)),f},g=function(){var e={list:{}};e.url=Object(c.e)()?"https://".concat(Object(s.getParameter)("EVENT_REPORT_DOMAIN"),":6443/events/message"):"http://".concat(Object(s.getParameter)("EVENT_REPORT_DOMAIN"),":6080/events/message"),e.urlBackup=Object(c.e)()?"https://".concat(Object(s.getParameter)("EVENT_REPORT_BACKUP_DOMAIN"),":6443/events/message"):"http://".concat(Object(s.getParameter)("EVENT_REPORT_BACKUP_DOMAIN"),":6080/events/message"),e.setProxyServer=function(t){t?(e.url=Object(c.e)()?"https://".concat(t,"/rs/?h=").concat(Object(s.getParameter)("EVENT_REPORT_DOMAIN"),"&p=6443&d=events/message"):"http://".concat(t,"/rs/?h=").concat(Object(s.getParameter)("EVENT_REPORT_DOMAIN"),"&p=6080&d=events/message"),e.urlBackup=Object(c.e)()?"https://".concat(t,"/rs/?h=").concat(Object(s.getParameter)("EVENT_REPORT_BACKUP_DOMAIN"),"&p=6443&d=events/message"):"http://".concat(t,"/rs/?h=").concat(Object(s.getParameter)("EVENT_REPORT_BACKUP_DOMAIN"),"&p=6080&d=events/message"),d.default.debug("reportProxyServerURL: ".concat(e.url)),d.default.debug("reportProxyServerBackupURL: ".concat(e.urlBackup))):(e.url=Object(c.e)()?"https://".concat(Object(s.getParameter)("EVENT_REPORT_DOMAIN"),":6443/events/message"):"http://".concat(Object(s.getParameter)("EVENT_REPORT_DOMAIN"),":6080/events/message"),e.urlBackup=Object(c.e)()?"https://".concat(Object(s.getParameter)("EVENT_REPORT_BACKUP_DOMAIN"),":6443/events/message"):"http://".concat(Object(s.getParameter)("EVENT_REPORT_BACKUP_DOMAIN"),":6080/events/message"))},e.sessionInit=function(t,n){var i=r()({},p);i.startTime=+new Date,i.sid=t,i.cname=n.cname,e.list[t]=i;var o=r()({},{willUploadConsoleLog:Object(s.getParameter)("UPLOAD_LOG")},n.extend),a=r()({},i);a.eventType="session_init",a.appid=n.appid,a.browser=navigator.userAgent,a.build=s.BUILD,a.lts=+new Date,a.elapse=a.lts-a.startTime,a.extend=JSON.stringify(o),a.mode=n.mode,a.process=m(),a.success=n.succ,a.version=s.VERSION,delete a.startTime,e.send({type:"io.agora.pb.Wrtc.Session",data:a}),e._flushInvokeReport(t)},e.joinChooseServer=function(t,n,i){n.uid&&(e.list[t].uid=parseInt(n.uid)),n.cid&&(e.list[t].cid=parseInt(n.cid));var o=r()({},e.list[t]);o.eventType="join_choose_server";var a=n.lts;o.lts=Date.now(),o.eventElapse=o.lts-a,o.chooseServerAddr=n.csAddr,o.errorCode=n.ec,o.elapse=o.lts-o.startTime,o.success=n.succ,o.chooseServerAddrList=JSON.stringify(n.serverList),delete o.startTime,e.send({type:"io.agora.pb.Wrtc.JoinChooseServer",data:o})},e.joinGateway=function(t,n){n.vid&&(e.list[t].vid=n.vid);var i=r()({},e.list[t]),o=n.lts;i.eventType="join_gateway",i.lts=Date.now(),i.gatewayAddr=n.addr,i.success=n.succ,i.errorCode=n.ec,i.elapse=i.lts-i.startTime,i.eventElapse=i.lts-o,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.JoinGateway",data:i})},e.publish=function(t,n){var i=r()({},e.list[t]);i.eventType="publish";var o=n.lts;i.lts=Date.now(),i.eventElapse=i.lts-o,i.elapse=i.lts-i.startTime,i.success=n.succ,i.errorCode=n.ec,n.videoName&&(i.videoName=n.videoName),n.audioName&&(i.audioName=n.audioName),n.screenName&&(i.screenName=n.screenName),delete i.startTime,e.send({type:"io.agora.pb.Wrtc.Publish",data:i}),e._flushInvokeReport(t)},e.subscribe=function(t,n){var i=r()({},e.list[t]);i.eventType="subscribe";var o=n.lts;i.lts=Date.now(),i.eventElapse=i.lts-o,i.elapse=i.lts-i.startTime,i.errorCode=n.ec,i.success=n.succ,isFinite(n.peerid)?i.peer=n.peerid:i.peerSuid=""+n.peerid,"boolean"==typeof n.video&&(i.video=n.video),"boolean"==typeof n.audio&&(i.audio=n.audio),delete i.startTime,e.send({type:"io.agora.pb.Wrtc.Subscribe",data:i}),e._flushInvokeReport(t)},e.firstRemoteFrame=function(t,n){var i=r()({},e.list[t]);i.eventType="first_remote_frame";var o=n.lts;i.lts=Date.now(),i.eventElapse=i.lts-o,i.elapse=i.lts-i.startTime,i.width=n.width,i.height=n.height,i.success=n.succ,i.errorCode=n.ec,isFinite(n.peerid)?i.peer=n.peerid:i.peerSuid=""+n.peerid,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.FirstFrame",data:i})},e.streamSwitch=function(t,n){var i=r()({},e.list[t]);i.eventType="stream_switch",i.lts=Date.now(),i.isDual=n.isdual,i.elapse=i.lts-i.startTime,i.success=i.succ,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.StreamSwitch",data:i})},e.audioSendingStopped=function(t,n){var i=r()({},e.list[t]);i.eventType="audio_sending_stopped",i.lts=Date.now(),i.elapse=i.lts-i.startTime,i.reason=n.reason,i.success=n.succ,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.AudioSendingStopped",data:i})},e.videoSendingStopped=function(t,n){var i=r()({},e.list[t]);i.eventType="video_sending_stopped",i.lts=Date.now(),i.elapse=i.lts-i.startTime,i.reson=n.reason,i.success=n.succ,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.VideoSendingStopped",data:i})},e.requestProxyAppCenter=function(t,n){var i=r()({},e.list[t]),o=n.lts;i.eventType="request_proxy_appcenter",i.lts=Date.now(),i.eventElapse=i.lts-o,i.elapse=i.lts-i.startTime,i.extend=n.extend+"",i.APAddr=n.APAddr,i.workerManagerList=n.workerManagerList,i.response=n.response,i.errorCode=n.ec,i.success=n.succ,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.RequestProxyAppCenter",data:i})},e.requestProxyWorkerManager=function(t,n){var i=r()({},e.list[t]),o=n.lts;i.eventType="request_proxy_worker_manager",i.lts=Date.now(),i.eventElapse=i.lts-o,i.elapse=i.lts-i.startTime,i.extend=n.extend,i.workerManagerAddr=n.workerManagerAddr,i.response=n.response,i.errorCode=n.ec,i.success=n.succ,delete i.startTime,e.send({type:"io.agora.pb.Wrtc.RequestProxyWorkerManager",data:i})};var t=0;return e.reportApiInvoke=function(e,n){var i=n.tag,a=n.name,r=n.getStates,s=n.options,d=n.timeout,c=void 0===d?6e4:d,u=n.callback,l=n.reportResult,p=void 0===l||l,f=Date.now(),m=0,v=t++,S=function(){return o()({tag:i,invokeId:v,sid:e,name:a,apiInvokeTime:f,options:s},r&&{states:(t=r(),Object.keys(t).reduce(function(e,n){var i=e;return null!=t[n]&&(i[n]=t[n]),i},{}))});var t},I=setTimeout(function(){g._sendApiInvoke(o()({},S(),{error:"API_INVOKE_TIMEOUT",success:!1}))},c);return function(e,t){if(clearTimeout(I),++m>1&&(e="EXECUTOR_INVOKE_".concat(m)),e)return g._sendApiInvoke(o()({},S(),{success:!1,error:e},r&&{states:r()})),u&&u(e);g._sendApiInvoke(o()({},S(),{success:!0},p&&{result:t},r&&{states:r()})),u&&u(null,t)}},e._cachedItems=[],e._cacheInvokeReport=function(t){t.lts||(t.lts=Date.now()),e._cachedItems.push(t),e._cachedItems.length>50&&e._cachedItems.shift()},e._flushInvokeReport=function(t){if(e._cachedItems.length){var n=e._cachedItems;e._cachedItems=[],d.default.debug("Flush cached event reporting:",n.length),n.forEach(function(n,i){n.sid=t,setTimeout(function(){e._sendApiInvoke(n)},5e3+500*i)})}},e._sendApiInvoke=function(t){var n=t.tag,i=t.invokeId,a=t.sid,r=t.name,d=t.result,c=t.states,u=t.options,l=t.error,p=t.success,f=t.apiInvokeTime,m=t.lts,g=Object(s.getParameter)("NOT_REPORT_EVENT");if(!(n&&g instanceof Array&&g.includes(n)))if(e.list[a]){var v=e.list[a],S=v.startTime,I=v.cname,_=v.uid,h=v.cid,y=(m=m||Date.now())-S,b=m-f,E=o()({invokeId:i,sid:a,cname:I,cid:h,lts:m,uid:_,success:p,elapse:y,apiName:r,execElapse:b},void 0!==u&&{options:JSON.stringify(u)},void 0!==c&&{execStates:JSON.stringify(c)},void 0!==l&&{errorCode:JSON.stringify(l)},void 0!==d&&{execResult:JSON.stringify(d)});e.send({type:"io.agora.pb.Wrtc.ApiInvoke",data:E})}else e._cacheInvokeReport(arguments[0])},e.send=function(t){try{Object(c.c)(e.url,t,null,function(n){Object(c.c)(e.urlBackup,t,null,function(e){},{timeout:1e4})},{timeout:1e4})}catch(e){}},e}()},function(e,t,n){"use strict";n.r(t),n.d(t,"getBrowserInfo",function(){return v}),n.d(t,"getBrowserVersion",function(){return p}),n.d(t,"getBrowserOS",function(){return f}),n.d(t,"isChrome",function(){return o}),n.d(t,"isSafari",function(){return a}),n.d(t,"isFireFox",function(){return r}),n.d(t,"isOpera",function(){return s}),n.d(t,"isQQBrowser",function(){return d}),n.d(t,"isWeChatBrowser",function(){return c}),n.d(t,"isSupportedPC",function(){return u}),n.d(t,"isSupportedMobile",function(){return l}),n.d(t,"getChromeKernelVersion",function(){return g}),n.d(t,"isChromeKernel",function(){return m});var i,o=function(){var e=v();return e.name&&"Chrome"===e.name},a=function(){var e=v();return e.name&&"Safari"===e.name},r=function(){var e=v();return e.name&&"Firefox"===e.name},s=function(){var e=v();return e.name&&"OPR"===e.name},d=function(){var e=v();return e.name&&"QQBrowser"===e.name},c=function(){var e=v();return e.name&&"MicroMessenger"===e.name},u=function(){var e=f();return"Linux"===e||"Mac OS X"===e||"Mac OS"===e||-1!==e.indexOf("Windows")},l=function(){var e=f();return"Android"===e||"iOS"===e},p=function(){return v().version},f=function(){return v().os},m=function(){return!!navigator.userAgent.match(/chrome\/[\d]./i)},g=function(){var e=navigator.userAgent.match(/chrome\/[\d]./i);return e&&e[0]&&e[0].split("/")[1]},v=(i=function(){var e,t=navigator.userAgent,n=t.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i)||[];"Chrome"===n[1]&&null!=(e=t.match(/(OPR(?=\/))\/?(\d+)/i))&&(n=e),"Safari"===n[1]&&null!=(e=t.match(/version\/(\d+)/i))&&(n[2]=e[1]),~t.toLowerCase().indexOf("qqbrowser")&&null!=(e=t.match(/(qqbrowser(?=\/))\/?(\d+)/i))&&(n=e),~t.toLowerCase().indexOf("micromessenger")&&null!=(e=t.match(/(micromessenger(?=\/))\/?(\d+)/i))&&(n=e),~t.toLowerCase().indexOf("edge")&&null!=(e=t.match(/(edge(?=\/))\/?(\d+)/i))&&(n=e),~t.toLowerCase().indexOf("trident")&&null!=(e=/\brv[ :]+(\d+)/g.exec(t)||[])&&(n=[null,"IE",e[1]]);var i=void 0,o=[{s:"Windows 10",r:/(Windows 10.0|Windows NT 10.0)/},{s:"Windows 8.1",r:/(Windows 8.1|Windows NT 6.3)/},{s:"Windows 8",r:/(Windows 8|Windows NT 6.2)/},{s:"Windows 7",r:/(Windows 7|Windows NT 6.1)/},{s:"Windows Vista",r:/Windows NT 6.0/},{s:"Windows Server 2003",r:/Windows NT 5.2/},{s:"Windows XP",r:/(Windows NT 5.1|Windows XP)/},{s:"Windows 2000",r:/(Windows NT 5.0|Windows 2000)/},{s:"Windows ME",r:/(Win 9x 4.90|Windows ME)/},{s:"Windows 98",r:/(Windows 98|Win98)/},{s:"Windows 95",r:/(Windows 95|Win95|Windows_95)/},{s:"Windows NT 4.0",r:/(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/},{s:"Windows CE",r:/Windows CE/},{s:"Windows 3.11",r:/Win16/},{s:"Android",r:/Android/},{s:"Open BSD",r:/OpenBSD/},{s:"Sun OS",r:/SunOS/},{s:"Linux",r:/(Linux|X11)/},{s:"iOS",r:/(iPhone|iPad|iPod)/},{s:"Mac OS X",r:/Mac OS X/},{s:"Mac OS",r:/(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/},{s:"QNX",r:/QNX/},{s:"UNIX",r:/UNIX/},{s:"BeOS",r:/BeOS/},{s:"OS/2",r:/OS\/2/},{s:"Search Bot",r:/(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/}];for(var a in o){var r=o[a];if(r.r.test(navigator.userAgent)){i=r.s;break}}return{name:n[1],version:n[2],os:i}}(),function(){return i})},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});t.BUILD="v2.6.1-0-g01b3be9";t.VERSION="2.6.1";t.SUPPORT_RESOLUTION_LIST={"90p_1":[160,90],"120p_1":[160,120],"120p_3":[120,120],"120p_4":[212,120],"180p_1":[320,180],"180p_3":[180,180],"180p_4":[240,180],"240p_1":[320,240],"240p_3":[240,240],"240p_4":[424,240],"360p_1":[640,360],"360p_3":[360,360],"360p_4":[640,360],"360p_6":[360,360],"360p_7":[480,360],"360p_8":[480,360],"360p_9":[640,360],"360p_10":[640,360],"360p_11":[640,360],"480p_1":[640,480],"480p_2":[640,480],"480p_3":[480,480],"480p_4":[640,480],"480p_6":[480,480],"480p_8":[848,480],"480p_9":[848,480],"480p_10":[640,480],"720p_1":[1280,720],"720p_2":[1280,720],"720p_3":[1280,720],"720p_5":[960,720],"720p_6":[960,720],"1080p_1":[1920,1080],"1080p_2":[1920,1080],"1080p_3":[1920,1080],"1080p_5":[1920,1080],"1440p_1":[2560,1440],"1440p_2":[2560,1440],"4k_1":[3840,2160],"4k_3":[3840,2160]};const i={WEBCS_DOMAIN:["ap-web-1.agora.io","ap-web-2.agoraio.cn"],WEBCS_DOMAIN_BACKUP_LIST:["ap-web-3.agora.io","ap-web-4.agoraio.cn"],PROXY_CS:["ap-proxy-1.agora.io","ap-proxy-2.agora.io"],LOG_UPLOAD_SERVER:"logservice.agora.io",EVENT_REPORT_DOMAIN:"webcollector-1.agora.io",EVENT_REPORT_BACKUP_DOMAIN:"webcollector-2.agoraio.cn",WEBCS_BACKUP_CONNECT_TIMEOUT:6e3,HTTP_CONNECT_TIMEOUT:5e3,UPLOAD_LOG:!1,NOT_REPORT_EVENT:[],FILEPATH_LENMAX:255};t.setParameter=((e,t)=>void 0!==i[e]&&(i[e]=t,!0));t.getParameter=(e=>void 0!==i[e]?i[e]:null)},function(e,t){function n(){return e.exports=n=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e},n.apply(this,arguments)}e.exports=n},function(e,t,n){"use strict";n.d(t,"c",function(){return u}),n.d(t,"e",function(){return l}),n.d(t,"b",function(){return s}),n.d(t,"a",function(){return d}),n.d(t,"d",function(){return c});var i=n(3),o=n(7),a=0,r=0,s=function(){return a},d=function(){return r},c=function(){a=0,r=0},u=function(e,t,n,s,d){var c=new XMLHttpRequest;if(c.timeout=t.timeout||Object(i.getParameter)("HTTP_CONNECT_TIMEOUT"),c.open("POST",e,!0),c.setRequestHeader("Content-type","application/json; charset=utf-8"),d)for(var u in d)"withCredentials"==u?c.withCredentials=!0:c.setRequestHeader(u,d[u]);c.onload=function(e){r+=Object(o.e)(c.responseText),n&&n(c.responseText)},c.onerror=function(t){s&&s(t,e)},c.ontimeout=function(t){s&&s(t,e)};var l=JSON.stringify(t);a+=Object(o.e)(l),c.send(l)},l=function(){return"https:"==document.location.protocol}},function(e,t){function n(e){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function i(t){return"function"==typeof Symbol&&"symbol"===n(Symbol.iterator)?e.exports=i=function(e){return n(e)}:e.exports=i=function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":n(e)},i(t)}e.exports=i},function(e,t,n){"use strict";n.d(t,"d",function(){return v}),n.d(t,"b",function(){return f}),n.d(t,"a",function(){return p}),n.d(t,"h",function(){return m}),n.d(t,"c",function(){return g}),n.d(t,"g",function(){return I}),n.d(t,"f",function(){return h}),n.d(t,"e",function(){return _});var i=n(6),o=n.n(i),a=n(2),r=n(0),s=n(11),d=n.n(s),c=n(10),u=n(8),l=null,p=function(e){return this.audioContext=(l||(l=Object(c.a)()),l),this.sourceNode=e.otWebkitAudioSource||this.audioContext.createMediaStreamSource(e),this.analyser=this.audioContext.createAnalyser(),this.timeDomainData=new Uint8Array(this.analyser.frequencyBinCount),this.sourceNode.connect(this.analyser),this.getAudioLevel=function(){if(this.analyser){this.analyser.getByteTimeDomainData(this.timeDomainData);for(var e=0,t=0;t<this.timeDomainData.length;t++)e=Math.max(e,Math.abs(this.timeDomainData[t]-128));return e/128}return r.default.warning("can't find analyser in audioLevelHelper"),0},this};function f(){return d()().replace(/-/g,"").toUpperCase()}var m=function(e,t,n){try{var i=document.createElement("video");i.setAttribute("autoplay",""),i.setAttribute("muted",""),i.setAttribute("playsinline",""),i.setAttribute("style","position: absolute; top: 0; left: 0; width:1px; high:1px;"),document.body.appendChild(i),i.addEventListener("playing",function(e){a.isFireFox()?i.videoWidth&&(t(i.videoWidth,i.videoHeight),document.body.removeChild(i)):(t(i.videoWidth,i.videoHeight),document.body.removeChild(i))}),Object(u.c)(i,e)}catch(e){n(e)}},g=function(e){return"number"==typeof e&&0<=e&&e<=4294967295},v=function(e){var t=["lowLatency","userConfigExtraInfo","transcodingUsers"];for(var n in e)if("lowLatency"===n&&"boolean"!=typeof e[n]||"userConfigExtraInfo"===n&&"object"!==o()(e[n])||"transcodingUsers"===n&&!S(e[n])||!~t.indexOf(n)&&"number"!=typeof e[n])throw new Error("Param ["+n+"] is inValid");return!0},S=function(e){for(var t=0;t<e.length;t++)for(var n in e[t])if("number"!=typeof e[t][n])throw new Error("Param user["+t+"] - ["+n+"] is inValid");return!0},I=function(e){isNaN(e)&&(e=1e3);var t=+new Date,n=(t=(9301*t+49297)%233280)/233280;return Math.ceil(n*e)},_=function(e){var t=encodeURIComponent(e).match(/%[89ABab]/g);return e.length+(t?t.length:0)},h=function(){if(!document.getElementById("agora-ban-tip")){var e=document.createElement("div");e.id="agora-ban-tip",e.style="position: absolute; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; color: #fff;",document.querySelector("body").prepend(e);var t=document.createElement("div");t.style="background: #000; width: 346px; height: 116px; z-index: 100000; opacity: 0.6; border-radius: 10px; box-shadow: 0 2px 4px #000;",e.append(t);var n=document.createElement("div");n.style="height: 76px; display: flex; justify-content: center; align-items: center;";var i=document.createElement("span");i.style="height: 28px; width: 28px; color: #000; text-align: center; line-height: 30px; background: #fff; border-radius: 50%; font-weight: 600; font-size: 20px;margin-right: 5px;",i.innerText="!";var o=document.createElement("span");o.innerText="This browser does not support webRTC",n.append(i),n.append(o);var a=document.createElement("div");a.style="height: 38px; display: flex; border-top: #fff 1px solid; justify-content: center; align-items: center;",a.innerText="OK",t.append(n),t.append(a),a.onclick=function(){var e=document.getElementById("agora-ban-tip");e.parentNode.removeChild(e)}}}},function(e,t,n){"use strict";n.d(t,"a",function(){return _}),n.d(t,"b",function(){return r}),n.d(t,"c",function(){return c});var i=n(6),o=n.n(i),a=null,r=null,s=null,d=null,c=null,u=null,l=null,p={addStream:null},f={log:function(){},extractVersion:function(e,t,n){var i=e.match(t);return i&&i.length>=n&&parseInt(i[n])}};if("object"==("undefined"==typeof window?"undefined":o()(window))?(!window.HTMLMediaElement||"srcObject"in window.HTMLMediaElement.prototype?(c=function(e,t){e.srcObject=t},u=function(e){return e.srcObject}):(c=function(e,t){"mozSrcObject"in e?e.mozSrcObject=t:(e._srcObject=t,e.src=t?URL.createObjectURL(t):null)},u=function(e){return"mozSrcObject"in e?e.mozSrcObject:e._srcObject}),a=window.navigator&&window.navigator.getUserMedia):(c=function(e,t){e.srcObject=t},u=function(e){return e.srcObject}),r=function(e,t){c(e,t)},function(e,t){c(e,u(t))},"undefined"!=typeof window&&window.navigator)if(navigator.mozGetUserMedia&&window.mozRTCPeerConnection){for(var m in f.log("This appears to be Firefox"),"firefox",s=f.extractVersion(navigator.userAgent,/Firefox\/([0-9]+)\./,1),31,l=mozRTCPeerConnection,p)p[m]=l.prototype[m];if(d=function(e,t){if(s<38&&e&&e.iceServers){for(var n=[],i=0;i<e.iceServers.length;i++){var o=e.iceServers[i];if(o.hasOwnProperty("urls"))for(var a=0;a<o.urls.length;a++){var r={url:o.urls[a]};0===o.urls[a].indexOf("turn")&&(r.username=o.username,r.credential=o.credential),n.push(r)}else n.push(e.iceServers[i])}e.iceServers=n}var d=new l(e,t);for(var c in p)d[c]=p[c];return d},window.RTCSessionDescription||(window.RTCSessionDescription=mozRTCSessionDescription),window.RTCIceCandidate||(window.RTCIceCandidate=mozRTCIceCandidate),a=function(e,t,n){var i=function(e){if("object"!==o()(e)||e.require)return e;var t=[];return Object.keys(e).forEach(function(n){if("require"!==n&&"advanced"!==n&&"mediaSource"!==n){var i=e[n]="object"===o()(e[n])?e[n]:{ideal:e[n]};if(void 0===i.min&&void 0===i.max&&void 0===i.exact||t.push(n),void 0!==i.exact&&("number"==typeof i.exact?i.min=i.max=i.exact:e[n]=i.exact,delete i.exact),void 0!==i.ideal){e.advanced=e.advanced||[];var a={};"number"==typeof i.ideal?a[n]={min:i.ideal,max:i.ideal}:a[n]=i.ideal,e.advanced.push(a),delete i.ideal,Object.keys(i).length||delete e[n]}}}),t.length&&(e.require=t),e};return s<38&&(f.log("spec: "+JSON.stringify(e)),e.audio&&(e.audio=i(e.audio)),e.video&&(e.video=i(e.video)),f.log("ff37: "+JSON.stringify(e))),navigator.mozGetUserMedia(e,t,n)},navigator.getUserMedia=a,navigator.mediaDevices||(navigator.mediaDevices={getUserMedia:I,addEventListener:function(){},removeEventListener:function(){}}),navigator.mediaDevices.enumerateDevices=navigator.mediaDevices.enumerateDevices||function(){return new Promise(function(e){e([{kind:"audioinput",deviceId:"default",label:"",groupId:""},{kind:"videoinput",deviceId:"default",label:"",groupId:""}])})},s<41){var g=navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);navigator.mediaDevices.enumerateDevices=function(){return g().then(void 0,function(e){if("NotFoundError"===e.name)return[];throw e})}}}else if(navigator.webkitGetUserMedia&&window.webkitRTCPeerConnection){for(var m in f.log("This appears to be Chrome"),"chrome",s=f.extractVersion(navigator.userAgent,/Chrom(e|ium)\/([0-9]+)\./,2),38,l=webkitRTCPeerConnection,p)p[m]=l.prototype[m];d=function(e,t){e&&e.iceTransportPolicy&&(e.iceTransports=e.iceTransportPolicy);var n=new l(e,t);for(var i in p)n[i]=p[i];var o=n.getStats.bind(n);return n.getStats=function(e,t,n){var i=this,a=arguments;if(arguments.length>0&&"function"==typeof e)return o(e,t);var r=function(e){var t={};return e.result().forEach(function(e){var n={id:e.id,timestamp:e.timestamp,type:e.type};e.names().forEach(function(t){n[t]=e.stat(t)}),t[n.id]=n}),t};if(arguments.length>=2){return o.apply(this,[function(e){a[1](r(e))},arguments[0]])}return new Promise(function(t,n){1===a.length&&null===e?o.apply(i,[function(e){t.apply(null,[r(e)])},n]):o.apply(i,[t,n])})},n},["createOffer","createAnswer"].forEach(function(e){var t=webkitRTCPeerConnection.prototype[e];webkitRTCPeerConnection.prototype[e]=function(){var e=this;if(arguments.length<1||1===arguments.length&&"object"===o()(arguments[0])){var n=1===arguments.length?arguments[0]:void 0;return new Promise(function(i,o){t.apply(e,[i,o,n])})}return t.apply(this,arguments)}}),["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach(function(e){var t=webkitRTCPeerConnection.prototype[e];webkitRTCPeerConnection.prototype[e]=function(){var e=arguments,n=this;return new Promise(function(i,o){t.apply(n,[e[0],function(){i(),e.length>=2&&e[1].apply(null,[])},function(t){o(t),e.length>=3&&e[2].apply(null,[t])}])})}});var v=function(e){if("object"!==o()(e)||e.mandatory||e.optional)return e;var t={};return Object.keys(e).forEach(function(n){if("require"!==n&&"advanced"!==n&&"mediaSource"!==n){var i="object"===o()(e[n])?e[n]:{ideal:e[n]};void 0!==i.exact&&"number"==typeof i.exact&&(i.min=i.max=i.exact);var a=function(e,t){return e?e+t.charAt(0).toUpperCase()+t.slice(1):"deviceId"===t?"sourceId":t};if(void 0!==i.ideal){t.optional=t.optional||[];var r={};"number"==typeof i.ideal?(r[a("min",n)]=i.ideal,t.optional.push(r),(r={})[a("max",n)]=i.ideal,t.optional.push(r)):(r[a("",n)]=i.ideal,t.optional.push(r))}void 0!==i.exact&&"number"!=typeof i.exact?(t.mandatory=t.mandatory||{},t.mandatory[a("",n)]=i.exact):["min","max"].forEach(function(e){void 0!==i[e]&&(t.mandatory=t.mandatory||{},t.mandatory[a(e,n)]=i[e])})}}),e.advanced&&(t.optional=(t.optional||[]).concat(e.advanced)),t};if(a=function(e,t,n){return e.audio&&(e.audio=v(e.audio)),e.video&&(e.video=v(e.video)),f.log("chrome: "+JSON.stringify(e)),navigator.webkitGetUserMedia(e,t,n)},navigator.getUserMedia=a,navigator.mediaDevices||(navigator.mediaDevices={getUserMedia:I,enumerateDevices:function(){return new Promise(function(e){var t={audio:"audioinput",video:"videoinput"};return MediaStreamTrack.getSources(function(n){e(n.map(function(e){return{label:e.label,kind:t[e.kind],deviceId:e.id,groupId:""}}))})})}}),navigator.mediaDevices.getUserMedia){var S=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=function(e){return f.log("spec:   "+JSON.stringify(e)),e.audio=v(e.audio),e.video=v(e.video),f.log("chrome: "+JSON.stringify(e)),S(e)}}else navigator.mediaDevices.getUserMedia=function(e){return I(e)};void 0===navigator.mediaDevices.addEventListener&&(navigator.mediaDevices.addEventListener=function(){f.log("Dummy mediaDevices.addEventListener called.")}),void 0===navigator.mediaDevices.removeEventListener&&(navigator.mediaDevices.removeEventListener=function(){f.log("Dummy mediaDevices.removeEventListener called.")}),r=function(e,t){s>=43?c(e,t):void 0!==e.src?e.src=t?URL.createObjectURL(t):null:f.log("Error attaching stream to element.")},function(e,t){s>=43?c(e,u(t)):e.src=t.src}}else navigator.mediaDevices&&navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)?(f.log("This appears to be Edge"),"edge",s=f.extractVersion(navigator.userAgent,/Edge\/(\d+).(\d+)$/,2),12):f.log("Browser does not appear to be WebRTC-capable");else f.log("This does not appear to be a browser"),"not a browser";function I(e){return new Promise(function(t,n){a(e,t,n)})}var _;try{Object.defineProperty({},"version",{set:function(e){s=e}})}catch(e){}d?_=d:"undefined"!=typeof window&&(_=window.RTCPeerConnection)},function(e,t,n){var i=n(15);e.exports=function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},o=Object.keys(n);"function"==typeof Object.getOwnPropertySymbols&&(o=o.concat(Object.getOwnPropertySymbols(n).filter(function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),o.forEach(function(t){i(e,t,n[t])})}return e}},function(e,t,n){"use strict";n.d(t,"a",function(){return o});var i=window.AudioContext||window.webkitAudioContext,o=function(){if(i)return new i;throw new Error("AUDIO_CONTEXT_NOT_SUPPORTED")}},function(e,t,n){var i=n(13),o=n(14);e.exports=function(e,t,n){var a=t&&n||0;"string"==typeof e&&(t="binary"===e?new Array(16):null,e=null);var r=(e=e||{}).random||(e.rng||i)();if(r[6]=15&r[6]|64,r[8]=63&r[8]|128,t)for(var s=0;s<16;++s)t[a+s]=r[s];return t||o(r)}},function(e,t,n){"use strict";var i=this&&this.__awaiter||function(e,t,n,i){return new(n||(n=Promise))(function(o,a){function r(e){try{d(i.next(e))}catch(e){a(e)}}function s(e){try{d(i.throw(e))}catch(e){a(e)}}function d(e){e.done?o(e.value):new n(function(t){t(e.value)}).then(r,s)}d((i=i.apply(e,t||[])).next())})};Object.defineProperty(t,"__esModule",{value:!0});const o=n(16),a=n(2),r=n(0);t.getSupportedCodec=(e=>i(this,void 0,void 0,function*(){const t={video:[],audio:[]};if("undefined"==typeof window){const e="NOT_BROWSER_ENV";return r.default.error(`getSupportedCodec: ${e}`),Promise.reject(e)}{let n;try{n=o.createRTCPeerConnection({iceServers:[]})}catch(e){return r.default.error("Failed to init RTCPeerConnection",e),Promise.reject(e)}if(n){if(e&&e.stream){let t;e.stream.getTracks&&n.addTrack?e.stream.getTracks().forEach(t=>{n.addTrack(t,e.stream)}):n.addStream(e.stream),t=a.isSafari()||a.isFireFox()?yield n.createOffer():yield new Promise((e,t)=>{n.createOffer(e,t)}),n.close();const i=t.sdp;return s(i)}{const e={mandatory:{OfferToReceiveAudio:!0,OfferToReceiveVideo:!0}};let t;(a.isSafari()||a.isFireFox()||a.isWeChatBrowser())&&n.addTransceiver?(n.addTransceiver("audio"),n.addTransceiver("video"),t=yield n.createOffer()):t=yield new Promise((t,i)=>{const o=setTimeout(()=>{i("CREATEOFFER_TIMEOUT")},3e3);n.createOffer(e=>{clearTimeout(o),t(e)},e=>{clearTimeout(o),i(e)},e)}),n.close();const i=t.sdp;return s(i)}}return r.default.warning("getSupportedCodec: no RTCPeerConnection constructor is detected"),Promise.resolve(t)}}));const s=e=>{const t={video:[],audio:[]};return e.match(/ VP8/i)&&t.video.push("VP8"),e.match(/ H264/i)&&t.video.push("H264"),e.match(/ opus/i)&&t.audio.push("OPUS"),Promise.resolve(t)}},function(e,t){var n="undefined"!=typeof crypto&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto)||"undefined"!=typeof msCrypto&&"function"==typeof window.msCrypto.getRandomValues&&msCrypto.getRandomValues.bind(msCrypto);if(n){var i=new Uint8Array(16);e.exports=function(){return n(i),i}}else{var o=new Array(16);e.exports=function(){for(var e,t=0;t<16;t++)0==(3&t)&&(e=4294967296*Math.random()),o[t]=e>>>((3&t)<<3)&255;return o}}},function(e,t){for(var n=[],i=0;i<256;++i)n[i]=(i+256).toString(16).substr(1);e.exports=function(e,t){var i=t||0,o=n;return[o[e[i++]],o[e[i++]],o[e[i++]],o[e[i++]],"-",o[e[i++]],o[e[i++]],"-",o[e[i++]],o[e[i++]],"-",o[e[i++]],o[e[i++]],"-",o[e[i++]],o[e[i++]],o[e[i++]],o[e[i++]],o[e[i++]],o[e[i++]]].join("")}},function(e,t){e.exports=function(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}},function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const i="object"==typeof window&&window.RTCPeerConnection,o="object"==typeof window&&window.webkitRTCPeerConnection,a="object"==typeof window&&window.mozRTCPeerConnection;t.createRTCPeerConnection=(e=>{const t=i||o||a;return t?new t(e):null})},function(e,t,n){"use strict";n.r(t);var i=n(3),o=n(0),a=n(1),r=function(){var e={dispatcher:{}};return e.dispatcher.eventListeners={},e.addEventListener=function(t,n){void 0===e.dispatcher.eventListeners[t]&&(e.dispatcher.eventListeners[t]=[]),e.dispatcher.eventListeners[t].push(n)},e.hasListeners=function(t){return!(!e.dispatcher.eventListeners[t]||!e.dispatcher.eventListeners[t].length)},e.on=e.addEventListener,e.removeEventListener=function(t,n){var i;-1!==(i=e.dispatcher.eventListeners[t].indexOf(n))&&e.dispatcher.eventListeners[t].splice(i,1)},e.dispatchEvent=function(t){var n;for(n in e.dispatcher.eventListeners[t.type])e.dispatcher.eventListeners[t.type]&&e.dispatcher.eventListeners[t.type].hasOwnProperty(n)&&"function"==typeof e.dispatcher.eventListeners[t.type][n]&&e.dispatcher.eventListeners[t.type][n](t)},e.dispatchSocketEvent=function(t){var n;for(n in e.dispatcher.eventListeners[t.type])e.dispatcher.eventListeners[t.type]&&e.dispatcher.eventListeners[t.type].hasOwnProperty(n)&&"function"==typeof e.dispatcher.eventListeners[t.type][n]&&e.dispatcher.eventListeners[t.type][n](t.msg)},e},s=function(e){var t={};return t.type=e.type,t},d=function(e){var t=s(e);return t.stream=e.stream,t.reason=e.reason,t.msg=e.msg,t},c=function(e){var t=s(e);return t.uid=e.uid,t.attr=e.attr,t.stream=e.stream,t},u=function(e){var t=s(e);return t.msg=e.msg,t},l=function(e){var t=s(e);return t.url=e.url,t.uid=e.uid,t.status=e.status,t.reason=e.reason,t},p=n(2),f=function(){};f.prototype.set=function(e,t){["BatteryLevel"].indexOf(e)>-1&&(this[e]=t)};var m=new function(){var e=r();return e.states={UNINIT:"UNINIT",INITING:"INITING",INITED:"INITED"},e.state=e.states.UNINIT,e.batteryManager=null,e._init=function(t,n){e.state=e.states.INITING,navigator.getBattery?navigator.getBattery().then(function(n){e.batteryManager=n,t&&setTimeout(function(){t()},0)}).catch(function(e){o.default.debug("navigator.getBattery is disabled",e),t&&t()}):(e.state=e.states.INITED,t&&t())},e._getBatteryStats=function(){var t={};return e.batteryManager&&e.batteryManager.level?t.BatteryLevel=Math.floor(100*e.batteryManager.level):t.BatteryLevel="UNSUPPORTED",t},e.getStats=function(t,n){var i=new f,o=e._getBatteryStats();o&&o.BatteryLevel&&i.set("BatteryLevel",o.BatteryLevel),t&&t(i)},e._init(),e},g=n(6),v=n.n(g),S=n(4),I=n.n(S),_=function(e){var t=r();return t.url=".",t},h=n(8),y={101100:"NO_FLAG_SET",101101:"FLAG_SET_BUT_EMPTY",101102:"INVALID_FALG_SET",101203:"NO_SERVICE_AVIABLE",0:"OK_CODE",5:"INVALID_VENDOR_KEY",7:"INVALID_CHANNEL_NAME",8:"INTERNAL_ERROR",9:"NO_AUTHORIZED",10:"DYNAMIC_KEY_TIMEOUT",11:"NO_ACTIVE_STATUS",13:"DYNAMIC_KEY_EXPIRED",14:"STATIC_USE_DYANMIC_KEY",15:"DYNAMIC_USE_STATIC_KEY"},b={2000:"ERR_NO_VOCS_AVAILABLE",2001:"ERR_NO_VOS_AVAILABLE",2002:"ERR_JOIN_CHANNEL_TIMEOUT",2003:"WARN_REPEAT_JOIN",2004:"ERR_JOIN_BY_MULTI_IP",101:"ERR_INVALID_VENDOR_KEY",102:"ERR_INVALID_CHANNEL_NAME",103:"WARN_NO_AVAILABLE_CHANNEL",104:"WARN_LOOKUP_CHANNEL_TIMEOUT",105:"WARN_LOOKUP_CHANNEL_REJECTED",106:"WARN_OPEN_CHANNEL_TIMEOUT",107:"WARN_OPEN_CHANNEL_REJECTED",108:"WARN_REQUEST_DEFERRED",109:"ERR_DYNAMIC_KEY_TIMEOUT",110:"ERR_NO_AUTHORIZED",111:"ERR_VOM_SERVICE_UNAVAILABLE",112:"ERR_NO_CHANNEL_AVAILABLE_CODE",113:"ERR_TOO_MANY_USERS",114:"ERR_MASTER_VOCS_UNAVAILABLE",115:"ERR_INTERNAL_ERROR",116:"ERR_NO_ACTIVE_STATUS",117:"ERR_INVALID_UID",118:"ERR_DYNAMIC_KEY_EXPIRED",119:"ERR_STATIC_USE_DYANMIC_KE",120:"ERR_DYNAMIC_USE_STATIC_KE",2:"K_TIMESTAMP_EXPIRED",3:"K_CHANNEL_PERMISSION_INVALID",4:"K_CERTIFICATE_INVALID",5:"K_CHANNEL_NAME_EMPTY",6:"K_CHANNEL_NOT_FOUND",7:"K_TICKET_INVALID",8:"K_CHANNEL_CONFLICTED",9:"K_SERVICE_NOT_READY",10:"K_SERVICE_TOO_HEAVY",14:"K_UID_BANNED",15:"K_IP_BANNED",16:"K_CHANNEL_BANNED"},E=["NO_SERVICE_AVIABLE"],R={19:"ERR_ALREADY_IN_USE",10:"ERR_TIMEDOUT",3:"ERR_NOT_READY",9:"ERR_NO_PERMISSION",0:"UNKNOW_ERROR"},A={FAILED:"FAILED",INVALID_KEY:"INVALID_KEY",INVALID_CLIENT_MODE:"INVALID_CLIENT_MODE",INVALID_CLIENT_CODEC:"INVALID_CLIENT_CODEC",CLIENT_MODE_CODEC_MISMATCH:"CLIENT_MODE_CODEC_MISMATCH",WEB_API_NOT_SUPPORTED:"WEB_API_NOT_SUPPORTED",INVALID_PARAMETER:"INVALID_PARAMETER",INVALID_OPERATION:"INVALID_OPERATION",INVALID_LOCAL_STREAM:"INVALID_LOCAL_STREAM",INVALID_REMOTE_STREAM:"INVALID_REMOTE_STREAM",INVALID_DYNAMIC_KEY:"INVALID_DYNAMIC_KEY",DYNAMIC_KEY_TIMEOUT:"DYNAMIC_KEY_TIMEOUT",NO_VOCS_AVAILABLE:"NO_VOCS_AVAILABLE",NO_VOS_AVAILABLE:"ERR_NO_VOS_AVAILABLE",JOIN_CHANNEL_TIMEOUT:"ERR_JOIN_CHANNEL_TIMEOUT",NO_AVAILABLE_CHANNEL:"NO_AVAILABLE_CHANNEL",LOOKUP_CHANNEL_TIMEOUT:"LOOKUP_CHANNEL_TIMEOUT",LOOKUP_CHANNEL_REJECTED:"LOOKUP_CHANNEL_REJECTED",OPEN_CHANNEL_TIMEOUT:"OPEN_CHANNEL_TIMEOUT",OPEN_CHANNEL_REJECTED:"OPEN_CHANNEL_REJECTED",REQUEST_DEFERRED:"REQUEST_DEFERRED",STREAM_ALREADY_PUBLISHED:"STREAM_ALREADY_PUBLISHED",STREAM_NOT_YET_PUBLISHED:"STREAM_NOT_YET_PUBLISHED",JOIN_TOO_FREQUENT:"JOIN_TOO_FREQUENT",SOCKET_ERROR:"SOCKET_ERROR",SOCKET_DISCONNECTED:"SOCKET_DISCONNECTED",PEERCONNECTION_FAILED:"PEERCONNECTION_FAILED",CONNECT_GATEWAY_ERROR:"CONNECT_GATEWAY_ERROR",SERVICE_NOT_AVAILABLE:"SERVICE_NOT_AVAILABLE",JOIN_CHANNEL_FAILED:"JOIN_CHANNEL_FAILED",PUBLISH_STREAM_FAILED:"PUBLISH_STREAM_FAILED",UNPUBLISH_STREAM_FAILED:"UNPUBLISH_STREAM_FAILED",SUBSCRIBE_STREAM_FAILED:"SUBSCRIBE_STREAM_FAILED",UNSUBSCRIBE_STREAM_FAILED:"UNSUBSCRIBE_STREAM_FAILED",NO_SUCH_REMOTE_STREAM:"NO_SUCH_REMOTE_STREAM",ERR_FAILED:"1",ERR_INVALID_VENDOR_KEY:"101",ERR_INVALID_CHANNEL_NAME:"102",WARN_NO_AVAILABLE_CHANNEL:"103",WARN_LOOKUP_CHANNEL_TIMEOUT:"104",WARN_LOOKUP_CHANNEL_REJECTED:"105",WARN_OPEN_CHANNEL_TIMEOUT:"106",WARN_OPEN_CHANNEL_REJECTED:"107",WARN_REQUEST_DEFERRED:"108",ERR_DYNAMIC_KEY_TIMEOUT:"109",ERR_INVALID_DYNAMIC_KEY:"110",ERR_NO_VOCS_AVAILABLE:"2000",ERR_NO_VOS_AVAILABLE:"2001",ERR_JOIN_CHANNEL_TIMEOUT:"2002",IOS_NOT_SUPPORT:"IOS_NOT_SUPPORT",WECHAT_NOT_SUPPORT:"WECHAT_NOT_SUPPORT",SHARING_SCREEN_NOT_SUPPORT:"SHARING_SCREEN_NOT_SUPPORT",STILL_ON_PUBLISHING:"STILL_ON_PUBLISHING",LOW_STREAM_ALREADY_PUBLISHED:"LOW_STREAM_ALREADY_PUBLISHED",LOW_STREAM_NOT_YET_PUBLISHED:"LOW_STREAM_ALREADY_PUBLISHED",HIGH_STREAM_NOT_VIDEO_TRACE:"HIGH_STREAM_NOT_VIDEO_TRACE",NOT_FIND_DEVICE_BY_LABEL:"NOT_FIND_DEVICE_BY_LABEL",ENABLE_DUALSTREAM_FAILED:"ENABLE_DUALSTREAM_FAILED",DISABLE_DUALSTREAM_FAILED:"DISABLE_DUALSTREAM_FAILED",PLAYER_NOT_FOUND:"PLAYER_NOT_FOUND",ELECTRON_NOT_SUPPORT_SHARING_SCREEN:"ELECTRON_NOT_SUPPORT_SHARING_SCREEN",BAD_ENVIRONMENT:"BAD_ENVIRONMENT"},T=function(e){var t=_({});t.id=e.id,t.fit=e.options&&e.options.fit,"contain"!==t.fit&&"cover"!==t.fit&&(t.fit=null),t.url=e.url,t.stream=e.stream.stream,t.elementID=e.elementID,t.setAudioOutput=function(e,n,i){var a=t.video||t.audio;return a?a.setSinkId?void a.setSinkId(e).then(function(){return o.default.debug("["+t.id+"] "+"video ".concat(t.id," setAudioOutput ").concat(e," SUCCESS")),a==t.video&&t.audio?t.audio.setSinkId(e):Promise.resolve()}).then(function(){return o.default.debug("["+t.id+"] "+"audio ".concat(t.id," setAudioOutput ").concat(e," SUCCESS")),n&&n()}).catch(function(e){return o.default.error("["+t.id+"] VideoPlayer.setAudioOutput",e),i&&i(e)}):(o.default.error("["+t.id+"] ",A.WEB_API_NOT_SUPPORTED),i&&i(A.WEB_API_NOT_SUPPORTED)):(o.default.error("["+t.id+"] ",A.PLAYER_NOT_FOUND),i&&i(A.PLAYER_NOT_FOUND))},t.destroy=function(){Object(h.c)(t.video,null),Object(h.c)(t.audio,null),t.video.pause(),delete t.resizer,document.getElementById(t.div.id)&&t.parentNode.contains(t.div)&&t.parentNode.removeChild(t.div)},t.div=document.createElement("div"),t.div.setAttribute("id","player_"+t.id),e.stream.video?t.div.setAttribute("style","width: 100%; height: 100%; position: relative; background-color: black; overflow: hidden;"):t.div.setAttribute("style","width: 100%; height: 100%; position: relative; overflow: hidden;"),t.video=document.createElement("video"),t.video.setAttribute("id","video"+t.id),e.stream.local&&!e.stream.screen?e.stream.mirror?t.video.setAttribute("style","width: 100%; height: 100%; position: absolute; transform: rotateY(180deg); object-fit: ".concat(t.fit||"cover",";")):t.video.setAttribute("style","width: 100%; height: 100%; position: absolute; object-fit: ".concat(t.fit||"cover",";")):e.stream.video?t.video.setAttribute("style","width: 100%; height: 100%; position: absolute; object-fit: ".concat(t.fit||"cover",";")):e.stream.screen?t.video.setAttribute("style","width: 100%; height: 100%; position: absolute; object-fit: ".concat(t.fit||"contain")):t.video.setAttribute("style","width: 100%; height: 100%; position: absolute; display: none; object-fit: ".concat(t.fit||"cover"));var n={autoplay:!0,muted:!!e.stream.local||!(!p.isSafari()&&"iOS"!==p.getBrowserOS())&&"video_element_muted",playsinline:!0,controls:!(!p.isSafari()&&"iOS"!==p.getBrowserOS()||e.stream.local),volume:null},i=I()({},n,e.options);if(!0!==i.muted||i.volume||(i.volume=0),i.autoplay&&t.video.setAttribute("autoplay",""),!0!==i.muted&&"video_element_muted"!==i.muted||(t.video.setAttribute("muted",""),t.video.muted=!0),i.playsinline&&t.video.setAttribute("playsinline",""),i.controls&&t.video.setAttribute("controls",""),Number.isFinite(i.volume)&&(t.video.volume=i.volume),t.audio=document.createElement("audio"),t.audio.setAttribute("id","audio"+t.id),i.autoplay&&t.audio.setAttribute("autoplay",""),!0===i.muted&&t.audio.setAttribute("muted",""),!0===i.muted&&(t.audio.muted=!0),i.playsinline&&t.audio.setAttribute("playsinline",""),Number.isFinite(i.volume)&&(t.audio.volume=i.volume),void 0!==t.elementID?(document.getElementById(t.elementID).appendChild(t.div),t.container=document.getElementById(t.elementID)):(document.body.appendChild(t.div),t.container=document.body),t.parentNode=t.div.parentNode,t.video.addEventListener("playing",function(e){!function e(){t.video.videoWidth*t.video.videoHeight>4?o.default.debug("["+t.id+"] video dimensions:",t.video.videoWidth,t.video.videoHeight):setTimeout(e,50)}()}),e.stream.hasVideo()||e.stream.hasScreen())t.div.appendChild(t.video),t.div.appendChild(t.audio),Object(h.b)(t.video,e.stream.stream),Object(h.b)(t.audio,e.stream.stream);else if(!1!==i.muted&&"video_element_muted"!==i.muted||(t.video.removeAttribute("muted"),t.video.muted=!1,t.div.appendChild(t.video)),window.MediaStream&&p.isSafari()){var a=new MediaStream(e.stream.stream.getAudioTracks());Object(h.c)(t.video,a)}else Object(h.c)(t.video,e.stream.stream);return t.setAudioVolume=function(e){var n=parseInt(e)/100;isFinite(n)&&(n<0?n=0:n>1&&(n=1),t.video&&(t.video.volume=n),t.audio&&(t.audio.volume=n))},t},O=function(e){var t={},n=webkitRTCPeerConnection;t.pc_config={iceServers:[]},t.con={optional:[{DtlsSrtpKeyAgreement:!0}]},e.iceServers instanceof Array?t.pc_config.iceServers=e.iceServers:(e.stunServerUrl&&(e.stunServerUrl instanceof Array?e.stunServerUrl.map(function(e){"string"==typeof e&&""!==e&&t.pc_config.iceServers.push({url:e})}):"string"==typeof e.stunServerUrl&&""!==e.stunServerUrl&&t.pc_config.iceServers.push({url:e.stunServerUrl})),e.turnServer&&(e.turnServer instanceof Array?e.turnServer.map(function(e){"string"==typeof e.url&&""!==e.url&&t.pc_config.iceServers.push({username:e.username,credential:e.password,url:e.url})}):"string"==typeof e.turnServer.url&&""!==e.turnServer.url&&t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.password,url:e.turnServer.url}))),void 0===e.audio&&(e.audio=!0),void 0===e.video&&(e.video=!0),t.mediaConstraints={mandatory:{OfferToReceiveVideo:e.video,OfferToReceiveAudio:e.audio}},t.roapSessionId=103,t.peerConnection=new n(t.pc_config,t.con),t.peerConnection.onicecandidate=function(e){e.candidate?t.iceCandidateCount+=1:(o.default.debug("PeerConnection State: "+t.peerConnection.iceGatheringState),void 0===t.ices&&(t.ices=0),t.ices=t.ices+1,t.ices>=1&&t.moreIceComing&&(t.moreIceComing=!1,t.markActionNeeded()))};var i=function(t){var n,i;return e.minVideoBW&&e.maxVideoBW&&(i=(n=t.match(/m=video.*\r\n/))[0]+"b=AS:"+e.maxVideoBW+"\r\n",t=t.replace(n[0],i),o.default.debug("Set Video Bitrate - min:"+e.minVideoBW+" max:"+e.maxVideoBW)),e.maxAudioBW&&(i=(n=t.match(/m=audio.*\r\n/))[0]+"b=AS:"+e.maxAudioBW+"\r\n",t=t.replace(n[0],i)),t};return t.processSignalingMessage=function(e){var n,o=JSON.parse(e);t.incomingMessage=o,"new"===t.state?"OFFER"===o.messageType?(n={sdp:o.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state):"offer-sent"===t.state?"ANSWER"===o.messageType?((n={sdp:o.sdp,type:"answer"}).sdp=i(n.sdp),t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.sendOK(),t.state="established"):"pr-answer"===o.messageType?(n={sdp:o.sdp,type:"pr-answer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n))):"offer"===o.messageType?t.error("Not written yet"):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state):"established"===t.state&&("OFFER"===o.messageType?(n={sdp:o.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state))},t.addStream=function(e){t.peerConnection.addStream(e),t.markActionNeeded()},t.removeStream=function(){t.markActionNeeded()},t.close=function(){t.state="closed",t.peerConnection.close()},t.markActionNeeded=function(){t.actionNeeded=!0,t.doLater(function(){t.onstablestate()})},t.doLater=function(e){window.setTimeout(e,1)},t.onstablestate=function(){var e;if(t.actionNeeded){if("new"===t.state||"established"===t.state)t.peerConnection.createOffer(function(e){if(e.sdp=i(e.sdp),o.default.debug("Changed",e.sdp),e.sdp!==t.prevOffer)return t.peerConnection.setLocalDescription(e),t.state="preparing-offer",void t.markActionNeeded();o.default.debug("Not sending a new offer")},function(e){o.default.debug("peer connection create offer failed ",e)},t.mediaConstraints);else if("preparing-offer"===t.state){if(t.moreIceComing)return;t.prevOffer=t.peerConnection.localDescription.sdp,t.sendMessage("OFFER",t.prevOffer),t.state="offer-sent"}else if("offer-received"===t.state)t.peerConnection.createAnswer(function(e){if(t.peerConnection.setLocalDescription(e),t.state="offer-received-preparing-answer",t.iceStarted)t.markActionNeeded();else{var n=new Date;o.default.debug(n.getTime()+": Starting ICE in responder"),t.iceStarted=!0}},function(e){o.default.debug("peer connection create answer failed ",e)},t.mediaConstraints);else if("offer-received-preparing-answer"===t.state){if(t.moreIceComing)return;e=t.peerConnection.localDescription.sdp,t.sendMessage("ANSWER",e),t.state="established"}else t.error("Dazed and confused in state "+t.state+", stopping here");t.actionNeeded=!1}},t.sendOK=function(){t.sendMessage("OK")},t.sendMessage=function(e,n){var i={};i.messageType=e,i.sdp=n,"OFFER"===e?(i.offererSessionId=t.sessionId,i.answererSessionId=t.otherSessionId,i.seq=t.sequenceNumber+=1,i.tiebreaker=Math.floor(429496723*Math.random()+1)):(i.offererSessionId=t.incomingMessage.offererSessionId,i.answererSessionId=t.sessionId,i.seq=t.incomingMessage.seq),t.onsignalingmessage(JSON.stringify(i))},t._getSender=function(e){if(t.peerConnection&&t.peerConnection.getSenders){var n=t.peerConnection.getSenders().find(function(t){return t.track.kind==e});if(n)return n}return null},t.hasSender=function(e){return!!t._getSender(e)},t.replaceTrack=function(e,n,i){var o=t._getSender(e.kind);if(!o)return i("NO_SENDER_FOUND");try{o.replaceTrack(e)}catch(e){return i&&i(e)}setTimeout(function(){return n&&n()},50)},t.error=function(e){throw"Error in RoapOnJsep: "+e},t.sessionId=t.roapSessionId+=1,t.sequenceNumber=0,t.actionNeeded=!1,t.iceStarted=!1,t.moreIceComing=!0,t.iceCandidateCount=0,t.onsignalingmessage=e.callback,t.peerConnection.onopen=function(){t.onopen&&t.onopen()},t.peerConnection.onaddstream=function(e){t.onaddstream&&t.onaddstream(e)},t.peerConnection.onremovestream=function(e){t.onremovestream&&t.onremovestream(e)},t.peerConnection.oniceconnectionstatechange=function(e){t.oniceconnectionstatechange&&t.oniceconnectionstatechange(e.currentTarget.iceConnectionState)},t.onaddstream=null,t.onremovestream=null,t.state="new",t.markActionNeeded(),t},C=function(e){var t={},n=h.a;t.uid=e.uid,t.isVideoMute=e.isVideoMute,t.isAudioMute=e.isAudioMute,t.isSubscriber=e.isSubscriber,t.clientId=e.clientId,t.pc_config={iceServers:[{url:"stun:webcs.agora.io:3478"}]},t.con={optional:[{DtlsSrtpKeyAgreement:!0}]},e.iceServers instanceof Array?t.pc_config.iceServers=e.iceServers:(e.stunServerUrl&&(e.stunServerUrl instanceof Array?e.stunServerUrl.map(function(e){"string"==typeof e&&""!==e&&t.pc_config.iceServers.push({url:e})}):"string"==typeof e.stunServerUrl&&""!==e.stunServerUrl&&t.pc_config.iceServers.push({url:e.stunServerUrl})),e.turnServer&&(e.turnServer instanceof Array?e.turnServer.map(function(e){"string"==typeof e.url&&""!==e.url&&t.pc_config.iceServers.push({username:e.username,credential:e.credential,url:e.url})}):"string"==typeof e.turnServer.url&&""!==e.turnServer.url&&(t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:"turn:"+e.turnServer.url+":"+e.turnServer.udpport+"?transport=udp"}),"string"==typeof e.turnServer.tcpport&&""!==e.turnServer.tcpport&&t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:"turn:"+e.turnServer.url+":"+e.turnServer.tcpport+"?transport=tcp"}),!0===e.turnServer.forceturn&&(t.pc_config.iceTransportPolicy="relay")))),void 0===e.audio&&(e.audio=!0),void 0===e.video&&(e.video=!0),t.mediaConstraints={mandatory:{OfferToReceiveVideo:e.video,OfferToReceiveAudio:e.audio}},t.roapSessionId=103;try{t.pc_config.sdpSemantics="plan-b",t.peerConnection=new n(t.pc_config,t.con)}catch(e){delete t.pc_config.sdpSemantics,t.peerConnection=new n(t.pc_config,t.con)}t.peerConnection.onicecandidate=function(e){var n,i,a,r;i=(n=t.peerConnection.localDescription.sdp).match(/a=candidate:.+typ\ssrflx.+\r\n/),a=n.match(/a=candidate:.+typ\shost.+\r\n/),r=n.match(/a=candidate:.+typ\srelay.+\r\n/),0===t.iceCandidateCount&&(t.timeout=setTimeout(function(){t.moreIceComing&&(t.moreIceComing=!1,t.markActionNeeded())},1e3)),null===i&&null===a&&null===r||void 0!==t.ice||(o.default.debug("["+t.clientId+"]srflx candidate : "+i+" relay candidate: "+r+" host candidate : "+a),clearTimeout(t.timeout),t.ice=0,t.moreIceComing=!1,t.markActionNeeded()),t.iceCandidateCount=t.iceCandidateCount+1},o.default.debug("["+t.clientId+']Created webkitRTCPeerConnnection with config "'+JSON.stringify(t.pc_config)+'".');var i=function(t){return e.screen&&(t=t.replace("a=x-google-flag:conference\r\n","")),t},a=function(n){var i,a;if(e.minVideoBW&&e.maxVideoBW){a=(i=n.match(/m=video.*\r\n/))[0]+"b=AS:"+e.maxVideoBW+"\r\n";var r=0,s=0;"h264"===e.codec?(r=n.search(/a=rtpmap:(\d+) H264\/90000\r\n/),s=n.search(/H264\/90000\r\n/)):"vp8"===e.codec&&(r=n.search(/a=rtpmap:(\d+) VP8\/90000\r\n/),s=n.search(/VP8\/90000\r\n/)),-1!==r&&-1!==s&&s-r>10&&(a=a+"a=fmtp:"+n.slice(r+9,s-1)+" x-google-min-bitrate="+e.minVideoBW+"\r\n"),n=n.replace(i[0],a),o.default.debug("["+t.clientId+"]Set Video Bitrate - min:"+e.minVideoBW+" max:"+e.maxVideoBW)}return e.maxAudioBW&&(a=(i=n.match(/m=audio.*\r\n/))[0]+"b=AS:"+e.maxAudioBW+"\r\n",n=n.replace(i[0],a)),n};return t.processSignalingMessage=function(e){var n,o=JSON.parse(e);t.incomingMessage=o,"new"===t.state?"OFFER"===o.messageType?(n={sdp:o.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state):"offer-sent"===t.state?"ANSWER"===o.messageType?((n={sdp:o.sdp,type:"answer"}).sdp=i(n.sdp),n.sdp=a(n.sdp),t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.sendOK(),t.state="established"):"pr-answer"===o.messageType?(n={sdp:o.sdp,type:"pr-answer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n))):"offer"===o.messageType?t.error("Not written yet"):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state):"established"===t.state&&("OFFER"===o.messageType?(n={sdp:o.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.state="offer-received",t.markActionNeeded()):"ANSWER"===o.messageType?((n={sdp:o.sdp,type:"answer"}).sdp=i(n.sdp),n.sdp=a(n.sdp),t.peerConnection.setRemoteDescription(new RTCSessionDescription(n))):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state))},t.getVideoRelatedStats=function(e){t.peerConnection.getStats(null,function(n){Object.keys(n).forEach(function(i){var o=n[i];t.isSubscriber?"video"===o.mediaType&&o.id&&~o.id.indexOf("recv")&&e&&e({mediaType:"video",peerId:t.uid,isVideoMute:t.isVideoMute,frameRateReceived:o.googFrameRateReceived,frameRateDecoded:o.googFrameRateDecoded,bytesReceived:o.bytesReceived,packetsReceived:o.packetsReceived,packetsLost:o.packetsLost}):"video"===o.mediaType&&o.id&&~o.id.indexOf("send")&&e&&e({mediaType:"video",isVideoMute:t.isVideoMute,frameRateInput:o.googFrameRateInput,frameRateSent:o.googFrameRateSent,googRtt:o.googRtt})})})},t.getAudioRelatedStats=function(e){t.peerConnection.getStats(null,function(n){Object.keys(n).forEach(function(i){var o=n[i];t.isSubscriber&&"audio"===o.mediaType&&o.id&&~o.id.indexOf("recv")&&e&&e({mediaType:"audio",peerId:t.uid,isAudioMute:t.isAudioMute,frameDropped:parseInt(o.googDecodingPLC)+parseInt(o.googDecodingPLCCNG)+"",frameReceived:o.googDecodingCTN,googJitterReceived:o.googJitterReceived,bytesReceived:o.bytesReceived,packetsReceived:o.packetsReceived,packetsLost:o.packetsLost})})})},t.getStatsRate=function(e){t.getStats(function(t){e(t)})},t.getStats=function(e){t.peerConnection.getStats(null,function(n){var i=[],o=[],a=null;Object.keys(n).forEach(function(e){var t=n[e];o.push(t),"ssrc"!==t.type&&"VideoBwe"!==t.type||(a=t.timestamp,i.push(t))}),i.push({id:"time",startTime:t.connectedTime,timestamp:a||new Date}),e(i,o)})},t.addTrack=function(e,n){t.peerConnection.addTrack(e,n)},t.removeTrack=function(e,n){t.peerConnection.removeTrack(t.peerConnection.getSenders().find(function(t){return t.track==e}))},t.addStream=function(e){t.peerConnection.addStream(e),t.markActionNeeded()},t.removeStream=function(){t.markActionNeeded()},t.close=function(){t.state="closed",t.peerConnection.close()},t.markActionNeeded=function(){t.actionNeeded=!0,t.doLater(function(){t.onstablestate()})},t.doLater=function(e){window.setTimeout(e,1)},t.onstablestate=function(){var e;if(t.actionNeeded){if("new"===t.state||"established"===t.state)t.peerConnection.createOffer(function(e){if(e.sdp!==t.prevOffer)return t.peerConnection.setLocalDescription(e),t.state="preparing-offer",void t.markActionNeeded();o.default.debug("["+t.clientId+"]Not sending a new offer")},function(e){o.default.debug("["+t.clientId+"]peer connection create offer failed ",e)},t.mediaConstraints);else if("preparing-offer"===t.state){if(t.moreIceComing)return;t.prevOffer=t.peerConnection.localDescription.sdp,t.prevOffer=t.prevOffer.replace(/a=candidate:.+typ\shost.+\r\n/g,"a=candidate:2243255435 1 udp 2122194687 192.168.0.1 30000 typ host generation 0 network-id 1\r\n"),t.sendMessage("OFFER",t.prevOffer),t.state="offer-sent"}else if("offer-received"===t.state)t.peerConnection.createAnswer(function(e){if(t.peerConnection.setLocalDescription(e),t.state="offer-received-preparing-answer",t.iceStarted)t.markActionNeeded();else{var n=new Date;o.default.debug("["+t.clientId+"]"+n.getTime()+": Starting ICE in responder"),t.iceStarted=!0}},function(e){o.default.debug("["+t.clientId+"]peer connection create answer failed ",e)},t.mediaConstraints);else if("offer-received-preparing-answer"===t.state){if(t.moreIceComing)return;e=t.peerConnection.localDescription.sdp,t.sendMessage("ANSWER",e),t.state="established"}else t.error("Dazed and confused in state "+t.state+", stopping here");t.actionNeeded=!1}},t.sendOK=function(){t.sendMessage("OK")},t.sendMessage=function(e,n){var i={};i.messageType=e,i.sdp=n,"OFFER"===e?(i.offererSessionId=t.sessionId,i.answererSessionId=t.otherSessionId,i.seq=t.sequenceNumber+=1,i.tiebreaker=Math.floor(429496723*Math.random()+1)):(i.offererSessionId=t.incomingMessage.offererSessionId,i.answererSessionId=t.sessionId,i.seq=t.incomingMessage.seq),t.onsignalingmessage(JSON.stringify(i))},t._getSender=function(e){if(t.peerConnection&&t.peerConnection.getSenders){var n=t.peerConnection.getSenders().find(function(t){return t.track.kind==e});if(n)return n}return null},t.hasSender=function(e){return!!t._getSender(e)},t.replaceTrack=function(e,n,i){var o=t._getSender(e.kind);if(!o)return i("NO_SENDER_FOUND");try{o.replaceTrack(e)}catch(e){return i&&i(e)}setTimeout(function(){return n&&n()},50)},t.error=function(e){throw"Error in RoapOnJsep: "+e},t.sessionId=t.roapSessionId+=1,t.sequenceNumber=0,t.actionNeeded=!1,t.iceStarted=!1,t.moreIceComing=!0,t.iceCandidateCount=0,t.onsignalingmessage=e.callback,t.peerConnection.ontrack=function(e){t.onaddstream&&(t.onaddstream(e,"ontrack"),t.peerConnection.onaddstream=null)},t.peerConnection.onaddstream=function(e){t.onaddstream&&(t.onaddstream(e,"onaddstream"),t.peerConnection.ontrack=null)},t.peerConnection.onremovestream=function(e){t.onremovestream&&t.onremovestream(e)},t.peerConnection.oniceconnectionstatechange=function(e){"connected"===e.currentTarget.iceConnectionState&&(t.connectedTime=new Date),t.oniceconnectionstatechange&&t.oniceconnectionstatechange(e.currentTarget.iceConnectionState)},t.peerConnection.onnegotiationneeded=function(){void 0!==t.prevOffer&&t.peerConnection.createOffer().then(function(e){return e.sdp=e.sdp.replace(/a=recvonly\r\n/g,"a=inactive\r\n"),e.sdp=i(e.sdp),e.sdp=a(e.sdp),t.peerConnection.setLocalDescription(e)}).then(function(){t.onnegotiationneeded&&t.onnegotiationneeded(t.peerConnection.localDescription.sdp)}).catch(function(e){console.log("createOffer error: ",e)})},t.onaddstream=null,t.onremovestream=null,t.onnegotiationneeded=null,t.state="new",t.markActionNeeded(),t},N=function(e){var t={},n=h.a;t.uid=e.uid,t.isVideoMute=e.isVideoMute,t.isAudioMute=e.isAudioMute,t.isSubscriber=e.isSubscriber,t.clientId=e.clientId,t.pc_config={iceServers:[{urls:["stun:webcs.agora.io:3478","stun:stun.l.google.com:19302"]}],bundlePolicy:"max-bundle"},t.con={optional:[{DtlsSrtpKeyAgreement:!0}]},e.iceServers instanceof Array?t.pc_config.iceServers=e.iceServers:(e.stunServerUrl&&(e.stunServerUrl instanceof Array?e.stunServerUrl.map(function(e){"string"==typeof e&&""!==e&&t.pc_config.iceServers.push({url:e})}):"string"==typeof e.stunServerUrl&&""!==e.stunServerUrl&&t.pc_config.iceServers.push({url:e.stunServerUrl})),e.turnServer&&(e.turnServer instanceof Array?e.turnServer.map(function(e){"string"==typeof e.url&&""!==e.url&&t.pc_config.iceServers.push({username:e.username,credential:e.credential,url:e.url})}):"string"==typeof e.turnServer.url&&""!==e.turnServer.url&&(t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:["turn:"+e.turnServer.url+":"+e.turnServer.udpport+"?transport=udp"]}),"string"==typeof e.turnServer.tcpport&&""!==e.turnServer.tcpport&&t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:["turn:"+e.turnServer.url+":"+e.turnServer.tcpport+"?transport=tcp"]}),!0===e.turnServer.forceturn&&(t.pc_config.iceTransportPolicy="relay")))),void 0===e.audio&&(e.audio=!0),void 0===e.video&&(e.video=!0),t.mediaConstraints={mandatory:{OfferToReceiveVideo:e.video,OfferToReceiveAudio:e.audio}},t.roapSessionId=103;try{t.pc_config.sdpSemantics="plan-b",t.peerConnection=new n(t.pc_config,t.con)}catch(e){delete t.pc_config.sdpSemantics,t.peerConnection=new n(t.pc_config,t.con)}o.default.debug("["+t.clientId+']safari Created RTCPeerConnnection with config "'+JSON.stringify(t.pc_config)+'".'),t.peerConnection.onicecandidate=function(e){var n,i,a,r;i=(n=t.peerConnection.localDescription.sdp).match(/a=candidate:.+typ\ssrflx.+\r\n/),a=n.match(/a=candidate:.+typ\shost.+\r\n/),r=n.match(/a=candidate:.+typ\srelay.+\r\n/),0===t.iceCandidateCount&&(t.timeout=setTimeout(function(){t.moreIceComing&&(t.moreIceComing=!1,t.markActionNeeded())},1e3)),null===i&&null===a&&null===r||void 0!==t.ice||(o.default.debug("["+t.clientId+"]srflx candidate : "+i+" relay candidate: "+r+" host candidate : "+a),clearTimeout(t.timeout),t.ice=0,t.moreIceComing=!1,t.markActionNeeded()),t.iceCandidateCount=t.iceCandidateCount+1};var i=function(t){return e.screen&&(t=t.replace("a=x-google-flag:conference\r\n","")),t},a=function(n){var i,a;return e.minVideoBW&&e.maxVideoBW&&(a=(i=n.match(/m=video.*\r\n/))[0]+"b=AS:"+e.maxVideoBW+"\r\n",n=n.replace(i[0],a),o.default.debug("["+t.clientId+"]Set Video Bitrate - min:"+e.minVideoBW+" max:"+e.maxVideoBW)),e.maxAudioBW&&(a=(i=n.match(/m=audio.*\r\n/))[0]+"b=AS:"+e.maxAudioBW+"\r\n",n=n.replace(i[0],a)),n};t.processSignalingMessage=function(e){var n,o=JSON.parse(e);t.incomingMessage=o,"new"===t.state?"OFFER"===o.messageType?(n={sdp:o.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state):"offer-sent"===t.state?"ANSWER"===o.messageType?((n={sdp:o.sdp,type:"answer"}).sdp=i(n.sdp),n.sdp=a(n.sdp),n.sdp=n.sdp.replace(/a=x-google-flag:conference\r\n/g,""),t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.sendOK(),t.state="established"):"pr-answer"===o.messageType?(n={sdp:o.sdp,type:"pr-answer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n))):"offer"===o.messageType?t.error("Not written yet"):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state):"established"===t.state&&("OFFER"===o.messageType?(n={sdp:o.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new RTCSessionDescription(n)),t.state="offer-received",t.markActionNeeded()):"ANSWER"===o.messageType?((n={sdp:o.sdp,type:"answer"}).sdp=i(n.sdp),n.sdp=a(n.sdp),t.peerConnection.setRemoteDescription(new RTCSessionDescription(n))):t.error("Illegal message for this state: "+o.messageType+" in state "+t.state))};var r={id:"",type:"",mediaType:"",googCodecName:"opus",aecDivergentFilterFraction:"0",audioInputLevel:"0",bytesSent:"0",packetsSent:"0",googEchoCancellationReturnLoss:"0",googEchoCancellationReturnLossEnhancement:"0"},s={id:"",type:"",mediaType:"",googCodecName:"h264"===e.codec?"H264":"VP8",bytesSent:"0",packetsLost:"0",packetsSent:"0",googAdaptationChanges:"0",googAvgEncodeMs:"0",googEncodeUsagePercent:"0",googFirsReceived:"0",googFrameHeightSent:"0",googFrameHeightInput:"0",googFrameRateInput:"0",googFrameRateSent:"0",googFrameWidthSent:"0",googFrameWidthInput:"0",googNacksReceived:"0",googPlisReceived:"0",googRtt:"0",googFramesEncoded:"0"},d={id:"",type:"",mediaType:"",audioOutputLevel:"0",bytesReceived:"0",packetsLost:"0",packetsReceived:"0",googAccelerateRate:"0",googCurrentDelayMs:"0",googDecodingCNG:"0",googDecodingCTN:"0",googDecodingCTSG:"0",googDecodingNormal:"0",googDecodingPLC:"0",googDecodingPLCCNG:"0",googExpandRate:"0",googJitterBufferMs:"0",googJitterReceived:"0",googPreemptiveExpandRate:"0",googPreferredJitterBufferMs:"0",googSecondaryDecodedRate:"0",googSpeechExpandRate:"0"},c={id:"",type:"",mediaType:"",googTargetDelayMs:"0",packetsLost:"0",googDecodeMs:"0",googMaxDecodeMs:"0",googRenderDelayMs:"0",googFrameWidthReceived:"0",googFrameHeightReceived:"0",googFrameRateReceived:"0",googFrameRateDecoded:"0",googFrameRateOutput:"0",googFramesDecoded:"0",googFrameReceived:"0",googJitterBufferMs:"0",googCurrentDelayMs:"0",googMinPlayoutDelayMs:"0",googNacksSent:"0",googPlisSent:"0",googFirsSent:"0",bytesReceived:"0",packetsReceived:"0"},u={id:"bweforvideo",type:"VideoBwe",googAvailableSendBandwidth:"0",googAvailableReceiveBandwidth:"0",googActualEncBitrate:"0",googRetransmitBitrate:"0",googTargetEncBitrate:"0",googBucketDelay:"0",googTransmitBitrate:"0"},l=0,p=0,f=0;return t.getVideoRelatedStats=function(n){t.peerConnection.getStats().then(function(i){var o={peerId:t.uid,mediaType:"video",isVideoMute:t.isVideoMute};i.forEach(function(i){if(t.isSubscriber){if("track"===i.type&&(~i.id.indexOf("video")||~i.trackIdentifier.indexOf("v"))){if(!t.lastReport)return void(t.lastReport=i);o.frameRateReceived=i.framesReceived-t.lastReport.framesReceived+"",o.frameRateDecoded=i.framesDecoded-t.lastReport.framesDecoded+"",t.lastReport=i}"inbound-rtp"===i.type&&~i.id.indexOf("Video")&&(o.bytesReceived=i.bytesReceived+"",o.packetsReceived=i.packetsReceived+"",o.packetsLost=i.packetsLost+"")}else if("outbound-rtp"===i.type&&~i.id.indexOf("Video")){if(!t.lastReport)return void(t.lastReport=i);n&&n({mediaType:"video",isVideoMute:t.isVideoMute,frameRateInput:e.maxFrameRate+"",frameRateSent:i.framesEncoded-t.lastReport.framesEncoded+""}),t.lastReport=i}}),n&&n(o)})},t.getAudioRelatedStats=function(e){t.peerConnection.getStats().then(function(n){n.forEach(function(n){t.isSubscriber&&"inbound-rtp"===n.type&&~n.id.indexOf("Audio")&&e&&e({peerId:t.uid,mediaType:"audio",isAudioMute:t.isAudioMute,frameDropped:n.packetsLost+"",frameReceived:n.packetsReceived+"",googJitterReceived:n.jitter+"",bytesReceived:n.bytesReceived+"",packetsReceived:n.packetsReceived+"",packetsLost:n.packetsLost+""})})})},t.getStatsRate=function(e){t.getStats(function(t){t.forEach(function(e){"outbound-rtp"===e.type&&"video"===e.mediaType&&e.googFramesEncoded&&(e.googFrameRateSent=((e.googFramesEncoded-l)/3).toString(),l=e.googFramesEncoded),"inbound-rtp"===e.type&&-1!=e.id.indexOf("55543")&&(e.googFrameRateReceived&&(e.googFrameRateReceived=((e.googFrameReceived-f)/3).toString(),f=e.googFrameReceived),e.googFrameRateDecoded&&(e.googFrameRateDecoded=((e.googFramesDecoded-p)/3).toString(),p=e.googFramesDecoded))}),e(t)})},t.getStats=function(e){var n=[];t.peerConnection.getStats().then(function(i){i.forEach(function(e){n.push(e),"outbound-rtp"===e.type&&"audio"===e.mediaType&&(r.id=e.id,r.type=e.type,r.mediaType=e.mediaType,r.bytesSent=e.bytesSent?e.bytesSent+"":"0",r.packetsSent=e.packetsSent?e.packetsSent+"":"0"),"outbound-rtp"===e.type&&"video"===e.mediaType&&(s.id=e.id,s.type=e.type,s.mediaType=e.mediaType,s.bytesSent=e.bytesSent?e.bytesSent+"":"0",s.packetsSent=e.packetsSent?e.packetsSent+"":"0",s.googPlisReceived=e.pliCount?e.pliCount+"":"0",s.googNacksReceived=e.nackCount?e.nackCount+"":"0",s.googFirsReceived=e.firCount?e.firCount+"":"0",s.googFramesEncoded=e.framesEncoded?e.framesEncoded+"":"0"),"inbound-rtp"===e.type&&-1!=e.id.indexOf("44444")&&(d.id=e.id,d.type=e.type,d.mediaType="audio",d.packetsReceived=e.packetsReceived?e.packetsReceived+"":"0",d.bytesReceived=e.bytesReceived?e.bytesReceived+"":"0",d.packetsLost=e.packetsLost?e.packetsLost+"":"0",d.packetsReceived=e.packetsReceived?e.packetsReceived+"":"0",d.googJitterReceived=e.jitter?e.jitter+"":"0"),"inbound-rtp"===e.type&&-1!=e.id.indexOf("55543")&&(c.id=e.id,c.type=e.type,c.mediaType="video",c.packetsReceived=e.packetsReceived?e.packetsReceived+"":"0",c.bytesReceived=e.bytesReceived?e.bytesReceived+"":"0",c.packetsLost=e.packetsLost?e.packetsLost+"":"0",c.googJitterBufferMs=e.jitter?e.jitter+"":"0",c.googNacksSent=e.nackCount?e.nackCount+"":"0",c.googPlisSent=e.pliCount?e.pliCount+"":"0",c.googFirsSent=e.firCount?e.firCount+"":"0"),"track"!==e.type||-1==e.id.indexOf("55543")&&!~e.trackIdentifier.indexOf("v")||(c.googFrameWidthReceived=e.frameWidth?e.frameWidth+"":"0",c.googFrameHeightReceived=e.frameHeight?e.frameHeight+"":"0",c.googFrameReceived=e.framesReceived?e.framesReceived+"":"0",c.googFramesDecoded=e.framesDecoded?e.framesDecoded+"":"0"),"track"!==e.type||-1==e.id.indexOf("44444")&&!~e.trackIdentifier.indexOf("a")||(d.audioOutputLevel=e.audioLevel+"",r.audioInputLevel=e.audioLevel+""),"candidate-pair"===e.type&&(0==e.availableIncomingBitrate?u.googAvailableSendBandwidth=e.availableOutgoingBitrate+"":u.googAvailableReceiveBandwidth=e.availableIncomingBitrate+"")});var o=[u,r,s,d,c];o.push({id:"time",startTime:t.connectedTime,timestamp:new Date}),e(o,n)}).catch(function(e){console.error(e)})},t.addTrack=function(e,n){t.peerConnection.addTrack(e,n)},t.removeTrack=function(e,n){var i=t.peerConnection.getSenders().find(function(t){return t.track==e});i.replaceTrack(null),t.peerConnection.removeTrack(i)},t.addStream=function(e){window.navigator.userAgent.indexOf("Safari")>-1&&-1===navigator.userAgent.indexOf("Chrome")?e.getTracks().forEach(function(n){return t.peerConnection.addTrack(n,e)}):t.peerConnection.addStream(e),t.markActionNeeded()},t.removeStream=function(){t.markActionNeeded()},t.close=function(){t.state="closed",t.peerConnection.close()},t.markActionNeeded=function(){t.actionNeeded=!0,t.doLater(function(){t.onstablestate()})},t.doLater=function(e){window.setTimeout(e,1)},t.onstablestate=function(){var n;if(t.actionNeeded){if("new"===t.state||"established"===t.state)e.isSubscriber&&(t.peerConnection.addTransceiver("audio",{direction:"recvonly"}),t.peerConnection.addTransceiver("video",{direction:"recvonly"})),t.peerConnection.createOffer(t.mediaConstraints).then(function(n){if(n.sdp=a(n.sdp),e.isSubscriber||(n.sdp=n.sdp.replace(/a=extmap:4 urn:3gpp:video-orientation\r\n/g,"")),n.sdp!==t.prevOffer)return t.peerConnection.setLocalDescription(n),t.state="preparing-offer",void t.markActionNeeded();o.default.debug("["+t.clientId+"]Not sending a new offer")}).catch(function(e){o.default.debug("["+t.clientId+"]peer connection create offer failed ",e)});else if("preparing-offer"===t.state){if(t.moreIceComing)return;t.prevOffer=t.peerConnection.localDescription.sdp,t.prevOffer=t.prevOffer.replace(/a=candidate:.+typ\shost.+\r\n/g,"a=candidate:2243255435 1 udp 2122194687 192.168.0.1 30000 typ host generation 0 network-id 1\r\n"),t.sendMessage("OFFER",t.prevOffer),t.state="offer-sent"}else if("offer-received"===t.state)t.peerConnection.createAnswer(function(e){if(t.peerConnection.setLocalDescription(e),t.state="offer-received-preparing-answer",t.iceStarted)t.markActionNeeded();else{var n=new Date;o.default.debug("["+t.clientId+"]"+n.getTime()+": Starting ICE in responder"),t.iceStarted=!0}},function(e){o.default.debug("["+t.clientId+"]peer connection create answer failed ",e)},t.mediaConstraints);else if("offer-received-preparing-answer"===t.state){if(t.moreIceComing)return;n=t.peerConnection.localDescription.sdp,t.sendMessage("ANSWER",n),t.state="established"}else t.error("Dazed and confused in state "+t.state+", stopping here");t.actionNeeded=!1}},t.sendOK=function(){t.sendMessage("OK")},t.sendMessage=function(e,n){var i={};i.messageType=e,i.sdp=n,"OFFER"===e?(i.offererSessionId=t.sessionId,i.answererSessionId=t.otherSessionId,i.seq=t.sequenceNumber+=1,i.tiebreaker=Math.floor(429496723*Math.random()+1)):(i.offererSessionId=t.incomingMessage.offererSessionId,i.answererSessionId=t.sessionId,i.seq=t.incomingMessage.seq),t.onsignalingmessage(JSON.stringify(i))},t._getSender=function(e){if(t.peerConnection&&t.peerConnection.getSenders){var n=t.peerConnection.getSenders().find(function(t){return t.track.kind==e});if(n)return n}return null},t.hasSender=function(e){return!!t._getSender(e)},t.replaceTrack=function(e,n,i){var o=t._getSender(e.kind);if(!o)return i("NO_SENDER_FOUND");try{o.replaceTrack(e)}catch(e){return i&&i(e)}setTimeout(function(){return n&&n()},50)},t.error=function(e){throw"Error in RoapOnJsep: "+e},t.sessionId=t.roapSessionId+=1,t.sequenceNumber=0,t.actionNeeded=!1,t.iceStarted=!1,t.moreIceComing=!0,t.iceCandidateCount=0,t.onsignalingmessage=e.callback,t.peerConnection.ontrack=function(e){t.onaddstream&&t.onaddstream(e,"ontrack")},t.peerConnection.onremovestream=function(e){t.onremovestream&&t.onremovestream(e)},t.peerConnection.oniceconnectionstatechange=function(e){"connected"===e.currentTarget.iceConnectionState&&(t.connectedTime=new Date),t.oniceconnectionstatechange&&t.oniceconnectionstatechange(e.currentTarget.iceConnectionState)},t.peerConnection.onnegotiationneeded=function(){void 0!==t.prevOffer&&t.peerConnection.createOffer().then(function(e){return e.sdp=e.sdp.replace(/a=recvonly\r\n/g,"a=inactive\r\n"),e.sdp=i(e.sdp),e.sdp=a(e.sdp),t.peerConnection.setLocalDescription(e)}).then(function(){t.onnegotiationneeded&&t.onnegotiationneeded(t.peerConnection.localDescription.sdp)}).catch(function(e){console.log("createOffer error: ",e)})},t.onaddstream=null,t.onremovestream=null,t.state="new",t.markActionNeeded(),t},w=function(){var e={addStream:function(){}};return e},D=function(e){var t={},n=(mozRTCPeerConnection,mozRTCSessionDescription),i=!1;t.uid=e.uid,t.isVideoMute=e.isVideoMute,t.isAudioMute=e.isAudioMute,t.isSubscriber=e.isSubscriber,t.clientId=e.clientId,t.pc_config={iceServers:[]},e.iceServers instanceof Array?e.iceServers.map(function(e){0===e.url.indexOf("stun:")&&t.pc_config.iceServers.push({url:e.url})}):(e.stunServerUrl&&(e.stunServerUrl instanceof Array?e.stunServerUrl.map(function(e){"string"==typeof e&&""!==e&&t.pc_config.iceServers.push({url:e})}):"string"==typeof e.stunServerUrl&&""!==e.stunServerUrl&&t.pc_config.iceServers.push({url:e.stunServerUrl})),e.turnServer&&"string"==typeof e.turnServer.url&&""!==e.turnServer.url&&(t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:"turn:"+e.turnServer.url+":"+e.turnServer.udpport+"?transport=udp"}),"string"==typeof e.turnServer.tcpport&&""!==e.turnServer.tcpport&&t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:"turn:"+e.turnServer.url+":"+e.turnServer.tcpport+"?transport=tcp"}),!0===e.turnServer.forceturn&&(t.pc_config.iceTransportPolicy="relay"))),void 0===e.audio&&(e.audio=!0),void 0===e.video&&(e.video=!0),t.mediaConstraints={offerToReceiveAudio:e.audio,offerToReceiveVideo:e.video,mozDontOfferDataChannel:!0},t.roapSessionId=103,t.peerConnection=new h.a(t.pc_config),o.default.debug("["+t.clientId+']safari Created RTCPeerConnnection with config "'+JSON.stringify(t.pc_config)+'".'),t.peerConnection.onicecandidate=function(e){var n,i,a,r;i=(n=t.peerConnection.localDescription.sdp).match(/a=candidate:.+typ\ssrflx.+\r\n/),a=n.match(/a=candidate:.+typ\shost.+\r\n/),r=n.match(/a=candidate:.+typ\srelay.+\r\n/),0===t.iceCandidateCount&&(t.timeout=setTimeout(function(){t.moreIceComing&&(t.moreIceComing=!1,t.markActionNeeded())},1e3)),null===i&&null===a&&null===r||void 0!==t.ice||(o.default.debug("["+t.clientId+"]srflx candidate : "+i+" relay candidate: "+r+" host candidate : "+a),clearTimeout(t.timeout),t.ice=0,t.moreIceComing=!1,t.markActionNeeded()),t.iceCandidateCount=t.iceCandidateCount+1},t.checkMLineReverseInSDP=function(e){return!(!~e.indexOf("m=audio")||!~e.indexOf("m=video"))&&e.indexOf("m=audio")>e.indexOf("m=video")},t.reverseMLineInSDP=function(e){var t=e.split("m=audio"),n=t[1].split("m=video"),i="m=video"+n[1],o="m=audio"+n[0];return e=t[0]+i+o},t.processSignalingMessage=function(e){var i,a=JSON.parse(e);t.incomingMessage=a,"new"===t.state?"OFFER"===a.messageType?(a.sdp=u(a.sdp),i={sdp:a.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e.name)}),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+a.messageType+" in state "+t.state):"offer-sent"===t.state?"ANSWER"===a.messageType?(a.sdp=u(a.sdp),a.sdp=a.sdp.replace(/ generation 0/g,""),a.sdp=a.sdp.replace(/ udp /g," UDP "),-1!==a.sdp.indexOf("a=group:BUNDLE")?(a.sdp=a.sdp.replace(/a=group:BUNDLE audio video/,"a=group:BUNDLE sdparta_0 sdparta_1"),a.sdp=a.sdp.replace(/a=mid:audio/,"a=mid:sdparta_0"),a.sdp=a.sdp.replace(/a=mid:video/,"a=mid:sdparta_1")):(a.sdp=a.sdp.replace(/a=mid:audio/,"a=mid:sdparta_0"),a.sdp=a.sdp.replace(/a=mid:video/,"a=mid:sdparta_0")),i={sdp:a.sdp,type:"answer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e)}),t.sendOK(),t.state="established"):"pr-answer"===a.messageType?(i={sdp:a.sdp,type:"pr-answer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e.name)})):"offer"===a.messageType?t.error("Not written yet"):t.error("Illegal message for this state: "+a.messageType+" in state "+t.state):"established"===t.state&&("OFFER"===a.messageType?(i={sdp:a.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e.name)}),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+a.messageType+" in state "+t.state))};var a={id:"",type:"",mediaType:"opus",googCodecName:"opus",aecDivergentFilterFraction:"0",audioInputLevel:"0",bytesSent:"0",packetsSent:"0",googEchoCancellationReturnLoss:"0",googEchoCancellationReturnLossEnhancement:"0"},r={id:"",type:"",mediaType:"",googCodecName:"h264"===e.codec?"H264":"VP8",bytesSent:"0",packetsLost:"0",packetsSent:"0",googAdaptationChanges:"0",googAvgEncodeMs:"0",googEncodeUsagePercent:"0",googFirsReceived:"0",googFrameHeightSent:"0",googFrameHeightInput:"0",googFrameRateInput:"0",googFrameRateSent:"0",googFrameWidthSent:"0",googFrameWidthInput:"0",googNacksReceived:"0",googPlisReceived:"0",googRtt:"0"},s={id:"",type:"",mediaType:"",audioOutputLevel:"0",bytesReceived:"0",packetsLost:"0",packetsReceived:"0",googAccelerateRate:"0",googCurrentDelayMs:"0",googDecodingCNG:"0",googDecodingCTN:"0",googDecodingCTSG:"0",googDecodingNormal:"0",googDecodingPLC:"0",googDecodingPLCCNG:"0",googExpandRate:"0",googJitterBufferMs:"0",googJitterReceived:"0",googPreemptiveExpandRate:"0",googPreferredJitterBufferMs:"0",googSecondaryDecodedRate:"0",googSpeechExpandRate:"0"},d={id:"",type:"",mediaType:"",googTargetDelayMs:"0",packetsLost:"0",googDecodeMs:"0",googMaxDecodeMs:"0",googRenderDelayMs:"0",googFrameWidthReceived:"0",googFrameHeightReceived:"0",googFrameRateReceived:"0",googFrameRateDecoded:"0",googFrameRateOutput:"0",googJitterBufferMs:"0",googCurrentDelayMs:"0",googMinPlayoutDelayMs:"0",googNacksSent:"0",googPlisSent:"0",googFirsSent:"0",bytesReceived:"0",packetsReceived:"0",googFramesDecoded:"0"},c=0;t.getVideoRelatedStats=function(e){t.peerConnection.getStats().then(function(n){Object.keys(n).forEach(function(i){var o=n[i];if(t.isSubscriber){if("inboundrtp"===o.type&&"video"===o.mediaType){if(!t.lastReport)return void(t.lastReport=o);e&&e({browser:"firefox",mediaType:"video",peerId:t.uid,isVideoMute:t.isVideoMute,frameRateReceived:o.framerateMean+"",frameRateDecoded:o.framesDecoded-t.lastReport.framesDecoded+"",bytesReceived:o.bytesReceived+"",packetsReceived:o.packetsReceived+"",packetsLost:o.packetsLost+""}),t.lastReport=o}}else if("outboundrtp"===o.type&&"video"===o.mediaType){if(!t.lastReport)return void(t.lastReport=o);e&&e({mediaType:"video",isVideoMute:t.isVideoMute,frameRateInput:o.framerateMean+"",frameRateSent:o.framesEncoded-t.lastReport.framesEncoded+""}),t.lastReport=o}})})},t.getAudioRelatedStats=function(e){t.peerConnection.getStats().then(function(n){Object.keys(n).forEach(function(i){var o=n[i];t.isSubscriber&&"inboundrtp"===o.type&&"audio"===o.mediaType&&e&&e({browser:"firefox",mediaType:"audio",peerId:t.uid,isAudioMute:t.isAudioMute,frameDropped:o.packetsLost+"",frameReceived:o.packetsReceived+"",googJitterReceived:o.jitter+"",bytesReceived:o.bytesReceived+"",packetsReceived:o.packetsReceived+"",packetsLost:o.packetsLost+""})})})},t.getStatsRate=function(e){t.getStats(function(t){t.forEach(function(e){"inboundrtp"===e.type&&"video"===e.mediaType&&e.googFrameRateDecoded&&(e.googFrameRateDecoded=((e.googFramesDecoded-c)/3).toString(),c=e.googFramesDecoded)}),e(t)})},t.getStats=function(e){t.peerConnection.getStats().then(function(n){var i=[];Object.keys(n).forEach(function(e){var t=n[e];i.push(t),"outboundrtp"===t.type&&"video"===t.mediaType&&-1===t.id.indexOf("rtcp")&&(r.id=t.id,r.type=t.type,r.mediaType=t.mediaType,r.bytesSent=t.bytesSent?t.bytesSent+"":"0",r.packetsSent=t.packetsSent?t.packetsSent+"":"0",r.googPlisReceived=t.pliCount?t.pliCount+"":"0",r.googNacksReceived=t.nackCount?t.nackCount+"":"0",r.googFirsReceived=t.firCount?t.firCount+"":"0",r.googFrameRateSent=t.framerateMean?t.framerateMean+"":"0"),"outboundrtp"===t.type&&"audio"===t.mediaType&&-1===t.id.indexOf("rtcp")&&(a.id=t.id,a.type=t.type,a.mediaType=t.mediaType,a.bytesSent=t.bytesSent?t.bytesSent+"":"0",a.packetsSent=t.packetsSent?t.packetsSent+"":"0"),"inboundrtp"!==t.type||"audio"!==t.mediaType||t.isRemote||-1!==t.id.indexOf("rtcp")||(s.id=t.id,s.type=t.type,s.mediaType=t.mediaType,s.bytesReceived=t.bytesReceived?t.bytesReceived+"":"0",s.packetsLost=t.packetsLost?t.packetsLost+"":"0",s.packetsReceived=t.packetsReceived?t.packetsReceived+"":"0",s.googJitterReceived=t.jitter?t.jitter+"":"0"),"inboundrtp"!==t.type||"video"!==t.mediaType||t.isRemote||-1!==t.id.indexOf("rtcp")||(d.id=t.id,d.type=t.type,d.mediaType=t.mediaType,d.bytesReceived=t.bytesReceived?t.bytesReceived+"":"0",d.googFrameRateReceived=t.framerateMean?t.framerateMean+"":"0",d.googFramesDecoded=t.framesDecoded?t.framesDecoded+"":"0",d.packetsLost=t.packetsLost?t.packetsLost+"":"0",d.packetsReceived=t.packetsReceived?t.packetsReceived+"":"0",d.googJitterBufferMs=t.jitter?t.jitter+"":"0",d.googNacksSent=t.nackCount?t.nackCount+"":"0",d.googPlisSent=t.pliCount?t.pliCount+"":"0",d.googFirsSent=t.firCount?t.firCount+"":"0"),-1!==t.id.indexOf("outbound_rtcp_video")&&(r.packetsLost=t.packetsLost?t.packetsLost+"":"0")});var o=[r,a,s,d];o.push({id:"time",startTime:t.connectedTime,timestamp:new Date}),e(o,i)},function(e){o.default.error("["+t.clientId+"]"+e)})},t.addStream=function(e){i=!0,t.peerConnection.addStream(e),t.markActionNeeded()},t.removeStream=function(){t.markActionNeeded()},t.close=function(){t.state="closed",t.peerConnection.close()},t.markActionNeeded=function(){t.actionNeeded=!0,t.doLater(function(){t.onstablestate()})},t.doLater=function(e){window.setTimeout(e,1)},t.onstablestate=function(){if(t.actionNeeded){if("new"===t.state||"established"===t.state)i&&(t.mediaConstraints=void 0),t.peerConnection.createOffer(function(e){if(e.sdp=u(e.sdp),e.sdp=e.sdp.replace(/a=extmap:1 http:\/\/www.webrtc.org\/experiments\/rtp-hdrext\/abs-send-time/,"a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"),e.sdp!==t.prevOffer)return t.peerConnection.setLocalDescription(e),t.state="preparing-offer",void t.markActionNeeded();o.default.debug("["+t.clientId+"]Not sending a new offer")},function(e){o.default.debug("["+t.clientId+"]Ups! create offer failed ",e)},t.mediaConstraints);else if("preparing-offer"===t.state){if(t.moreIceComing)return;t.prevOffer=t.peerConnection.localDescription.sdp,t.prevOffer=t.prevOffer.replace(/a=candidate:.+typ\shost.+\r\n/g,"a=candidate:2243255435 1 udp 2122194687 192.168.0.1 30000 typ host generation 0 network-id 1\r\n"),t.sendMessage("OFFER",t.prevOffer),t.state="offer-sent"}else if("offer-received"===t.state)t.peerConnection.createAnswer(function(e){if(t.peerConnection.setLocalDescription(e),t.state="offer-received-preparing-answer",t.iceStarted)t.markActionNeeded();else{var n=new Date;o.default.debug("["+t.clientId+"]"+n.getTime()+": Starting ICE in responder"),t.iceStarted=!0}},function(){o.default.debug("["+t.clientId+"]Ups! Something went wrong")});else if("offer-received-preparing-answer"===t.state){if(t.moreIceComing)return;var e=t.peerConnection.localDescription.sdp;t.sendMessage("ANSWER",e),t.state="established"}else t.error("Dazed and confused in state "+t.state+", stopping here");t.actionNeeded=!1}},t.sendOK=function(){t.sendMessage("OK")},t.sendMessage=function(e,n){var i={};i.messageType=e,i.sdp=n,"OFFER"===e?(i.offererSessionId=t.sessionId,i.answererSessionId=t.otherSessionId,i.seq=t.sequenceNumber+=1,i.tiebreaker=Math.floor(429496723*Math.random()+1)):(i.offererSessionId=t.incomingMessage.offererSessionId,i.answererSessionId=t.sessionId,i.seq=t.incomingMessage.seq),t.onsignalingmessage(JSON.stringify(i))},t._getSender=function(e){if(t.peerConnection&&t.peerConnection.getSenders){var n=t.peerConnection.getSenders().find(function(t){return t.track.kind==e});if(n)return n}return null},t.hasSender=function(e){return!!t._getSender(e)},t.replaceTrack=function(e,n,i){var o=t._getSender(e.kind);if(!o)return i("NO_SENDER_FOUND");try{o.replaceTrack(e)}catch(e){return i&&i(e)}setTimeout(function(){return n&&n()},50)},t.error=function(e){throw"Error in RoapOnJsep: "+e},t.sessionId=t.roapSessionId+=1,t.sequenceNumber=0,t.actionNeeded=!1,t.iceStarted=!1,t.moreIceComing=!0,t.iceCandidateCount=0,t.onsignalingmessage=e.callback,t.peerConnection.ontrack=function(e){t.onaddstream&&t.onaddstream(e,"ontrack")},t.peerConnection.onremovestream=function(e){t.onremovestream&&t.onremovestream(e)},t.peerConnection.oniceconnectionstatechange=function(e){"connected"===e.currentTarget.iceConnectionState&&(t.connectedTime=new Date),t.oniceconnectionstatechange&&t.oniceconnectionstatechange(e.currentTarget.iceConnectionState)};var u=function(t){var n;if(e.video&&e.maxVideoBW&&(null==(n=t.match(/m=video.*\r\n/))&&(n=t.match(/m=video.*\n/)),n&&n.length>0)){var i=n[0]+"b=TIAS:"+1e3*e.maxVideoBW+"\r\n";t=t.replace(n[0],i)}return e.audio&&e.maxAudioBW&&(null==(n=t.match(/m=audio.*\r\n/))&&(n=t.match(/m=audio.*\n/)),n&&n.length>0)&&(i=n[0]+"b=TIAS:"+1e3*e.maxAudioBW+"\r\n",t=t.replace(n[0],i)),t};return t.onaddstream=null,t.onremovestream=null,t.state="new",t.markActionNeeded(),t},k=function(e){var t={},n=(mozRTCPeerConnection,mozRTCSessionDescription),i=!1;t.uid=e.uid,t.isVideoMute=e.isVideoMute,t.isAudioMute=e.isAudioMute,t.isSubscriber=e.isSubscriber,t.clientId=e.clientId,t.pc_config={iceServers:[]},e.iceServers instanceof Array?e.iceServers.map(function(e){0===e.url.indexOf("stun:")&&t.pc_config.iceServers.push({url:e.url})}):(e.stunServerUrl&&(e.stunServerUrl instanceof Array?e.stunServerUrl.map(function(e){"string"==typeof e&&""!==e&&t.pc_config.iceServers.push({url:e})}):"string"==typeof e.stunServerUrl&&""!==e.stunServerUrl&&t.pc_config.iceServers.push({url:e.stunServerUrl})),e.turnServer&&"string"==typeof e.turnServer.url&&""!==e.turnServer.url&&(t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:"turn:"+e.turnServer.url+":"+e.turnServer.udpport+"?transport=udp"}),"string"==typeof e.turnServer.tcpport&&""!==e.turnServer.tcpport&&t.pc_config.iceServers.push({username:e.turnServer.username,credential:e.turnServer.credential,credentialType:"password",urls:"turn:"+e.turnServer.url+":"+e.turnServer.tcpport+"?transport=tcp"}),!0===e.turnServer.forceturn&&(t.pc_config.iceTransportPolicy="relay"))),void 0===e.audio&&(e.audio=!0),void 0===e.video&&(e.video=!0),t.mediaConstraints={offerToReceiveAudio:e.audio,offerToReceiveVideo:e.video,mozDontOfferDataChannel:!0},t.roapSessionId=103,t.peerConnection=new h.a(t.pc_config),o.default.debug("["+t.clientId+']safari Created RTCPeerConnnection with config "'+JSON.stringify(t.pc_config)+'".'),t.peerConnection.onicecandidate=function(e){var n,i,a,r;i=(n=t.peerConnection.localDescription.sdp).match(/a=candidate:.+typ\ssrflx.+\r\n/),a=n.match(/a=candidate:.+typ\shost.+\r\n/),r=n.match(/a=candidate:.+typ\srelay.+\r\n/),0===t.iceCandidateCount&&(t.timeout=setTimeout(function(){t.moreIceComing&&(t.moreIceComing=!1,t.markActionNeeded())},1e3)),null===i&&null===a&&null===r||void 0!==t.ice||(o.default.debug("["+t.clientId+"]srflx candidate : "+i+" relay candidate: "+r+" host candidate : "+a),clearTimeout(t.timeout),t.ice=0,t.moreIceComing=!1,t.markActionNeeded()),t.iceCandidateCount=t.iceCandidateCount+1},t.checkMLineReverseInSDP=function(e){return!(!~e.indexOf("m=audio")||!~e.indexOf("m=video"))&&e.indexOf("m=audio")>e.indexOf("m=video")},t.reverseMLineInSDP=function(e){var t=e.split("m=audio"),n=t[1].split("m=video"),i="m=video"+n[1],o="m=audio"+n[0];return e=t[0]+i+o},t.processSignalingMessage=function(e){var i,a=JSON.parse(e);t.incomingMessage=a,"new"===t.state?"OFFER"===a.messageType?(a.sdp=u(a.sdp),i={sdp:a.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e.name)}),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+a.messageType+" in state "+t.state):"offer-sent"===t.state?"ANSWER"===a.messageType?(a.sdp=u(a.sdp),a.sdp=a.sdp.replace(/ generation 0/g,""),a.sdp=a.sdp.replace(/ udp /g," UDP "),-1!==a.sdp.indexOf("a=group:BUNDLE")?(a.sdp=a.sdp.replace(/a=group:BUNDLE audio video/,"a=group:BUNDLE sdparta_0 sdparta_1"),a.sdp=a.sdp.replace(/a=mid:audio/,"a=mid:sdparta_0"),a.sdp=a.sdp.replace(/a=mid:video/,"a=mid:sdparta_1")):(a.sdp=a.sdp.replace(/a=mid:audio/,"a=mid:sdparta_0"),a.sdp=a.sdp.replace(/a=mid:video/,"a=mid:sdparta_0")),i={sdp:a.sdp,type:"answer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e)}),t.sendOK(),t.state="established"):"pr-answer"===a.messageType?(i={sdp:a.sdp,type:"pr-answer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e.name)})):"offer"===a.messageType?t.error("Not written yet"):t.error("Illegal message for this state: "+a.messageType+" in state "+t.state):"established"===t.state&&("OFFER"===a.messageType?(i={sdp:a.sdp,type:"offer"},t.peerConnection.setRemoteDescription(new n(i),function(){o.default.debug("["+t.clientId+"]setRemoteDescription succeeded")},function(e){o.default.info("["+t.clientId+"]setRemoteDescription failed: "+e.name)}),t.state="offer-received",t.markActionNeeded()):t.error("Illegal message for this state: "+a.messageType+" in state "+t.state))};var a={id:"",type:"",mediaType:"opus",googCodecName:"opus",aecDivergentFilterFraction:"0",audioInputLevel:"0",bytesSent:"0",packetsSent:"0",googEchoCancellationReturnLoss:"0",googEchoCancellationReturnLossEnhancement:"0"},r={id:"",type:"",mediaType:"",googCodecName:"h264"===e.codec?"H264":"VP8",bytesSent:"0",packetsLost:"0",packetsSent:"0",googAdaptationChanges:"0",googAvgEncodeMs:"0",googEncodeUsagePercent:"0",googFirsReceived:"0",googFrameHeightSent:"0",googFrameHeightInput:"0",googFrameRateInput:"0",googFrameRateSent:"0",googFrameWidthSent:"0",googFrameWidthInput:"0",googNacksReceived:"0",googPlisReceived:"0",googRtt:"0"},s={id:"",type:"",mediaType:"",audioOutputLevel:"0",bytesReceived:"0",packetsLost:"0",packetsReceived:"0",googAccelerateRate:"0",googCurrentDelayMs:"0",googDecodingCNG:"0",googDecodingCTN:"0",googDecodingCTSG:"0",googDecodingNormal:"0",googDecodingPLC:"0",googDecodingPLCCNG:"0",googExpandRate:"0",googJitterBufferMs:"0",googJitterReceived:"0",googPreemptiveExpandRate:"0",googPreferredJitterBufferMs:"0",googSecondaryDecodedRate:"0",googSpeechExpandRate:"0"},d={id:"",type:"",mediaType:"",googTargetDelayMs:"0",packetsLost:"0",googDecodeMs:"0",googMaxDecodeMs:"0",googRenderDelayMs:"0",googFrameWidthReceived:"0",googFrameHeightReceived:"0",googFrameRateReceived:"0",googFrameRateDecoded:"0",googFrameRateOutput:"0",googJitterBufferMs:"0",googCurrentDelayMs:"0",googMinPlayoutDelayMs:"0",googNacksSent:"0",googPlisSent:"0",googFirsSent:"0",bytesReceived:"0",packetsReceived:"0",googFramesDecoded:"0"},c=0;t.getVideoRelatedStats=function(e){t.peerConnection.getStats().then(function(n){var i=!0,o=!1,a=void 0;try{for(var r,s=n.values()[Symbol.iterator]();!(i=(r=s.next()).done);i=!0){var d=r.value;if(t.isSubscriber){if(("inbound-rtp"===d.type||"inboundrtp"===d.type)&&"video"===d.mediaType){if(!t.lastReport)return void(t.lastReport=d);e&&e({browser:"firefox",mediaType:"video",peerId:t.uid,isVideoMute:t.isVideoMute,frameRateReceived:d.framerateMean+"",frameRateDecoded:d.framesDecoded-t.lastReport.framesDecoded+"",bytesReceived:d.bytesReceived+"",packetsReceived:d.packetsReceived+"",packetsLost:d.packetsLost+""}),t.lastReport=d}}else if(("outbound-rtp"===d.type||"outboundrtp"===d.type)&&"video"===d.mediaType){if(!t.lastReport)return void(t.lastReport=d);e&&e({mediaType:"video",isVideoMute:t.isVideoMute,frameRateInput:d.framerateMean+"",frameRateSent:d.framesEncoded-t.lastReport.framesEncoded+""}),t.lastReport=d}}}catch(e){o=!0,a=e}finally{try{i||null==s.return||s.return()}finally{if(o)throw a}}})},t.getAudioRelatedStats=function(e){t.peerConnection.getStats().then(function(n){var i=!0,o=!1,a=void 0;try{for(var r,s=n.values()[Symbol.iterator]();!(i=(r=s.next()).done);i=!0){var d=r.value;t.isSubscriber&&("inbound-rtp"!==d.type&&"inboundrtp"!==d.type||"audio"!==d.mediaType||e&&e({browser:"firefox",mediaType:"audio",peerId:t.uid,isAudioMute:t.isAudioMute,frameDropped:d.packetsLost+"",frameReceived:d.packetsReceived+"",googJitterReceived:d.jitter+"",bytesReceived:d.bytesReceived+"",packetsReceived:d.packetsReceived+"",packetsLost:d.packetsLost+""}))}}catch(e){o=!0,a=e}finally{try{i||null==s.return||s.return()}finally{if(o)throw a}}})},t.getStatsRate=function(e){t.getStats(function(t){t.forEach(function(e){"inbound-rtp"!==e.type&&"inboundrtp"!==e.type||"video"!==e.mediaType||e.googFrameRateDecoded&&(e.googFrameRateDecoded=((e.googFramesDecoded-c)/3).toString(),c=e.googFramesDecoded)}),e(t)})},t.getStats=function(e){t.peerConnection.getStats().then(function(n){var i=[],o=!0,c=!1,u=void 0;try{for(var l,p=n.values()[Symbol.iterator]();!(o=(l=p.next()).done);o=!0){var f=l.value;i.push(f),"outbound-rtp"!==f.type&&"outboundrtp"!==f.type||"video"!==f.mediaType||-1!==f.id.indexOf("rtcp")||(r.id=f.id,r.type=f.type,r.mediaType=f.mediaType,r.bytesSent=f.bytesSent?f.bytesSent+"":"0",r.packetsSent=f.packetsSent?f.packetsSent+"":"0",r.googPlisReceived=f.pliCount?f.pliCount+"":"0",r.googNacksReceived=f.nackCount?f.nackCount+"":"0",r.googFirsReceived=f.firCount?f.firCount+"":"0",r.googFrameRateSent=f.framerateMean?f.framerateMean+"":"0"),"outbound-rtp"!==f.type&&"outboundrtp"!==f.type||"audio"!==f.mediaType||-1!==f.id.indexOf("rtcp")||(a.id=f.id,a.type=f.type,a.mediaType=f.mediaType,a.bytesSent=f.bytesSent?f.bytesSent+"":"0",a.packetsSent=f.packetsSent?f.packetsSent+"":"0"),"inbound-rtp"!==f.type&&"inboundrtp"!==f.type||"audio"!==f.mediaType||f.isRemote||-1!==f.id.indexOf("rtcp")||(s.id=f.id,s.type=f.type,s.mediaType=f.mediaType,s.bytesReceived=f.bytesReceived?f.bytesReceived+"":"0",s.packetsLost=f.packetsLost?f.packetsLost+"":"0",s.packetsReceived=f.packetsReceived?f.packetsReceived+"":"0",s.googJitterReceived=f.jitter?f.jitter+"":"0"),"inbound-rtp"!==f.type&&"inboundrtp"!==f.type||"video"!==f.mediaType||f.isRemote||-1!==f.id.indexOf("rtcp")||(d.id=f.id,d.type=f.type,d.mediaType=f.mediaType,d.bytesReceived=f.bytesReceived?f.bytesReceived+"":"0",d.googFrameRateReceived=f.framerateMean?f.framerateMean+"":"0",d.googFramesDecoded=f.framesDecoded?f.framesDecoded+"":"0",d.packetsLost=f.packetsLost?f.packetsLost+"":"0",d.packetsReceived=f.packetsReceived?f.packetsReceived+"":"0",d.googJitterBufferMs=f.jitter?f.jitter+"":"0",d.googNacksSent=f.nackCount?f.nackCount+"":"0",d.googPlisSent=f.pliCount?f.pliCount+"":"0",d.googFirsSent=f.firCount?f.firCount+"":"0"),-1!==f.id.indexOf("outbound_rtcp_video")&&(r.packetsLost=f.packetsLost?f.packetsLost+"":"0")}}catch(e){c=!0,u=e}finally{try{o||null==p.return||p.return()}finally{if(c)throw u}}var m=[r,a,s,d];m.push({id:"time",startTime:t.connectedTime,timestamp:new Date}),e(m,i)},function(e){o.default.error("["+t.clientId+"]"+e)})},t.addStream=function(e){i=!0,t.peerConnection.addStream(e),t.markActionNeeded()},t.removeStream=function(){t.markActionNeeded()},t.close=function(){t.state="closed",t.peerConnection.close()},t.markActionNeeded=function(){t.actionNeeded=!0,t.doLater(function(){t.onstablestate()})},t.doLater=function(e){window.setTimeout(e,1)},t.onstablestate=function(){if(t.actionNeeded){if("new"===t.state||"established"===t.state)i&&(t.mediaConstraints=void 0),t.peerConnection.createOffer(function(e){if(e.sdp=u(e.sdp),e.sdp=e.sdp.replace(/a=extmap:1 http:\/\/www.webrtc.org\/experiments\/rtp-hdrext\/abs-send-time/,"a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"),e.sdp!==t.prevOffer)return t.peerConnection.setLocalDescription(e),t.state="preparing-offer",void t.markActionNeeded();o.default.debug("["+t.clientId+"]Not sending a new offer")},function(e){o.default.debug("["+t.clientId+"]Ups! create offer failed ",e)},t.mediaConstraints);else if("preparing-offer"===t.state){if(t.moreIceComing)return;t.prevOffer=t.peerConnection.localDescription.sdp,t.prevOffer=t.prevOffer.replace(/a=candidate:.+typ\shost.+\r\n/g,"a=candidate:2243255435 1 udp 2122194687 192.168.0.1 30000 typ host generation 0 network-id 1\r\n"),t.sendMessage("OFFER",t.prevOffer),t.state="offer-sent"}else if("offer-received"===t.state)t.peerConnection.createAnswer(function(e){if(t.peerConnection.setLocalDescription(e),t.state="offer-received-preparing-answer",t.iceStarted)t.markActionNeeded();else{var n=new Date;o.default.debug("["+t.clientId+"]"+n.getTime()+": Starting ICE in responder"),t.iceStarted=!0}},function(){o.default.debug("["+t.clientId+"]Ups! Something went wrong")});else if("offer-received-preparing-answer"===t.state){if(t.moreIceComing)return;var e=t.peerConnection.localDescription.sdp;t.sendMessage("ANSWER",e),t.state="established"}else t.error("Dazed and confused in state "+t.state+", stopping here");t.actionNeeded=!1}},t.sendOK=function(){t.sendMessage("OK")},t.sendMessage=function(e,n){var i={};i.messageType=e,i.sdp=n,"OFFER"===e?(i.offererSessionId=t.sessionId,i.answererSessionId=t.otherSessionId,i.seq=t.sequenceNumber+=1,i.tiebreaker=Math.floor(429496723*Math.random()+1)):(i.offererSessionId=t.incomingMessage.offererSessionId,i.answererSessionId=t.sessionId,i.seq=t.incomingMessage.seq),t.onsignalingmessage(JSON.stringify(i))},t._getSender=function(e){if(t.peerConnection&&t.peerConnection.getSenders){var n=t.peerConnection.getSenders().find(function(t){return t.track.kind==e});if(n)return n}return null},t.hasSender=function(e){return!!t._getSender(e)},t.replaceTrack=function(e,n,i){var o=t._getSender(e.kind);if(!o)return i("NO_SENDER_FOUND");try{o.replaceTrack(e)}catch(e){return i&&i(e)}setTimeout(function(){return n&&n()},50)},t.error=function(e){throw"Error in RoapOnJsep: "+e},t.sessionId=t.roapSessionId+=1,t.sequenceNumber=0,t.actionNeeded=!1,t.iceStarted=!1,t.moreIceComing=!0,t.iceCandidateCount=0,t.onsignalingmessage=e.callback,t.peerConnection.ontrack=function(e){t.onaddstream&&t.onaddstream(e,"ontrack")},t.peerConnection.onremovestream=function(e){t.onremovestream&&t.onremovestream(e)},t.peerConnection.oniceconnectionstatechange=function(e){"connected"===e.currentTarget.iceConnectionState&&(t.connectedTime=new Date),t.oniceconnectionstatechange&&t.oniceconnectionstatechange(e.currentTarget.iceConnectionState)};var u=function(t){var n;if(e.video&&e.maxVideoBW&&(null==(n=t.match(/m=video.*\r\n/))&&(n=t.match(/m=video.*\n/)),n&&n.length>0)){var i=n[0]+"b=TIAS:"+1e3*e.maxVideoBW+"\r\n";t=t.replace(n[0],i)}return e.audio&&e.maxAudioBW&&(null==(n=t.match(/m=audio.*\r\n/))&&(n=t.match(/m=audio.*\n/)),n&&n.length>0)&&(i=n[0]+"b=TIAS:"+1e3*e.maxAudioBW+"\r\n",t=t.replace(n[0],i)),t};return t.onaddstream=null,t.onremovestream=null,t.state="new",t.markActionNeeded(),t},M=null,P=function(){try{M=window.require("electron")}catch(e){}return M},L=function(e){var t=a.b.reportApiInvoke(null,{callback:e,name:"getScreenSources",options:arguments,tag:"tracer"}),n=P();if(!n)return t&&t("electron is null");n.desktopCapturer.getSources({types:["window","screen"]},function(e,n){if(e)return t&&t(e);t&&t(null,n)})},x=function(e,t,n){var i=t.attributes.width;t={audio:!1,video:{mandatory:{chromeMediaSource:"desktop",chromeMediaSourceId:e,maxHeight:t.attributes.height,maxWidth:i,maxFrameRate:t.attributes.maxFr,minFrameRate:t.attributes.minFr}}};navigator.webkitGetUserMedia(t,function(e){n&&n(null,e)},function(e){n&&n(e)})},V=function(){return!!P()},F=L,B=x,U=function(e,t){L(function(n,i){if(n)return t&&t(n);!function(e,t){var n=document.createElement("div");n.innerText="share screen",n.setAttribute("style","text-align: center; height: 25px; line-height: 25px; border-radius: 4px 4px 0 0; background: #D4D2D4; border-bottom:  solid 1px #B9B8B9;");var i=document.createElement("div");i.setAttribute("style","width: 100%; height: 500px; padding: 15px 25px ; box-sizing: border-box;");var o=document.createElement("div");o.innerText="Agora Web Screensharing wants to share the contents of your screen with webdemo.agorabeckon.com. Choose what you'd like to share.",o.setAttribute("style","height: 12%;");var a=document.createElement("div");a.setAttribute("style","width: 100%; height: 80%; background: #FFF; border:  solid 1px #CBCBCB; display: flex; flex-wrap: wrap; justify-content: space-around; overflow-y: scroll; padding: 0 15px; box-sizing: border-box;");var r=document.createElement("div");r.setAttribute("style","text-align: right; padding: 16px 0;");var s=document.createElement("button");s.innerHTML="cancel",s.setAttribute("style","width: 85px;"),s.onclick=function(){document.body.removeChild(d),t&&t("NotAllowedError")},r.appendChild(s),i.appendChild(o),i.appendChild(a),i.appendChild(r);var d=document.createElement("div");d.setAttribute("style","position: absolute; z-index: 99999999; top: 50%; left: 50%; width: 620px; height: 525px; background: #ECECEC; border-radius: 4px; -webkit-transform: translate(-50%,-50%); transform: translate(-50%,-50%);"),d.appendChild(n),d.appendChild(i),document.body.appendChild(d),e.map(function(e){if(e.id){var n=document.createElement("div");n.setAttribute("style","width: 30%; height: 160px; padding: 20px 0; text-align: center;box-sizing: content-box;"),n.innerHTML='<div style="height: 120px; display: table-cell; vertical-align: middle;"><img style="width: 100%; background: #333333; box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, 0.2);" src='+e.thumbnail.toDataURL()+' /></div><span style="\theight: 40px; line-height: 40px; display: inline-block; width: 70%; word-break: keep-all; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">'+e.name+"</span>",n.onclick=function(){document.body.removeChild(d),t&&t(null,e.id)},a.appendChild(n)}})}(i,function(n,i){if(n)return t&&t(n);x(i,e,t)})})},j=103,W=function(e){var t={};if(t.clientId=e.clientId,e.session_id=j+=1,"undefined"!=typeof window&&window.navigator)if(null!==window.navigator.userAgent.match("Firefox"))t.browser="mozilla",t=p.getBrowserVersion()>=66?k(e):D(e);else if("iOS"===p.getBrowserOS()||p.isSafari())o.default.debug("["+t.streamId+"]["+t.clientId+"]Safari"),(t=N(e)).browser="safari";else if(window.navigator.userAgent.indexOf("MSIE "))(t=C(e)).browser="ie";else if(window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1]>=26)(t=C(e)).browser="chrome-stable";else{if(!(window.navigator.userAgent.toLowerCase().indexOf("chrome")>=40))throw t.browser="none","WebRTC stack not available";(t=O(e)).browser="chrome-canary"}else o.default.error("["+t.streamId+"]["+t.clientId+"]Publish/subscribe video/audio streams not supported yet"),t=w(e);return t},H=function(e,t,n){var i={};if(i.config=e,i.streamId=e.streamId,navigator.getMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia,e.screen){if(V())return e.sourceId?B(e.sourceId,e,function(e,i){if(e)return n&&n();t&&t(i)}):U(e,function(e,i){if(e)return n&&n();t&&t(i)});if(o.default.debug("["+i.streamId+"]Screen access requested"),null!==window.navigator.userAgent.match("Firefox")){e.mediaSource=e.mediaSource||"screen";if(!~["screen","window","application"].indexOf(e.mediaSource))return n&&n("Invalid mediaSource, mediaSource should be one of [screen, window, application]");if(!e.attributes)return n&&n("Share screen attributes is null");var a={};a.video={frameRate:{ideal:e.attributes.mxaFr,max:e.attributes.mxaFr},height:{ideal:e.attributes.height},width:{ideal:e.attributes.width},mediaSource:e.mediaSource},navigator.getMedia(a,t,n)}else if(null!==window.navigator.userAgent.match("Chrome")){if(window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1]<34)return void n({code:"This browser does not support screen sharing"});var r="okeephmleflklcdebijnponpabbmmgeo";if(e.extensionId)o.default.debug("["+i.streamId+"]extensionId supplied, using "+e.extensionId),r=e.extensionId;else if(window.navigator.mediaDevices.getDisplayMedia){var s={video:{height:{ideal:e.attributes.height},width:{ideal:e.attributes.width},frameRate:{ideal:e.attributes.maxFr,max:e.attributes.maxFr}}};return o.default.debug("use getDisplayMedia, config.attributes:",e.attributes),o.default.debug("use getDisplayMedia, constraints:",s),window.navigator.mediaDevices.getDisplayMedia(s).then(function(e){t&&t(e)}).catch(n)}o.default.debug("["+i.streamId+"]Screen access on chrome stable, looking for extension");try{chrome.runtime.sendMessage(r,{getStream:!0},function(r){if(void 0!==r){var s=r.streamId,d=e.attributes.width,c=e.attributes.height,u=e.attributes.maxFr,l=e.attributes.minFr;a={video:{mandatory:{chromeMediaSource:"desktop",chromeMediaSourceId:s,maxHeight:c,maxWidth:d,maxFrameRate:u,minFrameRate:l}}},navigator.getMedia(a,t,n)}else{o.default.error("["+i.streamId+"]No response from Chrome Plugin. Plugin not installed properly");n({name:"PluginNotInstalledProperly",message:"No response from Chrome Plugin. Plugin not installed properly."})}})}catch(e){o.default.debug("["+i.streamId+"]AgoraRTC screensharing plugin is not accessible");return void n({code:"no_plugin_present"})}}else o.default.debug("["+i.streamId+"]This browser does not support screenSharing")}else window.navigator.userAgent.indexOf("Safari")>-1&&-1===navigator.userAgent.indexOf("Chrome")?navigator.mediaDevices.getUserMedia(e).then(t).catch(n):"undefined"!=typeof navigator&&navigator.getMedia?navigator.getMedia(e,t,n):o.default.error("["+i.streamId+"]Video/audio streams not supported yet")},G=n(7),J=function(e,t,n){if(["End2EndDelay","TransportDelay","PacketLossRate","RecvLevel","RecvBitrate","CodecType","MuteState","TotalFreezeTime","TotalPlayDuration","RecordingLevel","SendLevel","SamplingRate","SendBitrate","CodecType","MuteState","End2EndDelay","TransportDelay","PacketLossRate","RecvBitrate","RecvResolutionWidth","RecvResolutionHeight","RenderResolutionHeight","RenderResolutionWidth","RenderFrameRate","TotalFreezeTime","TotalPlayDuration","TargetSendBitrate","SendFrameRate","SendFrameRate","SendBitrate","SendResolutionWidth","SendResolutionHeight","CaptureResolutionHeight","CaptureResolutionWidth","EncodeDelay","MuteState","TotalFreezeTime","TotalDuration","CaptureFrameRate","RTT","OutgoingAvailableBandwidth","Duration","UserCount","SendBytes","RecvBytes","SendBitrate","RecvBitrate","accessDelay","audioSendBytes","audioSendPackets","videoSendBytes","videoSendPackets","videoSendPacketsLost","videoSendFrameRate","audioSendPacketsLost","videoSendResolutionWidth","videoSendResolutionHeight","accessDelay","audioReceiveBytes","audioReceivePackets","audioReceivePacketsLost","videoReceiveBytes","videoReceivePackets","videoReceivePacketsLost","videoReceiveFrameRate","videoReceiveDecodeFrameRate","videoReceiveResolutionWidth","videoReceiveResolutionHeight","endToEndDelay","videoReceiveDelay","audioReceiveDelay","FirstFrameTime","VideoFreezeRate","AudioFreezeRate","RenderResolutionWidth","RenderResolutionHeight"].indexOf(t)>-1&&("string"==typeof n||isFinite(n)))return e[t]=""+n},z=n(10),K=new function(){var e=r();return e.devicesHistory={},e.states={UNINIT:"UNINIT",INITING:"INITING",INITED:"INITED"},e.state=e.states.UNINIT,e.deviceStates={ACTIVE:"ACTIVE",INACTIVE:"INACTIVE"},e.deviceReloadTimer=null,e._init=function(t,n){e.state=e.states.INITING,e.devicesHistory={},e._reloadDevicesInfo(function(){e.state=e.states.INITED,e.dispatchEvent({type:"inited"}),t&&t()},function(t){o.default.warning("Device Detection functionality cannot start properly."),e.state=e.states.UNINIT,n&&n(t)})},e._enumerateDevices=function(e,t){if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return o.default.warning("enumerateDevices() not supported."),t&&t("enumerateDevices() not supported");navigator.mediaDevices.enumerateDevices().then(function(t){e&&setTimeout(function(){e(t)},0)}).catch(function(e){t&&t(e)})},e._reloadDevicesInfo=function(t,n){var i=[];e._enumerateDevices(function(n){var a=Date.now();for(var r in n.forEach(function(t){var n=e.devicesHistory[t.deviceId];if((n?n.state:e.deviceStates.INACTIVE)!=e.deviceStates.ACTIVE){var o=n||{initAt:a};o.device=t,o.state=e.deviceStates.ACTIVE,i.push(o),e.devicesHistory[t.deviceId]=o}e.devicesHistory[t.deviceId].lastReloadAt=a}),e.devicesHistory){var s=e.devicesHistory[r];s&&s.state==e.deviceStates.ACTIVE&&s.lastReloadAt!==a&&(s.state=e.deviceStates.INACTIVE,i.push(s)),s.lastReloadAt=a}e.state==e.states.INITED&&i.forEach(function(t){var n=I()({},t);switch(t.device.kind){case"audioinput":n.type="recordingDeviceChanged";break;case"audiooutput":n.type="playoutDeviceChanged";break;case"videoinput":n.type="cameraChanged";break;default:o.default.warning("Unknown device change",n),n.type="unknownDeviceChanged"}e.dispatchEvent(n)}),t&&t()},n)},e.getDeviceById=function(t,n,i){e.getDevices(function(e){for(var o=0;o<e.length;o++){var a=e[o];if(a&&a.deviceId===t)return n&&n(a)}return i&&i()})},e.searchDeviceNameById=function(t){var n=e.devicesHistory[t];return n?n.device.label||n.device.deviceId:null},e.getDevices=function(t,n){e._enumerateDevices(t,function(e){n&&n(e.name+": "+e.message)})},e.getVideoCameraIdByLabel=function(t,n,i){e.getCameras(function(e){var o=!0,a=!1,r=void 0;try{for(var s,d=e[Symbol.iterator]();!(o=(s=d.next()).done);o=!0){var c=s.value;if(c.label===t)return n&&n(c.deviceId)}}catch(e){a=!0,r=e}finally{try{o||null==d.return||d.return()}finally{if(a)throw r}}return i&&i(A.NOT_FIND_DEVICE_BY_LABEL)},i)},e.getRecordingDevices=function(t,n){return e._enumerateDevices(function(e){var n=e.filter(function(e){return"audioinput"==e.kind});t&&t(n)},function(e){n&&n(e)})},e.getPlayoutDevices=function(t,n){return e._enumerateDevices(function(e){var n=e.filter(function(e){return"audiooutput"==e.kind});t&&t(n)},function(e){n&&n(e)})},e.getCameras=function(t,n){return e._enumerateDevices(function(e){var n=e.filter(function(e){return"videoinput"==e.kind});t&&t(n)},function(e){n&&n(e)})},e._init(function(){navigator.mediaDevices&&navigator.mediaDevices.addEventListener&&navigator.mediaDevices.addEventListener("devicechange",function(){e._reloadDevicesInfo()}),e.deviceReloadTimer=setInterval(e._reloadDevicesInfo,5e3)}),e},Y=function(e,t,n){for(var i=0;i<n.length;i++)if(e===n[i])return!0;throw new Error("".concat(t," can only be set as ").concat(JSON.stringify(n)))},q=function(e,t){if(!e)throw new Error("Invalid param: ".concat(t||"param"," cannot be empty"));if("object"!==v()(e))throw new Error("".concat(t||"This paramter"," is of the object type"));return!0},Q=function(e,t,n,i,o){if(re(n)&&(n=1),i=i||255,re(o)&&(o=!0),re(e))throw new Error("".concat(t||"param"," cannot be empty"));if(!Z(e,n,i,o))throw new Error("Invalid ".concat(t||"string param",": Length of the string: [").concat(n,",").concat(i,"].").concat(o?" ASCII characters only.":""))},X=function(e,t,n,i){if(re(n)&&(n=1),i=i||1e4,re(e))throw new Error("".concat(t||"param"," cannot be empty"));if(!ee(e,n,i))throw new Error("Invalid ".concat(t||"number param",": The value range is [").concat(n,",").concat(i,"]. integer only"))},$=function(e,t){if(re(e))throw new Error("".concat(t||"param"," cannot be empty"));if(!te(e))throw new Error("Invalid ".concat(t||"boolean param",": The value is of the boolean type."))},Z=function(e,t,n,i){return t||(t=0),n||(n=Number.MAX_SAFE_INTEGER),re(i)&&(i=!0),ae(e)&&(!i||ie(e))&&e.length>=t&&e.length<=n},ee=function(e,t,n){return oe(e)&&e>=t&&e<=n},te=function(e){return"boolean"==typeof e},ne=function(e){return Z(e,1,2047)},ie=function(e){if("string"==typeof e){for(var t=0;t<e.length;t++){var n=e.charCodeAt(t);if(n<0||n>255)return!1}return!0}},oe=function(e){return"number"==typeof e&&e%1==0},ae=function(e){return"string"==typeof e},re=function(e){return null==e};var se=function(e){var t=r();if(t.params=I()({},e),t.stream=e.stream,t.url=e.url,t.onClose=void 0,t.local=!1,t.videoSource=e.videoSource,t.audioSource=e.audioSource,t.video=!!e.video,t.audio=!!e.audio,t.screen=!!e.screen,t.screenAttributes={width:1920,height:1080,maxFr:5,minFr:1},t.videoSize=e.videoSize,t.player=void 0,t.audioLevelHelper=null,e.attributes=e.attributes||{},t.attributes=e.attributes,t.microphoneId=e.microphoneId,t.cameraId=e.cameraId,t.inSwitchDevice=!1,t.userMuteVideo=!1,t.userMuteAudio=!1,t.peerMuteVideo=!1,t.peerMuteAudio=!1,t.lowStream=null,t.videoWidth=0,t.videoHeight=0,t.streamId=null,t.streamId=e.streamID,t.userId=null,t.mirror=!1!==e.mirror,t.DTX=e.audioProcessing&&e.audioProcessing.DTX,t.audioProcessing=e.audioProcessing,t.highQuality=!1,t.stereo=!1,t.speech=!1,t.screen||delete t.screen,!(void 0===t.videoSize||t.videoSize instanceof Array&&4===t.videoSize.length))throw Error("Invalid Video Size");function n(e,t){return{width:{ideal:e},height:{ideal:t}}}t.videoSize=[640,480,640,480],void 0!==e.local&&!0!==e.local||(t.local=!0),t.initialized=!t.local,function(e){e.audioMixing={audioContextInited:!1,defaultVolume:100,inEarMonitoring:"FILE",sounds:{},states:{IDLE:"IDLE",STARTING:"STARTING",BUSY:"BUSY",PAUSED:"PAUSED"},inEarMonitoringModes:{NONE:"NONE",FILE:"FILE",MICROPHONE:"MOCROPHONE",ALL:"ALL"},ctx:null,mediaStreamSource:null,mediaStreamDest:null,buffer:{}},e._initSoundIfNotExists=function(t,n){e.audioMixing.sounds[t]||(e.audioMixing.sounds[t]={soundId:t,state:"IDLE",muted:e.userMuteAudio,filePath:n,volume:e.audioMixing.defaultVolume,startAt:null,startOffset:null,pauseAt:null,pauseOffset:null,resumeAt:null,resumeOffset:null,stopAt:null,options:null,source:null})},e._initSoundIfNotExists(-1),e.loadAudioBuffer=function(t,n,i){var r=a.b.reportApiInvoke(e.sid,{callback:i,name:"Stream.loadAudioBuffer",options:arguments,tag:"tracer"});Q(n,"url",1,1024,!1),Q(t,"id",1,1024,!1);var s=new XMLHttpRequest;s.open("GET",n,!0),s.responseType="arraybuffer",s.onload=function(){if(s.status>400){var n=s.statusText;return o.default.error("[".concat(e.streamId,"] loadAudioBuffer Failed: ")+n),r(n)}var i=s.response;e.audioMixing.audioContextInited||e._initAudioContext(),e.audioMixing.ctx.decodeAudioData(i,function(n){e.audioMixing.buffer[t]=n,r(null)},function(t){o.default.error("[".concat(e.streamId,"] decodeAudioData Failed: "),t),r(t)})},s.send()},e.createAudioBufferSource=function(t){var n=a.b.reportApiInvoke(e.sid,{name:"Stream.createAudioBufferSource",options:arguments,tag:"tracer"});if(e.audioMixing.buffer[t.id]){var i=e.audioMixing.buffer[t.id],r=e.audioMixing.ctx.createBufferSource();r.buffer=i;var s=e.audioMixing.ctx.createGain();if(r.connect(s),s.connect(e.audioMixing.mediaStreamDest),r.gainNode=s,t.loop)r.loop=!0,r.start(0,t.playTime/1e3);else if(t.cycle>1)if(Object(p.isChrome)()){r.loop=!0;var d=t.cycle*i.duration*1e3-(t.playTime||0);r.start(0,t.playTime/1e3,d/1e3)}else o.default.warning("[".concat(e.streamId,"] Cycle Param is ignored by current browser")),r.start(0,t.playTime/1e3);else r.start(0,t.playTime/1e3);var c=e.audioMixing.sounds[t.soundId];return c.source=r,e._flushAudioMixingMuteStatus(),r.addEventListener("ended",function(){r===c.source&&e.dispatchEvent({type:"audioSourceEnded",soundId:t.soundId,source:r,sound:c})}),n(),r}return o.default.error("[".concat(e.streamId,"] "),"AUDIOBUFFER_NOT_FOUND",t.id),n(!1),!1},e.on("audioSourceEnded",function(t){t.source;var n=t.sound;n&&n.state===e.audioMixing.states.BUSY&&!n.pauseAt&&(n.state=e.audioMixing.states.IDLE,n.startAt=null,n.startOffset=null,n.resumeAt=null,n.resumeOffset=null,e.audioMixing.mediaStreamSource.connect(e.audioMixing.mediaStreamDest))}),e.clearAudioBufferSource=function(){e.audioBufferSource.forEach(function(e){e.stop()})},e._isSoundExists=function(t){return!!e.audioMixing.sounds[t.soundId]||(o.default.error("SoundId not exists. #".concat(t.soundId)),!1)},e._initAudioContext=function(){if(e.audioMixing.audioContextInited)throw new Error("Failed to init audio context. Already inited");if(!e.stream)throw new Error("Failed to init audio context. Local Stream not initialized");e.audioMixing.ctx=Object(z.a)(),e.audioMixing.mediaStreamSource=e.audioMixing.ctx.createMediaStreamSource(e.stream),e.audioMixing.mediaStreamDest=e.audioMixing.ctx.createMediaStreamDestination(),e.audioMixing.mediaStreamSource.connect(e.audioMixing.mediaStreamDest);var t=e.stream.getVideoTracks()[0];if(t&&e.audioMixing.mediaStreamDest.stream.addTrack(t),e._isAudioMuted()?(e._unmuteAudio(),e.stream=e.audioMixing.mediaStreamDest.stream,e._muteAudio()):e.stream=e.audioMixing.mediaStreamDest.stream,e.audioLevelHelper=null,e.pc&&e.pc.peerConnection&&e.pc.peerConnection){var n=(e.pc.peerConnection&&e.pc.peerConnection.getSenders()).find(function(e){return e&&e.track&&"audio"==e.track.kind}),i=e.audioMixing.mediaStreamDest.stream.getAudioTracks()[0];n&&n.replaceTrack&&i&&n.replaceTrack(i)}e.audioMixing.audioContextInited=!0},e._reloadInEarMonitoringMode=function(t){if(t){if(!e.audioMixing.inEarMonitoringModes[t])return o.default.error("[".concat(e.streamId,"] Invalid InEarMonitoringMode ").concat(t));e.audioMixing.inEarMonitoring=t}switch(e.audioMixing.audioContextInited||e._initAudioContext(),e.audioMixing.inEarMonitoring){case e.audioMixing.inEarMonitoringModes.FILE:e.audioMixing.mediaStreamSource.connectedToDestination&&(e.audioMixing.mediaStreamSource.disconnect(e.audioMixing.ctx.destination),e.audioMixing.mediaStreamSource.connectedToDestination=!1);case e.audioMixing.inEarMonitoringModes.ALL:for(var n in e.audioMixing.sounds){var i=e.audioMixing.sounds[n];i&&i.source&&!i.source.connectedToDestination&&(i.source.gainNode.connect(e.audioMixing.ctx.destination),i.source.connectedToDestination=!0)}}switch(e.audioMixing.inEarMonitoring){case e.audioMixing.inEarMonitoringModes.MICROPHONE:e.audioMixing.source.forEach(function(t){t.connectedToDestination&&(t.gainNode.disconnect(e.audioMixing.ctx.destination),t.connectedToDestination=!1)});case e.audioMixing.inEarMonitoringModes.ALL:e.audioMixing.mediaStreamSource.connectedToDestination||(e.audioMixing.mediaStreamSource.connect(e.audioMixing.ctx.destination),e.audioMixing.mediaStreamSource.connectedToDestination=!0)}},e._startAudioMixingBufferSource=function(t){e.audioMixing.audioContextInited||e._initAudioContext();var n={soundId:t.soundId,id:t.filePath,loop:t.loop,cycle:t.cycle,playTime:t.playTime||0},i=t.replace,o=e.createAudioBufferSource(n);return o.sound=e.audioMixing.sounds[t.soundId],o?(o.addEventListener("ended",e._audioMixingFinishedListener,{once:!0}),e._reloadInEarMonitoringMode(),i&&e.audioMixing.mediaStreamSource.disconnect(e.audioMixing.mediaStreamDest),o):null},e._stopAudioMixingBufferSource=function(t){var n=e.audioMixing.sounds[t.soundId].source;return n?(n.removeEventListener("ended",e._audioMixingFinishedListener),e.audioMixing.mediaStreamSource.connect(e.audioMixing.mediaStreamDest),n.stop(),n):null},e._flushAudioMixingMuteStatus=function(t){for(var n in e.audioMixing.sounds){var i=e.audioMixing.sounds[n];i&&(void 0!==t&&(i.muted=!!t),i.source&&(i.muted?i.source.gainNode.gain.value=0:i.source.gainNode.gain.value=i.volume/100))}},e._handleAudioMixingInvalidStateError=function(t,n,i){var a=e.audioMixing.sounds[n.soundId],r=-1===n.soundId?"INVALID_AUDIO_MIXING_STATE":"INVALID_PLAY_EFFECT_STATE";o.default.error("[".concat(e.streamId,"] Cannot ").concat(t,": ").concat(r,", state is ").concat(a.state)),i&&i(r)},e._handleAudioMixingNoSourceError=function(t,n,i){e.audioMixing.sounds[n.soundId].state=e.audioMixing.states.IDLE;var a=-1===n.soundId?"NO_AUDIO_MIXING_SOURCE":"NO_EFFECT_SOURCE";o.default.error("[".concat(e.streamId,"] Cannot ").concat(t,": ").concat(a)),i&&i(a)},e._getOneEffectStates=function(t){var n=e.audioMixing.sounds[t.soundId];return function(){return n?{state:n.state,startAt:n.startAt,resumeAt:n.resumeAt,pauseOffset:n.pauseOffset,pauseAt:n.pauseAt,resumeOffset:n.resumeOffset,stopAt:n.stopAt,duration:e._getOneEffectDuration(t),position:e._getOneEffectCurrentPosition(t)}:{}}},e._audioMixingFinishedListener=function(){var t=this.sound;t.state===e.audioMixing.states.IDLE&&e.audioMixing.buffer[t.options.filePath]&&!t.options.cacheResource&&(o.default.debug("Recycled buffer ".concat(t.options.filePath)),delete e.audioMixing.buffer[t.options.filePath]),-1===t.soundId&&e.dispatchEvent({type:"audioMixingFinished"})},e._playOneEffect=function(t,n){q(t,"options");var i=t.soundId,a=(t.filePath,t.cacheResource);if(t.cycle,t.loop,t.playTime,t.replace,Object(p.isSafari)()&&Object(p.getBrowserVersion)()<12){var r="BROWSER_NOT_SUPPORT";return o.default.error("[".concat(e.streamId,"] Cannot _playOneEffect: "),r),n(r)}e.audioMixing.audioContextInited||e._initAudioContext(),e._initSoundIfNotExists(i);var s=e.audioMixing.sounds[i];if(s.state===e.audioMixing.states.IDLE){if(void 0!==t.cycle&&!t.cycle>0)return r="Invalid Parmeter cycle: "+t.cycle,o.default.error("[".concat(e.streamId,"] ").concat(i),r),n(r);if(re(a)&&(t.cacheResource=!0),s.state=e.audioMixing.states.STARTING,s.options=t,e.audioMixing.buffer[t.filePath]){var d=e._startAudioMixingBufferSource(t);if(d)return s.source=d,s.startAt=Date.now(),s.resumeAt=null,s.pauseOffset=null,s.pauseAt=null,s.resumeOffset=null,s.stopAt=null,s.startOffset=t.playTime||0,s.state=e.audioMixing.states.BUSY,e._flushAudioMixingMuteStatus(),n(null);s.state=e.audioMixing.states.IDLE;var c="CREATE_BUFFERSOURCE_FAILED";if(n)return n(c);o.default.error("[".concat(e.streamId,"] "),c)}else e.loadAudioBuffer(t.filePath,t.filePath,function(i){if(i)s.state=e.audioMixing.states.IDLE,n?n(i):o.default.error("[".concat(e.streamId,"] "),i);else{var a=e._startAudioMixingBufferSource(t);if(a)return s.source=a,s.startAt=Date.now(),s.resumeAt=null,s.pauseOffset=null,s.pauseAt=null,s.resumeOffset=null,s.stopAt=null,s.startOffset=t.playTime||0,s.state=e.audioMixing.states.BUSY,e._flushAudioMixingMuteStatus(),n(null);if(s.state=e.audioMixing.states.IDLE,i="CREATE_BUFFERSOURCE_FAILED",n)return n(i);o.default.error("[".concat(e.streamId,"] "),i)}})}else e._handleAudioMixingInvalidStateError("_playEffect",t,n)},e._stopOneEffect=function(t,n){var i=e.audioMixing.sounds[t.soundId];return e._isSoundExists(t)?i.state===e.audioMixing.states.BUSY||i.state===e.audioMixing.states.PAUSED?(e._stopAudioMixingBufferSource(t),i.stopAt=Date.now(),i.state=e.audioMixing.states.IDLE,e.audioMixing.buffer[i.options.filePath]&&!i.options.cacheResource&&(o.default.debug("Recycled buffer ".concat(i.options.filePath)),delete e.audioMixing.buffer[i.options.filePath]),void(n&&n(null))):void e._handleAudioMixingInvalidStateError("_stopOneEffect",t,n):n("SOUND_NOT_EXISTS")},e._pauseOneEffect=function(t,n){var i=e.audioMixing.sounds[t.soundId];if(i.state===e.audioMixing.states.BUSY)return e._stopAudioMixingBufferSource(t)?(i.pauseAt=Date.now(),i.state=e.audioMixing.states.PAUSED,i.resumeAt?i.pauseOffset=i.pauseAt-i.resumeAt+i.resumeOffset:i.pauseOffset=i.pauseAt-i.startAt+i.startOffset,n&&n(null)):void e._handleAudioMixingNoSourceError("_pauseOneEffect",t,n);e._handleAudioMixingInvalidStateError("_pauseOneEffect",t,n)},e._resumeOneEffect=function(t,n){var i=e.audioMixing.sounds[t.soundId];if(i.state===e.audioMixing.states.PAUSED){var a={soundId:t.soundId,filePath:i.options.filePath,cycle:i.options.cycle,loop:i.options.loop,playTime:i.pauseOffset,replace:i.options.replace},r=e._startAudioMixingBufferSource(a);if(!r){var s="CREATE_BUFFERSOURCE_FAILED";return n(s),void o.default.error("[".concat(e.streamId,"] "),s)}i.source=r,i.resumeAt=Date.now(),i.resumeOffset=i.pauseOffset,i.state=e.audioMixing.states.BUSY,i.pauseAt=null,i.pauseOffset=null,n(null)}else e._handleAudioMixingInvalidStateError("_resumeOneEffect",t,n)},e._getOneEffectDuration=function(t){var n=e.audioMixing.sounds[t.soundId];return n.options&&n.options.filePath&&e.audioMixing.buffer[n.options.filePath]?1e3*e.audioMixing.buffer[n.options.filePath].duration:null},e._getOneEffectCurrentPosition=function(t,n){var i=e.audioMixing.sounds[t.soundId];return i.state===e.audioMixing.states.PAUSED?i.pauseOffset%e._getOneEffectDuration(t):i.state===e.audioMixing.states.BUSY?(Date.now()-i.startAt+i.startOffset)%e._getOneEffectDuration(t):void(n&&e._handleAudioMixingInvalidStateError("_getOneEffectCurrentPosition",t))},e._setOneEffectPosition=function(t,n,i){var a=e.audioMixing.sounds[t.soundId];if(a.state===e.audioMixing.states.BUSY){if(!e._stopAudioMixingBufferSource(t))return void e._handleAudioMixingNoSourceError("_setOneEffectPosition",t,i);var r={soundId:t.soundId,filePath:a.options.filePath,loop:a.options.loop,cycle:a.options.cycle,playTime:n},s=e._startAudioMixingBufferSource(r);if(!s){var d="CREATE_BUFFERSOURCE_FAILED";return i&&i(d),void o.default.error("[".concat(e.streamId,"] "),d)}a.source=s,a.startAt=Date.now(),a.startOffset=n,a.resumeAt=null,a.resumeOffset=null,a.pauseOffset=null,a.pauseAt=null}else{if(a.state!==e.audioMixing.states.PAUSED)return void e._handleAudioMixingInvalidStateError("_setOneEffectPosition",t,i);a.pauseOffset=n}i&&i(null)},e.startAudioMixing=function(t,n){var o=a.b.reportApiInvoke(e.sid,{callback:function(t){if(t)return n&&n(t);e.dispatchEvent({type:"audioMixingPlayed"}),n&&n(null)},getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.startAudioMixing",options:t});q(t,"options");var r=t.filePath,s=t.cacheResource,d=t.cycle,c=t.loop,u=t.playTime,l=t.replace;Q(r,"filePath",1,Object(i.getParameter)("FILEPATH_LENMAX"),!1),X(u,"playTime",0,1e8),!re(d)&&X(d,"cycle"),!re(c)&&$(c,"loop"),!re(l)&&$(l,"replace"),!re(s)&&$(s,"cacheResource");var p=I()({soundId:-1},t);e._playOneEffect(p,o)},e.stopAudioMixing=function(t){var n=a.b.reportApiInvoke(e.sid,{callback:t,getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.stopAudioMixing"});e._stopOneEffect({soundId:-1},n)},e.pauseAudioMixing=function(t){var n=a.b.reportApiInvoke(e.sid,{callback:t,getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.pauseAudioMixing"});return e._pauseOneEffect({soundId:-1},n)},e.resumeAudioMixing=function(t){var n=a.b.reportApiInvoke(e.sid,{callback:function(n,i){if(n)return t&&t(n);e.dispatchEvent({type:"audioMixingPlayed"}),t&&t(null)},getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.resumeAudioMixing"});e._resumeOneEffect({soundId:-1},n)},e.adjustAudioMixingVolume=function(t){var n=a.b.reportApiInvoke(e.sid,{getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.adjustAudioMixingVolume",options:arguments,tag:"tracer"});X(t,"volume",0,100),e.audioMixing.sounds[-1].volume=t,e._flushAudioMixingMuteStatus(),n()},e.getAudioMixingDuration=function(){var t=a.b.reportApiInvoke(e.sid,{getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.getAudioMixingDuration"}),n=e._getOneEffectDuration({soundId:-1});return t(null,n),n},e.getAudioMixingCurrentPosition=function(){var t=a.b.reportApiInvoke(e.sid,{getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.getAudioMixingCurrentPosition"}),n=e._getOneEffectCurrentPosition({soundId:-1},!0);return t(null,n),n},e.setAudioMixingPosition=function(t,n){var i=a.b.reportApiInvoke(e.sid,{callback:n,options:arguments,tag:"tracer",getStates:e._getOneEffectStates({soundId:-1}),name:"Stream.setAudioMixingPosition"});X(t,"position",0,1e8),e._setOneEffectPosition({soundId:-1},t,i)},e.playEffect=function(t,n){var o=a.b.reportApiInvoke(e.sid,{callback:function(t){if(t)return n&&n(t);e.dispatchEvent({type:"effectPlayed"}),n&&n(null)},name:"Stream.playEffect",options:t});q(t,"options");var r=t.soundId,s=t.filePath,d=t.cycle;X(r,"soundId",1,1e4),Q(s,"filePath",0,Object(i.getParameter)("FILEPATH_LENMAX"),!1),!re(d)&&X(d,"cycle"),e._playOneEffect(t,o)},e.stopEffect=function(t,n){var i=a.b.reportApiInvoke(e.sid,{callback:n,getStates:e._getOneEffectStates({soundId:t}),name:"Stream.stopEffect"});X(t,"soundId",1,1e4),e._stopOneEffect({soundId:t},i)},e.stopAllEffects=function(t){var n=a.b.reportApiInvoke(e.sid,{callback:t,name:"Stream.stopAllEffect"}),i=!1,o=0,r=0,s=function(e){i||(e?(n(e),i=!0):o+=1,o===r&&(n(null),i=!0))};for(var d in e.audioMixing.sounds){var c=e.audioMixing.sounds[d];-1!==c.soundId&&(c.state!==e.audioMixing.states.BUSY&&c.state!==e.audioMixing.states.PAUSED||(r++,e._stopOneEffect({soundId:d},s)))}r||n(null)},e.preloadEffect=function(t,n,o){var r=a.b.reportApiInvoke(e.sid,{callback:o,options:arguments,tag:"tracer",name:"Stream.preloadEffect"});X(t,"soundId",1,1e4),Q(n,"filePath",1,Object(i.getParameter)("FILEPATH_LENMAX"),!1),e._initSoundIfNotExists(t,n),e.audioMixing.buffer[n]?r(null):e.loadAudioBuffer(n,n,r)},e.unloadEffect=function(t,n){var i=a.b.reportApiInvoke(e.sid,{callback:n,options:arguments,tag:"tracer",name:"Stream.unloadEffect"});X(t,"soundId",1,1e4);var r=e.audioMixing.sounds[t];if(!r){var s="SOUND_NOT_EXISTS";return o.default.error(s,t),void i(s)}var d=r.options?r.options.filePath:r.filePath;if(d)delete e.audioMixing.buffer[d],delete e.audioMixing.sounds[t],i(null);else{var c="SOUND_BUFFER_NOT_FOUND";o.default.error(c,t),i(c)}},e.pauseEffect=function(t,n){var i=a.b.reportApiInvoke(e.sid,{callback:n,options:arguments,tag:"tracer",name:"Stream.pauseEffect"});return e._pauseOneEffect({soundId:t},i)},e.pauseAllEffects=function(t){var n=a.b.reportApiInvoke(e.sid,{callback:t,name:"Stream.pauseAllEffects"}),i=!1,o=0,r=0,s=function(e){i||(e?(n(e),i=!0):o+=1,o===r&&(n(null),i=!0))};for(var d in e.audioMixing.sounds)"-1"!==d&&e.audioMixing.sounds[d].state===e.audioMixing.states.BUSY&&(r++,e._pauseOneEffect({soundId:d},s));r||n(null)},e.resumeEffect=function(t,n){X(t,"soundId",1,1e4);var i=a.b.reportApiInvoke(e.sid,{callback:n,options:arguments,tag:"tracer",name:"Stream.resumeEffect"});return e._resumeOneEffect({soundId:t},i)},e.resumeAllEffects=function(t){var n=a.b.reportApiInvoke(e.sid,{callback:t,name:"Stream.resumeAllEffects"}),i=!1,o=0,r=0,s=function(e){i||(e?(n(e),i=!0):o+=1,o===r&&(n(null),i=!0))};for(var d in e.audioMixing.sounds)"-1"!==d&&e.audioMixing.sounds[d].state===e.audioMixing.states.PAUSED&&(r++,e._resumeOneEffect({soundId:d},s));r||n(null)},e.getEffectsVolume=function(){var t=[];for(var n in e.audioMixing.sounds){var i=e.audioMixing.sounds[n];i&&"-1"!==n&&t.push({soundId:parseInt(n),volume:i.volume})}return t},e.setEffectsVolume=function(t,n){var i=a.b.reportApiInvoke(e.sid,{name:"Stream.setEffectsVolume",options:arguments,tag:"tracer",callback:n});for(var o in X(t,"volume",0,100),e.audioMixing.defaultVolume=t,e.audioMixing.sounds){var r=e.audioMixing.sounds[o];"-1"!==o&&(r.volume=t)}e._flushAudioMixingMuteStatus(),i(null)},e.setVolumeOfEffect=function(t,n,i){var o=a.b.reportApiInvoke(e.sid,{name:"Stream.setVolumeOfEffect",options:arguments,tag:"tracer",callback:i});X(t,"soundId",0,1e4),X(n,"volume",0,100),e._initSoundIfNotExists(t),e.audioMixing.sounds[t].volume=n,e._flushAudioMixingMuteStatus(),o(null)}}(t),t.on("collectStats",function(e){e.promises.push(t._getPCStats()),e.promises.push(new Promise(function(e){var n={};t.pc&&t.pc.isSubscriber?null!==window.navigator.userAgent.match("Firefox")&&(J(n,"videoReceiveResolutionHeight",t.videoHeight),J(n,"videoReceiveResolutionWidth",t.videoWidth)):t.pc&&!t.pc.isSubscriber&&((Object(p.isSafari)()||Object(p.isFireFox)())&&(J(n,"videoSendResolutionHeight",t.videoHeight),J(n,"videoSendResolutionWidth",t.videoWidth)),(Object(p.isSafari)()||Object(p.isFireFox)())&&t.uplinkStats&&J(n,"videoSendPacketsLost",t.uplinkStats.uplink_cumulative_lost)),e(n)})),e.promises.push(new Promise(function(e){var n={};return t.traffic_stats&&t.pc&&t.pc.isSubscriber?(J(n,"accessDelay",t.traffic_stats.access_delay),J(n,"endToEndDelay",t.traffic_stats.e2e_delay),J(n,"videoReceiveDelay",t.traffic_stats.video_delay),J(n,"audioReceiveDelay",t.traffic_stats.audio_delay)):t.traffic_stats&&t.pc&&!t.pc.isSubscriber&&J(n,"accessDelay",t.traffic_stats.access_delay),e(n)}))});var s={true:!0,unspecified:!0,"90p_1":n(160,90),"120p_1":n(160,120),"120p_3":n(120,120),"120p_4":n(212,120),"180p_1":n(320,180),"180p_3":n(180,180),"180p_4":n(240,180),"240p_1":n(320,240),"240p_3":n(240,240),"240p_4":n(424,240),"360p_1":n(640,360),"360p_3":n(360,360),"360p_4":n(640,360),"360p_6":n(360,360),"360p_7":n(480,360),"360p_8":n(480,360),"360p_9":n(640,360),"360p_10":n(640,360),"360p_11":n(640,360),"480p_1":n(640,480),"480p_2":n(640,480),"480p_3":n(480,480),"480p_4":n(640,480),"480p_6":n(480,480),"480p_8":n(848,480),"480p_9":n(848,480),"480p_10":n(640,480),"720p_1":n(1280,720),"720p_2":n(1280,720),"720p_3":n(1280,720),"720p_5":n(960,720),"720p_6":n(960,720),"1080p_1":n(1920,1080),"1080p_2":n(1920,1080),"1080p_3":n(1920,1080),"1080p_5":n(1920,1080),"1440p_1":n(2560,1440),"1440p_2":n(2560,1440),"4k_1":n(3840,2160),"4k_3":n(3840,2160)};return t.setVideoResolution=function(n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.setVideoResolution",options:arguments,tag:"tracer"});return void 0!==s[n+=""]?(e.video=s[n],e.attributes=e.attributes||{},e.attributes.resolution=n,i(),!0):(i(),!1)},t.setVideoFrameRate=function(n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.setVideoFrameRate",options:arguments,tag:"tracer"});return Object(p.isFireFox)()?(i(),!1):"object"===v()(n)&&n instanceof Array&&n.length>1?(e.attributes=e.attributes||{},e.attributes.minFrameRate=n[0],e.attributes.maxFrameRate=n[1],i(),!0):(i(),!1)},t.setVideoBitRate=function(n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.setVideoBitRate",options:arguments,tag:"tracer"});return"object"===v()(n)&&n instanceof Array&&n.length>1?(e.attributes=e.attributes||{},e.attributes.minVideoBW=n[0],e.attributes.maxVideoBW=n[1],t.connectionSpec&&(t.connectionSpec.minVideoBW=n[0],t.connectionSpec.maxVideoBW=n[1]),i(),!0):(i(),!1)},t.setScreenBitRate=function(n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.setScreenBitRate",options:arguments,tag:"tracer"});return"object"===v()(n)&&n instanceof Array&&n.length>1?(e.screenAttributes=e.screenAttributes||{},e.screenAttributes.minVideoBW=n[0],e.screenAttributes.maxVideoBW=n[1],i(),!0):(i(),!1)},t.setScreenProfile=function(e){var n=a.b.reportApiInvoke(t.sid,{name:"Stream.setScreenProfile",options:arguments,tag:"tracer"});if(Y(e,"profile",["480p_1","480p_2","720p_1","720p_2","1080p_1","1080p_2"]),"string"==typeof e&&t.screen){switch(e){case"480p_1":t.screenAttributes.width=640,t.screenAttributes.height=480,t.screenAttributes.maxFr=5,t.screenAttributes.minFr=1;break;case"480p_2":t.screenAttributes.width=640,t.screenAttributes.height=480,t.screenAttributes.maxFr=30,t.screenAttributes.minFr=25;break;case"720p_1":t.screenAttributes.width=1280,t.screenAttributes.height=720,t.screenAttributes.maxFr=5,t.screenAttributes.minFr=1;break;case"720p_2":t.screenAttributes.width=1280,t.screenAttributes.height=720,t.screenAttributes.maxFr=30,t.screenAttributes.minFr=25;break;case"1080p_1":t.screenAttributes.width=1920,t.screenAttributes.height=1080,t.screenAttributes.maxFr=5,t.screenAttributes.minFr=1;break;case"1080p_2":t.screenAttributes.width=1920,t.screenAttributes.height=1080,t.screenAttributes.maxFr=30,t.screenAttributes.minFr=25}return n(),!0}return n(),!1},t.setVideoProfileCustom=function(e){var n=a.b.reportApiInvoke(t.sid,{name:"Stream.setVideoProfileCustom",options:arguments,tag:"tracer"});t.setVideoResolution(e[0]),t.setVideoFrameRate([e[1],e[1]]),t.setVideoBitRate([e[2],e[2]]),n()},t.setVideoProfileCustomPlus=function(i){var o=a.b.reportApiInvoke(t.sid,{name:"Stream.setVideoProfileCustom",options:arguments,tag:"tracer"});e.video=n(i.width,i.height),e.attributes=e.attributes||{},e.attributes.resolution="".concat(i.width,"x").concat(i.height),t.setVideoFrameRate([i.framerate,i.framerate]),t.setVideoBitRate([i.bitrate,i.bitrate]),o()},t.setVideoProfile=function(e){var n=a.b.reportApiInvoke(t.sid,{name:"Stream.setVideoProfile",options:arguments,tag:"tracer"});if(Y(e,"profile",["480p_1","480p_2","720p_1","720p_2","1080p_1","1080p_2","120p","120P","120p_1","120P_1","120p_3","120P_3","180p","180P","180p_1","180P_1","180p_3","180P_3","180p_4","180P_4","240p","240P","240p_1","240P_1","240p_3","240P_3","240p_4","240P_4","360p","360P","360p_1","360P_1","360p_3","360P_3","360p_4","360P_4","360p_6","360P_6","360p_7","360P_7","360p_8","360P_8","360p_9","360P_9","360p_10","360P_10","360p_11","360P_11","480p","480P","480p_1","480P_1","480p_2","480P_2","480p_3","480P_3","480p_4","480P_4","480p_6","480P_6","480p_8","480P_8","480p_9","480P_9","480p_10","480P_10","720p","720P","720p_1","720P_1","720p_2","720P_2","720p_3","720P_3","720p_5","720P_5","720p_6","720P_6","1080p","1080P","1080p_1","1080P_1","1080p_2","1080P_2","1080p_3","1080P_3","1080p_5","1080P_5","1440p","1440P","1440p_1","1440P_1","1440p_2","1440P_2","4k","4K","4k_1","4K_1","4k_3","4K_3"]),t.profile=e,"string"==typeof e&&t.video){switch(e){case"120p":case"120P":case"120p_1":case"120P_1":t.setVideoResolution("120p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([30,65]);break;case"120p_3":case"120P_3":t.setVideoResolution("120p_3"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([30,50]);break;case"180p":case"180P":case"180p_1":case"180P_1":t.setVideoResolution("180p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([30,140]);break;case"180p_3":case"180P_3":t.setVideoResolution("180p_3"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([30,100]);break;case"180p_4":case"180P_4":t.setVideoResolution("180p_4"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([30,120]);break;case"240p":case"240P":case"240p_1":case"240P_1":t.setVideoResolution("240p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([40,200]);break;case"240p_3":case"240P_3":t.setVideoResolution("240p_3"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([40,140]);break;case"240p_4":case"240P_4":t.setVideoResolution("240p_4"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([40,220]);break;case"360p":case"360P":case"360p_1":case"360P_1":t.setVideoResolution("360p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([80,400]);break;case"360p_3":case"360P_3":t.setVideoResolution("360p_3"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([80,260]);break;case"360p_4":case"360P_4":t.setVideoResolution("360p_4"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([80,600]);break;case"360p_6":case"360P_6":t.setVideoResolution("360p_6"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([80,400]);break;case"360p_7":case"360P_7":t.setVideoResolution("360p_7"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([80,320]);break;case"360p_8":case"360P_8":t.setVideoResolution("360p_8"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([80,490]);break;case"360p_9":case"360P_9":t.setVideoResolution("360p_9"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([80,800]);break;case"360p_10":case"360P_10":t.setVideoResolution("360p_10"),t.setVideoFrameRate([24,24]),t.setVideoBitRate([80,800]);break;case"360p_11":case"360P_11":t.setVideoResolution("360p_11"),t.setVideoFrameRate([24,24]),t.setVideoBitRate([80,1e3]);break;case"480p":case"480P":case"480p_1":case"480P_1":t.setVideoResolution("480p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([20,500]);break;case"480p_2":case"480P_2":t.setVideoResolution("480p_2"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([100,1e3]);break;case"480p_3":case"480P_3":t.setVideoResolution("480p_3"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([100,400]);break;case"480p_4":case"480P_4":t.setVideoResolution("480p_4"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([100,750]);break;case"480p_6":case"480P_6":t.setVideoResolution("480p_6"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([100,600]);break;case"480p_8":case"480P_8":t.setVideoResolution("480p_8"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([100,610]);break;case"480p_9":case"480P_9":t.setVideoResolution("480p_9"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([100,930]);break;case"480p_10":case"480P_10":t.setVideoResolution("480p_10"),t.setVideoFrameRate([10,10]),t.setVideoBitRate([100,400]);break;case"720p":case"720P":case"720p_1":case"720P_1":t.setVideoResolution("720p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([120,1130]);break;case"720p_2":case"720P_2":t.setVideoResolution("720p_2"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,2e3]);break;case"720p_3":case"720P_3":t.setVideoResolution("720p_3"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,1710]);break;case"720p_5":case"720P_5":t.setVideoResolution("720p_5"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([120,910]);break;case"720p_6":case"720P_6":t.setVideoResolution("720p_6"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,1380]);break;case"1080p":case"1080P":case"1080p_1":case"1080P_1":t.setVideoResolution("1080p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([120,2080]);break;case"1080p_2":case"1080P_2":t.setVideoResolution("1080p_2"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,3e3]);break;case"1080p_3":case"1080P_3":t.setVideoResolution("1080p_3"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,3150]);break;case"1080p_5":case"1080P_5":t.setVideoResolution("1080p_5"),t.setVideoFrameRate([60,60]),t.setVideoBitRate([120,4780]);break;case"1440p":case"1440P":case"1440p_1":case"1440P_1":t.setVideoResolution("1440p_1"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,4850]);break;case"1440p_2":case"1440P_2":t.setVideoResolution("1440p_2"),t.setVideoFrameRate([60,60]),t.setVideoBitRate([120,7350]);break;case"4k":case"4K":case"4k_1":case"4K_1":t.setVideoResolution("4k_1"),t.setVideoFrameRate([30,30]),t.setVideoBitRate([120,8910]);break;case"4k_3":case"4K_3":t.setVideoResolution("4k_3"),t.setVideoFrameRate([60,60]),t.setVideoBitRate([120,13500]);break;default:t.setVideoResolution("480p_1"),t.setVideoFrameRate([15,15]),t.setVideoBitRate([100,500])}return n(),!0}return n(),!1},t.setAudioProfile=function(e){var n=a.b.reportApiInvoke(t.sid,{name:"Stream.setAudioProfile",options:arguments,tag:"tracer"});if(Y(e,"profile",["speech_low_quality","speech_standard","music_standard","standard_stereo","high_quality","high_quality_stereo"]),t.audioProfile=e,"string"==typeof e&&t.audio){switch(e){case"speech_low_quality":t.highQuality=!1,t.stereo=!1,t.speech=!0,t.lowQuality=!0;break;case"speech_standard":t.highQuality=!1,t.stereo=!1,t.speech=!0,t.lowQuality=!1;break;case"music_standard":t.highQuality=!1,t.stereo=!1,t.speech=!1,t.lowQuality=!1;break;case"standard_stereo":t.highQuality=!1,t.stereo=!0,t.speech=!1,t.lowQuality=!1;break;case"high_quality":t.highQuality=!0,t.stereo=!1,t.speech=!1,t.lowQuality=!1;break;case"high_quality_stereo":t.highQuality=!0,t.stereo=!0,t.speech=!1,t.lowQuality=!1;break;default:t.highQuality=!1,t.stereo=!1,t.speech=!1,t.lowQuality=!1}return n(),!0}return n(),!1},t.getId=function(){return t.streamId},t.getUserId=function(){return t.userId},t.setUserId=function(e){var n=a.b.reportApiInvoke(t.sid,{name:"Stream.setUserId",options:arguments,tag:"tracer"});t.userId&&o.default.warning("[".concat(t.streamId,"] Stream.userId ").concat(t.userId," => ").concat(e)),t.userId=e,n()},t.getAttributes=function(){return e.screen?t.screenAttributes:e.attributes},t.hasAudio=function(){return t.audio},t.hasVideo=function(){return t.video},t.hasScreen=function(){return t.screen},t.isVideoOn=function(){return(t.hasVideo()||t.hasScreen())&&!t.userMuteVideo},t.isAudioOn=function(){return t.hasAudio()&&!t.userMuteAudio},t.init=function(n,i){var r=a.b.reportApiInvoke(t.sid,{callback:function(e,t){if(e)return i&&i(e);n&&n(t)},name:"Stream.init",options:arguments,tag:"tracer"}),s=((new Date).getTime(),arguments[2]);if(void 0===s&&(s=2),!0===t.initialized)return r({type:"warning",msg:"STREAM_ALREADY_INITIALIZED"});if(!0!==t.local)return r({type:"warning",msg:"STREAM_NOT_LOCAL"});if(t.videoSource?t.videoName="videoSource":t.video&&(t.videoName=K.searchDeviceNameById(e.cameraId)||"default"),t.audioSource?t.audioName="audioSource":t.audio&&(t.audioName=K.searchDeviceNameById(e.microphoneId)||"default"),t.screen&&(t.screenName=e.extensionId||"default"),t.videoSource||t.audioSource){var d=new MediaStream;return t.videoSource&&(o.default.debug("[".concat(t.streamId,"] Added videoSource")),d.addTrack(t.videoSource),t.video=!0),t.audioSource&&(o.default.debug("[".concat(t.streamId,"] Added audioSource")),d.addTrack(t.audioSource),t.audio=!0),t.hasVideo()?Object(G.h)(d,function(e,n){o.default.info("[".concat(t.streamId,"] Video Source width ").concat(e," height ").concat(n)),t.stream=d,t.initialized=!0,r()},function(e){o.default.warning("[".concat(t.streamId,"] Failed to get width & height from video source"),e),t.stream=d,t.initialized=!0,r()}):(t.stream=d,t.initialized=!0,r())}try{if((e.audio||e.video||e.screen)&&void 0===e.url){o.default.debug("[".concat(t.streamId,"] Requested access to local media"));var c=e.video;if(e.screen)var u={video:c,audio:!1,screen:!0,data:!0,extensionId:e.extensionId,attributes:t.screenAttributes,fake:e.fake,mediaSource:e.mediaSource,sourceId:e.sourceId,streamId:t.streamId};else{u={video:c,audio:e.audio,fake:e.fake,streamId:t.streamId};if(!(null!==window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)&&window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1]<=35)){var l=30,f=30;if(void 0!==e.attributes.minFrameRate&&(l=e.attributes.minFrameRate),void 0!==e.attributes.maxFrameRate&&(f=e.attributes.maxFrameRate),!0===u.audio){u.audio=!e.microphoneId||{deviceId:{exact:e.microphoneId}};var m={};t.audioProcessing&&(void 0!==t.audioProcessing.AGC&&(Object(p.isFireFox)()?m.autoGainControl=t.audioProcessing.AGC:Object(p.isChrome)()&&(m.googAutoGainControl=t.audioProcessing.AGC,m.googAutoGainControl2=t.audioProcessing.AGC)),void 0!==t.audioProcessing.AEC&&(m.echoCancellation=t.audioProcessing.AEC),void 0!==t.audioProcessing.ANS&&(Object(p.isFireFox)()?m.noiseSuppression=t.audioProcessing.ANS:Object(p.isChrome)()&&(m.googNoiseSuppression=t.audioProcessing.ANS))),t.stereo&&Object(p.isChrome)()&&(m.googAutoGainControl=!1,m.googAutoGainControl2=!1,m.echoCancellation=!1,m.googNoiseSuppression=!1),0!==Object.keys(m).length&&(!0===u.audio?u.audio={mandatory:m}:u.audio=I()(u.audio,m))}!0===u.video?(u.video={width:{ideal:t.videoSize[0]},height:{ideal:t.videoSize[1]},frameRate:{ideal:l,max:f}},t.setVideoBitRate([500,500]),u.video.deviceId=e.cameraId?{exact:e.cameraId}:void 0):"object"===v()(u.video)&&(u.video.frameRate={ideal:l,max:f},u.video.deviceId=e.cameraId?{exact:e.cameraId}:void 0)}}o.default.debug("[".concat(t.streamId,"] "),u);var g=I()({},u);if(t.constraints=u,H(g,function(n){t.screenAudioTrack&&n.addTrack(t.screenAudioTrack);var i=n.getVideoTracks().length>0,a=n.getAudioTracks().length>0;return g.video&&!i&&g.audio&&!a?(o.default.error("[".concat(t.streamId,"] Media access: NO_CAMERA_MIC_PERMISSION")),r("NO_CAMERA_MIC_PERMISSION")):g.video&&!i?(o.default.error("[".concat(t.streamId,"] Media access: NO_CAMERA_PERMISSION")),r("NO_CAMERA_PERMISSION")):g.screen&&!i?(o.default.error("[".concat(t.streamId,"] Media access: NO_SCREEN_PERMISSION")),r("NO_SCREEN_PERMISSION")):g.audio&&!a?(o.default.error("[".concat(t.streamId,"] Media access: NO_MIC_PERMISSION")),r("NO_MIC_PERMISSION")):(o.default.debug("[".concat(t.streamId,"] User has granted access to local media")),t.dispatchEvent({type:"accessAllowed"}),t.stream=n,t.initialized=!0,e.screen&&e.audio&&!t.screenAudioTrack||r(),t.hasVideo()&&Object(G.h)(n,function(e,n){t.videoWidth=e,t.videoHeight=n},function(e){o.default.warning("[".concat(t.streamId,"] vsResHack failed: "),e)}),void(e.screen&&Object(p.isChrome)()&&t.stream&&t.stream.getVideoTracks()[0]&&(t.stream.getVideoTracks()[0].onended=function(){t.dispatchEvent({type:"stopScreenSharing"})})))},function(e){var n={type:"error",msg:e.name||e.code||e,info:null};switch(e&&(e.message&&(n.info=e.message),e.code&&(n.info?n.info+=". "+e.code:n.info=" "+e.code),e.constraint&&(n.info?n.info+=". Constraint: "+e.constraint:n.info="constraint: "+e.constraint)),n.msg){case"Starting video failed":case"TrackStartError":if(t.videoSize=void 0,s>0)return void setTimeout(function(){t.init(function(e){return r(e)},r,s-1)},1);n.msg="MEDIA_OPTION_INVALID";break;case"DevicesNotFoundError":n.msg="DEVICES_NOT_FOUND";break;case"NotSupportedError":n.msg="NOT_SUPPORTED";break;case"PermissionDeniedError":n.msg="PERMISSION_DENIED",t.dispatchEvent({type:"accessDenied"});break;case"PERMISSION_DENIED":t.dispatchEvent({type:"accessDenied"});break;case"InvalidStateError":n.msg="PERMISSION_DENIED",t.dispatchEvent({type:"accessDenied"});break;case"NotAllowedError":t.dispatchEvent({type:"accessDenied"});break;case"ConstraintNotSatisfiedError":n.msg="CONSTRAINT_NOT_SATISFIED";break;default:n.msg||(n.msg="UNDEFINED")}var i="Media access ".concat(n.msg).concat(n.info?": "+n.info:"");o.default.error("[".concat(t.streamId,"] "),i),r(n)}),e.screen&&e.audio){var S=!e.microphoneId||{deviceId:{exact:e.microphoneId}};m={};t.audioProcessing&&(void 0!==t.audioProcessing.AGC&&(Object(p.isFireFox)()?m.autoGainControl=t.audioProcessing.AGC:Object(p.isChrome)()&&(m.googAutoGainControl=t.audioProcessing.AGC,m.googAutoGainControl2=t.audioProcessing.AGC)),void 0!==t.audioProcessing.AEC&&(m.echoCancellation=t.audioProcessing.AEC),void 0!==t.audioProcessing.ANS&&(Object(p.isFireFox)()?m.noiseSuppression=t.audioProcessing.ANS:Object(p.isChrome)()&&(m.googNoiseSuppression=t.audioProcessing.ANS))),t.stereo&&Object(p.isChrome)()&&(m.googAutoGainControl=!1,m.googAutoGainControl2=!1,m.echoCancellation=!1,m.googNoiseSuppression=!1),0!==Object.keys(m).length&&(S=!0===S?{mandatory:m}:I()(S,m));var _={video:!1,audio:S};o.default.debug("[".concat(t.streamId,"] "),_),H(_,function(e){o.default.info("[".concat(t.streamId,"] User has granted access to auxiliary local media.")),t.dispatchEvent({type:"accessAllowed"});var n=e.getAudioTracks()[0];t.stream?(t.stream.addTrack(n),r()):t.screenAudioTrack=n},function(e){var n={type:"error",msg:e.name||e.code||e,info:null};switch(e&&(e.message&&(n.info=e.message),e.code&&(n.info?n.info+=". "+e.code:n.info=" "+e.code),e.constraint&&(n.info?n.info+=". Constraint: "+e.constraint:n.info="constraint: "+e.constraint)),n.msg){case"Starting video failed":case"TrackStartError":if(t.videoSize=void 0,s>0)return void setTimeout(function(){t.init(function(e){return r(e)},r,s-1)},1);n.msg="MEDIA_OPTION_INVALID";break;case"DevicesNotFoundError":n.msg="DEVICES_NOT_FOUND";break;case"NotSupportedError":n.msg="NOT_SUPPORTED";break;case"PermissionDeniedError":case"InvalidStateError":n.msg="PERMISSION_DENIED",t.dispatchEvent({type:"accessDenied"});break;case"PERMISSION_DENIED":case"NotAllowedError":t.dispatchEvent({type:"accessDenied"});break;case"ConstraintNotSatisfiedError":n.msg="CONSTRAINT_NOT_SATISFIED";break;default:n.msg||(n.msg="UNDEFINED")}var i="Media access ".concat(n.msg).concat(n.info?": "+n.info:"");o.default.error("[".concat(t.streamId,"] "),i),r(n)})}}else r({type:"warning",msg:"STREAM_HAS_NO_MEDIA_ATTRIBUTES"})}catch(e){o.default.error("[".concat(t.streamId,"] Stream init: "),e),r({type:"error",msg:e.message||e})}},t.close=function(){var e=a.b.reportApiInvoke(null,{name:"Stream.close",options:arguments,tag:"tracer"});if(o.default.debug("[".concat(t.streamId,"] Close stream with id"),t.streamId),void 0!==t.stream){var n=t.stream.getTracks();for(var i in n)n.hasOwnProperty(i)&&n[i].stop();t.stream=void 0}Object(p.isSafari)()&&t.pc&&t.pc.peerConnection&&t.pc.peerConnection.removeTrack&&t.pc.peerConnection.getSenders&&t.pc.peerConnection.getSenders().forEach(function(e){e&&(o.default.debug("[".concat(t.streamId,"] Remove Track"),e),t.pc.peerConnection.removeTrack(e))});t.initialized=!1,t._onAudioMute=void 0,t._onAudioUnmute=void 0,t._onVideoMute=void 0,t._onVideoUnmute=void 0,t.lowStream&&t.lowStream.close(),e()},t.enableAudio=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.enableAudio",options:arguments,tag:"tracer"});o.default.deprecate("[".concat(t.streamId,"] Stream.enableAudio is deprecated and will be removed in the future. Use Stream.unmuteAudio instead"));var n=t._unmuteAudio();return n&&(t.userMuteAudio=!1),e(null,n),n},t.disableAudio=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.disableAudio",options:arguments,tag:"tracer"});o.default.deprecate("[".concat(t.streamId,"] Stream.disableAudio is deprecated and will be removed in the future. Use Stream.muteAudio instead"));var n=t._muteAudio();return n&&(t.userMuteAudio=!0),e(null,n),n},t.enableVideo=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.enableVideo",options:arguments,tag:"tracer"});o.default.deprecate("[".concat(t.streamId,"] Stream.enableVideo is deprecated and will be removed in the future. Use Stream.unmuteVideo instead"));var n=t._unmuteVideo();return n&&(t.userMuteVideo=!1,t.lowStream&&(t.lowStream.userMuteVideo=!1)),e(null,n),n},t.disableVideo=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.disableVideo",options:arguments,tag:"tracer"});o.default.deprecate("[".concat(t.streamId,"] Stream.disableVideo is deprecated and will be removed in the future. Use Stream.muteVideo instead"));var n=t._muteVideo();return n&&(t.userMuteVideo=!0,t.lowStream&&(t.lowStream.userMuteVideo=!0)),e(null,n),n},t.unmuteAudio=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.unmuteAudio",options:arguments,tag:"tracer"}),n=t._unmuteAudio();return n&&(t.userMuteAudio=!1),e(null,n),n},t.muteAudio=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.muteAudio",options:arguments,tag:"tracer"}),n=t._muteAudio();return n&&(t.userMuteAudio=!0),e(null,n),n},t.unmuteVideo=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.unmuteVideo",options:arguments,tag:"tracer"}),n=t._unmuteVideo();return n&&(t.userMuteVideo=!1,t.lowStream&&(t.lowStream.userMuteVideo=!1)),e(null,n),n},t.muteVideo=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.muteVideo",options:arguments,tag:"tracer"}),n=t._muteVideo();return n&&(t.userMuteVideo=!0,t.lowStream&&(t.lowStream.userMuteVideo=!0)),e(null,n),n},t._unmuteAudio=function(){return o.default.debug("[".concat(t.streamId,"] Unmuted audio stream with id "),t.streamId),t._flushAudioMixingMuteStatus(!1),!(!t.hasAudio()||!t.initialized||void 0===t.stream||!0===t.stream.getAudioTracks()[0].enabled)&&(t._onAudioUnmute&&t._onAudioUnmute(),t.pc&&(t.pc.isAudioMute=!1),t.stream.getAudioTracks()[0].enabled=!0,!0)},t._isAudioMuted=function(){if(t.stream&&t.hasAudio()){var e=t.stream.getAudioTracks();return e.length>0&&!e[0].enabled}return!1},t._muteAudio=function(){return o.default.debug("[".concat(t.streamId,"] Muted audio stream with id "),t.streamId),t._flushAudioMixingMuteStatus(!0),!!(t.hasAudio()&&t.initialized&&void 0!==t.stream&&t.stream.getAudioTracks()[0].enabled)&&(t._onAudioMute&&t._onAudioMute(),t.pc&&(t.pc.isAudioMute=!0),t.stream.getAudioTracks()[0].enabled=!1,t.sid&&a.b.audioSendingStopped(t.sid,{succ:!0,reason:"muteAudio"}),!0)},t._unmuteVideo=function(){return o.default.debug("[".concat(t.streamId,"] Unmuted video stream with id"),t.streamId),!(!t.initialized||void 0===t.stream||!t.stream.getVideoTracks().length||!0===t.stream.getVideoTracks()[0].enabled)&&(t._onVideoUnmute&&t._onVideoUnmute(),t.pc&&(t.pc.isVideoMute=!1),t.stream.getVideoTracks()[0].enabled=!0,t.lowStream&&t.lowStream._unmuteVideo(),!0)},t._muteVideo=function(){return o.default.debug("[".concat(t.streamId,"] Muted video stream with id"),t.streamId),!!(t.initialized&&void 0!==t.stream&&t.stream.getVideoTracks().length&&t.stream.getVideoTracks()[0].enabled)&&(t._onVideoMute&&t._onVideoMute(),t.pc&&(t.pc.isVideoMute=!0),t.stream.getVideoTracks()[0].enabled=!1,t.lowStream&&t.lowStream._muteVideo(),t.sid&&a.b.videoSendingStopped(t.sid,{succ:!0,reason:"muteVideo"}),!0)},t.addTrack=function(n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.addTrack",options:arguments,tag:"tracer"});if(t.pc&&t.pc.addTrack(n,t.stream),"audio"==n.kind){var o=new MediaStream;t.userMuteAudio&&(n.enabled=!1),o.addTrack(n);var r=t.stream.getVideoTracks()[0];r&&(o.addTrack(r),t.audio=!0,e.audio=!0),t.stream=o,t.audioLevelHelper=null,t.player&&t.player.video&&(t.player.video.srcObject=t.stream)}else t.userMuteVideo&&(n.enabled=!1),t.stream.addTrack(n),t.video=!0,e.video=!0;i()},t.removeTrack=function(n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.removeTrack",options:arguments,tag:"tracer"});t.pc&&t.pc.removeTrack(n,t.stream),t.stream.removeTrack(n),"audio"===n.kind?(t.audio=!1,e.audio=!1):(t.video=!1,e.video=!1),t.audioLevelHelper=null,"live"==n.readyState&&(n.stop(),o.default.debug("[".concat(t.streamId,"] Track ").concat(n.kind," Stopped"))),i()},t.setAudioOutput=function(e,n,i){var r=a.b.reportApiInvoke(t.sid,{callback:function(e,t){if(e)return i&&i(e);n&&n(t)},name:"Stream.setAudioOutput",options:arguments,tag:"tracer"});return Z(e,1,255)?(t.audioOutput=e,t.player?void t.player.setAudioOutput(e,function(){return r()},r):r()):(o.default.error("[".concat(t.streamId,"] setAudioOutput Invalid Parameter"),e),r(A.INVALID_PARAMETER))},t.play=function(e,n){var i=a.b.reportApiInvoke(t.sid,{name:"Stream.play",options:arguments,tag:"tracer"});Q(e,"elementID"),re(n)||(re(n.fit)||Y(n.fit,"fit",["cover","contain"]),re(n.muted)||$(n.muted,"muted")),t.elementID=e,t.playOptions=n,t.isPlaying()?o.default.error("[".concat(t.streamId,"] Stream.play(): Stream is already playing")):!t.local||t.video||t.screen?void 0!==e&&(t.player=new T({id:t.getId(),stream:t,elementID:e,options:n})):t.hasAudio()&&(t.player=new T({id:t.getId(),stream:t,elementID:e,options:n})),t.audioOutput&&t.player.setAudioOutput(t.audioOutput),void 0!==t.audioLevel&&t.player.setAudioVolume(t.audioLevel),t._flushAudioMixingMuteStatus(!1),i()},t.stop=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.stop",options:arguments,tag:"tracer"});o.default.debug("[".concat(t.streamId,"] Stop stream player with id "),t.streamId),t.player?(t.player.destroy(),delete t.player):o.default.error("[".concat(t.streamId,"] Stream.stop(): Stream is not playing")),t._flushAudioMixingMuteStatus(!0),e()},t.isPlaying=function(){return!!t.player},t.isPaused=function(){return!!t.player&&(!(!t.player.video||!t.player.video.paused)||!(!t.player.audio||!t.player.audio.paused))},t.resume=function(){var e=!1;return t.player&&(t.player.video&&t.player.video.play&&(t.player.video.play(),e=!0),t.player.audio&&t.player.audio.play&&(t.player.audio.play(),e=!0)),e},t.getVideoTrack=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.getVideoTrack",options:arguments,tag:"tracer"});if(t.stream&&t.stream.getVideoTracks){var n=t.stream.getVideoTracks()[0];if(n)return o.default.info("[".concat(t.streamId,"] getVideoTrack"),n),e(),n}o.default.info("[".concat(t.streamId,"] getVideoTrack None")),e(null,"getVideoTrack None")},t.getAudioTrack=function(){var e=a.b.reportApiInvoke(t.sid,{name:"Stream.getAudioTrack",options:arguments,tag:"tracer"});if(t.stream&&t.stream.getAudioTracks){var n=t.stream.getAudioTracks()[0];if(n)return o.default.info("[".concat(t.streamId,"] getAudioTracks"),n),e(),n}o.default.info("[".concat(t.streamId,"] getAudioTracks None")),e(null,"getAudioTracks None")},t._replaceMediaStreamTrack=function(e,n,i){if(t.stream){if("video"==e.kind){if(r=t.stream.getVideoTracks()[0])return t.userMuteVideo&&(e.enabled=!1),t.stream.removeTrack(r),t.stream.addTrack(e),o.default.debug("[".concat(t.streamId,"] _replaceMediaStreamTrack ").concat(e.kind," SUCCESS")),"live"==r.readyState&&(r.stop(),o.default.debug("[".concat(t.streamId,"] Track ").concat(r.kind," Stopped"))),n&&n();var a="MEDIASTREAM_TRACK_NOT_FOUND";return o.default.error("[".concat(t.streamId,"] MEDIASTREAM_TRACK_NOT_FOUND ").concat(e.kind)),i(a)}if("audio"==e.kind){var r;if(r=t.stream.getAudioTracks()[0]){t.userMuteAudio&&(e.enabled=!1);var s=new MediaStream;s.addTrack(e);var d=t.stream&&t.stream.getVideoTracks()[0];return d&&s.addTrack(d),t.stream=s,t.audioLevelHelper=null,t.player&&t.player.video&&(t.player.video.srcObject=t.stream),o.default.debug("[".concat(t.streamId,"] _replaceMediaStreamTrack SUCCESS")),"live"==r.readyState&&(r.stop(),o.default.debug("[".concat(t.streamId,"] Track ").concat(r.kind," Stopped"))),n&&n()}a="MEDIASTREAM_TRACK_NOT_FOUND";return o.default.error("[".concat(t.streamId,"] MEDIASTREAM_TRACK_NOT_FOUND ").concat(e.kind)),i(a)}a="INVALID_TRACK_TYPE";return o.default.error("[".concat(t.streamId,"] _replaceMediaStreamTrack ").concat(a," ").concat(e.kind)),i&&i(a)}a="NO_STREAM_FOUND";return o.default.error("[".concat(t.streamId,"] _replaceMediaStreamTrack ").concat(a)),i&&i(a)},t.replaceTrack=function(e,n,i){var r=a.b.reportApiInvoke(t.sid,{callback:function(e,t){if(e)return i&&i(e);n&&n(t)},name:"Stream.replaceTrack",options:arguments,tag:"tracer"});return e&&e.kind?t.pc&&t.pc.hasSender&&t.pc.hasSender(e.kind)?void t.pc.replaceTrack(e,function(){return o.default.debug("[".concat(t.streamId,"] PeerConnection.replaceTrack ").concat(e.kind," SUCCESS")),t._replaceMediaStreamTrack(e,function(e){return r(null,e)},r)},function(n){return o.default.error("[".concat(t.streamId,"] PeerConnection.replaceTrack ").concat(e.kind," Failed ").concat(n)),r(n)}):t._replaceMediaStreamTrack(e,function(e){return r(null,e)},r):r("INVALID_TRACK")},t.setAudioVolume=function(e){var n=a.b.reportApiInvoke(t.sid,{name:"Stream.setAudioVolume",options:arguments,tag:"tracer"});X(e,"level",0,100),t.audioLevel=e,t.player&&t.player.setAudioVolume(e),n()},t.getStats=function(e,n){var i={type:"collectStats",promises:[]};t.dispatchEvent(i),Promise.all(i.promises).then(function(n){for(var i={},o=n.length-1;o>=0;o--){var a=n[o];I()(i,a)}e&&setTimeout(e.bind(t,i),0)}).catch(function(e){n&&setTimeout(n.bind(t,e),0)})},t._getPCStats=function(){return new Promise(function(e,n){if(!t.pc||"established"!==t.pc.state||!t.pc.getStats){return n("PEER_CONNECTION_NOT_ESTABLISHED")}t.pc.getStats(function(i){if(!t.pc||"established"!==t.pc.state||!t.pc.getStats){return n("PEER_CONNECTION_STATE_CHANGE")}var o=t.pc.isSubscriber?function(e){var t={};return e.forEach(function(e){e.id&&(-1===e.id.indexOf("recv")&&-1===e.id.indexOf("inbound_rtp")&&-1===e.id.indexOf("inbound-rtp")&&-1===e.id.indexOf("InboundRTP")||("audio"===e.mediaType?(J(t,"audioReceiveBytes",e.bytesReceived),J(t,"audioReceivePackets",e.packetsReceived),J(t,"audioReceivePacketsLost",e.packetsLost)):(J(t,"videoReceiveBytes",e.bytesReceived),J(t,"videoReceivePacketsLost",e.packetsLost),J(t,"videoReceivePackets",e.packetsReceived),J(t,"videoReceiveFrameRate",e.googFrameRateReceived),J(t,"videoReceiveDecodeFrameRate",e.googFrameRateDecoded),J(t,"videoReceiveResolutionWidth",e.googFrameWidthReceived),J(t,"videoReceiveResolutionHeight",e.googFrameHeightReceived))))}),t}(i):function(e){var t={};return e.forEach(function(e){e.id&&(-1===e.id.indexOf("send")&&-1===e.id.indexOf("outbound_rtp")&&-1===e.id.indexOf("OutboundRTP")||("audio"===e.mediaType?(J(t,"audioSendBytes",e.bytesSent),J(t,"audioSendPackets",e.packetsSent),J(t,"audioSendPacketsLost",e.packetsLost)):(J(t,"videoSendBytes",e.bytesSent),J(t,"videoSendPackets",e.packetsSent),J(t,"videoSendPacketsLost",e.packetsLost),J(t,"videoSendFrameRate",e.googFrameRateSent),J(t,"videoSendResolutionWidth",e.googFrameWidthSent),J(t,"videoSendResolutionHeight",e.googFrameHeightSent))))}),t}(i);return e(o)})}).then(function(e){return t.pc.isSubscriber?(Object(p.isFireFox)()||Object(p.isSafari)())&&(J(e,"videoReceiveResolutionHeight",t.videoHeight),J(e,"videoReceiveResolutionWidth",t.videoWidth)):((Object(p.isSafari)()||Object(p.isFireFox)())&&(J(e,"videoSendResolutionHeight",t.videoHeight),J(e,"videoSendResolutionWidth",t.videoWidth)),(Object(p.isSafari)()||Object(p.isFireFox)())&&t.uplinkStats&&J(e,"videoSendPacketsLost",t.uplinkStats.uplink_cumulative_lost)),Promise.resolve(e)})},t.getAudioLevel=function(){return t.audioLevelHelper?t.audioLevelHelper.getAudioLevel():t.stream?0!==t.stream.getAudioTracks().length?(t.audioLevelHelper=new G.a(t.stream),t.audioLevelHelper.getAudioLevel()):void o.default.warning("[".concat(t.streamId,"] can't get audioLevel beacuse no audio trace in stream")):(o.default.warning("[".concat(t.streamId,"] can't get audioLevel beacuse no stream exist")),0)},t.setVideoProfile("480P"),t._switchVideoDevice=function(e,n,i){if(e===t.cameraId)return n&&n();t.constraints.video.deviceId={exact:e};var a=I()({},t.constraints);a.audio=!1,o.default.debug("[".concat(t.streamId,"] ").concat(a)),H(a,function(o){try{Object(p.isSafari)()?t.replaceTrack(o.getVideoTracks()[0],function(){t.userMuteVideo&&(t.stream.getVideoTracks()[0].enabled=!1),n&&n()},i):(t.removeTrack(t.stream.getVideoTracks()[0]),t.addTrack(o.getVideoTracks()[0]),t.isPlaying()&&(t.stop(),t.elementID&&t.play(t.elementID)),t.cameraId=e,t.userMuteVideo&&(t.stream.getVideoTracks()[0].enabled=!1),n&&n())}catch(e){return i&&i(e)}},function(e){return i&&i(e)})},t._switchAudioDevice=function(e,n,i){if(e===t.microphoneId)return n&&n();!0===t.constraints.audio?t.constraints.audio={deviceId:{exact:e}}:t.constraints.audio.deviceId={exact:e};var a=I()({},t.constraints);a.video=!1,o.default.debug("[".concat(t.streamId,"] "),a),H(a,function(o){try{Object(p.isSafari)()?t.replaceTrack(o.getAudioTracks()[0],n,i):(t.removeTrack(t.stream.getAudioTracks()[0]),t.addTrack(o.getAudioTracks()[0]),t.audioMixing.audioContextInited&&(t.audioMixing.ctx.close(),t.audioMixing.audioContextInited=!1),t.userMuteAudio&&(t.stream.getAudioTracks()[0].enabled=!1),t.isPlaying()&&(t.stop(),t.elementID&&t.play(t.elementID)),t.microphoneId=e,n&&n())}catch(e){return i&&i(e)}},function(e){return i&&i(e)})},t.switchDevice=function(e,n,i,r){var s=a.b.reportApiInvoke(t.sid,{callback:function(e,t){if(e)return r&&r(e);i&&i(t)},name:"Stream.switchDevice",options:arguments,tag:"tracer"});Q(n,"deviceId");var d=function(){return t.inSwitchDevice=!1,s()},c=function(e){t.inSwitchDevice=!1,o.default.error("[".concat(t.streamId,"] "),e),s(e)};if(t.inSwitchDevice)return s("Device switch is in process.");if(t.inSwitchDevice=!0,!t.local)return c("Only the local stream can switch the device.");if(t.screen&&"video"===e)return c("The device cannot be switched during screen-sharing.");if(t.videoSource||t.audioSource)return c("The device cannot be switched when using videoSource or audioSource.");if(t.lowStream)return c("The device cannot be switched when using lowstream.");var u=!1;for(var l in t.audioMixing.sounds){if(t.audioMixing.sounds[l].state!==t.audioMixing.states.IDLE){u=!0;break}}if(t.audioMixing.audioContextInited&&u)return c("The device cannot be switched when using audio Mixing.");K.getDeviceById(n,function(){if("video"===e)t._switchVideoDevice(n,d,c);else{if("audio"!==e)return c("Invalid type.");t._switchAudioDevice(n,d,c)}},function(){return c("The device does not exist.")})},t},de=n(12),ce=["live","rtc","web","interop","h264_interop","web-only"],ue=["vp8","h264"],le=["aes-128-xts","aes-256-xts","aes-128-ecb"],pe=function(e){e&&e.apply(this,[].slice.call(arguments,1))},fe=n(5),me=function(e){var t=r();return t.needReconnect=!0,t.isTimeout=!1,t.isInit=!0,t.sendbytes=0,t.recvbytes=0,t.startTime=Date.now(),t.clientId=e.clientId,t.hostIndex=0,t.requestID=0,e.host instanceof Array?t.host=e.host:t.host=[e.host],t.getSendBytes=function(){return t.sendbytes},t.getRecvBytes=function(){return t.recvbytes},t.getDuration=function(){return Math.ceil((Date.now()-t.startTime)/1e3)},t.getURL=function(){return t.connection.url},t.reconnect=function(){t.isInit=!0,t.creatConnection()},t.connectNext=function(){t.isInit=!0,++t.hostIndex,o.default.debug("["+t.clientId+"] Gateway length:"+t.host.length+" current index:"+t.hostIndex),t.hostIndex>=t.host.length?t.dispatchEvent(u({type:"recover"})):t.creatConnection()},t.replaceHost=function(e){t.host=e||t.host,t.hostIndex=0,t.creatConnection()},t.creatConnection=function(){o.default.debug("["+t.clientId+"] start connect:"+t.host[t.hostIndex]),t.lts=(new Date).getTime(),t.connection=new WebSocket("wss://"+t.host[t.hostIndex]),t.connection.onopen=function(e){o.default.debug("["+t.clientId+"] websockect opened: "+t.host[t.hostIndex]),t.needReconnect=!0,t.isTimeout=!1,t.isInit=!1,t.sendbytes=0,t.recvbytes=0,t.startTime=Date.now(),Object(fe.d)(),clearTimeout(t.timeoutCheck),t.dispatchEvent(u({type:"onopen",event:e,socket:t}))},t.connection.onmessage=function(e){t.recvbytes+=Object(G.e)(e.data);var n=JSON.parse(e.data);n.hasOwnProperty("_id")?t.dispatchEvent(u({type:n._id,msg:n})):n.hasOwnProperty("_type")&&t.dispatchSocketEvent(u({type:n._type,msg:n.message}))},t.connection.onclose=function(n){t.needReconnect?t.isTimeout||t.isInit?(o.default.debug("["+t.clientId+"] websockect connect timeout"),a.b.joinGateway(e.sid,{lts:t.lts,succ:!1,ec:"timeout",addr:t.connection.url}),t.connectNext()):t.dispatchEvent(u({type:"disconnect",event:n})):(o.default.debug("["+t.clientId+"] websockect closeed"),pe(e.onFailure,n),clearTimeout(t.timeoutCheck),t.dispatchEvent(u({type:"close",event:n})),t.connection.onopen=void 0,t.connection.onclose=void 0,t.connection.onerror=void 0,t.connection.onmessage=void 0,t.connection=void 0)},t.connection.onerror=function(e){},setTimeout(function(){t.connection&&t.connection.readyState!=WebSocket.OPEN&&(t.isTimeout=!0,t.connection.close())},5e3)},t.creatConnection(),t.sendMessage=function(e,n){if(t.connection&&t.connection.readyState==WebSocket.OPEN){var i=JSON.stringify(e);t.sendbytes+=Object(G.e)(i),t.connection.send(i)}else n({error:"Gateway not connected"})},t.disconnect=function(){t.needReconnect=!0,t.connection.close()},t.close=function(){t.needReconnect=!1,t.connection.onclose=void 0,t.connection.close()},t.sendSignalCommand=function(e,n){e._id="_request_"+t.requestID,t.requestID+=1,"publish_stats"!==e._type&&"subscribe_stats"!==e._type&&"publish_stats_low"!==e._type&&t.on(e._id,function(i){i.msg&&n&&n(i.msg._result,i.msg.message),delete t.dispatcher.eventListeners[e._id]}),t.sendMessage(e,function(e){e.reason="NOT_CONNECTED",n&&n(e.reason,e)})},t},ge=function(e,t){var n={connect:function(){t.host=e,n.signal=me(t),n.on=n.signal.on,n.dispatchEvent=n.signal.dispatchEvent,n.signal.on("onopen",function(e){n.signal.onEvent=function(e){n.dispatchEvent(u({type:e.event,msg:e}))},n.dispatchEvent(u({type:"connect",msg:e}))}),n.signal.on("onError",function(e){var t=e.msg;onError(t.code,"error")})},getSendBytes:function(){return n.signal.getSendBytes()},getRecvBytes:function(){return n.signal.getRecvBytes()},getDuration:function(){return n.signal.getDuration()},disconnect:function(){n.signal.disconnect()},close:function(){n.signal.close()},getURL:function(){return n.signal.getURL()},reconnect:function(){n.signal.reconnect()},connectNext:function(){n.signal.connectNext()},replaceHost:function(e){n.signal.replaceHost(e)},emitSimpleMessage:function(e,t){n.signal.sendSignalCommand(e,t)}};return n.connect(),n},ve=function(e,t){var n=!1,r=0,s={command:"convergeAllocateEdge",sid:e.sid,appId:e.appId,token:e.token,uid:e.uid,cname:e.cname,ts:Math.floor(Date.now()/1e3),version:i.VERSION,seq:0,requestId:1};Object(i.getParameter)("PROXY_CS").map(function(d){var c=(new Date).getTime();Se("https://"+d+"/api/v1",s,function(s,u){if(s)return o.default.debug("["+e.clientId+"] Request proxy server failed: ",s),r++,a.b.requestProxyAppCenter(e.sid,{lts:c,succ:!1,APAddr:d,workerManagerList:null,ec:JSON.stringify(s),response:JSON.stringify({err:s,res:u})}),void(r>=Object(i.getParameter)("PROXY_CS").length&&t&&t("Get proxy server failed: request all failed"));if(!n)if((u=JSON.parse(u)).json_body){var l=JSON.parse(u.json_body);if(o.default.debug("["+e.clientId+"] App return:",l.servers),200!==l.code){s="Get proxy server failed: response code ["+l.code+"], reason [ "+l.reason+"]";o.default.debug("["+e.clientId+"] "+s),a.b.requestProxyAppCenter(e.sid,{lts:c,succ:!1,APAddr:d,workerManagerList:null,ec:s,response:JSON.stringify({err:s,res:u})})}else{n=!0;var p=_e(l.servers);a.b.requestProxyAppCenter(e.sid,{lts:c,succ:!0,APAddr:d,workerManagerList:JSON.stringify(p),ec:null,response:JSON.stringify({res:u})}),t&&t(null,p)}}else o.default.debug("["+e.clientId+"] Get proxy server failed: no json_body"),a.b.requestProxyAppCenter(e.sid,{lts:c,succ:!1,APAddr:d,workerManagerList:null,ec:"Get proxy server failed: no json_body",response:JSON.stringify({res:u})})})})},Se=function(e,t,n){var i={service_name:"webrtc_proxy",json_body:JSON.stringify(t)};Object(fe.c)(e,i,function(e){n&&n(null,e)},function(e){n&&n(e)},{"X-Packet-Service-Type":0,"X-Packet-URI":61})},Ie=function(e,t,n){var i=!1,r=0,s={command:"request",gatewayType:"http",appId:e.appId,cname:e.cname,uid:e.uid+"",sdkVersion:"2.3.1",sid:e.sid,seq:1,ts:+new Date,requestId:3,clientRequest:{appId:e.appId,cname:e.cname,uid:e.uid+"",sid:e.sid}};t.map(function(d){var c=(new Date).getTime();!function(e,t,n){Object(fe.c)(e,t,function(e){n&&n(null,e)},function(e){n&&n(e)})}("https://"+d+":4000/v2/machine",s,function(s,u){if(s)return o.default.debug("["+e.clientId+"] Request worker manager failed: ",s),r++,a.b.requestProxyWorkerManager(e.sid,{lts:c,succ:!1,workerManagerAddr:d,ec:JSON.stringify(s),response:JSON.stringify({res:u})}),void(r>=t.length&&n&&n("requeet worker manager server failed: request failed"));if(!i){if(!(u=JSON.parse(u)).serverResponse)return n&&n("requeet worker manager server failed: serverResponse is undefined");i=!0,a.b.requestProxyWorkerManager(e.sid,{lts:c,succ:!0,workerManagerAddr:d,ec:JSON.stringify(s),response:JSON.stringify({res:u})}),n&&n(null,{address:d,serverResponse:u.serverResponse})}})})},_e=function(e){if(!e||[]instanceof Array==!1)return[];var t=[];return e.forEach(function(e){var n;e.address&&e.tcp?(e.address.match(/^[\.\:\d]+$/)?n="".concat(e.address.replace(/[^\d]/g,"-"),".edge.agora.io"):(o.default.info("["+joinInfo.clientId+"] "+"Cannot recognized as IP address ".concat(e.address,". Used As Host instead")),n="".concat(e.address,":").concat(e.tcp)),t.push(n)):o.default.error("["+joinInfo.clientId+"] Invalid address format ",e)}),t},he=function(e,t){var n=I()({},e),o=Object(i.getParameter)("WEBCS_DOMAIN").concat(Object(i.getParameter)("WEBCS_DOMAIN_BACKUP_LIST")),a=[],r=!1;(o=o.map(function(e){return n.proxyServer?"https://".concat(n.proxyServer,"/ap/?url=").concat(e+"/api/v1"):"https://".concat(e,"/api/v1")})).map(function(e){!function(e,t,n){var i={flag:64,cipher_method:0,timeout:1e3,features:t};Object(fe.c)(e,i,function(e){try{var t=JSON.parse(e);n&&n(null,t)}catch(e){n&&n(e)}n&&n(null,e)},function(e){n&&n(e)},{"X-Packet-Service-Type":0,"X-Packet-URI":54})}(e,n,function(e,n){r||(e?(a.push(e),a.length>=o.length&&t&&t("ALL_REQUEST_FAILED")):(r=!0,t&&t(null,n)))})})},ye=function(e,t,n,i){var r=(new Date).getTime(),s="";t.multiIP&&t.multiIP.gateway_ip&&(s={vocs_ip:[t.multiIP.uni_lbs_ip],vos_ip:[t.multiIP.gateway_ip]});var d={flag:4,ts:+new Date,key:t.appId,cname:t.cname,detail:{},uid:t.uid||0};s&&(d.detail[5]=JSON.stringify(s)),Object(fe.c)(e,d,function(s){try{var d=JSON.parse(s).res,c=d.code}catch(e){var u="requestChooseServer failed with unexpected body "+s;return o.default.error("["+joinInfo.clientId+"]",u),i(u)}if(c){var l=y[d.code]||c;return a.b.joinChooseServer(t.sid,{lts:r,succ:!1,csAddr:e,serverList:null,ec:l}),i("Get server node failed ["+l+"]",e,l)}var p=[],f=[".agora.io",".agoraio.cn"],m=0;if(e.indexOf(f[1])>-1&&(m=1),d.addresses.forEach(function(e){var t;e.ip&&e.port?(e.ip.match(/^[\.\:\d]+$/)?t="webrtc-".concat(e.ip.replace(/[^\d]/g,"-")).concat(f[m++%f.length],":").concat(e.port):(o.default.info("["+joinInfo.clientId+"] "+"Cannot recognized as IP address ".concat(e.ip,". Used As Host instead")),t="".concat(e.ip,":").concat(e.port)),p.push(t)):o.default.error("["+joinInfo.clientId+"] Invalid address format ",e)}),!p.length){o.default.error("["+joinInfo.clientId+"] Empty Address response",d);l="EMPTY_ADDRESS_RESPONSE";return a.b.joinChooseServer(t.sid,{lts:r,succ:!1,csAddr:e,serverList:null,ec:l}),i("Get server node failed ["+l+"]",e,l)}var g={gateway_addr:p,uid:d.uid,cid:d.cid,uni_lbs_ip:d.detail};return n(g,e)},function(e,n){"timeout"===e.type?(a.b.joinChooseServer(t.sid,{lts:r,succ:!1,csAddr:n,serverList:null,ec:"timeout"}),i("Connect choose server timeout",n)):a.b.joinChooseServer(t.sid,{lts:r,succ:!1,csAddr:n,serverList:null,ec:"server_wrong"})},{"X-Packet-Service-Type":0,"X-Packet-URI":44})},be=function(e,t,n){var r=!1,s=null,d=1,c=1,u=null,l=function t(n,c){if(!r){var l=!1,f=!1,m=[],g=p.getBrowserInfo()||{};he({device:g.name,system:g.os,vendor:e.appId,version:i.VERSION,cname:e.cname,sid:e.sid,session_id:Object(a.a)(),detail:"",proxyServer:n},function(t,n){f=!0;try{var i=Object.keys(n.test_tags)[0],o=JSON.parse(n.test_tags[i]);u=o[1]}catch(e){u=null}a.b.reportApiInvoke(e.sid,{name:"_config-distribute-request",options:{err:t,res:n}})(),l&&c&&c(m,u)}),function(e,t,n){for(var r=(new Date).getTime(),s=!1,d=!0,c=function(n,i){if(s)a.b.joinChooseServer(e.sid,{lts:r,succ:!0,csAddr:i,serverList:n.gateway_addr,cid:n.cid+"",uid:n.uid+"",ec:null},!1);else{if(clearTimeout(g),s=!0,o.default.debug("["+e.clientId+"] Get gateway address:",n.gateway_addr),e.proxyServer){for(var d=n.gateway_addr,c=0;c<d.length;c++){var u=d[c].split(":");n.gateway_addr[c]=e.proxyServer+"/ws/?h="+u[0]+"&p="+u[1]}o.default.debug("["+e.clientId+"] Get gateway address:",n.gateway_addr)}t(n),a.b.joinChooseServer(e.sid,{lts:r,succ:!0,csAddr:i,serverList:n.gateway_addr,cid:n.cid+"",uid:n.uid+"",ec:null},!0)}},u=function(t,i,a){d&&(o.default.error("["+e.clientId+"]",t,i,a),a&&!E.includes(a)&&(d=!1,n(a)))},l=Object(i.getParameter)("WEBCS_DOMAIN"),p=0;p<l.length;++p){var f;if("string"==typeof l[p]){var m=l[p];f=e.proxyServer?"https://".concat(e.proxyServer,"/ap/?url=").concat(m+"/api/v1"):"https://".concat(m,"/api/v1"),o.default.debug("["+e.clientId+"] "+"Connect to choose_server: ".concat(f)),ye(f,e,c,u)}else o.default.error("["+e.clientId+"] Invalid Host",l[p])}var g=setTimeout(function(){if(!s)for(var t=Object(i.getParameter)("WEBCS_DOMAIN_BACKUP_LIST"),n=0;n<t.length;++n)if("string"==typeof t[n]){var a=t[n];f=e.proxyServer?"https://".concat(e.proxyServer,"/ap/?url=").concat(a+"/api/v1"):"https://".concat(a,"/api/v1"),o.default.debug("["+e.clientId+"] "+"Connect to backup_choose_server: ".concat(f)),ye(f,e,c,u)}else o.default.error("["+e.clientId+"] Invalid Host",t[n])},1e3);setTimeout(function(){!s&&d&&n()},Object(i.getParameter)("WEBCS_BACKUP_CONNECT_TIMEOUT"))}(e,function(e){r=!0,l=!0,m=e,clearTimeout(s),f&&c&&c(m,u)},function(i){i?o.default.info("["+e.clientId+"] Join failed: "+i):(o.default.debug("["+e.clientId+"] Request gateway list will be restart in "+d+"s"),s=setTimeout(function(){t(n,c)},1e3*d),d=d>=3600?3600:2*d)})}};e.useProxyServer?function n(){!function(e,t){ve(e,function(n,i){if(n)return t&&t(n);o.default.debug("["+e.clientId+"] getProxyServerList: ",i),Ie(e,i,t)})}(e,function(i,r){if(i)return o.default.debug("["+e.clientId+"]",i),o.default.debug("["+e.clientId+"] Request proxy will be restart in "+c+"s"),s=setTimeout(function(){n()},1e3*c),void(c=c>=3600?3600:2*c);clearTimeout(s);var d=r.address;e.proxyServer=d,e.turnServer={url:r.address,tcpport:r.serverResponse.tcpport||"3433",udpport:r.serverResponse.udpport||"3478",username:r.serverResponse.username||"test",credential:r.serverResponse.password||"111111",forceturn:!0},e.turnServer.tcpport+="",e.turnServer.udpport+="",a.b.setProxyServer(d),o.default.setProxyServer(d),l(d,t)})}():l(null,t)},Ee={ERR_NO_VOCS_AVAILABLE:"tryNext",ERR_NO_VOS_AVAILABLE:"tryNext",ERR_JOIN_CHANNEL_TIMEOUT:"tryNext",WARN_REPEAT_JOIN:"quit",ERR_JOIN_BY_MULTI_IP:"recover",WARN_LOOKUP_CHANNEL_TIMEOUT:"tryNext",WARN_OPEN_CHANNEL_TIMEOUT:"tryNext",ERR_VOM_SERVICE_UNAVAILABLE:"tryNext",ERR_TOO_MANY_USERS:"tryNext",ERR_MASTER_VOCS_UNAVAILABLE:"tryNext",ERR_INTERNAL_ERROR:"tryNext",notification_test_recover:"recover",notification_test_tryNext:"tryNext",notification_test_retry:"retry"},Re={googResidualEchoLikelihood:"A_rel",googResidualEchoLikelihoodRecentMax:"A_rem",googTypingNoiseState:"A_tns",totalSamplesDuration:"A_sd",googAdaptationChanges:"A_ac",googBandwidthLimitedResolution:"A_blr",googCpuLimitedResolution:"A_clr",googEncodeUsagePercent:"A_eup",googHasEnteredLowResolution:"A_helr",googActualEncBitrate:"A_aeb",googAvailableReceiveBandwidth:"A_arb",googAvailableSendBandwidth:"A_asb",googRetransmitBitrate:"A_rb",googTargetEncBitrate:"A_teb",googCaptureStartNtpTimeMs:"A_csnt",googPreemptiveExpandRate:"A_per",googPreferredJitterBufferMs:"A_pjbm",googSecondaryDecodedRate:"A_sder",googSecondaryDiscardedRate:"A_sdir",googSpeechExpandRate:"A_ser",googFrameHeightReceived:"A_fhr",googInterframeDelayMax:"A_ifdm",googMinPlayoutDelayMs:"A_mpdm",aecDivergentFilterFraction:"A_dff",codecImplementationName:"A_cin",googEchoCancellationReturnLoss:"A_ecl",googEchoCancellationReturnLossEnhancement:"A_ece"},Ae={};for(var Te in Re){var Oe=Re[Te];Re[Oe]&&console.error("Key Conflict: ".concat(Te)),Ae[Oe]=Te}var Ce=function(e){return Re[e]||e},Ne=function e(t){var n=!1,s=function(e){return{_type:"control",message:e}},u=function(e){var t={};return Object.keys(e).forEach(function(n){t[Ce(n)]=e[n]}),{_type:"subscribe_related_stats",options:t}},f=function(e,t,n){return{_type:"publish",options:e,sdp:t,p2pid:n}},m=e.DISCONNECTED,g=e.CONNECTING,S=e.CONNECTED,_=e.DISCONNECTING,h=m,y=r();Object.defineProperty(y,"state",{set:function(t){var n=h;h=t,n!==t&&y.dispatchEvent({type:"connection-state-change",prevState:e.connetionStateMap[n],curState:e.connetionStateMap[t]})},get:function(){return h}}),y.socket=void 0,y.state=m,y.mode=t.mode,y.role=t.role,y.codec=t.codec,y.config={},y.timers={},y.timer_counter={},y.localStreams={},y.remoteStreams={},y.attemps=1,y.p2p_attemps=1,y.audioLevel={},y.activeSpeaker=void 0,y.reconnectMode="retry",y.rejoinAttempt=0,y.hasChangeBGPAddress=!1,y.traffic_stats={},y.clientId=t.clientId,y.p2ps=new Map,y.firstFrameTimer=new Map,y.firstAudioDecodeTimer=new Map,y.liveStreams=new Map,y.injectLiveStreams=new Map,y.remoteStreamsInChannel=new Set,y.inChannelInfo={joinAt:null,duration:0};var E=pe;y.p2pCounter=Object(G.g)(1e5),y.generateP2PId=function(){return++y.p2pCounter},y.audioVolumeIndication={enabled:!1,sortedAudioVolumes:[],smooth:3,interval:2e3},y.remoteVideoStreamTypes={REMOTE_VIDEO_STREAM_HIGH:0,REMOTE_VIDEO_STREAM_LOW:1,REMOTE_VIDEO_STREAM_MEDIUM:2},y.streamFallbackTypes={STREAM_FALLBACK_OPTION_DISABLED:0,STREAM_FALLBACK_OPTION_VIDEO_STREAM_LOW:1,STREAM_FALLBACK_OPTION_AUDIO_ONLY:2},y.configPublisher=function(e){y.config=e},y.getGatewayInfo=function(e,t){N({_type:"gateway_info"},e,t)},y.setClientRole=function(e,t){o.default.debug("[".concat(y.clientId,"] setClientRole to ").concat(e));var n=a.b.reportApiInvoke(y.joinInfo.sid,{name:"_setClientRole",callback:t});N(function(e){return{_type:"set_client_role",message:e}}(e),function(){y.role=e,y.dispatchEvent({type:"client-role-changed",role:e}),n&&n(null,{role:e})},function(t){var i=t&&t.code?t.code:0,a=R[i];if("ERR_ALREADY_IN_USE"===a)return n&&n(null);a||(a="UNKNOW_ERROR_".concat(i)),o.default.error("set Client role error to "+e+": "+a),n&&n(a)})},y.join=function(e,n,r,s){e.useProxyServer&&(y.hasChangeBGPAddress=!0);var d=(new Date).getTime(),c=e.uid;if(y.inChannelInfo.joinAt&&(y.inChannelInfo.duration+=d-y.inChannelInfo.joinAt),y.inChannelInfo.joinAt=d,y.state!==g)return o.default.error("[".concat(y.clientId,"] GatewayClient.join Failed: state "),y.state),s&&s(A.INVALID_OPERATION),void a.b.joinGateway(e.sid,{lts:d,succ:!1,ec:A.INVALID_OPERATION,addr:null});if(null!=c&&parseInt(c)!==c)return o.default.error("[".concat(y.clientId,"] Input uid is invalid")),y.state=m,s&&s(A.INVALID_PARAMETER),void a.b.joinGateway(e.sid,{lts:d,succ:!1,ec:A.INVALID_PARAMETER,addr:null});var u=we.register(y,{uid:c,cname:e&&e.cname});if(u)return y.state=m,s&&s(u),void a.b.joinGateway(e.sid,{lts:d,succ:!1,ec:u,addr:null});y.joinInfo=I()({},e),y.uid=c,y.key=n,C(e,function(n){var c,u,l;y.state=S,o.default.debug("[".concat(y.clientId,"] Connected to gateway server")),y.pingTimer=setInterval(function(){var e=Date.now();N({_type:"ping"},function(){var t=Date.now()-e;N({_type:"signal_stats",message:{pingpongElapse:t}},function(){},function(e){})},function(e){})},3e3),N((c={role:y.role},u=c.role,l={appId:t.appId,key:y.key,channel:y.joinInfo.cname,uid:y.uid,version:i.VERSION,browser:navigator.userAgent,mode:y.mode,codec:y.codec,role:u,config:y.config,processId:Object(a.a)()},y.joinInfo.hasOwnProperty("stringUid")&&(l.stringUid=y.joinInfo.stringUid),{_type:"join1",message:l}),function(t){if(a.b.joinGateway(e.sid,{lts:d,succ:!0,ec:null,vid:t.vid,addr:y.socket.getURL()}),y.rejoinAttempt=0,r&&r(t.uid),y.dispatchEvent({type:"join"}),y.leaveOnConnected){o.default.info("[".concat(y.clientId,"] Calling Leave() once joined"));var n=y.leaveOnConnected;y.leaveOnConnected=null,y.leave(n.onSuccess,n.onFailure)}},function(t){if(o.default.error("[".concat(y.clientId,"] User join failed [").concat(t,"]")),Ee[t]&&y.rejoinAttempt<4){if(y._doWithAction(Ee[t],r,s),y.leaveOnConnected){o.default.error("[".concat(y.clientId,"] Calling Leave() once joined: Join Failed"));var n=y.leaveOnConnected;y.leaveOnConnected=null,n.onFailure(A.JOIN_CHANNEL_FAILED)}}else s&&s(t);a.b.joinGateway(e.sid,{lts:d,succ:!1,ec:t,addr:y.socket.getURL()})})},function(t){o.default.error("[".concat(y.clientId,"] User join failed [").concat(t,"]")),s&&s(t),a.b.joinGateway(e.sid,{lts:d,succ:!1,ec:t,addr:y.socket.getURL()})}),clearInterval(y.timers.trafficStats),y.timers.trafficStats=setInterval(function(){N({_type:"traffic_stats"},function(e){y.traffic_stats=e;var t=y.joinInfo.stringUid,n=y.localStreams[c]||y.localStreams[t];n&&(n.traffic_stats={access_delay:e.access_delay}),e.peer_delay&&e.peer_delay.forEach(function(t){var n=y.remoteStreams[t.peer_uid];n&&(n.traffic_stats={access_delay:e.access_delay,e2e_delay:t.e2e_delay,audio_delay:t.audio_delay,video_delay:t.video_delay})})})},3e3),y.resetAudioVolumeIndication()},y.leave=function(e,t){switch(y.state){case m:return o.default.debug("[".concat(y.clientId,"] Client Already in DISCONNECTED status")),void E(e);case _:return o.default.error("[".concat(y.clientId,"] Client Already in DISCONNECTING status")),void E(t,A.INVALID_OPERATION);case g:return y.leaveOnConnected?(o.default.error("[".concat(y.clientId,"] Client.leave() already called")),void E(t,A.INVALID_OPERATION)):(o.default.debug("[".concat(y.clientId,"] Client connecting. Waiting for Client Fully Connected(And leave)")),void(y.leaveOnConnected={onSuccess:e,onFailure:t}))}var n=we.unregister(y);if(n)o.default.error("[".concat(y.clientId,"] "),n);else{for(var i in y.state=_,clearInterval(y.pingTimer),y.timers)y.timers.hasOwnProperty(i)&&clearInterval(y.timers[i]);for(var i in y.inChannelInfo.joinAt&&(y.inChannelInfo.duration+=Date.now()-y.inChannelInfo.joinAt,y.inChannelInfo.joinAt=null),N({_type:"leave"},function(t){y.socket.close(),y.socket=void 0,o.default.info("[".concat(y.clientId,"] Leave channel success")),y.state=m,e&&e(t)},function(e){o.default.error("[".concat(y.clientId,"] Leave Channel Failed"),e),y.state=S,t&&t(e)}),y.localStreams)if(y.localStreams.hasOwnProperty(i)){var a=y.localStreams[i];delete y.localStreams[i],void 0!==a.pc&&(a.pc.close(),a.pc=void 0)}k()}},y.publish=function(e,t,n,i){var r=(new Date).getTime(),d=!1;if(e.publishLTS=r,"object"!==v()(e)||null===e)return o.default.error("[".concat(y.clientId,"] Invalid local stream")),i&&i(A.INVALID_LOCAL_STREAM),void a.b.publish(y.joinInfo.sid,{lts:r,succ:!1,audioName:e.hasAudio()&&e.audioName,videoName:e.hasVideo()&&e.videoName,screenName:e.hasScreen()&&e.screenName,ec:A.INVALID_LOCAL_STREAM});if(null===e.stream&&void 0===e.url)return o.default.error("[".concat(y.clientId,"] Invalid local media stream")),i&&i(A.INVALID_LOCAL_STREAM),void a.b.publish(y.joinInfo.sid,{lts:r,succ:!1,audioName:e.hasAudio()&&e.audioName,videoName:e.hasVideo()&&e.videoName,screenName:e.hasScreen()&&e.screenName,ec:A.INVALID_LOCAL_STREAM});if(y.state!==S)return o.default.error("[".concat(y.clientId,"] User is not in the session")),i&&i(A.INVALID_OPERATION),void a.b.publish(y.joinInfo.sid,{lts:r,succ:!1,audioName:e.hasAudio()&&e.audioName,videoName:e.hasVideo()&&e.videoName,screenName:e.hasScreen()&&e.screenName,ec:A.INVALID_OPERATION});var u=e.getAttributes()||{};if(e.local&&void 0===y.localStreams[e.getId()]&&(e.hasAudio()||e.hasVideo()||e.hasScreen())){var l=y.generateP2PId();if(y.p2ps.set(l,e),e.p2pId=l,void 0!==e.url)w(f({state:"url",audio:e.hasAudio(),video:e.hasVideo(),attributes:e.getAttributes(),mode:y.mode},e.url),function(t,n){"success"===t?(e.getUserId()!==n&&e.setUserId(n),y.localStreams[n]=e,e.onClose=function(){y.unpublish(e)}):o.default.error("[".concat(y.clientId,"] Publish local stream failed"),t)});else{y.localStreams[e.getId()]=e,e.connectionSpec={callback:function(u){o.default.debug("[".concat(y.clientId,"] SDP exchange in publish : send offer --  "),JSON.parse(u)),w(f({state:"offer",id:e.getId(),audio:e.hasAudio(),video:e.hasVideo()||e.hasScreen(),attributes:e.getAttributes(),streamType:t.streamType,dtx:e.DTX,hq:e.highQuality,lq:e.lowQuality,stereo:e.stereo,speech:e.speech,mode:y.mode,codec:y.codec,p2pid:l,turnip:y.joinInfo.turnServer.url,turnport:Number(y.joinInfo.turnServer.udpport),turnusername:y.joinInfo.turnServer.username,turnpassword:y.joinInfo.turnServer.credential},u),function(p,m){if("error"===p)return o.default.error("[".concat(y.clientId,"] Publish local stream failed")),i&&i(A.PUBLISH_STREAM_FAILED),void a.b.publish(y.joinInfo.sid,{lts:r,succ:!1,audioName:e.hasAudio()&&e.audioName,videoName:e.hasVideo()&&e.videoName,screenName:e.hasScreen()&&e.screenName,localSDP:u,ec:A.PUBLISH_STREAM_FAILED});e.pc.onsignalingmessage=function(n){e.pc.onsignalingmessage=function(){},w(f({state:"ok",id:e.getId(),audio:e.hasAudio(),video:e.hasVideo(),screen:e.hasScreen(),streamType:t.streamType,attributes:e.getAttributes(),mode:y.mode},n)),e.getUserId()!==m.id&&e.setUserId(m.id),o.default.info("[".concat(y.clientId,"] Local stream published with uid"),m.id),e.onClose=function(){y.unpublish(e)},e._onAudioUnmute=function(){N(s({action:"audio-out-on",streamId:e.getId()}),function(){},function(){})},e._onVideoUnmute=function(){N(s({action:"video-out-on",streamId:e.getId()}),function(){},function(){})},e._onAudioMute=function(){N(s({action:"audio-out-off",streamId:e.getId()}),function(){},function(){})},e._onVideoMute=function(){N(s({action:"video-out-off",streamId:e.getId()}),function(){},function(){})},e.getId()===e.getUserId()&&(e.isAudioOn()||e.hasAudio()&&(o.default.debug("[".concat(y.clientId,"] local stream audio mute")),e._onAudioMute()),e.isVideoOn()||(e.hasVideo()||e.hasScreen())&&(o.default.debug("[".concat(y.clientId,"] local stream video mute")),e._onVideoMute()))},e.pc.oniceconnectionstatechange=function(t){if("failed"===t){if(null!=y.timers[e.getId()]&&(clearInterval(y.timers[e.getId()]),clearInterval(y.timers[e.getId()]+"_RelatedStats")),o.default.error("[".concat(y.clientId,"] Publisher connection is lost -- streamId: ").concat(e.getId(),", p2pId: ").concat(l)),y.p2ps.delete(l),o.default.debug("[".concat(y.clientId,"] publish p2p failed: "),y.p2ps),!d)return d=!0,a.b.publish(y.joinInfo.sid,{lts:r,succ:!1,audioName:e.hasAudio()&&e.audioName,videoName:e.hasVideo()&&e.videoName,screenName:e.hasScreen()&&e.screenName,ec:A.PEERCONNECTION_FAILED}),y.dispatchEvent(c({type:"pubP2PLost",stream:e})),i&&i(A.PEERCONNECTION_FAILED);y.dispatchEvent(c({type:"pubP2PLost",stream:e}))}else if("connected"===t&&(o.default.debug("[".concat(y.clientId,"] publish p2p connected: "),y.p2ps),!d))return d=!0,a.b.publish(y.joinInfo.sid,{lts:r,succ:!0,audioName:e.hasAudio()&&e.audioName,videoName:e.hasVideo()&&e.videoName,screenName:e.hasScreen()&&e.screenName,ec:null}),n&&n()},o.default.debug("[".concat(y.clientId,"] SDP exchange in publish : receive answer --  "),JSON.parse(p)),e.pc.processSignalingMessage(p)})},audio:e.hasAudio(),video:e.hasVideo(),screen:e.hasScreen(),isSubscriber:!1,stunServerUrl:y.stunServerUrl,turnServer:y.joinInfo.turnServer,maxAudioBW:u.maxAudioBW,minVideoBW:u.minVideoBW,maxVideoBW:u.maxVideoBW,mode:y.mode,codec:y.codec,isVideoMute:e.userMuteVideo||e.peerMuteVideo,isAudioMute:e.userMuteAudio||e.peerMuteAudio,maxFrameRate:e.attributes.maxFrameRate,clientId:y.clientId},e.pc=W(e.connectionSpec),e.pc.addStream(e.stream),o.default.debug("[".concat(y.clientId,"] PeerConnection add stream :"),e.stream),e.pc.onnegotiationneeded=function(t){w(f({state:"negotiation",p2pid:l},t),function(t,n){e.pc.processSignalingMessage(t)})},y.timers[e.getId()]=setInterval(function(){var t=0;e&&e.pc&&e.pc.getStats&&e.pc.getStatsRate(function(n){n.forEach(function(n){if(n&&n.id&&!/_recv$/.test(n.id)&&!/^time$/.test(n.id)&&e.getUserId())if(-1===n.id.indexOf("outbound_rtp")&&-1===n.id.indexOf("OutboundRTP")||"video"!==n.mediaType||(n.googFrameWidthSent=e.videoWidth+"",n.googFrameHeightSent=e.videoHeight+""),e.getId()==e.getUserId()){var i=200*t;t++,setTimeout(function(){var e,t;N((e=n,t={},Object.keys(e).forEach(function(n){t[Ce(n)]=e[n]}),{_type:"publish_stats",options:{stats:t},sdp:null}),null,null)},i)}else{i=200*t;t++,setTimeout(function(){var e,t;N((e=n,t={},Object.keys(e).forEach(function(n){t[Ce(n)]=e[n]}),{_type:"publish_stats_low",options:{stats:t},sdp:null}),null,null)},i)}})})},3e3);var p=function(){e&&e.pc&&e.pc.getVideoRelatedStats&&e.pc.getVideoRelatedStats(function(t){var n,i;e.getId()===e.getUserId()?N((n=t,i={},Object.keys(n).forEach(function(e){i[Ce(e)]=n[e]}),{_type:"publish_related_stats",options:i}),null,null):N(function(e){var t={};return Object.keys(e).forEach(function(n){t[Ce(n)]=e[n]}),{_type:"publish_related_stats_low",options:t}}(t),null,null)})};p(),y.timers[e.getId()+"_RelatedStats"]=setInterval(p,1e3)}}},y.unpublish=function(e,t,n,i){return"object"!==v()(e)||null===e?(o.default.error("[".concat(y.clientId,"] Invalid local stream")),void E(i,A.INVALID_LOCAL_STREAM)):y.state!==S?(o.default.error("[".concat(y.clientId,"] User not in the session")),void E(i,A.INVALID_OPERATION)):(null!=y.timers[e.getId()]&&(clearInterval(y.timers[e.getId()]),clearInterval(y.timers[e.getId()+"_RelatedStats"])),void(void 0!==y.socket?e.local&&void 0!==y.localStreams[e.getId()]?(delete y.localStreams[e.getId()],N((a=e.getUserId(),r=t.streamType,{_type:"unpublish",message:a,streamType:r})),(e.hasAudio()||e.hasVideo()||e.hasScreen())&&void 0===e.url&&void 0!==e.pc&&(e.pc.close(),e.pc=void 0),e.onClose=void 0,e._onAudioMute=void 0,e._onAudioUnute=void 0,e._onVideoMute=void 0,e._onVideoUnmute=void 0,y.p2ps.delete(e.p2pId),n&&n()):(o.default.error("[".concat(y.clientId,"] Invalid local stream")),E(i,A.INVALID_LOCAL_STREAM)):(o.default.error("[".concat(y.clientId,"] User not in the session")),E(i,A.INVALID_OPERATION))));var a,r},y.subscribe=function(e,t,n){var i=(new Date).getTime();e.subscribeLTS=i;var r=!1;if(o.default.info("[".concat(y.clientId,"] Gatewayclient ").concat(y.uid," Subscribe ").concat(e.getId(),": ").concat(JSON.stringify(e.subscribeOptions))),"object"!==v()(e)||null===e)return o.default.error("[".concat(y.clientId,"] Invalid remote stream")),n&&n(A.INVALID_REMOTE_STREAM),void a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!1,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:A.INVALID_REMOTE_STREAM});if(y.state!==S&&(o.default.error("[".concat(y.clientId,"] User is not in the session")),!r))return r=!0,a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!1,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:A.INVALID_OPERATION}),n&&n(A.INVALID_OPERATION);if(!e.local&&y.remoteStreams.hasOwnProperty(e.getId()))if(e.hasAudio()||e.hasVideo()||e.hasScreen()){var l=y.generateP2PId();y.p2ps.set(l,e),e.p2pId=l,e.pc=W({callback:function(t){o.default.debug("[".concat(y.clientId,"] SDP exchange in subscribe : send offer --  "),JSON.parse(t));var r,s=I()({streamId:e.getId(),video:!0,audio:!0,mode:y.mode,codec:y.codec,p2pid:l,turnip:y.joinInfo.turnServer.url,turnport:Number(y.joinInfo.turnServer.udpport),turnusername:y.joinInfo.turnServer.username,turnpassword:y.joinInfo.turnServer.credential},e.subscribeOptions);w({_type:"subscribe",options:s,sdp:t,p2pid:r},function(t){if("error"===t)return o.default.error("[".concat(y.clientId,"] Subscribe remote stream failed, closing stream "),e.getId()),e.close(),n&&n(A.SUBSCRIBE_STREAM_FAILED),void a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!1,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:A.SUBSCRIBE_STREAM_FAILED});o.default.debug("[".concat(y.clientId,"] SDP exchange in subscribe : receive answer --  "),JSON.parse(t)),e.pc.processSignalingMessage(t)})},nop2p:!0,audio:!0,video:!0,screen:e.hasScreen(),isSubscriber:!0,stunServerUrl:y.stunServerUrl,turnServer:y.joinInfo.turnServer,isVideoMute:e.userMuteVideo,isAudioMute:e.userMuteAudio,uid:e.getId(),clientId:y.clientId}),e.pc.onaddstream=function(t,n){if(e._onAudioUnmute=function(){N(s({action:"audio-in-on",streamId:e.getId()}),function(){},function(){})},e._onAudioMute=function(){N(s({action:"audio-in-off",streamId:e.getId()}),function(){},function(){})},e._onVideoUnmute=function(){N(s({action:"video-in-on",streamId:e.getId()}),function(){},function(){})},e._onVideoMute=function(){N(s({action:"video-in-off",streamId:e.getId()}),function(){},function(){})},"ontrack"===n&&"video"===t.track.kind||"onaddstream"===n){o.default.info("[".concat(y.clientId,"] Remote stream subscribed with uid "),e.getId());var i=y.remoteStreams[e.getId()];if(y.remoteStreams[e.getId()].stream="onaddstream"===n?t.stream:t.streams[0],y.remoteStreams[e.getId()].hasVideo()){if(Object(p.isFireFox)()||Object(p.isSafari)()){var a=y.remoteStreams[e.getId()].stream;Object(G.h)(a,function(t,n){e.videoWidth=t,e.videoHeight=n},function(e){return o.default.warning("[".concat(y.clientId,"] vsResHack failed: ")+e)})}}else{var r=y.remoteStreams[e.getId()];r.peerMuteVideo=!0,y._adjustPCMuteStatus(r)}i&&i.isPlaying()&&i.elementID&&(o.default.debug("[".concat(y.clientId,"] Reload Player ").concat(i.elementID," StreamId ").concat(i.getId())),e.audioOutput=i.audioOutput,i.stop(),e.play(i.elementID,i.playOptions));var c=d({type:"stream-subscribed",stream:y.remoteStreams[e.getId()]});y.dispatchEvent(c)}},y.timers[e.getId()]=setInterval(function(){var t=0;e&&e.pc&&e.pc.getStats&&e.pc.getStatsRate(function(n){n.forEach(function(n){if(n&&n.id){if(/_send$/.test(n.id)||/^time$/.test(n.id)||/^bweforvideo$/.test(n.id))return;-1===n.id.indexOf("inbound_rtp")&&-1===n.id.indexOf("inbound-rtp")||"video"!==n.mediaType||(n.googFrameWidthReceived=e.videoWidth+"",n.googFrameHeightReceived=e.videoHeight+"");var i=200*t;t++;var o=e.getId();setTimeout(function(){var e,t,i;w((e=o,t=n,i={},Object.keys(t).forEach(function(e){i[Ce(e)]=t[e]}),{_type:"subscribe_stats",options:{id:e,stats:i},sdp:null}),null,null)},i)}else;})})},3e3),y.timers[e.getId()+"_RelatedStats"]=setInterval(function(){e&&e.pc&&(e.pc.getVideoRelatedStats&&e.pc.getVideoRelatedStats(function(e){N(u(e),null,null)}),e.pc.getAudioRelatedStats&&e.pc.getAudioRelatedStats(function(e){N(u(e),null,null)}))},1e3),y.audioLevel[e.getId()]=0,y.timers[e.getId()+"audio"]=setInterval(function(){y.hasListeners("active-speaker")&&e&&e.pc&&"established"===e.pc.state&&e.pc.getStats&&e.pc.getStats(function(t){t.forEach(function(t){if("audio"===t.mediaType){if(t.audioOutputLevel>5e3)for(var n in y.audioLevel[e.getId()]<20&&(y.audioLevel[e.getId()]+=1),y.audioLevel)n!==""+e.getId()&&y.audioLevel[n]>0&&(y.audioLevel[n]-=1);var i=Object.keys(y.audioLevel).sort(function(e,t){return y.audioLevel[t]-y.audioLevel[e]});if(y.activeSpeaker!==i[0]){var a=c({type:"active-speaker",uid:i[0]});y.dispatchEvent(a),y.activeSpeaker=i[0],o.default.debug("[".concat(y.clientId,"] Update active speaker: ").concat(y.activeSpeaker))}}})})},50),e.pc.oniceconnectionstatechange=function(s){if("failed"===s)null!=y.timers[e.getId()]&&(clearInterval(y.timers[e.getId()]),clearInterval(y.timers[e.getId()]+"audio")),o.default.error("[".concat(y.clientId,"] Subscriber connection is lost -- streamId: ").concat(e.getId(),", p2pId: ").concat(l)),o.default.debug("[".concat(y.clientId,"] subscribe p2p failed: "),y.p2ps),r||(r=!0,n&&n(A.PEERCONNECTION_FAILED),a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!1,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:A.PEERCONNECTION_FAILED})),y.remoteStreams[e.getId()]&&y.p2ps.has(l)&&(y.p2ps.delete(l),y.dispatchEvent(c({type:"subP2PLost",stream:e})));else if("connected"===s&&(o.default.debug("[".concat(y.clientId,"] subscribe p2p connected: "),y.p2ps),!r))return r=!0,a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!0,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:null}),y._adjustPCMuteStatus(e),y.firstAudioDecodeTimer.set(e.getId(),setInterval(function(){e.pc?e.pc.getStats(function(t){t.forEach(function(t){-1!==t.id.indexOf("recv")&&"audio"===t.mediaType&&parseInt(t.googDecodingNormal)>0&&(clearInterval(y.firstAudioDecodeTimer.get(e.getId())),y.firstAudioDecodeTimer.delete(e.getId()),a.b.reportApiInvoke(y.joinInfo.sid,{name:"firstAudioDecode"})(null,{elapse:Date.now()-e.subscribeLTS}))})}):(clearInterval(y.firstAudioDecodeTimer.get(e.getId())),y.firstAudioDecodeTimer.delete(e.getId()))},100)),y.firstFrameTimer.set(e.getId(),setInterval(function(){e.pc?e.pc.getStats(function(t){t.forEach(function(t){-1===t.id.indexOf("recv")&&-1===t.id.indexOf("inbound_rtp")&&-1===t.id.indexOf("inbound-rtp")&&-1===t.id.indexOf("InboundRTP")||"video"===t.mediaType&&(t.framesDecoded>0||t.googFramesDecoded>0)&&(clearInterval(y.firstFrameTimer.get(e.getId())),y.firstFrameTimer.delete(e.getId()),e.firstFrameTime=(new Date).getTime()-e.subscribeLTS,a.b.firstRemoteFrame(y.joinInfo.sid,{lts:(new Date).getTime(),peerid:e.getId(),succ:!0,width:+t.googFrameWidthReceived,height:+t.googFrameHeightReceived}))})}):(clearInterval(y.firstFrameTimer.get(e.getId())),y.firstFrameTimer.delete(e.getId()))},100)),e.sid=y.joinInfo.sid,t&&t()}}else o.default.error("[".concat(y.clientId,"] Invalid remote stream")),r||(r=!0,n&&n(A.INVALID_REMOTE_STREAM),a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!1,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:A.INVALID_REMOTE_STREAM}));else o.default.error("[".concat(y.clientId,"] No such remote stream")),r||(r=!0,n&&n(A.NO_SUCH_REMOTE_STREAM),a.b.subscribe(y.joinInfo.sid,{lts:i,succ:!1,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:A.NO_SUCH_REMOTE_STREAM}))},y.subscribeChange=function(e,t,n){var i,r,s=Date.now();o.default.info("[".concat(y.clientId,"] Gatewayclient ").concat(y.uid," SubscribeChange ").concat(e.getId(),": ").concat(JSON.stringify(e.subscribeOptions))),y._adjustPCMuteStatus(e),N((i=e.getId(),r=e.subscribeOptions,{_type:"subscribe_change",options:I()({streamId:i},r)}),function(i){if("error"===i)return o.default.error("[".concat(y.clientId,"] Subscribe Change Failed ").concat(e.getId())),void E(n,"SUBSCRIBE_CHANGE_FAILED");var r=d({type:"stream-subscribe-changed",stream:y.remoteStreams[e.getId()]});a.b.subscribe(y.joinInfo.sid,{lts:s,succ:!0,video:e.subscribeOptions&&e.subscribeOptions.video,audio:e.subscribeOptions&&e.subscribeOptions.audio,peerid:e.getId(),ec:null}),y.dispatchEvent(r),t&&t()},n)},y._adjustPCMuteStatus=function(e){!e.local&&e.pc&&e.pc.peerConnection.getReceivers&&e.pc.peerConnection.getReceivers().forEach(function(t){if(t&&t.track&&"audio"===t.track.kind){var n=!e.userMuteAudio&&!e.peerMuteAudio;e.subscribeOptions&&!e.subscribeOptions.audio&&(n=!1),t.track.enabled=!!n}else if(t&&t.track&&"video"===t.track.kind){var i=!e.userMuteVideo&&!e.peerMuteVideo;e.subscribeOptions&&!e.subscribeOptions.video&&(i=!1),t.track.enabled=!!i}})},y.unsubscribe=function(e,t,n){if("object"!==v()(e)||null===e)return o.default.error("[".concat(y.clientId,"] Invalid remote stream")),void E(n,A.INVALID_REMOTE_STREAM);if(y.state!==S)return o.default.error("[".concat(y.clientId,"] User is not in the session")),void E(n,A.INVALID_OPERATION);if(null!=y.timers[e.getId()]&&(clearInterval(y.timers[e.getId()]),clearInterval(y.timers[e.getId()]+"audio")),null!=y.audioLevel[e.getId()]&&delete y.audioLevel[e.getId()],null!=y.timer_counter[e.getId()]&&delete y.timer_counter[e.getId()],y.remoteStreams.hasOwnProperty(e.getId())){if(!y.socket)return o.default.error("[".concat(y.clientId,"] User is not in the session")),void E(n,A.INVALID_OPERATION);if(e.local)return o.default.error("[".concat(y.clientId,"] Invalid remote stream")),void E(n,A.INVALID_REMOTE_STREAM);e.close(),N({_type:"unsubscribe",message:e.getId()},function(i){if("error"===i)return o.default.error("[".concat(y.clientId,"] Unsubscribe remote stream failed ").concat(e.getId())),void E(n,A.UNSUBSCRIBE_STREAM_FAILED);void 0!==e.pc&&(e.pc.close(),e.pc=void 0),e.onClose=void 0,e._onAudioMute=void 0,e._onAudioUnute=void 0,e._onVideoMute=void 0,e._onVideoUnmute=void 0,delete e.subscribeOptions,y.p2ps.delete(e.p2pId),o.default.info("[".concat(y.clientId,"] Unsubscribe stream success")),t&&t()},n)}else E(n,A.NO_SUCH_REMOTE_STREAM)},y.setRemoteVideoStreamType=function(e,t){if(o.default.debug("[".concat(y.clientId,"] Switching remote video stream ").concat(e.getId()," to ").concat(t)),"object"===v()(e)&&null!==e)if(y.state===S){if(!e.local){switch(t){case y.remoteVideoStreamTypes.REMOTE_VIDEO_STREAM_HIGH:case y.remoteVideoStreamTypes.REMOTE_VIDEO_STREAM_LOW:case y.remoteVideoStreamTypes.REMOTE_VIDEO_STREAM_MEDIUM:break;default:return}N(function(e,t){return{_type:"switchVideoStream",message:{id:e,type:t}}}(e.getId(),t),null,null)}}else o.default.error("[".concat(y.clientId,"] User is not in the session"));else o.default.error("[".concat(y.clientId,"] Invalid remote stream"))},y.renewToken=function(e,t,n){e?y.key?y.state!==S?(o.default.debug("[".concat(y.clientId,"] Client is not connected. Trying to rejoin")),y.key=e,y.rejoin(),t&&t()):(o.default.debug("[".concat(y.clientId,"] renewToken from ").concat(y.key," to ").concat(e)),N(function(e){return{_type:"renew_token",message:{token:e}}}(e),t,n)):(o.default.error("[".concat(y.clientId,"] Client is previously joined without token")),n&&n(A.INVALID_PARAMETER)):(o.default.error("[".concat(y.clientId,"] Invalid Token ").concat(e)),n&&n(A.INVALID_PARAMETER))},y.setStreamFallbackOption=function(e,t){if(o.default.debug("[".concat(y.clientId,"] Set stream fallback option ").concat(e.getId()," to ").concat(t)),"object"===v()(e)&&null!==e)if(y.state===S){if(!e.local){switch(t){case y.streamFallbackTypes.STREAM_FALLBACK_OPTION_DISABLED:case y.streamFallbackTypes.STREAM_FALLBACK_OPTION_VIDEO_STREAM_LOW:case y.streamFallbackTypes.STREAM_FALLBACK_OPTION_AUDIO_ONLY:break;default:return}N(function(e,t){return{_type:"setFallbackOption",message:{id:e,type:t}}}(e.getId(),t),null,null)}}else o.default.error("[".concat(y.clientId,"] User is not in the session"));else o.default.error("[".concat(y.clientId,"] Invalid remote stream"))},y.startLiveStreaming=function(e,t){y.liveStreams.set(e,t),o.default.debug("[".concat(y.clientId,"] Start live streaming ").concat(e," ").concat(t," ").concat(t)),y.state===S?N(function(e,t){return{_type:"start_live_streaming",message:{url:e,transcodingEnabled:t}}}(e,t),null,null):o.default.error("[".concat(y.clientId,"] User is not in the session"))},y.stopLiveStreaming=function(e){o.default.debug("[".concat(y.clientId,"] Stop live streaming ").concat(e)),y.state===S?(y.liveStreams.delete(e),N(function(e){return{_type:"stop_live_streaming",message:{url:e}}}(e),null,null)):o.default.error("[".concat(y.clientId,"] User is not in the session"))},y.setLiveTranscoding=function(e){Object(G.d)(e)&&(y.transcoding=e,o.default.debug("[".concat(y.clientId,"] Set live transcoding "),e),y.state===S?N(function(e){return{_type:"set_live_transcoding",message:{transcoding:e}}}(e),null,null):o.default.error("[".concat(y.clientId,"] User is not in the session")))},y.addInjectStreamUrl=function(e,t){y.injectLiveStreams.set(e,t),o.default.debug("[".concat(y.clientId,"] Add inject stream url ").concat(e," config "),t),y.state===S?N(function(e,t){return{_type:"add_inject_stream_url",message:{url:e,config:t}}}(e,t),null,null):o.default.error("[".concat(y.clientId,"] User is not in the session"))},y.removeInjectStreamUrl=function(e){o.default.debug("[".concat(y.clientId,"] Remove inject stream url ").concat(e)),y.state===S?(y.injectLiveStreams.delete(e),N(function(e){return{_type:"remove_inject_stream_url",message:{url:e}}}(e),null,null)):o.default.error("[".concat(y.clientId,"] User is not in the session"))},y.enableAudioVolumeIndicator=function(e,t){y.audioVolumeIndication.enabled=!0,y.audioVolumeIndication.interval=e,y.audioVolumeIndication.smooth=t,y.resetAudioVolumeIndication()},y.resetAudioVolumeIndication=function(){if(clearInterval(y.timers.audioVolumeIndication),clearInterval(y.timers.audioVolumeSampling),y.audioVolumeIndication.enabled&&y.audioVolumeIndication.interval){var e=Math.floor(1e3*y.audioVolumeIndication.smooth/100);y.timers.audioVolumeSampling=setInterval(function(){y.audioVolumeSampling||(y.audioVolumeSampling={});var t={};for(var n in y.remoteStreams){var i=y.remoteStreams[n];if(i.stream&&i.hasAudio()){var o=i.getAudioLevel();o>0&&o<1&&(o*=100);var a=y.audioVolumeSampling[n]||[];for(a.push(o);a.length>e;)a.shift();t[n]=a}}y.audioVolumeSampling=t},100),y.timers.audioVolumeIndication=setInterval(function(){var e=[];for(var t in y.remoteStreams)if(y.audioVolumeSampling&&y.audioVolumeSampling[t]){var n=y.audioVolumeSampling[t],i=0;n.forEach(function(e){i+=e});var a={uid:t,level:Math.floor(i/n.length)};a.level&&e.push(a)}var r=e.sort(function(e,t){return e.level-t.level});o.default.debug("[".concat(y.clientId,"] volume-indicator "),JSON.stringify(r)),y.audioVolumeIndication.sortedAudioVolumes=r;var s=c({type:"volume-indicator",attr:r});y.dispatchEvent(s)},y.audioVolumeIndication.interval)}},y.closeGateway=function(){o.default.debug("[".concat(y.clientId,"] close gateway")),y.state=m,y.socket.close(),T()};var T=function(){for(var e in y.timers)y.timers.hasOwnProperty(e)&&clearInterval(y.timers[e]);for(var e in y.remoteStreams)if(y.remoteStreams.hasOwnProperty(e)){var t=y.remoteStreams[e],n=c({type:"stream-removed",uid:t.getId(),stream:t});y.dispatchEvent(n)}y.p2ps.clear(),k(),D(),clearInterval(y.pingTimer)};y.rejoin=function(){y.socket&&(clearInterval(y.pingTimer),y.socket.close(),y.socket=void 0),y.state=g,O()};var O=function(e,t){y.dispatchEvent(c({type:"rejoin-start"})),e=e||function(e){o.default.info("[".concat(y.clientId,"] User ").concat(e," is re-joined to ").concat(y.joinInfo.cname)),y.dispatchEvent(c({type:"rejoin"})),y.liveStreams&&y.liveStreams.size&&y.liveStreams.forEach(function(e,t){e&&y.setLiveTranscoding(y.transcoding),y.startLiveStreaming(t,e)}),y.injectLiveStreams&&y.injectLiveStreams.size&&y.injectLiveStreams.forEach(function(e,t){y.addInjectStreamUrl(t,e)})},t=t||function(e){o.default.error("[".concat(y.clientId,"] Re-join to channel failed "),e),y.dispatchEvent(d({type:"error",reason:e}))},y.key?(++y.rejoinAttempt,y.join(y.joinInfo,y.key,e,t)):o.default.error("[".concat(y.clientId,"] Connection recover failed [Invalid channel key]"))},C=function(e,t,i){var r;y.onConnect=t,void 0!==y.socket?(y.dispatchEvent({type:"reconnect"}),"retry"===y.reconnectMode?(o.default.debug("[".concat(y.clientId,"] Retry current gateway")),y.socket.reconnect()):"tryNext"===y.reconnectMode?(o.default.debug("[".concat(y.clientId,"] Try next gateway")),y.socket.connectNext()):"recover"===y.reconnectMode&&(o.default.debug("[".concat(y.clientId,"] Recover gateway")),o.default.debug("[".concat(y.clientId,"] Try to reconnect choose server and get gateway list again ")),be(y.joinInfo,function(e){y.socket.replaceHost(e.gateway_addr)}))):(r=e.gatewayAddr,y.socket=ge(r,{sid:y.joinInfo.sid,clientId:y.clientId}),y.socket.on("onUplinkStats",function(e){y.OutgoingAvailableBandwidth=e.uplink_available_bandwidth,y.localStreams[y.uid]&&(y.localStreams[y.uid].uplinkStats=e)}),y.socket.on("connect",function(){y.dispatchEvent({type:"connected"}),y.attemps=1,N(function(e){var t=e;return e.uni_lbs_ip&&(t=I()(e,{wanip:e.uni_lbs_ip,hasChange:y.hasChangeBGPAddress})),{_type:"token",message:t}}(e),y.onConnect,i)}),y.socket.on("recover",function(){y.state=g,o.default.debug("[".concat(y.clientId,"] Try to reconnect choose server and get gateway list again ")),be(y.joinInfo,function(e){y.socket.replaceHost(e.gateway_addr)})}),y.socket.on("disconnect",function(e){if(y.state!==m){y.state=m;var t=d({type:"error",reason:A.SOCKET_DISCONNECTED});if(y.dispatchEvent(t),0===y.p2ps.size?y.reconnectMode="tryNext":y.reconnectMode="retry",T(),1!=n){var i,a=(i=y.attemps,1e3*Math.min(30,Math.pow(2,i)-1));o.default.error("[".concat(y.clientId,"] Disconnect from server [").concat(e,"], attempt to recover [#").concat(y.attemps,"] after ").concat(a/1e3," seconds"));setTimeout(function(){y.attemps++,y.state=g,O()},a)}}}),y.socket.on("onAddAudioStream",function(e){if(o.default.info("[".concat(y.clientId,"] Newly added audio stream with uid ").concat(e.id)),y.remoteStreamsInChannel.has(e.id)||y.remoteStreamsInChannel.add(e.id),void 0===y.remoteStreams[e.id]){var t=se({streamID:e.id,local:!1,audio:e.audio,video:e.video,screen:e.screen,attributes:e.attributes});y.remoteStreams[e.id]=t;var n=d({type:"stream-added",stream:t});y.dispatchEvent(n)}}),y.socket.on("onUpdateStream",function(e){var t=y.remoteStreams[e.id];if(t){delete e.id,t.audio=e.audio,t.video=e.video,t.screen=e.screen,t.pc&&y._adjustPCMuteStatus(t);var n=d({type:"stream-updated",stream:t});y.dispatchEvent(n)}else o.default.debug("[".concat(y.clientId,"] Ignoring onUpdateStream event before onAddStream for uid ").concat(e.id))}),y.socket.on("onAddVideoStream",function(e){if(o.default.info("[".concat(y.clientId,"] Newly added remote stream with uid ").concat(e.id,".")),y.remoteStreamsInChannel.has(e.id)||y.remoteStreamsInChannel.add(e.id),void 0===y.remoteStreams[e.id]){var t=se({streamID:e.id,local:!1,audio:e.audio,video:e.video,screen:e.screen,attributes:e.attributes});y.remoteStreams[e.id]=t;var n=d({type:"stream-added",stream:t});y.dispatchEvent(n)}else{var i=y.remoteStreams[e.id];if(void 0!==i.stream){if((t=y.remoteStreams[e.id]).video=!0,t._unmuteVideo(),o.default.info("[".concat(y.clientId,"] Stream changed: enable video ").concat(e.id)),t.isPlaying()){var a=t.player.elementID;t.stop(),t.play(a)}}else if(i.p2pId)y.remoteStreams[e.id].video=!0;else{t=se({streamID:e.id,local:!1,audio:!0,video:!0,screen:!1,attributes:e.attributes});y.remoteStreams[e.id]=t,o.default.info("[".concat(y.clientId,"] Stream changed: modify video ").concat(e.id))}}}),y.socket.on("onRemoveStream",function(e){y.remoteStreamsInChannel.has(e.id)&&y.remoteStreamsInChannel.delete(e.id);var t=y.remoteStreams[e.id];if(t){delete y.remoteStreams[e.id];var n=d({type:"stream-removed",stream:t});y.dispatchEvent(n),t.close(),void 0!==t.pc&&(t.pc.close(),t.pc=void 0,y.p2ps.delete(t.p2pId))}else console.log("ERROR stream ",e.id," not found onRemoveStream ",e)}),y.socket.on("onPublishStream",function(e){var t=y.localStreams[e.id],n=d({type:"streamPublished",stream:t});y.dispatchEvent(n)}),y.socket.on("mute_audio",function(e){o.default.info("[".concat(y.clientId,"] rcv peer mute audio: ").concat(e.peerid));var t=c({type:"mute-audio",uid:e.peerid}),n=y.remoteStreams[e.peerid];n&&(n.peerMuteAudio=!0),n.pc&&y._adjustPCMuteStatus(n),y.dispatchEvent(t)}),y.socket.on("unmute_audio",function(e){o.default.info("[".concat(y.clientId,"] rcv peer unmute audio: ").concat(e.peerid));var t=c({type:"unmute-audio",uid:e.peerid}),n=y.remoteStreams[e.peerid];n&&(n.peerMuteAudio=!1),n.pc&&y._adjustPCMuteStatus(n),y.dispatchEvent(t)}),y.socket.on("mute_video",function(e){o.default.info("[".concat(y.clientId,"] rcv peer mute video: ").concat(e.peerid));var t=c({type:"mute-video",uid:e.peerid}),n=y.remoteStreams[e.peerid];n&&(n.peerMuteVideo=!0),n.pc&&y._adjustPCMuteStatus(n),y.dispatchEvent(t)}),y.socket.on("unmute_video",function(e){o.default.info("[".concat(y.clientId,"] rcv peer unmute video: ").concat(e.peerid));var t=c({type:"unmute-video",uid:e.peerid}),n=y.remoteStreams[e.peerid];n&&(n.peerMuteVideo=!1),n.pc&&y._adjustPCMuteStatus(n),y.dispatchEvent(t)}),y.socket.on("user_banned",function(e){o.default.info("[".concat(y.clientId,"] user banned uid: ").concat(e.id," error: ").concat(e.errcode));var t=c({type:"client-banned",uid:e.id,attr:e.errcode});y.dispatchEvent(t),n=!0,leave()}),y.socket.on("stream_fallback",function(e){o.default.info("[".concat(y.clientId,"] stream fallback uid: ").concat(e.id," peerId: ").concat(e.peerid," type: ").concat(e.type));var t=c({type:"stream-fallback",uid:e.id,stream:e.peerid,attr:e.type});y.dispatchEvent(t)}),y.socket.on("stream_recover",function(e){o.default.info("[".concat(y.clientId,"] stream recover uid: ").concat(e.id," peerId: ").concat(e.peerid," type: ").concat(e.type));var t=c({type:"stream-recover",uid:e.id,stream:e.peerid,attr:e.type});y.dispatchEvent(t)}),y.socket.on("onP2PLost",function(e){if(o.default.debug("[".concat(y.clientId,"] p2plost: "),e,"p2ps:",y.p2ps),"publish"===e.event){var t=y.localStreams[e.uid];t&&a.b.publish(y.joinInfo.sid,{lts:t.publishLTS,succ:!1,audioName:t.hasAudio()&&t.audioName,videoName:t.hasVideo()&&t.videoName,screenName:t.hasScreen()&&t.screenName,ec:"DTLS failed"})}if("subscribe"===e.event){var n=y.remoteStreams[e.uid];n&&a.b.subscribe(y.joinInfo.sid,{lts:n.subscribeLTS,succ:!1,video:n.subscribeOptions&&n.subscribeOptions.video,audio:n.subscribeOptions&&n.subscribeOptions.audio,peerid:e.uid+"",ec:"DTLS failed"})}o.default.debug("[".concat(y.clientId,"] p2plost:"),e.p2pid);var i=y.p2ps.get(e.p2pid);i&&(y.p2ps.delete(e.p2pid),i.local?y.dispatchEvent(c({type:"pubP2PLost",stream:i})):y.remoteStreams[i.getId()]&&y.dispatchEvent(c({type:"subP2PLost",stream:i})))}),y.socket.on("onTokenPrivilegeWillExpire",function(e){o.default.debug("[".concat(y.clientId,"] Received Message onTokenPrivilegeWillExpire")),y.dispatchEvent(c({type:"onTokenPrivilegeWillExpire"}))}),y.socket.on("onTokenPrivilegeDidExpire",function(){o.default.warning("[".concat(y.clientId,"] Received Message onTokenPrivilegeDidExpire, please get new token and join again")),y.closeGateway(),y.dispatchEvent(c({type:"onTokenPrivilegeDidExpire"}))}),y._doWithAction=function(e,t,n){"tryNext"===e?function(e,t){o.default.debug("[".concat(y.clientId,"] Connect next gateway")),y.state=m,y.socket.close(),T(),y.reconnectMode="tryNext",O(e,t)}(t,n):"retry"===e?function(e,t){o.default.debug("[".concat(y.clientId,"] Reconnect gateway")),y.state=m,y.socket.close(),T(),y.reconnectMode="retry",O(e,t)}(t,n):"quit"===e?(o.default.debug("[".concat(y.clientId,"] quit gateway")),y.state=m,y.socket.close(),T()):"recover"===e&&(o.default.debug("[".concat(y.clientId,"] Reconnect gateway")),y.state=m,y.socket.close(),T(),y.reconnectMode="recover",O())},y.socket.on("notification",function(e){if(o.default.debug("[".concat(y.clientId,"] Receive notification: "),e),"ERR_JOIN_BY_MULTI_IP"===b[e.code])return y.dispatchEvent({type:"onMultiIP",arg:e});e.detail?y._doWithAction(Ee[b[e.code]]):e.action&&y._doWithAction(e.action)}),y.socket.on("onPeerLeave",function(e){var t=c({type:"peer-leave",uid:e.id});if(y.remoteStreamsInChannel.has(e.id)&&y.remoteStreamsInChannel.delete(e.id),y.remoteStreams.hasOwnProperty(e.id)&&(t.stream=y.remoteStreams[e.id]),y.dispatchEvent(t),y.remoteStreams.hasOwnProperty(e.id)){o.default.info("[".concat(y.clientId,"] closing stream on peer leave"),e.id);var n=y.remoteStreams[e.id];n.close(),delete y.remoteStreams[e.id],void 0!==n.pc&&(n.pc.close(),n.pc=void 0,y.p2ps.delete(n.p2pId))}y.timers.hasOwnProperty(e.id)&&(clearInterval(y.timers[e.id]),clearInterval(y.timers[e.id]+"_RelatedStats"),delete y.timers[e.id]),null!=y.audioLevel[e.id]&&delete y.audioLevel[e.id],null!=y.timer_counter[e.id]&&delete y.timer_counter[e.id]}),y.socket.on("onUplinkStats",function(e){}),y.socket.on("liveStreamingStarted",function(e){var t=l({type:"liveStreamingStarted",url:e.url});y.dispatchEvent(t)}),y.socket.on("liveStreamingFailed",function(e){var t=l({type:"liveStreamingFailed",url:e.url});y.dispatchEvent(t)}),y.socket.on("liveStreamingStopped",function(e){var t=l({type:"liveStreamingStopped",url:e.url});y.dispatchEvent(t)}),y.socket.on("liveTranscodingUpdated",function(e){var t=l({type:"liveTranscodingUpdated",reason:e.reason});y.dispatchEvent(t)}),y.socket.on("streamInjectedStatus",function(e){var t=l({type:"streamInjectedStatus",url:e.url,uid:e.uid,status:e.status});y.dispatchEvent(t)}),y.socket.on("onUserOnline",function(e){y.dispatchEvent({type:"peer-online",uid:e.id})}))},N=function(e,t,n){if(void 0===y.socket)return o.default.error("[".concat(y.clientId,"] No socket available")),void E(n,A.INVALID_OPERATION);try{y.socket.emitSimpleMessage(e,function(e,i){"success"===e?"function"==typeof t&&t(i):"function"==typeof n&&n(b[i]||i)})}catch(t){o.default.error("[".concat(y.clientId,"] Socket emit message failed ").concat(JSON.stringify(e))),o.default.error("[".concat(y.clientId,"] "),t),E(n,A.SOCKET_ERROR)}},w=function(e,t){if(void 0!==y.socket)try{y.socket.emitSimpleMessage(e,function(e,n){t&&t(e,n)})}catch(e){o.default.error("[".concat(y.clientId,"] Error in sendSimpleSdp [").concat(e,"]"))}else o.default.error("[".concat(y.clientId,"] Error in sendSimpleSdp [socket not ready]"))},D=function(){for(var e in y.localStreams)if(void 0!==y.localStreams[e]){var t=y.localStreams[e];delete y.localStreams[e],void 0!==t.pc&&(t.pc.close(),t.pc=void 0)}},k=function(){for(var e in y.remoteStreamsInChannel.clear(),y.remoteStreams)if(y.remoteStreams.hasOwnProperty(e)){var t=y.remoteStreams[e];t.isPlaying()&&t.stop(),t.close(),delete y.remoteStreams[e],void 0!==t.pc&&(t.pc.close(),t.pc=void 0)}};return y},we={_gatewayClients:{},register:function(e,t){if(!t.uid){var n="NO_UID_PROVIDED";return o.default.error("[".concat(e.clientId,"] "),n,t),n}if(t.cname){if(this._gatewayClients[t.cname]&&this._gatewayClients[t.cname][t.uid]&&this._gatewayClients[t.cname][t.uid]!==e){n="UID_CONFLICT";return o.default.error("[".concat(e.clientId,"] "),n,t),n}return o.default.debug("[".concat(e.clientId,"] register client Channel"),t.cname,"Uid",t.uid),this._gatewayClients[t.cname]||(this._gatewayClients[t.cname]={}),this._gatewayClients[t.cname][t.uid]=e,null}var n="NO_CHANNEL_PROVIDED";return o.default.error("[".concat(e.clientId,"] "),n,t),n},unregister:function(e){var t=e&&e.uid,n=e.joinInfo&&e.joinInfo.cname;if(!t||!n){var i="INVALID_GATEWAYCLIENT";return o.default.error("[".concat(e.clientId,"] "),i),i}if(this._gatewayClients[n]&&this._gatewayClients[n][t]){if(this._gatewayClients[n][t]!==e){i="GATEWAYCLIENT_UID_CONFLICT";return o.default.error("[".concat(e.clientId,"] "),i),i}return o.default.debug("[".concat(e.clientId,"] unregister client "),e.uid),delete this._gatewayClients[n][t],null}var i="GATEWEAY_CLIENT_UNREGISTERED";o.default.error("[".concat(e.clientId,"] "),i)}};Ne.DISCONNECTED=0,Ne.CONNECTING=1,Ne.CONNECTED=2,Ne.DISCONNECTING=3,Ne.connetionStateMap={0:"DISCONNECTED",1:"CONNECTING",2:"CONNECTED",3:"DISCONNECTING"};var De=Ne,ke=function(e){var t;switch(e){case"120p":case"120p_1":t=["120p_1","120p_1","120p_1"];break;case"120p_3":t=["120p_3","120p_3","120p_3"];break;case"180p":case"180p_1":t=["90p_1","90p_1","180p_1"];break;case"180p_3":t=["120p_3","120p_3","180p_3"];break;case"180p_4":t=["120p_1","120p_1","180p_4"];break;case"240p":case"240p_1":t=["120p_1","120p_1","240p_1"];break;case"240p_3":t=["120p_3","120p_3","240p_3"];break;case"240p_4":t=["120p_4","120p_4","240p_4"];break;case"360p":case"360p_1":case"360p_4":case"360p_9":case"360p_10":case"360p_11":t=["90p_1","90p_1","360p_1"];break;case"360p_3":case"360p_6":t=["120p_3","120p_3","360p_3"];break;case"360p_7":case"360p_8":t=["120p_1","120p_1","360p_7"];break;case"480p":case"480p_1":case"480p_2":case"480p_4":case"480p_10":t=["120p_1","120p_1","480p_1"];break;case"480p_3":case"480p_6":t=["120p_3","120p_3","480p_3"];break;case"480p_8":case"480p_9":t=["120p_4","120p_4","480p_8"];break;case"720p":case"720p_1":case"720p_2":case"720p_3":t=["90p_1","90p_1","720p_1"];break;case"720p_5":case"720p_6":t=["120p_1","120p_1","720p_5"];break;case"1080p":case"1080p_1":case"1080p_2":case"1080p_3":case"1080p_5":t=["90p_1","90p_1","1080p_1"];break;case"1440p":case"1440p_1":case"1440p_2":t=["90p_1","90p_1","1440p_1"];break;case"4k":case"4k_1":case"4k_3":t=["90p_1","90p_1","4k_1"];break;default:t=["120p_1","120p_1","360p_7"]}return Object(p.isOpera)()?[e,15,50]:Object(p.isFireFox)()?[t[1],15,100]:Object(p.isSafari)()?[t[2],15,50]:[t[0],15,50]},Me={1001:"FRAMERATE_INPUT_TOO_LOW",1002:"FRAMERATE_SENT_TOO_LOW",1003:"SEND_VIDEO_BITRATE_TOO_LOW",1005:"RECV_VIDEO_DECODE_FAILED",2001:"AUDIO_INPUT_LEVEL_TOO_LOW",2002:"AUDIO_OUTPUT_LEVEL_TOO_LOW",2003:"SEND_AUDIO_BITRATE_TOO_LOW",2005:"RECV_AUDIO_DECODE_FAILED",3001:"FRAMERATE_INPUT_TOO_LOW_RECOVER",3002:"FRAMERATE_SENT_TOO_LOW_RECOVER",3003:"SEND_VIDEO_BITRATE_TOO_LOW_RECOVER",3005:"RECV_VIDEO_DECODE_FAILED_RECOVER",4001:"AUDIO_INPUT_LEVEL_TOO_LOW_RECOVER",4002:"AUDIO_OUTPUT_LEVEL_TOO_LOW_RECOVER",4003:"SEND_AUDIO_BITRATE_TOO_LOW_RECOVER",4005:"RECV_AUDIO_DECODE_FAILED_RECOVER"},Pe={FramerateInput:1001,FramerateSent:1002,SendVideoBitrate:1003,VideoDecode:1005,AudioIntputLevel:2001,AudioOutputLevel:2002,SendAudioBitrate:2003,AudioDecode:2005},Le=function(e){var t={remoteStreamStorage:{},localStreamStorage:{}};return t.gatewayClient=e,t.checkAudioOutputLevel=function(e){return!(e&&parseInt(e.audioRecvBytesDelta)>0&&parseInt(e.audioDecodingNormalDelta)>0&&0===parseInt(e.audioOutputLevel))},t.checkAudioIntputLevel=function(e){return!e||0!==parseInt(e.audioInputLevel)},t.checkFramerateInput=function(e,t){if(!e||!t.attributes)return!0;var n=parseInt(t.attributes.maxFrameRate),i=parseInt(e.googFrameRateInput);return!n||!i||!(n>10&&i<5||n<10&&n>=5&&i<=1)},t.checkFramerateSent=function(e){return!(e&&parseInt(e.googFrameRateInput)>5&&parseInt(e.googFrameRateSent)<=1)},t.checkSendVideoBitrate=function(e){return!e||0!==parseInt(e.videoSendBytesDelta)},t.checkSendAudioBitrate=function(e){return!e||0!==parseInt(e.audioSendBytesDelta)},t.checkVideoDecode=function(e){return!e||0===parseInt(e.videoRecvBytesDelta)||0!==parseInt(e.googFrameRateDecoded)},t.checkAudioDecode=function(e){return!e||0===parseInt(e.audioRecvBytesDelta)||0!==parseInt(e.audioDecodingNormalDelta)},t.record=function(e,n,i,o,a){i[e]||(i[e]={isPrevNormal:!0,record:[]});var r=i[e],s=t["check"+e](n,a);if(r.record.push(s),r.record.length>=5){r.isCurNormal=r.record.includes(!0);var d=Pe[e];r.isPrevNormal&&!r.isCurNormal&&t.gatewayClient.dispatchEvent({type:"exception",code:d,msg:Me[d],uid:o}),!r.isPrevNormal&&r.isCurNormal&&t.gatewayClient.dispatchEvent({type:"exception",code:d+2e3,msg:Me[d+2e3],uid:o}),r.isPrevNormal=r.isCurNormal,r.record=[]}},t.setLocalStats=function(e){var n={};Object.keys(e).map(function(i){var o=e[i],a=t.gatewayClient.localStreams[parseInt(i)],r=t.localStreamStorage[i]||{};a&&a.hasVideo()&&(t.record("SendVideoBitrate",o.videoStats,r,i),t.record("FramerateInput",o.videoStats,r,i,a),t.record("FramerateSent",o.videoStats,r,i)),a&&a.hasAudio()&&(t.record("AudioIntputLevel",o.audioStats,r,i),t.record("SendAudioBitrate",o.audioStats,r,i)),n[i]=r}),t.localStreamStorage=n},t.setRemoteStats=function(n){var i={};Object.keys(n).map(function(o){var a=n[o],r=e.remoteStreams[o],s=t.remoteStreamStorage[o]||{};r&&r.hasVideo()&&r.isPlaying()&&t.record("VideoDecode",a.videoStats,s,o),r&&r.hasAudio()&&r.isPlaying()&&(t.record("AudioOutputLevel",a.audioStats,s,o),t.record("AudioDecode",a.audioStats,s,o)),i[o]=s}),t.remoteStreamStorage=i},t},xe=new function(){var e=r();return e.states={UNINIT:"UNINIT",INITING:"INITING",INITED:"INITED"},e.state=e.states.UNINIT,e.type=null,e.lastConnectedAt=null,e.lastDisconnectedAt=null,e.lastTypeChangedAt=null,e.networkChangeTimer=null,e._init=function(t,n){if(e.state=e.states.INITING,navigator.connection&&navigator.connection.addEventListener){var i=e._getNetworkInfo();e.type=i&&i.type,e.state=e.states.INITED,t&&t()}else e.state=e.states.UNINIT,n&&n("DO_NOT_SUPPORT")},e._getNetworkInfo=function(){return navigator.connection},e._reloadNetworkInfo=function(){var t=e._getNetworkInfo(),n=t&&t.type||"UNSUPPORTED",i=Date.now();if(n!==e.type){e.lastTypeChangedAt=i,"none"==n?e.lastDisconnectedAt=i:"none"==e.type&&(e.lastConnectedAt=i),e.type=n;var o={type:"networkTypeChanged",networkType:n};e.dispatchEvent(o)}},e.getStats=function(t,n){var i={},o=e._getNetworkInfo();o&&(i.NetworkType=o.type||"UNSUPPORTED"),setTimeout(function(){t(i)},0)},e._init(function(){navigator.connection.addEventListener("change",function(){e._reloadNetworkInfo()}),e.networkChangeTimer=setInterval(function(){e._reloadNetworkInfo()},5e3)},function(e){}),e},Ve=function(e){var t={key:void 0,highStream:null,lowStream:null,lowStreamParameter:null,isDualStream:!1,highStreamState:2,lowStreamState:2,proxyServer:null,turnServer:{},useProxyServer:!1};t.mode=e.mode,t.clientId=Object(G.b)().slice(0,5);e=I()({},e);return t.aespassword=null,t.aesmode="none",t.hasPublished=!1,t.getConnectionState=function(){var n=a.b.reportApiInvoke(e.sessionId,{name:"Client.getConnectionState",options:arguments,tag:"tracer"}),i=De.connetionStateMap[t.gatewayClient.state];return n(),i},t.setClientRole=function(n,i){var r=a.b.reportApiInvoke(e.sessionId,{callback:i,name:"Client.setClientRole",options:arguments,tag:"tracer"});if(Y(n,"setClientRole",["host","audience"]),"rtc"===t.mode){var s="RTC mode can not use setClientRole";return o.default.warning("[".concat(t.clientId,"] ").concat(s)),r&&r(s)}t.gatewayClient&&t.gatewayClient.state===De.CONNECTED?("audience"===n&&(0===this.highStreamState?this._unpublish(this.highStream,function(){r&&r(null,{role:n})},function(e){r&&r(e)}):t.gatewayClient.setClientRole("audience",r)),"host"===n&&t.gatewayClient.setClientRole("host",r)):(t.gatewayClient.role=n,r&&r(null,{role:n}))},t.getGatewayInfo=function(e){if(t.gatewayClient.state!==De.CONNECTED){var n="Client is not in connected state";return o.default.error("[".concat(t.clientId,"] ").concat(n)),void e(n)}t.gatewayClient.getGatewayInfo(function(t){e(null,t)},e)},t.renewToken=function(n,i,r){var s=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return r&&r(e);i&&i(t)},name:"Client.renewToken",options:arguments,tag:"tracer"});if(!ne(n))throw new Error("Invalid token: Token is of the string type .Length of the string: [1,255]. ASCII characters only.");t.gatewayClient||(o.default.error("[".concat(t.clientId,"] renewToken Failed. GatewayClient not Exist")),s(A.INVALID_OPERATION)),t.key?(t.key=n,t.gatewayClient.renewToken(n,function(e){return s(null,e)},s)):(o.default.error("[".concat(t.clientId,"] renewToken should not be called before user join")),s(A.INVALID_OPERATION))},t.setLowStreamParameter=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.setLowStreamParameter",options:arguments,tag:"tracer"});q(n,"param");var r=n.width,s=n.height,d=n.framerate,c=n.bitrate;re(r)||X(r,"width"),re(s)||X(s,"height"),re(d)||X(d,"framerate"),re(c)||X(c,"bitrate",1,1e7),(!r&&s||r&&!s)&&o.default.warning("[".concat(t.clientId,"] The width and height parameters take effect only when both are set")),t.lowStreamParameter=n,i()},t.init=function(n,i,r){var s=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return r&&r(e);i&&i(t)},name:"Client.init",options:arguments,tag:"tracer"});Q(n),Object(p.isChromeKernel)()&&Object(p.getChromeKernelVersion)()<=48?r?s(A.BAD_ENVIRONMENT):Object(G.f)():(o.default.info("[".concat(t.clientId,"] Initializing AgoraRTC client, appId: ").concat(n,".")),e.appId=n,e.sessionId=Object(G.b)(),s())},t.setTurnServer=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.setTurnServer",options:arguments,tag:"tracer"});if(t.gatewayClient&&t.gatewayClient.state!==De.DISCONNECTED)throw new Error("Set turn server before join channel");if(t.useProxyServer)throw new Error("You have already set the proxy");q(n,"turnServer");var r=n.turnServerURL,s=n.username,d=n.password,c=n.udpport,u=n.forceturn,l=n.tcpport;Q(r,"turnServerURL"),Q(s,"username"),Q(d,"password"),Q(c,"udpport"),re(u)||$(u,"forceturn"),t.turnServer.url=r,t.turnServer.udpport=c,t.turnServer.username=s,t.turnServer.credential=d,t.turnServer.forceturn=u||!1,re(l)||(Q(l,"tcpport"),t.turnServer.tcpport=l,o.default.info("[".concat(t.clientId,"] Set turnserver tcpurl. ").concat(t.turnServer.url,":").concat(t.turnServer.tcpport))),o.default.info("[".concat(t.clientId,"] Set turnserver udpurl. ").concat(t.turnServer.url,":").concat(t.turnServer.udpport,",username: ").concat(t.turnServer.uername,",password: ").concat(t.turnServer.credential)),i()},t.setProxyServer=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.setProxyServer",options:arguments,tag:"tracer"});if(t.gatewayClient&&t.gatewayClient.state!==De.DISCONNECTED)throw new Error("Set proxy server before join channel");if(!n)throw new Error("Do not set the proxyServer parameter as empty");if(t.useProxyServer)throw new Error("You have already set the proxy");Q(n,"proxyServer"),t.proxyServer=n,a.b.setProxyServer(n),o.default.setProxyServer(n),i()},t.startProxyServer=function(){var n=a.b.reportApiInvoke(e.sessionId,{name:"Client.startProxyServer",options:arguments,tag:"tracer"});if(t.gatewayClient&&t.gatewayClient.state!==De.DISCONNECTED)throw new Error("Start proxy server before join channel");if(t.proxyServer||t.turnServer.url)throw new Error("You have already set the proxy");t.useProxyServer=!0,n()},t.stopProxyServer=function(){var n=a.b.reportApiInvoke(e.sessionId,{name:"Client.stopProxyServer",options:arguments,tag:"tracer"});if(t.gatewayClient&&t.gatewayClient.state!==De.DISCONNECTED)throw new Error("Stop proxy server after leave channel");a.b.setProxyServer(),o.default.setProxyServer(),t.turnServer={},t.proxyServer=null,t.useProxyServer=!1,n()},t.setEncryptionSecret=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.setEncryptionSecret",options:arguments,tag:"tracer"});Q(n,"password"),t.aespassword=n,i()},t.setEncryptionMode=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.setEncryptionMode",options:arguments,tag:"tracer"});if(Q(n,"encryptionMode"),!le.includes(n))throw new Error('Invalid encryptionMode: encryptionMode should be "aes-128-xts" | "aes-256-xts" | "aes-128-ecb"');t.aesmode=n,i()},t.configPublisher=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.configPublisher",options:arguments,tag:"tracer"});q(n,"config");var o=n.width,r=n.height,s=n.framerate,d=n.bitrate,c=n.publisherUrl;X(o,"width"),X(r,"height"),X(s,"framerate"),X(d,"bitrate",1,1e7),c&&Q(c,"publisherUrl"),t.gatewayClient.configPublisher(n),i()},t.enableDualStream=function(n,i){var r=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return i&&i(e);n&&n(t)},name:"Client.enableDualStream",options:arguments,tag:"tracer"});return"iOS"===Object(p.getBrowserOS)()?(a.b.streamSwitch(e.sessionId,{lts:(new Date).getTime(),isdual:!0,succ:!1}),r(A.IOS_NOT_SUPPORT)):Object(p.isWeChatBrowser)()?(a.b.streamSwitch(e.sessionId,{lts:(new Date).getTime(),isdual:!0,succ:!1}),r(A.WECHAT_NOT_SUPPORT)):(a.b.streamSwitch(e.sessionId,{lts:(new Date).getTime(),isdual:!0,succ:!0}),t.isDualStream=!0,void(0===t.highStreamState?t._publishLowStream(function(e){return r(null,e)},function(e){o.default.warning("[".concat(t.clientId,"]"),e),r(A.ENABLE_DUALSTREAM_FAILED)}):1===t.highStreamState?r(A.STILL_ON_PUBLISHING):r(null)))},t.disableDualStream=function(n,i){var r=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return i&&i(e);n&&n(t)},name:"Client.disableDualStream",options:arguments,tag:"tracer"});a.b.streamSwitch(e.sessionId,{lts:(new Date).getTime(),isdual:!1,succ:!0}),t.isDualStream=!1,0===t.highStreamState?t._unpublishLowStream(function(){t.highStream.lowStream=null,r()},function(e){o.default.warning("[".concat(t.clientId,"]"),e),r(A.DISABLE_DUALSTREAM_FAILED)}):1===t.highStreamState?r(A.STILL_ON_PUBLISHING):r()},t._createLowStream=function(e,n){if(t.highStream&&t.highStream.stream){var a=I()({},t.highStream.params);if(a.streamID+=1,a.audio=!1,a.video){var r=t.highStream.stream.getVideoTracks()[0];r?K.getVideoCameraIdByLabel(r.label,function(r){a.cameraId=r;var s=new se(a);if(s.streamId=t.highStream.getId()+1,t.lowStreamParameter){var d=I()({},t.lowStreamParameter);if(!d.width||!d.height){var c=ke(t.highStream.profile),u=i.SUPPORT_RESOLUTION_LIST[c[0]];d.width=u[0],d.height=u[1]}if(d.framerate=d.framerate||5,d.bitrate=d.bitrate||50,Object(p.isSafari)()||Object(p.isOpera)()){o.default.debug("[".concat(t.clientId,"] Shimming lowStreamParameter"));u=i.SUPPORT_RESOLUTION_LIST[t.highStream.profile];d.width=u[0],d.height=u[1]}s.setVideoProfileCustomPlus(d)}else s.setVideoProfileCustom(ke(t.highStream.profile));s.init(function(){t.highStream.lowStream=s,t.highStream.userMuteVideo&&s.muteVideo(),e&&e(s)},n)},n):n&&n(A.HIGH_STREAM_NOT_VIDEO_TRACE)}else n&&n(A.HIGH_STREAM_NOT_VIDEO_TRACE)}else n&&n(A.HIGH_STREAM_NOT_VIDEO_TRACE)},t._getLowStream=function(e,n){t.lowStream?e(t.lowStream):t._createLowStream(function(n){t.lowStream=n,e(t.lowStream)},n)},t._publishLowStream=function(e,n){return 2!==t.lowStreamState?n&&n(A.LOW_STREAM_ALREADY_PUBLISHED):t.highStream&&t.highStream.hasScreen()?n&&n(A.SHARING_SCREEN_NOT_SUPPORT):void t._getLowStream(function(i){t.lowStreamState=1,t.gatewayClient.publish(i,{streamType:1},function(){t.lowStreamState=0,e&&e()},function(e){o.default.debug("[".concat(t.clientId,"] publish low stream failed")),n&&n(e)})},n)},t._unpublishLowStream=function(e,n){if(0!==t.lowStreamState)return n&&n(A.LOW_STREAM_NOT_YET_PUBLISHED);t.lowStream&&(t.gatewayClient.unpublish(t.lowStream,{streamType:1},function(){},function(e){o.default.debug("[".concat(t.clientId,"] unpublish low stream failed")),n&&n(e)}),t.lowStream.close(),t.lowStream=null,t.lowStreamState=2,e&&e())},t.join=function(n,i,r,s,d){var c,u=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return d&&d(e);s&&s(t)},name:"Client.join",options:arguments,tag:"tracer"});if(n&&!ne(n))return o.default.warning("[".concat(t.clientId,"] Param channelKey should be string")),u(A.INVALID_PARAMETER);if(!ae(c=i)||!/^[a-zA-Z0-9!#$%&()+-:;<=.>?@[\]^_{}|~,\s]{1,64}$/.test(c))return o.default.warning("[".concat(t.clientId,"] The length must be within 64 bytes. The supported characters: a-z,A-Z,0-9,space,!, #, $, %, &, (, ), +, -, :, ;, <, =, ., >, ?, @, [, ], ^, _,  {, }, |, ~, ,")),u(A.INVALID_PARAMETER);if("string"==typeof i&&""===i)return o.default.warning("[".concat(t.clientId,"] Param channel should not be empty")),u(A.INVALID_PARAMETER);if(r&&!Object(G.c)(r)&&!Z(r,1,255))return o.default.warning("[".concat(t.clientId,"] [String uid] Length of the string: [1,255]. ASCII characters only. [Number uid] The value range is [0,10000]")),u(A.INVALID_PARAMETER);if("string"==typeof r&&0==r.length)return o.default.warning("[".concat(t.clientId,"] String uid should not be empty")),u(A.INVALID_PARAMETER);if("string"==typeof r&&r.length>256)return o.default.warning("[".concat(t.clientId,"] Length of string uid should be less than 255")),u(A.INVALID_PARAMETER);t.highStream=null,t.lowStream=null,t.lowStreamParameter=null,t.isDualStream=!1,t.highStreamState=2,t.lowStreamState=2;var l={clientId:t.clientId,appId:e.appId,sid:e.sessionId,cname:i,uid:r,turnServer:t.turnServer,proxyServer:t.proxyServer,token:n||e.appId,useProxyServer:t.useProxyServer};if("string"==typeof r&&(l.stringUid=r,l.uid=0),t.aespassword&&"none"!==t.aesmode&&I()(l,{aespassword:t.aespassword,aesmode:t.aesmode}),a.b.sessionInit(e.sessionId,{lts:(new Date).getTime(),cname:i,appid:e.appId,mode:e.mode,succ:!0}),t.onSuccess=function(e){return u(null,e)},t.onFailure=function(e){return u(e)},t.channel=i,t.gatewayClient.state!==De.DISCONNECTED)return o.default.error("[".concat(t.clientId,"] Client already in connecting/connected state")),u(A.INVALID_OPERATION),void a.b.joinGateway(e.sessionId,{lts:Date.now(),succ:!1,ec:A.INVALID_OPERATION,addr:null});t.gatewayClient.state=De.CONNECTING,be(l,function(a,r){o.default.info("[".concat(t.clientId,"] Joining channel: ").concat(i)),t.gatewayClient.dispatchEvent({type:"config-distribute",config:r,joinInfo:l}),t.key=n||e.appId,l.cid=a.cid,l.uid=a.uid,a.uni_lbs_ip&&a.uni_lbs_ip[1]&&(l.uni_lbs_ip=a.uni_lbs_ip[1]),l.gatewayAddr=a.gateway_addr,t.joinInfo=l,t.gatewayClient.join(l,t.key,function(e){o.default.info("[".concat(t.clientId,"] Join channel ").concat(i," success, join with uid: ").concat(e,".")),t.onSuccess=null,u(null,e)},function(e){return u(e)})})},t.renewChannelKey=function(n,i,r){var s=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return r&&r(e);i&&i(t)},name:"Client.renewChannelKey",options:arguments,tag:"tracer"});Q(n,"key",1,2047),void 0===t.key?(o.default.error("[".concat(t.clientId,"] renewChannelKey should not be called before user join")),s(A.INVALID_OPERATION)):(t.key=n,t.gatewayClient.key=n,t.gatewayClient.rejoin(),s())},t.leave=function(n,i){var r=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return i&&i(e);n&&n(t)},name:"Client.leave",options:arguments,tag:"tracer"});o.default.info("[".concat(t.clientId,"] Leaving channel")),t._renewSession(),t.gatewayClient.leave(function(e){return r(e)},r)},t._renewSession=function(){var n=Object(G.b)();if(o.default.debug("renewSession ".concat(e.sessionId," => ").concat(n)),e.sessionId=n,t.joinInfo&&(t.joinInfo.sid=n),t.gatewayClient&&(t.gatewayClient.joinInfo&&(t.gatewayClient.joinInfo.sid=n),t.gatewayClient.localStreams))for(var i in t.gatewayClient.localStreams){var a=t.gatewayClient.localStreams[i];a&&(a.sid=n)}},t._publish=function(n,i,a){if(2!==t.highStreamState)return o.default.warning("[".concat(t.clientId,"] Can't publish stream when stream already publish ").concat(n.getId())),a&&a(A.STREAM_ALREADY_PUBLISHED);o.default.info("[".concat(t.clientId,"] Publishing stream, uid ").concat(n.getId())),t.highStream=n,t.highStreamState=1,t.highStream.streamId=t.joinInfo.stringUid||t.joinInfo.uid,t.hasPublished=!1;var r=function(n,i,a){t.gatewayClient.publish(n,{streamType:0},function(){n.sid=e.sessionId,t.highStreamState=0,o.default.info("[".concat(t.clientId,"] Publish success, uid: ").concat(n.getId())),t.isDualStream?t._publishLowStream(function(){i&&i()},function(e){o.default.warning("[".concat(t.clientId,"] "),e),i&&i()}):i&&i()},a)};"audience"===t.gatewayClient.role&&"live"===t.mode?t.gatewayClient.setClientRole("host",function(e){if(e)return a&&a(e);r(n,i,a)}):r(n,i,a)},t._unpublish=function(e,n,i){if(0!==t.highStreamState)return o.default.warning("[".concat(t.clientId,"] Can't unpublish stream when stream not publish")),i&&i(A.STREAM_NOT_YET_PUBLISHED);o.default.info("[".concat(t.clientId,"] Unpublish stream, uid ").concat(e.getId()));var a=function(e,n,i){t.isDualStream&&t.lowStream?(t._unpublishLowStream(null,i),t.gatewayClient.unpublish(e,{streamType:0},null,i),t.highStreamState=2,o.default.info("[".concat(t.clientId,"] Unpublish stream success, uid: ").concat(e.getId()))):(t.gatewayClient.unpublish(e,{streamType:0},null,i),t.highStreamState=2,o.default.info("[".concat(t.clientId,"] Unpublish stream success, uid: ").concat(e.getId()))),n&&n()};"host"===t.gatewayClient.role&&"live"===t.mode?t.gatewayClient.setClientRole("audience",function(t){if(t)return i&&i(t);a(e,n,i)}):a(e,n,i)},t.publish=function(n,i){var o=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return i&&i(e)},name:"Client.publish",tag:"tracer",options:{stream:"too long to show",onFailure:!!i}});2===t.highStreamState?t._publish(n,function(e){return o(null,e)},function(e){return o(e)}):o(A.STREAM_ALREADY_PUBLISHED)},t.unpublish=function(n,i){var o=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return i&&i(e)},name:"Client.unpublish",tag:"tracer",options:{stream:"too long to show",onFailure:!!i}});0===t.highStreamState?t._unpublish(n,function(e){return o(null,e)},function(e){return o(e)}):o(A.STREAM_NOT_YET_PUBLISHED)},t.subscribe=function(n,i,r){var s=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return r&&r(e)},name:"Client.subscribe",tag:"tracer",options:{stream:"too long to show",options:i,onFailure:!!r}});"function"==typeof i&&(r=i,i=null),q(n,"stream"),re(i)||(q(i,"options"),re(i.video)||$(i.video,"options.video"),re(i.audio)||$(i.audio,"options.audio"));var d={video:!0,audio:!0};if(!re(i)){if(Object(p.isSafari)()&&(!i.video||!i.audio)){var c="SAFARI_NOT_SUPPORTED_FOR_TRACK_SUBSCRIPTION";return o.default.error("[".concat(t.clientId,"] "),c),void s(c)}if(!re(i.video)&&!te(i.video)||!re(i.audio)&&!te(i.audio)||!1===i.audio&&!1===i.video){c="INVALID_PARAMETER ".concat(JSON.stringify(i));return o.default.error("[".concat(t.clientId,"] "),c),void s(c)}}n.subscribeOptions?(I()(n.subscribeOptions,d,i),t.gatewayClient.subscribeChange(n,function(e){return s(null,e)},s)):(n.subscribeOptions=I()({},d,i),t.gatewayClient.subscribe(n,function(e){return s(null,e)},s))},t.unsubscribe=function(n,i){var r=a.b.reportApiInvoke(e.sessionId,{callback:function(e,t){if(e)return i&&i(e)},name:"Client.unsubscribe",tag:"tracer",options:{stream:"too long to show",onFailure:!!i}});o.default.info("[".concat(t.clientId,"] Unsubscribe stream, uid: ").concat(n.getId())),t.gatewayClient.unsubscribe(n,function(e){return r(null,e)},r)},t.setRemoteVideoStreamType=function(n,i){var o=a.b.reportApiInvoke(e.sessionId,{name:"Client.setRemoteVideoStreamType",tag:"tracer",options:{stream:"too long to show",streamType:i}});Y(i,"streamType",[0,1]),t.gatewayClient.setRemoteVideoStreamType(n,i),o()},t.setStreamFallbackOption=function(n,i){var o=a.b.reportApiInvoke(e.sessionId,{name:"Client.setStreamFallbackOption",tag:"tracer",options:{stream:"too long to show",fallbackType:i}});Y(i,"fallbackType",[0,1,2]),t.gatewayClient.setStreamFallbackOption(n,i),o()},t.startLiveStreaming=function(n,i){var o=a.b.reportApiInvoke(e.sessionId,{name:"Client.startLiveStreaming",options:arguments,tag:"tracer"});Q(n,"url"),re(i)||$(i,"transcodingEnabled"),t.gatewayClient.startLiveStreaming(n,i),o()},t.stopLiveStreaming=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.stopLiveStreaming",options:arguments,tag:"tracer"});Q(n,"url"),t.gatewayClient.stopLiveStreaming(n),i()},t.setLiveTranscoding=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.setLiveTranscoding",options:arguments,tag:"tracer"});q(n,"transcoding");var o=n.width,r=n.height,s=n.videoBitrate,d=n.videoFramerate,c=n.lowLatency,u=n.audioSampleRate,l=n.audioBitrate,p=n.audioChannels,f=n.videoGop,m=n.videoCodecProfile,g=n.userCount,v=n.backgroundColor,S=n.transcodingUsers;if(re(o)||X(o,"width"),re(r)||X(r,"height"),re(s)||X(s,"videoBitrate",1,1e6),re(d)||X(d,"videoFramerate"),re(c)||$(c,"lowLatency"),re(u)||Y(u,"audioSampleRate",[32e3,44100,48e3]),re(l)||X(l,"audioBitrate",1,128),re(p)||Y(p,"audioChannels",[1,2,3,4,5]),re(f)||X(f,"videoGop"),re(m)||Y(m,"videoCodecProfile",[66,77,100]),re(g)||X(g,"userCount",0,17),re(v)||X(v,"backgroundColor",0,16777215),!re(S)){if(!(S instanceof Array))throw new Error("[transcodingUsers]: transcodingUsers should be Array");if(S.length>17)throw new Error("The length of transcodingUsers cannot greater than 17");S.map(function(e,t){if(!re(e.uid)&&!Object(G.c)(e.uid)&&!Z(e.uid,1,255))throw new Error("[String uid] Length of the string: [1,255]. ASCII characters only. [Number uid] The value range is [0,10000]");if(re(e.x)||X(e.x,"transcodingUser[".concat(t,"].x"),0,1e4),re(e.y)||X(e.y,"transcodingUser[".concat(t,"].y"),0,1e4),re(e.width)||X(e.width,"transcodingUser[".concat(t,"].width"),0,1e4),re(e.height)||X(e.height,"transcodingUser[".concat(t,"].height"),0,1e4),re(e.zOrder)||X(e.zOrder,"transcodingUser[".concat(t,"].zOrder"),0,100),!(re(e.alpha)||"number"==typeof e.alpha&&e.alpha<=1&&e.alpha>=0))throw new Error("transcodingUser[${index}].alpha: The value range is [0, 1]")})}I()(Fe,n),t.gatewayClient.setLiveTranscoding(Fe),i()},t.addInjectStreamUrl=function(n,i){var o=a.b.reportApiInvoke(e.sessionId,{name:"Client.addInjectStreamUrl",options:arguments,tag:"tracer"});Q(n,"url",1,255),q(i,"config"),!re(i&&i.width)&&X(i.width,"config.width",0,1e4),!re(i&&i.height)&&X(i.height,"config.height",0,1e4),!re(i&&i.videoGop)&&X(i.videoGop,"config.videoGop",1,1e4),!re(i&&i.videoFramerate)&&X(i.videoFramerate,"config.videoFramerate",1,1e4),!re(i&&i.videoBitrate)&&X(i.videoBitrate,"config.videoBitrate",1,1e4),!re(i&&i.audioSampleRate)&&Y(i.audioSampleRate,"config.audioSampleRate",[32e3,44100,48e3]),!re(i&&i.audioBitrate)&&X(i.audioBitrate,"config.audioBitrate",1,1e4),!re(i&&i.audioChannels)&&X(i.audioChannels,"config.audioChannels",1,2),I()(Be,i),t.gatewayClient.addInjectStreamUrl(n,Be),o()},t.removeInjectStreamUrl=function(n){var i=a.b.reportApiInvoke(e.sessionId,{name:"Client.removeInjectStreamUrl",options:arguments,tag:"tracer"});Q(n,"url",1,255),t.gatewayClient.removeInjectStreamUrl(n),i()},t.enableAudioVolumeIndicator=function(n,i){var r=a.b.reportApiInvoke(e.sessionId,{name:"Client.enableAudioVolumeIndicator",options:arguments,tag:"tracer"});n=n||2e3,X(i=i||3,"smooth",1,100),X(n,"interval",50,1e5),t.audioVolumeIndication=t.audioVolumeIndication||{enabled:!0},t.audioVolumeIndication.interval=n,t.audioVolumeIndication.smooth=i,t.audioVolumeIndication={interval:n,smooth:i},o.default.info("[".concat(t.clientId,"] enableAudioVolumeIndicator interval ").concat(n," smooth ").concat(i)),t.gatewayClient.enableAudioVolumeIndicator(n,i),r()},t.getNetworkStats=function(e,n){return o.default.deprecate("[".concat(t.clientId,"] client.getNetworkStats is deprecated. Use client.getTransportStats instead.")),xe.getStats(e,n)},t.getSystemStats=function(e,t){return m.getStats(e,t)},t.getRecordingDevices=function(e,t){return K.getRecordingDevices(e,t)},t.getPlayoutDevices=function(e,t){return K.getPlayoutDevices(e,t)},t.getCameras=function(e,t){return K.getCameras(e,t)},t.getRemoteAudioStats=function(e,n){return t.rtcStatsCollector.getRemoteAudioStats(e,n)},t.getLocalAudioStats=function(e,n){return t.rtcStatsCollector.getLocalAudioStats(e,n)},t.getRemoteVideoStats=function(e,n){return t.rtcStatsCollector.getRemoteVideoStats(e,n)},t.getLocalVideoStats=function(e,n){return t.rtcStatsCollector.getLocalVideoStats(e,n)},t._getRemoteVideoQualityStats=function(e,n){return t.rtcStatsCollector.getRemoteVideoQualityStats(e,n)},t._getRemoteAudioQualityStats=function(e,n){return t.rtcStatsCollector.getRemoteAudioQualityStats(e,n)},t.getTransportStats=function(e,n){return t.rtcStatsCollector.getTransportStats(function(t){return xe.getStats(function(n){var i=I()({},t,n);e&&e(i)},n)},n)},t.getSessionStats=function(e,n){return t.rtcStatsCollector.getSessionStats(e,n)},t.onNetworkQuality=function(){return t.rtcStatsCollector.onNetworkQuality(onSuccess,onFailure)},e.clientId=t.clientId,t.gatewayClient=De(e),t.on=t.gatewayClient.on,t.rtcStatsCollector=function(e){var t=r();return t.gatewayClient=e,t.exceptionMonitor=new Le(e),t.localStats={},t.remoteStats={},t.session={sendBytes:0,recvBytes:0,WSSendBytes:0,WSSendBytesDelta:0,WSRecvBytes:0,WSRecvBytesDelta:0,HTTPSendBytes:0,HTTPSendBytesDelta:0,HTTPRecvBytes:0,HTTPRecvBytesDelta:0},t.getRemoteAudioStats=function(e){var n={};for(var i in t.remoteStats){var o={},a=t.remoteStats[i];J(o,"End2EndDelay",a.peer_delay&&a.peer_delay.audio_delay),J(o,"TransportDelay",a.peer_delay&&a.peer_delay.e2e_delay),J(o,"PacketLossRate",a.peer_delay&&a.peer_delay.e2e_audio_lost_ratio_400ms),J(o,"RecvLevel",a.audioStats&&a.audioStats.audioOutputLevel),J(o,"RecvBitrate",a.audioRecvBitrate),J(o,"CodecType",a.audioStats&&a.audioStats.googCodecName),J(o,"MuteState",a.audioDisabled),J(o,"TotalFreezeTime",a.audioStats&&a.audioStats.audioTotalFreezeTime),J(o,"TotalPlayDuration",a.audioStats&&a.audioStats.audioTotalPlayDuration),n[i]=o}e&&e(n)},t.getLocalAudioStats=function(e){var n={};for(var i in t.localStats){var o={},a=t.localStats[i];J(o,"RecordingLevel",a.audioStats&&a.audioStats.audioInputLevel),J(o,"SendLevel",a.audioStats&&a.audioStats.totalAudioEnergy),J(o,"SamplingRate",a.audioStats&&a.audioStats.totalSamplesDuration),J(o,"SendBitrate",a.audioSendBitrate),J(o,"CodecType",a.audioStats&&a.audioStats.googCodecName),J(o,"MuteState",a.audioDisabled);var r=t.gatewayClient.localStreams[i];r&&r.isPlaying()&&J(o,"MuteState",r.userMuteAudio?"1":"0"),n[i]=o}e&&e(n)},t.getRemoteVideoStats=function(e){var n={};for(var i in t.remoteStats){var o={},a=t.remoteStats[i];J(o,"End2EndDelay",a.peer_delay&&a.peer_delay.video_delay),J(o,"TransportDelay",a.peer_delay&&a.peer_delay.e2e_delay),J(o,"PacketLossRate",a.peer_delay&&a.peer_delay.e2e_video_lost_ratio_400ms),J(o,"RecvBitrate",a.videoRecvBitrate),J(o,"RecvResolutionWidth",a.videoStats&&a.videoStats.googFrameWidthReceived),J(o,"RecvResolutionHeight",a.videoStats&&a.videoStats.googFrameHeightReceived),J(o,"RenderResolutionWidth",a.videoStats&&a.videoStats.renderRemoteWidth),J(o,"RenderResolutionHeight",a.videoStats&&a.videoStats.renderRemoteHeight),J(o,"RenderFrameRate",a.videoStats&&a.videoStats.googFrameRateOutput),J(o,"MuteState",a.videoDisabled),J(o,"TotalFreezeTime",a.videoStats&&a.videoStats.videoTotalFreezeTime),J(o,"TotalPlayDuration",a.videoStats&&a.videoStats.videoTotalPlayDuration),n[i]=o}e&&e(n)},t.getLocalVideoStats=function(e){var n={};for(var i in t.localStats){var o={},a=t.localStats[i];J(o,"TargetSendBitrate",a.videoTargetSendBitrate),J(o,"SendFrameRate",a.videoStats&&a.videoStats.googFrameRateSent),J(o,"SendBitrate",a.videoSendBitrate),J(o,"SendResolutionWidth",a.videoStats&&a.videoStats.googFrameWidthSent),J(o,"SendResolutionHeight",a.videoStats&&a.videoStats.googFrameHeightSent),J(o,"CaptureResolutionWidth",a.videoStats&&a.videoStats.renderLocalWidth),J(o,"CaptureResolutionHeight",a.videoStats&&a.videoStats.renderLocalHeight),J(o,"EncodeDelay",a.videoStats&&a.videoStats.googAvgEncodeMs),J(o,"MuteState",a.videoDisabled),J(o,"TotalFreezeTime",a.videoStats&&a.videoStats.videoTotalFreezeTime),J(o,"TotalDuration",a.videoStats&&a.videoStats.videoTotalPlayDuration),J(o,"CaptureFrameRate",a.videoStats&&a.videoStats.googFrameRateSent),n[i]=o,e&&e(n)}},t.getRemoteVideoQualityStats=function(e){var n={};for(var i in t.remoteStats){var o={},a=t.remoteStats[i];J(o,"videoReceiveDelay",a.videoStats&&a.videoStats.googCurrentDelayMs),J(o,"VideoFreezeRate",a.videoStats&&a.videoStats.videoFreezeRate),J(o,"FirstFrameTime",a.firstFrameTime),n[i]=o}e&&e(n)},t.getRemoteAudioQualityStats=function(e){var n={};for(var i in t.remoteStats){var o={},a=t.remoteStats[i];J(o,"audioReceiveDelay",a.audioStats&&a.audioStats.googCurrentDelayMs),J(o,"AudioFreezeRate",a.videoStats&&a.videoStats.videoFreezeRate),n[i]=o}e&&e(n)},t.getTransportStats=function(e){var n={},i={},o=t.gatewayClient.traffic_stats,a=o.peer_delay;if(J(n,"OutgoingAvailableBandwidth",t.gatewayClient.OutgoingAvailableBandwidth/1e3),J(n,"RTT",o&&o.access_delay),a){var r=!0,s=!1,d=void 0;try{for(var c,u=a[Symbol.iterator]();!(r=(c=u.next()).done);r=!0){var l=c.value;l.downlink_estimate_bandwidth&&(i[l.peer_uid]=l.downlink_estimate_bandwidth/1e3+"")}}catch(e){s=!0,d=e}finally{try{r||null==u.return||u.return()}finally{if(s)throw d}}}n.IncomingAvailableBandwidth=i,e&&e(n)},t.getSessionStats=function(e){var n={},i=t.gatewayClient.traffic_stats,o=t.gatewayClient.socket,a=0,r=0;for(var s in t.remoteStats)(d=t.remoteStats[s])&&d.videoStats&&d.videoStats.videoRecvBytesDelta&&(r+=parseInt(d.videoStats.videoRecvBytesDelta)),d&&d.audioStats&&d.audioStats.audioRecvBytesDelta&&(r+=parseInt(d.audioStats.audioRecvBytesDelta));for(var s in t.localStats){var d;(d=t.localStats[s])&&d.videoStats&&d.videoStats.videoSendBytesDelta&&(a+=parseInt(d.videoStats.videoSendBytesDelta)),d&&d.audioStats&&d.audioStats.audioSendBytesDelta&&(a+=parseInt(d.audioStats.audioSendBytesDelta))}var c=a+t.session.WSSendBytesDelta+t.session.HTTPSendBytesDelta,u=r+t.session.WSRecvBytesDelta+t.session.HTTPRecvBytesDelta,l=t.session.sendBytes+Object(fe.b)(),p=t.session.recvBytes+Object(fe.a)();t.gatewayClient.socket&&t.gatewayClient.socket.state===t.gatewayClient.CONNECTED&&(l+=o.getSendBytes(),p+=o.getRecvBytes());var f=1;i.peer_delay&&(f=i.peer_delay.length,f+=1),J(n,"Duration",o.getDuration()),J(n,"UserCount",f),J(n,"SendBytes",l),J(n,"RecvBytes",p),J(n,"SendBitrate",8*c/1e3),J(n,"RecvBitrate",8*u/1e3),e&&e(n)},t.isLocalVideoFreeze=function(e,t){var n=0,i=0;if(!e||!t)return!1;if(Object(p.isChrome)()||Object(p.isOpera)())n=e.googFrameRateInput,i=e.googFrameRateSent;else if(Object(p.isSafari)())n=parseInt(e.framerateMean),i=parseInt(e.framesEncoded)-parseInt(t.framesEncoded);else{if(!Object(p.isFireFox)())return!1;n=parseInt(e.framerateMean),i=parseInt(e.framesEncoded)-parseInt(t.framesEncoded)}return n>5&&i<3},t.isRemoteVideoFreeze=function(e,t){var n=0,i=0;if(!e||!t)return!1;if(Object(p.isChrome)()||Object(p.isOpera)())n=e.googFrameRateReceived,i=e.googFrameRateDecoded;else if(Object(p.isSafari)())n=e.framerateMean,i=parseInt(e.framesDecoded)-parseInt(t.framesDecoded);else{if(!Object(p.isFireFox)())return!1;n=parseInt(e.framesReceived)-parseInt(t.framesReceived),i=parseInt(e.framesDecoded)-parseInt(t.framesDecoded)}return n>5&&n<10&&i<3||n>10&&n<20&&i<4||n>20&&i<5},t.isAudioFreeze=function(e){if(Object(p.isChrome)()&&e){if(e.googDecodingPLC&&e.googDecodingPLCCNG&&e.googDecodingCTN)return(parseInt(e.googDecodingPLC)+parseInt(e.googDecodingPLCCNG))/parseInt(e.googDecodingCTN)>.2}else if((Object(p.isSafari)()||Object(p.isFireFox)())&&e.packetsLost&&e.packetsReceived)return parseInt(e.packetsLost)/(parseInt(e.packetsLost)+parseInt(e.packetsReceived))>.2;return!1},t.isAudioDecodeFailed=function(e){return!!((Object(p.isChrome)()||Object(p.isOpera)())&&e&&parseInt(e.bytesReceived)>0&&0===parseInt(e.googDecodingNormal))},t.networkQualityTimer=setInterval(function(){var e=t.gatewayClient.traffic_stats;t.gatewayClient.dispatchEvent({type:"network-quality",uplinkNetworkQuality:t.networkQualityTrans(e.uplink_network_quality),downlinkNetworkQuality:t.networkQualityTrans(e.downlink_network_quality)})},2e3),t.networkQualityTrans=function(e){return e>=0&&e<.17?1:e>=.17&&e<.36?2:e>=.36&&e<.59?3:e>=.59&&e<=1?4:e>1?5:0},t.getStatsTimer=setInterval(function(){var e=t.gatewayClient.traffic_stats,n=Date.now();t.gatewayClient.dispatchEvent({type:"_testException"}),Object.keys(t.localStats).length&&t.exceptionMonitor.setLocalStats(t.localStats),Object.keys(t.remoteStats).length&&t.exceptionMonitor.setRemoteStats(t.remoteStats);var i={};Object.keys(t.gatewayClient.remoteStreams).forEach(function(o){var a=t.gatewayClient.remoteStreams[o],r=t.remoteStats[o],s={id:o,updatedAt:n};i[o]=s,s.firstFrameTime=a.firstFrameTime,r?(s.audioTotalPlayDuration=r.audioTotalPlayDuration+1,s.audioTotalFreezeTime=r.audioTotalFreezeTime,s.isAudioFreeze=!1,s.isAudioDecodeFailed=!1,s.videoTotalPlayDuration=r.videoTotalPlayDuration+1,s.videoTotalFreezeTime=r.videoTotalFreezeTime,s.isVideoFreeze=!1):(s.audioTotalPlayDuration=1,s.audioTotalFreezeTime=0,s.videoTotalPlayDuration=1,s.videoTotalFreezeTime=0);var d=e&&e.peer_delay&&e.peer_delay.find(function(e){return e.peer_uid==o});d&&(s.peer_delay=d),a&&(a.isPlaying()&&(s.audioDisabled=a.userMuteAudio?"1":"0",s.videoDisabled=a.userMuteVideo?"1":"0"),r&&r.peer_delay&&d&&r.peer_delay.stream_type!==d.stream_type&&t.gatewayClient.dispatchEvent({type:"streamTypeChange",uid:o,streamType:d.stream_type}),a.pc&&"established"==a.pc.state&&a.pc.getStats(function(e){if(s.pcStats=e,s.audioStats=e.find(function(e){return"audio"==e.mediaType&&(e.id.indexOf("_recv")>-1||e.id.toLowerCase().indexOf("inbound")>-1)}),s.videoStats=e.find(function(e){return"video"==e.mediaType&&(e.id.indexOf("_recv")>-1||e.id.toLowerCase().indexOf("inbound")>-1)}),r&&r.audioStats&&s.audioStats){var n=parseInt(s.audioStats.bytesReceived)-parseInt(r.audioStats.bytesReceived),i=parseInt(s.audioStats.googDecodingNormal)-parseInt(r.audioStats.googDecodingNormal);if(s.audioStats.audioRecvBytesDelta=n,s.audioStats.audioDecodingNormalDelta=i,t.session.recvBytes+=n,isFinite(n)&&s.audioStats.timestamp){var o=s.audioStats.timestamp.getTime()-r.audioStats.timestamp.getTime();s.audioRecvBitrate=Math.floor(8*n/o)}t.isAudioFreeze(s.audioStats)&&s.audioTotalPlayDuration>10&&(s.audioTotalFreezeTime++,s.isAudioFreeze=!0),t.isAudioDecodeFailed(s.audioStats)&&s.audioTotalPlayDuration>10&&(s.isAudioDecodeFailed=!0),s.audioStats.audioTotalFreezeTime=s.audioTotalFreezeTime,s.audioStats.audioTotalPlayDuration=s.audioTotalPlayDuration,s.audioStats.audioFreezeRate=Math.ceil(100*s.audioTotalFreezeTime/s.audioTotalPlayDuration)}if(r&&r.videoStats&&s.videoStats){var d=parseInt(s.videoStats.bytesReceived)-parseInt(r.videoStats.bytesReceived);s.videoStats.videoRecvBytesDelta=d,t.session.recvBytes+=d,isFinite(d)&&s.videoStats.timestamp&&(o=s.videoStats.timestamp.getTime()-r.videoStats.timestamp.getTime(),s.videoRecvBitrate=Math.floor(8*d/o)),t.isRemoteVideoFreeze(s.videoStats,r.videoStats)&&(s.videoTotalFreezeTime++,s.isVideoFreeze=!0),s.videoStats.videoTotalFreezeTime=s.videoTotalFreezeTime,s.videoStats.videoTotalPlayDuration=s.videoTotalPlayDuration,s.videoStats.videoFreezeRate=Math.ceil(100*s.videoTotalFreezeTime/s.videoTotalPlayDuration),s.videoStats.renderRemoteWidth=a.videoWidth||s.videoStats.googFrameWidthReceived,s.videoStats.renderRemoteHeight=a.videoHeight||s.videoStats.googFrameHeightReceived}}))}),t.remoteStats=i;var o={};if(Object.keys(t.gatewayClient.localStreams).forEach(function(e){var i=t.gatewayClient.localStreams[e],a=t.localStats[e],r={id:e,updatedAt:n};o[e]=r,a?(r.videoTotalPlayDuration=a.videoTotalPlayDuration+1,r.videoTotalFreezeTime=a.videoTotalFreezeTime,r.isVideoFreeze=!1):(r.videoTotalPlayDuration=1,r.videoTotalFreezeTime=0),i&&(i.isPlaying()&&(r.audioDisabled=i.userMuteAudio?"1":"0",r.videoDisabled=i.userMuteVideo?"1":"0"),i.video&&i.attributes.maxVideoBW?r.videoTargetSendBitrate=i.attributes.maxVideoBW:i.video&&i.screenAttributes&&(r.videoTargetSendBitrate=i.screenAttributes.maxVideoBW),i.pc&&"established"==i.pc.state&&i.pc.getStats(function(e){if(r.pcStats=e.reverse(),r.audioStats=e.find(function(e){return"audio"==e.mediaType&&(e.id.indexOf("_send")>-1||e.id.toLowerCase().indexOf("outbound")>-1)}),r.videoStats=e.find(function(e){return"video"==e.mediaType&&(e.id.indexOf("_send")>-1||e.id.toLowerCase().indexOf("outbound")>-1)}),r.audioStats&&a&&a.audioStats){var n=parseInt(r.audioStats.bytesSent)-parseInt(a.audioStats.bytesSent);if(r.audioStats.audioSendBytesDelta=n,t.session.sendBytes+=n,isFinite(n)&&r.audioStats.timestamp){var o=r.audioStats.timestamp.getTime()-a.audioStats.timestamp.getTime();r.audioSendBitrate=Math.floor(8*n/o)}}if(r.videoStats&&a&&a.videoStats){var s=parseInt(r.videoStats.bytesSent)-parseInt(a.videoStats.bytesSent);r.videoStats.videoSendBytesDelta=s,t.session.sendBytes+=s,isFinite(s)&&r.videoStats.timestamp&&(o=r.videoStats.timestamp.getTime()-a.videoStats.timestamp.getTime(),r.videoSendBitrate=Math.floor(8*s/o)),t.isLocalVideoFreeze(r.videoStats,a.videoStats)&&(r.videoTotalFreezeTime++,r.isVideoFreeze=!0),r.videoStats.videoTotalFreezeTime=r.videoTotalFreezeTime,r.videoStats.videoTotalPlayDuration=r.videoTotalPlayDuration,r.videoStats.videoFreezeRate=Math.ceil(100*r.videoTotalFreezeTime/r.videoTotalPlayDuration),r.videoStats.renderLocalWidth=i.videoWidth||r.videoStats.googFrameWidthSent,r.videoStats.renderLocalHeight=i.videoHeight||r.videoStats.googFrameHeightSent}}))}),t.localStats=o,t.session.HTTPSendBytesDelta=Object(fe.b)()-t.session.HTTPSendBytes,t.session.HTTPSendBytes=Object(fe.b)(),t.session.HTTPRecvBytesDelta=Object(fe.a)()-t.session.HTTPRecvBytes,t.session.HTTPRecvBytes=Object(fe.a)(),t.gatewayClient.socket&&t.gatewayClient.socket.state===t.gatewayClient.CONNECTED){var a=t.gatewayClient.socket;t.session.WSSendBytesDelta=a.getSendBytes()-t.session.WSSendBytes,t.session.WSSendBytes=a.getSendBytes(),t.session.WSRecvBytesDelta=a.getRecvBytes()-t.session.WSRecvBytes,t.session.WSRecvBytes=a.getRecvBytes()}},1e3),t.gatewayClient.on("join",function(){t.session={sendBytes:0,recvBytes:0,WSSendBytes:0,WSSendBytesDelta:0,WSRecvBytes:0,WSRecvBytesDelta:0,HTTPSendBytes:0,HTTPSendBytesDelta:0,HTTPRecvBytes:0,HTTPRecvBytesDelta:0}}),t}(t.gatewayClient),t.configDistributManager=function(e){var t={};return t.client=e,t.client.on("config-distribute",function(n){var o=n.joinInfo,r=n.config;if(r){re(r.uploadLog)||(Object(i.setParameter)("UPLOAD_LOG",r.uploadLog),a.b.reportApiInvoke(o.sid,{name:"_configDistribute",options:{feature:"uploadLog",value:r.uploadLog}})()),re(r.dualStream)||(e.isDualStream=r.dualStream,a.b.reportApiInvoke(o.sid,{name:"_configDistribute",options:{feature:"dualStream",value:r.dualStream}})()),re(r.streamFallbackOption)||t.client.on("stream-subscribed",function(e){var n=e.stream;n?(t.client.gatewayClient.setStreamFallbackOption(n,r.streamFallbackOption),a.b.reportApiInvoke(o.sid,{name:"_configDistribute",options:{feature:"streamFallbackOption",value:r.streamFallbackOption,streamId:n.getId()}})()):a.b.reportApiInvoke(o.sid,{name:"_configDistribute",options:{feature:"streamFallbackOption",value:r.streamFallbackOption,streamId:n.getId(),err:"invalid stream"}})()});try{Object.keys(r).map(function(e){return Object(i.setParameter)(e,r[e])})}catch(e){}}}),t}(t),re(e.turnServer)||t.setTurnServer(e.turnServer),re(e.proxyServer)||t.setProxyServer(e.proxyServer),"live"===t.mode&&(t.gatewayClient.role="audience"),"rtc"===t.mode&&(t.gatewayClient.role="host"),t.on("onMultiIP",function(e){t.gatewayClient.closeGateway(),t.gatewayClient.socket=void 0,t.gatewayClient.hasChangeBGPAddress=!0,t.joinInfo.multiIP=e.arg.option,t.gatewayClient.state=De.CONNECTING,be(t.joinInfo,function(e){o.default.info("[".concat(t.clientId,"] Joining channel: ").concat(t.channel)),t.joinInfo.cid=e.cid,t.joinInfo.uid=e.uid,t.joinInfo.uni_lbs_ip=e.uni_lbs_ip,t.joinInfo.gatewayAddr=e.gateway_addr,t.onSuccess?t.gatewayClient.join(t.joinInfo,t.key,function(e){o.default.info("[".concat(t.clientId,"] Join channel ").concat(t.channel," success"));var n=t.onSuccess;t.onSuccess=null,t.onFailure=null,n(e)},t.onFailure):(t.gatewayClient.joinInfo=I()({},t.joinInfo),t.gatewayClient.rejoin())},t.onFailure)}),t.on("rejoin-start",function(){t._renewSession(),a.b.sessionInit(e.sessionId,{lts:(new Date).getTime(),extend:{rejoin:!0},cname:t.channel,appid:e.appId,mode:e.mode,succ:!0})}),t.on("recover",function(){t._renewSession(),a.b.sessionInit(e.sessionId,{lts:(new Date).getTime(),extend:{recover:!0},cname:t.channel,appid:e.appId,mode:e.mode,succ:!0})}),t.on("rejoin",function(){var e=2===t.highStreamState?2:0;t.highStream&&0===e&&(o.default.info("[".concat(t.clientId,"] publish after rejoin")),t.highStreamState=2,t.lowStreamState=2,t.publish(t.highStream,function(e){e&&o.default.info("[".concat(t.clientId,"] "),e)}))}),t.on("streamPublished",function(e){t.hasPublished||(t.hasPublished=!0,t.gatewayClient.dispatchEvent(d({type:"stream-published",stream:e.stream})))}),t.on("pubP2PLost",function(e){o.default.debug("[".concat(t.clientId,"] Start reconnect local peerConnection: ").concat(t.highStream.getId())),t.gatewayClient.dispatchEvent({type:"stream-reconnect-start",uid:t.highStream.getId()}),1===t.highStreamState&&(t.highStreamState=0,t.lowStreamState=0),t._unpublish(t.highStream,function(){t._publish(t.highStream,function(){o.default.debug("[".concat(t.clientId,"] Reconnect local peerConnection success: ").concat(t.highStream.getId())),t.gatewayClient.dispatchEvent({type:"stream-reconnect-end",uid:t.highStream.getId(),success:!0,reason:""})},function(e){o.default.debug("[".concat(t.clientId,"] Reconnect local peerConnection failed: ").concat(e)),t.gatewayClient.dispatchEvent({type:"stream-reconnect-end",uid:t.highStream.getId(),success:!1,reason:e})})},function(e){o.default.debug("[".concat(t.clientId,"] Reconnect local peerConnection failed: ").concat(e)),t.gatewayClient.dispatchEvent({type:"stream-reconnect-end",uid:t.highStream.getId(),success:!1,reason:e})})}),t.on("subP2PLost",function(e){o.default.debug("[".concat(t.clientId,"] Start reconnect remote peerConnection: ").concat(e.stream.getId())),t.gatewayClient.dispatchEvent({type:"stream-reconnect-start",uid:e.stream.getId()}),t.gatewayClient.unsubscribe(e.stream,function(){t.gatewayClient.subscribe(e.stream,function(){o.default.debug("[".concat(t.clientId,"] Reconnect remote peerConnection success: ").concat(e.stream.getId())),t.gatewayClient.dispatchEvent({type:"stream-reconnect-end",uid:e.stream.getId(),success:!1,reason:""})},function(n){o.default.debug("[".concat(t.clientId,"] Reconnect remote peerConnection failed: "),n),t.gatewayClient.dispatchEvent({type:"stream-reconnect-end",uid:e.stream.getId(),success:!1,reason:n})})},function(n){o.default.debug("[".concat(t.clientId,"] \" + 'Reconnect remote peerConnection failed: "),n),t.gatewayClient.dispatchEvent({type:"stream-reconnect-end",uid:e.stream.getId(),success:!1,reason:n})})}),xe.on("networkTypeChanged",function(e){t.gatewayClient&&t.gatewayClient.dispatchEvent(e);var n=I()({},e,{type:"network-type-changed"});t.gatewayClient.dispatchEvent(n)}),K.on("recordingDeviceChanged",function(e){t.gatewayClient&&t.gatewayClient.dispatchEvent(e);var n=I()({},e,{type:"recording-device-changed"});t.gatewayClient.dispatchEvent(n)}),K.on("playoutDeviceChanged",function(e){t.gatewayClient&&t.gatewayClient.dispatchEvent(e);var n=I()({},e,{type:"playout-device-changed"});t.gatewayClient.dispatchEvent(n)}),K.on("cameraChanged",function(e){t.gatewayClient&&t.gatewayClient.dispatchEvent(e);var n=I()({},e,{type:"camera-changed"});t.gatewayClient.dispatchEvent(n)}),t.gatewayClient.on("streamTypeChange",function(n){var i=I()({},n,{type:"stream-type-changed"});t.gatewayClient.dispatchEvent(i),a.b.reportApiInvoke(e.sessionId,{name:"streamTypeChange"})(null,JSON.stringify(n))}),t},Fe={width:640,height:360,videoBitrate:400,videoFramerate:15,lowLatency:!1,audioSampleRate:48e3,audioBitrate:48,audioChannels:1,videoGop:30,videoCodecProfile:100,userCount:0,userConfigExtraInfo:{},backgroundColor:0,transcodingUsers:[]},Be={width:0,height:0,videoGop:30,videoFramerate:15,videoBitrate:400,audioSampleRate:44100,audioBitrate:48,audioChannels:1},Ue=K.getDevices,je=F;t.default={TranscodingUser:{uid:0,x:0,y:0,width:0,height:0,zOrder:0,alpha:1},LiveTranscoding:Fe,createClient:function(e){var t=a.b.reportApiInvoke(null,{name:"createClient",options:arguments,tag:"tracer"});(e=I()({},e||{})).codec||(e.codec=function(e){switch(e){case"h264_interop":return"h264";default:return"vp8"}}(e.mode));var n=function(e){return ce.includes(e.mode)?ue.includes(e.codec)?"h264_interop"==e.mode&&"h264"!==e.codec&&A.CLIENT_MODE_CODEC_MISMATCH:A.INVALID_CLIENT_CODEC:A.INVALID_CLIENT_MODE}(e);if(n)throw o.default.error("Invalid parameter setting MODE: ".concat(e.mode," CODEC: ").concat(e.codec," ERROR ").concat(n)),t(n),new Error(n);return o.default.info("Creating client, MODE: ".concat(e.mode," CODEC: ").concat(e.codec)),function(e){switch(e.mode){case"interop":case"h264_interop":e.mode="live";break;case"web-only":e.mode="rtc"}}(e),t(null,e),Ve(e)},createStream:function(e){var t=a.b.reportApiInvoke(null,{name:"createStream",options:arguments,tag:"tracer"});q(e,"StreamSpec");var n=e.streamID,i=e.audio,r=e.video,s=e.screen,d=(e.audioSource,e.videoSource,e.cameraId),c=e.microphoneId,u=e.mirror,l=e.extensionId,p=e.mediaSource,f=e.audioProcessing;if(!re(n)&&!Object(G.c)(n)&&!Z(n,1,255))throw new Error("[String streamID] Length of the string: [1,255]. ASCII characters only. [Number streamID] The value range is [0,10000]");if($(i,"audio"),$(r,"video"),re(s)||$(s,"screen"),re(d)||Q(d,"cameraId",0,255,!1),re(c)||Q(c,"microphoneId",0,255,!1),re(l)||Q(l,"extensionId"),re(p)||Y(p,"mediaSource",["screen","application","window"]),re(u)||$(u,"mirror"),!re(f)){var m=f.AGC,g=f.AEC,v=f.ANS;re(m)||$(m,"AGC"),re(g)||$(g,"AEC"),re(v)||$(v,"ANS")}o.default.debug("Create stream");var S=se(e);return t(),S},Logger:o.default,getDevices:Ue,getScreenSources:je,getParameter:i.getParameter,setParameter:i.setParameter,checkSystemRequirements:function(){var e=a.b.reportApiInvoke(null,{name:"checkSystemRequirements",options:arguments,tag:"tracer"}),t=window.RTCPeerConnection||window.mozRTCPeerConnection||window.webkitRTCPeerConnection,n=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.msGetUserMedia||navigator.mozGetUserMedia||navigator.mediaDevices&&navigator.mediaDevices.getUserMedia,i=window.WebSocket,r=!!t&&!!n&&!!i,s=!1;o.default.debug(p.getBrowserInfo(),"isAPISupport:"+r),p.isChrome()&&p.getBrowserVersion()>=58&&"iOS"!==p.getBrowserOS()&&(s=!0),p.isFireFox()&&p.getBrowserVersion()>=56&&(s=!0),p.isOpera()&&p.getBrowserVersion()>=45&&(s=!0),p.isSafari()&&p.getBrowserVersion()>=11&&(s=!0),(p.isWeChatBrowser()||p.isQQBrowser())&&"iOS"!==p.getBrowserOS()&&(s=!0),p.isSupportedPC()||p.isSupportedMobile()||(s=!1);var d=r&&s;return e(null,d),d},getSupportedCodec:de.getSupportedCodec,VERSION:i.VERSION,BUILD:i.BUILD,AUDIO_SAMPLE_RATE_32000:32e3,AUDIO_SAMPLE_RATE_44100:44100,AUDIO_SAMPLE_RATE_48000:48e3,VIDEO_CODEC_PROFILE_BASELINE:66,VIDEO_CODEC_PROFILE_MAIN:77,VIDEO_CODEC_PROFILE_HIGH:100,REMOTE_VIDEO_STREAM_HIGH:0,REMOTE_VIDEO_STREAM_LOW:1,REMOTE_VIDEO_STREAM_MEDIUM:2}}]).default});
});
return ___scope___.entry = "AgoraRTCSDK.min.js";
});
FuseBox.pkg("base64-js", {}, function(___scope___){
___scope___.file("index.js", function(exports, require, module, __filename, __dirname){

'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

});
return ___scope___.entry = "index.js";
});
FuseBox.pkg("buffer", {}, function(___scope___){
___scope___.file("index.js", function(exports, require, module, __filename, __dirname){

if (FuseBox.isServer) {
	module.exports = global.require("buffer");
} else {
	/*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
     * @license  MIT
     */
	/* eslint-disable no-proto */

	("use strict");

	var base64 = require("base64-js");
	var ieee754 = require("ieee754");

	exports.Buffer = Buffer;
	exports.FuseShim = true;
	exports.SlowBuffer = SlowBuffer;
	exports.INSPECT_MAX_BYTES = 50;

	var K_MAX_LENGTH = 0x7fffffff;
	exports.kMaxLength = K_MAX_LENGTH;

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
	 *               implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * We report that the browser does not support typed arrays if the are not subclassable
	 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
	 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
	 * for __proto__ and has a buggy typed array implementation.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

	if (!Buffer.TYPED_ARRAY_SUPPORT) {
		console.error(
			"This browser lacks typed array (Uint8Array) support which is required by " + "`buffer` v5.x. Use `buffer` v4.x if you require old browser support."
		);
	}

	function typedArraySupport() {
		// Can typed array instances can be augmented?
		try {
			var arr = new Uint8Array(1);
			arr.__proto__ = {
				__proto__: Uint8Array.prototype,
				foo: function() {
					return 42;
				}
			};
			return arr.foo() === 42;
		} catch (e) {
			return false;
		}
	}

	function createBuffer(length) {
		if (length > K_MAX_LENGTH) {
			throw new RangeError("Invalid typed array length");
		}
		// Return an augmented `Uint8Array` instance
		var buf = new Uint8Array(length);
		buf.__proto__ = Buffer.prototype;
		return buf;
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer(arg, encodingOrOffset, length) {
		// Common case.
		if (typeof arg === "number") {
			if (typeof encodingOrOffset === "string") {
				throw new Error("If encoding is specified then the first argument must be a string");
			}
			return allocUnsafe(arg);
		}
		return from(arg, encodingOrOffset, length);
	}

	// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
	if (typeof Symbol !== "undefined" && Symbol.species && Buffer[Symbol.species] === Buffer) {
		Object.defineProperty(Buffer, Symbol.species, {
			value: null,
			configurable: true,
			enumerable: false,
			writable: false
		});
	}

	Buffer.poolSize = 8192; // not used by this implementation

	function from(value, encodingOrOffset, length) {
		if (typeof value === "number") {
			throw new TypeError('"value" argument must not be a number');
		}

		if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
			return fromArrayBuffer(value, encodingOrOffset, length);
		}

		if (typeof value === "string") {
			return fromString(value, encodingOrOffset);
		}

		return fromObject(value);
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function(value, encodingOrOffset, length) {
		return from(value, encodingOrOffset, length);
	};

	// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
	// https://github.com/feross/buffer/pull/148
	Buffer.prototype.__proto__ = Uint8Array.prototype;
	Buffer.__proto__ = Uint8Array;

	function assertSize(size) {
		if (typeof size !== "number") {
			throw new TypeError('"size" argument must be a number');
		} else if (size < 0) {
			throw new RangeError('"size" argument must not be negative');
		}
	}

	function alloc(size, fill, encoding) {
		assertSize(size);
		if (size <= 0) {
			return createBuffer(size);
		}
		if (fill !== undefined) {
			// Only pay attention to encoding if it's a string. This
			// prevents accidentally sending in a number that would
			// be interpretted as a start offset.
			return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
		}
		return createBuffer(size);
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function(size, fill, encoding) {
		return alloc(size, fill, encoding);
	};

	function allocUnsafe(size) {
		assertSize(size);
		return createBuffer(size < 0 ? 0 : checked(size) | 0);
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function(size) {
		return allocUnsafe(size);
	};
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function(size) {
		return allocUnsafe(size);
	};

	function fromString(string, encoding) {
		if (typeof encoding !== "string" || encoding === "") {
			encoding = "utf8";
		}

		if (!Buffer.isEncoding(encoding)) {
			throw new TypeError('"encoding" must be a valid string encoding');
		}

		var length = byteLength(string, encoding) | 0;
		var buf = createBuffer(length);

		var actual = buf.write(string, encoding);

		if (actual !== length) {
			// Writing a hex string, for example, that contains invalid characters will
			// cause everything after the first invalid character to be ignored. (e.g.
			// 'abxxcd' will be treated as 'ab')
			buf = buf.slice(0, actual);
		}

		return buf;
	}

	function fromArrayLike(array) {
		var length = array.length < 0 ? 0 : checked(array.length) | 0;
		var buf = createBuffer(length);
		for (var i = 0; i < length; i += 1) {
			buf[i] = array[i] & 255;
		}
		return buf;
	}

	function fromArrayBuffer(array, byteOffset, length) {
		array.byteLength; // this throws if `array` is not a valid ArrayBuffer

		if (byteOffset < 0 || array.byteLength < byteOffset) {
			throw new RangeError("'offset' is out of bounds");
		}

		if (array.byteLength < byteOffset + (length || 0)) {
			throw new RangeError("'length' is out of bounds");
		}

		var buf;
		if (byteOffset === undefined && length === undefined) {
			buf = new Uint8Array(array);
		} else if (length === undefined) {
			buf = new Uint8Array(array, byteOffset);
		} else {
			buf = new Uint8Array(array, byteOffset, length);
		}

		// Return an augmented `Uint8Array` instance
		buf.__proto__ = Buffer.prototype;
		return buf;
	}

	function fromObject(obj) {
		if (Buffer.isBuffer(obj)) {
			var len = checked(obj.length) | 0;
			var buf = createBuffer(len);

			if (buf.length === 0) {
				return buf;
			}

			obj.copy(buf, 0, 0, len);
			return buf;
		}

		if (obj) {
			if ((typeof ArrayBuffer !== "undefined" && obj.buffer instanceof ArrayBuffer) || "length" in obj) {
				if (typeof obj.length !== "number" || isnan(obj.length)) {
					return createBuffer(0);
				}
				return fromArrayLike(obj);
			}

			if (obj.type === "Buffer" && Array.isArray(obj.data)) {
				return fromArrayLike(obj.data);
			}
		}

		throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.");
	}

	function checked(length) {
		// Note: cannot use `length < K_MAX_LENGTH` here because that fails when
		// length is NaN (which is otherwise coerced to zero.)
		if (length >= K_MAX_LENGTH) {
			throw new RangeError("Attempt to allocate Buffer larger than maximum " + "size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
		}
		return length | 0;
	}

	function SlowBuffer(length) {
		if (+length != length) {
			// eslint-disable-line eqeqeq
			length = 0;
		}
		return Buffer.alloc(+length);
	}

	Buffer.isBuffer = function isBuffer(b) {
		return !!(b != null && b._isBuffer);
	};

	Buffer.compare = function compare(a, b) {
		if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
			throw new TypeError("Arguments must be Buffers");
		}

		if (a === b) return 0;

		var x = a.length;
		var y = b.length;

		for (var i = 0, len = Math.min(x, y); i < len; ++i) {
			if (a[i] !== b[i]) {
				x = a[i];
				y = b[i];
				break;
			}
		}

		if (x < y) return -1;
		if (y < x) return 1;
		return 0;
	};

	Buffer.isEncoding = function isEncoding(encoding) {
		switch (String(encoding).toLowerCase()) {
			case "hex":
			case "utf8":
			case "utf-8":
			case "ascii":
			case "latin1":
			case "binary":
			case "base64":
			case "ucs2":
			case "ucs-2":
			case "utf16le":
			case "utf-16le":
				return true;
			default:
				return false;
		}
	};

	Buffer.concat = function concat(list, length) {
		if (!Array.isArray(list)) {
			throw new TypeError('"list" argument must be an Array of Buffers');
		}

		if (list.length === 0) {
			return Buffer.alloc(0);
		}

		var i;
		if (length === undefined) {
			length = 0;
			for (i = 0; i < list.length; ++i) {
				length += list[i].length;
			}
		}

		var buffer = Buffer.allocUnsafe(length);
		var pos = 0;
		for (i = 0; i < list.length; ++i) {
			var buf = list[i];
			if (!Buffer.isBuffer(buf)) {
				throw new TypeError('"list" argument must be an Array of Buffers');
			}
			buf.copy(buffer, pos);
			pos += buf.length;
		}
		return buffer;
	};

	function byteLength(string, encoding) {
		if (Buffer.isBuffer(string)) {
			return string.length;
		}
		if (typeof ArrayBuffer !== "undefined" && typeof ArrayBuffer.isView === "function" && (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
			return string.byteLength;
		}
		if (typeof string !== "string") {
			string = "" + string;
		}

		var len = string.length;
		if (len === 0) return 0;

		// Use a for loop to avoid recursion
		var loweredCase = false;
		for (;;) {
			switch (encoding) {
				case "ascii":
				case "latin1":
				case "binary":
					return len;
				case "utf8":
				case "utf-8":
				case undefined:
					return utf8ToBytes(string).length;
				case "ucs2":
				case "ucs-2":
				case "utf16le":
				case "utf-16le":
					return len * 2;
				case "hex":
					return len >>> 1;
				case "base64":
					return base64ToBytes(string).length;
				default:
					if (loweredCase) return utf8ToBytes(string).length; // assume utf8
					encoding = ("" + encoding).toLowerCase();
					loweredCase = true;
			}
		}
	}
	Buffer.byteLength = byteLength;

	function slowToString(encoding, start, end) {
		var loweredCase = false;

		// No need to verify that "this.length <= MAX_UINT32" since it's a read-only
		// property of a typed array.

		// This behaves neither like String nor Uint8Array in that we set start/end
		// to their upper/lower bounds if the value passed is out of range.
		// undefined is handled specially as per ECMA-262 6th Edition,
		// Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
		if (start === undefined || start < 0) {
			start = 0;
		}
		// Return early if start > this.length. Done here to prevent potential uint32
		// coercion fail below.
		if (start > this.length) {
			return "";
		}

		if (end === undefined || end > this.length) {
			end = this.length;
		}

		if (end <= 0) {
			return "";
		}

		// Force coersion to uint32. This will also coerce falsey/NaN values to 0.
		end >>>= 0;
		start >>>= 0;

		if (end <= start) {
			return "";
		}

		if (!encoding) encoding = "utf8";

		while (true) {
			switch (encoding) {
				case "hex":
					return hexSlice(this, start, end);

				case "utf8":
				case "utf-8":
					return utf8Slice(this, start, end);

				case "ascii":
					return asciiSlice(this, start, end);

				case "latin1":
				case "binary":
					return latin1Slice(this, start, end);

				case "base64":
					return base64Slice(this, start, end);

				case "ucs2":
				case "ucs-2":
				case "utf16le":
				case "utf-16le":
					return utf16leSlice(this, start, end);

				default:
					if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
					encoding = (encoding + "").toLowerCase();
					loweredCase = true;
			}
		}
	}

	// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
	// Buffer instances.
	Buffer.prototype._isBuffer = true;

	function swap(b, n, m) {
		var i = b[n];
		b[n] = b[m];
		b[m] = i;
	}

	Buffer.prototype.swap16 = function swap16() {
		var len = this.length;
		if (len % 2 !== 0) {
			throw new RangeError("Buffer size must be a multiple of 16-bits");
		}
		for (var i = 0; i < len; i += 2) {
			swap(this, i, i + 1);
		}
		return this;
	};

	Buffer.prototype.swap32 = function swap32() {
		var len = this.length;
		if (len % 4 !== 0) {
			throw new RangeError("Buffer size must be a multiple of 32-bits");
		}
		for (var i = 0; i < len; i += 4) {
			swap(this, i, i + 3);
			swap(this, i + 1, i + 2);
		}
		return this;
	};

	Buffer.prototype.swap64 = function swap64() {
		var len = this.length;
		if (len % 8 !== 0) {
			throw new RangeError("Buffer size must be a multiple of 64-bits");
		}
		for (var i = 0; i < len; i += 8) {
			swap(this, i, i + 7);
			swap(this, i + 1, i + 6);
			swap(this, i + 2, i + 5);
			swap(this, i + 3, i + 4);
		}
		return this;
	};

	Buffer.prototype.toString = function toString() {
		var length = this.length;
		if (length === 0) return "";
		if (arguments.length === 0) return utf8Slice(this, 0, length);
		return slowToString.apply(this, arguments);
	};

	Buffer.prototype.equals = function equals(b) {
		if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
		if (this === b) return true;
		return Buffer.compare(this, b) === 0;
	};

	Buffer.prototype.inspect = function inspect() {
		var str = "";
		var max = exports.INSPECT_MAX_BYTES;
		if (this.length > 0) {
			str = this.toString("hex", 0, max)
				.match(/.{2}/g)
				.join(" ");
			if (this.length > max) str += " ... ";
		}
		return "<Buffer " + str + ">";
	};

	Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
		if (!Buffer.isBuffer(target)) {
			throw new TypeError("Argument must be a Buffer");
		}

		if (start === undefined) {
			start = 0;
		}
		if (end === undefined) {
			end = target ? target.length : 0;
		}
		if (thisStart === undefined) {
			thisStart = 0;
		}
		if (thisEnd === undefined) {
			thisEnd = this.length;
		}

		if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
			throw new RangeError("out of range index");
		}

		if (thisStart >= thisEnd && start >= end) {
			return 0;
		}
		if (thisStart >= thisEnd) {
			return -1;
		}
		if (start >= end) {
			return 1;
		}

		start >>>= 0;
		end >>>= 0;
		thisStart >>>= 0;
		thisEnd >>>= 0;

		if (this === target) return 0;

		var x = thisEnd - thisStart;
		var y = end - start;
		var len = Math.min(x, y);

		var thisCopy = this.slice(thisStart, thisEnd);
		var targetCopy = target.slice(start, end);

		for (var i = 0; i < len; ++i) {
			if (thisCopy[i] !== targetCopy[i]) {
				x = thisCopy[i];
				y = targetCopy[i];
				break;
			}
		}

		if (x < y) return -1;
		if (y < x) return 1;
		return 0;
	};

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
		// Empty buffer means no match
		if (buffer.length === 0) return -1;

		// Normalize byteOffset
		if (typeof byteOffset === "string") {
			encoding = byteOffset;
			byteOffset = 0;
		} else if (byteOffset > 0x7fffffff) {
			byteOffset = 0x7fffffff;
		} else if (byteOffset < -0x80000000) {
			byteOffset = -0x80000000;
		}
		byteOffset = +byteOffset; // Coerce to Number.
		if (isNaN(byteOffset)) {
			// byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
			byteOffset = dir ? 0 : buffer.length - 1;
		}

		// Normalize byteOffset: negative offsets start from the end of the buffer
		if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
		if (byteOffset >= buffer.length) {
			if (dir) return -1;
			else byteOffset = buffer.length - 1;
		} else if (byteOffset < 0) {
			if (dir) byteOffset = 0;
			else return -1;
		}

		// Normalize val
		if (typeof val === "string") {
			val = Buffer.from(val, encoding);
		}

		// Finally, search either indexOf (if dir is true) or lastIndexOf
		if (Buffer.isBuffer(val)) {
			// Special case: looking for empty string/buffer always fails
			if (val.length === 0) {
				return -1;
			}
			return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
		} else if (typeof val === "number") {
			val = val & 0xff; // Search for a byte value [0-255]
			if (typeof Uint8Array.prototype.indexOf === "function") {
				if (dir) {
					return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
				} else {
					return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
				}
			}
			return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
		}

		throw new TypeError("val must be string, number or Buffer");
	}

	function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
		var indexSize = 1;
		var arrLength = arr.length;
		var valLength = val.length;

		if (encoding !== undefined) {
			encoding = String(encoding).toLowerCase();
			if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
				if (arr.length < 2 || val.length < 2) {
					return -1;
				}
				indexSize = 2;
				arrLength /= 2;
				valLength /= 2;
				byteOffset /= 2;
			}
		}

		function read(buf, i) {
			if (indexSize === 1) {
				return buf[i];
			} else {
				return buf.readUInt16BE(i * indexSize);
			}
		}

		var i;
		if (dir) {
			var foundIndex = -1;
			for (i = byteOffset; i < arrLength; i++) {
				if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
					if (foundIndex === -1) foundIndex = i;
					if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
				} else {
					if (foundIndex !== -1) i -= i - foundIndex;
					foundIndex = -1;
				}
			}
		} else {
			if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
			for (i = byteOffset; i >= 0; i--) {
				var found = true;
				for (var j = 0; j < valLength; j++) {
					if (read(arr, i + j) !== read(val, j)) {
						found = false;
						break;
					}
				}
				if (found) return i;
			}
		}

		return -1;
	}

	Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
		return this.indexOf(val, byteOffset, encoding) !== -1;
	};

	Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
		return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
	};

	Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
		return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
	};

	function hexWrite(buf, string, offset, length) {
		offset = Number(offset) || 0;
		var remaining = buf.length - offset;
		if (!length) {
			length = remaining;
		} else {
			length = Number(length);
			if (length > remaining) {
				length = remaining;
			}
		}

		// must be an even number of digits
		var strLen = string.length;
		if (strLen % 2 !== 0) throw new TypeError("Invalid hex string");

		if (length > strLen / 2) {
			length = strLen / 2;
		}
		for (var i = 0; i < length; ++i) {
			var parsed = parseInt(string.substr(i * 2, 2), 16);
			if (isNaN(parsed)) return i;
			buf[offset + i] = parsed;
		}
		return i;
	}

	function utf8Write(buf, string, offset, length) {
		return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
	}

	function asciiWrite(buf, string, offset, length) {
		return blitBuffer(asciiToBytes(string), buf, offset, length);
	}

	function latin1Write(buf, string, offset, length) {
		return asciiWrite(buf, string, offset, length);
	}

	function base64Write(buf, string, offset, length) {
		return blitBuffer(base64ToBytes(string), buf, offset, length);
	}

	function ucs2Write(buf, string, offset, length) {
		return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
	}

	Buffer.prototype.write = function write(string, offset, length, encoding) {
		// Buffer#write(string)
		if (offset === undefined) {
			encoding = "utf8";
			length = this.length;
			offset = 0;
			// Buffer#write(string, encoding)
		} else if (length === undefined && typeof offset === "string") {
			encoding = offset;
			length = this.length;
			offset = 0;
			// Buffer#write(string, offset[, length][, encoding])
		} else if (isFinite(offset)) {
			offset = offset >>> 0;
			if (isFinite(length)) {
				length = length >>> 0;
				if (encoding === undefined) encoding = "utf8";
			} else {
				encoding = length;
				length = undefined;
			}
			// legacy write(string, encoding, offset, length) - remove in v0.13
		} else {
			throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
		}

		var remaining = this.length - offset;
		if (length === undefined || length > remaining) length = remaining;

		if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
			throw new RangeError("Attempt to write outside buffer bounds");
		}

		if (!encoding) encoding = "utf8";

		var loweredCase = false;
		for (;;) {
			switch (encoding) {
				case "hex":
					return hexWrite(this, string, offset, length);

				case "utf8":
				case "utf-8":
					return utf8Write(this, string, offset, length);

				case "ascii":
					return asciiWrite(this, string, offset, length);

				case "latin1":
				case "binary":
					return latin1Write(this, string, offset, length);

				case "base64":
					// Warning: maxLength not taken into account in base64Write
					return base64Write(this, string, offset, length);

				case "ucs2":
				case "ucs-2":
				case "utf16le":
				case "utf-16le":
					return ucs2Write(this, string, offset, length);

				default:
					if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
					encoding = ("" + encoding).toLowerCase();
					loweredCase = true;
			}
		}
	};

	Buffer.prototype.toJSON = function toJSON() {
		return {
			type: "Buffer",
			data: Array.prototype.slice.call(this._arr || this, 0)
		};
	};

	function base64Slice(buf, start, end) {
		if (start === 0 && end === buf.length) {
			return base64.fromByteArray(buf);
		} else {
			return base64.fromByteArray(buf.slice(start, end));
		}
	}

	function utf8Slice(buf, start, end) {
		end = Math.min(buf.length, end);
		var res = [];

		var i = start;
		while (i < end) {
			var firstByte = buf[i];
			var codePoint = null;
			var bytesPerSequence = firstByte > 0xef ? 4 : firstByte > 0xdf ? 3 : firstByte > 0xbf ? 2 : 1;

			if (i + bytesPerSequence <= end) {
				var secondByte, thirdByte, fourthByte, tempCodePoint;

				switch (bytesPerSequence) {
					case 1:
						if (firstByte < 0x80) {
							codePoint = firstByte;
						}
						break;
					case 2:
						secondByte = buf[i + 1];
						if ((secondByte & 0xc0) === 0x80) {
							tempCodePoint = ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f);
							if (tempCodePoint > 0x7f) {
								codePoint = tempCodePoint;
							}
						}
						break;
					case 3:
						secondByte = buf[i + 1];
						thirdByte = buf[i + 2];
						if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80) {
							tempCodePoint = ((firstByte & 0xf) << 0xc) | ((secondByte & 0x3f) << 0x6) | (thirdByte & 0x3f);
							if (tempCodePoint > 0x7ff && (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)) {
								codePoint = tempCodePoint;
							}
						}
						break;
					case 4:
						secondByte = buf[i + 1];
						thirdByte = buf[i + 2];
						fourthByte = buf[i + 3];
						if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80 && (fourthByte & 0xc0) === 0x80) {
							tempCodePoint = ((firstByte & 0xf) << 0x12) | ((secondByte & 0x3f) << 0xc) | ((thirdByte & 0x3f) << 0x6) | (fourthByte & 0x3f);
							if (tempCodePoint > 0xffff && tempCodePoint < 0x110000) {
								codePoint = tempCodePoint;
							}
						}
				}
			}

			if (codePoint === null) {
				// we did not generate a valid codePoint so insert a
				// replacement char (U+FFFD) and advance only 1 byte
				codePoint = 0xfffd;
				bytesPerSequence = 1;
			} else if (codePoint > 0xffff) {
				// encode to utf16 (surrogate pair dance)
				codePoint -= 0x10000;
				res.push(((codePoint >>> 10) & 0x3ff) | 0xd800);
				codePoint = 0xdc00 | (codePoint & 0x3ff);
			}

			res.push(codePoint);
			i += bytesPerSequence;
		}

		return decodeCodePointsArray(res);
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000;

	function decodeCodePointsArray(codePoints) {
		var len = codePoints.length;
		if (len <= MAX_ARGUMENTS_LENGTH) {
			return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
		}

		// Decode in chunks to avoid "call stack size exceeded".
		var res = "";
		var i = 0;
		while (i < len) {
			res += String.fromCharCode.apply(String, codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH)));
		}
		return res;
	}

	function asciiSlice(buf, start, end) {
		var ret = "";
		end = Math.min(buf.length, end);

		for (var i = start; i < end; ++i) {
			ret += String.fromCharCode(buf[i] & 0x7f);
		}
		return ret;
	}

	function latin1Slice(buf, start, end) {
		var ret = "";
		end = Math.min(buf.length, end);

		for (var i = start; i < end; ++i) {
			ret += String.fromCharCode(buf[i]);
		}
		return ret;
	}

	function hexSlice(buf, start, end) {
		var len = buf.length;

		if (!start || start < 0) start = 0;
		if (!end || end < 0 || end > len) end = len;

		var out = "";
		for (var i = start; i < end; ++i) {
			out += toHex(buf[i]);
		}
		return out;
	}

	function utf16leSlice(buf, start, end) {
		var bytes = buf.slice(start, end);
		var res = "";
		for (var i = 0; i < bytes.length; i += 2) {
			res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
		}
		return res;
	}

	Buffer.prototype.slice = function slice(start, end) {
		var len = this.length;
		start = ~~start;
		end = end === undefined ? len : ~~end;

		if (start < 0) {
			start += len;
			if (start < 0) start = 0;
		} else if (start > len) {
			start = len;
		}

		if (end < 0) {
			end += len;
			if (end < 0) end = 0;
		} else if (end > len) {
			end = len;
		}

		if (end < start) end = start;

		var newBuf = this.subarray(start, end);
		// Return an augmented `Uint8Array` instance
		newBuf.__proto__ = Buffer.prototype;
		return newBuf;
	};

	/*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
	function checkOffset(offset, ext, length) {
		if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
		if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
	}

	Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);

		var val = this[offset];
		var mul = 1;
		var i = 0;
		while (++i < byteLength && (mul *= 0x100)) {
			val += this[offset + i] * mul;
		}

		return val;
	};

	Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) {
			checkOffset(offset, byteLength, this.length);
		}

		var val = this[offset + --byteLength];
		var mul = 1;
		while (byteLength > 0 && (mul *= 0x100)) {
			val += this[offset + --byteLength] * mul;
		}

		return val;
	};

	Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 1, this.length);
		return this[offset];
	};

	Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		return this[offset] | (this[offset + 1] << 8);
	};

	Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		return (this[offset] << 8) | this[offset + 1];
	};

	Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);

		return (this[offset] | (this[offset + 1] << 8) | (this[offset + 2] << 16)) + this[offset + 3] * 0x1000000;
	};

	Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);

		return this[offset] * 0x1000000 + ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3]);
	};

	Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);

		var val = this[offset];
		var mul = 1;
		var i = 0;
		while (++i < byteLength && (mul *= 0x100)) {
			val += this[offset + i] * mul;
		}
		mul *= 0x80;

		if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		return val;
	};

	Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) checkOffset(offset, byteLength, this.length);

		var i = byteLength;
		var mul = 1;
		var val = this[offset + --i];
		while (i > 0 && (mul *= 0x100)) {
			val += this[offset + --i] * mul;
		}
		mul *= 0x80;

		if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		return val;
	};

	Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 1, this.length);
		if (!(this[offset] & 0x80)) return this[offset];
		return (0xff - this[offset] + 1) * -1;
	};

	Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		var val = this[offset] | (this[offset + 1] << 8);
		return val & 0x8000 ? val | 0xffff0000 : val;
	};

	Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 2, this.length);
		var val = this[offset + 1] | (this[offset] << 8);
		return val & 0x8000 ? val | 0xffff0000 : val;
	};

	Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);

		return this[offset] | (this[offset + 1] << 8) | (this[offset + 2] << 16) | (this[offset + 3] << 24);
	};

	Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);

		return (this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3];
	};

	Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return ieee754.read(this, offset, true, 23, 4);
	};

	Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 4, this.length);
		return ieee754.read(this, offset, false, 23, 4);
	};

	Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 8, this.length);
		return ieee754.read(this, offset, true, 52, 8);
	};

	Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
		offset = offset >>> 0;
		if (!noAssert) checkOffset(offset, 8, this.length);
		return ieee754.read(this, offset, false, 52, 8);
	};

	function checkInt(buf, value, offset, ext, max, min) {
		if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
		if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
		if (offset + ext > buf.length) throw new RangeError("Index out of range");
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) {
			var maxBytes = Math.pow(2, 8 * byteLength) - 1;
			checkInt(this, value, offset, byteLength, maxBytes, 0);
		}

		var mul = 1;
		var i = 0;
		this[offset] = value & 0xff;
		while (++i < byteLength && (mul *= 0x100)) {
			this[offset + i] = (value / mul) & 0xff;
		}

		return offset + byteLength;
	};

	Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		byteLength = byteLength >>> 0;
		if (!noAssert) {
			var maxBytes = Math.pow(2, 8 * byteLength) - 1;
			checkInt(this, value, offset, byteLength, maxBytes, 0);
		}

		var i = byteLength - 1;
		var mul = 1;
		this[offset + i] = value & 0xff;
		while (--i >= 0 && (mul *= 0x100)) {
			this[offset + i] = (value / mul) & 0xff;
		}

		return offset + byteLength;
	};

	Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
		this[offset] = value & 0xff;
		return offset + 1;
	};

	Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		this[offset] = value & 0xff;
		this[offset + 1] = value >>> 8;
		return offset + 2;
	};

	Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		this[offset] = value >>> 8;
		this[offset + 1] = value & 0xff;
		return offset + 2;
	};

	Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		this[offset + 3] = value >>> 24;
		this[offset + 2] = value >>> 16;
		this[offset + 1] = value >>> 8;
		this[offset] = value & 0xff;
		return offset + 4;
	};

	Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		this[offset] = value >>> 24;
		this[offset + 1] = value >>> 16;
		this[offset + 2] = value >>> 8;
		this[offset + 3] = value & 0xff;
		return offset + 4;
	};

	Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) {
			var limit = Math.pow(2, 8 * byteLength - 1);

			checkInt(this, value, offset, byteLength, limit - 1, -limit);
		}

		var i = 0;
		var mul = 1;
		var sub = 0;
		this[offset] = value & 0xff;
		while (++i < byteLength && (mul *= 0x100)) {
			if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
				sub = 1;
			}
			this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
		}

		return offset + byteLength;
	};

	Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) {
			var limit = Math.pow(2, 8 * byteLength - 1);

			checkInt(this, value, offset, byteLength, limit - 1, -limit);
		}

		var i = byteLength - 1;
		var mul = 1;
		var sub = 0;
		this[offset + i] = value & 0xff;
		while (--i >= 0 && (mul *= 0x100)) {
			if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
				sub = 1;
			}
			this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
		}

		return offset + byteLength;
	};

	Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
		if (value < 0) value = 0xff + value + 1;
		this[offset] = value & 0xff;
		return offset + 1;
	};

	Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
		this[offset] = value & 0xff;
		this[offset + 1] = value >>> 8;
		return offset + 2;
	};

	Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
		this[offset] = value >>> 8;
		this[offset + 1] = value & 0xff;
		return offset + 2;
	};

	Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
		this[offset] = value & 0xff;
		this[offset + 1] = value >>> 8;
		this[offset + 2] = value >>> 16;
		this[offset + 3] = value >>> 24;
		return offset + 4;
	};

	Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
		if (value < 0) value = 0xffffffff + value + 1;
		this[offset] = value >>> 24;
		this[offset + 1] = value >>> 16;
		this[offset + 2] = value >>> 8;
		this[offset + 3] = value & 0xff;
		return offset + 4;
	};

	function checkIEEE754(buf, value, offset, ext, max, min) {
		if (offset + ext > buf.length) throw new RangeError("Index out of range");
		if (offset < 0) throw new RangeError("Index out of range");
	}

	function writeFloat(buf, value, offset, littleEndian, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) {
			checkIEEE754(buf, value, offset, 4, 3.4028234663852886e38, -3.4028234663852886e38);
		}
		ieee754.write(buf, value, offset, littleEndian, 23, 4);
		return offset + 4;
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
		return writeFloat(this, value, offset, true, noAssert);
	};

	Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
		return writeFloat(this, value, offset, false, noAssert);
	};

	function writeDouble(buf, value, offset, littleEndian, noAssert) {
		value = +value;
		offset = offset >>> 0;
		if (!noAssert) {
			checkIEEE754(buf, value, offset, 8, 1.7976931348623157e308, -1.7976931348623157e308);
		}
		ieee754.write(buf, value, offset, littleEndian, 52, 8);
		return offset + 8;
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
		return writeDouble(this, value, offset, true, noAssert);
	};

	Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
		return writeDouble(this, value, offset, false, noAssert);
	};

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy(target, targetStart, start, end) {
		if (!start) start = 0;
		if (!end && end !== 0) end = this.length;
		if (targetStart >= target.length) targetStart = target.length;
		if (!targetStart) targetStart = 0;
		if (end > 0 && end < start) end = start;

		// Copy 0 bytes; we're done
		if (end === start) return 0;
		if (target.length === 0 || this.length === 0) return 0;

		// Fatal error conditions
		if (targetStart < 0) {
			throw new RangeError("targetStart out of bounds");
		}
		if (start < 0 || start >= this.length) throw new RangeError("sourceStart out of bounds");
		if (end < 0) throw new RangeError("sourceEnd out of bounds");

		// Are we oob?
		if (end > this.length) end = this.length;
		if (target.length - targetStart < end - start) {
			end = target.length - targetStart + start;
		}

		var len = end - start;
		var i;

		if (this === target && start < targetStart && targetStart < end) {
			// descending copy from end
			for (i = len - 1; i >= 0; --i) {
				target[i + targetStart] = this[i + start];
			}
		} else if (len < 1000) {
			// ascending copy from start
			for (i = 0; i < len; ++i) {
				target[i + targetStart] = this[i + start];
			}
		} else {
			Uint8Array.prototype.set.call(target, this.subarray(start, start + len), targetStart);
		}

		return len;
	};

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill(val, start, end, encoding) {
		// Handle string cases:
		if (typeof val === "string") {
			if (typeof start === "string") {
				encoding = start;
				start = 0;
				end = this.length;
			} else if (typeof end === "string") {
				encoding = end;
				end = this.length;
			}
			if (val.length === 1) {
				var code = val.charCodeAt(0);
				if (code < 256) {
					val = code;
				}
			}
			if (encoding !== undefined && typeof encoding !== "string") {
				throw new TypeError("encoding must be a string");
			}
			if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
				throw new TypeError("Unknown encoding: " + encoding);
			}
		} else if (typeof val === "number") {
			val = val & 255;
		}

		// Invalid ranges are not set to a default, so can range check early.
		if (start < 0 || this.length < start || this.length < end) {
			throw new RangeError("Out of range index");
		}

		if (end <= start) {
			return this;
		}

		start = start >>> 0;
		end = end === undefined ? this.length : end >>> 0;

		if (!val) val = 0;

		var i;
		if (typeof val === "number") {
			for (i = start; i < end; ++i) {
				this[i] = val;
			}
		} else {
			var bytes = Buffer.isBuffer(val) ? val : new Buffer(val, encoding);
			var len = bytes.length;
			for (i = 0; i < end - start; ++i) {
				this[i + start] = bytes[i % len];
			}
		}

		return this;
	};

	// HELPER FUNCTIONS
	// ================

	var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

	function base64clean(str) {
		// Node strips out invalid characters like \n and \t from the string, base64-js does not
		str = stringtrim(str).replace(INVALID_BASE64_RE, "");
		// Node converts strings with length < 2 to ''
		if (str.length < 2) return "";
		// Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
		while (str.length % 4 !== 0) {
			str = str + "=";
		}
		return str;
	}

	function stringtrim(str) {
		if (str.trim) return str.trim();
		return str.replace(/^\s+|\s+$/g, "");
	}

	function toHex(n) {
		if (n < 16) return "0" + n.toString(16);
		return n.toString(16);
	}

	function utf8ToBytes(string, units) {
		units = units || Infinity;
		var codePoint;
		var length = string.length;
		var leadSurrogate = null;
		var bytes = [];

		for (var i = 0; i < length; ++i) {
			codePoint = string.charCodeAt(i);

			// is surrogate component
			if (codePoint > 0xd7ff && codePoint < 0xe000) {
				// last char was a lead
				if (!leadSurrogate) {
					// no lead yet
					if (codePoint > 0xdbff) {
						// unexpected trail
						if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
						continue;
					} else if (i + 1 === length) {
						// unpaired lead
						if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
						continue;
					}

					// valid lead
					leadSurrogate = codePoint;

					continue;
				}

				// 2 leads in a row
				if (codePoint < 0xdc00) {
					if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
					leadSurrogate = codePoint;
					continue;
				}

				// valid surrogate pair
				codePoint = (((leadSurrogate - 0xd800) << 10) | (codePoint - 0xdc00)) + 0x10000;
			} else if (leadSurrogate) {
				// valid bmp char, but last char was a lead
				if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
			}

			leadSurrogate = null;

			// encode utf8
			if (codePoint < 0x80) {
				if ((units -= 1) < 0) break;
				bytes.push(codePoint);
			} else if (codePoint < 0x800) {
				if ((units -= 2) < 0) break;
				bytes.push((codePoint >> 0x6) | 0xc0, (codePoint & 0x3f) | 0x80);
			} else if (codePoint < 0x10000) {
				if ((units -= 3) < 0) break;
				bytes.push((codePoint >> 0xc) | 0xe0, ((codePoint >> 0x6) & 0x3f) | 0x80, (codePoint & 0x3f) | 0x80);
			} else if (codePoint < 0x110000) {
				if ((units -= 4) < 0) break;
				bytes.push((codePoint >> 0x12) | 0xf0, ((codePoint >> 0xc) & 0x3f) | 0x80, ((codePoint >> 0x6) & 0x3f) | 0x80, (codePoint & 0x3f) | 0x80);
			} else {
				throw new Error("Invalid code point");
			}
		}

		return bytes;
	}

	function asciiToBytes(str) {
		var byteArray = [];
		for (var i = 0; i < str.length; ++i) {
			// Node's code seems to be doing this and not & 0x7F..
			byteArray.push(str.charCodeAt(i) & 0xff);
		}
		return byteArray;
	}

	function utf16leToBytes(str, units) {
		var c, hi, lo;
		var byteArray = [];
		for (var i = 0; i < str.length; ++i) {
			if ((units -= 2) < 0) break;

			c = str.charCodeAt(i);
			hi = c >> 8;
			lo = c % 256;
			byteArray.push(lo);
			byteArray.push(hi);
		}

		return byteArray;
	}

	function base64ToBytes(str) {
		return base64.toByteArray(base64clean(str));
	}

	function blitBuffer(src, dst, offset, length) {
		for (var i = 0; i < length; ++i) {
			if (i + offset >= dst.length || i >= src.length) break;
			dst[i + offset] = src[i];
		}
		return i;
	}

	function isnan(val) {
		return val !== val; // eslint-disable-line no-self-compare
	}
}

});
return ___scope___.entry = "index.js";
});
FuseBox.pkg("fuse-box-css", {}, function(___scope___){
___scope___.file("index.js", function(exports, require, module, __filename, __dirname){

/**
 * Listens to 'async' requets and if the name is a css file
 * wires it to `__fsbx_css`
 */

var runningInBrowser = FuseBox.isBrowser || FuseBox.target === "electron";

var cssHandler = function(__filename, contents) {
	if (runningInBrowser) {
		var styleId = __filename.replace(/[\.\/]+/g, "-");
		if (styleId.charAt(0) === "-") styleId = styleId.substring(1);
		var exists = document.getElementById(styleId);
		if (!exists) {
			//<link href="//fonts.googleapis.com/css?family=Covered+By+Your+Grace" rel="stylesheet" type="text/css">
			var s = document.createElement(contents ? "style" : "link");
			s.id = styleId;
			s.type = "text/css";
			if (contents) {
				s.innerHTML = contents;
			} else {
				s.rel = "stylesheet";
				s.href = __filename;
			}
			document.getElementsByTagName("head")[0].appendChild(s);
		} else {
			if (contents) {
				exists.innerHTML = contents;
			}
		}
	}
};
if (typeof FuseBox !== "undefined" && runningInBrowser) {
	FuseBox.on("async", function(name) {
		if (/\.css$/.test(name)) {
			cssHandler(name);
			return false;
		}
	});
}

module.exports = cssHandler;

});
return ___scope___.entry = "index.js";
});
FuseBox.pkg("ieee754", {}, function(___scope___){
___scope___.file("index.js", function(exports, require, module, __filename, __dirname){

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

});
return ___scope___.entry = "index.js";
});

FuseBox.import("default/index.js");
FuseBox.main("default/index.js");
})
(function(e){function r(e){var r=e.charCodeAt(0),n=e.charCodeAt(1);if((m||58!==n)&&(r>=97&&r<=122||64===r)){if(64===r){var t=e.split("/"),i=t.splice(2,t.length).join("/");return[t[0]+"/"+t[1],i||void 0]}var o=e.indexOf("/");if(o===-1)return[e];var a=e.substring(0,o),f=e.substring(o+1);return[a,f]}}function n(e){return e.substring(0,e.lastIndexOf("/"))||"./"}function t(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];for(var n=[],t=0,i=arguments.length;t<i;t++)n=n.concat(arguments[t].split("/"));for(var o=[],t=0,i=n.length;t<i;t++){var a=n[t];a&&"."!==a&&(".."===a?o.pop():o.push(a))}return""===n[0]&&o.unshift(""),o.join("/")||(o.length?"/":".")}function i(e){var r=e.match(/\.(\w{1,})$/);return r&&r[1]?e:e+".js"}function o(e){if(m){var r,n=document,t=n.getElementsByTagName("head")[0];/\.css$/.test(e)?(r=n.createElement("link"),r.rel="stylesheet",r.type="text/css",r.href=e):(r=n.createElement("script"),r.type="text/javascript",r.src=e,r.async=!0),t.insertBefore(r,t.firstChild)}}function a(e,r){for(var n in e)e.hasOwnProperty(n)&&r(n,e[n])}function f(e){return{server:require(e)}}function u(e,n){var o=n.path||"./",a=n.pkg||"default",u=r(e);if(u&&(o="./",a=u[0],n.v&&n.v[a]&&(a=a+"@"+n.v[a]),e=u[1]),e)if(126===e.charCodeAt(0))e=e.slice(2,e.length),o="./";else if(!m&&(47===e.charCodeAt(0)||58===e.charCodeAt(1)))return f(e);var s=x[a];if(!s){if(m&&"electron"!==_.target)throw"Package not found "+a;return f(a+(e?"/"+e:""))}e=e?e:"./"+s.s.entry;var l,d=t(o,e),c=i(d),p=s.f[c];return!p&&c.indexOf("*")>-1&&(l=c),p||l||(c=t(d,"/","index.js"),p=s.f[c],p||"."!==d||(c=s.s&&s.s.entry||"index.js",p=s.f[c]),p||(c=d+".js",p=s.f[c]),p||(p=s.f[d+".jsx"]),p||(c=d+"/index.jsx",p=s.f[c])),{file:p,wildcard:l,pkgName:a,versions:s.v,filePath:d,validPath:c}}function s(e,r,n){if(void 0===n&&(n={}),!m)return r(/\.(js|json)$/.test(e)?h.require(e):"");if(n&&n.ajaxed===e)return console.error(e,"does not provide a module");var i=new XMLHttpRequest;i.onreadystatechange=function(){if(4==i.readyState)if(200==i.status){var n=i.getResponseHeader("Content-Type"),o=i.responseText;/json/.test(n)?o="module.exports = "+o:/javascript/.test(n)||(o="module.exports = "+JSON.stringify(o));var a=t("./",e);_.dynamic(a,o),r(_.import(e,{ajaxed:e}))}else console.error(e,"not found on request"),r(void 0)},i.open("GET",e,!0),i.send()}function l(e,r){var n=y[e];if(n)for(var t in n){var i=n[t].apply(null,r);if(i===!1)return!1}}function d(e){if(null!==e&&["function","object","array"].indexOf(typeof e)!==-1&&!e.hasOwnProperty("default"))return Object.isFrozen(e)?void(e.default=e):void Object.defineProperty(e,"default",{value:e,writable:!0,enumerable:!1})}function c(e,r){if(void 0===r&&(r={}),58===e.charCodeAt(4)||58===e.charCodeAt(5))return o(e);var t=u(e,r);if(t.server)return t.server;var i=t.file;if(t.wildcard){var a=new RegExp(t.wildcard.replace(/\*/g,"@").replace(/[.?*+^$[\]\\(){}|-]/g,"\\$&").replace(/@@/g,".*").replace(/@/g,"[a-z0-9$_-]+"),"i"),f=x[t.pkgName];if(f){var p={};for(var v in f.f)a.test(v)&&(p[v]=c(t.pkgName+"/"+v));return p}}if(!i){var g="function"==typeof r,y=l("async",[e,r]);if(y===!1)return;return s(e,function(e){return g?r(e):null},r)}var w=t.pkgName;if(i.locals&&i.locals.module)return i.locals.module.exports;var b=i.locals={},j=n(t.validPath);b.exports={},b.module={exports:b.exports},b.require=function(e,r){var n=c(e,{pkg:w,path:j,v:t.versions});return _.sdep&&d(n),n},m||!h.require.main?b.require.main={filename:"./",paths:[]}:b.require.main=h.require.main;var k=[b.module.exports,b.require,b.module,t.validPath,j,w];return l("before-import",k),i.fn.apply(k[0],k),l("after-import",k),b.module.exports}if(e.FuseBox)return e.FuseBox;var p="undefined"!=typeof ServiceWorkerGlobalScope,v="undefined"!=typeof WorkerGlobalScope,m="undefined"!=typeof window&&"undefined"!=typeof window.navigator||v||p,h=m?v||p?{}:window:global;m&&(h.global=v||p?{}:window),e=m&&"undefined"==typeof __fbx__dnm__?e:module.exports;var g=m?v||p?{}:window.__fsbx__=window.__fsbx__||{}:h.$fsbx=h.$fsbx||{};m||(h.require=require);var x=g.p=g.p||{},y=g.e=g.e||{},_=function(){function r(){}return r.global=function(e,r){return void 0===r?h[e]:void(h[e]=r)},r.import=function(e,r){return c(e,r)},r.on=function(e,r){y[e]=y[e]||[],y[e].push(r)},r.exists=function(e){try{var r=u(e,{});return void 0!==r.file}catch(e){return!1}},r.remove=function(e){var r=u(e,{}),n=x[r.pkgName];n&&n.f[r.validPath]&&delete n.f[r.validPath]},r.main=function(e){return this.mainFile=e,r.import(e,{})},r.expose=function(r){var n=function(n){var t=r[n].alias,i=c(r[n].pkg);"*"===t?a(i,function(r,n){return e[r]=n}):"object"==typeof t?a(t,function(r,n){return e[n]=i[r]}):e[t]=i};for(var t in r)n(t)},r.dynamic=function(r,n,t){this.pkg(t&&t.pkg||"default",{},function(t){t.file(r,function(r,t,i,o,a){var f=new Function("__fbx__dnm__","exports","require","module","__filename","__dirname","__root__",n);f(!0,r,t,i,o,a,e)})})},r.flush=function(e){var r=x.default;for(var n in r.f)e&&!e(n)||delete r.f[n].locals},r.pkg=function(e,r,n){if(x[e])return n(x[e].s);var t=x[e]={};return t.f={},t.v=r,t.s={file:function(e,r){return t.f[e]={fn:r}}},n(t.s)},r.addPlugin=function(e){this.plugins.push(e)},r.packages=x,r.isBrowser=m,r.isServer=!m,r.plugins=[],r}();return m||(h.FuseBox=_),e.FuseBox=_}(this))