G = {
'A':[" XXXX ","XX  XX","XX  XX","XXXXXX","XX  XX","XX  XX","XX  XX"],
'B':["XXXXX ","XX  XX","XX  XX","XXXXX ","XX  XX","XX  XX","XXXXX "],
'C':[" XXXX ","XX  XX","XX    ","XX    ","XX    ","XX  XX"," XXXX "],
'D':["XXXX  ","XX XX ","XX  XX","XX  XX","XX  XX","XX XX ","XXXX  "],
'E':["XXXXXX","XX    ","XX    ","XXXXX ","XX    ","XX    ","XXXXXX"],
'G':[" XXXX ","XX  XX","XX    ","XX XXX","XX  XX","XX  XX"," XXXXX"],
'I':[" XXXX ","  XX  ","  XX  ","  XX  ","  XX  ","  XX  "," XXXX "],
'K':["XX  XX","XX XX ","XXXX  ","XXX   ","XXXX  ","XX XX ","XX  XX"],
'L':["XX    ","XX    ","XX    ","XX    ","XX    ","XX    ","XXXXXX"],
'M':["XX   XX","XXX XXX","XXXXXXX","XX X XX","XX   XX","XX   XX","XX   XX"],
'N':["XX  XX","XXX XX","XXXXXX","XXXXXX","XX XXX","XX  XX","XX  XX"],
'O':[" XXXX ","XX  XX","XX  XX","XX  XX","XX  XX","XX  XX"," XXXX "],
'P':["XXXXX ","XX  XX","XX  XX","XXXXX ","XX    ","XX    ","XX    "],
'R':["XXXXX ","XX  XX","XX  XX","XXXXX ","XXXX  ","XX XX ","XX  XX"],
'S':[" XXXX ","XX  XX","XX    "," XXXX ","    XX","XX  XX"," XXXX "],
'T':["XXXXXX","  XX  ","  XX  ","  XX  ","  XX  ","  XX  ","  XX  "],
'V':["XX  XX","XX  XX","XX  XX","XX  XX","XX  XX"," XXXX ","  XX  "],
'W':["XX   XX","XX   XX","XX   XX","XX X XX","XXXXXXX","XXX XXX","XX   XX"],
' ':[""]*7,
}
def glyph(ch):
    rows = G[ch] + [""]
    return [[1 if i < len(r) and r[i] == 'X' else 0 for i in range(8)] for r in rows]
