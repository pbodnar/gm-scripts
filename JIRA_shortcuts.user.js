// ==UserScript==
// @name        Shortcuts for JIRA
// @namespace   pbo
// @description JIRA - additional keyboard shortcuts for JIRA
// @include     http://your.jira.example.com/browse/*
// @version     1.0.0
// @grant       GM_registerMenuCommand
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require     https://raw.githubusercontent.com/jeresig/jquery.hotkeys/0.2.0/jquery.hotkeys.js
// ==/UserScript==

// IMPORTANT: At least some @grant <> 'none' must be present to force GM to run the script 'in sandbox'.
// See http://stackoverflow.com/questions/12146445/jquery-in-greasemonkey-1-0-conflicts-with-websites-using-jquery

var traceOn = true;

trace('starting...');

function showHelp() {
  alert(`Shortcuts for JIRA - Help
  
    This adds some keyboard shortcuts which are missing in the default JIRA instalation.
    Just one hard-coded shortcut is available now (<key> ... <action>):
    
    - w ... show the Log Work dialog
    
    @author pbodnar
    @version 1.0.0    
  `);
}

try {
  trace("command register");
  GM_registerMenuCommand("Shortcuts for JIRA - Help", showHelp);
  trace("command registered");
} catch (e) {
  trace("command register error: " + e);  
}

// ==================== Commands ====================

function showLogWorkDialog() {
  var btn = $('#stalker #log-work')[0];
  if (!btn) {
    trace('The Log Work button not found!');
    return;
  }
  trace('Clicking the Log Work button...');
  triggerMouseEvent(btn, 'click');
}

// ==================== GUI ====================

// register the various keyboard shortcuts

function bindShortcut(keys, handler) {
  // make the shortcuts case-insensitive (bind() takes space as alternative keys
  // separator):
  keys = keys + " " + keys.toUpperCase();

  $(document).bind("keypress", keys, handler);
}

bindShortcut('w', showLogWorkDialog);

trace('started');

// ==================== Generic functions ====================

// see
// http://stackoverflow.com/questions/10423426/jquery-click-not-working-in-a-greasemonkey-tampermonkey-script
function triggerMouseEvent(node, eventType) {
  var clickEvent = document.createEvent('MouseEvents');
  clickEvent.initEvent(eventType, true, true);
  node.dispatchEvent(clickEvent);
}

function trace(text) {
  if (traceOn) {
    console.log(text);
  }
}