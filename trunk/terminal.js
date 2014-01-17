var rxTimerPeriod = 500;

var rxTimerVar = 0;

var termin  = 0;   // the terminal input text
var termout = 0;   // the terminal output textarea

/* ASYNC */
function btConnectClick(button, port)
{
    var result=""; 
    var file="";

    var btn  = document.getElementById(button);
    var baud = document.getElementById("baudrate").value;
    var code = document.getElementById("code");

    termin  = document.getElementById("termin");
    termout = document.getElementById("termout");
    try
    {         
        if(btn.value == "Connect") {

            var ua = navigator.userAgent.toLowerCase();

            if(ua.search("firefox") > -1) {
                window.onkeydown = termKeyDown;
            }

            var port=document.getElementById("portname");
            name = port.value;

            var xhr = newXHR();
            xhr.open( 'POST', "TERMSTART", false );
            xhr.setRequestHeader("Content-type",contype);
            xhr.send("TERMSTART "+name+" "+baud);

            btn.value = "Disconnect";
            btn.title = "Disconnect and stop terminal.";

            termin.disabled=false;
            termin.style.visibility="visible";
            termin.style.height="24px";
            termin.value = "";
            termindiv.title = "Terminal Input";

            termout.disabled=false;
            termout.style.visibility="visible";
            termout.style.height = termout.rows*20+"px";
            termout.value = "";
            termoutdiv.title = "Terminal Output";


            rxTimerVar = setInterval(function() { rxTimer() }, rxTimerPeriod);
        }
        else {
            termstop();

            btn.value = "Connect";
            btn.title = "Connect and start terminal.";

            termin.style.visibility="hidden";
            termin.style.height="0px";

            termout.disabled=true;
            termout.style.visibility="hidden";
            termout.style.height = "0px";

            if(rxTimerVar) {
                clearInterval(rxTimerVar);
                rxTimerVar = 0;
            }
        }
    }
    catch(e)
    {
        result="Exception " + e;
    }
    if(result.length > 0) {
        alert("Connection Failed.\r\n" + result);
    }
    return false;
}

function termstop()
{
    var xhr = newXHR();
    xhr.onreadystatechange=function() {
        var stat=document.getElementById("status");
        if (xhr.readyState==4 && xhr.status==200) {
            stat.value = "TERMSTOP";
        }
        else {
            stat.value += xhr.readyState+" ";
        }
    };

    xhr.open("POST", "TERMSTOP", true );
    xhr.setRequestHeader("Content-type",contype);
    xhr.send("TERMSTOP");
}

var shift = 0;
var ctrl  = 0;
var alt   = 0;


function termKeyDown(e)
{
    // onkeydown is the only event that lets backspace through.
    if(!e) {
        // support both nn and ie event
        e = event;
    }
    var result=""; 

    try
    {         
        var key = e.keyCode;
        var keyid = 0;
        if(key == 16) {
            shift++;
        }
        else if(key == 17) {
            ctrl++;
        }
        else if(key == 18) {
            alt++;
        } 
        else if(key >= 48 && key <= 57) {
            keyid = e.keyCode;
        } 
        else if(key >= 65 && key <= 90) {
            if(shift) {
                keyid = e.keyCode;
                shift = 0;
            }
            else if(ctrl) {
                // CTRL+A is 1
                keyid = e.keyCode - 65 + 1;
                //ctrl  = 0;
            }
            else if(alt) {
                keyid = e.keyCode;
                //alt   = 0;
            }
            else {
                // not shift, add 32 for lowercase
                keyid = e.keyCode + 32;
                ctrl  = 0;
                shift = 0;
                alt   = 0;
            }
        }
        else if(key == 222) {
            if(shift) {
                keyid = 0x22;
                shift = 0;
            }
        } 
        else { // all the rest
            keyid = keymap[e.keyCode];
        }

        var xhr = newXHR();

        if(keyid) {
            xhr.open( 'TERMTX', keyid, false );
            xhr.onreadystatechange=function() {};
            xhr.setRequestHeader("Content-type",contype);
            xhr.send();
        }

        if(key == 13) {
            termin.value = "";
        }
    }
    catch(e)
    {
        result="Exception " + e;
    }
    if(result.length > 0) {
        alert("Connection Failed.\r\n" + result);
    }
}


