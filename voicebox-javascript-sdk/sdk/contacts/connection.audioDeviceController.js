function AudioController(audioContext, session) {
  'use strict';

  var outputDeviceId = null;
  var inputDeviceId = null;
  var baseAudioElem = null;
  var webAudioElem = null;
  var currAudioElem = baseAudioElem = new AudioElement();
  var self = this;
  var remoteVolumeLevelListeners = new Set();
  var remoteStreamNode = null;
  var remoteVolumeAnalyser = null;
  var remoteVolumeCheckIntervalId = null;
  var destNode = null;
  var newAudio = null;
  var setAudioTaskId = null;

  baseAudioElem.onInitializationCompleted = function () {
    initAudio();
    startListenOfRemoteVolume();
  };

  function initAudio() {
    var newInputDeviceId = inputDeviceId;
    inputDeviceId = null;
    self.setAudio(outputDeviceId, newInputDeviceId);
  }

  var aecDeviceChangeListener = function (aecDeviceId) {
    aecDeviceChanged(aecDeviceId);
  };

  function switchAudioElem(newElement) {
    var paused = currAudioElem.isPausedByUser();
    currAudioElem.disableByUser();
    currAudioElem = newElement;
    var deviceId = !outputDeviceId ? self.getAECDevice() : outputDeviceId;
    newElement.enableByUser(paused, deviceId);
  }


  function aecDeviceChanged(aecDeviceId) {
    if (outputDeviceId) {
      if (aecDeviceId !== outputDeviceId) {
        if (webAudioElem) {
          switchAudioElem(webAudioElem);
        }
        else {
          startCustomDeviceStream();
        }
      }
      else if (aecDeviceId === outputDeviceId) {
        if (webAudioElem) {
          switchAudioElem(baseAudioElem);
        }
      }
    }
    else {
      baseAudioElem.setSinkId(aecDeviceId);
    }
  }

  function initRemoteStreamNode() {
    var remoteStream = session ? session.getRemoteStreams()[0] : null;
    if (!remoteStreamNode && remoteStream) {
      remoteStreamNode = audioContext.createMediaStreamSource(remoteStream);
    }
  }

  function startCustomDeviceStream() {
    if (!outputDeviceId) {
      return;
    }

    baseAudioElem.disableByUser();

    currAudioElem = webAudioElem = new AudioElement(currAudioElem.isPausedByUser());
    destNode = audioContext.createMediaStreamDestination();
    webAudioElem.src = URL.createObjectURL(destNode.stream);
    webAudioElem.setSinkId(outputDeviceId);

    initRemoteStreamNode();

    webAudioElem.onInitializationCompleted = function () {
      remoteStreamNode.connect(destNode);
      playAndFixHeliumSound(webAudioElem);
    };
  }

  function playAndFixHeliumSound(audioElem) {
    audioElem.play();
    /* I got timeout value from sip-0.7.2.js, function: ensureMediaPlaying
     (better sound quality for outgoing calls) */
    var interval = 100;
    audioElem.ensurePlayingIntervalId = SIP.Timers.setInterval(function () {
      if (audioElem.disabledByUser || audioElem.pausedByUser) {
        SIP.Timers.clearInterval(audioElem.ensurePlayingIntervalId);
        return;
      }
      if (audioElem.paused) {
        audioElem.play();
        SIP.Timers.clearInterval(audioElem.ensurePlayingIntervalId);
      }
      else {
        audioElem.pause();
      }
    }, interval);
  }

  function changeInputDevice(deviceId) {
    if (!deviceId)
      return;

    var constraints = {
      audio: {
        optional: [{
          sourceId: deviceId
        }]
      },
      video: false
    };

    var sdpConstraints = {
      optional: constraints.audio.optional,
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: false
      }
    };

    SIP.WebRTC.getUserMedia(constraints).then(function (newStream) {
      var peer = session.mediaHandler.peerConnection;
      var muted = session.mediaHandler.audioMuted;
      peer.getLocalStreams().forEach(function (oldStream) {
        peer.removeStream(oldStream);
        oldStream.stop();
      });
      peer.addStream(newStream);

      /* Renegotiate current session */
      peer.createOffer(function (offer) {
        peer.setLocalDescription(offer);
        session.mediaHandler.unmute();

        if (muted) {
          session.mediaHandler.mute();
        }
      }, function () {
        console.error("Unable renegotiate current session.");
      }, sdpConstraints);

    });
  }

  function setOutputDevice(newOutputDeviceId) {
    outputDeviceId = newOutputDeviceId;
    var aecDeviceId = self.getAECDevice();

    if (!baseAudioElem.initializationCompleted() || !session || !session.getRemoteStreams()[0]) {
      return;
    } else if ((!outputDeviceId || outputDeviceId === aecDeviceId) && currAudioElem === webAudioElem) {
      switchAudioElem(baseAudioElem);
      return;
    } else if (outputDeviceId && outputDeviceId !== aecDeviceId && webAudioElem && currAudioElem !== webAudioElem) {
      switchAudioElem(webAudioElem);
      return;
    }

    var sinkId = outputDeviceId ? outputDeviceId : aecDeviceId;
    if (sinkId) {
      if (!webAudioElem && sinkId !== self.getAECDevice()) {
        startCustomDeviceStream();
      }
      else {
        currAudioElem.setSinkId(sinkId);
        if (currAudioElem === webAudioElem) {
          playAndFixHeliumSound(currAudioElem);
        }
      }
    }
  }

  function fireRemoteVolumeLevel(volumeLevel) {
    remoteVolumeLevelListeners.forEach(function (listener) {
      listener(volumeLevel)
    });
  }

  function startListenOfRemoteVolume() {
    /* TODO call this function on 'add remote stream' event */
    if (remoteVolumeCheckIntervalId || !baseAudioElem.initializationCompleted()
      || remoteVolumeLevelListeners.size <= 0 || !session.getRemoteStreams()[0]) {
      return;
    }
    initRemoteStreamNode();
    remoteVolumeAnalyser = audioContext.createAnalyser();
    remoteStreamNode.connect(remoteVolumeAnalyser);
    remoteVolumeAnalyser.fftSize = 32;
    remoteVolumeAnalyser.smoothingTimeConstant = 0.3;
    var buffer = new Uint8Array(remoteVolumeAnalyser.frequencyBinCount);
    remoteVolumeCheckIntervalId = setInterval(function () {
      remoteVolumeAnalyser.getByteFrequencyData(buffer);
      fireRemoteVolumeLevel(_.max(buffer))
    }, 250);
  }

  function stopListenOfRemoteVolume() {
    if (!remoteVolumeCheckIntervalId || remoteVolumeLevelListeners.size > 0) {
      return;
    }
    clearInterval(remoteVolumeCheckIntervalId);
    if (remoteVolumeAnalyser) {
      remoteVolumeAnalyser.disconnect();
      remoteVolumeAnalyser = null;
    }
  }

  this.addRemoteVolumeLevelListener = function (listener) {
    if (!listener) {
      return;
    }
    remoteVolumeLevelListeners.add(listener);
    startListenOfRemoteVolume();
  };

  function applyAudio(newOutputDeviceId, newInputDeviceId) {
    setOutputDevice(newOutputDeviceId);
    setInputDevice(newInputDeviceId);
  }

  this.setAudio = function (newOutputDeviceId, newInputDeviceId) {
    if (!session.getRemoteStreams()[0] || !baseAudioElem.initializationCompleted()) {
      outputDeviceId = newOutputDeviceId;
      inputDeviceId = newInputDeviceId;
      return;
    }

    if (!setAudioTaskId) {
      applyAudio(newOutputDeviceId, newInputDeviceId);
      /* Quick fix of change audio frequency */
      setAudioTaskId = setInterval(function () {
        if (newAudio) {
          applyAudio(newAudio.outputDeviceId, newAudio.inputDeviceId);
          newAudio = null;
        } else {
          clearInterval(setAudioTaskId);
          setAudioTaskId = null;
        }
      }, 1000);
    } else {
      newAudio = {
        inputDeviceId: newInputDeviceId,
        outputDeviceId: newOutputDeviceId
      }
    }
  };

  function setInputDevice(newInputDeviceId) {
    if (newInputDeviceId === inputDeviceId) {
      return;
    }
    inputDeviceId = newInputDeviceId;
    if (inputDeviceId && baseAudioElem.initializationCompleted()
      && session && session.getRemoteStreams()[0]) {
      changeInputDevice(inputDeviceId);
    }
  }

  this.getAudioElem = function () {
    return baseAudioElem;
  };

  this.play = function () {
    currAudioElem.playByUser();
  };

  this.pause = function () {
    currAudioElem.pauseByUser();
  };

  this.dispose = function () {
    this.removeAECDeviceChangeListener(aecDeviceChangeListener);
    if (baseAudioElem) {
      baseAudioElem.disposeByUser();
    }
    if (webAudioElem) {
      webAudioElem.disposeByUser();
    }
    remoteVolumeLevelListeners.clear();
    stopListenOfRemoteVolume();
    if (destNode) {
      destNode.disconnect();
      destNode = null;
    }
    if (remoteStreamNode) {
      remoteStreamNode.disconnect();
      remoteStreamNode = null;
    }
  };

  this.setSession = function (sipSession) {
    session = sipSession;
    if (session != null) {
      session.once(GKTConstants.SIP_EVENTS.addStream, function () {
        if (baseAudioElem.initializationCompleted()) {
          initAudio();
        }
      });
    }
  };
  this.setSession(session);

  this.addAECDeviceChangeListener(aecDeviceChangeListener);
}

