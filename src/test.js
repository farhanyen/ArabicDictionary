let hero = {
    name: 'Batman',
    realName: 'Bruce Wayne'
};
hero = {}
console.log(hero)
console.log({...hero})
const { name, realName } = {...hero};
console.log(name);     // => 'Batman',
console.log(realName);