(function(){
if(window.knowtifyInbox && supports_local_storage()){
	if (typeof(window._knowtifyInbox) == 'undefined') {
        window._knowtifyInbox = [];
    }

	//Vars
	var k = window.knowtifyInbox,
	_body = document.getElementsByTagName('body')[0],
	_messages = document.createElement('div'),
	_content = document.createElement('div'),
	_tooltip = document.createElement('div'),
	_alert_button = document.getElementById(k.alert_button_id),
	_arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
	_alert_button_count,
	_notification_count,
	screen_width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
	screen_height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
	messages_shown = false,
	websocket,
	messages = {};

	//Init
	init_inbox();
	get_messages();
	add_messages();
	//setup_websockets();

	//Events
	//document.getElementById('username_submit').addEventListener("submit", identifyUser);
	_body.addEventListener("click", body_click);
	_alert_button.addEventListener("click", show_hide_messages);
	_messages.addEventListener("click", message_click);
	_content.addEventListener("click", content_click);

	if(Object.observe){
		Object.observe(_knowtifyInbox, process);
	}else{
		setInterval(process,1000);
	}
	setTimeout(function(){
		process();
	},1000);
}

function process(){
	//console.log('processing...');
	var d;
	while (_knowtifyInbox.length > 0) {
	    d = extend({}, _knowtifyInbox.shift());

	    switch (d[0]) {
	        case "message":
	            save_messages(JSON.stringify({messages:[d[1]]}));
	            add_messages();
	            break;
	        default:
	            //console.log(d[0], "Unknown Command");
	    }
	}
}

function setup_websockets(){
	var wsUri = "ws://knowtify-websockets.herokuapp.com/websocket";
	//var wsUri = "ws://localhost:3000/websocket";
	websocket = new WebSocketRails(wsUri);
	websocket.on_open = function(data) {
		//console.log("Socket opened on " + wsUri + " :)");
	};
	websocket.bind('identify', function(data) {
	  	save_messages(data);
	});

	websocket.bind('new_message', function(data) {
	  	//console.log(data.message); // would output 'this is a message'
	});
	websocket.bind('chat', addChat);
}

var success = function(response) {
	//console.log("Wow it worked: "+response.message);
}

var failure = function(response) {
	//console.log("That just totally failed: "+response.message);
}

function addChat(message) {
	//console.log('just received new comment: ' + message.text);
}

function identifyUser(e){
	e.preventDefault();
	var message = {
		username: document.getElementById("username").value
	};
	websocket.trigger('identify', message, success, failure);
}

function init_inbox(){
	add_css('http://js.knowtify.io/inbox.css?v=2');
	_tooltip.id = 'inbox_tooltip';
	_tooltip.className = 'hide';
	_tooltip.style['display'] = 'none';

	_messages.id = 'inbox_messages';
	_messages.className = 'show';

	_content.id = 'inbox_content';
	_content.className = 'hide';

	var header = document.createElement('div');
	header.id = 'inbox_header';
	var notifications = document.createElement('div');
	notifications.id = "inbox_header_text";
	notifications.innerHTML = "Notifications (<span id='inbox_notifications_count'>0</span>)";
	header.appendChild(notifications);
	var mark_all_read = document.createElement('a');
	mark_all_read.id = "inbox_mark_read";
	mark_all_read.href = "#";
	mark_all_read.innerHTML = "mark all read";
	header.appendChild(mark_all_read);

	mark_all_read.addEventListener("click", mark_all_messages_read);

	var footer = document.createElement('div');
	footer.id = 'inbox_footer';
	footer.innerHTML = "<a target='_blank' href='http://knowtify.io/inbox'>Powered by Knowtify</a>";

	//<svg width="100" height="100">
  	//<circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
	//</svg>
	//<polygon points="200,10 250,190 160,210" style="fill:lime;stroke:purple;stroke-width:1" />
	//<svg width="200" height="250" version="1.1" xmlns="http://www.w3.org/2000/svg">
	//<path d="M20,230 Q40,205 50,230 T90,230" fill="none" stroke="blue" stroke-width="5"/>

	_arrow.id = "inbox_arrow";
	var triangle = document.createElementNS("http://www.w3.org/2000/svg",'path');
	triangle.setAttribute("d","M 20 0 L 40 20 L 0 20 Z");
	_arrow.appendChild(triangle);

	var message_container = document.createElement("div");
	message_container.id = "inbox_message_container";
	message_container.appendChild(_messages);
	message_container.appendChild(_content);

	_tooltip.appendChild(header);
	_tooltip.appendChild(message_container);
	_tooltip.appendChild(footer);
	_tooltip.appendChild(_arrow);

	_body.appendChild(_tooltip);
	_alert_button_count = document.createElement('span');
	_alert_button_count.id = "inbox_message_count";
	_alert_button.appendChild(_alert_button_count);
	_alert_button.style.position = "relative";

	_notification_count = document.getElementById("inbox_notifications_count");

	position_messages();
	add_contact();
}

function supports_local_storage(){
  	try {
    	return 'localStorage' in window && window['localStorage'] !== null;
  	} catch (e) {
    	return false;
  	}
}

function get_messages(){
  	var msg = localStorage.getItem('inbox_messages');
  	if(msg){
  		messages = JSON.parse(msg);
  	}else{
  		localStorage.setItem('inbox_messages', '{}');
  	}

  	var params = "public_token="+k.public_token+"&email="+k.email
  	if(k.contact_id){
  		params += "&contact_id="+k.contact_id
  	}
  	var r = new XMLHttpRequest(); 
	r.open("GET", "https://knowtify-inbox.herokuapp.com/messages?"+params, true);
	r.onreadystatechange = function () {
		if (r.readyState != 4 || r.status != 200) return;
		//console.log(r.requestHeader);
		save_messages(r.responseText);
		add_messages();
	};
	r.send("");
}

function save_messages(data){
	var msg = JSON.parse(data).messages || [];
	for(var i=0;i<msg.length;i++){
		var message = msg[i];
		message._id = message._id || message.id || null;
		if(!messages[message._id]){
			messages[message._id] = message;
			messages[message._id].status = 'unread';
		}
	}

	var count = 0;
	for (var i in messages) {
		if (messages.hasOwnProperty(i)) {
	    	var message = messages[i];
	    	if(message.status == 'unread'){
	    		count++;
	    	}
	    }
	}
	if(count>0){
		_alert_button_count.innerHTML = count;
		_notification_count.innerHTML = count;
	}else{
		_alert_button_count.innerHTML = "0";
		_notification_count.innerHTML = "0";
		_alert_button_count.className = "hide";
	}
	localStorage.setItem('inbox_messages', JSON.stringify(messages));
	//add_messages();
}

function add_messages(){
    var frag = document.createDocumentFragment();
    var unread_count = 0;


    for (var i in messages) {
		if (messages.hasOwnProperty(i)) {
	    	var message = messages[i];
	    	if(message){
	    		var li = document.createElement('li');
	    		li.className = 'message';
	    		li.setAttribute('data-id',i);
	    		if(message.url){
	    			li.setAttribute('data-action','goto');
	    		}else{
	    			li.setAttribute('data-action','content');
	    		}
	    		if(message.status == 'read'){
	    			li.className = 'message read';
	    		}

	    		var a = document.createElement('a');
	    		a.innerHTML = 'x';
	    		a.href = "#";
	    		a.className = "delete";
	    		a.setAttribute('data-action','delete');

	    		var img = document.createElement('img');
	    		img.setAttribute('src',message.image);

	    		var heading = document.createElement('p');
	    		heading.innerHTML = message.heading;
	    		heading.className = "heading";

	    		var description = document.createElement('p');
	    		description.className = "description";
	    		description.innerHTML = message.description;

	    		var timestamp = document.createElement('p');
	    		timestamp.className = 'timestamp';
	    		timestamp.innerHTML = timeSince(message.created_at);

	    		li.appendChild(a);
	    		li.appendChild(img);
	    		li.appendChild(heading);
	    		li.appendChild(description);
	    		li.appendChild(timestamp);
	    		if(message.status == 'unread' && frag.firstChild){
	    			frag.insertBefore(li, frag.firstChild);
	    		}else{
	    			var first_read = frag.querySelector('.message.read');

	    			if(first_read){
	    				frag.insertBefore(li, first_read);
	    			}else{
	    				frag.appendChild(li);
	    			}

	    			/*
	    			var read_list = frag.querySelectorAll('.message.read')
	    			if(read_list.length > 0 && read_list[read_list.length-1].nextSibling){
	    				frag.insertBefore(li, read_list[read_list.length-1].nextSibling);
	    			}else{
	    				frag.appendChild(li);
	    			}
	    			*/
	    		}

	    		if(message.status == 'unread'){
	    			unread_count++;
	    		}
	    	}
		}
	}

	if(unread_count > 0){
		_alert_button_count.className = "show";
		_alert_button_count.innerHTML = unread_count;
	}else{
		_alert_button_count.className = "hide";
	}

	_messages.innerHTML = "";
    _messages.appendChild(frag);
}

function position_messages(){
	var offset = cumulativeOffset(_alert_button);
	var t = offset.top,
	l = offset.left,
	w = _alert_button.offsetWidth,
	h = _alert_button.offsetHeight;

	_tooltip.style['top'] = t+h+20+'px';
	_tooltip.style['height'] = (screen_height-(t+h+35))+'px';
	_messages.style['height'] = (screen_height-(t+h+135))+'px';
	_content.style['height'] = (screen_height-(t+h+135))+'px';

	if((l+520) > screen_width){
		var arrow_left = 460-((screen_width-l)-(w/2)+20);
		if(arrow_left > 410){
			arrow_left = 410;
		}
		_tooltip.style['left'] = (screen_width - 460)+'px';
		_arrow.style['left'] = arrow_left+'px';
	}else{
		var arrow_left = ((w/2)-20);
		if(w>50){
			_tooltip.style['left'] = l+'px';
			_arrow.style['left'] = arrow_left+'px';
		}else{
			if(l>30){
				_tooltip.style['left'] = (l-30)+'px';
				_arrow.style['left'] = (arrow_left+30)+'px';
			}else{
				if(arrow_left<0){ arrow_left=0; }
				_tooltip.style['left'] = l+'px';
				_arrow.style['left'] = arrow_left+'px';
			}
		}
	}
}

function show_hide_messages(e){
	//_tooltip.style['display'] = 'block';
	e.preventDefault();
	position_messages();
	if(messages_shown){
		_tooltip.className = 'hide';
		messages_shown = false;
	}else{
		_tooltip.className = 'show';
		messages_shown = true;
		//mark_messages_read();
	}
}

function mark_message_read(id){
	messages[id].status = 'read';
	save_messages('{"messages":[]}');
}

function mark_all_messages_read(e){
	var event = e || window.event;
	event.preventDefault();
	for(var i in messages){
		if (messages.hasOwnProperty(i)) {
	    	var message = messages[i];
	    	message.status = 'read';
	    }
	}
	save_messages('{"messages":[]}');
}

function content_click(e){
	var event = e || window.event;
	var target = event.target || event.srcElement;
	var event_action;
	if(target.getAttribute('data-action')){
		event.preventDefault();
		event_action = target.getAttribute('data-action');
	}

	if(event_action == 'back'){
		hide_content();
	}
}

function body_click(e){
	var event = e || window.event;
	var target = event.target || event.srcElement;
	var body_clicked = true;

	var elem = target;
	while(elem.parentNode){
		if(elem.id == 'inbox_tooltip' || elem.id == k.alert_button_id || elem.className == 'delete'){
			body_clicked = false;
		}
		elem = elem.parentNode;
	}

	if(body_clicked && messages_shown){
		_tooltip.className = 'hide';
		messages_shown = false;
	}
}

function message_click(e){
	var event = e || window.event;
	var target = event.target || event.srcElement;
	var event_action;
	event.preventDefault();

	if(target.getAttribute('data-action')){
		event_action = target.getAttribute('data-action');
	}
	
	//walking the dom to get li.message or #inbox_messages
	var message = target;
	while(message.className != 'message' && message.className != 'message read' && message.id != 'inbox_messages'){
		message = message.parentNode;
	}

	if(event_action){
		message_action(event_action,message.getAttribute('data-id'));
	}else{
		message_action(message.getAttribute('data-action'),message.getAttribute('data-id'));
		message.className = 'message read';
	}
}

function message_action(action,id){
	switch (action){
  		case 'delete':
  			delete_message(id);
  			break;
  		case 'content':
  			show_content(id);
  			mark_message_read(id);
  			break;
  		case 'goto':
  			url_redirect(id);
  			mark_message_read(id);
  			break;
	}
}

function delete_message(id){
	delete messages[id];
	add_messages();
	save_messages('{"messages":[]}');
}

function url_redirect(id){
	var message = messages[id];
	//window.location.href = message.url;
	var win = window.open(message.url, '_blank');
  	win.focus();
}

function show_content(id){
	var message = messages[id];
	var content_back = document.createElement('div');
	content_back.id = "content_back";
	var content_back_link = document.createElement('a');
	content_back_link.href = "#";
	content_back_link.setAttribute('data-action','back');
	content_back_link.innerHTML = "Back to messages";
	_content.innerHTML = "";

	content_back.appendChild(content_back_link);
	_content.appendChild(content_back);
	_content.innerHTML += message.content;
	_messages.className = 'hide';
	_content.className = 'show';
}

function hide_content(){
	_messages.className = 'show';
	_content.className = 'hide';
}

function add_css(url){
    var head = document.getElementsByTagName('head')[0];
    var s = document.createElement('link');
    s.setAttribute('type', 'text/css');
    s.setAttribute('rel', 'stylesheet');
    s.href = url;
    head.appendChild(s);
}

function supports_local_storage(){
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

function add_contact(){
	var contact_added = false;
	if(supports_local_storage() && localStorage['inbox_contact']){
		contact_added = localStorage['inbox_contact'];
	}

	if(!contact_added){
		var data = {
			email:k.email
		}
		if(k.contact_id){
			data['id'] = k.contact_id
		}
		var params = {
			token:k.public_token,
			data:data
		}

	    xhr = new XMLHttpRequest();

		xhr.open('POST',
		encodeURI('http://www.knowtify.io/api/v1/contacts/js_add'));
		//xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.setRequestHeader("Content-Type","application/json; charset=UTF-8");
		xhr.onload = function() {
		    if (xhr.status !== 200) {
           if (k.errorHandler) {
              k.errorHandler(xhr);
            }
            else {
		          alert('Request failed.  Returned status of ' + xhr.status);
            }
		    }
		};
		xhr.send(JSON.stringify(params));
		localStorage.setItem('inbox_contact',true);
	}
}

function extend(){
	for(var i=1; i<arguments.length; i++)
		for(var key in arguments[i])
			if(arguments[i].hasOwnProperty(key))
				arguments[0][key] = arguments[i][key];
	return arguments[0];
}

function cumulativeOffset(element) {
    var top = 0, left = 0;
    do {
        top += element.offsetTop  || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while(element);

    return {
        top: top,
        left: left
    };
};

function timeSince(timestamp) {
	if(timestamp){
		var date = new Date(timestamp);
	    var seconds = Math.floor((new Date() - date) / 1000);

	    var interval = Math.floor(seconds / 31536000);

	    if (interval > 1) {
	        return interval + "y ago";
	    }
	    interval = Math.floor(seconds / 2592000);
	    if (interval > 1) {
	        return interval + "mon ago";
	    }
	    interval = Math.floor(seconds / 86400);
	    if (interval > 1) {
	        return interval + "d ago";
	    }
	    interval = Math.floor(seconds / 3600);
	    if (interval > 1) {
	        return interval + "h ago";
	    }
	    interval = Math.floor(seconds / 60);
	    if (interval > 1) {
	        return interval + "m ago";
	    }
	    return Math.floor(seconds) + "s ago";
	}else{
		return "";
	}
}
})();
