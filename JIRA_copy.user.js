// ==UserScript==
// @name        Copy Anything for JIRA
// @namespace   pbo
// @description JIRA - copy info to clipboard
// @include     http://your.jira.example.com/browse/*
// @version     1.1.1
// @grant       GM_registerMenuCommand
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/jquery-ui.min.js
// @require     https://raw.githubusercontent.com/pbodnar/jquery.hotkeys/filterTextInputs-easy/jquery.hotkeys.js
// ==/UserScript==

(function($) {

var traceOn = true;

trace('starting...');

function showHelp() {
  alert(`Copy Anything for JIRA - Help
  
    Press 'D' to display the follow-up shortcuts / options to copy various parts of the page into the clipboard.
    
    @author pbodnar
    @version ${GM_info.script.version}
  `);
}

try {
  trace('command register');
  GM_registerMenuCommand('Copy Anything for JIRA - Help', showHelp);
  trace('command registered');
} catch (e) {
  trace('command register error: ' + e);  
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
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  var overlay = getCommandsDiv();
  $(overlay).hide();
}

function getCommandsDiv() {
  if (typeof commandsDiv != 'undefined') {
    return commandsDiv;
  }
  var div = commandsDiv = document.createElement('div');
  div.style = 'z-index: 1000001; color: red; background-color: white; padding: 1em; border: 1px solid red;';
  div.style.position = 'absolute';
  div.style.opacity = 0.75;
  div.innerHTML = `Follow-up shortcuts available for copying issue details to clipboard (&lt;key&gt; ... &lt;what appears in clipboard&gt;):
  <ul>
   <li>Shift+L ... <u>l</u>ink to issue, including issue key and summary</li>
   <li>Shift+S ... <u>s</u>hort link to issue, including just issue key</li>
   <li>Shift+M ... commit <u>m</u>essage template</li>
   <hr />
   <li>Shift+E ... <u>e</u>scape - hide this popup</li>
  </ul>
  <p>
  NEW since v1.1: Mouse over a tag-like item to copy its text to clipboard via a dynamic 'copy' button.
  </p>
  `;
  
  insertBodyElement(div);
  
  return div;
}

// register the various keyboard shortcuts

function bindShortcut(keys, handler) {
  // make the shortcuts case-insensitive (bind() takes space as alternative keys separator):
  keys = keys + ' ' + keys.toUpperCase();
  
  $(document).bind('keypress', keys, handler);  
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

// TODO How to temporatily suppress the standard JIRA shortcuts, so there is no need to combine the letters with for example 'shift' as below?
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
  if (typeof infoDiv != 'undefined') {
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
  if (typeof clipboardDiv != 'undefined') {
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
  clipboardDiv.innerHTML = html + '<span></span>';

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

setInterval(extendTagLikeItems, 1000);

trace('started');

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
  var qIndex = loc.indexOf('?');
  loc = qIndex > -1 ? loc.substring(0, qIndex) : loc; 
  
  // cut off any #...' if present
  var hIndex = loc.indexOf('#');
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
  this.css('position', 'absolute');
  this.css('top', Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + 
                                              $(window).scrollTop()) + 'px');
  this.css('left', Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + 
                                              $(window).scrollLeft()) + 'px');
  return this;
}

// ==================== copy-tag-like-item extension ====================

/*
 * Structure of the target element:
 * 
 * a) readonly mode (example: "Labels" field):
 * 
 * <li><a class="lozenge"
 * href="/secure/IssueNavigator.jspa?reset=true&amp;jqlQuery=labels+%3D+workshop"
 * title="workshop"><span>workshop</span></a></li>
 * 
 * b) edit mode (example: field in the "Link issues dialog"):
 * 
 * <li class="item-row" title="ISSUE-50"> <button type="button" tabindex="-1"
 * class="value-item"> <span><span class="value-text">ISSUE-50</span></span>
 * </button> <em class="item-delete" title="Remove"></em> </li>
 */

var PROCESSED_FLAG = 'data-cpy-processed';

function extendTagLikeItems() {
  // readonly targets
  var targets = $('li:has(> .lozenge)').filter(':not([' + PROCESSED_FLAG + '])');
  
  for (var i = 0; i < targets.length; i++) {
    trace('Adding copy button to readonly item #' + (i + 1));
    var target = targets[i];
    addCopyButton(target);
  }
  
  // editable targets
  targets = $('.item-row:not([' + PROCESSED_FLAG + '])');
  
  for (var i = 0; i < targets.length; i++) {
    trace('Adding copy button to editable item #' + (i + 1));
    var target = targets[i];
    addCopyButton(target);
  }
}

function addCopyButton(target) {
  $(target).attr(PROCESSED_FLAG, true);
  
  var copyBtn = getCopyButton();
  copyBtn.visBinder.addTriggerEl(target);
}

function getCopyButton() {
  if (typeof copyBtn != 'undefined') {
    return copyBtn;
  }
  
  copyBtn = $('<div class="item-copy" title="Copy text to clipboard"'
      + ' style="z-index: 1000000; position: absolute; display: none; color: red; border: 1px solid red; background-color: white; opacity: 0.75;'
      + ' width: 14px; height: 20px; font-size: 16px; line-height: 16px; text-align: center; font-style: italic; font-weight: bold; cursor: pointer;">'
      + '<span style="vertical-align: middle">c</span></div>')[0];
  insertBodyElement(copyBtn);
  
  copyBtn.visBinder = new VisibilityBinder(copyBtn, {
    timeout : 2000
  });
  
  $(copyBtn).on('click', function() {
    $(this).hide();
    copyToClipboard($(this.triggerEl).text());
  });
  
  return copyBtn;
}

// @class (reusable)
function VisibilityBinder(targetEl, cfg) {
  this.targetEl = targetEl;
  
  var timeout = cfg.timeout;
  var timeoutT;
  
  $(targetEl).on('mouseover', function() {
    if (timeoutT) {
      clearTimeout(timeoutT);
      timeoutT = null;
    }
  });
  $(targetEl).on('mouseout', function() {
    timeoutT = setTimeout(function() {
      $(targetEl).hide();
    }, timeout);
  });
  
  this.addTriggerEl = function(triggerEl) {
    $(triggerEl).on('mouseover', function() {
      $(targetEl).show();
      // this could be configurable as well:
      $(targetEl).position({ my: 'center top', at: 'center bottom', of: triggerEl });
      
      targetEl.triggerEl = triggerEl;
  
      if (timeoutT) {
        clearTimeout(timeoutT);
        timeoutT = null;
      }
    });
  
    $(triggerEl).on('mouseout', function() {
      timeoutT = setTimeout(function() {
        $(targetEl).hide();
      }, timeout);
    });
  }
}

})(jQuery);
