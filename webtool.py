
import threading
import BaseHTTPServer
import SimpleHTTPServer

import os
import os.path
import glob
import subprocess

import serial
import time


FILE = 'index.html'
PORT = 8080


ports = {}
port  = 1

termport = 0
rxThread = 0
rxEnabled= 0
rxRunning= 0

rxThrDone= False

windows = 0

#############################################################################
###
### Handle serial receive
###
#############################################################################

serialQueue = []
serialReady = False

class SerialThread(threading.Thread):
    # attempt to receive and queue up data from the serial port
    def __init__(self):
        threading.Thread.__init__(self)

    def run(self):

        global termport
        global rxEnabled
        global rxRunning
        global rxThrDone
        global serialQueue
        global serialReady

        while rxEnabled:
            serialText = 0
            while rxRunning != 0:
                time.sleep(0)

                try:
                    cnt = termport.inWaiting()
                    while cnt > 0:
                        text = termport.read(cnt)
                        if len(text) > 0:
                            #print("ST " + text)
                            serialQueue.append(text)
                            #print(len(serialQueue), serialQueue)
                except:
                    pass

        rxThrDone = 1


#############################################################################
###
### Enumerate serial ports
###
#############################################################################

def serialEnum():
    """scan for available ports. return a list of tuples (num, name)"""
    global port
    global ports
    global termport

    if termport:
        termport.close
        #termport = 0

    print("Enumerating Serial Ports")
    
    ports.clear()

    if windows:
        
        for n in range(0,257):
            try:
                s = serial.Serial(n)
                if(s):
                    port = str(s.port + 1)
                    ports[port] = s
                    print("Added port", port, ports[port])

                    s.writeTimeout = 1
                    #print("Testing port", s.port)

                    s.write("\n") # try to force a timeout exception
                    s.close()   # explicit close 'cause of delayed GC in java

            except serial.SerialTimeoutException:
                print("Timeout Exception", port)
                if port in ports:
                    print("Close & Delete invalid port", port)
                    ports[port].close()   # explicit close 'cause of delayed GC in java
                    del ports[port]

            except:
                pass

    ### Linux and Mac
    else:

        if glob.glob("/dev/cu.*"):

            lst = glob.glob("/dev/cu.usbserial*")
            #lst = glob.glob("/dev/cu.*")

        else:

            lst = glob.glob("/dev/ttyUSB*")


        for n in lst:
            print(n)
        
            try:
                s = serial.Serial(n)
                if(s):
                    #print(s.port)
                    port = str(s.port)
                    #print(port)
                    ports[port] = s
                    print("Added port", port, ports[port])

                    s.writeTimeout = 1
                    #print("Testing port", s.port)

                    s.write("\n") # try to force a timeout exception
                    s.close()   # explicit close 'cause of delayed GC in java

            except serial.SerialTimeoutException:
                print("Timeout Exception", port)
                if port in ports:
                    print("Close & Delete invalid port", port)
                    ports[port].close()   # explicit close 'cause of delayed GC in java
                    del ports[port]

            except:
                pass

    print("serialEnum done")


#############################################################################
###
### Class to handle Javascript requests
###
#############################################################################

class AjaxHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):


    ###########################################################################
    ###
    ### do_TERMRX is faster than do_POST functions.
    ###
    def do_TERMRX(self):

            #try:
            text = ""
            while len(serialQueue) > 0:
                #print(serialQueue)
                text += str(serialQueue.pop(0))

            if len(text) > 1:
                for n in range(len(text)):
                    #print("%"+str(ord(text[n])))
                    self.wfile.write("%"+str(ord(text[n])))
                self.send_response(200, None)
            elif len(text) == 1:
                #print(text)
                self.send_response(200, "%"+str(ord(text[0])))
            else:
                self.send_response(200, None)


    ###########################################################################
    ###
    ### do_TERMTX is faster than do_POST functions.
    ###
    def do_TERMTX(self):

        try:
            text = self.path[1:]
            if len(text) > 0:
                key = chr(eval(text))
                print("'"+key+"'")
                if termport and termport.open:
                    termport.write(key)

        except serial.SerialException:
            print("Error writing serial port.")

        except:
            print("Error TERMTX.")

        self.send_response(200, None)


    ###########################################################################
    ###
    ### TERMSTOP disconnects the serial port
    ###
    def do_TERMSTOP(self):
        try:
            rxRunning = False

            if termport and termport.open:
                termport.close()
                self.wfile.write("Port Closed.")

        except:
            print("TERMSTOP exception")

        self.send_response(200, None)


    ###########################################################################
    ###
    ### Handle HTTP POST requests
    ###
    def do_POST(self):

        global ports
        global termport
        global rxRunning
        global serialQueue
        global serialReady

        #print(termport)

        length = int(self.headers.getheader('content-length'))        
        data_string = self.rfile.read(length)
        cmd = data_string.split()
        if len(cmd) < 1:
            return;
        print(cmd)

        ################################################
        ### TERMSTART connects the serial port
        ################################################

        if(cmd[0] == "TERMSTART"):

            name = ""
            result = "Error"

            try:
                if(len(cmd) > 1):

                    name = cmd[1]
                    if not ports:
                        name = self.identifyFirstPort()

                    if termport and termport.open:
                        termport.close()

                    print(name)
                    if name.find("COM") == 0:
                        name = eval(name[3:])
                    print(name)
                    termport = ports[str(name)]
                    termport.writeTimeout = False

                    if(len(cmd) > 2):
                        termport.baudrate = eval(cmd[2])

                    termport.open()
                    print(termport)
                    time.sleep(1)
                    result = "Ok"
                else:
                    pass

            except:
                if not termport:
                    result = "Port not properly selected."
                else:
                    print("Error starting terminal port.")

            try:
                #if not rxThread:
                if termport:
                    rxRunning = True

                    result = "Ok"
                else:
                    pass

            except:
                print("Error starting rxThread.")


            self.send_response(200, result)


        ################################################
        ### TERMSTOP disconnects the serial port
        ################################################

        elif(cmd[0] == "TERMSTOP"):

            rxRunning = False

            if termport and termport.open:
                termport.close()
                #self.wfile.write("Port Closed.")

            self.send_response(200, None)


        ################################################
        ### COMPILE is used to compile the spin program
        ################################################

        elif(cmd[0] == "COMPILE"):

            filename = "."+self.path
            print(filename)

            result = self.compileFile(filename)
            if result:
                self.wfile.write(result)
            self.send_response(200, None)


        ################################################
        ### PROGRAM is used to program propeller with a spin file.
        ################################################

        elif(cmd[0] == "PROGRAM"):

            try:
                print(self.command)
                filename = "."+self.path
                print(filename)

                if(os.path.isfile(filename) == False):
                    print("The file does not exist. Can't compile or load. Save file first.")
                    self.send_response(200, "Source file not found.")
                    return

                srcfile = filename
                lst = filename.split(".")
                filename = "."+lst[1]+".binary"
                print(filename)

                print(srcfile, os.path.getmtime(srcfile))
                print(filename, os.path.getmtime(filename))

                if not os.path.isfile(filename) or os.path.getmtime(srcfile) > os.path.getmtime(filename):
                    result = self.compileFile(srcfile)
                    if result:
                        self.wfile.write(result)
                        self.send_response(200, "Load failed.")
                        return

                if os.path.isfile(filename):
                    print("Loading file.")

                name = self.identifyFirstPort()

                if len(cmd) > 1:
                    name = cmd[1]
                    print("cmd port name:", name)

                    if name.find("COM") == 0:
                        name = name[3:]
                    print(name)

                    #print("port list:", ports)
                    termport = ports[str(name)]
                    #print("port class:", termport)

                    if windows:
                        port = termport.port+1
                    else:
                        port = termport.port

                    #print(port)

                    cmd = "propeller-load -p "+str(port)+" -r "+filename
                    print(cmd)
                    result = os.popen(cmd).read();
                    print(result)

                elif termport:
                    #print("termport", termport.port)
                    if windows:
                        port = termport.port+1
                    else:
                        port = termport.port

                    #print(port, filename)

                    cmd = "propeller-load -p "+str(port)+" -r "+filename
                    print(cmd)
                    result = os.popen(cmd).read();
                    print(result)

                else:
                    print("default", ports)

                    result = name
                    print("def port name:", name)

                    if name.find("COM") >= 0:
                        name = name[3:]
                    print(name)

                    print("port list:", ports)
                    termport = ports[name]
                    print("port class:", termport)

                    if termport:
                        if windows:
                            port = termport.port+1
                        else:
                            port = termport.port

                        print("port number:", port)

                        cmd = "propeller-load -p "+str(port)+" -r "+filename
                        print(cmd)
                        result = os.popen(cmd).read();
                        print(result)


                self.wfile.write(result)

            except:
                print("Error programming file.")
                result = "Error"

            self.send_response(200, result)


        ################################################
        ### IDENTIFY is used to identify the first propeller attached serial port
        ################################################

        elif(cmd[0] == "IDENTIFY"):
            result = self.identifyFirstPort()
            print(result)
            self.wfile.write(result)
            print("send IDENTIFY response")
            self.send_response(200, None)


        ################################################
        ### SCANSERIAL is used to find valid propeller ports
        ################################################

        elif(cmd[0] == "SCANSERIAL"):
            # scan for all propeller chips
            serialEnum()
            result = ""

            for key in ports:
                try:
                    print(ports[key])
                    mport = ports[key].port
                    print(mport)

                    if windows:
                        cmd = "propeller-load.exe -r -p "+str(mport+1)
                    else:
                        cmd = "propeller-load -r -p "+str(mport)
                    print(cmd)
                    result = os.popen(cmd).read();
                    print(result)

                    if result:
                        print(result)
                        lst = result.split()
                    self.wfile.write(lst[-1] + "\n")
    
                except:
                    print("exception")
                    pass

            self.send_response(200, None)


        ################################################
        ### SUGGEST is used to suggest spin files that may be loaded
        ################################################

        elif(cmd[0] == "SUGGEST"):

            try:
                if len(cmd[1]):
                    print(cmd[1])
                    lst = glob.glob(cmd[1]+"*.spin")
                else:
                    lst = glob.glob("*.spin")
                print(lst)
                result = lst
                self.wfile.write(result)

            except:
                print("Error Suggesting files.")
                result = "Error"

            self.send_response(200, None)


        ### BAUDRATE is called to set the termport baud

        elif(cmd[0] == "BAUDRATE"):

            try:
                if(len(cmd) > 1):
                    if termport:
                        termport.baudrate = eval(cmd[1])

            except:
                print("Error baudrate")

            self.send_response(200, None)


    ###########################################################################
    ###
    ### Compile .spin file to .binary
    ###
    def compileFile(self, filename):
        try:
            print("COMPILE")
            print(filename)

            if(os.path.isfile(filename) == False):
                print("The file does not exist. Can't compile.")
                result = "Compile failed. File not found."
                return result
            else:
                print("Compiling file.")

            #result = subprocess.check_output("openspin.exe -L library "+filename)

            cmd = "openspin -L library "+filename
            print(cmd)
            result = os.popen(cmd).read();
            print(result)

            if result.find('\r'):
                result = result.replace('\r','')
            self.wfile.write(result)
            result = 0

        except:
            result = "Error compiling file."

        return result


    ###########################################################################
    ###
    ### Identify first port with a propeller on it
    ###
    def identifyFirstPort(self):

        # identify first propeller chip in port number order
        serialEnum()
        result = ports

        #portlist = [ports[key].port+1 for key in ports]
        portlist = [ports[key].port for key in ports]
        portlist.sort()
        print(portlist)

        for mport in portlist:
            try:
                print(mport)

                if windows:
                    cmd = "propeller-load.exe -r -p "+str(mport+1)
                else:
                    cmd = "propeller-load -r -p "+str(mport)

                print(cmd)
                result = os.popen(cmd).read();
                print(result)

                if result:
                    print(result)
                    lst = result.split()
                    result = lst[-1]
                    result = result.strip()
                    #self.wfile.write(lst[-1])
                    break

            except:
                print("identifyFirstPort exception.")
                pass

        print(result)
        return result


    ###########################################################################
    ###
    ### Handle PUT request for file.
    ###
    def do_PUT(self):

        try:
            print(self.command)
            filename = "."+self.path
            print(filename)
            if(os.path.isfile(filename)):
                print("The file exists. Overwriting.")
            else:
                print("Saving new file.")

            length = int(self.headers.getheader('content-length'))        
            data_string = self.rfile.read(length)

            fp = open(filename, "w")
            fp.write(data_string)
            fp.close()

            result = "Ok"

        except:
            print("Error saving file.")
            result = "Error"

        self.send_response(200, None)


