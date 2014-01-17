function findPropeller()
{
    var result=""; 
    var file="";

    var port=document.getElementById("portname");
    port.value = "";
    try
    {         
        var xhr = new newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                var stat=document.getElementById("status");
                result = xhr.responseText;
                if(result.length > 0) {
                    result=result.split("HTTP");
                    if(result.length > 0) {
                        result=result[0];
                    }
                    result=result.split();
                    if(result.length > 0) {
                        result=result[0];
                    }
                    port.value = result;
                }
            }
        };
        xhr.open( 'POST', "COM", true );
        xhr.setRequestHeader("Content-type",contype);
        xhr.send("IDENTIFY");

        result=xhr.responseText;        
    }
    catch(e)
    {
        result="exception " + e;
    }
}

function acceptPortSuggest()
{
    var file;
    var auto;
    var indx;

    file=document.getElementById("portname");
    auto=document.getElementById("portauto");
    indx = auto.selectionStart;
    var lst = auto.value.split("\n");
    var sum = 0;
    for (var n in lst) {
        sum += lst[n].length;
        if(indx <= sum) {
            file.value = lst[n];
            auto.style.visibility = "hidden";
            return;
        }
    }
}

function suggestPort()
{
    var result=""; 
    var file="";

    try
    {         
        var xhr = new newXHR();
        xhr.onreadystatechange=function() {
            if (xhr.readyState==4 && xhr.status==200)
            {
                var stat=document.getElementById("status");
                result = xhr.responseText;
                if(result.length > 0) {

                    var el=document.getElementById("portauto");
                    el.value = "";
                    el.style.visibility = "hidden";

                    result=result.split("HTTP");
                    if(result.length > 0) {
                        result=result[0];
                    }

                    var lst =result.split("\n");
                    if(lst.length > 0) {
                        var cnt = 0;
                        for (var n in lst) {
                            var s = lst[n];
                            s = s.trim();
                            if(s.length < 1) {
                                break;
                            }
                            el.style.visibility="visible";
                            if(cnt < 1) {
                                el.value = s;
                            }
                            else {
                                el.value += "\n"+s;
                            }
                            cnt++;
                        }
                        el.rows = (cnt > 5) ? 5 : cnt;
                        if(el.rows == 1) {
                            var port=document.getElementById("portname");
                            port.value = el.value;
                            el.style.visibility="hidden";
                        }
                    }
                }
            }
        };
        xhr.open( 'POST', "COM", true );
        xhr.setRequestHeader("Content-type",contype);
        xhr.send("SCANSERIAL");
        result=xhr.responseText;        
    }
    catch(e)
    {
        result="exception " + e;
    }
    return false;
}


