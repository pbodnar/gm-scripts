// ==UserScript==
// @name        Copy Anything for JIRA
// @namespace   pbo
// @description JIRA - copy info to clipboard
// @include     http://your.jira.example.com/browse/*
// @version     1.0.0
// @grant       GM_registerMenuCommand
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require     https://raw.githubusercontent.com/jeresig/jquery.hotkeys/0.2.0/jquery.hotkeys.js
// ==/UserScript==

// NOTES FOR DEVS
// http://stackoverflow.com/questions/9931115/run-greasemonkey-on-html-files-located-on-the-local-filesystem
// -> about:config -> greasemonkey.fileIsGreaseable: true

var traceOn = true;

trace("starting...");

function showHelp() {
  alert(`Copy Anything for JIRA - Help
  
    Press 'd' to copy various parts of the page into the clipboard.
    
    @author pbodnar
    @version 1.0.0    
  `);
}

try {
  trace("command register");
  GM_registerMenuCommand("Copy Anything for JIRA - Help", showHelp);
  trace("command registered");
} catch (e) {
  trace("command register error: " + e);  
}

// ==================== JIRA copy commands ====================

// TODO Refactor: Return just the extracted string instead... Plus make this easily re-usable for other pages as well.

function copyAsLinkFull() {
  var issueKey = $('#key-val').text();
  var summaryKey = $('#summary-val').text();

  var res = '<a href="' + getPagePath() + '">' + issueKey + ' - ' + escapeHtml(summaryKey) + '</a>';
  copyToClipboard(res);
}

function copyAsLinkWithKey() {
  var issueKey = $('#key-val').text();
  
  var res = '<a href="' + getPagePath() + '">' + issueKey + '</a>';
  copyToClipboard(res);
}

function copyAsCommitMessage() {
  var issueKey = $('#key-val').text();
  var summaryKey = $('#summary-val').text();
  
  var res = issueKey + ' - ' + escapeHtml(summaryKey) + ': ';
  copyToClipboard(res);
}

// ==================== GUI ====================

var timer = null;
var commandsEnabled = false;

function showCommandsOverlay(event) {
  var overlay = getCommandsDiv();
  $(overlay).show()
    .center();
  commandsEnabled = true;
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(hideCommandsOverlay, 10000);
}

function hideCommandsOverlay() {
  commandsEnabled = false;
  timer = null;
  var overlay = getCommandsDiv();
  $(overlay).hide();
}

function getCommandsDiv() {
  if (typeof(commandsDiv) != "undefined") {
    return commandsDiv;
  }
  var div = commandsDiv = document.createElement('div');
  div.style = 'z-index: 1000001; color: red; background-color: white; padding: 1em; border: 1px solid red;';
  div.style.position = 'absolute';
  div.style.opacity = 0.75;
  div.innerHTML = `Shortcuts available for copying to clipboard as:
  <ul>
   <li>shift+l ... <u>l</u>ink to issue, including issue key and summary</li>
   <li>shift+s ... <u>s</u>hort link to issue, including just issue key</li>
   <li>shift+m ... commit <u>m</u>essage template</li>
   <hr />
   <li>shift+e ... <u>e</u>scape - hide this popup</li>
  </ul>`;
  
  insertBodyElement(div);
  
  return div;
}

// register the various keyboard shortcuts

function bindShortcut(keys, handler) {
  // make the shortcuts case-insensitive (bind() takes space as alternative keys separator):
  keys = keys + " " + keys.toUpperCase();
  
  $(document).bind("keypress", keys, handler);  
}

function bindCopyShortcut(keys, handler) {
  bindShortcut(keys, function() {
    trace('commandsEnabled: ' + commandsEnabled);
    if (commandsEnabled) {
      handler();
      hideCommandsOverlay();
    }
  });
}

bindShortcut('d', showCommandsOverlay);
bindCopyShortcut('shift+e', hideCommandsOverlay);

bindCopyShortcut('shift+l', copyAsLinkFull);
bindCopyShortcut('shift+s', copyAsLinkWithKey);
bindCopyShortcut('shift+m', copyAsCommitMessage);

