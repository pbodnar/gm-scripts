// ==UserScript==
// @name        Default Worklog Type for JIRA
// @namespace   pbo
// @description Changes default Worklog Type in JIRA with the Worklog express add-on.
// @match       https://your.jira.example.com/browse/*
// @version     1.0.0
// @grant       GM_registerMenuCommand
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// ==/UserScript==

(function($) {

/* Great users of this script can safely change values of the following constants: */

/**
 * What to set in here?
 *
 * 1. On an issue page, open the "Log Work" dialog.
 * 2. Find the <select> element with id "wl-type" in your browser's HTML inspector.
 * 3. Inside that element, find the <option> element which you prefer as the default choice.
 * 4. Copy the "value" attribute of that element here.
 */
var DEFAULT_WORKLOG_TYPE = 1;

var traceOn = true;

/* end of safe zone */

trace('starting...');

function showHelp() {
  alert(`Default Worklog Type for JIRA - Help

    This script alters the "Log Work" dialog - if it finds a "Worklog Type"
    in the dialog, it changes its value to the value defined in the source
    code of this script.

    @author pbodnar
    @version ${GM_info.script.version}
  `);
}

try {
  trace('command register');
  GM_registerMenuCommand(`${GM_info.script.name} - Help`, showHelp);
  trace('command registered');
} catch (e) {
  trace('command register error: ' + e);
}

// ==================== Commands ====================

// ==================== GUI ====================

var PROCESSED_FLAG = 'def-wltype-processed';

function setDefaultWorklogType() {
  var targets = $('#wl-type').filter(':not([' + PROCESSED_FLAG + '])');
  var wlType = DEFAULT_WORKLOG_TYPE;// always static for now

  for (var i = 0; i < targets.length; i++) {
    // note: there should be always 1 item (select field)
    trace('Setting default worklog type ' + wlType + ' to item #' + (i + 1));
    var target = targets[i];
    $(target).attr(PROCESSED_FLAG, true);

    $(target).val(wlType);
    // note: if we call trigger() on this script's jQuery, page's jQuery won't catch the event
    unsafeWindow.$(target).trigger('change');
  }
}

setInterval(setDefaultWorklogType, 500);

trace('started');

// ==================== Generic functions ====================

function trace(text) {
  if (traceOn) {
    console.log(text);
  }
}

})(jQuery);
