var editor;
var editorDirty = 0;

var contype = "application/x-www-form-urlencoded";
var ie=document.all;
var nn=document.getElementById&&!document.all;

function newXHR() {
    //return new XMLHttpRequest();
    var xhr;
    if (nn)
    {// code for IE7+, Firefox, Chrome, Opera, Safari
        xhr =new XMLHttpRequest();
    }
    else
    {// code for IE6, IE5
        xhr =new ActiveXObject("Microsoft.XMLHTTP");
    }
    return xhr;
}

function btNewClick() {
    var file=document.getElementById("filename");
    file.value = "";
    editor.setValue("");
}

/* ASYNC */
function btLoadClick() {
    var result=""; 
    var file="";
    var exception = 0;

    try
    {         
        file=document.getElementById("filename").value;
        var xhr = newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                var stat=document.getElementById("status");
                result = xhr.responseText;
                if(result.length > 0) {
                    editor.setValue(result);
                    stat.value = ("Loaded file '" + file + "'\r\n");
                }
                else {
                    stat.value = ("Can't find file '" + file + "'\r\n");
                }
            }
        };
        xhr.open( 'GET', file, true );
        xhr.send();
    }
    catch(e)
    {
        var stat=document.getElementById("status");
        stat.value = ("Load error: '" + e + "'\r\n");
    }
    return false;
}

/* ASYNC */
function btSaveClick() {
    var result=""; 
    var file="";

    var stat=document.getElementById("status");
    try
    {         
        file=document.getElementById("filename").value;
        var xhr = newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                editorDirty = 0;
                result = xhr.responseText;
                stat.value = ("Saved " + file + "\r\n" + result);
            }
        };
        xhr.open( 'PUT', file, false );
        xhr.setRequestHeader("Content-type", contype);
        xhr.send(editor.getValue());
    }
    catch(e)
    {
        result="exception " + e;
    }

    return false;
}

/* ASYNC */
function btCompileClick()
{
    var result=""; 
    var file="";

    var stat=document.getElementById("status");
    if(editorDirty) {
        //btSaveClick();
        stat.value = "Editor code not saved. Compile not done.";
        return;
    }

    try
    {         
        file=document.getElementById("filename").value;
        if(file.length == 0) {
            var stat=document.getElementById("status");
            stat.value = ("Filename empty. Please choose a file.");
            return;
        }

        var xhr = newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                result = xhr.responseText;
                if(result.length > 0) {
                    var lst = result.split("HTTP");
                    stat.value = (lst[0]);
                }
            }
        };

        xhr.open( 'POST', file, false );
        xhr.setRequestHeader("Content-type",contype);
        xhr.send("COMPILE");
    }
    catch(e)
    {
        result="exception " + e;
    }
    return false;
}

/* ASYNC */
function btProgramClick() {
    var result=""; 
    var file="";
    var port="";

    //btCompileClick();

    try
    {         
        port=document.getElementById("portname").value;
        file=document.getElementById("filename").value;
        var xhr = newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                result = xhr.responseText;
                if(result.length > 0) {
                    var lst = result.split("HTTP");
                    port=document.getElementById("portname");
                    if(lst.length > 0) {
                        var stat=document.getElementById("status");
                        stat.value = (lst[0]);
                        lst = lst[0].split("Version");
                        if(lst.length > 1) {
                            lst = lst[1].split(" on ");
                            if(lst.length > 1) {
                                lst = lst[1].split("\n");
                                if(lst.length > 0) {
                                    port.value = lst[0];
                                }
                            }
                        }
                    }
                }
            }
        };
        xhr.open( 'POST', file, false );
        xhr.setRequestHeader("Content-type",contype);
        xhr.send("PROGRAM "+port);
    }
    catch(e)
    {
        result="exception " + e;
    }

    return false;
}

/*
 * We can't do this now that all client/server IO is ASYNC.
 */
function btDebugClick() {
    var result=""; 
    var file="";
    var port="";

    btProgramClick();
    btConnectClick("btconn","portname");

    return false;
}

function acceptFileSuggest()
{
    var file;
    var auto;
    var indx;

    file=document.getElementById("filename");
    auto=document.getElementById("fileauto");
    indx = auto.selectionStart;
    var lst = auto.value.split("\n");
    var sum = 0;
    for (var n in lst) {
        sum += lst[n].length;
        if(indx <= sum) {
            file.value = lst[n];
            auto.style.visibility = "hidden";
            btLoadClick();
            return;
        }
    }
}

/* ASYNC */
function suggestFile()
{
    var result=""; 
    var file="";

    try
    {         
        file=document.getElementById("filename").value;
        var xhr = newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                var el=document.getElementById("fileauto");
                el.value = "";
                el.style.visibility = "hidden";

                result = xhr.responseText;
                if(result.length > 0) {
                    result = result.split("]");
                    result = result[0].split("[");
                    result = result[1];
                    var lst = result.split(",");
                    var cnt = 0;
                    for (var n in lst) {
                        var s = lst[n];
                        while(s.indexOf("'") > -1) {
                            s = s.replace("'","");
                        }
                        if(cnt != 0) {
                            el.value += "\n";
                        }
                        cnt++;
                        s = s.trim();
                        el.value += s;
                        el.style.visibility="visible";
                    }
                    el.rows = (lst.length > 5) ? 5 : lst.length;
                    if(el.rows == 1) {
                        el.style.visibility="hidden";
                        file=document.getElementById("filename");
                        file.value = el.value;
                        btLoadClick();
                    }
                }
            }
        };
        xhr.open('POST', file, true );
        xhr.setRequestHeader("Content-type",contype);
        if(file.length > 0) {
            xhr.send("SUGGEST "+file);
        }
        else {
            xhr.send("SUGGEST");
        }
    }
    catch(e)
    {
        alert("exception " + e);
    }
    return false;
}

function bodyOnLoad() {
    if(!nn) {
       document.write("Sorry. Internet Explorer is not supported.<br/>");
       document.write("Google Chrome on Windows will work best.<br/>");
       document.write("Firefox will also work with hidden warnings.<br/>");
       document.write("This has not been tested on LInux.<br/>");
    }
    var completeKeyword = spinInit();
    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        mode: {name: "spin", singleLineStringErrors: false},
        lineNumbers: true,
        indentUnit: 4,
        tabMode: "spin",
        matchBrackets: true,
        onCursorActivity: function() {
            editor.setLineClass(hlLine, null);
            hlLine = editor.setLineClass(editor.getCursor().line, "activeline");
        },
        onKeyEvent: function(i, e) {
            if (e.type == 'keypress' && String.fromCharCode(e.keyCode || e.charCode).match(/\w/)) {
                return completeKeyword(i, e);
            } else {
                var stat=document.getElementById("status");
                stat.value = (e.type + ' ' + e.keyCode + ' ' + e.shiftKey);
                editorDirty = 1;
                return false
            }
        }
    });
    document.getElementById('code').sscroll = 1;
    var hlLine = editor.setLineClass(0, "activeline");
    editor.refresh();
    editor.focus();
    termstop();
    return true;
}

/*
window.onbeforeunload = function (e) {
    termstop();
}
*/
