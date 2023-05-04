// ==UserScript==
// @name        Default Worklog Type for JIRA
// @namespace   pbo
// @description Changes default Worklog Type in JIRA with the Worklog express add-on.
// @match       https://your.jira.example.com/browse/*
// @version     1.1.0
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

/**
 * Whether to remember which type was lastly selected for a given issue
 * and to reuse that value instead of the value of DEFAULT_WORKLOG_TYPE.
 */
var REUSE_ISSUE_LAST_WORKLOG_TYPE = true;

var traceOn = true;

/* end of safe zone */

var WL_TYPE_KEY_PREFIX = 'def-wltype.';

trace('starting...');

function showHelp() {
  alert(`Default Worklog Type for JIRA - Help

    This script alters the "Log Work" dialog - if it finds a "Worklog Type"
    in the dialog, it changes its value to the value defined in the source
    code of this script, or if enabled, to the lastly used one.

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
  
  for (var i = 0; i < targets.length; i++) {
    // note: there should be always 1 item (select field)
    var wlType = REUSE_ISSUE_LAST_WORKLOG_TYPE ? getIssueWorklogType() : DEFAULT_WORKLOG_TYPE;
    trace('Setting default worklog type ' + wlType + ' to item #' + (i + 1));
    var target = targets[i];
    $(target).attr(PROCESSED_FLAG, true);

    if (REUSE_ISSUE_LAST_WORKLOG_TYPE) {
      unsafeWindow.$(target).on("change", storeIssueWorklogType);
    }

    $(target).val(wlType);
    // note: if we call trigger() on this script's jQuery, page's jQuery won't catch the event
    unsafeWindow.$(target).trigger('change');
  }
}

setInterval(setDefaultWorklogType, 500);

trace('started');

// ==================== Helper functions =====================

function getIssueWorklogType() {
  var issueKey = $('#key-val').text();

  var wlType = window.localStorage.getItem(WL_TYPE_KEY_PREFIX + issueKey);
  if (wlType) {
    trace('Using worklog type for issue from local storage: ' + wlType);
  } else {
    wlType = DEFAULT_WORKLOG_TYPE;
  }

  return wlType;
}

function storeIssueWorklogType(event) {
  var issueKey = $('#key-val').text();

  var wlType = $(event.target).val();
  trace('Storing worklog type for issue in local storage: ' + wlType);
  window.localStorage.setItem(WL_TYPE_KEY_PREFIX + issueKey, wlType);
}

// ==================== Generic functions ====================

function trace(text) {
  if (traceOn) {
    console.log(text);
  }
}

})(jQuery);
