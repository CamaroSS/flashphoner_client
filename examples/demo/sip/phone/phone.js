var SESSION_STATUS = Flashphoner.constants.SESSION_STATUS; 
var CALL_STATUS = Flashphoner.constants.CALL_STATUS;
var localDisplay;
var remoteDisplay;
var currentCall;

$(document).ready(function () {
    loadCallFieldSet();
});

// Include Field Set HTML
function loadCallFieldSet(){
    $("#callFieldSet").load("call-fieldset.html",loadCallControls);
}

// Include Call Controls HTML
function loadCallControls(){
    $("#callControls").load("call-controls.html", init_page);
}

function init_page(){
	//init api
    try {
        Flashphoner.init({flashMediaProviderSwfLocation: '../../../../media-provider.swf'});
    } catch(e) {
        $("#notifyFlash").text("Your browser doesn't support Flash or WebRTC technology necessary for work of an example");
        return;
    }
	
    localDisplay = document.getElementById("localDisplay");
	remoteDisplay = document.getElementById("remoteDisplay");

    // Set websocket URL
    $("#urlServer").val(setURL());
	
	// Display outgoing call controls
    showOutgoing();
	
    onHangupOutgoing();
    onDisconnected();
}

function connect() {
	var url = $('#urlServer').val();
    var registerRequired = $("#sipRegisterRequired").is(':checked');

    var sipOptions = {
	    login: $("#sipLogin").val(),
		password: $("#sipPassword").val(),
		domain: $("#sipDomain").val(),
		port: $("#sipPort").val(),
		registerRequired: registerRequired
    }; 

    var connectionOptions = {
        urlServer: url,
        sipOptions: sipOptions
    };

    //create session
    console.log("Create new session with url " + url);
    Flashphoner.createSession(connectionOptions).on(SESSION_STATUS.ESTABLISHED, function(session){
        setStatus("#regStatus", SESSION_STATUS.ESTABLISHED);
        onConnected(session);
		if (!registerRequired) {
            disableOutgoing(false);
		}
    }).on(SESSION_STATUS.REGISTERED, function(session){
        setStatus("#regStatus", SESSION_STATUS.REGISTERED);
        onConnected(session);
        if (registerRequired) {
            disableOutgoing(false);
		}
    }).on(SESSION_STATUS.DISCONNECTED, function(){
        setStatus("#regStatus", SESSION_STATUS.DISCONNECTED);
        onDisconnected();
    }).on(SESSION_STATUS.FAILED, function(){
        setStatus("#regStatus", SESSION_STATUS.FAILED);
        onDisconnected();
    }).on(SESSION_STATUS.INCOMING_CALL, function(call){ 
        call.on(CALL_STATUS.RING, function(){
		    setStatus("#callStatus", CALL_STATUS.RING);
        }).on(CALL_STATUS.ESTABLISHED, function(){
		    setStatus("#callStatus", CALL_STATUS.ESTABLISHED);
			enableMuteToggle(true);
        }).on(CALL_STATUS.FINISH, function(){
		    setStatus("#callStatus", CALL_STATUS.FINISH);
			onHangupIncoming();
		    currentCall = null;
        });
		onIncomingCall(call);
    });
}

function call() {
	var session = Flashphoner.getSessions()[0];
	
	var constraints = {
        audio: true,
        video: false
    };
	
	//prepare outgoing call 
    var outCall = session.createCall({
		callee: $("#callee").val(),
        visibleName: $("#sipLogin").val(),
		localVideoDisplay: localDisplay,
		remoteVideoDisplay: remoteDisplay,
		constraints: constraints,
		receiveAudio: true,
        receiveVideo: false
	}).on(CALL_STATUS.RING, function(){
		setStatus("#callStatus", CALL_STATUS.RING);
    }).on(CALL_STATUS.ESTABLISHED, function(){
		setStatus("#callStatus", CALL_STATUS.ESTABLISHED);
		enableMuteToggle(true);
    }).on(CALL_STATUS.FINISH, function(){
		setStatus("#callStatus", CALL_STATUS.FINISH);
	    onHangupOutgoing();
		currentCall = null;
    });
	
	outCall.call();
	currentCall = outCall;
	
	$("#callBtn").text("Hangup").off('click').click(function(){
        $(this).prop('disabled', true);
	    outCall.hangup();
    }).prop('disabled', false);
}