/* ASCII chars parse
function rxParse(result)
{
    var len = result.length;
    for(var n = 0; n < len; n++) {
        var ci = result.charCodeAt(n);
        if(ci > 128) {
            continue;
        }
        var ch = result.charAt(n);
        switch(ch) {
            case '\0':
                termout.value = "";
                continue;
            case '\b':
                termout.value = termout.value.slice(0,-1);
                continue;
            case '\r':
                continue;
            case ' ':
                termout.value = termout.value + " ";
                continue;
            case '\t':
                termout.value = termout.value + "...."; // stupid just for testing.
                continue;
            case '%':
                continue;
            default:
                termout.value = termout.value+ch;
        }
    }
}
*/

/* %Value parse */
function rxParse(result)
{
    var len = result.length;
    for(var n = 0; n < len; ) { // inner loop handles n++
        var ch = result.charAt(n);
        if(ch == '%') {
            var s = "";
            var ci = result.charAt(++n);
            while(true) {
                if(ci < '0' || ci > '9') {
                    break;
                }
                s += ci;
                ci = result.charAt(++n);
            }
            ci = parseInt(s);
            if(ci > 128) {
                continue;
            }
            ch = String.fromCharCode(ci);
            switch(ch) {
                case '\0':
                    termout.value = "";
                    continue;
                case '\b':
                    termout.value = termout.value.slice(0,-1);
                    continue;
                case '\n':
                    continue;
                case ' ':
                    termout.value = termout.value + " ";
                    continue;
                case '\t':
                    termout.value = termout.value + "...."; // stupid just for testing.
                    continue;
                case '%':
                    continue;
                default:
                    termout.value = termout.value+ch;
            }
        }
    }

    var lines = termout.value.split("\n");
    var len = lines.length;
    if(len > 0) {
        var over  = len - termout.rows;
        if(over > 1) {
            termout.value = "";
            for(var m = over+1; m < len; m++) {
                termout.value += lines[m]+"\n";
            }
        }
    }
}

/* SYNC
 */
rxTimer = function()
{
    var xhr = newXHR();
    xhr.open( 'TERMRX', ".", false );
    xhr.setRequestHeader("Content-type",contype);
    xhr.send();

    var result = 0;
    //var stat=document.getElementById("status");
    //stat.value += "["+xhr.statusText+":"+xhr.responseText+"]";
    if(xhr.statusText == "OK")
    {
        if(xhr.responseText.indexOf("Server: SimpleHTTP/") == 0) {
            return;
        }
        result = xhr.responseText;
        if(result.length < 1) {
            return;
        }
        result = result.split("HTTP/1.0");
        if(result.length > 0) {
            result = result[0];
        }
        else {
            return;
        }
    }
    else {
        result = xhr.statusText;
    }
    rxParse(result);
}

/* ASYNC
rxTimer = function()
{
    var xhr = newXHR();
    xhr.onreadystatechange=function()
    {
        if(xhr.readyState != 4) {
            return;
        }
        else if(xhr.status != 200) {
            return;
        }
        else
        {
            var stat=document.getElementById("status");
            stat.value = "TERMRX";
            var result = 0;
            if(xhr.statusText == "OK")
            {
                if(xhr.responseText.indexOf("Server: SimpleHTTP/") == 0) {
                    return;
                }
                result = xhr.responseText;
                if(result.length < 1) {
                    return;
                }
                result = result.split("HTTP/1.0");
                if(result.length > 0) {
                    result = result[0];
                }
                else {
                    return;
                }
            }
            else {
                result = xhr.statusText;
            }
            rxParse(result);
        }
    }
    xhr.open( 'TERMRX', ".", true );
    xhr.send();
    return false;
}
 */

