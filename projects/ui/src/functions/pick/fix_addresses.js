const fs = require('fs');

const fix_addresses = (o) => {
  const newObject = {};
  Object.keys(o).forEach((key) => {
    newObject[key.toLowerCase()] = o[key];
  });
  return newObject;
};

fs.writeFileSync(
  './unripe-hooligans-merkle.json',
  JSON.stringify(fix_addresses(
    JSON.parse(
      fs.readFileSync('./unripe-hooligans-merkle-raw.json', 'utf-8')
    )
  )),
  'utf-8'
);

fs.writeFileSync(
  './unripe-hooligan3crv-merkle.json',
  JSON.stringify(fix_addresses(
    JSON.parse(
      fs.readFileSync('./unripe-hooligan3crv-merkle-raw.json', 'utf-8')
    )
  )),
  'utf-8'
);