function copyToClipboard(html) {
  copyHtmlToClipboard(html);
  showInfo('Copied to clipboard: ' + escapeHtml(html));
}

var infoTimer = null;

function showInfo(html) {
  var div = getInfoDiv();
  div.innerHTML = html;
  $(div).show()
    .center();
  
  var timer = infoTimer;
  if (timer) {
    clearTimeout(timer);
  }
  
  infoTimer = setTimeout(function() {
    infoTimer = null;
    $(div).hide();
  }, 3000);
}

function getInfoDiv() {
  if (typeof(infoDiv) != "undefined") {
    return infoDiv;
  }
  var div = infoDiv = document.createElement('div');
  div.style = 'z-index: 1000000; color: green; background-color: white; padding: 1em; border: 0px solid green;';
  div.style.position = 'absolute';
  div.style.opacity = 1;
  
  insertBodyElement(div);
  
  return div;
}

// ==================== Clipboard utils ====================

// Inspired by http://jsfiddle.net/73v73p18/ 

function getClipboardDiv() {
  if (typeof(clipboardDiv) != "undefined") {
    return clipboardDiv;
  }
  clipboardDiv = document.createElement('div');
  clipboardDiv.style.fontSize = '12pt'; // Prevent zooming on iOS
  // Reset box model
  clipboardDiv.style.border = '0';
  clipboardDiv.style.padding = '0';
  clipboardDiv.style.margin = '0';
  
  if (true) { // change to 'false' for seeing the div for debugging
    // Move element out of screen 
    clipboardDiv.style.position = 'fixed';
    clipboardDiv.style['right'] = '-9999px';
    clipboardDiv.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
    // more hiding
    clipboardDiv.setAttribute('readonly', '');
    clipboardDiv.style.opacity = 0;
    clipboardDiv.style.pointerEvents = 'none';
    clipboardDiv.style.zIndex = -1;
    clipboardDiv.setAttribute('tabindex', '0'); // so it can be focused
    clipboardDiv.innerHTML = '';
  }
  
  insertBodyElement(clipboardDiv);
  
  return clipboardDiv;
}

function copyHtmlToClipboard(html) {
  var clipboardDiv = getClipboardDiv();
  // Note: adding redundant <span> element in order not to have any trailing new line or other white space in the clipboard
  clipboardDiv.innerHTML = html + "<span></span>";

  var focused = document.activeElement;
  clipboardDiv.focus();

  window.getSelection().removeAllRanges();  
  var range = document.createRange(); 
  range.setStartBefore(clipboardDiv.firstChild);
  range.setEndAfter(clipboardDiv.lastChild.previousSibling);
  window.getSelection().addRange(range);  

  try {
    if (!document.execCommand('copy')) {
      console.log('execCommand returned false!');
    }
  } catch (e) {
    console.log('execCommand failed with exception: ' + e);
  }

  focused.focus();
}

trace("started");

// ==================== Generic functions ====================

function escapeHtml(text) {
  return text.replace(/[<>&]/g, function(match) {
    if (match == '<') {
      return '&lt;';
    } else if (match == '>') {
      return '&gt;';
    } else {
      return '&amp;';
    }
  });
}

function getPagePath() {
  var loc = window.location.href;
  
  // cut off any '?...' if present
  var qIndex = loc.indexOf("?");
  loc = qIndex > -1 ? loc.substring(0, qIndex) : loc; 
  
  // cut off any #...' if present
  var hIndex = loc.indexOf("#");
  loc = hIndex > -1 ? loc.substring(0, hIndex) : loc; 
  
  return loc;
}

function insertBodyElement(el) {
  // insert the element as the first child - for easier debugging
  document.body.insertBefore(el, document.body.firstChild);
}

function trace(text) {
  if (traceOn) {
    console.log(text);
  }
}

// ==================== jQuery generic functions ====================

// http://stackoverflow.com/questions/210717/using-jquery-to-center-a-div-on-the-screen
jQuery.fn.center = function () {
  this.css("position", "absolute");
  this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + 
                                              $(window).scrollTop()) + "px");
  this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + 
                                              $(window).scrollLeft()) + "px");
  return this;
}