AudioController.prototype = new AudioControllerProto();

function AudioControllerProto() {
  var aecDeviceId;
  var aecDeviceChangeListeners = new Set();

  this.setAECDevice = function (deviceId) {
    if (deviceId !== aecDeviceId) {
      aecDeviceId = deviceId;
      aecDeviceChangeListeners.forEach(function (listener) {
        listener(aecDeviceId);
      });
    }
  };

  this.getAECDevice = function () {
    return aecDeviceId;
  };

  this.addAECDeviceChangeListener = function (listener) {
    aecDeviceChangeListeners.add(listener);
  };

  this.removeAECDeviceChangeListener = function (listener) {
    aecDeviceChangeListeners.delete(listener);
  };
}

function AudioElement(paused) {
  var audioElem = new Audio();
  var initialized = false;
  var play = audioElem.play;

  audioElem.disabledByUser = false;
  audioElem.pausedByUser = !!paused;

  audioElem.play = function () {
    if (!audioElem.disabledByUser && !audioElem.pausedByUser && initialized) {
      play.call(audioElem);
    }
  };

  audioElem.playByUser = function () {
    audioElem.pausedByUser = false;
    audioElem.play();
  };

  audioElem.pauseByUser = function () {
    audioElem.pausedByUser = true;
    audioElem.pause();
  };

  audioElem.disableByUser = function () {
    audioElem.disabledByUser = true;
    audioElem.pause();
  };

  audioElem.enableByUser = function (paused, deviceId) {
    audioElem.disabledByUser = false;
    audioElem.pausedByUser = paused;
    audioElem.setSinkId(deviceId);
    audioElem.play();
  };

  audioElem.isPausedByUser = function () {
    return audioElem.pausedByUser;
  };

  audioElem.initializationCompleted = function () {
    return initialized;
  };

  audioElem.onprogress = function () {
    audioElem.onprogress = null;
    initialized = true;

    if (audioElem.onInitializationCompleted) {
      audioElem.onInitializationCompleted();
    }
  };

  audioElem.disposeByUser = function () {
    audioElem.disableByUser();
    audioElem.remove();
  };

  return audioElem;
}
