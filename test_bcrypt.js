const bcrypt = require('bcryptjs');
const hashFromDb = '$2a$10$Mn35enDyFNeJDk8z6Y435.nSqd7dvBKN.ELdfYIL5yRJRIZMXPTHS';
const passwordToTest = 'Akius@2025';

const isValid = bcrypt.compareSync(passwordToTest, hashFromDb);
console.log('--- Validação de Senha ---');
console.log('Senha:', passwordToTest);
console.log('Hash:', hashFromDb);
console.log('É válido?', isValid ? '✅ SIM' : '❌ NÃO');
