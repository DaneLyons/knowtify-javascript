/*
 var _knowtify = _knowtify || [];
 _knowtify.public_token = "67c681aed06e3487bd20d4909d28af12";
 _knowtify.development = true;

 function _knowtifyLoader(f) {

 var j = document.createElement('script');
 var p = document.getElementsByTagName('script')[0];
 j.type = 'text/javascript';
 j.async = true;
 j.src = f;
 p.parentNode.insertBefore(j, p);
 }

 // Goals
 // handle ssl/non ssl load
 // Handle no _knowtify set
 // handle _knowtify set anywhere
 //handle processing _knowitfy
 //Handle using local_storage


 _knowtifyLoader("//js.knowtify.io/knowtify.js");

 _knowtify.push(['add_contact', {"email": "joe@a.ol.com", contact_id: 123, name: "Joe", followers: 12}]);
 _knowtify.push(['update_contact', {"contact_id": 123, "email": "joe@aol.com", name: "Joe", followers: 12}]);
 _knowtify.push(['event', 'low_credits',{ "contact_id": 123, credits: 10}]);
 _knowtify.push(['inbox', 'inbox-btn', {"email": "joe@a.ol.com", contact_id: 123}]);

 */
(function (window, document, undefined) {


        //var jQuery, $; // Localize jQuery variables


        if (typeof(window._knowtify) == 'undefined') {
            window._knowtify = [];
        }
        var KNOWTIFY = {
            fullyLoaded: function () {
                var d = document;
                if (d.readyState && d.readyState == "complete"
                    || d.readyState == "loaded" && d.addEventListener) {
                    return (true);
                }
            },
            loadScript: function (url, callback) {
                var scriptTag = document.createElement('script');
                scriptTag.setAttribute("type", "text/javascript");
                scriptTag.setAttribute("src", url);
                if (typeof callback !== "undefined") {
                    if (scriptTag.readyState) {
                        scriptTag.onreadystatechange = function () {
                            if (this.readyState === 'complete' || this.readyState === 'loaded') {
                                callback();
                            }
                        };
                    } else {
                        scriptTag.onload = callback;
                    }
                }
                (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(scriptTag);
            },
            loadCSS: function (url) {
                var head = document.getElementsByTagName('head')[0];
                var s = document.createElement('link');
                s.setAttribute('type', 'text/css');
                s.setAttribute('rel', 'stylesheet');
                s.href = url;
                head.appendChild(s);
            },
            attachToReadyStateChange: function () {

                if (document.attachEvent) {
                    document.attachEvent("onreadystatechange", KNOWTIFY.process);
                }
                else {
                    document.addEventListener("readystatechange", KNOWTIFY.process);
                }
            },
            attachToLoad: function () {
                if (document.attachEvent) {
                    document.attachEvent("onload", KNOWTIFY.process);
                }
                else {
                    document.addEventListener("loaded", KNOWTIFY.process);
                    document.addEventListener("DOMContentLoaded", KNOWTIFY.process);
                }
            },
            attachToKnowtify: function(){
                //This is needed to make API calls based on user behavior after the page loads.
                if(Object.observe){
                    Object.observe(_knowtify, KNOWTIFY.process);
                }else{
                    //probably not a great solution but it's better than a while loop
                    setInterval(KNOWTIFY.process,1000);
                }
            },
            addContactCommand: function (data) {
                //console.log("add_contact");
                if(data[1].email) {
                    if (!data[1].name) {
                        data[1].name = "";
                    }
                    KNOWTIFY.apiCall("http://www.knowtify.io/api/v1/contacts/js_add", data[1]);
                }else{
                    //console.log("Error: No email defined for add_contact", data[1]);
                }

            },
            updateContactCommand: function (data) {
                //console.log("update_contact");

                if(data[1].id) {
                    KNOWTIFY.apiCall("http://www.knowtify.io/api/v1/contacts/js_update", data[1]);
                }else{
                    //console.log("Error: No contact id defined for update_contact");
                }
            },
            eventCommand: function (data) {
                //console.log("event");
                if(data[2].id) {
                    data[2].event = data[1];
                    KNOWTIFY.apiCall("http://www.knowtify.io/api/v1/contacts/js_update", data[2]);
                }
                else {
                    //console.log("Error: No id defined for event", data[1]);
                }

            },
            inboxCommand: function (data) {
                //console.log("inbox");

                window.knowtifyInbox = {
                    public_token: window._knowtify.public_token,
                    email: data[2].email,
                    alert_button_id: data[1]
                };
                //console.log(data[2].id);
                if(data[2].id){
                    //backwards compatibility
                    window.knowtifyInbox.contact_id = data[2].id+"";
                }
                //Load the library

                KNOWTIFY.loadScript("http://js.knowtify.io/inbox.js", function () {
                 //   console.log("Loaded inbox");
                });

                /*
                KNOWTIFY.loadScript("http://js.knowtify.io/inbox.js", function () {
                 //   console.log("Loaded inbox");
                });
                */
            },
            loadJSCommand: function (data) {
                //console.log("loading JS");

                if(data[1].url) {
                    KNOWTIFY.loadScript(data[1].url, function () {
                     //   console.log("Loaded JS");
                    });
                }
                else {
                    //console.log("Error: No url for JS");
                }

            },
            loadCSSCommand: function (data) {
                //console.log("loading CSS");

                if(data[1].url) {
                    var head = document.getElementsByTagName('head')[0];
                    var s = document.createElement('link');
                    s.setAttribute('type', 'text/css');
                    s.setAttribute('rel', 'stylesheet');
                    s.href = data[1].url;
                    head.appendChild(s);
                }
                else {
                    //console.log("Error: No url for CSS");
                }

            },
            apiCall: function (url, data, success_callback) {


                if (_knowtify.public_token) {
                    var params = {
                        token: _knowtify.public_token,
                        data: data
                    }
                    if(data.event){
                        params.event = data.event;
                        delete data.event;
                    }

                    var xhr = new XMLHttpRequest();

                    xhr.open('POST',encodeURI(url));
                    xhr.setRequestHeader("Content-Type","application/json; charset=UTF-8");
                    xhr.onload = function() {
                        if (xhr.status !== 200) {
                            if (_knowtify.errorHandler) {
                              _knowtify.errorHandler(xhr);
                            }
                            else {
                              alert('Request failed.  Returned status of ' + xhr.status);
                            }
                        }else{
                            if (success_callback){
                                success_callback(xhr.responseText);
                            }
                        }
                    };
                    xhr.send(JSON.stringify(params));

                    /*
                    $.ajax({
                        type: 'POST',
                        dataType: "json",
                        crossDomain: true,
                        processData: false,
                        contentType: 'application/json',
                        data: JSON.stringify({
                            token: _knowtify.public_token,
                            data: data
                        }),
                        url: url,
                        success: function (result) {
                            console.log(result);
                            if (success_callback) {
                                success_callback(result);
                            }
                        }
                    });
                    */
                } else {
                    //console.log("Error: No public token set on _knowtify");
                }


            },
            hasLocalStorage: function () {
                try {
                    return 'localStorage' in window && window['localStorage'] !== null;
                } catch (e) {
                    return false;
                }
            },
            process: function () {
                //console.log("processing the queue");
                var d;
                while (_knowtify.length > 0) {

                    //d = jQuery.extend({}, _knowtify.shift());
                    d = KNOWTIFY.extend({}, _knowtify.shift());
                    //console.log(d);

                    switch (d[0]) {
                        case "add_contact":
                            KNOWTIFY.addContactCommand(d);
                            break;
                        case "update_contact":
                            KNOWTIFY.updateContactCommand(d);
                            break;
                        case "load_inbox":
                            KNOWTIFY.inboxCommand(d);
                            break;
                        case "load_js":
                            KNOWTIFY.loadJSCommand(d);
                            break;
                        case "load_css":
                            KNOWTIFY.loadCSSCommand(d);
                            break;
                        case "event":
                            KNOWTIFY.eventCommand(d);
                            break;
                        default:
                            //console.log(d[0], "Unknown Command");
                    }
                }

            },
            init: function () {
                KNOWTIFY.attachToReadyStateChange();
                KNOWTIFY.attachToLoad();
                KNOWTIFY.attachToKnowtify();
            },
            extend: function(){
                for(var i=1; i<arguments.length; i++)
                    for(var key in arguments[i])
                        if(arguments[i].hasOwnProperty(key))
                            arguments[0][key] = arguments[i][key];
                return arguments[0];
            }
        };
        
        KNOWTIFY.init();
        /*
        KNOWTIFY.loadScript("http://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js", function () {
            $ = jQuery = window.jQuery.noConflict(true);
            KNOWTIFY.init();
        });
        */
        

    }
    (window, document)
)
;


