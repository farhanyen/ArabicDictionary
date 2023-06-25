import {BuckDict} from "./buckdict.js";

function Utils() {
}

Utils.prototype.shallowEqual = function(o1, o2) {
    const k1 = Object.keys(o1);
    const k2 = Object.keys(o2);

    if (k1.length != k2.length)
        return false;

    for (let k of k1) {
        if (o1[k] != o2[k])
            return false;
    }

    return true;
}

Utils.prototype.mergeSet = function(s1, s2) {
    return new Set([...s1, ...s2]);
}

Utils.prototype.setEqual = function(s1, s2) {
    return s1.size == s2.size && s1.size == this.mergeSet(s1,s2).size;
}

export {Utils}