/*
 * Keymap provides a mapping of javascript keys to valid ASCII codes.
 * Any javascript key that is not supported contains 0.
 */
var keymap = [

// 0-7
0, 0, 0, 0, 0, 0, 0, 0,
// backspace    8
8,
// tab  9
9,

// 10-12
0, 0, 0,
// enter    13
13,
// 14
0,
// 15
0,
// shift    16  - used to translate upper/lower case
0,
// ctrl     17  - used to make traditional 1,2,3,...,27 key codes.
0,
// alt  18      - usage unknown at this point
0,
// pause/break  19
0,

// caps lock    20
0,
// 21-26
0, 0, 0, 0, 0, 0,
// escape   27
0,
// 28-29
0, 0,

// 30-31
0, 0,
// space    32
32,
// page up  33
0,
// page down    34
0,
// end  35
0,
// home     36
0,
// left arrow   37
0,
// up arrow     38
0,
// right arrow  39
0,

// down arrow   40
0,
// 41-44
0, 0, 0, 0,
// insert   45
0,
// delete   46
0,
// 47
0,
// 0    48
0x30,
// 1    49
0x31,

// 2    50
0x32,
// 3    51
0x33,
// 4    52
0x34,
// 5    53
0x35,
// 6    54
0x36,
// 7    55
0x37,
// 8    56
0x38,
// 9    57
0x39,
// 58
0,
// 59
0,

// 60
0,
// 61
61,
// 62-64
0, 0, 0,
// a    65
0x61,
// b    66
0x62,
// c    67
0x62,
// d    68
0x64,
// e    69
0x65,

// f    70
0x66,
// g    71
0x67,
// h    72
0x68,
// i    73
0x69,
// j    74
0x6a,
// k    75
0x6b,
// l    76
0x6c,
// m    77
0x6d,
// n    78
0x6e,
// o    79
0x6f,

// p    80
0x70,
// q    81
0x71,
// r    82
0x72,
// s    83
0x73,
// t    84
0x74,
// u    85
0x75,
// v    86
0x76,
// w    87
0x78,
// x    88
0x78,
// y    89
0x79,

// z    90
0x7a,
// left window key  91
0,
// right window key     92
0,
// select key   93
0,
// 94-95
0, 0,
// numpad 0     96
0x30,
// numpad 1     97
0x31,
// numpad 2     98
0x32,
// numpad 3     99
0x33,

// numpad 4     100
0x34,
// numpad 5     101
0x35,
// numpad 6     102
0x36,
// numpad 7     103
0x37,
// numpad 8     104
0x38,
// numpad 9     105
0x39,
// multiply     106
0x2a,
// add  107
0x2b,
// 108
0,
// subtract     109
0x2d,

// decimal point    110
0x2e,
// divide   111
0x2f,
// f1   112
0,
// f2   113
0,
// f3   114
0,
// f4   115
0,
// f5   116
0,
// f6   117
0,
// f7   118
0,
// f8   119
0,

// f9   120
0,
// f10  121
0,
// f11  122
0,
// f12  123
0,
// 124-129
0, 0, 0, 0, 0, 0,

// 130-139
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

// 140-143
0, 0, 0, 0,
// num lock     144
0,
// scroll lock  145
0,
// 146-149
0, 0, 0, 0,

// 150-159
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

// 160-169
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

// 170-179
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

// 180-185
0, 0, 0, 0, 0, 0,
// semi-colon   186
0x3b,
// equal sign   187
0x3d,
// comma    188
0x2c,
// dash     189
0x2d,

// period   190
0x2e,
// forward slash    191
0x2f,
// grave accent     192 - not supported at this time
0,
// 193-199
0, 0, 0, 0, 0, 0, 0,

// 200-209
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

// 210-218
0, 0, 0, 0, 0, 0, 0, 0, 0,
// open bracket     219
0x5b,
// back slash   220
0x5c,
// close braket     221
0x5d,
// single quote     222
0x27
];

