// import readFile from './filereader.node.js'
import readFile from '../filereader.browser.js'

//     globalThis.fetch = (await import("node-fetch")).default;
//     globalThis.Headers = (await import("node-fetch")).Headers;
function VideoSubtitle(yturl) {
    this.yturl = yturl;
    this.updateID = -1;
    this.timestamps = [];
}

VideoSubtitle.prototype.getVidTime = function () {
    let t = document.querySelector("video").currentTime;
    return t
}

VideoSubtitle.prototype.setVidTime = function(t) {
    let videoElem =  document.querySelector("video");
    videoElem.currentTime = t;
}

VideoSubtitle.prototype.update = function() {
    let vidTime = this.getVidTime();

    for (let i = 0; i < this.timestamps.length; i++) {
        let curStamp = this.timestamps[i];
        if (vidTime < curStamp.end && vidTime >= curStamp.start) {
            this.subDiv.textContent = curStamp.subtext;
            this.subDiv.style.visibility = "visible";
            return;
        }
        this.subDiv.style.visibility = "hidden";
    }


}

VideoSubtitle.prototype.getTimeStampMatchingText = function(text) {
    for (let i = 0; i < this.timestamps.length; i++) {
        let curStamp = this.timestamps[i];
        if (text == curStamp.subtext) {
            return curStamp;
        }
    }
    return null;
}


VideoSubtitle.prototype.srtFromFile = async function() {
    const text = await readFile("./src/subtitle/ds_arabic.srt");
    return text;
}

VideoSubtitle.prototype.srtFromYoutube = async function() {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", "Basic MGJiZjM0MTNlNGIzYzY4ZjNjYWE3NjY5MjFkNzJlMzE6MDY0NWQ1NmM4MDc4MGU3MTM5NDU2N2NkNWVkOGZhZjU=");
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "video_url": this.yturl
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    console.log("transcription fired")
    let response = await fetch("https://apps.beam.cloud/2jb85", requestOptions);
    if (response.status != 200) {
        throw new Error(`Faster_Whisper API Response status: ${response.status}: ${response.statusText}`);
    }
    let text = await response.json();
    console.log("transcription finished")
    return text;
}

VideoSubtitle.prototype.parseTime = function (t) {
    let [hr,min,sec,milli] = t.split(/[:,]/);
    [hr,min,sec,milli] = [hr,min,sec,milli].map((x) => parseInt(x))

    let s = 0;
    s += hr * 60**2
    s += min * 60
    s += sec
    s += milli / 1000

    return s;
}

VideoSubtitle.prototype.secondsToStandardTimeStamp = function(s) {
    let hrs = Math.floor(s / 3600);
    let mins = Math.floor((s % 3600)/60);
    let secs = Math.floor(s % 60);

    hrs = hrs < 10  ? '0'+hrs : hrs;
    mins = mins < 10  ? '0'+mins : mins;
    secs = secs < 10  ? '0'+secs : secs;


    return `${hrs}:${mins}:${secs}`;
}

VideoSubtitle.prototype.secondsToTimeStamp = function(s) {
    let hrs = Math.floor(s/3600);
    let mins = Math.floor((s%3600)/60);
    let secs = Math.floor(s%60);

    secs = secs < 10  ? '0'+secs : secs;

    if (hrs == 0 )
        return `${mins}:${secs}`;

    mins = mins < 10  ? '0' + mins : mins;
    return `${hrs}:${mins}:${secs}`;
}

VideoSubtitle.prototype.addTimestamp = function(subDuration, subText) {
    let [start, end] = subDuration.split(" --> ");
    start = this.parseTime(start);
    end = this.parseTime(end);

    let timestamp = {
        id: this.timestamps.length,
        start: start,
        end: end,
        subtext: subText,
    }
    this.timestamps.push(timestamp);
}

VideoSubtitle.prototype.initTimestamps = async function() {
    this.timestamps = [];

    // let text = await this.srtFromYoutube();
    let text = await this.srtFromFile();
    let lines = text.split("\n");
    lines = lines.slice(0, -1)
    for (let i = 0; i < lines.length; ) {
        i++;
        let subDuration = lines[i]; i++;
        let subText = lines[i]; i++;
        i++;

        this.addTimestamp(subDuration, subText);
    }
}

VideoSubtitle.prototype.appendDiv = function() {
    let moviePlayer = document.querySelector("#movie_player");
    if (moviePlayer != null) {
        moviePlayer.appendChild(this.subDiv);
    } else {
        setTimeout(this.appendDiv.bind(this), 1000);
    }
}

VideoSubtitle.prototype.initDiv = function() {
    this.subDiv = document.createElement("div");
    this.subDiv.classList.add("vidSub");
    this.subDiv.innerHTML = "Loading...";

    this.subDiv.addEventListener("click", (e) => {
        let curStamp = this.getTimeStampMatchingText(this.subDiv.textContent);
        this.setVidTime(curStamp.start);
    })

    this.appendDiv();
}

VideoSubtitle.prototype.onNavigate = async function(e) {
    this.yturl = location.href
    console.log(`On Navigate:${this.yturl}`)

    clearInterval(this.updateID);
    this.subDiv.innerHTML = "Loading...";
    await this.initTimestamps();
    this.updateID = setInterval(this.update.bind(this), 500);
}

VideoSubtitle.prototype.initTranscriptSidebar = function() {
    // let t = document.querySelector("video").currentTime;
    let sidebarParent = document.querySelector("#secondary");
    console.log(sidebarParent);
    console.log(sidebarParent.children);
    let sidebar = document.createElement("div");
    sidebar.id = "transcriptBar";

    this.timestamps.forEach(sub => {
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('timestamp');
        timestampDiv.textContent = `${this.secondsToTimeStamp(sub.start)} - ${sub.subtext}`;
        timestampDiv.onclick = function() {
            this.setVidTime(sub.start);
        }.bind(this);
        sidebar.appendChild(timestampDiv);
        console.log(sidebarParent);
        console.log(sidebarParent.children);
    });

    sidebarParent.insertBefore(sidebar, sidebarParent.firstChild);
    // sidebarParent.appendChild(sidebar);
}


VideoSubtitle.prototype.init = async function() {
    this.initDiv();

    await this.initTimestamps();

    this.initTranscriptSidebar();

    this.updateID = setInterval(this.update.bind(this), 500);

    document.addEventListener("yt-navigate-start", this.onNavigate.bind(this));

};

export default VideoSubtitle

// let vidSub = new VideoSubtitle(location.href);
// vidSub.init();

// Event listener

// document.addEventListener("yt-navigate-start", onNavigate);
//
// function onNavigate(e) {
//     console.log(`On Navigate:${location.href}`)
// }

// let s = document.createElement('script');
// s.src = chrome.extension.getURL('./subtitle/script.js');
// (document.head||document.documentElement).appendChild(s);
// s.onload = function() {
//     s.remove();
// };
// document.addEventListener('updateTime', function(e) {
//     // console.log("event received")
//     // console.log(e)
//     // console.log(e.detail)
//     let vidTime = e.detail;
//     vidSub.update(vidTime);
// });






