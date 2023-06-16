function Scanner(str, isArabic) {
    this.str = str;
    this.isArabic = isArabic;

    this.start = 0
    this.cur = 0

    this.chunks = [];
    this.firstMidPeriodChunk = -1;
}

Scanner.prototype.isAtEnd = function() {
    return this.cur == this.str.length
}

Scanner.prototype.peek = function() {
    if (this.isAtEnd())
        return null;
    return this.str[this.cur];
}

Scanner.prototype.peekPrev = function() {
    // if (this.cur == this.start)
    //     return null;
    return this.str[this.cur-1];
}

Scanner.prototype.peekAhead = function() {
    return this.str[this.cur+1];
}

Scanner.prototype.peekSlice = function(n) {
    return this.str.slice(this.cur, this.cur+n);
}

Scanner.prototype.advance = function() {
    if (this.isAtEnd())
        throw new Error("Attempt to advance past end");
    this.cur++;
}

Scanner.prototype.advanceN = function(n) {
    for (let i = 0; i < n; i++) {
        this.advance();
    }
}

Scanner.prototype.match = function(s) {
    let n = s.length;
    if (this.peekSlice(n) == s) {
        this.advanceN(n); return true;
    }
    return false;
}

Scanner.prototype.resetStart = function () {
    this.str = this.str.slice(this.cur)
    this.cur = 0;
}

Scanner.prototype.consumeChunk = function() {
    let chunk = this.str.slice(0, this.cur);
    this.chunks.push(chunk.trim());

    this.resetStart();
    return chunk;
}

Scanner.prototype.scanChunkEnglish = function() {
    while (!this.isAtEnd()) {
        switch(this.peek()) {
            case ".":
                this.advance();
                if (this.isAtEnd() || this.match(".."))
                    continue;
                this.firstMidPeriodChunk = this.chunks.length; continue;
            case ",":
                this.advance();let chunk = this.consumeChunk();
                this.match(" and");
                return chunk;
            case "a":
                if (this.peekPrev() == " " && this.peekSlice(3) == "and") {
                    let chunk = this.consumeChunk(); this.advanceN("3");
                    return chunk;
                }
                this.advance(); continue;
            case "A":
                if (this.peekPrev() == " " && this.peekSlice(3) == "And") {
                    let chunk = this.consumeChunk(); this.advanceN("3");
                    return chunk;
                }
                this.advance(); continue;
            default:
                this.advance();         
        }
    }
    return this.consumeChunk();
}

Scanner.prototype.scanChunkArabic = function() {
    while (!this.isAtEnd()) {
        switch(this.peek()) {
            case "،":
                this.advance(); let chunk = this.consumeChunk();
                this.match(" و");
                return chunk;
            case "و":
                if (this.peekPrev() == " ") {
                    return this.consumeChunk();
                }
                this.advance(); continue;
            default:
                this.advance();
        }
    }
    return this.consumeChunk();
}

Scanner.prototype.scanChunk = function() {
    if (this.isArabic) {
        return this.scanChunkArabic();
    } else {
        return this.scanChunkEnglish();
    }
}

Scanner.prototype.scanChunks = function() {
    while(!this.isAtEnd()) {
        this.scanChunk()
    }
    return this.chunks;
}

export {Scanner}


