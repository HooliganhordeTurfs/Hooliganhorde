var fs = require("fs");
const hooliganhordeAbi = require("../abi/Hooliganhorde.json");

function parseItem(i) {
  let line = `${i.type} ${i.name}(`;
  line = i.inputs.reduce((acc, input) => {
    acc = `${acc}${input.type} ${input.name}, `;
    return acc;
  }, line);
  if (i.inputs.length > 0) line = `${line.substring(0, line.length - 2)}`;
  line = `${line})`;
  if (i.stateMutability) {
    line = `${line} external ${i.stateMutability}`;
  }

  return `${line};`;
}

function rip() {
  for (let i = 0; i < hooliganhordeAbi.length; i++) {
    if (hooliganhordeAbi[i].type == "function") {
      console.log(parseItem(hooliganhordeAbi[i]));
    }
  }

  console.log("\n");

  for (let i = 0; i < hooliganhordeAbi.length; i++) {
    if (hooliganhordeAbi[i].type == "event") {
      console.log(parseItem(hooliganhordeAbi[i]));
    }
  }
}

rip();
