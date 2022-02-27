// ==UserScript==
// @name        Shortcuts for JIRA
// @namespace   pbo
// @description JIRA - additional shortcuts for JIRA
// @include     http://your.jira.example.com/browse/*
// @version     1.2.1
// @grant       GM_registerMenuCommand
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/jquery-ui.min.js
// @require     https://raw.githubusercontent.com/pbodnar/jquery.hotkeys/filterTextInputs-easy/jquery.hotkeys.js
// ==/UserScript==

(function($) {

var traceOn = true;

trace('starting...');

function showHelp() {
  alert(`Shortcuts for JIRA - Help
  
    This adds some shortcuts which are missing in the default JIRA installation.
    The following shortcuts are available on the issue detail page (<action> ... <function>):
    
    - press <W>
          ... shows the Jira's Log Work dialog (if it is available)
    
    - press <Shift>+<W>
          ... the same as <W>, but with the "Smart log" function implemented by this script.
              Note that this relies on "Visual" tab being present in the dialog.
    
    - click '+/-' when hovering above 'Original / Remaining Estimate' fields while editing an issue
          ... a custom dialog appears which lets you change both estimates easily
    
    @author pbodnar
    @version ${GM_info.script.version}
  `);
}

try {
  trace('command register');
  GM_registerMenuCommand('Shortcuts for JIRA - Help', showHelp);
  trace('command registered');
} catch (e) {
  trace('command register error: ' + e);  
}

// ==================== Commands ====================

function showLogWorkDialogSimple() {
  showLogWorkDialog(false);
}

function showLogWorkDialogSmart() {
  showLogWorkDialog(true);
}

function showLogWorkDialog(smartLogTime) {
  var btn = $('#log-work')[0];
  if (!btn) {
    trace('The Log Work button not found!');
    return;
  }
  trace('Clicking the Log Work button...');
  triggerMouseEvent(btn, 'click');
  if (smartLogTime) {
    // relying on TinyMCE's Visual editor and API here
    waitFor(() => $('form#log-work *[data-mode=wysiwyg] > *')[0], prepareSmartLogTime);
  }
}

function prepareSmartLogTime(btnVisual) {
  triggerMouseEvent(btnVisual, 'click');
  waitFor(() => unsafeWindow.tinymce.activeEditor, doSmartLogTime);
}

function doSmartLogTime(commentEditor) {
  var timesAndDescr = window.prompt('Smart log: Enter time intervals & work description:', '09:00 - 10:00, 10:30 - 11:15 implemented happy day scenario');
  if (!timesAndDescr) {
    return;
  }
  try {
    // 1) fill "Time Spent"
    var sumTime = getSumHours(timesAndDescr);
    // note: Number.EPSILON helps us with rounding e. g. 1.005 to 1.01
    $('#log-work-time-logged').val(Math.round((sumTime + Number.EPSILON) * 100) / 100);

    // 2) fill "Work Description"
    var descrIndex = timesAndDescr.search(/[A-Za-zÀ-ÖØ-öø-ÿ]/);
    if (descrIndex < 0) {
      descrIndex = 0;
    }
    // note: without a delay, the write to the editor doesn't always work
    var descr = timesAndDescr.substr(descrIndex);
    setTimeout(() => commentEditor.setContent(escapeHtml(descr)), 500);
  } catch (e) {
    window.alert('Something went wrong when processing your input: ' + e);
  }
}

function getSumHours(expr) {
  var sum = 0;
  var now = new Date();
  
  // \u2013 = EN DASH
  var intervalsRe = /(\d{1,2}):(\d{2})\s*[-\u2013]\s*(\d{1,2}):(\d{2})/g;
  var match;
  while (match = intervalsRe.exec(expr)) {
    var dateFrom = new Date(now);
    var dateTo = new Date(now);
  
    dateFrom.setHours((match[1]));
    dateFrom.setMinutes(match[2]);
    dateTo.setHours((match[3]));
    dateTo.setMinutes(match[4]);
  
    if (dateTo < dateFrom) {
      // somebody worked over midnight...
      dateTo.setDate(dateTo.getDate() + 1);
    }
  
    var diffMillis = dateTo - dateFrom;
    if (diffMillis <= 0) {
      throw 'Non-positive time diff=' + diffMillis + ' extracted from=' + match[0];
    }
    var diffHours = diffMillis / 1000 / 60 / 60;
    sum += diffHours;
  }

  return sum;
}

// ==================== GUI ====================

// register the various keyboard shortcuts

function bindShortcut(keys, handler) {
  // make the shortcuts case-insensitive (bind() takes space as alternative keys
  // separator):
  keys = keys + ' ' + keys.toUpperCase();

  $(document).bind('keypress', keys, handler);
}

function showError(msg) {
  alert('ERROR: ' + msg);
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

// Note: It looks like this shortcut was added to Jira in 2019 or so, see https://jira.atlassian.com/browse/JRASERVER-16459.
bindShortcut('w', showLogWorkDialogSimple);
bindShortcut('shift+w', showLogWorkDialogSmart);

setInterval(extendEstimateFields, 1000);

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

function waitFor(checkFn, nextFn) {
  var res = checkFn();
  if (res) {
    nextFn(res);
    return;
  }
  setTimeout(() => waitFor(checkFn, nextFn), 500);
}

// see
// http://stackoverflow.com/questions/10423426/jquery-click-not-working-in-a-greasemonkey-tampermonkey-script
function triggerMouseEvent(node, eventType) {
  var clickEvent = document.createEvent('MouseEvents');
  clickEvent.initEvent(eventType, true, true);
  node.dispatchEvent(clickEvent);
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

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function (m, g1) {
      return args[g1];
    });
  };
}

//==================== jQuery generic functions ====================

//http://stackoverflow.com/questions/210717/using-jquery-to-center-a-div-on-the-screen
$.fn.center = function() {
  this.css('position', 'absolute');
  this.css('top', Math.max(0, (($(window).height() - this.outerHeight()) / 2) + 
                                             $(window).scrollTop()) + 'px');
  this.css('left', Math.max(0, (($(window).width() - this.outerWidth()) / 2) + 
                                             $(window).scrollLeft()) + 'px');
  return this;
}

$.fn.focusWithSelect = function(startPos, endPos) {
  this.focus();
  // This works since IE 9.
  // See https://stackoverflow.com/questions/3085446/selecting-part-of-string-inside-an-input-box-with-jquery/3085656#3085656 for more possibilities
  this[0].selectionStart = startPos;
  this[0].selectionEnd = typeof endPos == 'undefined' ? 1000000 : endPos;
  
  return this;
}

// ==================== alter-jira-estimate-fields extension ====================

/*
 * Structure of the target element:
 * 
 * <input class="text short-field" id="timetracking_originalestimate" name="timetracking_originalestimate" type="text" value="2w">
 */

var PROCESSED_FLAG = 'data-shrcut-processed';

function extendEstimateFields() {
  var targets = $('input#timetracking_originalestimate, input#timetracking_remainingestimate').filter(':not([' + PROCESSED_FLAG + '])');
  
  for (var i = 0; i < targets.length; i++) {
    trace('Adding alter estimate button to item #' + (i + 1));
    var target = targets[i];
    addAlterEstim(target);
  }
}

function addAlterEstim(target) {
  $(target).attr(PROCESSED_FLAG, true);
  
  var alterEstimBtn = getAlterEstimBtn();
  alterEstimBtn.visBinder.addTriggerEl(target);
}

function getAlterEstimBtn() {
  if (typeof alterEstimBtn != 'undefined') {
    return alterEstimBtn;
  }
  
  alterEstimBtn = $('<div class="item-alter-estim" title="Alter estimate(s)"'
      + ' style="z-index: 1000000; position: absolute; display: none; color: red; border: 1px solid red; background-color: white; opacity: 0.75;'
      + ' padding: 2px; height: 20px; font-size: 16px; line-height: 16px; text-align: center; font-style: italic; font-weight: bold; cursor: pointer;">'
      + '<span style="vertical-align: middle">+/-</span></div>')[0];
  insertBodyElement(alterEstimBtn);
  
  alterEstimBtn.visBinder = new VisibilityBinder(alterEstimBtn, {
    timeout : 2000
  });
  
  $(alterEstimBtn).on('click', function() {
    $(this).hide();
    var dlg = getAlterEstimDlg();
    $(dlg).show()
      .center();
    
    var input = $(dlg).children('input[type = "text"]')[0];
    $(input).focusWithSelect($(input).val().indexOf('-') + 1);
  });
  
  return alterEstimBtn;
}

function getAlterEstimDlg() {
  if (typeof alterEstimDlg != 'undefined') {
    return alterEstimDlg;
  }
  var dlg = alterEstimDlg = document.createElement('div');
  dlg.id = 'alter-estim-dlg';
  dlg.style = 'z-index: 1000001; color: red; background-color: white; padding: 1em; border: 1px solid red;';
  dlg.style.position = 'absolute';
  dlg.style.opacity = 0.90;
  dlg.innerHTML = `<input type="text" value="-1d 4h">
    <input type="checkbox" id="shrcut-alter-estim-orig" checked><label for="shrcut-alter-estim-orig" title="Alter Original estimate">O</label>
    <input type="checkbox" id="shrcut-alter-estim-rem" checked><label for="shrcut-alter-estim-rem" title="Alter Remaining estimate">R</label>
    <input type="button" value="OK">
    <input type="button" value="Cancel">
  `;
  
  insertBodyElement(dlg);
  
  // add behavior
  var eInvalidDurationPattern = 'Invalid duration pattern: [{0}]!';
  
  $(dlg).children('input[value = "Cancel"]').click(function() {
    $(dlg).hide();
  });
  
  $(dlg).children('input[value = "OK"]').click(function() {
    alterEstimates();
  });
  
  $(dlg).children('input[type = "text"]').keyup(function(e) {
    if (e.keyCode == 13 /* Enter */) {
      alterEstimates();
    }
  });
  
  function alterEstimates() {
    trace("Altering estimates...");
    
    try {
      var delta = normalizeDuration($(dlg).children('input[type = "text"]').val());
      var someTarget = false;
      var infos = [];
      
      if ($('#shrcut-alter-estim-orig').prop('checked')) {
        someTarget = true;
        try {
          infos.push(applyDurationDelta($('input#timetracking_originalestimate')[0], delta)); 
        } catch (e) {
          showError(e);
        } 
      }
      if ($('#shrcut-alter-estim-rem').prop('checked')) {
        someTarget = true;
        try {
          infos.push(applyDurationDelta($('input#timetracking_remainingestimate')[0], delta)); 
        } catch (e) {
          showError(e);
        } 
      }
      
      if (!someTarget) {
        throw 'No target field to alter selected!';
      }
      
      $(dlg).hide();
      showInfo(infos.join('<br>'));
    } catch (e) {
      showError(e);
    }
  }
  
  function applyDurationDelta(targetEl, delta) {
    if (!targetEl) {
      return false;
    }
    
    trace("Altering estimate of [{0}]".format(targetEl.id));
    
    var oldVal = $(targetEl).val();
    var newVal = formatDuration(normalizeDuration(oldVal) + delta);
    
    $(targetEl).val(newVal);
    
    return 'Changed estimate from [{0}] to [{1}].'.format(oldVal, newVal);
  }
  
  var unitMinutes = {
      'w' : 5 * 8 * 60,
      'd' : 8 * 60,
      'h' : 60,
      'm' : 1
  };
  
  // '[+-]Xw Xd Xh Xm' --> [+-]X in minutes
  function normalizeDuration(fullStr) {
    var str = fullStr.trim();
    
    var signStr = str.match(/[+-]/);
    var sign = signStr && signStr[0] == '-' ? -1 : 1;
    if (signStr) {
      str = str.substr(1);
    }
    var parts = str.split(/\s+/);
    
    var res = 0;
    parts.forEach(function(part) {
      var match = part.match(/^(\d+)([wdhm])$/);
      if (!match) {
        throw eInvalidDurationPattern.format(fullStr);
      }
      var length = match[1];
      var unit = match[2];
      res += length * unitMinutes[unit];
    });
    
    return res * sign;
  }
  
  // X in minutes --> 'Xw Xd Xh Xm'
  function formatDuration(minutes) {
    var res = [];
    for (unit in unitMinutes) {
      var times = Math.floor(minutes / unitMinutes[unit]);
      if (times > 0) {
        res.push(times + unit);
        minutes %= unitMinutes[unit];
      }
    }
    
    return res.length > 0 ? res.join(' ') : '0h';
  }
  
  return dlg;
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
