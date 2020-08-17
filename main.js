/*  
    Status progress bar
        Credit: https://codepen.io/Boogiesox/pen/MYbWrj
    
    CSS Animations, transitions
    Credit and more info here:
        https://css-tricks.com/controlling-css-animations-transitions-javascript/
        https://css-tricks.com/restart-css-animation/
*/

'option strict';

// Retrieve elements
var btnFixCode = document.querySelector('.btnFixCode');
var btnRunCode = document.querySelector('.btnRunCode');
var terminalWin = document.querySelector('.window');
var winButtons = document.querySelector('.window-menu');

// Commands and logs
var commands = document.querySelectorAll('.terminal p'),
    log = document.querySelector('.log span');
    cursor = document.querySelector('.cursor');

// Compiling status progress bar
var pbar = document.querySelector('.progress-bar'),
    sbpercent = document.querySelector('.sb-action-percent'),
    i = 0,
    throttle = .88; // 0-1

function statusBarInfoDraw() {
    if (i <= 100) {
        let r = Math.random();

        requestAnimationFrame(statusBarInfoDraw);
        pbar.style.width = i + '%';
        sbpercent.innerHTML = Math.round(i) + '%';

        if (r < throttle) { // Simulate d/l speed and uneven bitrate
            i = i + r;
        }

    } else {

        let sbwarning = document.querySelector('.sb-stats-warnings');
        let sberrors = document.querySelector('.sb-stats-errors');
        pbar.className += ' done';
        sbpercent.innerHTML = 'Done! Found 3 problems.';
        sbwarning.innerHTML = '2';
        sberrors.innerHTML = '1';
    
    }
};

// fix and run
var cfgApp = {
    hasError: true,
    isTerminalVisible: false,
    processing: false,
}

// Win buttons click
var winButtonsClickHandler = function () {
    fadeOut(terminalWin);
}

function fadeIn(el, time) {
    el.style.display = 'inline-block';
    el.style.opacity = 0;

    let last = +new Date();
    let tick = function () {
        el.style.opacity = +el.style.opacity + (new Date() - last) / time;
        last = +new Date();

        if (+el.style.opacity < 1) {
            (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
        }
    };

    tick();
}

function fadeOut(el) {
    el.classList.add('hide');
    el.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function (event) {
    console.log('document DOMContentLoaded');
});

window.addEventListener('load', function () {
    console.log('window load');

    // Show the status bar info
    statusBarInfoDraw();

    // runcode button click
    btnRunCode.onclick = function (e) {
        e.preventDefault;
        fadeIn(terminalWin, 1000);
        resetAnimation(terminalWin, 'command');
        resetAnimation(terminalWin, 'log');
    
        if (cfgApp.hasError === true) {
            // Show errors
            commands[0].innerHTML = 'Compiling C:\\Projects\\bin\\ConsoleApp.exe...';
            log.innerHTML = 'Line 5: \'Idle\' object is deprecated!<br>' +
                'Line 6: Invalid object. Unrecognized symbol.<br>' +
                'Line 7: \'LazyLife\' contain unsafe code.<br>' +
                '2 errors and 1 warning<br>' +
                '3 problems found!<br>' +
                'Fixed (<i class="fas fa-bug"></i>) and Run (<i class="fas fa-play"></i>) application again...';
            commands[2].innerHTML = 'Writing log... Done!';
        } else {
            // Show program result
            commands[0].innerHTML = 'Compiling C:\\Projects\\bin\\ConsoleApp.exe...';
            log.innerHTML = 'Name: M Daniel Lana<br>' +
                'Profession: Software Developer<br>' +
                'Age: NAN! :-D<br>' +
                'Phone: 54930641816<br>' +
                'Email: mdlsis|gmail|com<br>' +
                'Linkedin: https://www.linkedin.com/in/mdlana/<br>' +
                'WebSite: https://www.mdlsis.com.ar/<br><br>' +
                'Press Enter Key to Exit...';
            commands[2].innerHTML = 'Running program finished ok!';
            cfgApp.hasError = true;
        }

        cursor.innerHTML = '_';
    }

    // fixcode click
    btnFixCode.onclick = function (e) {
        e.preventDefault;
        fadeIn(terminalWin, 1000);
        resetAnimation(terminalWin, 'command');
        resetAnimation(terminalWin, 'log');

        // Has error?
        if (cfgApp.hasError === true) {
            // Fixed errors
            commands[0].innerHTML = 'Wait, detecting and fixing problems....';
            log.innerHTML = 'Resolving...<br>' +
                'Line 5 fixed <i class="fas fa-check"></i><br>' +
                'Line 6 fixed <i class="fas fa-check"></i><br>' +
                'Line 7 fixed <i class="fas fa-check"></i><br>' +
                'Fixed 2 errors and 1 warning<br>' +
                'All problems solved. Run (<i class="fas fa-play"></i>) application.';
            cfgApp.hasError = false;
        } else {
            commands[0].innerHTML = 'No problems detected!';
            log.innerHTML = 'Run (<i class="fas fa-play"></i>) application.<br><br>' +
                'Commands allowed<br>' +
                '====================<br>' + 
                '<i class="fas fa-bug"></i> Fix Code<br>' +
                '<i class="fas fa-play"></i> Run program<br>' +
                '<i class="fas fa-sync-alt"></i> Reload<br>';
        }

        commands[2].innerHTML = 'Writing log... Done!';
        cursor.innerHTML = '_';
    }

    // Attach events
    // for (let i = 0; i < winButtons.length; i++) {
    //     winButtons[i].onclick = winButtonsClickHandler;
    // }
    winButtons.onclick = winButtonsClickHandler;

    // cursor.addEventListener("animationstart", startAnimationListener);
    prefixedEvent(cursor, "AnimationStart", startAnimationListener);

    function startAnimationListener() {
        cfgApp.processing = false;
        console.log('class cursor animation start...');
        console.log('status action: ' + cfgApp.processing);
    }

    function prefixedEvent(element, type, callback) {
        let pfx = ["webkit", "moz", "MS", "o", ""];
        for (let i = 0; i < pfx.length; i++) {
            if (!pfx[i]) type = type.toLowerCase();
            element.addEventListener(pfx[i] + type, callback, false);
        }
    }

    function resetAnimation(ele, toclass) {
        // Clone and replace the node containing animations
        // (see reference description in the  document head)
        let terminal = document.querySelector('.terminal');
        let newone = terminal.cloneNode(true);
        terminal.parentNode.replaceChild(newone, terminal);

        // Update references
        commands = document.querySelectorAll('.terminal p'),
        log = document.querySelector('.log span');
        cursor = document.querySelector('.cursor');

        // Remove and add 'toclass' param to 'ele' param
        ele.classList.remove(toclass);
        //ele.offsetWidth = ele.offsetWidth;
        void ele.offsetWidth;
        ele.classList.add(toclass);
    }

})