#############################################################################
###
### Start web browser for user.
###
#############################################################################

import webbrowser
def open_browser():
    # Start a browser after waiting a moment.
    def _open_browser():
        webbrowser.open('http://localhost:%s/%s' % (PORT, FILE))
    thread = threading.Timer(1.0, _open_browser)
    thread.start()


#############################################################################
###
### Manage HTTP server and Receive Timer.
###
#############################################################################

stopped = False
def start_server():
    '''Start the server.'''
    global rxEnabled
    global rxThread
    global rxThrDone
    global stopped

    try:
        rxThread = SerialThread()
        if rxThread:
            rxEnabled = True
            rxThread.start()

    except:
        print("Serial Thread Start Exception.")
        return

    try:
        server_address = ("", PORT)
        server = BaseHTTPServer.HTTPServer(server_address, AjaxHandler)

        server.serve_forever()
        #while not stopped:
        #    server.handle_request()

    except KeyboardInterrupt:
        print("Keyboard Interrupt.")
        rxEnabled = False

    except:
        print("Server Done.")
        rxEnabled = False

    try:
        while not rxThrDone:
            time.sleep(1)
            print("Waiting for rxThread done. Kill server if waiting infinitely.")

    except:
        pass

#############################################################################
###
### Main routine.
###
#############################################################################

if __name__ == "__main__":

    # Find out if we are on Windoze
    if os.name == 'nt':
        print("Windoze detected.")
        windows = True

    # Advertise server info.
    print('http://localhost:%s/%s' % (PORT, FILE))

    # optionally open browser
    #open_browser()

    # start server and rx thread
    start_server()

    #############################################################################
    # Yup, finished. It is however possible that the HTTP server will get stuck.
    # It is best for windows users to start server with start.bat to ease killing it.
    #
    print("WebTool Done.")