function onConnected(session) {
    $("#connectBtn").text("Disconnect").off('click').click(function(){
        $(this).prop('disabled', true);
		if (currentCall) {
			showOutgoing();
			disableOutgoing(true);
			setStatus("#callStatus", "");
			currentCall.hangup();
		}
        session.disconnect();
    }).prop('disabled', false);
}

function onDisconnected() {
    $("#connectBtn").text("Connect").off('click').click(function(){
		if (validateForm("formConnection")) {
			disableConnectionFields("formConnection", true);
			$(this).prop('disabled', true);
			connect();
		}
    }).prop('disabled', false);
    disableConnectionFields("formConnection", false);
	disableOutgoing(true);
}

function onHangupOutgoing() {
    $("#callBtn").text("Call").off('click').click(function(){
		if (filledInput($("#callee"))) {
			disableOutgoing(true);
			call();
		}
    }).prop('disabled', false);
    $('#callee').prop('disabled', false);
	disableOutgoing(false);
	enableMuteToggle(false);
}

function onIncomingCall(inCall) {
	currentCall = inCall;
	
	showIncoming(inCall.visibleName());
	
    $("#answerBtn").off('click').click(function(){
		$(this).prop('disabled', true);
		inCall.answer({
            localVideoDisplay: localDisplay,
            remoteVideoDisplay: remoteDisplay
        });
		showAnswered();
    }).prop('disabled', false);
	
    $("#hangupBtn").off('click').click(function(){
		$(this).prop('disabled', true);
		$("#answerBtn").prop('disabled', true);
        inCall.hangup();
    }).prop('disabled', false);
}

function onHangupIncoming() {
    showOutgoing();
	enableMuteToggle(false);
}

// Set connection and call status
function setStatus(selector, status) {
    var statusField = $(selector);
    statusField.text(status).removeClass();
    if (status == "REGISTERED" || status == "ESTABLISHED") {
        statusField.attr("class","text-success");
    } else if (status == "DISCONNECTED" || status == "FINISH") {
        statusField.attr("class","text-muted");
    } else if (status == "FAILED") {
        statusField.attr("class","text-danger");
    } else if (status == "TRYING" || status == "RING") {
        statusField.attr("class","text-primary");
    }
}

// Display view for incoming call
function showIncoming(callerName){
    $("#outgoingCall").hide();
    $("#incomingCall").show();
    $("#incomingCallAlert").show().text("You have a new call from " + callerName);
    $("#answerBtn").show();
}

// Display view for outgoing call
function showOutgoing(){
    $("#incomingCall").hide();
    $("#incomingCallAlert").hide();
    $("#outgoingCall").show();
    onHangupOutgoing();
}

function disableOutgoing(disable) {
    $('#callee').prop('disabled', disable);
    $("#callBtn").prop('disabled', disable);
}

// Display view for answered call
function showAnswered(){
    $("#answerBtn").hide();
    $("#incomingCallAlert").hide().text("");
}

function disableConnectionFields(formId, disable) {
    $('#' + formId + ' :text').each(function(){
       $(this).prop('disabled', disable);
    });
    $('#' + formId + ' :password').prop('disabled', disable);
    $('#' + formId + ' :checkbox').prop('disabled', disable);
}

function validateForm(formId) {
    var valid = true;
	
    $('#' + formId + ' :text').each(function(){
        if(!filledInput($(this)) && valid) {
			valid = false;
		}
    });
	
	if(!filledInput($('#' + formId + ' :password')) && valid) {
		valid = false;
	}
	
    return valid;
}

function filledInput(input) {
	var valid = true;
    if (!input.val()) {
		valid = false;
        input.closest('.input-group').addClass("has-error");
    } else {
        input.closest('.input-group').removeClass("has-error");
    }
	
	return valid;
}

// Mute audio in the call
function mute() {
	if (currentCall) {
	    currentCall.muteAudio();
	}
}

// Unmute audio in the call
function unmute() {
	if (currentCall) {
        currentCall.unmuteAudio();
	}
}

function enableMuteToggle(enable) {
    var $muteAudioToggle = $("#muteAudioToggle");
	
	if (enable) {
		$muteAudioToggle.removeAttr("disabled");
		$muteAudioToggle.trigger('change');
	}
	else {
		$muteAudioToggle.prop('checked',false).attr('disabled','disabled').trigger('change');
    }
}