let a = 'file:///Users/farha/Downloads/moby-dick.epub';
let b = 'file://'
if (a.match(/file:\/\/.+.epub/) != null) {
    console.log('success')
}
