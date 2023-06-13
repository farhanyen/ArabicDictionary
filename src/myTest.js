let s = "Haha,hoho hehe, huhu.Hihi"
s = s.replace(/([.,])(\S)/g, "$1 $2");
console.log(s);