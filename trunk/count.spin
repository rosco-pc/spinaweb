_clkmode = xtal1 + pll16x
_clkfreq = 80000000

obj
  fds : "FullDuplexSerial"
  
pub main | n
  fds.start(31,30,0,115200)
  waitcnt(CLKFREQ*2+CNT)
  n := 0
  repeat
    if n // 10 == 0
      fds.tx($d)
    fds.dec(n)
    waitcnt(CLKFREQ/10+CNT)
    n :=  n + 1
    fds.tx(" ")
    
