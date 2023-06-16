

let s = "مِ،فعَاجَلَ"
let ar_punc = ["،"]
let s2 = s.replace(new RegExp(`([${ar_punc.join('')}])([^ ])`), "$1 $2")
console.log(s)
console.log(s2)