_clkmode = xtal1 + pll16x
_clkfreq = 80000000

obj
  fds : "FullDuplexSerial"
  
pub main | n

  fds.start(31,30,0,115200)
  waitcnt(CLKFREQ+CNT)

  fds.str(string("Hello, world."))

  repeat
    
