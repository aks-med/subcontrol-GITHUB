const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('A2k12us25ben09f', 10);
console.log(hash);
